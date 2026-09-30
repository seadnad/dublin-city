// St Stephen's Green inside the railings (docs/research/stephens-green-interior.md): William Sheppard's 1880 layout
// from OSM (src/data/stephens-green.json, fitted into the game's railings by greenmap.js):
//  - the tarmac path network (the perimeter walk, the diagonals, the lakeside walks, the rings round the centre),
//    the paved and setted areas (the Yeats memorial), the hedges;
//  - the lake at its real share of the park (L-shaped, east-west across the north half) with rockwork edges, two
//    islands, the little stone O'Connell Bridge over its west neck and ducks on the water;
//  - the central lawns with their two fountains and bedding, the bandstand, three Victorian shelters and the
//    Superintendent's Lodge;
//  - the memorials: the Three Fates in their pool by the Leeson St gate, Wolfe Tone and his ring of granite pillars
//    ("Tonehenge") by the Merrion Row gate with Delaney's Famine group behind, Lord Ardilaun, Robert Emmet, the Yeats
//    "Knife Edge", the busts (Mangan, Markievicz, Kettle, Joyce) and the O'Donovan Rossa boulder;
//  - granite gate piers, open iron gates and lanterns where the railings open, benches, park lamps (lit after dark,
//    with warm pools on the ground), a few people sitting on the benches and the grass, strollers on the paths
//    (people.js walks them), and a jaunting car waiting at the kerb of St Stephen's Green North.
// The trees and shrubs come from the OSM tree survey (greenPlanting, planted by landmarks.js with the other parks),
// so the lawns open up where the real ones do.
// Everything static is Builder geometry (merged per material, batched with the other landmarks); the ducks, the
// horse's head and the lamp pools are the only per-frame work, and only near the park.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { world, v2, pointInPolygon, insetPolygon } from './geo.js';
import { KERB_H } from './roads.js';
import { getStreets } from './ground.js';
import { rng, makeWaterNormal } from './textures.js';
import { addBox } from '../game/collision.js';
import { addFootLanes } from '../game/people.js';
import { addReflections } from '../render/reflect.js';
import { LITE } from '../render/quality.js';
import { greenMap, greenGates, lakeOutline, layout as L } from './greenmap.js';

const Y = KERB_H; // lawn level
const WATER_LEVEL = KERB_H + 0.02; // the lawn is cut away over the lake; the water lies at lawn level (the city's pavement slab is just below)

// ---------- small canvas textures ----------
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// dark blue-grey park tarmac with a fine chipping speckle (3 m tile)
const tarmacTex = () => canvasTex(128, 128, (g, w, h) => {
  const r = rng(91);
  g.fillStyle = '#56595c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 60 + r() * 70; g.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.25 + r() * 0.35})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(40,42,44,${0.05 + r() * 0.06})`; g.beginPath(); g.arc(r() * w, r() * h, 8 + r() * 22, 0, 6.3); g.fill(); }
});
// granite flags and setts (the Yeats memorial platform, the gate thresholds): 2 m tile
const flagsTex = () => canvasTex(128, 128, (g, w, h) => {
  const r = rng(92);
  g.fillStyle = '#8f8c86'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -12 : 0; x < w; x += 24 + Math.floor(r() * 8)) {
    const v = 125 + r() * 40; g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.fillRect(x + 1, y + 1, 22, 14);
  }
});
// bedding: dark soil with spring flowers and low foliage
const bedTex = () => canvasTex(128, 128, (g, w, h) => {
  const r = rng(93);
  g.fillStyle = '#3a2c22'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.6 ? `rgb(${40 + r() * 30},${70 + r() * 40},${35 + r() * 20})` : ['#e8c63a', '#d8483a', '#f0ece0', '#b04a9a', '#e98a2a'][Math.floor(r() * 5)]; g.beginPath(); g.arc(r() * w, r() * h, 1.2 + r() * 2.2, 0, 6.3); g.fill(); }
});
// the lodge's red brick with a white multi-pane window (one 2.5 m bay by 3 m storey; ref: gate-lodge-st-stephen-s-green)
const lodgeTex = () => canvasTex(80, 96, (g, w, h) => {
  const r = rng(94);
  g.fillStyle = '#8a4432'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) for (let x = (y / 3) % 2 ? -4 : 0; x < w; x += 8) { const v = r() * 30 - 15; g.fillStyle = `rgb(${138 + v},${70 + v * 0.6},${52 + v * 0.5})`; g.fillRect(x, y, 7, 2); }
  g.fillStyle = '#f2efe6'; g.fillRect(22, 30, 36, 44);
  g.fillStyle = '#2d3438';
  for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) g.fillRect(25 + xx * 11, 33 + yy * 13.5, 9, 11.5);
  g.fillStyle = '#b7aa98'; g.fillRect(20, 74, 40, 3);
});
// light pool on the ground under a lamp (additive)
const poolTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'), gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,196,130,1)'); gr.addColorStop(0.5, 'rgba(255,176,110,0.3)'); gr.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

// ---------- geometry helpers ----------
// flat ribbon along a polyline, mitred, ends pushed out by half the width so joins close up; world UVs (3 m tile)
function ribbon(pts, w, y, out) {
  if (pts.length < 2) return;
  const P = pts.map((p) => ({ x: p.x, z: p.z })), n = P.length, h = w / 2;
  const d0 = v2.norm(v2.sub(P[1], P[0])), d1 = v2.norm(v2.sub(P[n - 1], P[n - 2]));
  P[0] = v2.sub(P[0], v2.scale(d0, h * 0.8)); P[n - 1] = v2.add(P[n - 1], v2.scale(d1, h * 0.8));
  const base = out.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const a = v2.norm(v2.sub(P[Math.min(i + 1, n - 1)], P[Math.max(i - 1, 0)]));
    let nx = -a.z, nz = a.x;
    const seg = v2.norm(v2.sub(P[Math.min(i + 1, n - 1)], P[i === n - 1 ? i - 1 : i]));
    const m = Math.max(0.5, Math.abs(nx * -seg.z + nz * seg.x));
    nx *= h / m; nz *= h / m;
    out.pos.push(P[i].x + nx, y, P[i].z + nz, P[i].x - nx, y, P[i].z - nz);
    if (i) { const k = base + i * 2; out.idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
}
function flatGeometry(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  const uv = [];
  for (let i = 0; i < out.pos.length; i += 3) uv.push(out.pos[i] / 3, out.pos[i + 2] / 3);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(out.pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(out.idx);
  return g;
}
function polyGeometry(poly, y, holes = [], uvScale = 3) {
  const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z)));
  for (const hl of holes) shape.holes.push(new THREE.Path(hl.map((p) => new THREE.Vector2(p.x, -p.z))));
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / uvScale, p.getZ(i) / uvScale);
  return g;
}
const distToPolyline = (p, pts) => {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], d = v2.sub(pts[i + 1], a), L2 = v2.dot(d, d) || 1, t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), d) / L2));
    best = Math.min(best, v2.len(v2.sub(p, v2.add(a, v2.scale(d, t)))));
  }
  return best;
};
const bboxOf = (poly) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of poly) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); } return { x0, x1, z0, z1 }; };

// ---------- the plan in game coordinates (shared by the builder and the tree planting) ----------
let plan;
function getPlan() {
  if (plan !== undefined) return plan;
  const G = greenMap();
  if (!G) return (plan = null);
  const at = G.at;
  // path widths: the game keeps people and furniture at full size, so paths stay near their real width
  const paths = L.paths.map((p) => ({ pts: p.uv.map(at), w: p.main ? 3.2 : Math.max(1.7, Math.min(p.w, 4) * 0.66), main: !!p.main, sett: p.s === 'sett' }));
  const steps = L.steps.map((p) => ({ pts: p.uv.map(at), w: Math.max(1.6, Math.min(p.w, 4) * 0.6) }));
  const areas = L.areas.map((a) => ({ poly: a.uv.map(at), sett: a.s === 'sett' }));
  const lake = lakeOutline();
  const M = (k) => (L.monuments[k] ? at(L.monuments[k]) : null);
  const mon = Object.fromEntries(Object.keys(L.monuments).map((k) => [k, M(k)]));
  const fountains = L.fountains.filter((f) => f.name).map((f) => ({ ...at(f.c), r: Math.max(2.6, f.r * 0.72) }));
  const bandstand = L.bandstand ? { ...at(L.bandstand.c), r: 4.8 } : null;
  const shelters = L.shelters.map((s) => ({ ...at(s.c), rot: G.heading(s.c, s.axis) - Math.PI / 2, w: s.w * 0.8, d: s.d * 0.8 }));
  const lodge = L.lodge ? { ...at(L.lodge.c), rot: G.heading(L.lodge.c, L.lodge.axis) - Math.PI / 2, w: L.lodge.w * 0.8, d: L.lodge.d * 0.8 } : null;
  const bridge = L.bridge ? L.bridge.map(at) : null;
  // things that keep a clear lawn round them (trees and shrubs stay out): [point, radius]
  const keep = [];
  for (const f of fountains) keep.push([f, f.r + 4]);
  if (bandstand) keep.push([bandstand, 8]);
  for (const s of shelters) keep.push([s, Math.max(s.w, s.d) / 2 + 2.5]);
  if (lodge) keep.push([lodge, Math.max(lodge.w, lodge.d) / 2 + 2]);
  if (mon.wolfeTone) keep.push([mon.wolfeTone, 9]);
  if (mon.famine) keep.push([mon.famine, 4]);
  if (mon.threeFates) keep.push([mon.threeFates, 7]);
  for (const k of ['ardilaun', 'emmet', 'yeats', 'mangan', 'markievicz', 'kettle', 'joyce', 'rossa']) if (mon[k]) keep.push([mon[k], 3]);
  if (bridge) keep.push([v2.lerp(bridge[0], bridge[1], 0.5), 8]);
  // the central lawns: the two fountains and the ring between them stay open
  if (fountains.length === 2) keep.push([v2.lerp(fountains[0], fountains[1], 0.5), v2.len(v2.sub(fountains[0], fountains[1])) / 2 + 7]);
  const gates = greenGates();
  plan = { G, at, paths, steps, areas, lake, mon, fountains, bandstand, shelters, lodge, bridge, keep, gates };
  return plan;
}

// on the water (the islands are dry land)
const inLake = (p, lake) => lake && pointInPolygon(p, lake.outer) && !lake.islands.some((isl) => pointInPolygon(p, isl));
const onIsland = (p, lake) => lake && lake.islands.some((isl) => pointInPolygon(p, isl));
const nearLakeEdge = (p, lake, pad) => lake && (distToPolyline(p, [...lake.outer, lake.outer[0]]) < pad);

// Where trees and shrubs may stand: off the paths, out of the lake, clear of the fountains, memorials and buildings
export function greenClear(p, pad = 0) {
  const P = getPlan();
  if (!P) return true;
  for (const pa of P.paths) if (distToPolyline(p, pa.pts) < pa.w / 2 + 1.2 + pad) return false;
  for (const st of P.steps) if (distToPolyline(p, st.pts) < st.w / 2 + 1 + pad) return false;
  for (const a of P.areas) if (pointInPolygon(p, a.poly)) return false;
  if (inLake(p, P.lake) || (!onIsland(p, P.lake) && nearLakeEdge(p, P.lake, 1.5 + pad))) return false;
  for (const [c, r] of P.keep) if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 < (r + pad) ** 2) return false;
  for (const g of P.gates) if ((p.x - g.x) ** 2 + (p.z - g.z) ** 2 < (5 + pad) ** 2) return false;
  return true;
}

// The Green's planting: the surveyed trees (thinned to the game's spacing), the holly-and-laurel understorey inside
// the railings, and shrubberies along the lake and on its islands. Returns { trees: [{x, z, s, species?, tint?}], shrubs }.
export function greenPlanting(park, rand, archClear) {
  const P = getPlan();
  if (!P) return null;
  const trees = [], shrubs = [];
  const near = (list, p, d) => list.some((q) => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < d * d);
  const inside = insetPolygon(park.poly, 2.2);
  const dark = new THREE.Color(0.62, 0.72, 0.58);
  // perimeter belt trees first (the real belt is dense), then the specimen trees on the lawns
  const surveyed = L.trees.map(([u, v, sp]) => ({ p: P.at([u, v]), sp, edge: Math.min(u, 1 - u, v, 1 - v) })).sort((a, b) => a.edge - b.edge);
  for (const t of surveyed) {
    const p = t.p;
    if (!pointInPolygon(p, inside) || !archClear(p) || !greenClear(p)) continue;
    if (near(trees, p, t.edge < 0.08 ? 5.8 : 8.5)) continue; // the belt stays dense, the lawns open
    const holly = t.sp === 'holly';
    trees.push({ x: p.x, z: p.z, s: 1.0 + rand() * 0.38, species: holly ? 'lime' : t.sp || null, tint: holly ? dark : null });
  }
  // the understorey band just inside the railings (open at the gates)
  const ring = insetPolygon(park.poly, 3.4);
  for (let k = 0; k < ring.length; k++) {
    const a = ring[k], b = ring[(k + 1) % ring.length], Ln = v2.len(v2.sub(b, a));
    for (let t = rand() * 3.4; t < Ln; t += 3.4 * (0.8 + rand() * 0.4)) {
      const q = v2.lerp(a, b, t / Ln), p = { x: q.x + (rand() - 0.5) * 0.8, z: q.z + (rand() - 0.5) * 0.8 };
      if (!archClear(p) || P.gates.some((g) => (p.x - g.x) ** 2 + (p.z - g.z) ** 2 < 36)) continue;
      if (P.paths.some((pa) => distToPolyline(p, pa.pts) < pa.w / 2 + 0.6)) continue;
      shrubs.push({ ...p, rot: rand() * 6.28, s: new THREE.Vector3(2 + rand() * 1.6, 1.6 + rand() * 1.4, 2 + rand() * 1.6), c: Math.floor(rand() * 5) });
    }
  }
  // shrubberies along the lake shore and on the islands (ref: lake-st-stephen-s-green)
  if (P.lake) {
    const outer = P.lake.outer, c0 = bboxOf(outer), cx = (c0.x0 + c0.x1) / 2, cz = (c0.z0 + c0.z1) / 2;
    for (let i = 0; i < outer.length; i++) {
      if (rand() < 0.45) continue;
      const a = outer[i], b = outer[(i + 1) % outer.length], m = v2.lerp(a, b, 0.5), d = v2.norm(v2.sub(b, a));
      let n = { x: -d.z, z: d.x };
      if (pointInPolygon(v2.add(m, v2.scale(n, 1)), outer)) n = v2.scale(n, -1); // point landward
      const p = v2.add(m, v2.scale(n, 2.4 + rand() * 1.5));
      if (!greenClear(p, -1.2) || near(trees, p, 2.5)) continue;
      shrubs.push({ ...p, rot: rand() * 6.28, s: new THREE.Vector3(1.8 + rand() * 1.4, 1.2 + rand() * 1.1, 1.8 + rand() * 1.4), c: Math.floor(rand() * 5) });
    }
    for (const isl of P.lake.islands) {
      const bb = bboxOf(isl);
      for (let k = 0; k < 40; k++) {
        const p = { x: bb.x0 + rand() * (bb.x1 - bb.x0), z: bb.z0 + rand() * (bb.z1 - bb.z0) };
        if (!pointInPolygon(p, isl) || near(shrubs, p, 2.2)) continue;
        shrubs.push({ ...p, rot: rand() * 6.28, s: new THREE.Vector3(1.6 + rand() * 1.3, 1.3 + rand() * 1.3, 1.6 + rand() * 1.3), c: Math.floor(rand() * 5) });
      }
    }
    void cx; void cz;
  }
  console.log(`St Stephen's Green planting: ${trees.length} trees, ${shrubs.length} shrubs`);
  return { trees, shrubs };
}

// ---------- figures ----------
// a seated person (on a bench, or on the grass with the legs out), vertex-coloured; local +z is where they face
function seatedGeometry(col, onGrass) {
  const parts = [];
  const add = (g, c) => { g = g.index ? g.toNonIndexed() : g; const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); parts.push(g); };
  const seat = onGrass ? 0.1 : 0.47;
  add(new THREE.CylinderGeometry(0.17, 0.19, 0.58, 7).scale(1, 1, 0.65).translate(0, seat + 0.33, -0.05), col.top); // torso
  add(new THREE.SphereGeometry(0.105, 8, 6).translate(0, seat + 0.77, -0.03), col.skin); // head
  add(new THREE.SphereGeometry(0.112, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, seat + 0.785, -0.045), col.hair);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.13, 0.13, 0.46).translate(s * 0.1, seat + 0.07, 0.18), col.legs); // thighs
    if (onGrass) add(new THREE.BoxGeometry(0.12, 0.12, 0.44).translate(s * 0.1, 0.07, 0.62), col.legs); // shins out on the grass
    else add(new THREE.BoxGeometry(0.12, 0.44, 0.12).translate(s * 0.1, 0.22, 0.4), col.legs); // shins down
    add(new THREE.BoxGeometry(0.09, 0.4, 0.1).rotateX(-0.5).translate(s * 0.22, seat + 0.36, 0.06), col.top); // arms
  }
  return mergeGeometries(parts);
}
// a mallard: body, head (green on the drakes) and a bill; ~50 triangles
function duckGeometry(head = 0x1f5a36, body = 0x7a7066) {
  const parts = [];
  const add = (g, hex) => { g = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); parts.push(g); };
  add(new THREE.SphereGeometry(0.2, 7, 4).scale(0.8, 0.55, 1.35).translate(0, 0.06, 0), body);
  add(new THREE.SphereGeometry(0.085, 6, 4).translate(0, 0.25, 0.2), head);
  add(new THREE.ConeGeometry(0.035, 0.1, 4).rotateX(Math.PI / 2).translate(0, 0.24, 0.31), 0xd9a62a);
  return mergeGeometries(parts);
}

// ---------- the build ----------
// Builder, M: landmarks.js's merged-geometry builder and materials. Returns null if the Green isn't on the map.
export function buildGreen(scene, { Builder, M, statue }) {
  const P = getPlan();
  if (!P) return null;
  const t0 = performance.now();
  const rand = rng(1880);
  const { at, G } = P;
  const b = new Builder({ x: 0, z: 0, rot: 0 });
  const mats = {
    tarmac: new THREE.MeshStandardMaterial({ map: tarmacTex(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    flags: new THREE.MeshStandardMaterial({ map: flagsTex(), roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    bed: new THREE.MeshStandardMaterial({ map: bedTex(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    white: new THREE.MeshStandardMaterial({ color: 0xece9e0, roughness: 0.7 }),
    shingle: new THREE.MeshStandardMaterial({ color: 0x7a4b38, roughness: 0.9 }),
    slate: new THREE.MeshStandardMaterial({ color: 0x4a4f55, roughness: 0.75 }),
    shelterWood: new THREE.MeshStandardMaterial({ color: 0x5b4633, roughness: 0.85 }),
    brick: new THREE.MeshStandardMaterial({ color: 0x8c4f3c, roughness: 0.9 }),
    lodge: new THREE.MeshStandardMaterial({ map: lodgeTex(), roughness: 0.88 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0x6e3a2e, roughness: 0.85 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x33502a, roughness: 0.95 }),
    phormium: new THREE.MeshStandardMaterial({ color: 0x3c4a2c, roughness: 0.8, side: THREE.DoubleSide }),
    bench: new THREE.MeshStandardMaterial({ color: 0x7a5234, roughness: 0.8 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x8b887e, roughness: 0.95, flatShading: true }), // rough-hewn granite (the Tone pillars, rockwork)
    plinth: new THREE.MeshStandardMaterial({ color: 0x9c9a93, roughness: 0.75 }), // dressed granite
    fountainWater: addReflections(new THREE.MeshStandardMaterial({ color: 0x3e5f66, roughness: 0.1, metalness: 0.3, emissive: 0x6fb6ff, emissiveIntensity: 0 }), 0.6),
    jet: new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 0.2, transparent: true, opacity: 0.35, emissive: 0xcfe6ff, emissiveIntensity: 0, depthWrite: false }),
  };

  // --- paths, paved areas, steps ---
  const tar = { pos: [], idx: [] }, flag = { pos: [], idx: [] };
  for (const pa of P.paths) ribbon(pa.pts, pa.w, Y + 0.012, pa.sett ? flag : tar);
  for (const st of P.steps) ribbon(st.pts, st.w, Y + 0.012, flag);
  const flatGroup = new THREE.Group(); flatGroup.name = "St Stephen's Green paths";
  const tarGeo = mergeGeometries([flatGeometry(tar), ...P.areas.filter((a) => !a.sett).map((a) => polyGeometry(a.poly, Y + 0.013).toNonIndexed().setIndex(null))].map((g) => (g.index ? g.toNonIndexed() : g)));
  const flagGeo = mergeGeometries([flatGeometry(flag), ...P.areas.filter((a) => a.sett).map((a) => polyGeometry(a.poly, Y + 0.014, [], 2))].map((g) => (g.index ? g.toNonIndexed() : g)));
  for (const [g, m] of [[tarGeo, mats.tarmac], [flagGeo, mats.flags]]) { const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; flatGroup.add(mesh); }
  // the bridge path's approaches, the gate thresholds (setts), the circle round each memorial
  const disc = (c, r, mat, y = Y + 0.015, seg = 28) => b.add(new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2), mat, { x: c.x, y, z: c.z });

  // --- hedges (low clipped box and privet) ---
  for (const h of L.hedges) {
    const pts = h.uv.map(at);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], c = pts[i + 1], d = v2.sub(c, a), Ln = v2.len(d);
      if (Ln < 0.3) continue;
      b.box(0.7, 0.6, Ln + 0.5, mats.hedge, { x: (a.x + c.x) / 2, y: Y, z: (a.z + c.z) / 2, ry: Math.atan2(d.x, d.z) });
    }
  }

  // --- the lake: water, rockwork edges, islands ---
  const lakeGroup = new THREE.Group(); lakeGroup.name = "St Stephen's Green lake";
  let waterMat = null, duckSys = null;
  if (P.lake) {
    const wn = makeWaterNormal(128); wn.repeat.set(1 / 9, 1 / 9);
    waterMat = addReflections(new THREE.MeshStandardMaterial({ color: 0x22332a, roughness: 0.22, metalness: 0.1, normalMap: wn, normalScale: new THREE.Vector2(0.2, 0.2) }), 0.35); // a still, dark park lake
    const water = new THREE.Mesh(polyGeometry(P.lake.outer, WATER_LEVEL, P.lake.islands, 1), waterMat);
    water.receiveShadow = true; lakeGroup.add(water);
    // islands: lawn at the park's level
    const grass = getStreets().grassMat;
    for (const isl of P.lake.islands) { const m = new THREE.Mesh(polyGeometry(isl, Y + 0.004, [], 1), grass); m.receiveShadow = true; lakeGroup.add(m); }
    // a stone kerb along every shore, then rockwork: big weathered stones half in the water
    const rocks = [];
    for (const ring of [P.lake.outer, ...P.lake.islands]) {
      const closed = [...ring, ring[0]];
      for (let i = 0; i + 1 < closed.length; i++) {
        const a = closed[i], c = closed[i + 1], d = v2.sub(c, a), Ln = v2.len(d);
        if (Ln < 0.05) continue;
        b.box(0.4, 0.14, Ln + 0.2, mats.rock, { x: (a.x + c.x) / 2, y: Y - 0.02, z: (a.z + c.z) / 2, ry: Math.atan2(d.x, d.z) });
        for (let t = rand() * 1.2; t < Ln; t += 1.1 + rand() * 0.9) {
          const q = v2.lerp(a, c, t / Ln);
          rocks.push({ x: q.x + (rand() - 0.5) * 0.5, y: WATER_LEVEL - 0.08, z: q.z + (rand() - 0.5) * 0.5, rot: rand() * 6.28,
            s: new THREE.Vector3(0.5 + rand() * 0.6, 0.28 + rand() * 0.3, 0.45 + rand() * 0.5), c: rand() });
        }
      }
    }
    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    { const p = rockGeo.attributes.position, r2 = rng(5); for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + r2() * 0.35), Math.max(-0.3, p.getY(i)) * (0.8 + r2() * 0.3), p.getZ(i) * (0.8 + r2() * 0.35)); rockGeo.computeVertexNormals(); }
    const rockMesh = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), rocks.length);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
    rocks.forEach((r, i) => {
      rockMesh.setMatrixAt(i, _m.compose(new THREE.Vector3(r.x, r.y, r.z), _q.setFromAxisAngle(_up, r.rot), r.s));
      rockMesh.setColorAt(i, _c.setRGB(0.07 + r.c * 0.04, 0.075 + r.c * 0.04, 0.055 + r.c * 0.03)); // mossy grey-green
    });
    rockMesh.castShadow = rockMesh.receiveShadow = true;
    lakeGroup.add(rockMesh);

    // ducks: drift and bob on the open water (instanced, updated only near the park)
    const n = LITE ? 12 : 26, ducks = [], bb = bboxOf(P.lake.outer);
    const onWater = (p) => inLake(p, P.lake) && !nearLakeEdge(p, P.lake, 1.2) && !P.lake.islands.some((isl) => distToPolyline(p, [...isl, isl[0]]) < 1);
    for (let tries = 0; ducks.length < n && tries < 2000; tries++) {
      const p = { x: bb.x0 + rand() * (bb.x1 - bb.x0), z: bb.z0 + rand() * (bb.z1 - bb.z0) };
      if (!onWater(p)) continue;
      const cl = ducks.length && rand() < 0.5 ? ducks[Math.floor(rand() * ducks.length)] : null; // families paddle together
      const q = cl ? { x: cl.x + (rand() - 0.5) * 3, z: cl.z + (rand() - 0.5) * 3 } : p;
      if (!onWater(q)) continue;
      ducks.push({ x: q.x, z: q.z, h: rand() * 6.28, sp: 0.15 + rand() * 0.2, ph: rand() * 6.28, turn: 0 });
    }
    // drakes (grey body, bottle-green head) and the brown hens: one instanced mesh each
    const duckMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    const kinds = [[duckGeometry(0x1f5a36, 0x8a8478), ducks.filter((_, i) => i % 3)], [duckGeometry(0x5a4632, 0x6b5440), ducks.filter((_, i) => !(i % 3))]]
      .map(([geo, list]) => { const m = new THREE.InstancedMesh(geo, duckMat, Math.max(1, list.length)); m.count = list.length; m.castShadow = true; m.frustumCulled = false; lakeGroup.add(m); return [m, list]; });
    const S = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3(), lc = { x: (bb.x0 + bb.x1) / 2, z: (bb.z0 + bb.z1) / 2 };
    const place = (time) => {
      for (const [m, list] of kinds) { list.forEach((d, i) => m.setMatrixAt(i, _m.compose(_v.set(d.x, WATER_LEVEL + 0.01 + Math.sin(time * 1.7 + d.ph) * 0.012, d.z), _q.setFromAxisAngle(_up, d.h), S))); m.instanceMatrix.needsUpdate = true; }
    };
    place(0);
    duckSys = {
      update(dt, time, camera) {
        if (!camera || (camera.position.x - lc.x) ** 2 + (camera.position.z - lc.z) ** 2 > 260 * 260) return;
        for (const d of ducks) {
          if (rand() < dt * 0.25) d.turn = (rand() - 0.5) * 1.2;
          d.h += d.turn * dt;
          const nx = d.x + Math.sin(d.h) * d.sp * dt, nz = d.z + Math.cos(d.h) * d.sp * dt;
          if (onWater({ x: nx, z: nz })) { d.x = nx; d.z = nz; } else d.h += Math.PI * (0.6 + rand() * 0.4);
        }
        place(time);
      },
    };
  }

  // --- the O'Connell Bridge: one low rubble-granite arch with a humped deck and parapets (ref: lake-...-5421973288) ---
  if (P.bridge) {
    const [p0, p1] = P.bridge, mid = v2.lerp(p0, p1, 0.5), dir = v2.norm(v2.sub(p1, p0));
    const Lb = Math.max(11, v2.len(v2.sub(p1, p0)) + 7), W = 3.2, half = Lb / 2, span = 3.6;
    const top = (x) => Y + 0.95 + 0.35 * (1 - (x / half) ** 2);
    const bs = new Builder({ x: mid.x, z: mid.z, rot: Math.atan2(-dir.z, dir.x) });
    const shape = new THREE.Shape();
    shape.moveTo(-half, WATER_LEVEL - 0.1);
    shape.lineTo(-span, WATER_LEVEL - 0.1); shape.lineTo(-span, WATER_LEVEL + 0.3);
    shape.absellipse(0, WATER_LEVEL + 0.3, span, 0.75, Math.PI, 0, true);
    shape.lineTo(span, WATER_LEVEL - 0.1); shape.lineTo(half, WATER_LEVEL - 0.1);
    for (let k = 0; k <= 12; k++) { const x = half - (k / 12) * Lb; shape.lineTo(x, top(x)); }
    shape.closePath();
    const scaleUV = (g, s) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s); return g; };
    bs.add(scaleUV(new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -W / 2), 1.5), M.granite);
    // parapets: a band 0.65 m high above the deck on both sides, with a coping
    const band = new THREE.Shape();
    for (let k = 0; k <= 12; k++) { const x = -half + (k / 12) * Lb; k ? band.lineTo(x, top(x)) : band.moveTo(x, top(x)); }
    for (let k = 12; k >= 0; k--) { const x = -half + (k / 12) * Lb; band.lineTo(x, top(x) + 0.65); }
    for (const s of [-1, 1]) bs.add(scaleUV(new THREE.ExtrudeGeometry(band, { depth: 0.35, bevelEnabled: false }).translate(0, 0, s * (W / 2 - 0.175) - 0.175), 1.5), M.granite);
    // piers at the parapet ends (the square newel at the right of the reference photo)
    for (const sx of [-1, 1]) for (const s of [-1, 1]) bs.box(0.6, top(sx * half) + 0.85 - Y, 0.6, M.granite, { x: sx * (half - 0.3), y: Y, z: s * (W / 2 - 0.175) });
    // tarmac along the deck
    const deck = new THREE.Shape();
    for (let k = 0; k <= 12; k++) { const x = -half + (k / 12) * Lb; k ? deck.lineTo(x, top(x) + 0.01) : deck.moveTo(x, top(x) + 0.01); }
    for (let k = 12; k >= 0; k--) { const x = -half + (k / 12) * Lb; deck.lineTo(x, top(x) + 0.02); }
    bs.add(new THREE.ExtrudeGeometry(deck, { depth: W - 0.7, bevelEnabled: false }).translate(0, 0, -(W - 0.7) / 2), mats.tarmac);
    // ramps down to the paths at both ends (the deck rises about a metre)
    for (const sx of [-1, 1]) {
      const g = new THREE.BufferGeometry(), h0 = top(sx * half) + 0.02, x0 = sx * half, x1 = sx * (half + 3.5), w2 = (W - 0.7) / 2;
      g.setAttribute('position', new THREE.Float32BufferAttribute([x0, h0, -w2, x0, h0, w2, x1, Y + 0.012, w2, x1, Y + 0.012, -w2], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex(sx > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]); g.computeVertexNormals();
      bs.add(g, mats.tarmac);
      bs.add(new THREE.BoxGeometry(3.6, 1, W).translate(sx * (half + 1.6), (h0 + Y) / 2 - 0.5, 0), M.granite, { sy: 1 }); // the earth ramp's stone sides
    }
    lakeGroup.add(bs.build("O'Connell Bridge (St Stephen's Green)"));
  }

  // --- the central lawns: the two fountains in granite basins, bedding and phormium clumps ---
  const fountainJets = [];
  for (const f of P.fountains) {
    const r = f.r;
    b.cyl(r, r + 0.15, 0.5, M.granite, { x: f.x, y: Y, z: f.z }, 28);
    b.add(new THREE.CircleGeometry(r - 0.25, 28).rotateX(-Math.PI / 2), mats.fountainWater, { x: f.x, y: Y + 0.44, z: f.z });
    b.cyl(0.45, 0.6, 1.1, M.granite, { x: f.x, y: Y + 0.3, z: f.z }, 12);
    b.cyl(1.5, 0.35, 0.35, M.granite, { x: f.x, y: Y + 1.4, z: f.z }, 16); // the bowl
    b.add(new THREE.CircleGeometry(1.35, 16).rotateX(-Math.PI / 2), mats.fountainWater, { x: f.x, y: Y + 1.74, z: f.z });
    b.cyl(0.14, 0.2, 0.7, M.granite, { x: f.x, y: Y + 1.7, z: f.z }, 8);
    // the jet and its falling veil
    b.add(new THREE.CylinderGeometry(0.05, 0.12, 2.4, 8, 1, true).translate(0, 1.2, 0), mats.jet, { x: f.x, y: Y + 2.3, z: f.z });
    b.add(new THREE.ConeGeometry(0.9, 1.2, 12, 1, true).translate(0, -0.6, 0), mats.jet, { x: f.x, y: Y + 3.0, z: f.z });
    fountainJets.push(f);
    // bedding round the basin: four beds on the diagonals, each with a phormium
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2, c = { x: f.x + Math.cos(a) * (r + 3.4), z: f.z + Math.sin(a) * (r + 3.4) };
      if (!greenPathFree(c, 1.6)) continue;
      disc(c, 1.6, mats.bed, Y + 0.02, 18);
      phormium(b, c.x, c.z, 0.9 + rand() * 0.3, mats.phormium, rand);
    }
  }
  // more round beds on the lawns round the circle (ref: centre-of-st-stephens-green)
  if (P.fountains.length === 2) {
    const c = v2.lerp(P.fountains[0], P.fountains[1], 0.5), R = v2.len(v2.sub(P.fountains[0], P.fountains[1])) / 2 + 3;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 6.283 + 0.3, q = { x: c.x + Math.cos(a) * R * 0.95, z: c.z + Math.sin(a) * R * 0.75 };
      if (!greenPathFree(q, 2.2) || P.fountains.some((f) => v2.len(v2.sub(f, q)) < f.r + 2.5)) continue;
      disc(q, 1.9, mats.bed, Y + 0.02, 18);
      if (k % 2 === 0) phormium(b, q.x, q.z, 1, mats.phormium, rand);
    }
  }

  // --- the bandstand: a white timber octagon on a stone plinth under a shingled roof (ref: duckpond-and-bandstand) ---
  if (P.bandstand) {
    const { x, z, r } = P.bandstand;
    b.add(new THREE.CylinderGeometry(r + 0.3, r + 0.4, 0.7, 8).translate(0, 0.35, 0), M.granite, { x, y: Y, z, ry: Math.PI / 8 });
    b.add(new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.08, 8), mats.white, { x, y: Y + 0.74, z, ry: Math.PI / 8 });
    const H = 2.9, top = Y + 0.7 + H, facing = G.heading(L.bandstand.c, [L.bandstand.c[0], L.bandstand.c[1] - 0.2]); // opening towards the lake
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      b.box(0.2, H, 0.2, mats.white, { x: px, y: Y + 0.7, z: pz, ry: a });
      const a2 = a + Math.PI / 8, ex = x + Math.sin(a2) * r * Math.cos(Math.PI / 8), ez = z + Math.cos(a2) * r * Math.cos(Math.PI / 8);
      const side = 2 * r * Math.sin(Math.PI / 8);
      const front = Math.abs(Math.atan2(Math.sin(a2 - facing), Math.cos(a2 - facing))) < 0.3;
      if (!front) { // the railing: a rail and balusters
        b.box(side, 0.08, 0.1, mats.white, { x: ex, y: Y + 1.62, z: ez, ry: a2 });
        b.box(side, 0.55, 0.03, mats.white, { x: ex, y: Y + 0.95, z: ez, ry: a2 });
      }
      b.box(side, 0.35, 0.12, mats.white, { x: ex, y: top - 0.35, z: ez, ry: a2 }); // fascia
    }
    b.add(new THREE.ConeGeometry(r + 0.9, 2.1, 8).translate(0, 1.05, 0), mats.shingle, { x, y: top, z, ry: Math.PI / 8 });
    b.cyl(0.05, 0.1, 0.8, mats.white, { x, y: top + 2.0, z }, 6);
  }

  // --- the Victorian shelters: timber posts, a boarded back and a hipped slate roof ---
  for (const s of P.shelters) {
    const w = Math.max(4.5, s.w), d = Math.max(3.8, s.d), h = 2.5, c = Math.cos(s.rot), sn = Math.sin(s.rot);
    const lp = (lx, lz) => ({ x: s.x + lx * c + lz * sn, z: s.z - lx * sn + lz * c });
    b.box(w + 0.4, 0.15, d + 0.4, M.granite, { x: s.x, y: Y, z: s.z, ry: s.rot });
    for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]]) { const q = lp(lx * (w / 2 - 0.15), lz * (d / 2 - 0.15)); b.box(0.18, h, 0.18, mats.shelterWood, { x: q.x, y: Y + 0.15, z: q.z, ry: s.rot }); }
    { const q = lp(0, -d / 2 + 0.12); b.box(w - 0.3, 1.6, 0.08, mats.shelterWood, { x: q.x, y: Y + 0.15, z: q.z, ry: s.rot }); } // the boarded back
    { const q = lp(0, -d / 2 + 0.5); b.box(w - 0.6, 0.08, 0.4, mats.bench, { x: q.x, y: Y + 0.6, z: q.z, ry: s.rot }); } // the bench along it
    b.add(new THREE.ConeGeometry(Math.SQRT1_2 * 1.0, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), mats.slate, { x: s.x, y: Y + 0.15 + h, z: s.z, ry: s.rot, sx: w + 0.9, sy: 1.5, sz: d + 0.9 });
  }

  // --- the Superintendent's Lodge: two storeys of red brick under steep tiled gables, tall brick chimneys ---
  if (P.lodge) {
    const s = P.lodge, w = Math.max(7, s.w), d = Math.max(6, s.d);
    b.facade(w, 5.8, d, mats.lodge, mats.brick, { x: s.x, y: Y, z: s.z, ry: s.rot }, 2.5, 3);
    b.prism(d + 0.9, 3.4, w + 0.8, mats.tiles, { x: s.x, y: Y + 5.8, z: s.z, ry: s.rot + Math.PI / 2 });
    const c = Math.cos(s.rot), sn = Math.sin(s.rot);
    for (const lx of [-w / 2 + 1, w / 2 - 1.4]) b.box(0.7, 3.2, 0.7, mats.brick, { x: s.x + lx * c, y: Y + 6.3, z: s.z - lx * sn, ry: s.rot });
    addBox(s.x, s.z, w / 2, d / 2, s.rot);
  }

  // --- memorials ---
  const mon = P.mon, toward = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
  const plinth = (p, w, h, rot, mat = mats.plinth) => { b.box(w + 0.5, 0.35, w + 0.5, mat, { x: p.x, y: Y, z: p.z, ry: rot }); b.box(w, h - 0.35, w, mat, { x: p.x, y: Y + 0.35, z: p.z, ry: rot }); b.box(w + 0.2, 0.18, w + 0.2, mat, { x: p.x, y: Y + h - 0.18, z: p.z, ry: rot }); return Y + h; };
  const westward = (uv) => G.heading(uv, [uv[0] - 0.2, uv[1]]);
  // the Three Fates (Wackerle, 1956): three bronze women on a rock in a round pool, just inside the Leeson St gate
  if (mon.threeFates) {
    const p = mon.threeFates;
    b.cyl(4.3, 4.45, 0.45, M.granite, { x: p.x, y: Y, z: p.z }, 30);
    b.add(new THREE.CircleGeometry(4.05, 30).rotateX(-Math.PI / 2), mats.fountainWater, { x: p.x, y: Y + 0.4, z: p.z });
    const rock = new THREE.IcosahedronGeometry(1, 1); { const q = rock.attributes.position, r2 = rng(3); for (let i = 0; i < q.count; i++) q.setXYZ(i, q.getX(i) * (0.85 + r2() * 0.3), q.getY(i) * (0.85 + r2() * 0.3), q.getZ(i) * (0.85 + r2() * 0.3)); rock.computeVertexNormals(); }
    b.add(rock, mats.rock, { x: p.x, y: Y + 0.55, z: p.z, sx: 1.5, sy: 0.9, sz: 1.3 });
    const face = toward(p, v2.lerp(world.nodes.get('SGSE') || p, p, 0));
    for (let k = 0; k < 3; k++) { const a = face + (k * 2 * Math.PI) / 3; statue({ body: k === 1 ? 'justice' : 'allegory', x: p.x + Math.sin(a) * 0.55, y: Y + 1.25, z: p.z + Math.cos(a) * 0.55, rot: a, height: 1.95, finish: 'greenBronze' }); }
    b.add(new THREE.CylinderGeometry(0.06, 0.2, 1.3, 8, 1, true).translate(0, 0.65, 0), mats.jet, { x: p.x + 2.4, y: Y + 0.42, z: p.z });
    b.add(new THREE.CylinderGeometry(0.06, 0.2, 1.3, 8, 1, true).translate(0, 0.65, 0), mats.jet, { x: p.x - 2.4, y: Y + 0.42, z: p.z });
  }
  // Wolfe Tone (Delaney, 1967) before his ring of rough granite pillars at the Merrion Row gate, and Delaney's
  // Famine group behind it
  if (mon.wolfeTone) {
    const p = mon.wolfeTone, gate = world.nodes.get('SGNE') || p, face = toward(p, gate);
    const back = { x: p.x - Math.sin(face) * 3.2, z: p.z - Math.cos(face) * 3.2 };
    disc(back, 7.2, mats.flags, Y + 0.016, 32);
    const r3 = rng(1798);
    for (let k = 0; k < 13; k++) {
      const a = face + Math.PI + ((k - 6) / 6) * 2.1, h = 3.2 + r3() * 1.4; // an arc of 240° open towards the gate
      b.box(0.85 + r3() * 0.35, h, 0.55 + r3() * 0.25, mats.rock, { x: back.x + Math.sin(a) * 5.2, y: Y, z: back.z + Math.cos(a) * 5.2, ry: a + (r3() - 0.5) * 0.3, rz: (r3() - 0.5) * 0.06 });
    }
    b.box(1.1, 0.5, 1.1, M.granite, { x: p.x, y: Y, z: p.z, ry: face });
    statue({ body: 'folded', x: p.x, y: Y + 0.5, z: p.z, rot: face, height: 2.3, finish: 'darkBronze' });
  }
  if (mon.famine) {
    const p = mon.famine, face = mon.wolfeTone ? toward(mon.wolfeTone, p) : 0;
    b.box(3.4, 0.3, 1.6, M.granite, { x: p.x, y: Y, z: p.z, ry: face });
    ['famine_carrier', 'famine_shawl', 'famine_bundle'].forEach((body, k) => statue({ body, x: p.x + Math.cos(face) * (k - 1) * 1.05, y: Y + 0.3, z: p.z - Math.sin(face) * (k - 1) * 1.05, rot: face + (k - 1) * 0.25, height: 1.9, finish: 'darkBronze' }));
  }
  // Lord Ardilaun (Farrell, 1892), who gave the park to the city: bronze on a tall plinth, facing the RCSI across SG West
  if (mon.ardilaun) { const r = westward(L.monuments.ardilaun), y = plinth(mon.ardilaun, 1.3, 3.1, r); statue({ body: 'frock_chest', x: mon.ardilaun.x, y, z: mon.ardilaun.z, rot: r, height: 2.3, finish: 'bronze' }); }
  // Robert Emmet (Connor, 1916 cast, here since 1968), facing his birthplace across SG West
  if (mon.emmet) { const r = westward(L.monuments.emmet), y = plinth(mon.emmet, 1.1, 2.2, r); statue({ body: 'orator', x: mon.emmet.x, y, z: mon.emmet.z, rot: r, height: 2.2, finish: 'greenBronze' }); }
  // the Yeats memorial: Henry Moore's "Knife Edge" on a setted platform with low stepped walls (ref: a-small-cobbled-area)
  if (mon.yeats) {
    const p = mon.yeats;
    disc(p, 5.5, mats.flags, Y + 0.016, 24);
    for (let k = 0; k < 5; k++) { const a = 0.5 + k * 0.9; b.box(3.2, 0.5, 0.6, mats.rock, { x: p.x + Math.sin(a) * 4.8, y: Y, z: p.z + Math.cos(a) * 4.8, ry: a + Math.PI / 2 }); }
    b.box(1.2, 0.5, 0.9, M.granite, { x: p.x, y: Y, z: p.z });
    // the bronze: two thin twisted blades rising from one root
    for (const [tw, h, off] of [[0.5, 2.3, -0.12], [-0.35, 1.9, 0.18]]) {
      const g = new THREE.BoxGeometry(0.55, h, 0.08, 1, 6, 1).translate(0, h / 2, 0), q = g.attributes.position;
      for (let i = 0; i < q.count; i++) { const t = q.getY(i) / h, a = tw * t, x = q.getX(i) * (1 - 0.45 * t), z = q.getZ(i); q.setXYZ(i, x * Math.cos(a) - z * Math.sin(a) + 0.25 * t * t, q.getY(i), x * Math.sin(a) + z * Math.cos(a)); }
      g.computeVertexNormals();
      b.add(g, M.bronze, { x: p.x + off, y: Y + 0.5, z: p.z });
    }
  }
  // busts on plinths: Mangan (Sheppard), Markievicz, Kettle, Joyce (facing Newman House)
  for (const k of ['mangan', 'markievicz', 'kettle', 'joyce']) {
    const p = mon[k]; if (!p) continue;
    const r = k === 'joyce' ? G.heading(L.monuments[k], [L.monuments[k][0], 1.2]) : rand() * 6.28, y = plinth(p, 0.7, 1.55, r);
    b.box(0.5, 0.35, 0.3, M.bronze, { x: p.x, y, z: p.z, ry: r });
    b.add(new THREE.SphereGeometry(0.16, 10, 8).scale(0.9, 1.15, 1), M.bronze, { x: p.x, y: y + 0.52, z: p.z });
  }
  // O'Donovan Rossa: a rough boulder just inside the arch
  if (mon.rossa) {
    const g = new THREE.IcosahedronGeometry(1, 1), q = g.attributes.position, r2 = rng(1915);
    for (let i = 0; i < q.count; i++) q.setXYZ(i, q.getX(i) * (0.8 + r2() * 0.4), Math.max(-0.2, q.getY(i)) * (0.8 + r2() * 0.4), q.getZ(i) * (0.8 + r2() * 0.4));
    g.computeVertexNormals();
    b.add(g, mats.rock, { x: mon.rossa.x, y: Y + 0.15, z: mon.rossa.z, sx: 1.2, sy: 1.1, sz: 0.9 });
  }

  // --- gates: granite piers with lanterns, the iron gates swung open, granite bollards in the opening ---
  for (const g of P.gates) {
    const along = g.dir, rot = Math.atan2(along.x, along.z); // local z along the railing
    let inward = { x: -along.z, z: along.x };
    if (!pointInPolygon(v2.add(g, v2.scale(inward, 3)), G.poly)) inward = v2.scale(inward, -1);
    for (const s of [-1, 1]) {
      const q = v2.add(g, v2.scale(along, s * (g.half + 0.4)));
      b.box(0.8, 2.3, 0.8, M.granite, { x: q.x, y: Y, z: q.z, ry: rot });
      b.box(0.95, 0.22, 0.95, M.granite, { x: q.x, y: Y + 2.3, z: q.z, ry: rot });
      b.cyl(0.08, 0.1, 0.35, M.dark, { x: q.x, y: Y + 2.52, z: q.z }, 6);
      b.box(0.34, 0.5, 0.34, M.lampGlow, { x: q.x, y: Y + 2.87, z: q.z, ry: rot });
      b.add(new THREE.ConeGeometry(0.3, 0.25, 4).rotateY(Math.PI / 4), M.dark, { x: q.x, y: Y + 3.5, z: q.z, ry: rot });
      // the gate leaf, swung back against the railings on the park side
      const hinge = v2.add(g, v2.scale(along, s * g.half)), leaf = v2.add(hinge, v2.scale(inward, 0.9));
      b.box(0.05, 1.65, 1.8, M.dark, { x: leaf.x, y: Y + 0.05, z: leaf.z, ry: Math.atan2(inward.x, inward.z) });
      // a granite post in the opening
      const bp = v2.add(g, v2.scale(along, s * 0.9));
      b.cyl(0.2, 0.24, 0.85, M.granite, { x: bp.x, y: Y, z: bp.z }, 8);
    }
    // setts across the threshold
    b.add(new THREE.PlaneGeometry(2 * g.half, 3).rotateX(-Math.PI / 2), mats.flags, { x: g.x + inward.x * 1.2, y: Y + 0.016, z: g.z + inward.z * 1.2, ry: rot + Math.PI / 2 });
  }

  // --- benches (the surveyed ones, turned to face their path) and park lamps along the main walks ---
  const allPaths = P.paths;
  const nearestPath = (p) => {
    let best = null, bd = Infinity;
    for (const pa of allPaths) for (let i = 0; i + 1 < pa.pts.length; i++) {
      const a = pa.pts[i], d = v2.sub(pa.pts[i + 1], a), L2 = v2.dot(d, d) || 1, t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), d) / L2)), q = v2.add(a, v2.scale(d, t)), dd = v2.len(v2.sub(p, q));
      if (dd < bd) { bd = dd; best = { q, d: v2.norm(d), pa }; }
    }
    return best;
  };
  const benchSpots = [];
  for (const uv of L.benches) {
    const p = at(uv), np = nearestPath(p);
    if (!np || v2.len(v2.sub(p, np.q)) > 8) continue;
    let n = { x: -np.d.z, z: np.d.x };
    if (v2.dot(n, v2.sub(p, np.q)) < 0) n = v2.scale(n, -1);
    const s = v2.add(np.q, v2.scale(n, np.pa.w / 2 + 0.55));
    if (inLake(s, P.lake) || benchSpots.some((o) => v2.len(v2.sub(o, s)) < 2.4)) continue;
    const rot = Math.atan2(-n.x, -n.z); // facing the path
    benchSpots.push({ ...s, rot });
    const c = Math.cos(rot), sn = Math.sin(rot), off = (lz) => ({ x: s.x + lz * sn, z: s.z + lz * c });
    const seat = off(0), backp = off(-0.26);
    b.box(1.8, 0.07, 0.45, mats.bench, { x: seat.x, y: Y + 0.42, z: seat.z, ry: rot });
    b.box(1.8, 0.4, 0.05, mats.bench, { x: backp.x, y: Y + 0.52, z: backp.z, ry: rot, rx: -0.2 });
    for (const lx of [-0.8, 0.8]) b.box(0.06, 0.45, 0.5, M.dark, { x: s.x + lx * c, y: Y, z: s.z - lx * sn, ry: rot });
  }
  const lampSpots = [];
  for (const pa of allPaths) {
    if (!pa.main && pa.w < 2.5) continue;
    let acc = 8;
    for (let i = 0; i + 1 < pa.pts.length; i++) {
      const a = pa.pts[i], c = pa.pts[i + 1], d = v2.norm(v2.sub(c, a)), Ln = v2.len(v2.sub(c, a));
      for (; acc < Ln; acc += 24) {
        const side = lampSpots.length % 2 ? 1 : -1, n = { x: -d.z * side, z: d.x * side };
        const p = v2.add(v2.add(a, v2.scale(d, acc)), v2.scale(n, pa.w / 2 + 0.5));
        if (inLake(p, P.lake) || lampSpots.some((o) => v2.len(v2.sub(o, p)) < 12)) continue;
        lampSpots.push(p);
      }
      acc -= Ln;
    }
  }
  for (const p of lampSpots) {
    b.box(0.34, 0.5, 0.34, M.dark, { x: p.x, y: Y, z: p.z });
    b.cyl(0.07, 0.1, 3.1, M.dark, { x: p.x, y: Y + 0.5, z: p.z }, 6);
    b.box(0.3, 0.46, 0.3, M.lampGlow, { x: p.x, y: Y + 3.6, z: p.z, ry: Math.PI / 4 });
    b.add(new THREE.ConeGeometry(0.3, 0.3, 4), M.dark, { x: p.x, y: Y + 4.2, z: p.z });
  }
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8 });
  const poolItems = [...lampSpots.map((p) => ({ ...p, s: 1 })), ...P.gates.flatMap((g) => [-1, 1].map((s) => ({ ...v2.add(g, v2.scale(g.dir, s * (g.half + 0.4))), s: 0.6 }))), ...P.fountains.map((f) => ({ ...f, s: 1.2 }))];
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolMat, poolItems.length);
  { const m4 = new THREE.Matrix4(); poolItems.forEach((p, i) => pools.setMatrixAt(i, m4.makeScale(p.s, 1, p.s).setPosition(p.x, Y + 0.03, p.z))); }
  pools.visible = false; pools.renderOrder = 1;
  scene.add(pools);

  // --- people: sitting on some of the benches and on the lawns (the walkers are people.js's, on the path lanes) ---
  const TOPS = [0x1d2230, 0x39414d, 0x5a4a3a, 0x7b6a55, 0x23344f, 0x6e2a2a, 0xa8a39a, 0x2f5d7c, 0xb23a2a, 0xd8b43a, 0x4b5a3a, 0xc9b89a];
  const LEGS = [0x1b1d24, 0x2d3a55, 0x3b4a6b, 0x4a4a4f, 0x5a4d3e, 0x1a1a1a];
  const SKIN = [0xf1d3bf, 0xe8bfa3, 0xd9a888, 0xc48e6a, 0x7a4e36];
  const HAIR = [0x2a1d14, 0x5a3e25, 0x8a6a42, 0xc49a5a, 0x1b1b1b, 0x8e8b86];
  const pickC = (a) => new THREE.Color(a[Math.floor(rand() * a.length)]);
  const sitters = [];
  const seatOne = (x, z, rot, grass) => {
    const g = seatedGeometry({ top: pickC(TOPS), legs: pickC(LEGS), skin: pickC(SKIN), hair: pickC(HAIR) }, grass);
    g.rotateY(rot).translate(x, Y + (grass ? 0 : 0), z); sitters.push(g);
  };
  benchSpots.forEach((s, i) => {
    if (i % 3) return;
    const c = Math.cos(s.rot), sn = Math.sin(s.rot), lx = (rand() - 0.5) * 1.1;
    seatOne(s.x + lx * c - 0.05 * sn, s.z - lx * sn - 0.05 * c, s.rot, false);
    if (rand() < 0.4) seatOne(s.x + (lx > 0 ? -0.55 : 0.55) * c, s.z - (lx > 0 ? -0.55 : 0.55) * sn, s.rot, false);
  });
  {
    // on the open lawns in twos and threes, facing each other a little
    const bb = bboxOf(G.poly), lawnArea = insetPolygon(G.poly, 12);
    let groups = 0;
    for (let tries = 0; tries < 400 && groups < (LITE ? 4 : 8); tries++) {
      const p = { x: bb.x0 + rand() * (bb.x1 - bb.x0), z: bb.z0 + rand() * (bb.z1 - bb.z0) };
      if (!pointInPolygon(p, lawnArea) || !greenClear(p, 2)) continue;
      const n = 2 + Math.floor(rand() * 2), base = rand() * 6.28;
      for (let k = 0; k < n; k++) { const a = base + (k / n) * 6.28; seatOne(p.x + Math.sin(a) * 0.9, p.z + Math.cos(a) * 0.9, a + Math.PI + (rand() - 0.5) * 0.6, true); }
      groups++;
    }
  }
  if (sitters.length) {
    const m = new THREE.Mesh(mergeGeometries(sitters), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    m.castShadow = m.receiveShadow = true; m.name = "St Stephen's Green sitters";
    flatGroup.add(m);
  }
  // strollers: the paths become walk lanes for people.js (ends that meet share an id, so walkers turn onto the next path)
  {
    const ends = [];
    const idAt = (p) => { const e = ends.find((q) => v2.len(v2.sub(q, p)) < 2.5); if (e) return e.id; const id = `SGP${ends.length}`; ends.push({ ...p, id }); return id; };
    let mid = 0;
    addFootLanes(P.paths.filter((pa) => pa.pts.length > 1).map((pa) => ({
      name: "St Stephen's Green", pts: pa.pts, weight: pa.main ? 0.7 : 0.3,
      ids: pa.pts.map((p, i) => (i === 0 || i === pa.pts.length - 1 ? idAt(p) : `SGPm${mid++}`)),
    })));
  }

  // --- a jaunting car waiting at the kerb of St Stephen's Green North, by the Shelbourne ---
  const carriage = buildCarriage(M, mats);
  if (carriage) scene.add(carriage.group);

  const main = b.build("St Stephen's Green interior");
  main.traverse((o) => { if (o.isMesh && o.material.transparent) o.castShadow = false; });
  const ms = Math.round(performance.now() - t0);
  console.log(`St Stephen's Green: ${P.paths.length} paths, lake ${P.lake ? P.lake.outer.length : 0} pts, ${benchSpots.length} benches, ${lampSpots.length} lamps, ${P.gates.length} gates, ${sitters.length} sitting, lake ${P.lake ? 'yes' : 'no'}, fit k=${G.k.toFixed(2)} in ${ms} ms`);
  let waterT = 0;
  return {
    groups: [main, flatGroup, lakeGroup],
    lampSpots,
    setNight(level) {
      poolMat.opacity = level * 0.85; pools.visible = level > 0.01;
      mats.fountainWater.emissiveIntensity = level * 0.35;
      mats.jet.emissiveIntensity = level * 0.9;
    },
    update(dt, time, camera) {
      waterT += dt;
      if (waterMat) waterMat.normalMap.offset.set(waterT * 0.006, waterT * 0.004);
      if (duckSys) duckSys.update(dt, time, camera);
      if (carriage) carriage.update(time, camera);
    },
  };

  function greenPathFree(c, r) { return !P.paths.some((pa) => distToPolyline(c, pa.pts) < pa.w / 2 + r + 0.3); }
}

// phormium (New Zealand flax): a fountain of long strap leaves
function phormium(b, x, z, s, mat, rand) {
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * 6.283 + rand() * 0.4, lean = 0.35 + rand() * 0.35, h = (1.1 + rand() * 0.5) * s;
    b.add(new THREE.PlaneGeometry(0.12, h).translate(0, h / 2, 0), mat, { x, y: KERB_H + 0.02, z, ry: a, rx: lean });
  }
}

// ---------- the jaunting car: a bay horse between the shafts of a black two-wheeled car with a driver ----------
function buildCarriage(M, mats) {
  const way = world.ways.find((w) => w.name === "St Stephen's Green North");
  const a = world.nodes.get('KS1'), c = world.nodes.get('DS1');
  if (!way || !a || !c) return null;
  // at the park-side kerb, two thirds of the way from Dawson St to Kildare St, facing east with the traffic
  const d = v2.norm(v2.sub(a, c)), along = v2.lerp(c, a, 0.62);
  let n = { x: -d.z, z: d.x };
  if (!pointInPolygon(v2.add(along, v2.scale(n, 20)), greenMap().poly)) n = v2.scale(n, -1); // towards the park
  const p = v2.add(along, v2.scale(n, way.width / 2 - 1.3));
  const rot = Math.atan2(d.x, d.z);
  const group = new THREE.Group(); group.name = 'jaunting car';
  const bay = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8a1f1f, roughness: 0.6 });
  const merge = (list) => mergeGeometries(list.map(([g, x, y, z, rx = 0, ry = 0, rz = 0]) => { const q = (g.index ? g.toNonIndexed() : g); q.deleteAttribute('uv'); q.rotateX(rx); q.rotateY(ry); q.rotateZ(rz); return q.translate(x, y, z); }));
  // horse (local +z forward): body, legs, tail; the neck and head swing on their own
  const horse = new THREE.Mesh(merge([
    [new THREE.CapsuleGeometry(0.34, 1.1, 3, 8), 0, 1.35, 0, Math.PI / 2],
    ...[[-0.18, 0.5], [0.18, 0.5], [-0.18, -0.5], [0.18, -0.5]].map(([x, z]) => [new THREE.CylinderGeometry(0.07, 0.055, 1.15, 6), x, 0.6, z]),
    [new THREE.CylinderGeometry(0.05, 0.1, 0.8, 5), 0, 1.15, -0.95, -0.35],
  ]), bay);
  const neck = new THREE.Group(); neck.position.set(0, 1.55, 0.72);
  neck.add(new THREE.Mesh(merge([
    [new THREE.CylinderGeometry(0.16, 0.24, 0.8, 7), 0, 0.3, 0.12, 0.6],
    [new THREE.BoxGeometry(0.22, 0.26, 0.6), 0, 0.62, 0.48, 0.45],
    [new THREE.ConeGeometry(0.05, 0.14, 4), -0.07, 0.86, 0.34], [new THREE.ConeGeometry(0.05, 0.14, 4), 0.07, 0.86, 0.34],
  ]), bay));
  const horseG = new THREE.Group(); horseG.add(horse, neck); horseG.position.z = 1.6;
  // the car behind: shafts, a boxed seat each side over a pair of big red-spoked wheels, a driver up front
  const car = new THREE.Mesh(merge([
    [new THREE.BoxGeometry(1.1, 0.35, 1.5), 0, 1.05, -0.2],
    [new THREE.BoxGeometry(1.5, 0.08, 1.2), 0, 1.25, -0.2],
    [new THREE.BoxGeometry(1.2, 0.5, 0.08), 0, 1.5, -0.8],
    ...[-1, 1].map((s) => [new THREE.BoxGeometry(0.06, 0.06, 2.2), s * 0.35, 1.2, 1.5]),
  ]), black);
  const wheels = new THREE.Mesh(merge([-1, 1].map((s) => [new THREE.TorusGeometry(0.62, 0.04, 5, 18), s * 0.8, 0.64, -0.2, 0, Math.PI / 2])), red);
  const driver = new THREE.Mesh(merge([
    [new THREE.CylinderGeometry(0.17, 0.19, 0.6, 7), 0, 1.6, 0.35],
    [new THREE.SphereGeometry(0.11, 8, 6), 0, 2.02, 0.37],
    [new THREE.CylinderGeometry(0.11, 0.12, 0.14, 8), 0, 2.15, 0.37],
  ]), new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.8 }));
  group.add(horseG, car, wheels, driver);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.position.set(p.x, 0, p.z); group.rotation.y = rot;
  addBox(p.x + d.x * 0.8, p.z + d.z * 0.8, 0.8, 2.6, rot);
  void M; void mats;
  return {
    group,
    update(time, camera) {
      if (!camera || (camera.position.x - p.x) ** 2 + (camera.position.z - p.z) ** 2 > 90 * 90) return;
      // head down to nose the ground now and then, a toss, a slow tail swish
      const t = time * 0.6, dip = Math.max(0, Math.sin(t * 0.7)) ** 3;
      neck.rotation.x = dip * 0.7 + Math.sin(time * 2.1) * 0.03;
      neck.rotation.y = Math.sin(t * 0.33) * 0.15;
    },
  };
}
