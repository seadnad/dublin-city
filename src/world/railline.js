// The DART line through the city centre (docs/research/railway.md), as data: the centreline in game metres, the height
// of the deck along it, where it runs over roads and water on girder spans and where it stands on its masonry viaduct,
// the stations, and the stretches that other builds already dress (Grand Canal Dock in barrowst.js, the Lansdowne Road
// crossing in landmarks.js). No three.js here: sites.js (reserved footprints), props.js (no lamps under the spans), the
// railway builder, the train and the Blender layout (tools/railway-layout.mjs) all read the same numbers.
//
// Chainage s runs from the north end (the Great Northern line past the Royal Canal) south through Connolly, over the
// Loopline Bridge to Tara Street and Pearse, and on to Lansdowne Road. "Left" (q > 0) is to the east of a southbound train.
import { world, project, v2, resample, closestOnSegment, pointInPolygon } from './geo.js';
import data from '../data/railway.json';
import bs from '../data/barrowst.json';

const KERB = 0.13; // roads.js KERB_H (kept here so this module stays free of the road builder)
export const DECK = 6.5; // ballast top on the Loop Line viaduct: "approximately six metres above street level" (Wikipedia)
export const RAIL_UP = 0.16; // rail top above the ballast (as barrowst.json's embankment)
export const TRACK = 2.25; // each track's centre from the line's centre (as barrowst)
export const HALF = 5.6; // the viaduct's outer face from the centre, parapet included
export const HALF_STATION = 6.9; // widened for the side platforms
export const PLATFORM = { edge: 4.0, out: 6.5, up: 0.9 }; // platform edge / back from the centre, height above the ballast

// ---------- the centreline ----------
const N = (id) => world.nodes.get(id);
// the Lansdowne Road crossing frame (sites.js lansdowneXing): the track runs NW (bearing 322) through node AVLX
const LX = (() => {
  const X = N('AVLX'), B = (322 * Math.PI) / 180, t = { x: Math.sin(B), z: -Math.cos(B) };
  return { X, t, at: (s) => ({ x: X.x + t.x * s, z: X.z + t.z * s }) };
})();
function centreline() {
  let P = data.line.map(([lat, lon]) => project(lat, lon));
  const near = (q, from = 0) => { let bi = from, bd = Infinity; for (let i = from; i < P.length; i++) { const d = v2.len(v2.sub(P[i], q)); if (d < bd) { bd = d; bi = i; } } return bi; };
  // Grand Canal Dock: run on barrowst's embankment (its line is squeezed clear of the uncompressed roads)
  const B = bs.rail.line.map(([x, z]) => ({ x, z }));
  const i0 = near(B[0]), i1 = near(B[B.length - 1], i0);
  P = [...P.slice(0, i0), ...B, ...P.slice(i1 + 1)];
  // Lansdowne Road: straight down the crossing's track from its covered way to the end of the platforms
  const k = P.findIndex((p) => v2.dot(v2.sub(p, LX.X), LX.t) < 92);
  P = [...P.slice(0, k), LX.at(90), LX.at(-66)];
  let pts = resample(P, 2);
  // two passes of a light moving average take the corners off the simplified OSM polyline (ends held)
  for (let pass = 0; pass < 2; pass++) {
    pts = pts.map((p, i) => {
      if (i < 2 || i > pts.length - 3) return p;
      let x = 0, z = 0;
      for (let j = -2; j <= 2; j++) { x += pts[i + j].x; z += pts[i + j].z; }
      return { x: x / 5, z: z / 5 };
    });
  }
  return pts;
}
export const pts = centreline();
export const S = [0];
for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + v2.len(v2.sub(pts[i], pts[i - 1])));
export const LENGTH = S[S.length - 1];

// point, direction and left normal at chainage s
export function at(s) {
  s = Math.max(0, Math.min(LENGTH, s));
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
  const t = (s - S[lo]) / (S[hi] - S[lo] || 1), a = pts[lo], b = pts[hi];
  const d = v2.norm(v2.sub(b, a));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, d, n: { x: d.z, z: -d.x } };
}
// chainage of the point nearest p
export function sOf(p) {
  let best = 0, bd = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const c = closestOnSegment(p, pts[i], pts[i + 1]);
    if (c.d2 < bd) { bd = c.d2; best = S[i] + c.t * (S[i + 1] - S[i]); }
  }
  return best;
}
export const offsetAt = (s, q) => { const p = at(s); return { x: p.x + p.n.x * q, z: p.z + p.n.z * q }; };

// ---------- the stretches other builds dress ----------
export const GCD = { s0: sOf({ x: bs.rail.line[0][0], z: bs.rail.line[0][1] }), s1: sOf({ x: bs.rail.line.at(-1)[0], z: bs.rail.line.at(-1)[1] }) };
export const LANSDOWNE = { s0: sOf(LX.at(62)), podium: sOf(LX.at(60)), crossing: sOf(LX.X) };

// ---------- the deck height ----------
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const PEARSE_END = sOf(project(53.34296, -6.24663)); // the east end of Pearse's platforms: the D&KR line falls from here
// past the bridges over South Lotts Road and Bath Avenue (the last span before the crossing: set once the spans are found)
// the line comes down to the level crossing
let BATH_AVE = GCD.s1 + 140;
export function deckAt(s) {
  if (s <= PEARSE_END) return DECK;
  if (s < GCD.s0) return DECK - 0.5 * smooth(PEARSE_END, GCD.s0, s);
  if (s <= BATH_AVE) return 6.0;
  return 6.0 + (KERB + 0.1 - 6.0) * smooth(BATH_AVE, LANSDOWNE.s0, s);
}
export const railTop = (s) => deckAt(s) + RAIL_UP;
// the track's offset from the centre: the crossing's rails are 1.9 m out, not 2.25
export const trackAt = (s) => TRACK + (1.9 - TRACK) * smooth(BATH_AVE, LANSDOWNE.s0, s);

// ---------- stations ----------
const TRAIN = 4 * 12.5 + 3 * 0.8; // src/game/dart.js
export const stations = Object.entries(data.stations).map(([name, st]) => {
  let s;
  if (st.at === 'barrowst') { // the middle of barrowst's platforms (given as an x range along its line)
    const x = (bs.rail.station[0] + bs.rail.station[1]) / 2, L = bs.rail.line, i = L.findIndex((p, j) => j + 1 < L.length && p[0] <= x && L[j + 1][0] >= x);
    s = sOf({ x, z: L[i][1] + ((x - L[i][0]) / (L[i + 1][0] - L[i][0])) * (L[i + 1][1] - L[i][1]) });
  }
  else if (st.at === 'lansdowne') s = sOf(LX.at(-38)); // the crossing's side platforms run s -60..-16
  else s = sOf(project(st.at[0], st.at[1]));
  return { name, s, len: st.len || 0, dressed: typeof st.at === 'string', canopy: st.canopy || null, stop: s };
});

// ---------- spans: where the line has to cross a road or water ----------
// A cross-section of the viaduct is blocked if any of it stands in a road corridor (carriageway and footpaths) or
// over water; blocked stretches become girder spans, the rest is masonry viaduct.
function roadIntrusion(x, z, pad = 0.4) {
  let worst = -Infinity, way = null;
  for (const sg of world.segsNear(x, z)) {
    const c = closestOnSegment({ x, z }, sg.a, sg.b), d = sg.way.width / 2 + sg.way.pave + pad - Math.sqrt(c.d2);
    if (d > worst) { worst = d; way = sg.way; }
  }
  return { d: worst, way };
}
const water = (p) => pointInPolygon(p, world.riverPoly) || world.docks.some((dk) => pointInPolygon(p, dk.poly));
export const halfAt = (s) => {
  let h = HALF;
  for (const st of stations) if (!st.dressed && st.len) h = Math.max(h, HALF + (HALF_STATION - HALF) * (1 - smooth(st.len / 2 + 2, st.len / 2 + 8, Math.abs(s - st.s))));
  return h;
};
function findSpans() {
  const STEP = 0.5, raw = [];
  let cur = null;
  for (let s = 0; s <= LANSDOWNE.s0; s += STEP) {
    if (s > GCD.s0 - 1 && s < GCD.s1 + 1) { if (cur) { raw.push(cur); cur = null; } continue; } // barrowst's own bridges
    const p = at(s), h = halfAt(s) + 0.3, names = new Set();
    let hit = false;
    for (const q of [-h, -h / 2, 0, h / 2, h]) {
      const x = p.x + p.n.x * q, z = p.z + p.n.z * q, r = roadIntrusion(x, z);
      if (r.d > 0) { hit = true; names.add(r.way.name); }
      if (water({ x, z })) { hit = true; names.add('water'); }
    }
    if (hit) {
      if (!cur) cur = { s0: s, s1: s, over: new Set() };
      cur.s1 = s; for (const n of names) cur.over.add(n);
    } else if (cur) { raw.push(cur); cur = null; }
  }
  if (cur) raw.push(cur);
  // merge spans with less than 5 m of viaduct between them (a pier would stand on the footpath's back edge)
  const out = [];
  for (const sp of raw) {
    const last = out[out.length - 1];
    if (last && sp.s0 - last.s1 < 5) { last.s1 = sp.s1; for (const n of sp.over) last.over.add(n); } else out.push({ ...sp });
  }
  return out.map((sp) => ({ s0: sp.s0 - 0.6, s1: sp.s1 + 0.6, over: [...sp.over] }));
}
export const spans = findSpans();
// a station can start right off a street bridge ("after": the road's name), like Pearse's platforms off Westland Row
for (const st of stations) {
  const after = data.stations[st.name].after, sp = after && spans.find((k) => k.over.includes(after));
  if (sp) st.s = st.stop = sp.s1 + 1.5 + st.len / 2;
}
// the Loop Line (Connolly to Westland Row) has lattice girders; the older lines plate girders
export const LOOP = { s0: stations.find((st) => st.name === 'Connolly').s - 36, s1: sOf(project(53.34345, -6.24900)) };
for (const sp of spans) sp.style = sp.s1 > LOOP.s0 && sp.s0 < LOOP.s1 ? 'lattice' : 'plate';
BATH_AVE = Math.max(...spans.filter((sp) => sp.s1 < LANSDOWNE.s0 && sp.s0 > GCD.s1).map((sp) => sp.s1), GCD.s1) + 6;
// the Loopline Bridge: the span over the Liffey and its quays (built by tools/blender/build_loopline.py with its piers)
// and the next one north, over Beresford Place, carry lattice girders (refs 01-05); the Loop Line's other street
// bridges are plate girders on cast-iron columns at the kerbs (Amiens Street, ref 08), as are the older lines'
export const loopline = spans.find((sp) => sp.over.includes('water') && sp.style === 'lattice') || null;
for (const sp of spans) if (sp.style === 'lattice' && sp !== loopline && !(loopline && loopline.s0 - sp.s1 < 40 && loopline.s0 > sp.s1)) sp.style = 'plate';
if (loopline) loopline.hero = true;
// intermediate columns on the long street spans: pairs under the girders where both stand clear of every carriageway
// (on a footpath or an island) and off the water, no more than 24 m apart
function carriageway(x, z, pad = 0.5) {
  for (const sg of world.segsNear(x, z)) {
    const c = closestOnSegment({ x, z }, sg.a, sg.b);
    if (Math.sqrt(c.d2) < sg.way.width / 2 + pad) return true;
  }
  return false;
}
// Each girder gets its own columns (on a skewed crossing the pair can't stand side by side): cols = [[s, side], ...]
for (const sp of spans) {
  sp.cols = [];
  if (sp.hero || sp.s1 - sp.s0 < 26) continue;
  for (const side of [-1, 1]) {
    const ok = (s) => {
      const p = at(s), q = side * (halfAt(s) - 0.7), x = p.x + p.n.x * q, z = p.z + p.n.z * q;
      return !carriageway(x, z) && !water({ x, z });
    };
    let last = sp.s0;
    while (sp.s1 - last > 24) {
      let pick = null;
      for (let s = Math.min(last + 24, sp.s1 - 4); s > last + 5; s -= 0.5) if (ok(s)) { pick = s; break; }
      if (pick === null) { // nowhere within reach: take the nearest clear spot further on
        for (let s = last + 24; s < sp.s1 - 4; s += 0.5) if (ok(s)) { pick = s; break; }
      }
      if (pick === null) break;
      sp.cols.push([pick, side]); last = pick;
    }
  }
}

// the river piers: a double row of cast-iron cylinders at each quay wall and two more rows in the river (five spans)
export function looplinePiers() {
  if (!loopline) return [];
  let w0 = null, w1 = null;
  for (let s = loopline.s0; s <= loopline.s1; s += 0.25) if (pointInPolygon(at(s), world.riverPoly)) { if (w0 === null) w0 = s; w1 = s; }
  if (w0 === null) return [];
  const a = w0 + 1.4, b = w1 - 1.4; // just off the quay walls, in the water
  return [a, a + (b - a) / 3, a + (2 * (b - a)) / 3, b].map((s) => ({ s, water: true }));
}

// ---------- the solid viaduct: stretches between spans, and the footprints kept clear of filler buildings ----------
export function solidRanges() {
  const out = [];
  let s = 0;
  for (const sp of spans) { if (sp.s0 > s) out.push([s, sp.s0]); s = Math.max(s, sp.s1); }
  out.push([s, LANSDOWNE.s0]);
  // barrowst builds its own embankment between its bridges
  return out.flatMap(([a, b]) => (b <= GCD.s0 - 0.5 || a >= GCD.s1 + 0.5 ? [[a, b]] : [[a, Math.min(b, GCD.s0)], [Math.max(a, GCD.s1), b]].filter(([x, y]) => y - x > 0.5)));
}
// rotated boxes along the solid stretches (sites.js adds them to `reserved`), each at most 24 m long
export function footprints(margin = 0.8) {
  const out = [];
  for (const [a, b] of solidRanges()) {
    const n = Math.max(1, Math.ceil((b - a) / 24));
    for (let k = 0; k < n; k++) {
      const s0 = a + ((b - a) * k) / n, s1 = a + ((b - a) * (k + 1)) / n;
      const p = at(s0), q = at(s1), c = v2.lerp(p, q, 0.5), d = v2.sub(q, p);
      const w = 2 * Math.max(halfAt(s0), halfAt(s1)) + margin;
      // trim so the box keeps off any carriageway (the box's corners stick out on a curve)
      out.push({ x: c.x, z: c.z, rot: Math.atan2(d.x, d.z), w, d: Math.max(0.5, v2.len(d) - 0.2), rail: true });
    }
  }
  return out;
}
// ---------- Pearse's front on Westland Row, and the Tara Street fire station's tower ----------
// The station's red-brick front stands on the east side of Westland Row, south of the tracks (ref 16): a
// parallelogram from the street's footpath along the viaduct's south face. Returns { poly: [A, B, C, D], centre, s }.
export function pearseFront(len = 20, depth = 17) {
  const way = world.ways.find((w) => w.name === 'Westland Row');
  const sp = spans.find((k) => k.over.includes('Westland Row'));
  if (!way || !sp) return null;
  const a = way.pts[0], b = way.pts[way.pts.length - 1], w = v2.norm(v2.sub(b, a)), e = { x: -w.z, z: w.x };
  const east = e.x > 0 ? e : { x: -e.x, z: -e.z }, off = way.width / 2 + way.pave + 0.4;
  const dist = (p) => v2.dot(v2.sub(p, a), east) - off; // > 0 east of the footpath
  let lo = sp.s0, hi = sp.s1 + 30;
  const face = (s) => offsetAt(s, -halfAt(s));
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (dist(face(m)) > 0) hi = m; else lo = m; }
  const sA = hi, A = face(sA), B = v2.add(A, v2.scale(w, len)), D = face(sA + depth), C = v2.add(B, v2.sub(D, A));
  return { poly: [A, B, C, D], centre: v2.lerp(A, C, 0.5), s: sA };
}
// OSM way 1534687394 (53.34549, -6.25500), a 1906 hose tower 40 m high: moved east off Tara Street's footpath
export const fireTower = (() => {
  const p = project(53.345487, -6.255002), way = world.ways.find((w) => w.name === 'Tara Street' && w.pts.some((q) => Math.abs(q.z - p.z) < 60));
  let x = p.x;
  if (way) for (let k = 0; k < 80; k++) {
    const near = world.nearestRoad(x, p.z);
    if (!near || near.dist > near.way.width / 2 + near.way.pave + 2.9) break;
    x += 0.5;
  }
  return { x, z: p.z, w: 3.6, h: 40 };
})();

// is (x, z) under one of the spans (for lamps and street trees, which would come up through the deck)?
const BOX = pts.reduce((b, p) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), z0: Math.min(b.z0, p.z), z1: Math.max(b.z1, p.z) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
export function underSpan(x, z, pad = 1.5) {
  if (x < BOX.x0 - 10 || x > BOX.x1 + 10 || z < BOX.z0 - 10 || z > BOX.z1 + 10) return false;
  const s = sOf({ x, z }), p = at(s), q = Math.abs((x - p.x) * p.n.x + (z - p.z) * p.n.z);
  if (q > halfAt(s) + pad) return false;
  return spans.some((sp) => s > sp.s0 - pad && s < sp.s1 + pad);
}
