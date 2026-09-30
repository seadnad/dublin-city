// St Stephen's Green: the real park layout (src/data/stephens-green.json, from OSM by tools/green-layout.mjs) fitted
// into the game's railing polygon. The game keeps its own corners (docs/research/stephens-green-interior.md, "The fit"),
// so the layout is stored in park coordinates (u west->east, v north->south inside the real railing quad) and mapped
// here onto the game's railings with a Coons patch: the four sides are the game's railing polylines, so the perimeter
// walk runs along the game's railings and everything inside keeps its share of the park.
// Used by ground.js (the lake's hole in the lawn, the gate gaps in the railings) and greenpark.js (everything else).
import { world, v2, insetPolygon, roadInsetFor } from './geo.js';
import L from '../data/stephens-green.json';

export const GREEN_NAME = "St Stephen's Green";
export const layout = L;

// the railing polygon, as ground.js builds it (the park outline inset to the road edges)
function railingPoly() {
  const pk = world.parks.find((p) => p.name === GREEN_NAME);
  return pk ? { poly: insetPolygon(pk.poly, roadInsetFor(world, pk.ids)), ids: pk.ids } : null;
}

// a polyline through pts, by normalised arc length
function curve(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + v2.len(v2.sub(pts[i], pts[i - 1])));
  const T = cum[cum.length - 1];
  return (t) => {
    const s = Math.min(Math.max(t, 0), 1) * T;
    let i = 1; while (i < pts.length - 1 && cum[i] < s) i++;
    const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return v2.lerp(pts[i - 1], pts[i], f);
  };
}

let cached;
export function greenMap() {
  if (cached !== undefined) return cached;
  const r = railingPoly();
  if (!r) return (cached = null);
  const { poly, ids } = r;
  const at = (id) => ids.indexOf(id);
  const iNW = at('SGNW'), iNE = at('SGNE'), iSE = at('SGSE'), iSW = at('SGSW');
  if ([iNW, iNE, iSE, iSW].some((i) => i < 0)) return (cached = null);
  const run = (a, b) => { const out = []; for (let i = a; ; i = (i + 1) % poly.length) { out.push(poly[i]); if (i === b) break; } return out; };
  const N = curve(run(iNW, iNE)), E = curve(run(iNE, iSE)), S = curve(run(iSW, iSE).length > 1 ? run(iSE, iSW).reverse() : []), W = curve(run(iSW, iNW).reverse());
  const P00 = poly[iNW], P10 = poly[iNE], P11 = poly[iSE], P01 = poly[iSW];
  // Coons patch: the boundary curves blended in, less the bilinear corner term
  const at2 = (u, v) => {
    const n = N(u), s = S(u), w = W(v), e = E(v);
    return {
      x: (1 - v) * n.x + v * s.x + (1 - u) * w.x + u * e.x - ((1 - u) * (1 - v) * P00.x + u * (1 - v) * P10.x + u * v * P11.x + (1 - u) * v * P01.x),
      z: (1 - v) * n.z + v * s.z + (1 - u) * w.z + u * e.z - ((1 - u) * (1 - v) * P00.z + u * (1 - v) * P10.z + u * v * P11.z + (1 - u) * v * P01.z),
    };
  };
  const [sN, sE, sS, sW] = L.quadSides; // real railing quad sides, metres
  // game metres per real metre: overall (areas), and along u and v (for oriented sizes)
  let area = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += (poly[j].x + poly[i].x) * (poly[j].z - poly[i].z);
  const realArea = ((sN + sS) / 2) * ((sE + sW) / 2) * 0.93; // the real quad is a skewed square (~22° off)
  const k = Math.sqrt(Math.abs(area) / 2 / realArea);
  cached = {
    poly, k,
    at: ([u, v]) => at2(u, v),
    // heading (radians, three.js rot.y convention: facing along (sin, cos)) of the direction from uv a towards uv b
    heading: (a, b) => { const p = at2(a[0], a[1]), q = at2(b[0], b[1]); return Math.atan2(q.x - p.x, q.z - p.z); },
    ku: v2.len(v2.sub(P10, P00)) / sN, kv: v2.len(v2.sub(P01, P00)) / sW,
  };
  return cached;
}

// the lake outline and its islands in game coordinates
export function lakeOutline() {
  const g = greenMap();
  if (!g) return null;
  return { outer: L.lake.outer.map(g.at), islands: L.lake.islands.map((isl) => isl.map(g.at)) };
}

// the pedestrian gates in the railings: game position, the railing direction there, and the opening's half width
export function greenGates() {
  const g = greenMap();
  if (!g) return [];
  const nwArch = g.poly[0];
  const out = [];
  for (const uv of L.gates) {
    const p = g.at(uv);
    // snap onto the nearest railing edge
    let best = null, bd = Infinity;
    for (let i = 0; i < g.poly.length; i++) {
      const a = g.poly[i], b = g.poly[(i + 1) % g.poly.length], d = v2.sub(b, a), Ln = v2.len(d);
      const t = Math.max(0.02, Math.min(0.98, v2.dot(v2.sub(p, a), d) / (Ln * Ln)));
      const q = v2.lerp(a, b, t), dd = v2.len(v2.sub(q, p));
      if (dd < bd) { bd = dd; best = { x: q.x, z: q.z, dir: v2.norm(d), edge: i }; }
    }
    if (!best || v2.len(v2.sub(best, nwArch)) < 22) continue; // the Fusiliers' Arch is the NW gate
    if (out.some((o) => v2.len(v2.sub(o, best)) < 12)) continue;
    out.push({ ...best, half: 1.9 });
  }
  return out;
}
