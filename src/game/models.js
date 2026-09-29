// Loads the Blender-built hero cars (public/models/*.glb). Each exposes the same interface as
// makePlayerCar(): a Group facing +z with userData.update(speed, dt, steer) and userData.setLights(level).
// The Garda i40 ('garda', and 'garda_rp' for the Roads Policing livery) is one Draco-compressed model whose
// livery is painted onto its body atlas at load time (see gardacar.js / livery.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { carMaterialCache } from './carmaterials.js';
import { gardaTextures, gardaMaterials } from './gardacar.js';

const loader = new GLTFLoader();
loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`));
const cache = new Map();

function load(file) {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(`${import.meta.env.BASE_URL}models/${file}.glb`));
  return cache.get(file);
}

const GARDA_VARIANTS = { garda: 'standard', garda_rp: 'roadsPolicing' };
const WHEEL_R = { hatch: 0.34, coupe: 0.35, gt: 0.322 }; // tyre radius, for the wheel spin

// Returns a ready-to-use car group, or null if the model can't be loaded.
export async function loadCar(name) {
  const variant = GARDA_VARIANTS[name];
  const file = variant ? 'garda' : name;
  let gltf;
  try { gltf = await load(file); } catch (e) { console.warn(`model ${file} failed to load`, e); return null; }
  const src = gltf.scene.clone(true);
  // exported models face -z (Blender +Y); turn them round to face +z like everything else
  const inner = new THREE.Group();
  inner.rotation.y = Math.PI;
  inner.add(src);
  const group = new THREE.Group();
  group.add(inner);

  let material, garda = null;
  if (variant) {
    let extras = null;
    src.traverse((o) => { if (!extras && o.userData && o.userData.atlas) extras = o.userData; });
    const tex = await gardaTextures(JSON.parse(extras.atlas), JSON.parse(extras.guides), variant);
    garda = gardaMaterials(tex);
    material = garda.get;
  } else {
    material = carMaterialCache(); // one tuned material per source material, per car (lights are per car)
  }

  const wheels = [], glow = [], calipers = [], paints = [];
  let reverseLamp = null;
  src.traverse((o) => {
    // Only the wheel node itself spins and steers. A multi-material wheel loads as a group named wheel_front_l
    // with child meshes (wheel_front_l_1, ...); rotating the children as well applied steer and spin twice,
    // and the second steer about an already-spun axis tipped the wheel over.
    if (/^wheel_(front|rear)_[lr]$/.test(o.name)) wheels.push({ o, front: /front/.test(o.name) });
    // front brake calipers steer with their wheel but don't spin (pivot at the wheel centre)
    if (/^caliper_front_[lr]$/.test(o.name)) calipers.push(o);
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = material(o.material);
    const n = o.material.name || '';
    if (!garda && /headlight|drl|taillight|indicator|lightbar_\d/.test(n) && !glow.some((g) => g.m === o.material)) glow.push({ m: o.material, base: o.material.emissiveIntensity, kind: n });
    if (!garda && /^paint_/.test(n) && !paints.includes(o.material)) paints.push(o.material);
    if (!garda && /^reverse/.test(n)) reverseLamp = o.material;
  });
  // Merge every non-wheel mesh into one mesh per material (a draw call each, twice with shadows).
  // Geometry is baked into the car root's space; wheels keep their own nodes.
  src.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(src.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  src.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p && p !== src; p = p.parent) if (/^wheel_|^caliper_front_/.test(p.name)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    victims.push(o);
  });
  for (const o of victims) o.parent.remove(o);
  for (const [mat, geos] of buckets) {
    const merged = new THREE.Mesh(mergeGeometries(geos), mat);
    // see-through parts neither cast nor receive shadows (a shadowed clear lens reads as a dark smudge)
    merged.castShadow = merged.receiveShadow = !mat.transparent;
    merged.renderOrder = mat.transparent ? 2 : 0;
    src.add(merged);
  }
  let spin = 0, lights = 0, braking = false;
  const q = new THREE.Quaternion(), qs = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const r = WHEEL_R[name] ?? (variant ? 0.325 : 0.33);
  const hasTail = glow.some((g) => /taillight/.test(g.kind));
  // lamps: brighter after dark; the tail lamps light up further under braking (lightbars are driven by the siren)
  const lamps = () => {
    for (const g of glow) {
      if (/lightbar/.test(g.kind)) continue;
      g.m.emissiveIntensity = g.base * (1 + lights * 3) * (braking && /taillight/.test(g.kind) ? 4 : 1);
    }
  };
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
      for (const c of calipers) c.quaternion.setFromAxisAngle(Y, steer);
    },
    setLights(level) {
      if (garda) { garda.controls.setLights(level); return; }
      lights = level; lamps();
    },
    // body colour, for the cars that offer a choice: { color, metal } (see carlist.js)
    setPaint(p) {
      for (const m of paints) { m.color.set(p.color); m.metalness = p.metal || 0; m.roughness = p.rough ?? 0.35; }
    },
    lightbar: garda ? garda.controls.lightbar : glow.filter((g) => /lightbar/.test(g.kind)).map((g) => g.m),
    ...(garda ? { flash: garda.controls.flash, setBrake: garda.controls.setBrake, setReverse: garda.controls.setReverse } : {
      // only on a change of state, so there are no per-frame material writes
      setBrake(on) { if (on !== braking && hasTail) { braking = on; lamps(); } },
      setReverse(on) { if (reverseLamp) reverseLamp.emissiveIntensity = on ? 3 : 0; },
    }),
  };
  return group;
}
