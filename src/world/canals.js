// The Grand and Royal Canals: grass banks with trees along each pool (the water, its walls and collision come from
// the dock basins in ground.js), the stone parapets and dark arch mouths where roads cross on bridges, and the
// black-and-white balance beams of the lock gates.
import * as THREE from 'three';
import { world, v2 } from './geo.js';
import { addSegment } from '../game/collision.js';
import { KERB_H } from './roads.js';
import { plantTrees } from './trees.js';
import { rng } from './textures.js';

const archMat = new THREE.MeshBasicMaterial({ color: 0x0b0d0c });
const timberMat = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.8 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.6 });

function strip(inner, outer, y) {
  const pos = [], uv = [], idx = [];
  inner.forEach((p, i) => {
    const q = outer[i];
    pos.push(p.x, y, p.z, q.x, y, q.z);
    uv.push(p.x, p.z, q.x, q.z);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k, k - 1, k + 1); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // winding differs per side: make both face up
  const n = g.attributes.normal;
  if (n.count && n.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// a box from a to b (plan), h tall from y, t thick
function wallBox(list, a, b, y, h, t) {
  const d = v2.sub(b, a), L = v2.len(d);
  list.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y: y + h / 2, rot: Math.atan2(d.x, d.z), sx: t, sy: h, sz: L });
}

function instanced(list, mat) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((b, i) => m.setMatrixAt(i, m4.compose(new THREE.Vector3(b.x, b.y, b.z), q.setFromAxisAngle(up, b.rot), new THREE.Vector3(b.sx, b.sy, b.sz))));
  m.count = list.length;
  m.castShadow = m.receiveShadow = true;
  m.computeBoundingSphere();
  return m;
}

export function buildCanals(scene, grassMat, stoneMat) {
  const group = new THREE.Group();
  group.name = 'canals';
  if (!world.canals.length) return group;
  const rand = rng(4417);
  const trees = [], parapets = [], timber = [], white = [];
  const archPos = [], archIdx = [];

  for (const c of world.canals) {
    for (const pool of c.pools) {
      for (const bank of pool.banks) {
        group.add(Object.assign(new THREE.Mesh(strip(bank.inner, bank.outer, KERB_H + 0.004), grassMat), { receiveShadow: true }));
        // a row of trees along each bank, well back from the water
        let acc = rand() * 8;
        for (let i = 1; i < bank.inner.length; i++) {
          acc += v2.len(v2.sub(bank.inner[i], bank.inner[i - 1]));
          if (acc < 9 || bank.w[i] < 2.5) continue;
          acc = rand() * 3;
          const f = 0.55 + rand() * 0.2;
          trees.push({ x: bank.inner[i].x + (bank.outer[i].x - bank.inner[i].x) * f, z: bank.inner[i].z + (bank.outer[i].z - bank.inner[i].z) * f, rot: rand() * 6.28, s: 0.8 + rand() * 0.35 });
        }
      }
    }
    for (const g of c.gaps) {
      if (g.lock) {
        // mitre gates across the lock, with a balance beam on each bank
        const p = v2.lerp(g.a, g.b, 0.5), n = g.a.n, d = g.a.d;
        const l = { x: p.x + n.x * c.width / 2, z: p.z + n.z * c.width / 2 }, r = { x: p.x - n.x * c.width / 2, z: p.z - n.z * c.width / 2 };
        wallBox(timber, l, r, -1.5, KERB_H + 1.5 + 0.35, 0.45);
        for (const side of [1, -1]) {
          const root = { x: p.x + n.x * side * (c.width / 2 + 0.3), z: p.z + n.z * side * (c.width / 2 + 0.3) };
          // the beam swings out over the bank, back along the canal at an angle
          const dir = v2.norm({ x: -d.x * 0.8 + n.x * side * 0.6, z: -d.z * 0.8 + n.z * side * 0.6 });
          const tip = v2.add(root, v2.scale(dir, 4.2)), mid = v2.add(root, v2.scale(dir, 3.5));
          wallBox(timber, root, mid, KERB_H + 0.75, 0.32, 0.32);
          wallBox(white, mid, tip, KERB_H + 0.75, 0.32, 0.32);
        }
        continue;
      }
      // bridge: a stone parapet along each side of every road that crosses here, spanning the water and banks
      for (const k of g.bridges) {
        const mid = v2.lerp(g.a, g.b, 0.5);
        const rn = { x: -k.road.z, z: k.road.x };
        const sin = Math.max(0.35, Math.abs(k.road.x * g.a.d.z - k.road.z * g.a.d.x));
        const half = (c.width / 2 + 2) / sin;
        const off = k.way.width / 2 + k.way.pave + 0.3;
        for (const side of [1, -1]) {
          const o = { x: mid.x + rn.x * side * off, z: mid.z + rn.z * side * off };
          const a = v2.add(o, v2.scale(k.road, -half)), b = v2.add(o, v2.scale(k.road, half));
          wallBox(parapets, a, b, KERB_H, 1.0, 0.55);
          addSegment(a.x, a.z, b.x, b.z);
        }
      }
      // dark arch mouths on the walls where the water runs under the road
      for (const [e, face] of [[g.a, -1], [g.b, 1]]) {
        const cx = e.x + e.d.x * face * 0.06, cz = e.z + e.d.z * face * 0.06;
        const base = archPos.length / 3, W = c.width * 0.42, top = KERB_H - 0.35, bottom = -1.9, seg = 10;
        archPos.push(cx, bottom, cz);
        for (let i = 0; i <= seg; i++) {
          const a = Math.PI * (i / seg);
          const ox = Math.cos(a) * W, y = bottom + 0.5 + Math.sin(a) * (top - bottom - 0.5);
          archPos.push(cx + e.n.x * ox, i === 0 || i === seg ? bottom : y, cz + e.n.z * ox);
        }
        for (let i = 0; i < seg; i++) archIdx.push(base, base + 1 + i, base + 2 + i);
      }
    }
  }
  if (archPos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(archPos, 3));
    g.setIndex(archIdx);
    const arches = new THREE.Mesh(g, archMat);
    arches.material.side = THREE.DoubleSide;
    group.add(arches);
  }
  group.add(instanced(parapets, stoneMat), instanced(timber, timberMat), instanced(white, whiteMat));
  if (trees.length) plantTrees(scene, trees, { plane: 2, lime: 2, chestnut: 1, birch: 1 }, rand);
  return group;
}

// Grass banks as polygons, for anything that must keep off them (buildings, parked cars).
export function canalBankPolys() {
  const out = [];
  for (const c of world.canals) for (const pool of c.pools) for (const bank of pool.banks) out.push([...bank.inner, ...bank.outer.slice().reverse()]);
  return out;
}
