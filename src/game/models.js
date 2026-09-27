// Loads the Blender-built hero cars (public/models/*.glb). Each exposes the same interface as
// makePlayerCar(): a Group facing +z with userData.update(speed, dt, steer) and userData.setLights(level).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { carMaterialCache } from './carmaterials.js';

const loader = new GLTFLoader();
const cache = new Map();

function load(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`));
  return cache.get(name);
}

// Returns a ready-to-use car group, or null if the model can't be loaded.
export async function loadCar(name) {
  let gltf;
  try { gltf = await load(name); } catch (e) { console.warn(`model ${name} failed to load`, e); return null; }
  const src = gltf.scene.clone(true);
  // exported models face -z (Blender +Y); turn them round to face +z like everything else
  const inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  inner.add(src);
  const group = new THREE.Group();
  group.add(inner);
  const wheels = [], glow = [];
  const material = carMaterialCache(); // one tuned material per source material, per car (lights are per car)
  src.traverse((o) => {
    // Only the wheel node itself spins and steers. A multi-material wheel loads as a group named wheel_front_l
    // with child meshes (wheel_front_l_tyre, _1, ...); rotating the children as well applied steer and spin twice,
    // and the second steer about an already-spun axis tipped the wheel over.
    if (/^wheel_(front|rear)_[lr]$/.test(o.name)) wheels.push({ o, front: /front/.test(o.name) });
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = material(o.material);
    const n = o.material.name || '';
    if (/headlight|drl|taillight|indicator|lightbar_\d/.test(n) && !glow.some((g) => g.m === o.material)) glow.push({ m: o.material, base: o.material.emissiveIntensity, kind: n });
  });
  let spin = 0;
  const q = new THREE.Quaternion(), qs = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const r = name === 'hatch' ? 0.34 : name === 'coupe' ? 0.35 : 0.33;
  group.userData = {
    model: name,
    update(speed, dt, steer) {
      spin += (speed * dt) / r;
      for (const w of wheels) {
        q.identity();
        // the model is turned 180°, so steering and spin directions flip in its local frame
        if (w.front) q.multiply(qs.setFromAxisAngle(Y, steer));
        q.multiply(qs.setFromAxisAngle(X, -spin));
        w.o.quaternion.copy(q);
      }
    },
    setLights(level) {
      for (const g of glow) {
        if (/lightbar/.test(g.kind)) continue; // driven by the siren
        g.m.emissiveIntensity = g.base * (1 + level * 3);
      }
    },
    lightbar: glow.filter((g) => /lightbar/.test(g.kind)).map((g) => g.m),
  };
  return group;
}
