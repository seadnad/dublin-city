// Life in the Grafton quarter (docs/research/grafton-quarter.md): the flower sellers' stalls at the Harry Street corner
// and near the Green, buskers with their amps and guitar cases and the crowds stopped round them, café tables on
// Chatham Street, Coppinger Row, Castle Market, Drury Street, Harry Street, Duke Street and Anne Street, granite
// benches, Sheffield bike stands, two public bike stations (generic, no branding), and Phil Lynott outside Bruxelles.
//
// Everything is plain vertex-coloured geometry merged into one mesh per 150 m cell (a handful of draw calls); the
// people are extra instances of the pedestrian mesh (src/game/people.js `fixed`), listed by graftonPeople().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, v2, project } from './geo.js';
import { KERB_H } from './roads.js';
import { addBox } from '../game/collision.js';
import { addStatue } from './statues.js';
import { LITE } from '../render/quality.js';
import { gqSites } from './graftonsites.js';

const N = (id) => world.nodes.get(id);
const wayOf = (a, b) => world.ways.find((w) => { const i = w.nodeIds.indexOf(a), j = w.nodeIds.indexOf(b); return i >= 0 && j >= 0 && Math.abs(i - j) === 1; });
// a spot s metres along a -> b, `off` to its left (negative: right); rot is the heading along the road
function along(a, b, s, off = 0) {
  const A = N(a), B = N(b), d = v2.norm(v2.sub(B, A)), left = { x: d.z, z: -d.x };
  return { x: A.x + d.x * s + left.x * off, z: A.z + d.z * s + left.z * off, rot: Math.atan2(d.x, d.z), left };
}
// the footpath side of a street: off to the building line minus `back` (pedestrian streets are paved wall to wall)
const edge = (a, b, hand, back) => { const w = wayOf(a, b); return hand * (w.width / 2 + w.pave - back); };
// the height people stand at there (as people.js: the carriageway is at 0, footpaths at the kerb)
const groundY = (x, z) => { const r = world.nearestRoad(x, z); return r && r.edgeDist < -0.2 ? 0 : KERB_H; };
const rnd = (() => { let s = 20260930; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// ---------- the spots ----------
const FLOWERS = ['#e0305a', '#f0c020', '#f07030', '#e85aa0', '#ffffff', '#b060d0', '#d02020', '#f8e070', '#ff8fb0'];
// (face: +1 when the street's middle is to the left of a -> b, i.e. the stall stands on the right-hand side)
const STALLS = [{ ...along('GR2', 'GFCH', 7.6, edge('GR2', 'GFCH', -1, 1.4)), face: 1 }, { ...along('GR2', 'GFCH', 11.4, edge('GR2', 'GFCH', -1, 1.4)), face: 1 }, { ...along('GFCH', 'SGNW', 41, edge('GFCH', 'SGNW', 1, 1.4)), face: -1 }];
// buskers stand near the shopfronts facing across the street; their crowds gather in front of them
const BUSKERS = [
  { ...along('CG3', 'GR1', 31, edge('CG3', 'GR1', -1, 1.2)), face: 1 },
  { ...along('GRD', 'GFJC', 12, edge('GRD', 'GFJC', 1, 1.2)), face: -1 },
  { ...along('GFCH', 'SGNW', 24, edge('GFCH', 'SGNW', 1, 1.2)), face: -1 },
];
// café table rows: [a, b, from, to, hand, back, parasols]
const CAFES = [
  ['GFCL', 'GFBA', 2, 14, 1, 1.0, false], ['GFBA', 'GFCC', 6, 30, -1, 1.0, false], ['GFBA', 'GFCC', 8, 26, 1, 1.0, false],
  ['SW1', 'GFCP', 6, 40, 1, 1.2, true], ['SW1', 'GFCP', 8, 36, -1, 1.2, true],
  ['SW1', 'CM1', 6, 30, 1, 1.1, true], ['SW1', 'CM1', 10, 28, -1, 1.1, false],
  ['GFDR', 'CM1', 8, 30, -1, 1.1, false], ['GR2', 'GFHA1', 14.5, 22, -1, 0.9, false],
  ['GRD', 'DKM', 8, 26, 1, 1.0, true], ['GR2', 'DSA', 22, 36, -1, 1.0, false],
];
const BENCHES = [along('CG3', 'GR1', 22, 2.6), along('GR2', 'GFCH', 16, -2.6), along('GFCH', 'SGNW', 12, 2.6), along('GFCH', 'SGNW', 32, -2.6),
  along('SGNW', 'GFKR', 30, edge('SGNW', 'GFKR', -1, 1.4)), along('SGNW', 'GFKR', 45, edge('SGNW', 'GFKR', -1, 1.4))];
const BIKE_STANDS = [['GFCW', 'GFCP', 12, -1, 5], ['WK1', 'SW1', 46, 1, 4], ['GFFD', 'SSL1', 10, 1, 4], ['GFCC', 'GFCR', 10, 1, 3]];
// the public bike stations (OSM: Exchequer Street, Clarendon Row)
const STATIONS = (() => {
  const ex = project(53.343054, -6.263406), gA = N('SGG1'), gB = N('GFDR'), dEx = v2.norm(v2.sub(gB, gA));
  return [{ a: 'SGG1', b: 'GFDR', s: v2.dot(v2.sub(ex, gA), dEx), hand: 1, n: 10 }, { a: 'GFCC', b: 'GFKR', s: 20, hand: -1, n: 8 }];
})();
// Phil Lynott (Paul Daly, 2005) on his granite drum outside Bruxelles, leaning on his bass
const LYNOTT = (() => { const b = gqSites.bruxelles, p = along('GR2', 'GFHA1', 16.4, edge('GR2', 'GFHA1', -1, 1.3)); return { ...p, face: Math.atan2(-b.x + p.x, -b.z + p.z) }; })();

// ---------- the people who stay put ----------
export function graftonPeople() {
  const out = [], r2 = (() => { let s = 777; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const Y = (x, z) => groundY(x, z);
  for (const b of BUSKERS) {
    const fx = b.left.x * b.face, fz = b.left.z * b.face; // the way the busker faces
    out.push({ x: b.x, z: b.z, y: Y(b.x, b.z), heading: Math.atan2(fx, fz), pose: 'busk' });
    const n = LITE ? 4 : 8;
    for (let i = 0; i < n; i++) {
      const a = -1.1 + (2.2 * (i + r2() * 0.6)) / n, R = 2.4 + r2() * 1.3;
      const ca = Math.cos(a), sa = Math.sin(a);
      const x = b.x + (fx * ca - fz * sa) * R, z = b.z + (fz * ca + fx * sa) * R;
      out.push({ x, z, y: Y(x, z), heading: Math.atan2(b.x - x, b.z - z) + (r2() - 0.5) * 0.4, pose: 'stand' });
    }
  }
  for (const s of STALLS) {
    const L = (u, v) => ({ x: s.x + s.left.x * u + Math.sin(s.rot) * v, z: s.z + s.left.z * u + Math.cos(s.rot) * v });
    const sel = L(s.face * 0.3, 1.8);
    out.push({ ...sel, y: Y(sel.x, sel.z), heading: s.rot + Math.PI, pose: 'stand' });
    for (let k = 0; k < (LITE ? 1 : 2); k++) {
      const p = L(s.face * (1.9 + r2() * 0.5), (r2() - 0.5) * 2);
      out.push({ ...p, y: Y(p.x, p.z), heading: Math.atan2(s.x - p.x, s.z - p.z), pose: 'stand' });
    }
  }
  for (const t of cafeTables()) for (const c of t.chairs) {
    if (r2() > (LITE ? 0.3 : 0.55)) continue;
    out.push({ x: c.x, z: c.z, y: Y(c.x, c.z), heading: Math.atan2(t.x - c.x, t.z - c.z), pose: 'sit' });
  }
  return out;
}
function cafeTables() {
  const out = [];
  for (const [a, b, s0, s1, hand, back, parasol] of CAFES) {
    const L = v2.len(v2.sub(N(b), N(a)));
    for (let s = s0; s < Math.min(s1, L - 3); s += 2.6) {
      const p = along(a, b, s, edge(a, b, hand, back)), ax = Math.sin(p.rot), az = Math.cos(p.rot);
      out.push({ ...p, parasol, chairs: [{ x: p.x + ax * 0.62, z: p.z + az * 0.62 }, { x: p.x - ax * 0.62, z: p.z - az * 0.62 }] });
    }
  }
  return out;
}

// ---------- geometry ----------
export function buildGraftonQuarter(scene) {
  const t0 = performance.now();
  const cells = new Map();
  const col = new THREE.Color();
  // put a geometry in the world (rotated ry about y, then placed), coloured
  function put(geo, hex, x, y, z, ry = 0, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (o.rx || o.rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.rx || 0, 0, o.rz || 0)));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    col.set(hex);
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const k = `${Math.floor(x / 150)},${Math.floor(z / 150)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(g);
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0);
  // local offsets: (u across the stall / along the heading) rotated by ry
  const loc = (p, ry, u, v) => ({ x: p.x + Math.cos(ry) * u + Math.sin(ry) * v, z: p.z - Math.sin(ry) * u + Math.cos(ry) * v });

  // flower stalls: a stepped stand of timber crates and rows of black buckets heaped with blooms
  for (const s of STALLS) {
    // local frame: u across the street (+ toward its middle), v along it; the steps rise toward the shop behind
    const y0 = groundY(s.x, s.z), ry = s.rot, L = (u, v) => ({ x: s.x + s.left.x * u * s.face + Math.sin(ry) * v, z: s.z + s.left.z * u * s.face + Math.cos(ry) * v });
    for (let step = 0; step < 3; step++) {
      const q = L(0.5 - step * 0.5, 0), h = 0.35 + step * 0.35;
      put(box(0.5, h, 2.6), '#b89a6a', q.x, y0, q.z, ry);
      for (let i = 0; i < 5; i++) {
        const p = L(0.5 - step * 0.5, -1.05 + i * 0.52);
        put(cyl(0.18, 0.14, 0.32, 7), '#1a1a1a', p.x, y0 + h, p.z);
        for (let f = 0; f < 3; f++) put(new THREE.IcosahedronGeometry(0.13 + rnd() * 0.05, 0), FLOWERS[Math.floor(rnd() * FLOWERS.length)], p.x + (rnd() - 0.5) * 0.18, y0 + h + 0.36 + rnd() * 0.12, p.z + (rnd() - 0.5) * 0.18);
        if (rnd() < 0.5) put(cyl(0.01, 0.01, 0.4, 3), '#3f7a2c', p.x, y0 + h + 0.3, p.z);
      }
    }
    // buckets on the ground along the front too
    for (let i = 0; i < 6; i++) { const p = L(1.05, -1.3 + i * 0.52); put(cyl(0.17, 0.14, 0.34, 7), '#1a1a1a', p.x, y0, p.z); put(new THREE.IcosahedronGeometry(0.2, 0), FLOWERS[Math.floor(rnd() * FLOWERS.length)], p.x, y0 + 0.45, p.z); }
    addBox(s.x, s.z, 0.9, 1.4, ry);
  }
  // buskers' gear: the amp, the open guitar case with coins in it, and the guitar in their hands
  for (const b of BUSKERS) {
    const y0 = groundY(b.x, b.z), fx = b.left.x * b.face, fz = b.left.z * b.face, h = Math.atan2(fx, fz);
    const amp = { x: b.x - Math.cos(h) * 0.7, z: b.z + Math.sin(h) * 0.7 };
    put(box(0.42, 0.5, 0.3), '#1c1c1c', amp.x, y0, amp.z, h); put(box(0.36, 0.08, 0.02), '#8a8a8a', amp.x + fx * 0.16, y0 + 0.4, amp.z + fz * 0.16, h);
    const cs = { x: b.x + fx * 1.0 + Math.cos(h) * 0.3, z: b.z + fz * 1.0 - Math.sin(h) * 0.3 };
    put(box(1.0, 0.1, 0.38), '#141414', cs.x, y0, cs.z, h + 0.3); put(box(0.9, 0.02, 0.3), '#8a1a2a', cs.x, y0 + 0.1, cs.z, h + 0.3);
    put(box(1.0, 0.36, 0.04), '#141414', cs.x - Math.sin(h + 0.3) * 0.19, y0 + 0.08, cs.z - Math.cos(h + 0.3) * 0.19, h + 0.3, { rx: -0.3 });
    // the guitar across the chest: body at the right hip, neck up to the left hand
    const gy = y0 + 1.02, gb = { x: b.x + fx * 0.24, z: b.z + fz * 0.24 };
    put(box(0.36, 0.44, 0.09).translate(0, -0.22, 0), '#8a5a2a', gb.x, gy, gb.z, h, { rz: 1.0 });
    put(box(0.06, 0.62, 0.04), '#3a2414', gb.x, gy, gb.z, h, { rz: 1.0 });
    // a mic stand
    const ms = { x: b.x + fx * 0.55 + Math.cos(h) * 0.15, z: b.z + fz * 0.55 - Math.sin(h) * 0.15 };
    put(cyl(0.012, 0.012, 1.5, 4), '#2a2a2a', ms.x, y0, ms.z); put(cyl(0.15, 0.15, 0.02, 6), '#2a2a2a', ms.x, y0, ms.z);
    addBox(amp.x, amp.z, 0.25, 0.2, h);
  }
  // café tables: round tops on a pedestal, bistro chairs, a parasol over some
  for (const t of cafeTables()) {
    const y0 = groundY(t.x, t.z);
    put(cyl(0.34, 0.34, 0.03, 10), '#e8e2d6', t.x, y0 + 0.72, t.z); put(cyl(0.03, 0.03, 0.72, 5), '#1c1c1c', t.x, y0, t.z); put(cyl(0.22, 0.25, 0.03, 8), '#1c1c1c', t.x, y0, t.z);
    for (const c of t.chairs) {
      const ry = Math.atan2(t.x - c.x, t.z - c.z);
      put(box(0.4, 0.04, 0.4), '#3a3f44', c.x, y0 + 0.44, c.z, ry);
      put(box(0.4, 0.42, 0.04), '#3a3f44', c.x - Math.sin(ry) * 0.2, y0 + 0.46, c.z - Math.cos(ry) * 0.2, ry);
      for (const [u, v] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) { const p = { x: c.x + Math.cos(ry) * u + Math.sin(ry) * v, z: c.z - Math.sin(ry) * u + Math.cos(ry) * v }; put(cyl(0.015, 0.015, 0.44, 3), '#3a3f44', p.x, y0, p.z); }
    }
    if (t.parasol) { put(cyl(0.025, 0.025, 2.2, 4), '#e8e2d6', t.x, y0 + 0.75, t.z); put(new THREE.ConeGeometry(1.25, 0.45, 8).translate(0, 0.225, 0), rnd() < 0.5 ? '#efe6cf' : '#1f5a3a', t.x, y0 + 2.5, t.z); }
    addBox(t.x, t.z, 0.4, 0.4, 0);
  }
  // granite benches (King Street's by the Gaiety, a few along Grafton Street)
  for (const b of BENCHES) {
    const y0 = groundY(b.x, b.z);
    put(box(2.0, 0.12, 0.55), '#b9b4a8', b.x, y0 + 0.36, b.z, b.rot + Math.PI / 2);
    for (const u of [-0.75, 0.75]) put(box(0.4, 0.36, 0.45), '#a8a398', b.x + Math.sin(b.rot) * u, y0, b.z + Math.cos(b.rot) * u, b.rot + Math.PI / 2);
    addBox(b.x, b.z, 1.0, 0.3, b.rot + Math.PI / 2);
  }
  // Sheffield stands, most with a bike locked to them
  const bike = (x, y0, z, ry, hex) => {
    for (const u of [-0.52, 0.52]) put(new THREE.TorusGeometry(0.33, 0.025, 4, 12), '#1a1a1a', x + Math.sin(ry) * u, y0 + 0.35, z + Math.cos(ry) * u, ry + Math.PI / 2);
    put(box(0.04, 0.04, 0.95), hex, x, y0 + 0.62, z, ry, { rx: 0.25 });
    put(box(0.04, 0.5, 0.04), hex, x + Math.sin(ry) * -0.2, y0 + 0.35, z + Math.cos(ry) * -0.2, ry, { rx: -0.35 });
    put(box(0.5, 0.03, 0.03), '#1a1a1a', x + Math.sin(ry) * 0.45, y0 + 1.0, z + Math.cos(ry) * 0.45, ry);
    put(box(0.14, 0.05, 0.24), '#1a1a1a', x + Math.sin(ry) * -0.25, y0 + 0.92, z + Math.cos(ry) * -0.25, ry);
  };
  const BIKES = ['#1c3a6a', '#b01c1c', '#1a1a1a', '#e8e2d6', '#2a6a3a', '#6a6a70'];
  for (const [a, b, s0, hand, n] of BIKE_STANDS) {
    for (let i = 0; i < n; i++) {
      const w = wayOf(a, b), p = along(a, b, s0 + i * 1.1, hand * (w.width / 2 + (w.pedestrian ? -0.9 : 0.6))), y0 = groundY(p.x, p.z), ry = p.rot + Math.PI / 2;
      put(new THREE.TorusGeometry(0.4, 0.03, 4, 10, Math.PI).translate(0, 0.4, 0), '#8a9096', p.x, y0 + 0.4, p.z, ry);
      if (rnd() < 0.7) bike(p.x + Math.sin(p.rot) * 0.25, y0, p.z + Math.cos(p.rot) * 0.25, ry, BIKES[Math.floor(rnd() * BIKES.length)]);
      addBox(p.x, p.z, 0.45, 0.2, ry);
    }
  }
  // public bike stations: a row of docks along the kerb, most with a bike, and the pay terminal at the end
  for (const st of STATIONS) {
    const w = wayOf(st.a, st.b);
    for (let i = 0; i < st.n; i++) {
      const p = along(st.a, st.b, st.s - (st.n / 2) * 0.9 + i * 0.9, st.hand * (w.width / 2 + (w.pedestrian ? -1.2 : 0.7))), y0 = groundY(p.x, p.z), ry = p.rot + Math.PI / 2;
      put(box(0.16, 0.95, 0.24), '#9aa0a6', p.x, y0, p.z, ry); put(box(0.18, 0.1, 0.26), '#1c5aa8', p.x, y0 + 0.95, p.z, ry);
      if (i % 4 !== 3) bike(p.x - p.left.x * st.hand * 0.55, y0, p.z - p.left.z * st.hand * 0.55, ry, '#1c5aa8');
    }
    const e = along(st.a, st.b, st.s + (st.n / 2) * 0.9 + 0.6, st.hand * (w.width / 2 + (w.pedestrian ? -1.2 : 0.7))), y0 = groundY(e.x, e.z);
    put(box(0.5, 1.8, 0.3), '#2a2e33', e.x, y0, e.z, e.rot); put(box(0.52, 0.25, 0.32), '#1c5aa8', e.x, y0 + 1.8, e.z, e.rot); put(box(0.3, 0.3, 0.02), '#8ab4e0', e.x + Math.sin(e.rot) * 0, y0 + 1.2, e.z, e.rot);
    const m = along(st.a, st.b, st.s, st.hand * (w.width / 2 + (w.pedestrian ? -1.2 : 0.7)));
    addBox(m.x, m.z, (st.n * 0.9) / 2 + 0.9, 0.5, m.rot + Math.PI / 2);
  }
  // Phil Lynott on his granite drum, the bass guitar at his right side
  {
    const p = LYNOTT, y0 = groundY(p.x, p.z);
    put(cyl(0.6, 0.6, 0.5, 16), '#b9b4a8', p.x, y0, p.z);
    addStatue({ body: 'davis', x: p.x, z: p.z, y: y0 + 0.5, rot: p.face, height: 1.86, finish: 'darkBronze' });
    const g = { x: p.x - Math.cos(p.face) * 0.34, z: p.z + Math.sin(p.face) * 0.34 };
    put(box(0.3, 0.42, 0.06), '#6a4a24', g.x, y0 + 0.55, g.z, p.face, { rz: 0.08 });
    put(box(0.05, 0.62, 0.04), '#3a3028', g.x, y0 + 0.95, g.z, p.face, { rz: 0.08 });
    addBox(p.x, p.z, 0.6, 0.6, 0);
  }

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
  mat.name = 'grafton dressing';
  const group = new THREE.Group();
  group.name = 'Grafton quarter dressing';
  let tris = 0;
  for (const geos of cells.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = !LITE; mesh.receiveShadow = true;
    tris += mesh.geometry.attributes.position.count / 3;
    group.add(mesh);
  }
  scene.add(group);
  return { group, tris: Math.round(tris), ms: Math.round(performance.now() - t0) };
}
