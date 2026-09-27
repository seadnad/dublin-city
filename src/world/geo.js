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

export function project(lat, lon) {
  return { x: (lon - LON0) * M_PER_LON * SCALE, z: -(lat - LAT0) * M_PER_LAT * SCALE };
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
    const r = s.way.width / 2 + PAVEMENT + 2;
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
  const northBank = offsetPolyline(north, quayHalf);
  const southBank = offsetPolyline(south, -quayHalf);
  northBank[0].x = southBank[0].x = bounds.minX; northBank[northBank.length - 1].x = southBank[southBank.length - 1].x = bounds.maxX;
  const riverPoly = [...northBank, ...southBank.slice().reverse()];

  const polyOf = (ids) => ids.map((id) => ({ x: nodes.get(id).x, z: nodes.get(id).z, id }));
  const parks = Object.entries(data.parks).map(([name, ids]) => ({ name, poly: polyOf(ids), ids }));
  const campus = Object.entries(data.campus).map(([name, ids]) => ({ name, poly: polyOf(ids), ids }));

  const luasPts = data.luas.route.map((id) => ({ x: nodes.get(id).x, z: nodes.get(id).z, id }));
  const luas = { name: data.luas.name, pts: luasPts, stops: data.luas.stops };

  return { nodes, ways, edges, bounds, segs, segsNear, nearestRoad, northBank, southBank, riverPoly, parks, campus, luas };
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
    return (way ? way.width / 2 : 5) + PAVEMENT;
  });
}

export const world = build();
export const rawData = data;
