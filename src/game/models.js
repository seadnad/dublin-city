// Loads the Blender-built hero cars (public/models/*.glb). Each exposes the same interface as
// makePlayerCar(): a Group facing +z with userData.update(speed, dt, steer) and userData.setLights(level).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  src.traverse((o) => {
    if (!o.isMesh) {
      if (/^wheel_/.test(o.name)) wheels.push({ o, front: /front/.test(o.name) });
      return;
    }
    o.castShadow = true; o.receiveShadow = true;
    // materials are shared between clones of the same model; give each car its own for lights
    o.material = o.material.clone();
    const n = o.material.name || '';
    if (/headlight|drl|taillight|indicator|lightbar/.test(n)) glow.push({ m: o.material, base: o.material.emissiveIntensity, kind: n });
    if (/^wheel_/.test(o.name)) wheels.push({ o, front: /front/.test(o.name) });
    if (/glass/.test(n)) { o.material.roughness = 0.04; o.material.metalness = 0.3; o.material.envMapIntensity = 1.4; }
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
