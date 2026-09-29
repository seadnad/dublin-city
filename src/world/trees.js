// Trees from the Blender-grown set (public/models/trees.glb: plane, lime, chestnut, birch, young).
// Callers plant items with a species mix; a simple procedural tree stands in until the models load
// (or for good if they can't be loaded).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { chunkedInstances } from './chunks.js';

const SPECIES = ['plane', 'lime', 'chestnut', 'birch', 'young'];
const plantings = [];
let models = null;

function pick(mix, rand) {
  let r = rand() * Object.values(mix).reduce((a, b) => a + b, 0);
  for (const [k, w] of Object.entries(mix)) { r -= w; if (r <= 0) return k; }
  return Object.keys(mix)[0];
}

// items: { x, y?, z, rot, s (number), species?, tint? (THREE.Color: multiplies leaves and bark) }; mix: { plane: 3, ... }
// A planting whose items carry tints (the Phoenix Park's dark holm oaks, say) gets per-instance colours.
const WHITE = new THREE.Color(1, 1, 1);
export function plantTrees(scene, items, mix, rand = Math.random) {
  const planting = { scene, items: items.map((it) => ({ ...it, species: it.species || pick(mix, rand) })), groups: [] };
  planting.colors = items.some((it) => it.tint) ? (it) => it.tint || WHITE : null;
  plantings.push(planting);
  if (models) build(planting);
  else buildFallback(planting);
  return planting;
}

function buildFallback(p) {
  const trunk = new THREE.CylinderGeometry(0.2, 0.32, 4, 6).translate(0, 2, 0);
  const crown = new THREE.IcosahedronGeometry(3, 1).translate(0, 6, 0);
  const its = p.items.map((it) => ({ ...it, s: it.s }));
  p.groups = [
    chunkedInstances(trunk, new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.9 }), its, { shadow: true, y: it0y(p) }),
    chunkedInstances(crown, new THREE.MeshStandardMaterial({ color: 0x5b8a3a, roughness: 0.9, flatShading: true }), its, { shadow: true, y: it0y(p), colors: p.colors }),
  ];
  p.scene.add(...p.groups);
}
const it0y = (p) => (p.items[0] && p.items[0].y) || 0;

function build(p) {
  for (const g of p.groups) { p.scene.remove(g); g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); }
  p.groups = [];
  for (const sp of SPECIES) {
    const its = p.items.filter((it) => it.species === sp);
    if (!its.length || !models[sp]) continue;
    for (const part of ['bark', 'leaves']) {
      const m = models[sp][part];
      if (!m) continue;
      const g = chunkedInstances(m.geometry, m.material, its, { shadow: true, y: it0y(p), colors: p.colors });
      p.groups.push(g);
      p.scene.add(g);
    }
  }
}

export function loadTrees() {
  return new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/trees.glb`).then((gltf) => {
    const found = {};
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      const m = /^tree_(\w+?)_(bark|leaves)$/.exec(o.name);
      if (!m || !o.isMesh) return;
      // bake the node transform, then move the trunk base to the origin (models were laid out in a row)
      const geo = o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      (found[m[1]] ||= {})[m[2]] = { geometry: geo, material: o.material };
    });
    for (const sp of Object.values(found)) {
      const bark = sp.bark || sp.leaves;
      bark.geometry.computeBoundingBox();
      const c = bark.geometry.boundingBox.getCenter(new THREE.Vector3());
      const minY = bark.geometry.boundingBox.min.y;
      for (const part of Object.values(sp)) {
        part.geometry.translate(-c.x, -minY - 0.1, -c.z);
        part.material = part.material.clone();
        part.material.vertexColors = true;
        part.material.roughness = 0.9;
      }
    }
    models = found;
    for (const p of plantings) build(p);
    return Object.keys(found);
  }).catch((e) => { console.warn('trees.glb failed to load; keeping procedural trees', e); return []; });
}
