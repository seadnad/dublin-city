// St Stephen's Green interior layout: OSM (ODbL, data/osm/stephens-green-audit.json and stephens-green-water-audit.json,
// pulled 2026-09-30) -> src/data/stephens-green.json, for src/world/greenpark.js.
//
// The game's Green keeps its own corners (a rectangle turned ~10°, a little larger than the real park at half scale),
// so the real layout is stored in park coordinates, not lat/lon: every point is (u, v) inside the real railing quad
// (u 0 -> 1 west to east along the north side, v 0 -> 1 north to south), found by inverting the bilinear map of that
// quad. At runtime greenpark.js maps (u, v) onto the game's railing polygon with a Coons patch, so the perimeter walk
// follows the game's railings and the lake, the circle and the gates keep their place and their share of the park.
// Real sizes (radii, widths) are kept in real metres; the runtime scales them by the local size of the map.
//
// Usage: node tools/green-layout.mjs   (rewrites src/data/stephens-green.json)
import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('data/osm/stephens-green-audit.json', 'utf8'));
const water = JSON.parse(fs.readFileSync('data/osm/stephens-green-water-audit.json', 'utf8'));
const LAT0 = 53.338, LON0 = -6.259, ML = 111320, MO = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const P = (lat, lon) => [(lon - LON0) * MO, -(lat - LAT0) * ML]; // local metres, x east, z south
const G = (g) => g.map((q) => P(q.lat, q.lon));

// road-centre corners of the Green (OSM junction nodes): NW Grafton St, NE Merrion Row, SE Leeson St, SW Harcourt St
const ROAD = [[53.33990, -6.26066], [53.33859, -6.25529], [53.33614, -6.25726], [53.33754, -6.26270]].map(([a, b]) => P(a, b));
const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < a[0] + ((p[1] - a[1]) / (b[1] - a[1])) * (b[0] - a[0])) c = !c; } return c; };
// inset a convex quad (clockwise in x-east / z-south) by t metres
function insetQuad(q, t) {
  const lines = q.map((a, i) => { const b = q[(i + 1) % 4], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), n = [-dz / L, dx / L]; return { a: [a[0] + n[0] * t, a[1] + n[1] * t], d: [dx / L, dz / L] }; });
  return lines.map((l, i) => { const m = lines[(i + 3) % 4]; // intersect previous line with this one
    const den = m.d[0] * l.d[1] - m.d[1] * l.d[0], s = ((l.a[0] - m.a[0]) * l.d[1] - (l.a[1] - m.a[1]) * l.d[0]) / den; return [m.a[0] + m.d[0] * s, m.a[1] + m.d[1] * s]; });
}
const segDist = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t); };
// the railing line: the gates stand in it, so inset the road quad by their mean distance from the road centre lines
const gates = d.elements.filter((e) => e.type === 'node' && e.tags && e.tags.barrier === 'gate').map((e) => ({ p: P(e.lat, e.lon), id: e.id }))
  .filter((g) => inPoly(g.p, ROAD));
const gd = gates.map((g) => Math.min(...ROAD.map((a, i) => segDist(g.p, a, ROAD[(i + 1) % 4])))).filter((x) => x < 25);
const RAIL_INSET = gd.reduce((s, x) => s + x, 0) / gd.length;
const Q = insetQuad(ROAD, RAIL_INSET);
// clockwise check: x east / z south, NW -> NE -> SE -> SW is clockwise on screen; insetQuad's normal points inwards
if (!inPoly([(Q[0][0] + Q[2][0]) / 2, (Q[0][1] + Q[2][1]) / 2], Q) || Math.abs(Q[0][0] - ROAD[0][0]) > 40) throw new Error('inset went the wrong way');

// inverse bilinear by Newton: P = (1-u)(1-v)A + u(1-v)B + uvC + (1-u)vD
function toUV([x, z]) {
  const [A, B, C, D] = Q;
  let u = 0.5, v = 0.5;
  for (let k = 0; k < 30; k++) {
    const px = (1 - u) * (1 - v) * A[0] + u * (1 - v) * B[0] + u * v * C[0] + (1 - u) * v * D[0] - x;
    const pz = (1 - u) * (1 - v) * A[1] + u * (1 - v) * B[1] + u * v * C[1] + (1 - u) * v * D[1] - z;
    const xu = (1 - v) * (B[0] - A[0]) + v * (C[0] - D[0]), zu = (1 - v) * (B[1] - A[1]) + v * (C[1] - D[1]);
    const xv = (1 - u) * (D[0] - A[0]) + u * (C[0] - B[0]), zv = (1 - u) * (D[1] - A[1]) + u * (C[1] - B[1]);
    const det = xu * zv - xv * zu;
    u -= (px * zv - pz * xv) / det; v -= (xu * pz - zu * px) / det;
  }
  return [+u.toFixed(4), +v.toFixed(4)];
}
// Douglas-Peucker (metres)
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let idx = 0, md = 0;
  for (let i = 1; i < pts.length - 1; i++) { const dd = segDist(pts[i], pts[0], pts[pts.length - 1]); if (dd > md) { md = dd; idx = i; } }
  if (md <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}
// closed rings (first point = last) are split in two so the ends don't collapse onto each other
const closed = (pts) => pts.length > 3 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 0.01;
const simplifyAny = (pts, tol) => {
  if (!closed(pts)) return simplify(pts, tol);
  const h = pts.length >> 1;
  return [...simplify(pts.slice(0, h + 1), tol).slice(0, -1), ...simplify(pts.slice(h), tol)];
};
const uvs = (pts, tol = 0.7) => simplifyAny(pts, tol).map(toUV);
const inner = insetQuad(Q, 1.5); // inside the railings
const inside = (p) => inPoly(p, inner);
const frac = (pts) => pts.filter(inside).length / pts.length;
const centroid = (pts) => { const q = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts.slice(0, -1) : pts; return [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length]; };
const radius = (pts, c) => { const q = pts.slice(0, -1); return +(q.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / q.length).toFixed(2); };
// oriented box of a closed outline: principal axis by the longest edge direction
function obox(pts) {
  const c = centroid(pts); let best = 0, ang = 0;
  for (let i = 0; i + 1 < pts.length; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (L > best) { best = L; ang = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); } }
  const ux = Math.cos(ang), uz = Math.sin(ang); let w = 0, dd = 0;
  for (const p of pts) { const dx = p[0] - c[0], dz = p[1] - c[1]; w = Math.max(w, Math.abs(dx * ux + dz * uz)); dd = Math.max(dd, Math.abs(-dx * uz + dz * ux)); }
  return { c: toUV(c), axis: toUV([c[0] + ux * 5, c[1] + uz * 5]), w: +(2 * w).toFixed(1), d: +(2 * dd).toFixed(1) };
}

const out = {
  about: "St Stephen's Green interior from OpenStreetMap (ODbL, (c) OpenStreetMap contributors), pulled 2026-09-30 (data/osm/stephens-green-*.json). Points are [u, v] in the real railing quad (u west->east, v north->south); sizes are real metres. Built by tools/green-layout.mjs.",
  railInset: +RAIL_INSET.toFixed(1),
  quadSides: Q.map((a, i) => +Math.hypot(Q[(i + 1) % 4][0] - a[0], Q[(i + 1) % 4][1] - a[1]).toFixed(1)), // N, E, S, W in real metres
  paths: [], areas: [], steps: [], lake: { outer: [], islands: [] }, bridge: null,
  fountains: [], bandstand: null, shelters: [], lodge: null, gates: [], monuments: {}, trees: [], benches: [], lamps: [], bins: [], hedges: [],
};
for (const e of d.elements) {
  if (e.type !== 'way' || !e.geometry) continue;
  const t = e.tags || {}, pts = G(e.geometry);
  if (t.highway && /footway|pedestrian|steps/.test(t.highway) && frac(pts) >= 0.7) {
    if (t.bridge) continue; // the O'Connell Bridge deck is modelled on its own
    const w = t.width ? Math.min(+t.width, 6) : t.highway === 'pedestrian' ? 5 : t.highway === 'steps' ? 3 : 2.6;
    const s = /sett|paving/.test(t.surface || '') ? 'sett' : 'asphalt';
    if (t.area === 'yes') out.areas.push({ s, uv: uvs(pts, 0.4) });
    else if (t.highway === 'steps') out.steps.push({ w, uv: uvs(pts) });
    else out.paths.push({ w, s, ...(t.highway === 'pedestrian' ? { main: 1 } : {}), uv: uvs(pts) });
  } else if (t.amenity === 'fountain' && frac(pts) > 0.5) {
    const c = centroid(pts); out.fountains.push({ c: toUV(c), r: radius(pts, c), ...(t.name ? { name: t.name } : {}) });
  } else if (t.leisure === 'bandstand') {
    const c = centroid(pts); out.bandstand = { c: toUV(c), r: radius(pts, c) };
  } else if (t.amenity === 'shelter' && frac(pts) > 0.5) {
    out.shelters.push({ ...obox(pts), kind: t.shelter_type === 'gazebo' ? 'gazebo' : 'small' });
  } else if (t.building === 'house' && frac(pts) > 0.5) {
    out.lodge = { ...obox(pts), outline: uvs(pts, 0.3) };
  } else if (t.barrier === 'hedge' && frac(pts) > 0.7) {
    out.hedges.push({ closed: t.area === 'yes' || (e.geometry[0].lat === e.geometry.at(-1).lat && e.geometry[0].lon === e.geometry.at(-1).lon) ? 1 : 0, uv: uvs(pts, 0.6) });
  }
}
// the lake: join the outer ways into one ring
for (const rel of water.elements.filter((e) => e.type === 'relation')) {
  const outers = rel.members.filter((m) => m.role === 'outer').map((m) => G(m.geometry));
  const ring = outers.shift();
  while (outers.length) {
    const end = ring.at(-1);
    let k = outers.findIndex((o) => Math.hypot(o[0][0] - end[0], o[0][1] - end[1]) < 0.5);
    if (k >= 0) { ring.push(...outers.splice(k, 1)[0].slice(1)); continue; }
    k = outers.findIndex((o) => Math.hypot(o.at(-1)[0] - end[0], o.at(-1)[1] - end[1]) < 0.5);
    if (k < 0) throw new Error('lake ring does not close');
    ring.push(...outers.splice(k, 1)[0].reverse().slice(1));
  }
  out.lake.outer = uvs(ring, 0.6);
  for (const m of rel.members.filter((mm) => mm.role === 'inner')) out.lake.islands.push(uvs(G(m.geometry), 0.5));
  let x0 = Infinity, x1 = -Infinity; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
  let area = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  out.lake.realArea = Math.round(Math.abs(area) / 2); out.lake.realSpanEW = Math.round(x1 - x0);
}
for (const e of water.elements) if (e.type === 'way' && e.tags && e.tags.bridge) out.bridge = G(e.geometry).map(toUV);
const MON = { 'The Three Fates': 'threeFates', 'Wolfe Tone': 'wolfeTone', Famine: 'famine', 'Lord Ardilaun': 'ardilaun', 'W.B. Yeats': 'yeats', Mangan: 'mangan',
  'Constance Markievicz': 'markievicz', 'Thomas M. Kettle': 'kettle', 'Robert Emmet': 'emmet', "O'Donovan Rossa": 'rossa', 'James Joyce': 'joyce' };
const SPECIES = { Tilia: 'lime', Tillia: 'lime', Platanus: 'plane', Aesculus: 'chestnut', Betula: 'birch', Prunus: 'young', Pyrus: 'young', Ilex: 'holly' };
for (const e of d.elements) {
  if (e.type !== 'node' || !e.tags) continue;
  const p = P(e.lat, e.lon), t = e.tags;
  if (t.barrier === 'gate' && inPoly(p, insetQuad(Q, -6)) && !inPoly(p, insetQuad(Q, 5))) out.gates.push(toUV(p));
  if (!inside(p)) continue;
  if (t.name && MON[t.name]) out.monuments[MON[t.name]] = toUV(p);
  else if (t.natural === 'tree') out.trees.push([...toUV(p), SPECIES[t.genus] || (t.leaf_cycle === 'evergreen' ? 'holly' : '')]);
  else if (t.amenity === 'bench') out.benches.push(toUV(p));
  else if (t.highway === 'street_lamp') out.lamps.push(toUV(p));
  else if (t.amenity === 'waste_basket') out.bins.push(toUV(p));
}
// a gate is often mapped as two nodes (both leaves): merge those closer than 4 m
{
  const merged = [];
  for (const g of out.gates) if (!merged.some((m) => Math.hypot((m[0] - g[0]) * out.quadSides[0], (m[1] - g[1]) * out.quadSides[1]) < 4)) merged.push(g);
  out.gates = merged;
}
const json = JSON.stringify(out).replace(/\],\[/g, '],[').replace(/"(paths|areas|steps|lake|fountains|bandstand|shelters|lodge|gates|monuments|trees|benches|lamps|bins|hedges|bridge)":/g, '\n"$1":');
fs.writeFileSync('src/data/stephens-green.json', json + '\n');
console.log(`rail inset ${RAIL_INSET.toFixed(1)} m; sides ${out.quadSides.join(' / ')} m; ${out.paths.length} paths, ${out.areas.length} areas, ${out.steps.length} steps, lake ${out.lake.outer.length} pts + ${out.lake.islands.length} islands (${out.lake.realArea} m², ${out.lake.realSpanEW} m E-W), ${out.fountains.length} fountains, ${out.shelters.length} shelters, ${out.gates.length} gates, ${Object.keys(out.monuments).length} monuments, ${out.trees.length} trees, ${out.benches.length} benches, ${out.lamps.length} lamps, ${out.hedges.length} hedges; ${fs.statSync('src/data/stephens-green.json').size} bytes`);
