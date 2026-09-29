// Trees from the Blender-grown set (public/models/trees.glb: plane, lime, chestnut, birch, young).
// Callers plant items with a species mix; a simple procedural tree stands in until the models load
// (or for good if they can't be loaded).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { chunkedInstances, packedInstances, removePack } from './chunks.js';

const SPECIES = ['plane', 'lime', 'chestnut', 'birch', 'young'];
const plantings = [];
let models = null;

function pick(mix, rand) {
  let r = rand() * Object.values(mix).reduce((a, b) => a + b, 0);
  for (const [k, w] of Object.entries(mix)) { r -= w; if (r <= 0) return k; }
  return Object.keys(mix)[0];
}

// items: { x, y?, z, rot, s (number) }; mix: { plane: 3, lime: 1, ... }
export function plantTrees(scene, items, mix, rand = Math.random) {
  const planting = { scene, items: items.map((it) => ({ ...it, species: pick(mix, rand) })), groups: [] };
  plantings.push(planting);
  if (models) build();
  else buildFallback(planting);
  return planting;
}

function buildFallback(p) {
  const trunk = new THREE.CylinderGeometry(0.2, 0.32, 4, 6).translate(0, 2, 0);
  const crown = new THREE.IcosahedronGeometry(3, 1).translate(0, 6, 0);
  const its = p.items.map((it) => ({ ...it, s: it.s }));
  p.groups = [
    chunkedInstances(trunk, new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.9 }), its, { shadow: true, y: it0y(p) }),
    chunkedInstances(crown, new THREE.MeshStandardMaterial({ color: 0x5b8a3a, roughness: 0.9, flatShading: true }), its, { shadow: true, y: it0y(p) }),
  ];
  p.scene.add(...p.groups);
}
const it0y = (p) => (p.items[0] && p.items[0].y) || 0;

// The Blender trees are heavy (1-2.5k triangles each): each species is culled tree by tree (see packedInstances),
// one pack per species for every planting in the city (so a species costs the same draw calls however many parks).
let packs = [];
function build() {
  for (const p of plantings) { for (const g of p.groups) { p.scene.remove(g); g.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); } p.groups = []; }
  for (const pk of packs) { removePack(pk); for (const m of pk.meshes) { m.removeFromParent(); m.dispose(); } }
  packs = [];
  if (!plantings.length) return;
  const scene = plantings[0].scene;
  for (const sp of SPECIES) {
    const its = plantings.flatMap((p) => p.items.filter((it) => it.species === sp).map((it) => ({ ...it, y: it.y ?? it0y(p) })));
    if (!its.length || !models[sp]) continue;
    const pk = packedInstances(its, ['bark', 'leaves'].map((part) => models[sp][part]).filter(Boolean));
    packs.push(pk);
    scene.add(...pk.meshes);
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
    build();
    return Object.keys(found);
  }).catch((e) => { console.warn('trees.glb failed to load; keeping procedural trees', e); return []; });
}
