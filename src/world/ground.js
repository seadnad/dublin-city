// Road surface, the Liffey, quay walls, parapets, road bridges and railings.
// The painted layout canvas is only used for the minimap; 3D streets come from roads.js.
import * as THREE from 'three';
import { world, PAVEMENT, v2, offsetPolyline, resample, pointInPolygon, insetPolygon, roadInsetFor } from './geo.js';
import { makePuddleTexture, makeStoneTexture, makeWaterNormal, fbm, rng } from './textures.js';
import { addPolyline, addSegment } from '../game/collision.js';
import { addReflections } from '../render/reflect.js';
import { ISLANDS, islandOutline } from './oconnell.js';
import { parkGrassMaterial } from './park.js';
import { buildStreets, buildMedian, grassPolygon, greenLand, fieldUniforms, KERB_H } from './roads.js';
import { buildCanals } from './canals.js';
import bsLayout from '../data/barrowst.json';

// Quay edges with bollards instead of railings (the Grand Canal Quay promenade and the inner basin's west side,
// docs/research/barrow-street.md 3.5; the bollards are placed by barrowst.js). They still stop the car.
export const openQuay = (a, b) => {
  const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
  return bsLayout.openQuay.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
};

export const WATER_Y = -2.6;
const B = world.bounds;

// ---------------- layout canvas ----------------
// minimap resolution (px per metre), capped so the canvas stays within 4096 px (phone canvas and memory limits)
export const PPM = Math.min(1.6, 4096 / Math.max(B.w, B.h));
const CW = Math.round(B.w * PPM), CH = Math.round(B.h * PPM);
export const toCanvas = (x, z) => [(x - B.minX) * PPM, (z - B.minZ) * PPM];

export const COLORS = {
  plaza: '#8c8880', pavement: '#a8a39a', kerb: '#cfcac0', asphalt: '#3a3b3f', yellow: '#d8b545',
  white: '#e8e8e2', grass: '#5d8a3c', path: '#b9ad8f', water: '#3b5a5a', lawn: '#6a9344', cobble: '#9c958a',
};

function strokePts(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => { const [x, y] = toCanvas(p.x, p.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
}
function fillPoly(ctx, pts, color) {
  strokePts(ctx, pts); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

// Distance from a junction node where markings should stop.
function junctionClear(node) {
  let w = 0;
  for (const way of node.ways) w = Math.max(w, way.width);
  return node.ways.length > 1 || node.edges.length > 2 ? w / 2 + 1.5 : 0;
}

// Trim a polyline by da at the start and db at the end.
function trim(pts, da, db) {
  const out = pts.map((p) => ({ ...p }));
  const cut = (arr, d) => {
    while (arr.length > 1 && d > 0) {
      const L = v2.len(v2.sub(arr[1], arr[0]));
      if (L > d) { arr[0] = v2.lerp(arr[0], arr[1], d / L); return arr; }
      d -= L; arr.shift();
    }
    return arr;
  };
  cut(out, da); out.reverse(); cut(out, db); out.reverse();
  return out.length > 1 ? out : null;
}

export const parkPolys = world.parks.map((p) => ({ name: p.name, poly: insetPolygon(p.poly, roadInsetFor(world, p.ids)) }));
export const campusPolys = world.campus.map((p) => ({ name: p.name, poly: insetPolygon(p.poly, roadInsetFor(world, p.ids)) }));
export const dockPolys = world.docks.map((p) => ({ name: p.name, poly: p.ids ? insetPolygon(p.poly, roadInsetFor(world, p.ids)) : p.poly, canal: p.canal || null, level: p.level ?? WATER_Y + 0.6 }));

function drawLayout() {
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const ctx = c.getContext('2d');
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // base: stone paving / block interiors, with some mottling
  ctx.fillStyle = COLORS.plaza; ctx.fillRect(0, 0, CW, CH);
  const n = fbm(128, 4, 99), tile = document.createElement('canvas');
  tile.width = tile.height = 128;
  const tctx = tile.getContext('2d'), img = tctx.createImageData(128, 128);
  for (let i = 0; i < n.length; i++) { const v = 120 + n[i] * 40; img.data.set([v, v * 0.98, v * 0.93, 38], i * 4); }
  tctx.putImageData(img, 0, 0);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, CW, CH);

  // campus (Trinity): lawns with cobbled front square
  for (const cp of campusPolys) {
    fillPoly(ctx, cp.poly, COLORS.lawn);
    ctx.lineWidth = 6 * PPM; ctx.strokeStyle = COLORS.cobble; strokePts(ctx, cp.poly); ctx.closePath(); ctx.stroke();
  }
  // parks: grass, perimeter path, cross paths
  for (const pk of parkPolys) {
    fillPoly(ctx, pk.poly, COLORS.grass);
    const inner = insetPolygon(pk.poly, 7);
    ctx.lineWidth = 3 * PPM; ctx.strokeStyle = COLORS.path; strokePts(ctx, inner); ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    const [ax, ay] = toCanvas(inner[0].x, inner[0].z), m = Math.floor(inner.length / 2);
    const [bx, by] = toCanvas(inner[m].x, inner[m].z);
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }

  // river (seen on the minimap; the 3D water is its own mesh)
  fillPoly(ctx, world.riverPoly, COLORS.water);
  for (const dk of dockPolys) fillPoly(ctx, dk.poly, COLORS.water);

  const roads = world.ways;
  // pavements
  ctx.strokeStyle = COLORS.pavement;
  for (const w of roads) { if (w.bridge) continue; ctx.lineWidth = (w.width + 2 * PAVEMENT) * PPM; strokePts(ctx, w.pts); ctx.stroke(); }
  // kerb stones
  ctx.strokeStyle = COLORS.kerb;
  for (const w of roads) { ctx.lineWidth = (w.width + 0.5) * PPM; strokePts(ctx, w.pts); ctx.stroke(); }
  // double yellow edge lines (drawn under the asphalt so junctions stay clean)
  ctx.strokeStyle = COLORS.yellow;
  for (const w of roads) { if (w.type === 'lane') continue; ctx.lineWidth = (w.width - 0.2) * PPM; strokePts(ctx, w.pts); ctx.stroke(); }
  ctx.strokeStyle = COLORS.asphalt;
  for (const w of roads) {
    ctx.lineWidth = (w.width - (w.type === 'lane' ? 0 : 0.9)) * PPM;
    ctx.strokeStyle = w.pedestrian ? COLORS.pavement : w.type === 'lane' ? '#56524d' : COLORS.asphalt; // lanes are setts
    strokePts(ctx, w.pts); ctx.stroke();
  }
  // O'Connell Street central median
  for (const isl of ISLANDS) fillPoly(ctx, islandOutline(isl), COLORS.pavement);

  // Luas track bed + rails
  // the grassed reservation off the street grid
  ctx.strokeStyle = COLORS.grass; ctx.lineWidth = 12.6 * PPM;
  for (const line of world.luasLines) for (const lp of line.tracks) {
    let run = [];
    for (const p of [...lp, {}]) { if (p.open) run.push(p); else { if (run.length > 1) { strokePts(ctx, run); ctx.stroke(); } run = []; } }
  }
  for (const line of world.luasLines) for (const lp of line.tracks) {
    ctx.strokeStyle = '#4a4a4c'; ctx.lineWidth = 3.8 * PPM; strokePts(ctx, lp); ctx.stroke();
  }
  ctx.strokeStyle = '#8d8e90'; ctx.lineWidth = Math.max(1, 0.14 * PPM);
  for (const line of world.luasLines) for (const lp of line.tracks) for (const off of [-0.72, 0.72]) { strokePts(ctx, offsetPolyline(lp, off)); ctx.stroke(); }

  // lane markings: white dashed centre lines, trimmed at junctions
  ctx.strokeStyle = COLORS.white; ctx.lineCap = 'butt';
  ctx.setLineDash([3 * PPM, 5 * PPM]);
  for (const w of roads) {
    if (w.type === 'lane') continue;
    // split the way into runs between junctions so markings stop at every crossing
    let start = 0;
    for (let i = 1; i < w.nodeIds.length; i++) {
      const node = world.nodes.get(w.nodeIds[i]);
      if (i < w.nodeIds.length - 1 && node.edges.length <= 2) continue;
      const a = world.nodes.get(w.nodeIds[start]);
      const pts = trim(w.pts.slice(start, i + 1), junctionClear(a), junctionClear(node));
      start = i;
      if (!pts) continue;
      ctx.lineWidth = Math.max(1, 0.15 * PPM);
      const offs = w.type === 'boulevard' ? [-8, 8] : w.width >= 14 ? [-w.width / 4, w.width / 4] : [0];
      for (const o of offs) { strokePts(ctx, o ? offsetPolyline(pts, o) : pts); ctx.stroke(); }
      if (w.width >= 14 && w.type !== 'boulevard') { ctx.setLineDash([]); strokePts(ctx, pts); ctx.stroke(); ctx.setLineDash([3 * PPM, 5 * PPM]); }
    }
  }
  ctx.setLineDash([]);

  // zebra crossings on the approaches to busy junctions
  for (const node of world.nodes.values()) {
    if (node.edges.length < 3) continue;
    const clear = junctionClear(node);
    for (const e of node.edges) {
      if (e.way.type === 'lane' || e.way.bridge) continue;
      if (e.len < clear + 10) continue;
      const d = v2.norm(v2.sub(e.to, e.from));
      const cx = e.from.x + d.x * (clear + 2), cz = e.from.z + d.z * (clear + 2);
      const nx = -d.z, nz = d.x, half = e.way.width / 2 - 0.6;
      ctx.strokeStyle = COLORS.white; ctx.lineWidth = 2.6 * PPM;
      for (let s = -half; s < half; s += 1.1) {
        const [x0, y0] = toCanvas(cx + nx * s, cz + nz * s), [x1, y1] = toCanvas(cx + nx * (s + 0.55), cz + nz * (s + 0.55));
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
  }
  return c;
}

export const layoutCanvas = drawLayout();

// Paint an extra area (e.g. landmark lawns) onto the layout after it was drawn.
// Only bare plaza pixels are recoloured, so roads and pavements crossing the area survive.
export function paintArea(poly, color) {
  const ctx = layoutCanvas.getContext('2d');
  const xs = poly.map((p) => toCanvas(p.x, p.z));
  const x0 = Math.max(0, Math.floor(Math.min(...xs.map((q) => q[0])))), x1 = Math.min(CW, Math.ceil(Math.max(...xs.map((q) => q[0]))));
  const y0 = Math.max(0, Math.floor(Math.min(...xs.map((q) => q[1])))), y1 = Math.min(CH, Math.ceil(Math.max(...xs.map((q) => q[1]))));
  if (x1 <= x0 || y1 <= y0) return;
  const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const [br, bg, bb] = rgb(COLORS.plaza), to = rgb(color);
  const cpoly = xs.map(([x, y]) => ({ x, z: y }));
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4, d = img.data;
    if (Math.abs(d[i] - br) > 16 || Math.abs(d[i + 1] - bg) > 16 || Math.abs(d[i + 2] - bb) > 16) continue;
    if (!pointInPolygon({ x: x + x0, z: y + y0 }, cpoly)) continue;
    const k = 0.92 + ((x * 7 + y * 13) % 10) / 60;
    d[i] = to[0] * k; d[i + 1] = to[1] * k; d[i + 2] = to[2] * k;
  }
  ctx.putImageData(img, x0, y0);
  layoutTex.needsUpdate = true;
}

// ---------------- materials ----------------
const layoutTex = { needsUpdate: false }; // minimap-only canvas: nothing on the GPU to refresh
const puddles = makePuddleTexture(256);
puddles.wrapS = puddles.wrapT = THREE.RepeatWrapping;
let streets = null;

// Rain: street shaders darken and turn glossy, with puddles collecting in the gutters and dips.
// Wetness 0..1 (ramped by the caller). Shader-driven surfaces read fieldUniforms.uWet; simple materials
// (setts, kerbs, grass, quay stone) darken and gloss here.
const wetBases = new Map();
export function setWet(w) {
  fieldUniforms.uWet.value = w;
  if (!streets) return;
  const tune = (m, dark, rough) => {
    if (!m) return;
    if (!wetBases.has(m)) wetBases.set(m, { c: m.color.clone(), r: m.roughness });
    const b = wetBases.get(m);
    m.color.copy(b.c).multiplyScalar(1 - dark * w);
    m.roughness = b.r + (rough - b.r) * w;
  };
  tune(streets.settMat, 0.3, 0.14);
  tune(streets.kerbMat, 0.3, 0.3);
  tune(streets.grassMat, 0.22, 0.75);
  tune(stoneMaterial, 0.3, 0.45);
  if (waterMatRef) { waterMatRef.roughness = 0.06 + 0.12 * w; waterMatRef.normalScale.setScalar(0.35 + 0.35 * w); }
  wetNow = w;
}
let waterMatRef = null, wetNow = 0;
export function getStreets() { return streets; }
export const stoneTex = makeStoneTexture(256);
export const stoneMaterial = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: 0xd8d4cc });
export const deckMaterial = new THREE.MeshStandardMaterial({ color: 0xd9dcdc, roughness: 0.55 }); // painted steel / fair-faced concrete
const railMaterial = new THREE.MeshStandardMaterial({ color: 0xeef0f0, roughness: 0.35, metalness: 0.2 });
const ironWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xdcdcd6, roughness: 0.45 }); // painted cast iron

// world-space UVs in metres (the asphalt material's texture repeat turns them into tiles)
function setGroundUVs(geo) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2), uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    uv[i * 2] = x; uv[i * 2 + 1] = z;
    uv1[i * 2] = x / 12; uv1[i * 2 + 1] = z / 12;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
}

function shapeGeometry(poly, y = 0, holes = []) {
  const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, -p.z))));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  return geo;
}

// ---------------- bridges ----------------
export const bridges = [];
// Where the river runs under the bridge, as [t0, t1] along a->b. Sampled across the whole deck width, not just
// the centreline: the banks are slanted, so on a wide bridge (O'Connell, 32 m) the water under the outer lanes
// reaches past the centreline span, and those corners read as river (deck missing, car respawned).
function findRiverSpan(a, b, width) {
  let t0 = null, t1 = null;
  const d = v2.norm(v2.sub(b, a)), n = { x: -d.z, z: d.x };
  for (let o = -width / 2; o <= width / 2 + 1e-6; o += width / 8) {
    for (let i = 0; i <= 400; i++) {
      const t = i / 400, p = v2.lerp(a, b, t);
      if (pointInPolygon({ x: p.x + n.x * o, z: p.z + n.z * o }, world.riverPoly)) { if (t0 === null || t < t0) t0 = t; if (t1 === null || t > t1) t1 = t; }
    }
  }
  return t0 === null ? null : [t0, t1];
}
for (const way of world.ways) {
  if (!way.bridge) continue;
  const a = way.pts[0], b = way.pts[way.pts.length - 1];
  const span = findRiverSpan(a, b, way.width);
  if (!span) continue;
  const L = v2.len(v2.sub(b, a));
  const p0 = v2.lerp(a, b, span[0]), p1 = v2.lerp(a, b, span[1]);
  const dir = v2.norm(v2.sub(b, a));
  bridges.push({ way, name: way.name, p0, p1, dir, width: way.width, length: (span[1] - span[0]) * L, centre: v2.lerp(p0, p1, 0.5) });
}

// footbridges between two quay nodes: the quay parapet opens at their landings, and the steps block cars
export const footbridges = [{ name: "Ha'penny Bridge", a: 'NQ6', b: 'HPS', halfGap: 3.9 }].map((f) => {
  const a = world.nodes.get(f.a), b = world.nodes.get(f.b);
  const span = findRiverSpan(a, b, 4);
  const L = v2.len(v2.sub(b, a));
  const p0 = v2.lerp(a, b, span[0]), p1 = v2.lerp(a, b, span[1]);
  return { ...f, dir: v2.norm(v2.sub(b, a)), length: (span[1] - span[0]) * L, centre: v2.lerp(p0, p1, 0.5), p0, p1 };
});
for (const f of footbridges) {
  const n = { x: -f.dir.z, z: f.dir.x };
  for (const [p, s] of [[f.p0, -1], [f.p1, 1]]) {
    const c = v2.add(p, v2.scale(f.dir, s * 1.2));
    addSegment(c.x - n.x * 2.2, c.z - n.z * 2.2, c.x + n.x * 2.2, c.z + n.z * 2.2);
  }
}

function inBridgeGap(p) {
  for (const f of footbridges) {
    const d = v2.sub(p, f.centre);
    const along = v2.dot(d, f.dir), across = d.x * -f.dir.z + d.z * f.dir.x;
    if (Math.abs(along) < f.length / 2 + 6 && Math.abs(across) < f.halfGap) return true;
  }
  for (const br of bridges) {
    const d = v2.sub(p, br.centre);
    const along = v2.dot(d, br.dir), across = d.x * -br.dir.z + d.z * br.dir.x;
    if (Math.abs(along) < br.length / 2 + 8 && Math.abs(across) < br.width / 2 + 0.2) return true;
  }
  return false;
}

// True if (x, z) is over the river (and not on a road bridge deck) or in a dock basin.
export function isOverWater(x, z) {
  const p = { x, z };
  for (const dk of dockPolys) if (pointInPolygon(p, dk.poly)) return true;
  if (!pointInPolygon(p, world.riverPoly)) return false;
  for (const br of bridges) {
    const d = v2.sub(p, br.centre);
    if (Math.abs(v2.dot(d, br.dir)) < br.length / 2 + 1 && Math.abs(d.x * -br.dir.z + d.z * br.dir.x) < br.width / 2 + 1) return false;
  }
  return true;
}

// ---------------- build scene objects ----------------
export function buildGround(scene) {
  const group = new THREE.Group();
  group.name = 'ground';
  streets = buildStreets(scene, puddles);
  const groundMaterial = streets.asphaltMat;
  group.add(buildMedian(streets));
  for (const pk of [...parkPolys, ...campusPolys]) group.add(grassPolygon(pk.poly, streets.grassMat));
  // Phoenix Park's grass has its own shader (mown verges and lawns, meadow, woodland floor)
  for (const gr of world.greens) group.add(greenLand([gr.poly], gr.name === 'Phoenix Park' ? parkGrassMaterial(streets.grassMat) : streets.grassMat));

  // Ground pieces north and south of the river
  const nb = world.northBank, sb = world.southBank;
  const northPoly = [{ x: B.minX, z: B.minZ }, { x: B.maxX, z: B.minZ }, ...nb.slice().reverse()];
  const southPoly = [...sb, { x: B.maxX, z: B.maxZ }, { x: B.minX, z: B.maxZ }];
  for (const poly of [northPoly, southPoly]) {
    const geo = shapeGeometry(poly, 0, dockPolys.filter((dk) => pointInPolygon(dk.poly[0], poly)).map((dk) => dk.poly));
    setGroundUVs(geo);
    const m = new THREE.Mesh(geo, groundMaterial);
    m.receiveShadow = true;
    group.add(m);
  }
  // (beyond the map edge: the apron and the far view in world/farview.js: the rest of Dublin, the bay, the hills)

  // Water
  const waterNormal = makeWaterNormal(256);
  waterNormal.repeat.set(1 / 22, 1 / 22);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1e3029, roughness: 0.06, metalness: 0.45, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.4,
  });
  addReflections(waterMat, 0.55); // lower: at grazing angles the quay buildings made the river look brick-brown
  waterMatRef = waterMat;
  const water = new THREE.Mesh(shapeGeometry(world.riverPoly, WATER_Y), waterMat);
  water.receiveShadow = true;
  group.add(water);
  for (const dk of dockPolys) {
    const w = new THREE.Mesh(shapeGeometry(dk.poly, dk.level), waterMat); // docks and canals sit higher (locked)
    w.receiveShadow = true;
    group.add(w);
  }

  // Quay walls (vertical faces from street level down into the water)
  for (const [bank, side] of [[nb, 1], [sb, -1], ...dockPolys.map((dk) => [[...dk.poly, dk.poly[0]], 0])]) {
    const pts = resample(bank, 3);
    const pos = [], uv = [], idx = [];
    let u = 0;
    pts.forEach((p, i) => {
      if (i) u += v2.len(v2.sub(p, pts[i - 1])) / 4;
      pos.push(p.x, KERB_H, p.z, p.x, WATER_Y - 1.5, p.z);
      uv.push(u, 1.1, u, 0);
      if (i) {
        const k = i * 2;
        if (side >= 0) idx.push(k - 2, k - 1, k, k, k - 1, k + 1);
        if (side <= 0) idx.push(k - 2, k, k - 1, k, k + 1, k - 1);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const wall = new THREE.Mesh(g, stoneMaterial);
    wall.receiveShadow = true;
    group.add(wall);
  }

  // Granite parapets along both banks, open where road bridges land
  const boxes = [];
  for (const bank of [nb, sb]) {
    const fine = resample(bank, 0.5);
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        // keep every ~3 m of the 0.5 m run
        const pick = [run[0]];
        for (let i = 6; i < run.length; i += 6) pick.push(run[i]);
        if (pick[pick.length - 1] !== run[run.length - 1]) pick.push(run[run.length - 1]);
        addPolyline(pick);
        for (let i = 1; i < pick.length; i++) boxes.push([pick[i - 1], pick[i]]);
      }
      run = [];
    };
    for (const p of fine) {
      if (p.x < B.minX + 1 || p.x > B.maxX - 1) { flush(); continue; }
      if (inBridgeGap(p)) flush(); else run.push(p);
    }
    flush();
  }
  const parapet = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stoneMaterial, boxes.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  boxes.forEach(([a, b], i) => {
    const d = v2.sub(b, a), L = v2.len(d);
    q.setFromAxisAngle(up, Math.atan2(d.x, d.z));
    t.set((a.x + b.x) / 2, KERB_H + 0.5, (a.z + b.z) / 2); s.set(0.7, 1.0, L + 0.35);
    parapet.setMatrixAt(i, m4.compose(t, q, s));
  });
  parapet.castShadow = parapet.receiveShadow = true;
  group.add(parapet);

  // Road bridges: arched stone body + deck painted with the ground texture + parapets
  for (const br of bridges) group.add(buildBridge(br, groundMaterial));

  // Park railings, Trinity railings and the dock edges
  group.add(buildRailings([...parkPolys, ...campusPolys, ...dockPolys.filter((dk) => !dk.canal)]));
  group.add(buildCanals(scene, streets.grassMat, stoneMaterial, streets.pavingMat));
  {
    const segs = [];
    for (const { poly } of parkPolys) poly.forEach((a, i) => segs.push([a, poly[(i + 1) % poly.length]]));
    const plinth = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stoneMaterial, segs.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    segs.forEach(([a, b], i) => {
      const d = v2.sub(b, a);
      q.setFromAxisAngle(up, Math.atan2(d.x, d.z));
      plinth.setMatrixAt(i, m4.compose(new THREE.Vector3((a.x + b.x) / 2, KERB_H + 0.22, (a.z + b.z) / 2), q, new THREE.Vector3(0.7, 0.45, v2.len(d) + 0.7)));
    });
    plinth.castShadow = plinth.receiveShadow = true;
    group.add(plinth);
  }

  // Map boundary walls so you can't drive off the edge
  addPolyline([{ x: B.minX + 1, z: B.minZ + 1 }, { x: B.maxX - 1, z: B.minZ + 1 }, { x: B.maxX - 1, z: B.maxZ - 1 }, { x: B.minX + 1, z: B.maxZ - 1 }], true);

  scene.add(group);
  let waterT = 0;
  return {
    group, waterMat,
    update(dt, time) {
      waterT += dt * (1 + 2.5 * wetNow); // rain roughens and speeds up the river surface
      waterNormal.offset.set(waterT * 0.004, waterT * 0.011);
      fieldUniforms.uRainTime.value = time;
    },
  };
}

function buildBridge(br, groundMaterial) {
  const g = new THREE.Group();
  const L = br.length + 1.2, W = br.width;
  const angle = Math.atan2(br.dir.x, br.dir.z);
  // 20th-century bridges get one flat arch; the docklands bridges (Samuel Beckett, Tom Clarke) are slim
  // steel/concrete decks on piers, no arches at all
  // Frank Sherwin (1982) is a flat three-span concrete deck on slim piers, like the docklands bridges;
  // Sean Heuston Bridge (1828) is a single white cast-iron arch
  const modern = /Beckett|Tom Clarke|Sherwin|Rosie Hackett/.test(br.name), iron = /Heuston/.test(br.name);
  const arches = modern ? 0 : /Butt|Talbot|Rory|Heuston/.test(br.name) ? 1 : 3;
  const bodyMat = modern ? deckMaterial : iron ? ironWhiteMaterial : stoneMaterial;
  // body: arch shape extruded across the width
  const shape = new THREE.Shape();
  const bottom = modern ? -1.7 : WATER_Y - 1.5, top = -0.08;
  shape.moveTo(-L / 2, bottom); shape.lineTo(L / 2, bottom); shape.lineTo(L / 2, top); shape.lineTo(-L / 2, top); shape.closePath();
  const pier = arches <= 1 ? 0 : Math.max(1.5, L * 0.06);
  const spanW = (L - 2 - pier * (arches - 1)) / arches;
  const crown = arches === 1 ? -0.9 : -0.7, spring = WATER_Y + 0.2;
  for (let k = 0; k < arches; k++) {
    const x0 = -L / 2 + 1 + k * (spanW + pier), x1 = x0 + spanW;
    const hole = new THREE.Path();
    hole.moveTo(x0, bottom + 0.01);
    hole.lineTo(x0, spring);
    hole.absellipse((x0 + x1) / 2, spring, spanW / 2, crown - spring, Math.PI, 0, true);
    hole.lineTo(x1, bottom + 0.01);
    hole.closePath();
    shape.holes.push(hole);
  }
  const body = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false, curveSegments: 10 });
  body.translate(0, 0, -W / 2);
  body.rotateY(Math.PI / 2); // shape x -> world -z ... align length with local z
  const uvScale = body.attributes.uv; for (let i = 0; i < uvScale.count; i++) uvScale.setXY(i, uvScale.getX(i) / 4, uvScale.getY(i) / 4);
  const bodyMesh = new THREE.Mesh(body, bodyMat);
  bodyMesh.castShadow = bodyMesh.receiveShadow = true;
  bodyMesh.userData.standIn = bodyMesh.userData.dynamic = iron; // kept out of the static batch: hidden when the hero loads
  g.add(bodyMesh);

  // deck (world-UV'd so the painted road continues seamlessly)
  const deckGeo = new THREE.PlaneGeometry(W + 1.6, L + 0.6);
  deckGeo.rotateX(-Math.PI / 2);
  const tmp = new THREE.Mesh(deckGeo);
  tmp.rotation.y = angle; tmp.position.set(br.centre.x, 0, br.centre.z); tmp.updateMatrixWorld();
  deckGeo.applyMatrix4(tmp.matrixWorld);
  setGroundUVs(deckGeo);
  const deck = new THREE.Mesh(deckGeo, groundMaterial);
  deck.receiveShadow = true;

  // parapets
  const parH = 1.05;
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(modern || iron ? new THREE.BoxGeometry(0.25, parH, L + 1.5) : new THREE.BoxGeometry(0.7, parH, L + 1.5), modern ? railMaterial : iron ? ironWhiteMaterial : stoneMaterial);
    p.position.set(side * (W / 2 + 0.35), parH / 2, 0);
    p.castShadow = p.receiveShadow = true;
    p.userData.standIn = p.userData.dynamic = iron; // Sean Heuston Bridge: hidden when its hero model (heuston.js) loads
    g.add(p);
    // collision (local +x maps to world (dir.z, -dir.x) under rotation.y = angle)
    const n = { x: br.dir.z, z: -br.dir.x };
    const cx = br.centre.x + n.x * side * (W / 2 + 0.35), cz = br.centre.z + n.z * side * (W / 2 + 0.35);
    addSegment(cx - br.dir.x * (L / 2 + 0.75), cz - br.dir.z * (L / 2 + 0.75), cx + br.dir.x * (L / 2 + 0.75), cz + br.dir.z * (L / 2 + 0.75));
  }
  if (modern) {
    // piers down into the water
    for (const t of [-0.28, 0.28]) {
      const pm = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, -1.7 - WATER_Y + 1.5, 3), deckMaterial);
      pm.position.set(0, (-1.7 + WATER_Y - 1.5) / 2, t * L);
      pm.castShadow = pm.receiveShadow = true;
      g.add(pm);
    }
  }
  g.rotation.y = angle;
  g.position.set(br.centre.x, 0, br.centre.z);
  const outer = new THREE.Group();
  outer.add(g, deck);
  outer.name = br.name;
  return outer;
}

function railingTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1d211f';
  ctx.fillRect(0, 10, 64, 6); ctx.fillRect(0, 100, 64, 6);
  for (let x = 4; x < 64; x += 16) {
    ctx.fillRect(x, 4, 4, 124);
    ctx.beginPath(); ctx.moveTo(x - 3, 8); ctx.lineTo(x + 2, 0); ctx.lineTo(x + 7, 8); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildRailings(polys) {
  const mat = new THREE.MeshStandardMaterial({ map: railingTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0 }); // painted railings
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (const { poly } of polys) {
    const ring = [...poly, poly[0]];
    addPolyline(ring);
    let u = 0;
    ring.forEach((p, i) => {
      if (i) u += v2.len(v2.sub(p, ring[i - 1])) / 0.9;
      pos.push(p.x, KERB_H, p.z, p.x, KERB_H + 1.7, p.z);
      uv.push(u, 0, u, 1);
      if (i && !openQuay(ring[i - 1], p)) { const k = base + i * 2; idx.push(k - 2, k, k - 1, k, k + 1, k - 1); }
    });
    base += ring.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

export { rng };
