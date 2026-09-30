// Projection, street graph, spatial lookups and polygon helpers.
// World units are metres after compression; +x is east, +z is south (north is -z).
import data from '../data/streets.json';

export const PAVEMENT = 3.5; // footpath width each side of a road (not compressed)

const TYPE_WIDTH = { boulevard: 30, primary: 12, secondary: 9, lane: 6, quay: 11, bridge: 13 };
const TYPE_SPEED = { boulevard: 13, primary: 12, secondary: 10, lane: 6, quay: 13, bridge: 12 };

const [LAT0, LON0] = data.meta.origin;
const SCALE = data.meta.scale;
const M_PER_LAT = 111320;
const M_PER_LON = 111320 * Math.cos((LAT0 * Math.PI) / 180);

// The band from College Green to Christ Church is stretched east-west so Dame Street reads closer to its real
// length (the uniform 50% compression made it feel short); everything west of the band shifts over with it.
const STRETCH = { a: (-6.2675 - LON0) * M_PER_LON, b: (-6.2612 - LON0) * M_PER_LON, k: 1.6 };
// Phoenix Park is bigger than the whole city centre: west of Parkgate everything is squeezed east-west to 0.7 (0.35 of
// real overall) so Chesterfield Avenue stays one long straight without the park swallowing the map.
const PARK_X = { c: (-6.2985 - LON0) * M_PER_LON, k: 0.7 };
function warpX(u) {
  const { a, b, k } = STRETCH;
  if (u >= b) return u;
  if (u >= a) return b - (b - u) * k;
  if (u >= PARK_X.c) return b - (b - a) * k - (a - u);
  return b - (b - a) * k - (a - PARK_X.c) - (PARK_X.c - u) * PARK_X.k;
}

// Likewise a band of latitudes from Dame Street to the south quays is stretched north-south: at half scale with
// real-width roads there was no room left between Temple Bar and the quay for Merchant's Arch and the quay-front
// buildings. Depends on latitude only, so north-south streets stay straight; everything north of it shifts north.
const STRETCH_N = { a: (53.3442 - LAT0) * M_PER_LAT, b: (53.3462 - LAT0) * M_PER_LAT, k: 1.4 };
function warpN(v) {
  const { a, b, k } = STRETCH_N;
  if (v <= a) return v;
  if (v <= b) return a + (v - a) * k;
  return a + (b - a) * k + (v - b);
}

export function project(lat, lon) {
  return { x: warpX((lon - LON0) * M_PER_LON) * SCALE, z: -warpN((lat - LAT0) * M_PER_LAT) * SCALE };
}

// ---------- small vector helpers ----------
export const v2 = {
  sub: (a, b) => ({ x: a.x - b.x, z: a.z - b.z }),
  add: (a, b) => ({ x: a.x + b.x, z: a.z + b.z }),
  scale: (a, s) => ({ x: a.x * s, z: a.z * s }),
  len: (a) => Math.hypot(a.x, a.z),
  norm: (a) => { const l = Math.hypot(a.x, a.z) || 1; return { x: a.x / l, z: a.z / l }; },
  dot: (a, b) => a.x * b.x + a.z * b.z,
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }),
};

// Closest point on segment ab to p. Returns { t, d2, x, z }.
export function closestOnSegment(p, a, b) {
  const abx = b.x - a.x, abz = b.z - a.z;
  const l2 = abx * abx + abz * abz || 1e-9;
  let t = ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + abx * t, z = a.z + abz * t;
  const dx = p.x - x, dz = p.z - z;
  return { t, x, z, d2: dx * dx + dz * dz };
}

// Offset a polyline sideways by d (positive = to the right when looking along +direction,
// where "right" of direction (dx,dz) is (-dz, dx) in this x-east / z-south frame).
export function offsetPolyline(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let n;
    if (i === 0 || i === pts.length - 1) {
      const t = v2.norm(v2.sub(b, a));
      n = { x: -t.z, z: t.x };
      out.push({ x: p.x + n.x * d, z: p.z + n.z * d });
    } else {
      const t1 = v2.norm(v2.sub(p, a)), t2 = v2.norm(v2.sub(b, p));
      const n1 = { x: -t1.z, z: t1.x }, n2 = { x: -t2.z, z: t2.x };
      const m = v2.norm(v2.add(n1, n2));
      const k = 1 / Math.max(0.35, v2.dot(m, n1)); // miter length, clamped
      out.push({ x: p.x + m.x * d * k, z: p.z + m.z * d * k });
    }
  }
  return out;
}

// offsetPolyline with a distance per point
export function offsetPolylineVar(pts, ds) {
  return pts.map((p, i) => offsetPolyline(pts, ds[i])[i]);
}

export function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = v2.len(v2.sub(b, a));
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push(v2.lerp(a, b, k / n));
  }
  return out;
}

export function polylineLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += v2.len(v2.sub(pts[i], pts[i - 1]));
  return L;
}

export function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.x * q.z - q.x * p.z;
  }
  return a / 2;
}

export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

// Inset a simple polygon by d (per-edge distances allowed via array). Works well for convex-ish blocks.
export function insetPolygon(poly, d) {
  const n = poly.length;
  const sgn = signedArea(poly) > 0 ? 1 : -1;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const t = v2.norm(v2.sub(b, a));
    // inward normal: for positive signed area (clockwise on screen with z down), inward is (-t.z, t.x)*sgn
    const nn = { x: -t.z * sgn, z: t.x * sgn };
    const di = Array.isArray(d) ? d[i] : d;
    lines.push({ p: { x: a.x + nn.x * di, z: a.z + nn.z * di }, t });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const L1 = lines[(i + n - 1) % n], L2 = lines[i];
    const cross = L1.t.x * L2.t.z - L1.t.z * L2.t.x;
    if (Math.abs(cross) < 1e-6) { out.push(L2.p); continue; }
    const dx = L2.p.x - L1.p.x, dz = L2.p.z - L1.p.z;
    const s = (dx * L2.t.z - dz * L2.t.x) / cross;
    out.push({ x: L1.p.x + L1.t.x * s, z: L1.p.z + L1.t.z * s });
  }
  return out;
}

// ---------- build the world graph ----------
function build() {
  const nodes = new Map();
  for (const [id, [lat, lon]] of Object.entries(data.nodes)) {
    nodes.set(id, { id, ...project(lat, lon), edges: [], ways: [] });
  }

  const ways = data.ways.map((w, i) => {
    const width = w.width ?? TYPE_WIDTH[w.type] ?? 9;
    const pts = w.nodes.map((id) => {
      const n = nodes.get(id);
      if (!n) throw new Error(`Unknown node ${id} in way ${w.name}`);
      return { x: n.x, z: n.z };
    });
    const way = {
      index: i, name: w.name, type: w.type, width, nodeIds: w.nodes, pts,
      bridge: w.type === 'bridge', speed: TYPE_SPEED[w.type] ?? 10,
      pave: w.pave ?? PAVEMENT, // footpath width each side; wider on the grand streets
      pedestrian: !!w.pedestrian, // paved wall to wall (Grafton Street): no traffic, but the player may drive it
      // access: 'pedestrian' keeps AI traffic off (the player may still drive it, slowly); 'destination' is
      // access-only (AI avoid it as a through route). oneway: 1 = only in node order, -1 = only against it.
      // surface: 'sett' paves the carriageway with granite setts whatever the access.
      access: w.access || null, oneway: w.oneway || 0, surface: w.surface || (w.type === 'lane' && !w.pedestrian ? 'sett' : null),
      // lamps: a street-lighting style of its own instead of the city lamps ('gas': the Phoenix Park gas lamps, built
      // by park.js; 'none': unlit). roundabout: the id of the node at the centre of the ring this way belongs to.
      lamps: w.lamps || null, roundabout: w.roundabout || null,
      // laneOff: the running lanes' distance from the centreline where an island splits the carriageway (College Green)
      laneOff: w.laneOff || null,
    };
    for (const id of w.nodes) nodes.get(id).ways.push(way);
    return way;
  });

  // Directed lane graph for AI (every way is two-way).
  const edges = [];
  for (const way of ways) {
    for (let i = 0; i < way.nodeIds.length - 1; i++) {
      const A = nodes.get(way.nodeIds[i]), B = nodes.get(way.nodeIds[i + 1]);
      const len = Math.hypot(B.x - A.x, B.z - A.z);
      const e1 = { from: A, to: B, way, len }, e2 = { from: B, to: A, way, len };
      // may AI traffic drive this edge? (the player can drive anything)
      const open = !way.pedestrian && way.access !== 'pedestrian';
      e1.car = open && way.oneway !== -1; e2.car = open && way.oneway !== 1;
      A.edges.push(e1); B.edges.push(e2); edges.push(e1, e2);
    }
  }

  // Bounds
  const b = data.meta.bounds;
  const nw = project(b.north, b.west), se = project(b.south, b.east);
  const bounds = { minX: nw.x, minZ: nw.z, maxX: se.x, maxZ: se.z };
  bounds.w = bounds.maxX - bounds.minX; bounds.h = bounds.maxZ - bounds.minZ;

  // Segment spatial hash for "which street am I on" and "am I on the road".
  const segs = [];
  for (const way of ways) {
    for (let i = 0; i < way.pts.length - 1; i++) segs.push({ a: way.pts[i], b: way.pts[i + 1], way });
  }
  const CELL = 40;
  const hash = new Map();
  const key = (i, j) => i * 73856093 ^ j * 19349663;
  for (const s of segs) {
    const r = s.way.width / 2 + s.way.pave + 2;
    const i0 = Math.floor((Math.min(s.a.x, s.b.x) - r) / CELL), i1 = Math.floor((Math.max(s.a.x, s.b.x) + r) / CELL);
    const j0 = Math.floor((Math.min(s.a.z, s.b.z) - r) / CELL), j1 = Math.floor((Math.max(s.a.z, s.b.z) + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = key(i, j);
      if (!hash.has(k)) hash.set(k, []);
      hash.get(k).push(s);
    }
  }
  function segsNear(x, z) {
    return hash.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  }
  // Nearest road: returns { way, dist, along } where dist is from the centreline.
  function nearestRoad(x, z, filter) {
    let best = null, bd = Infinity;
    const p = { x, z };
    for (const s of segsNear(x, z)) {
      if (filter && !filter(s.way)) continue;
      const c = closestOnSegment(p, s.a, s.b);
      // prefer the road whose edge we are most inside of
      const d = Math.sqrt(c.d2) - s.way.width / 2;
      if (d < bd) { bd = d; best = { way: s.way, seg: s, dist: Math.sqrt(c.d2), edgeDist: d, cx: c.x, cz: c.z }; }
    }
    return best;
  }

  // River banks: offset the quay road centrelines toward the water.
  const quayHalf = TYPE_WIDTH.quay / 2 + PAVEMENT;
  const north = data.river.north.map((id) => ({ x: nodes.get(id).x, z: nodes.get(id).z }));
  const south = data.river.south.map((id) => ({ x: nodes.get(id).x, z: nodes.get(id).z }));
  extendToEdges(north, bounds); extendToEdges(south, bounds);
  // north quay runs west→east; the water is to the south (+z) which is the right side → positive offset
  const bankOffset = (ids) => {
    const d = ids.map((id) => {
      let w = 0;
      for (const way of nodes.get(id).ways) if (way.type === 'quay') w = Math.max(w, way.width / 2 + way.pave);
      return w || quayHalf;
    });
    return [d[0], ...d, d[d.length - 1]]; // extendToEdges added a point at each end
  };
  const northBank = offsetPolylineVar(north, bankOffset(data.river.north));
  const southBank = offsetPolylineVar(south, bankOffset(data.river.south).map((v) => -v));
  // upstream of Heuston the Liffey leaves the quays: a traced centreline (west to east) and a width, past Islandbridge
  if (data.river.west) {
    const c = resample(data.river.west.pts.map(([lat, lon]) => project(lat, lon)), 6), hw = data.river.west.width / 2;
    northBank.splice(0, 1, ...offsetPolyline(c, -hw)); southBank.splice(0, 1, ...offsetPolyline(c, hw));
    northBank.unshift({ x: bounds.minX, z: northBank[0].z }); southBank.unshift({ x: bounds.minX, z: southBank[0].z });
  }
  northBank[0].x = southBank[0].x = bounds.minX; northBank[northBank.length - 1].x = southBank[southBank.length - 1].x = bounds.maxX;
  const riverPoly = [...northBank, ...southBank.slice().reverse()];

  const polyOf = (ids) => ids.map((id) => ({ x: nodes.get(id).x, z: nodes.get(id).z, id }));
  const parks = Object.entries(data.parks).map(([name, ids]) => ({ name, poly: polyOf(ids), ids }));
  const campus = Object.entries(data.campus).map(([name, ids]) => ({ name, poly: polyOf(ids), ids }));
  // enclosed dock basins (Grand Canal Dock): water ringed by roads, like a park ringed by railings
  // a dock is either a ring of road nodes (inset from the roads like a park) or a traced [lat, lon] outline
  const docks = Object.entries(data.docks || {}).map(([name, pts]) => (Array.isArray(pts[0])
    ? { name, poly: pts.map(([lat, lon]) => project(lat, lon)), ids: null }
    : { name, poly: polyOf(pts), ids: pts }));

  // open green land (traced [lat, lon] outlines): grass everywhere but the roads and their footpaths
  const greens = Object.entries(data.greens || {}).map(([name, pts]) => ({ name, poly: pts.map(([lat, lon]) => project(lat, lon)) }));
  const canals = Object.entries(data.canals || {}).map(([name, c]) => buildCanal(name, c, segs, segsNear));
  // each stretch of canal water between two bridges or locks is a basin like the docks (water, walls, collision)
  for (const c of canals) for (const pool of c.pools) docks.push({ name: c.name, poly: pool.poly, ids: null, canal: c, level: pool.level });

  const luasLines = [data.luas, data.luasGreen].filter(Boolean).map((l) => buildLuasLine(l, nodes, bounds, nearestRoad));
  const luas = luasLines[0];
  // is (x, z) within r of a Luas track? (for placing buildings clear of the line)
  const LH = new Map(), LC = 10, LR = 8; // segments hashed into every cell within LR of them
  for (const l of luasLines) for (const t of l.tracks) for (let n = 1; n < t.length; n++) {
    const a = t[n - 1], b = t[n], seg = [a, b];
    for (let i = Math.floor((Math.min(a.x, b.x) - LR) / LC); i <= Math.floor((Math.max(a.x, b.x) + LR) / LC); i++) for (let j = Math.floor((Math.min(a.z, b.z) - LR) / LC); j <= Math.floor((Math.max(a.z, b.z) + LR) / LC); j++) {
      const k = i * 100003 + j; if (!LH.has(k)) LH.set(k, []); LH.get(k).push(seg);
    }
  }
  const luasNear = (x, z, r) => { // r up to LR
    const p = { x, z };
    for (const [a, b] of LH.get(Math.floor(x / LC) * 100003 + Math.floor(z / LC)) || []) if (closestOnSegment(p, a, b).d2 < r * r) return true;
    return false;
  };

  return { nodes, ways, edges, bounds, segs, segsNear, nearestRoad, northBank, southBank, riverPoly, parks, campus, docks, canals, greens, luas, luasLines, luasNear };
}

// ---------- canals ----------
// A canal is a traced centreline ([lat, lon] points, listed from its upper end down to the Liffey), a water width
// (game metres, not compressed, like the roads) and optional lock positions. Where a road crosses, the water stops
// short of the carriageway and footpaths: the road runs over on a (flat) bridge, and each stretch of water between
// two crossings or locks becomes its own pool, stepping down at every lock. Grass banks run along both sides, as
// wide as the nearby roads allow. `covered` lists [[lat, lon], [lat, lon]] stretches that run under a building (the
// Royal Canal under Croke Park's Davin Stand): the water carries on, but the banks there are paved and get no trees.
const CANAL_TOP = -0.75, LOCK_DROP = 0.2, CANAL_MIN = -2.1;
function buildCanal(name, c, segs, segsNear) {
  const width = c.width ?? 9, verge = c.verge ?? 5;
  const pts = resample(c.pts.map(([lat, lon]) => project(lat, lon)), 2);
  const S = [0];
  for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + v2.len(v2.sub(pts[i], pts[i - 1])));
  const total = S[S.length - 1];
  const at = (s) => {
    let i = 1;
    while (i < pts.length - 1 && S[i] < s) i++;
    const t = (s - S[i - 1]) / (S[i] - S[i - 1] || 1);
    const p = v2.lerp(pts[i - 1], pts[i], Math.max(0, Math.min(1, t)));
    const d = v2.norm(v2.sub(pts[i], pts[i - 1]));
    return { x: p.x, z: p.z, d, n: { x: -d.z, z: d.x } };
  };
  // how far (x, z) is inside any road's carriageway + footpath corridor (> 0 = inside)
  const intrusion = (x, z, pad = 0.6) => {
    let worst = -Infinity;
    for (const s of segsNear(x, z)) {
      const q = closestOnSegment({ x, z }, s.a, s.b);
      worst = Math.max(worst, s.way.width / 2 + s.way.pave + pad - Math.sqrt(q.d2));
    }
    return worst;
  };
  // road crossings: where a road segment intersects the centreline
  const crossings = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    for (const s of segsNear((a.x + b.x) / 2, (a.z + b.z) / 2)) {
      const r = segIntersect(a, b, s.a, s.b);
      if (r !== null && !crossings.some((k) => k.way === s.way && Math.abs(k.s - (S[i - 1] + r * (S[i] - S[i - 1]))) < 3)) {
        crossings.push({ s: S[i - 1] + r * (S[i] - S[i - 1]), way: s.way, road: v2.norm(v2.sub(s.b, s.a)) });
      }
    }
  }
  crossings.sort((p, q) => p.s - q.s);
  // the gap each crossing needs: step out along the canal until the water's edges clear the road corridor
  const clear = (s) => { const p = at(s); return [-width / 2, 0, width / 2].every((o) => intrusion(p.x + p.n.x * o, p.z + p.n.z * o) < 0); };
  const gaps = crossings.map((k) => {
    let s0 = k.s, s1 = k.s;
    while (s0 > 0 && !clear(s0)) s0 -= 0.5;
    while (s1 < total && !clear(s1)) s1 += 0.5;
    return { s0, s1, kind: 'bridge', crossing: k };
  });
  const locks = (c.locks || []).map((ll) => {
    const p = project(ll[0], ll[1]);
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = v2.len(v2.sub(pts[i], p)); if (d < bd) { bd = d; best = S[i]; } }
    return best;
  });
  for (const s of locks) gaps.push({ s0: s - 0.4, s1: s + 0.4, kind: 'lock' });
  // stretches that run under a building (the Davin Stand at Croke Park): [[lat, lon], [lat, lon]] ranges -> s ranges
  const nearestS = (ll) => {
    const p = project(ll[0], ll[1]);
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = v2.len(v2.sub(pts[i], p)); if (d < bd) { bd = d; best = S[i]; } }
    return best;
  };
  const covered = (c.covered || []).map(([a, b]) => { const s0 = nearestS(a), s1 = nearestS(b); return [Math.min(s0, s1), Math.max(s0, s1)]; });
  const isCovered = (s) => covered.some(([a, b]) => s >= a && s <= b);
  gaps.sort((p, q) => p.s0 - q.s0);
  // merge overlapping gaps, then the pools are what's left
  const merged = [];
  for (const g of gaps) {
    const last = merged[merged.length - 1];
    if (last && g.s0 <= last.s1 + 1) { last.s1 = Math.max(last.s1, g.s1); if (g.kind === 'lock') last.lock = true; else (last.bridges ||= []).push(g.crossing); }
    else merged.push({ s0: g.s0, s1: g.s1, lock: g.kind === 'lock', bridges: g.kind === 'bridge' ? [g.crossing] : [] });
  }
  const pools = [];
  let s = 0, level = CANAL_TOP;
  for (const g of [...merged, { s0: total, s1: total }]) {
    if (g.s0 - s > 3) {
      const run = [], runS = [];
      for (let t = s; t < g.s0; t += 2) { run.push(at(t)); runS.push(t); }
      run.push(at(g.s0)); runS.push(g.s0);
      const cover = runS.map(isCovered);
      const left = run.map((p) => ({ x: p.x + p.n.x * width / 2, z: p.z + p.n.z * width / 2 }));
      const right = run.map((p) => ({ x: p.x - p.n.x * width / 2, z: p.z - p.n.z * width / 2 }));
      // grass banks: out from each edge as far as the verge width, stopping short of any road corridor
      const bank = (side) => run.map((p) => {
        let w = 0;
        while (w < verge) {
          const o = side * (width / 2 + w + 0.5);
          if (intrusion(p.x + p.n.x * o, p.z + p.n.z * o, 0.2) >= 0) break;
          w += 0.5;
        }
        return w;
      });
      const bl = bank(1), br = bank(-1);
      const edge = (side, ws) => run.map((p, i) => ({ x: p.x + p.n.x * side * (width / 2 + ws[i]), z: p.z + p.n.z * side * (width / 2 + ws[i]) }));
      pools.push({
        s0: s, s1: g.s0, level, centre: run,
        poly: [...left, ...right.slice().reverse()],
        banks: [{ inner: left, outer: edge(1, bl), w: bl, cover }, { inner: right, outer: edge(-1, br), w: br, cover }],
      });
    }
    if (g.lock) level = Math.max(CANAL_MIN, level - LOCK_DROP);
    s = g.s1;
  }
  const ends = merged.map((g) => ({ ...g, a: at(g.s0), b: at(g.s1) }));
  return { name, width, pts, total, pools, gaps: ends, locks, covered };
}

// ---------- Luas ----------
// A line (streets.json `luas`, `luasGreen`) is a set of legs and the services that run over them (docs/research/luas.md).
// A leg is a centreline through street nodes or [lat, lon] points: double track unless `single` (one-way, like the
// Green Line's O'Connell Street and Marlborough Street legs). `shift` moves the centreline sideways (metres to the left
// of the leg's direction, keyed by node id or "id+metres", interpolated between keys), so a track can keep to one
// carriageway. A run is a list of legs one tram drives end to end ("-leg" = against the leg's direction); trams keep
// left, so a run over a double leg takes the track LUAS_TRACK to the left of its centreline. Every run becomes one
// smooth polyline (corners filleted); the rendered tracks are the runs' polylines with shared stretches drawn once.
export const LUAS_TRACK = 1.8;
const LUAS_FILLET = 14;

function luasKeyArc(key, arcOf) {
  const m = /^(.*?)([+-]\d+(?:\.\d+)?)?$/.exec(key);
  const a = arcOf(m[1]);
  return a === undefined ? undefined : a + (m[2] ? +m[2] : 0);
}
// round every corner of a polyline ({x, z, ra}) with an arc of radius R (less where the segments are short)
function filletPath(P, R) {
  const out = [P[0]];
  const mix = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t, ra: p.ra + (q.ra - p.ra) * t });
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const la = v2.len(v2.sub(b, a)), lc = v2.len(v2.sub(c, b));
    if (la < 1e-6 || lc < 1e-6) continue;
    const u = v2.scale(v2.sub(b, a), 1 / la), w = v2.scale(v2.sub(c, b), 1 / lc);
    const ang = Math.acos(Math.max(-1, Math.min(1, v2.dot(u, w))));
    if (ang < 0.01) { out.push(b); continue; }
    const t = Math.min(R * Math.tan(ang / 2), la * 0.45, lc * 0.45);
    const p0 = mix(b, a, t / la), p1 = mix(b, c, t / lc), n = Math.max(2, Math.ceil(ang / 0.06));
    for (let k = 0; k <= n; k++) { // quadratic Bezier through the tangent points, control point the corner
      const s = k / n, q0 = mix(p0, b, s), q1 = mix(b, p1, s);
      out.push(mix(q0, q1, s));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
function arcTable(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return s;
}
function buildLuasLine(l, nodes, bounds, nearestRoad) {
  const pt = (r) => (typeof r === 'string' ? { x: nodes.get(r).x, z: nodes.get(r).z, id: r } : project(r[0], r[1]));
  const legs = {};
  for (const [name, L] of Object.entries(l.legs)) {
    for (const r of L.route) if (typeof r === 'string' && !nodes.get(r)) throw new Error(`Unknown node ${r} in ${l.name} ${name}`);
    const pts = L.route.map(pt), arc = arcTable(pts), len = arc[arc.length - 1];
    const arcOf = (id) => { const k = L.route.indexOf(id); return k < 0 ? undefined : arc[k]; };
    const keys = Object.entries(L.shift || {}).map(([k, v]) => ({ a: luasKeyArc(k, arcOf), v })).filter((k) => k.a !== undefined).sort((p, q) => p.a - q.a);
    const shiftAt = (a) => {
      if (!keys.length) return 0;
      if (a <= keys[0].a) return keys[0].v;
      for (let k = 1; k < keys.length; k++) if (a <= keys[k].a) { const p = keys[k - 1], q = keys[k]; return p.v + (q.v - p.v) * ((a - p.a) / (q.a - p.a || 1)); }
      return keys[keys.length - 1].v;
    };
    // a point of the centreline at arc a (on the unshifted polyline)
    const at = (a) => {
      let i = 1; while (i < arc.length - 1 && arc[i] < a) i++;
      const t = Math.max(0, Math.min(1, (a - arc[i - 1]) / (arc[i] - arc[i - 1] || 1)));
      return v2.lerp(pts[i - 1], pts[i], t);
    };
    const nearestArc = (p) => {
      let best = { d: Infinity, a: 0 };
      for (let i = 1; i < pts.length; i++) {
        const c = closestOnSegment(p, pts[i - 1], pts[i]);
        if (c.d2 < best.d) best = { d: c.d2, a: arc[i - 1] + c.t * (arc[i] - arc[i - 1]) };
      }
      return best.a;
    };
    const stops = (L.stops || []).map((s) => {
      const a = typeof s.at === 'string' ? arcOf(s.at) : typeof s.at[0] === 'string' ? arcOf(s.at[0]) + s.at[1] : nearestArc(project(s.at[0], s.at[1]));
      return { ...s, leg: name, a, ...at(a) };
    });
    // stretches off the street grid (between two [lat, lon] points): the tracks run on a reservation of their own
    const open = L.route.slice(1).map((r, i) => typeof r !== 'string' && typeof L.route[i] !== 'string');
    legs[name] = { name, single: !!L.single, pts, arc, len, shiftAt, keys, stops, open };
  }

  const runs = new Map();
  const runOf = (names) => {
    const key = names.join(',');
    if (runs.has(key)) return runs.get(key);
    // raw polyline (the legs' vertices, with their arc along the run) and the run's shift keyframes: each leg's
    // shift (mirrored when run backwards) plus the keep-left track offset
    const raw = [], ranges = [], keys = [];
    let base = 0;
    for (const nm of names) {
      const rev = nm[0] === '-', leg = legs[rev ? nm.slice(1) : nm];
      if (!leg) throw new Error(`${l.name}: no leg ${nm}`);
      if (rev && leg.single) throw new Error(`${l.name}: single-track leg ${nm} run backwards`);
      const T = leg.single ? 0 : LUAS_TRACK;
      const order = rev ? leg.pts.map((_, i) => leg.pts.length - 1 - i) : leg.pts.map((_, i) => i);
      for (const i of order) {
        const p = leg.pts[i], ra = base + (rev ? leg.len - leg.arc[i] : leg.arc[i]);
        const last = raw[raw.length - 1];
        if (last && Math.hypot(last.x - p.x, last.z - p.z) < 0.05) continue;
        raw.push({ x: p.x, z: p.z, ra });
      }
      for (const a of [0, ...leg.keys.map((k) => k.a).filter((a) => a > 0 && a < leg.len), leg.len]) {
        const v = leg.shiftAt(a);
        keys.push({ ra: base + (rev ? leg.len - a : a), v: (rev ? -v : v) + T });
      }
      ranges.push({ leg, rev, r0: base, r1: base + leg.len });
      base += leg.len;
    }
    keys.sort((p, q) => p.ra - q.ra);
    for (let k = keys.length - 1; k > 0; k--) if (keys[k].ra - keys[k - 1].ra < 0.01) { keys[k - 1].v = (keys[k - 1].v + keys[k].v) / 2; keys.splice(k, 1); }
    let kk = 1;
    const shAt = (ra) => { // ra rises monotonically below, so walk the keys
      while (kk < keys.length - 1 && keys[kk].ra < ra) kk++;
      while (kk > 1 && keys[kk - 1].ra > ra) kk--;
      const p = keys[kk - 1], q = keys[kk];
      return p.v + (q.v - p.v) * Math.max(0, Math.min(1, (ra - p.ra) / (q.ra - p.ra || 1)));
    };
    // fillet the corners, resample at 1 m, then offset every point sideways by its shift
    const f = resampleAttr(filletPath(raw, LUAS_FILLET), 1);
    const pts = f.map((p, i) => {
      const a = f[Math.max(0, i - 1)], b = f[Math.min(f.length - 1, i + 1)], d = v2.norm(v2.sub(b, a)), sh = shAt(p.ra);
      return { x: p.x + d.z * sh, z: p.z - d.x * sh, ra: p.ra };
    });
    // flag the points on off-street stretches
    for (const g of ranges) {
      const { leg } = g;
      if (!leg.open.some(Boolean)) continue;
      let k = 1;
      for (const p of pts) {
        if (p.ra < g.r0 || p.ra > g.r1) continue;
        const a = g.rev ? g.r1 - p.ra : p.ra - g.r0;
        k = 1; while (k < leg.arc.length - 1 && leg.arc[k] < a) k++;
        if (!leg.open[k - 1]) continue;
        const r = nearestRoad(p.x, p.z); // not where the line crosses a road
        if (!r || r.edgeDist > r.way.pave + 6.5) p.open = true;
      }
    }
    const table = arcTable(pts);
    // stops on this run: the nearest point to the stop (on the stretch of its own leg)
    const stops = [];
    for (const g of ranges) for (const st of g.leg.stops) {
      const ra = g.rev ? g.r1 - st.a : g.r0 + st.a;
      let best = null;
      for (let i = 0; i < pts.length; i++) {
        if (Math.abs(pts[i].ra - ra) > 40) continue;
        const d = (pts[i].x - st.x) ** 2 + (pts[i].z - st.z) ** 2;
        if (!best || d < best.d) best = { d, s: table[i] };
      }
      if (best) stops.push({ stop: st, s: best.s, rev: g.rev });
    }
    stops.sort((p, q) => p.s - q.s);
    const run = { key, names, pts, table, total: table[table.length - 1], ranges, stops };
    runs.set(key, run);
    return run;
  };
  const services = l.services.map((s) => ({ name: s.name, trams: s.trams, runs: s.runs.map(runOf) }));

  // the rendered tracks: every run's polyline, less the stretches another run already laid, clipped to the map
  const CELL = 1, hash = new Map(), hk = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  const laid = (p) => {
    const i = Math.floor(p.x / CELL), j = Math.floor(p.z / CELL);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const q of hash.get(`${i + di},${j + dj}`) || []) if ((q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 0.3 * 0.3) return true;
    return false;
  };
  const inside = (p) => p.x > bounds.minX - 1 && p.x < bounds.maxX + 1 && p.z > bounds.minZ - 1 && p.z < bounds.maxZ + 1;
  const tracks = [];
  for (const run of runs.values()) {
    let cur = [];
    const flush = () => { if (cur.length > 1) tracks.push(simplifyTrack(cur, 0.03)); cur = []; };
    const fresh = run.pts.map((p) => inside(p) && !laid(p));
    // a piece keeps one shared point at each end, so pieces join up
    run.pts.forEach((p, i) => { if (fresh[i] || fresh[i - 1] || fresh[i + 1]) cur.push(p); else flush(); });
    flush();
    for (const p of run.pts) { const k = hk(p.x, p.z); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(p); }
  }
  return { name: l.name, color: l.color, legs, runs: [...runs.values()], services, tracks };
}
// Douglas-Peucker for a rendered track (1 m samples are only needed on the curves); keeps both ends of every
// off-street stretch
function simplifyTrack(pts, tol) {
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  for (let i = 1; i < pts.length; i++) if (!pts[i].open !== !pts[i - 1].open) keep[i] = keep[i - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let best = -1, bd = tol;
    for (let k = i + 1; k < j; k++) { const c = closestOnSegment(pts[k], pts[i], pts[j]), d = Math.sqrt(c.d2); if (d > bd) { bd = d; best = k; } }
    if (best >= 0) { keep[best] = 1; stack.push([i, best], [best, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// resample a polyline of {x, z, ra} at a step, interpolating the attributes
function resampleAttr(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < 1e-6) continue;
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) { const t = k / n; out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, ra: a.ra + (b.ra - a.ra) * t }); }
  }
  return out;
}

// Intersection of segments ab and cd: the parameter t along ab, or null.
function segIntersect(a, b, c, d) {
  const r = { x: b.x - a.x, z: b.z - a.z }, q = { x: d.x - c.x, z: d.z - c.z };
  const den = r.x * q.z - r.z * q.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * q.z - (c.z - a.z) * q.x) / den, u = ((c.x - a.x) * r.z - (c.z - a.z) * r.x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

function extendToEdges(pts, bounds) {
  const first = pts[0], last = pts[pts.length - 1];
  pts.unshift({ x: bounds.minX - 5, z: first.z });
  pts.push({ x: bounds.maxX + 5, z: last.z });
}

// Width of road polygon edges inset for a polygon built from road node ids:
// each edge follows some way; inset by that way's half width + pavement.
export function roadInsetFor(world, ids) {
  return ids.map((id, i) => {
    const a = id, b = ids[(i + 1) % ids.length];
    const way = world.ways.find((w) => {
      const k = w.nodeIds.indexOf(a), k2 = w.nodeIds.indexOf(b);
      return k >= 0 && k2 >= 0 && Math.abs(k - k2) === 1;
    });
    return (way ? way.width / 2 + way.pave : 5 + PAVEMENT);
  });
}

export const world = build();
export const rawData = data;

// Kerbside parking on wide streets without bus lanes or the Luas.
const NO_PARKING = /Dame|College|Westmoreland|D'Olier|Nassau|Abbey|Beresford|Memorial|Amiens|Tara|O'Connell|Pearse|Mayor/;
export function hasParking(way) {
  return way.width >= 12 && !['boulevard', 'quay', 'bridge', 'lane'].includes(way.type) && !NO_PARKING.test(way.name);
}
// Distance of the running lane's centre from the road centreline (traffic keeps left of it).
export function laneOffset(way) {
  if (way.laneOff) return way.laneOff;
  if (way.type === 'boulevard') return 7;
  if (hasParking(way)) return 2.6;
  return Math.min(way.width / 4, 3);
}
