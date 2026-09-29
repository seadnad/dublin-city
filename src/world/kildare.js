// College Green's islands (the Thomas Davis memorial and the Four Angels fountain, Grattan and his sea-horse lamps),
// Molly Malone and St Andrew's Church on Suffolk Street, and the Kildare Street / Merrion Street hero (Leinster House,
// the Library and Museum, Government Buildings, the Natural History Museum, the National Gallery and the Shelbourne).
// docs/research/kildare-street.md. Layout: src/world/collegegreen.js and src/world/kildarelayout.js.
// Statues are statue-kit figures (src/world/statues.js); the islands, plinths, the fountain and the church are Builder
// geometry merged per material; the hero is tools/blender/build_kildare.py (stone materials from heroes.js, lit
// windows and floodlit Portland after dark through setStoneNight). After dark the lamp glass and the torch-bearers'
// lamps glow (setNight).
import * as THREE from 'three';
import { placeParts } from './heroes.js';
import { addStatue } from './statues.js';
import { addBox, addPolyline } from '../game/collision.js';
import { CG_ISLANDS, CG_SPOTS, CG_EAST, cgAt, collegeGreenSites as CS } from './collegegreen.js';
import { KD, KD_BOXES, KD_TORCHES, KD_OBELISK } from './kildarelayout.js';

let lampMat = null;
const lamp = () => (lampMat ||= new THREE.MeshStandardMaterial({ color: 0xfff0cf, emissive: 0xffc98a, emissiveIntensity: 0.1, roughness: 0.3 }));
let waterMat = null;
const water = () => (waterMat ||= new THREE.MeshStandardMaterial({ color: 0x3d5552, roughness: 0.08, metalness: 0.35 }));
let limeMat = null; // Grattan's dressed limestone (docs/research/monuments.md 3.4: #b9b6ad)
const lime = (M) => (limeMat ||= new THREE.MeshStandardMaterial({ color: 0xb9b6ad, map: M.granite.map, roughness: 0.8 }));
let sprayMat = null;
const spray = () => (sprayMat ||= new THREE.MeshStandardMaterial({ color: 0xeef4f5, roughness: 0.2, transparent: true, opacity: 0.45, depthWrite: false }));

// a flat island slab (kerb sides + paved top) from a (world) outline
function islandSlab(b, poly, h, sideMat, topMat) {
  const S = b.site, c = Math.cos(S.rot), s = Math.sin(S.rot);
  // world -> the builder's local frame
  const loc = poly.map((p) => { const dx = p.x - S.x, dz = p.z - S.z; return new THREE.Vector2(dx * c - dz * s, -(dx * s + dz * c)); });
  const shape = new THREE.Shape(loc);
  b.add(new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2), sideMat);
  const top = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, h + 0.005, 0);
  const uv = top.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  b.add(top, topMat);
}

// ---------- College Green ----------
export function collegeGreen({ Builder, M, KERB_H }) {
  const site = { x: CG_ISLANDS[0].poly[0].x, z: CG_ISLANDS[0].poly[0].z, rot: 0 };
  const b = new Builder(site);
  const at = (s, l) => { const p = cgAt(s, l); return { x: p.x - site.x, z: p.z - site.z }; }; // local (rot 0)
  for (const isl of CG_ISLANDS) {
    islandSlab(b, isl.poly, KERB_H, M.granite, M.cobble);
    addPolyline(isl.poly, true);
  }
  const Y = KERB_H;
  // Thomas Davis (Edward Delaney, 1966): a 2.7 m rough bronze on a plain granite pier of about the same height,
  // facing his university
  { const p = at(...CG_SPOTS.davis);
    b.box(1.8, 0.3, 1.8, M.graniteSmooth, { x: p.x, y: Y, z: p.z, ry: -CG_EAST });
    b.box(1.45, 2.4, 1.45, M.graniteSmooth, { x: p.x, y: Y + 0.3, z: p.z, ry: -CG_EAST });
    addStatueAt(b, 'davis', p, Y + 2.7, CG_EAST, 2.7, 'darkBronze'); }
  // the Four Angels fountain: a polygonal basin behind a granite parapet carrying the famine reliefs (six bronze
  // panels), the round granite platform in the pool, four elongated heralds on it facing out, water jets behind them
  { const p = at(...CG_SPOTS.fountain), R = 3.0;
    for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) * Math.PI / 4, x = p.x + Math.cos(a) * R, z = p.z + Math.sin(a) * R, ry = -a + Math.PI / 2;
      b.box(2.45, 0.85, 0.45, M.graniteSmooth, { x, y: Y, z, ry });
      if (k % 4 !== 1) b.box(1.5, 0.55, 0.04, M.bronze, { x: x + Math.cos(a) * 0.24, y: Y + 0.15, z: z + Math.sin(a) * 0.24, ry });
    }
    const pool = new THREE.CircleGeometry(R - 0.2, 16).rotateX(-Math.PI / 2);
    b.add(pool, water(), { x: p.x, y: Y + 0.55, z: p.z });
    b.cyl(1.35, 1.45, 0.8, M.graniteSmooth, { x: p.x, y: Y, z: p.z }, 16);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + CG_EAST, fx = p.x + Math.sin(a) * 0.75, fz = p.z + Math.cos(a) * 0.75;
      addStatueAt(b, 'herald', { x: fx, z: fz }, Y + 0.8, a, 2.9, 'heraldBronze');
      const jx = p.x + Math.sin(a + Math.PI / 4) * 1.9, jz = p.z + Math.cos(a + Math.PI / 4) * 1.9;
      b.cyl(0.04, 0.16, 1.9, spray(), { x: jx, y: Y + 0.5, z: jz }, 6);
    }
    addBox(site.x + p.x, site.z + p.z, R + 0.3, R + 0.3, 0); }
  // Henry Grattan (J. H. Foley, 1876): the orator on a dressed limestone pedestal with scrolled corner brackets over
  // a stepped base, facing Trinity; the two cast-iron sea-horse lamps on the east side
  { const p = at(...CG_SPOTS.grattan), o = (x, y, z) => ({ x: p.x + x, y, z: p.z + z, ry: -CG_EAST });
    let y = Y;
    for (const [w, h, m] of [[3.1, 0.3, lime(M)], [2.7, 0.3, lime(M)], [2.3, 0.35, lime(M)], [1.9, 2.5, lime(M)], [2.3, 0.35, lime(M)], [1.7, 0.2, lime(M)]]) {
      b.box(w, h, w, m, o(0, y, 0)); y += h;
    }
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.3, 0.9, 0.3, lime(M), { ...o(0, Y + 0.95, 0), x: p.x + (sx * 1.0 * Math.cos(CG_EAST) + sz * 1.0 * Math.sin(CG_EAST)), z: p.z + (-sx * 1.0 * Math.sin(CG_EAST) + sz * 1.0 * Math.cos(CG_EAST)) });
    addStatueAt(b, 'orator', p, y, CG_EAST, 3.0, 'greenBronze');
    addBox(site.x + p.x, site.z + p.z, 1.6, 1.6, 0);
    for (const [s, l] of CG_SPOTS.lamps) {
      const q = at(s, l);
      addStatueAt(b, 'seahorse_lamp', q, Y, CG_EAST, 1.78, 'castIron');
      b.box(0.36, 0.56, 0.36, lamp(), { x: q.x, y: Y + 4.2, z: q.z, ry: -CG_EAST }); // the lantern glass
      addBox(site.x + q.x, site.z + q.z, 0.45, 0.45, 0);
    }
  }
  return b.build('College Green islands');
}

// place a kit figure at a builder-local point (the builder here has rot 0, so local = world offset)
function addStatueAt(b, body, p, y, heading, height, finish) {
  b.figure(body, p.x, y, p.z, { h: height, ry: heading - b.site.rot, finish });
}

// a pointed (lancet) opening w x h, its foot at y 0, facing local +z
function lancet(w, h) {
  const hs = h - w * 0.8, sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, hs);
  sh.quadraticCurveTo(w / 2, hs + w * 0.55, 0, h); sh.quadraticCurveTo(-w / 2, hs + w * 0.55, -w / 2, hs);
  sh.lineTo(-w / 2, 0);
  return new THREE.ShapeGeometry(sh, 6);
}
let calpMats = null;
function churchMats(M) {
  return (calpMats ||= {
    wall: M.granite, // calp rubble reads as the shared granite at this distance
    dress: M.graniteSmooth, // granite dressings
    glass: new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.25, metalness: 0.3, emissive: 0xffc98a, emissiveIntensity: 0 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1c1d, roughness: 0.9 }),
  });
}

// ---------- Suffolk Street: Molly Malone and St Andrew's Church ----------
export function suffolkStreet({ Builder, M, KERB_H }) {
  const out = [];
  // one builder in the church's frame (the plaza and Molly's plinth share its rotation): local +z runs to the church
  const c = new Builder(CS.stAndrews), cr = Math.cos(CS.stAndrews.rot), sr = Math.sin(CS.stAndrews.rot);
  const loc = (p) => { const dx = p.x - CS.stAndrews.x, dz = p.z - CS.stAndrews.z; return { x: dx * cr - dz * sr, z: dx * sr + dz * cr }; };
  // the paved forecourt of the church along St Andrew Street, Molly's plinth on it
  c.box(CS.stAndrewsPlaza.w, 0.05, CS.stAndrewsPlaza.d, M.paving, loc(CS.stAndrewsPlaza));
  const mp = loc(CS.molly);
  c.box(3.6, 0.45, 1.7, M.graniteSmooth, mp);
  c.solid(mp.x, mp.z, 3.6, 1.7);
  addStatue({ body: 'molly', x: CS.molly.fig.x, y: 0.45, z: CS.molly.fig.z, rot: CS.molly.face, height: 1.9, finish: 'mollyBronze', polish: { c: [0, 1.32, 0.1], r: 0.17, color: '#c49a55' } });
  // St Andrew's (Lanyon, Lynn & Lanyon, 1860-73): Gothic Revival in dark calp rubble with granite dressings; the
  // north-east tower and broach spire (40 m) on the Suffolk Street corner, the big traceried gable to the street
  const W = CS.stAndrews.w, D = CS.stAndrews.d, L = W - 6, X0 = -3;
  const calp = churchMats(M);
  c.box(L, 12, D, calp.wall, { x: X0 });
  c.gable(D, 8, L, M.slate, { x: X0, y: 12, ry: Math.PI / 2 });                         // the roof, ridge along the street
  for (const sx of [-1, 1]) c.prism(D, 8, 0.6, calp.wall, { x: X0 + sx * (L / 2 - 0.3), y: 12, ry: Math.PI / 2 });
  // the traceried east window in the gable to Suffolk Street, lancets and arched bays along the street front
  c.add(lancet(4.2, 9.5), calp.glass, { x: X0 + L / 2 + 0.05, y: 5.5, ry: Math.PI / 2 });
  c.add(lancet(5.2, 11), calp.dress, { x: X0 + L / 2 + 0.03, y: 5, ry: Math.PI / 2 });
  for (let k = 0; k < 4; k++) {
    const x = X0 - L / 2 + 2.4 + k * ((L - 4.8) / 3);
    c.add(lancet(2.4, 4.2), calp.glass, { x, y: 5.6, z: -D / 2 - 0.05, ry: Math.PI });
    c.add(lancet(3.4, 4.8), calp.dark, { x, y: 0.2, z: -D / 2 - 0.04, ry: Math.PI });   // the open arcade below
    c.box(0.7, 12.6, 0.8, calp.dress, { x: x + (L - 4.8) / 6, z: -D / 2 - 0.3 });       // buttresses
  }
  const tx = W / 2 - 3, tz = -D / 2 + 3;
  c.box(6, 25, 6, calp.wall, { x: tx, z: tz });
  for (const [dx, dz, ry] of [[0, -3.05, Math.PI], [3.05, 0, Math.PI / 2]]) {
    c.add(lancet(1.6, 3.6), calp.dark, { x: tx + dx, y: 19.5, z: tz + dz, ry });        // belfry openings
    c.add(lancet(1.1, 2.4), calp.glass, { x: tx + dx, y: 10, z: tz + dz, ry });
  }
  c.box(6.6, 0.8, 6.6, calp.dress, { x: tx, y: 25 });
  c.add(new THREE.ConeGeometry(3.4, 15, 8).rotateY(Math.PI / 8).translate(0, 7.5, 0), M.slate, { x: tx, y: 25.8, z: tz });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.add(new THREE.ConeGeometry(0.45, 3.6, 6).translate(0, 1.8, 0), calp.dress, { x: tx + sx * 2.9, y: 25.8, z: tz + sz * 2.9 });
  c.solid(0, 0, W, D);
  out.push(c.build("St Andrew's Church and Molly Malone"));
  return out;
}

// ---------- the Kildare Street hero ----------
// Blender node 'kildare' at KDK1, turned so model +X (frame v) is the frame's east and -Y (u) runs south
export async function placeKildare(scene, { Builder, M }) {
  // collision: every building box, whether or not the model loads
  for (const bx of Object.values(KD_BOXES)) addBox(bx.x, bx.z, bx.w / 2, bx.d / 2, bx.rot);
  addBox(KD_OBELISK.x, KD_OBELISK.z, 1.8, 1.8, KD.rot);
  // the Shelbourne's four bronze torch-bearers with their lamps
  const t = new Builder({ x: 0, z: 0, rot: 0 });
  const face = Math.atan2(KD.d.x, KD.d.z); // facing south, onto the Green
  for (const p of KD_TORCHES) {
    t.figure('torchbearer', p.x, p.y, p.z, { h: 1.75, ry: face, finish: 'bronze' });
    // the lamp over the raised hand (the kit figure's torch cup is ~0.24 m to her right, 2.36 m up at nominal)
    const k = 1.75 / 1.78, rx = -Math.cos(face) * 0.24 * k, rz = Math.sin(face) * 0.24 * k;
    t.add(new THREE.SphereGeometry(0.16, 10, 8), lamp(), { x: p.x + rx, y: p.y + 2.44 * k, z: p.z + rz });
  }
  scene.add(t.build('Shelbourne torch-bearers'));
  void M;
  return placeParts(scene, 'kildare', { parts: { kildare: { x: KD.x, z: KD.z, rot: KD.rot } } }, 'Kildare Street');
}

export function setKildareNight(level) {
  if (lampMat) lampMat.emissiveIntensity = 0.1 + level * 3.2;
  if (calpMats) calpMats.glass.emissiveIntensity = level * 0.5;
}
