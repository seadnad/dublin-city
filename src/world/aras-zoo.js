// Áras an Uachtaráin and Dublin Zoo (docs/research/aras-zoo.md), inside the Phoenix Park.
//  - where the President's house stands and which way it faces (straight down its vista to Chesterfield Avenue), the
//    clear ground round it and the vista the park's planting keeps open, the Places view on the avenue;
//  - the zoo: both halves of its outline (the original gardens by the Hollow and the northern extension), the two
//    lakes and their islands, the sand of the African Plains with its boulder walls, a few animals, and where its
//    Blender heroes stand (the entrance building, the 1833 lodge, the elephant house, a giraffe house);
//  - the heroes themselves come from tools/blender/build_aras.py (public/models/aras.glb).
// Everything cheap: the lakes, islands and plains are two meshes, the animals one.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, project, v2, pointInPolygon, insetPolygon } from './geo.js';
import { fieldAt, KERB_H } from './roads.js';
import { rng } from './textures.js';
import { addBox } from '../game/collision.js';
import { addReflections } from '../render/reflect.js';
import data from '../data/aras-zoo.json';

const P = ([lat, lon]) => project(lat, lon);
const centroid = (poly) => poly.reduce((a, p) => ({ x: a.x + p.x / poly.length, z: a.z + p.z / poly.length }), { x: 0, z: 0 });
// a part's local (Blender) point -> world: x along the front, y back into the building
const toWorld = (s, bx, by) => { const c = Math.cos(s.rot), n = Math.sin(s.rot); return { x: s.x + bx * c - by * n, z: s.z - bx * n - by * c }; };

// ---------- the Áras ----------
// The house faces straight down its projected axis (the real 204 deg bearing through the squeezed park comes out ~17 deg
// west of south), so from the avenue the portico is square on (docs §3.2).
export const aras = (() => {
  const front = P(data.aras.front), end = P(data.aras.axisEnd);
  const f = v2.norm(v2.sub(end, front));
  const site = { x: front.x, z: front.z, rot: Math.atan2(f.x, f.z), f };
  // the Places view: where the axis meets Chesterfield Avenue, on the carriageway's near lane, facing the house
  let tIn = null;
  for (let t = 20; t < 260 && tIn === null; t += 0.5) {
    const p = { x: front.x + f.x * t, z: front.z + f.z * t }, r = world.nearestRoad(p.x, p.z);
    if (r && r.edgeDist < 0 && /Chesterfield/.test(r.way.name)) tIn = t;
  }
  const tv = (tIn ?? 128) + 2.4;
  site.road = tIn ?? 128;
  site.view = { x: front.x + f.x * tv, z: front.z + f.z * tv, heading: Math.atan2(-f.x, -f.z) };
  return site;
})();
// the house and its terrace, yews and wings in the model's frame (build_aras.py), for tree clearing and collision
const ARAS_BOXES = [
  [-24.8, 24.8, -1.4, 11.5], [-8.8, 8.8, -4.6, 0], [-3.6, 3.6, -6.9, -4.6], [24.8, 56.8, 7.7, 17.7], [-52.8, -24.8, 6.3, 12.5],
  [-24.8, -8, 11.5, 26], [12.3, 40.4, 11.5, 19.8], [-2.7, 2.7, 11.5, 15.2],
  [-27, -9.4, -7.2, -2.3], [9.4, 27, -7.2, -2.3], [-5.5, -3.7, -8.4, -6.6], [3.7, 5.5, -8.4, -6.6],
];
const inRectLocal = (s, p, [x0, x1, y0, y1], pad) => {
  const dx = p.x - s.x, dz = p.z - s.z, c = Math.cos(s.rot), n = Math.sin(s.rot);
  const bx = dx * c - dz * n, by = -(dx * n + dz * c);
  return bx > x0 - pad && bx < x1 + pad && by > y0 - pad && by < y1 + pad;
};
// open ground: the house, its forecourt and gardens, and the vista down to the avenue (it widens toward the house)
export function arasOpen(p) {
  if (inRectLocal(aras, p, [-58, 62, -3, 32], 0) || inRectLocal(aras, p, [-31, 31, -18, 0], 0)) return true;
  const dx = p.x - aras.x, dz = p.z - aras.z, t = dx * aras.f.x + dz * aras.f.z;
  if (t < 0 || t > aras.road + 18) return false;
  const off = Math.abs(dx * aras.f.z - dz * aras.f.x), k = t / aras.road;
  return off < 30 - 14 * Math.min(1, k);
}
// trees framing the house on the lawn, in front of the wings (refs 04-06: tall conifers and big broadleaves either side,
// the wings mostly hidden): [x along the front, y (negative = out on the lawn), species, scale, dark (a conifer)]
export function arasFrameTrees() {
  const T = [[-36, -9, 'lime', 1.35, 1], [-43, -15, 'plane', 1.25, 0], [-50, -8, 'lime', 1.3, 1], [-57, -14, 'chestnut', 1.15, 0], [-39, -24, 'lime', 1.2, 1],
    [36, -8, 'lime', 1.3, 1], [44, -14, 'plane', 1.3, 0], [52, -6, 'chestnut', 1.2, 0], [60, -12, 'lime', 1.35, 1], [41, -24, 'plane', 1.15, 0], [66, -2, 'lime', 1.25, 1]];
  return T.map(([bx, by, species, s, dark]) => ({ ...toWorld(aras, bx, by), species, s, dark: !!dark }));
}
// the mown vista outside the ha-ha (a lawn in the park grass mask)
export function vistaLawn() {
  const f = aras.f, n = { x: f.z, z: -f.x }, a = aras.road + 4, pts = [];
  for (const [t, w] of [[10, 26], [a, 14]]) pts.push({ x: aras.x + f.x * t + n.x * w, z: aras.z + f.z * t + n.z * w });
  for (const [t, w] of [[a, 14], [10, 26]]) pts.push({ x: aras.x + f.x * t - n.x * w, z: aras.z + f.z * t - n.z * w });
  return pts;
}

// ---------- the zoo ----------
const zooSouth = data.zooSouth.map(P);
// outlines nudged in wherever a vertex lands on a road corridor (the squeeze brings Spa Road right up to the lakes)
function keepOffRoads(poly, clear = 2, avoid = null) {
  const c = centroid(poly);
  return poly.map((p) => {
    let q = p;
    for (let k = 0; k < 40 && (fieldAt(q.x, q.z) < clear || (avoid && avoid(q))); k++) q = v2.lerp(q, c, 0.06);
    return q;
  });
}
export const zooSouthPoly = zooSouth;
const H = data.heroes;
const entrance = (() => {
  const a = P(H.zooentrance.a), b = P(H.zooentrance.b), d = v2.norm(v2.sub(a, b));
  // local +X runs from the turnstile (south-west) end to the lodge end; the lettered wall faces the park (away from
  // the zoo's middle): local +X = (cos rot, -sin rot)
  let rot = Math.atan2(-d.z, d.x);
  const m = v2.lerp(a, b, 0.5), f = { x: Math.sin(rot), z: Math.cos(rot) }, c = centroid(zooSouth);
  if (v2.dot(f, v2.sub(m, c)) < 0) rot += Math.PI;
  return { x: m.x, z: m.z, rot };
})();
// nudge a hero's footprint off the road corridors (half extents in its own frame)
function clearSpot(p, rot, hx, hy, step = { x: 0, z: 0 }) {
  const c = Math.cos(rot), n = Math.sin(rot);
  const ok = (q) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy], [0, 0], [0, -hy], [0, hy], [-hx, 0], [hx, 0]].every(([bx, by]) => fieldAt(q.x + bx * c - by * n, q.z - bx * n - by * c) > 1.2);
  let q = { ...p };
  for (let k = 0; k < 60 && !ok(q); k++) q = { x: q.x + step.x, z: q.z + step.z };
  return q;
}
const zooCentre = centroid(zooSouth);
export const zooParts = (() => {
  const parts = { zooentrance: entrance };
  parts.zoolodge = { ...toWorld(entrance, 17.5, 3.6), rot: entrance.rot };
  const eh = P(H.elephanthouse), toC = v2.scale(v2.norm(v2.sub(zooCentre, eh)), 0.5);
  parts.elephanthouse = { ...clearSpot(eh, 0, 6.8, 8.8, toC), rot: 0 };
  const gh = P(H.giraffehouse);
  parts.giraffehouse = { ...clearSpot(gh, 0.4, 4.8, 3.8, { x: 0, z: -0.5 }), rot: 0.4 };
  return parts;
})();
// the heroes' footprints (the model frame's half extents, padded): the lakes and the plains keep clear of them
const HERO_RECTS = { zooentrance: [-21.5, 15, -2, 7.5], zoolodge: [-3.6, 3.6, -4.6, 4.6], elephanthouse: [-7.5, 7.5, -9.5, 9.5], giraffehouse: [-5.5, 5.5, -4.5, 4.5] };
const onHero = (p) => Object.entries(HERO_RECTS).some(([k, r]) => inRectLocal(zooParts[k], p, r, 1));
const lakes = data.lakes.map((r) => keepOffRoads(r.map(P), 2, onHero));
const islands = data.islands.map((r) => r.map(P));
const plains = data.plains.map((r) => keepOffRoads(r.map(P), 2, onHero));
export const zooSite = { ...entrance, w: 28, d: 6.5 };
// the Places view for the zoo: no road comes within ~70 m of the entrance (it opens on the Hollow, a lawn), so the car
// waits on the Hollow's grass in front of the lettered wall, looking at it past the turnstile end
zooSite.view = (() => {
  const f = { x: Math.sin(entrance.rot), z: Math.cos(entrance.rot) }, along = { x: Math.cos(entrance.rot), z: -Math.sin(entrance.rot) };
  const d = v2.norm({ x: f.x - along.x * 0.35, z: f.z - along.z * 0.35 });
  for (let t = 24; t < 60; t += 1) {
    const p = { x: entrance.x + d.x * t, z: entrance.z + d.z * t };
    if (fieldAt(p.x, p.z) > 3) return { x: p.x, z: p.z, heading: Math.atan2(-d.x, -d.z) };
  }
  return { x: entrance.x + f.x * 30, z: entrance.z + f.z * 30, heading: entrance.rot + Math.PI };
})();

// ground inside the zoo kept free of trees: the lakes (the islands keep theirs), the plains, the heroes, the animals
export function zooOpen(p) {
  if (lakes.some((l) => pointInPolygon(p, l)) && !islands.some((i) => pointInPolygon(p, i))) return true;
  if (lakes.some((l) => nearEdge(p, l, 3))) return true;
  if (plains.some((l) => pointInPolygon(p, l) || nearEdge(p, l, 2))) return true;
  for (const [k, s] of Object.entries(zooParts)) {
    const r = k === 'zooentrance' ? 24 : k === 'elephanthouse' ? 16 : 10;
    if ((p.x - s.x) ** 2 + (p.z - s.z) ** 2 < r * r) return true;
  }
  if (animalSpots.some((a) => (a.x - p.x) ** 2 + (a.z - p.z) ** 2 < 36)) return true;
  return false;
}
function nearEdge(p, poly, d) {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], ab = v2.sub(b, a), L2 = v2.dot(ab, ab) || 1e-9;
    const t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), ab) / L2));
    if (v2.len(v2.sub(p, v2.add(a, v2.scale(ab, t)))) < d) return true;
  }
  return false;
}
// the islands' trees (clumps: a few on each of the bigger islands)
export function islandClumps(rand) {
  const out = [];
  for (const isl of islands) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of isl) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const inner = insetPolygon(isl, 1.2), mine = [];
    for (let z = z0 + 2.5; z < z1; z += 5) for (let x = x0 + 2.5; x < x1; x += 5) {
      const p = { x: x + (rand() - 0.5) * 2.5, z: z + (rand() - 0.5) * 2.5 };
      if (pointInPolygon(p, inner)) mine.push(p);
    }
    out.push(...(mine.length ? mine : [centroid(isl)]));
  }
  return out;
}

// ---------- the zoo's ground: lake water, banks, islands, the plains' sand and boulder walls ----------
function flatShape(poly, y) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z))));
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  g.deleteAttribute('uv');
  return g;
}
function paint(g, col, up = false) {
  if (g.index) g = g.toNonIndexed();
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (up) { const nn = new Float32Array(n * 3); for (let i = 0; i < n; i++) nn[i * 3 + 1] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); }
  return g;
}
function ringStrip(poly, w, y) {
  const outer = insetPolygon(poly, -w), pos = [];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length, a = poly[i], b = poly[j], c = outer[j], d = outer[i];
    pos.push(a.x, y, a.z, d.x, y, d.z, c.x, y, c.z, a.x, y, a.z, c.x, y, c.z, b.x, y, b.z);
  }
  for (let i = 0; i < pos.length; i += 9) { // wind every triangle to face up (the outlines come either way round)
    const ax = pos[i + 3] - pos[i], az = pos[i + 5] - pos[i + 2], bx = pos[i + 6] - pos[i], bz = pos[i + 8] - pos[i + 2];
    if (az * bx - ax * bz < 0) for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
export function buildZooGround(scene) {
  const rand = rng(1831);
  const C = (h) => new THREE.Color(h);
  const parts = [], water = [];
  for (const l of lakes) {
    water.push(flatShape(l, KERB_H + 0.03));
    parts.push(paint(ringStrip(l, 1.3, KERB_H + 0.028), C(0x4a4a30), true));
  }
  for (const i of islands) {
    parts.push(paint(flatShape(i, KERB_H + 0.06), C(0x55743a), true));
    parts.push(paint(ringStrip(insetPolygon(i, 0.6), 0.6, KERB_H + 0.058), C(0x6b6242), true));
  }
  for (const pl of plains) parts.push(paint(flatShape(pl, KERB_H + 0.035), C(0xc4ad7f), true));
  // the elephants' yard: a sandy apron in front of their house
  const eh = centroid(A.elephant.map(P));
  { const pts = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283; pts.push({ x: eh.x + Math.cos(a) * 9, z: eh.z + Math.sin(a) * 7 }); } parts.push(paint(flatShape(keepOffRoads(pts), KERB_H + 0.035), C(0xb09a72), true)); }
  // boulder walls: low limestone rocks along the plains' edges and a couple of ridges across (refs 17, 18)
  const rock = new THREE.DodecahedronGeometry(1, 0); rock.deleteAttribute('uv');
  const rocks = [];
  for (const pl of plains) {
    for (let i = 0; i < pl.length; i++) {
      const a = pl[i], b = pl[(i + 1) % pl.length], L = v2.len(v2.sub(b, a));
      for (let t = rand() * 2; t < L; t += 2.2 + rand() * 2.5) {
        if (rand() < 0.35) continue;
        const q = v2.lerp(a, b, t / L);
        rocks.push({ x: q.x, z: q.z, s: 0.5 + rand() * 0.55 });
      }
    }
  }
  for (const r of rocks) {
    const g = rock.clone().scale(r.s * (1 + rand() * 0.6), r.s * 0.55, r.s).rotateY(rand() * 6.28).translate(r.x, KERB_H + r.s * 0.2, r.z);
    g.computeVertexNormals();
    const v = 0.72 + rand() * 0.15;
    parts.push(paint(g, new THREE.Color(v, v * 0.97, v * 0.9)));
  }
  const ground = new THREE.Mesh(mergeGeometries(parts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  ground.receiveShadow = true;
  const wmat = addReflections(new THREE.MeshStandardMaterial({ color: 0x2d4136, roughness: 0.1, metalness: 0.35, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0.5);
  const lake = new THREE.Mesh(mergeGeometries(water), wmat);
  lake.receiveShadow = true;
  const g = new THREE.Group(); g.name = 'Dublin Zoo ground';
  g.add(ground, lake);
  scene.add(g);
  return { group: g, rocks: rocks.length };
}

// ---------- the animals: low-poly, vertex-coloured, all in one static mesh ----------
const animalSpots = [];
const A = data.animals;
function animalGeometry(kind, rand) {
  const parts = [];
  const add = (g, hex) => { g.deleteAttribute('uv'); g = g.toNonIndexed(); g.computeVertexNormals(); parts.push(paint(g, new THREE.Color(hex))); };
  const cyl = (r0, r1, h, s = 6) => new THREE.CylinderGeometry(r1, r0, h, s);
  const legs = (xs, zs, h, r, hex) => { for (const x of xs) for (const z of zs) add(cyl(r, r * 0.8, h, 4).translate(x, h / 2, z), hex); };
  if (kind === 'giraffe') {
    legs([-0.3, 0.3], [-0.75, 0.7], 2.0, 0.09, 0xb8894e);
    add(new THREE.SphereGeometry(1, 7, 5).scale(0.5, 0.55, 1.05).translate(0, 2.35, 0), 0xc99a5a);
    add(cyl(0.22, 0.14, 2.3, 5).rotateX(0.55).translate(0, 3.45, 0.95), 0xc99a5a);
    add(new THREE.BoxGeometry(0.24, 0.26, 0.6).translate(0, 4.5, 1.72), 0xb8894e);
    for (const [x, y, z] of [[0.46, 2.4, 0.3], [-0.46, 2.3, -0.3], [0.44, 2.2, -0.5], [-0.45, 2.45, 0.45]]) add(new THREE.BoxGeometry(0.06, 0.3, 0.35).translate(x, y, z), 0x7a4e26);
    add(new THREE.BoxGeometry(0.06, 0.35, 1.2).rotateX(0.55).translate(0, 3.55, 0.8), 0x7a4e26); // mane
  } else if (kind === 'zebra' || kind === 'oryx') {
    const white = kind === 'zebra' ? 0xf0efe8 : 0xe9e4d6;
    legs([-0.18, 0.18], [-0.55, 0.5], 0.8, 0.06, kind === 'zebra' ? 0x222222 : 0xd9d2c0);
    for (let k = 0; k < 7; k++) add(cyl(0.34, 0.34, 0.2, 7).rotateX(Math.PI / 2).translate(0, 1.05, -0.62 + k * 0.2), kind === 'zebra' && k % 2 ? 0x1c1c1c : white);
    add(cyl(0.16, 0.1, 0.8, 5).rotateX(0.8).translate(0, 1.4, 0.85), kind === 'zebra' ? 0x2a2a2a : white);
    add(new THREE.BoxGeometry(0.2, 0.22, 0.5).translate(0, 1.65, 1.22), kind === 'zebra' ? 0x1a1a1a : 0x6a5a48);
    if (kind === 'oryx') for (const s of [-1, 1]) add(cyl(0.03, 0.015, 1.0, 3).rotateX(-0.6).translate(s * 0.07, 2.05, 0.95), 0x2a2622);
  } else if (kind === 'rhino') {
    legs([-0.35, 0.35], [-0.7, 0.7], 0.7, 0.16, 0x77726c);
    add(new THREE.SphereGeometry(1, 7, 5).scale(0.75, 0.7, 1.35).translate(0, 1.15, 0), 0x8a857e);
    add(new THREE.BoxGeometry(0.55, 0.6, 0.9).translate(0, 0.95, 1.55), 0x807b74);
    add(new THREE.ConeGeometry(0.1, 0.5, 4).translate(0, 1.45, 1.85), 0x5f5a54);
  } else if (kind === 'elephant') {
    legs([-0.45, 0.45], [-0.8, 0.85], 1.55, 0.3, 0x6f6b67);
    add(new THREE.SphereGeometry(1, 8, 6).scale(0.95, 0.9, 1.5).translate(0, 2.3, 0), 0x7d7975);
    add(new THREE.SphereGeometry(0.6, 7, 5).scale(1, 1.1, 0.9).translate(0, 2.55, 1.55), 0x7d7975);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.12, 1.1, 0.85).rotateY(s * 0.5).translate(s * 0.72, 2.45, 1.35), 0x736f6b);
    add(cyl(0.22, 0.1, 1.9, 6).rotateX(0.18).translate(0, 1.45, 2.1), 0x736f6b);
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.06, 0.55, 4).rotateX(Math.PI * 0.62).translate(s * 0.25, 2.0, 1.95), 0xece6d6);
    add(cyl(0.05, 0.02, 0.5, 3).rotateX(1.3).translate(0, 0.15, -1.4), 0x75716d); // tail
  } else if (kind === 'ostrich') {
    legs([-0.1, 0.1], [0], 1.1, 0.04, 0xc6a58f);
    add(new THREE.SphereGeometry(0.45, 6, 4).scale(1, 0.8, 1.3).translate(0, 1.3, 0), 0x222020);
    add(new THREE.SphereGeometry(0.25, 5, 3).translate(0, 1.3, -0.55), 0xefece4);
    add(cyl(0.06, 0.04, 1.0, 4).translate(0, 2.0, 0.35), 0xc6a58f);
    add(new THREE.BoxGeometry(0.1, 0.1, 0.22).translate(0, 2.52, 0.42), 0xc6a58f);
  } else if (kind === 'hippo') {
    add(new THREE.SphereGeometry(1, 7, 4, 0, 6.283, 0, Math.PI / 2).scale(0.8, 0.45, 1.5).translate(0, 0, 0), 0x6f5f5c);
    add(new THREE.BoxGeometry(0.7, 0.35, 0.6).translate(0, 0.12, 1.5), 0x7d6763);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.08, 4, 3).translate(s * 0.25, 0.36, 1.25), 0x3a3230);
  } else if (kind === 'flamingo') {
    add(cyl(0.015, 0.015, 0.8, 3).translate(0, 0.4, 0), 0xd88a8a);
    add(new THREE.SphereGeometry(0.22, 6, 4).scale(0.9, 0.75, 1.25).translate(0, 0.95, 0), 0xf2998f);
    add(cyl(0.035, 0.03, 0.55, 4).rotateX(-0.35).translate(0, 1.25, 0.12), 0xf4a59b);
    add(cyl(0.03, 0.03, 0.3, 4).rotateX(0.6).translate(0, 1.55, 0.14), 0xf4a59b);
    add(new THREE.ConeGeometry(0.04, 0.14, 4).rotateX(Math.PI * 0.8).translate(0, 1.62, 0.3), 0x2a2020);
  }
  void rand;
  return mergeGeometries(parts);
}
// where they stand (known before the park plants its trees round them)
const animalList = (() => {
  const rand = rng(1832), out = [];
  const put = (kind, p, s = 0.9 + rand() * 0.2, y = KERB_H + 0.03) => { out.push({ kind, p, rot: rand() * 6.28, s, y }); animalSpots.push(p); };
  for (const kind of ['giraffe', 'zebra', 'rhino', 'ostrich', 'oryx', 'elephant']) for (const ll of A[kind]) put(kind, P(ll));
  for (const ll of A.hippo) put('hippo', P(ll), 1, KERB_H + 0.02);
  // the flamingos: a pink flock at the lake's edge by their lagoon
  const fc = P(A.flamingo.at);
  for (let k = 0; k < A.flamingo.n; k++) {
    const a = rand() * 6.28, r = Math.sqrt(rand()) * 4.5;
    put('flamingo', { x: fc.x + Math.cos(a) * r, z: fc.z + Math.sin(a) * r * 0.7 });
  }
  return out;
})();
export function buildAnimals(scene) {
  const rand = rng(1833), protos = {};
  const geos = animalList.map((a) => {
    protos[a.kind] ||= animalGeometry(a.kind, rand);
    return protos[a.kind].clone().scale(a.s, a.s, a.s).rotateY(a.rot).translate(a.p.x, a.y, a.p.z);
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = 'Dublin Zoo animals';
  scene.add(mesh);
  return { mesh, count: geos.length, triangles: mesh.geometry.attributes.position.count / 3 };
}

// ---------- collision for the heroes ----------
export function heroSolids(parts) {
  const out = [];
  const at = (s, x0, x1, y0, y1) => {
    const c = toWorld(s, (x0 + x1) / 2, (y0 + y1) / 2);
    out.push({ x: c.x, z: c.z, hx: (x1 - x0) / 2, hz: (y1 - y0) / 2, rot: s.rot });
  };
  for (const b of ARAS_BOXES) at(aras, ...b);
  if (parts.zooentrance) { at(parts.zooentrance, -14, 14, 0, 5.8); at(parts.zooentrance, -21, -20.4, 0, 6); }
  if (parts.zoolodge) at(parts.zoolodge, -2.4, 2.4, -4.2, 3.3);
  if (parts.elephanthouse) at(parts.elephanthouse, -6.5, 6.5, -8.5, 8.5);
  if (parts.giraffehouse) at(parts.giraffehouse, -4.5, 4.5, -3.4, 3.4);
  return out;
}
export function addHeroCollision(parts) {
  for (const b of heroSolids(parts)) addBox(b.x, b.z, b.hx, b.hz, b.rot);
}
