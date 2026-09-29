// O'Connell Street layout (docs/research/monuments.md sections 1 and 4, P0): distances along the street (chainage from
// the quay junction NQ8 north to Parnell Street, OC4), the raised islands down the middle, and where each monument
// stands. Everything here is in game metres; roads are real width, distances along the street are half scale.
import { world, v2, project } from './geo.js';

const way = world.ways.find((w) => w.type === 'boulevard');
const pts = way.pts;
const cum = [0];
for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + v2.len(v2.sub(pts[i], pts[i - 1])));
export const LENGTH = cum[cum.length - 1];
const chainOfNode = (id) => cum[way.nodeIds.indexOf(id)];

// point and northward direction at chainage s (plus `off` metres to the left of northward travel, i.e. west)
export function along(s, off = 0) {
  s = Math.max(0, Math.min(LENGTH, s));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i], t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
  const dir = v2.norm(v2.sub(b, a)), left = { x: dir.z, z: -dir.x };
  return { x: a.x + (b.x - a.x) * t + left.x * off, z: a.z + (b.z - a.z) * t + left.z * off, dir, left };
}
// chainage of the nearest point on the street's centreline
export function chainageOf(p) {
  let best = { d: Infinity, s: 0 };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], ab = v2.sub(pts[i], a), L = cum[i] - cum[i - 1];
    const t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), ab) / (L * L)));
    const q = v2.add(a, v2.scale(ab, t)), d = v2.len(v2.sub(p, q));
    if (d < best.d) best = { d, s: cum[i - 1] + t * L };
  }
  return best.s;
}
const osm = (lat, lon) => chainageOf(project(lat, lon));

const OC1 = chainOfNode('OC1'), OC2 = chainOfNode('OC2'), OC4 = chainOfNode('OC4');
// The quay line NQ8 was nudged ~13 m north of the real quay to keep the Liffey readable, so the O'Connell Monument is
// placed relative to the junction (quay half width + crossing + half its base + 1 m), not at its lat/lon (open question 1).
export const CHAIN = {
  oconnell: 13,
  smithOBrien: osm(53.348245, -6.259582),           // OSM node 6279642664
  gray: Math.min(osm(53.348526, -6.259703), OC1 - 9.6), // OSM 1348371039, 2.6 m south so his base clears Abbey Street
  larkin: osm(53.349091, -6.259945),                // OSM 603833916, outside Clerys, facing the GPO side
  spire: OC2,
  fatherMathew: osm(53.350010, -6.260338),          // OSM 13254558101: his 2018 site just north of the Spire
  parnell: OC4 - 10,                                // the real island is in the junction; here at its south mouth
};

// Raised paved islands down the middle: [from, to, half width at from, half width at to]. Real widths: 9.2 m at the
// monument narrowing to 8.1 m at the island's north end, 7.5-7.8 m through O'Connell Street Lower, 3-5 m north of
// Cathal Brugha Street where the Luas runs alongside (OSM ways 41640630, 41640635). Crossings between them.
export const ISLANDS = [
  { from: 8, to: 31.5, w0: 4.6, w1: 4.05, name: "O'Connell Monument island" },
  { from: 34.5, to: OC1 - 7, w0: 3.85, w1: 3.85, name: 'Gray' },
  { from: OC1 + 7, to: OC4 - 15.5, w0: 3.85, w1: 2.1, taper: [140, 152], name: 'main median' },
  { from: OC4 - 14.5, to: OC4 - 5.5, w0: 3.5, w1: 3.5, name: 'Parnell island', cobbles: true },
];
export function halfWidth(isl, s) {
  if (isl.taper) {
    const [a, b] = isl.taper, t = Math.max(0, Math.min(1, (s - a) / (b - a)));
    return isl.w0 + (isl.w1 - isl.w0) * t * t * (3 - 2 * t);
  }
  const t = (s - isl.from) / (isl.to - isl.from);
  return isl.w0 + (isl.w1 - isl.w0) * t;
}
// outline polygon of an island (the ends are chamfered so the kerbs read as rounded noses)
export function islandOutline(isl, step = 2) {
  const L = [], R = [], n = Math.max(2, Math.ceil((isl.to - isl.from) / step));
  for (let k = 0; k <= n; k++) {
    const s = isl.from + ((isl.to - isl.from) * k) / n;
    let w = halfWidth(isl, s);
    const end = Math.min(s - isl.from, isl.to - s);
    if (end < 0.9) w -= 0.9 - end; // chamfer
    L.push(along(s, w)); R.push(along(s, -w));
  }
  return [...L, ...R.reverse()];
}
export const islandAt = (s) => ISLANDS.find((i) => s >= i.from && s <= i.to);

// sites for the monuments (local +z faces south, towards O'Connell Bridge); w x d are their base footprints
function siteAt(s, w, d, name) {
  const p = along(s);
  return { name, x: p.x, z: p.z, rot: Math.atan2(-p.dir.x, -p.dir.z), w, d, chain: s };
}
export const monumentSites = {
  oconnellMonument: siteAt(CHAIN.oconnell, 7.3, 7.3, "O'Connell Monument"),
  smithOBrien: siteAt(CHAIN.smithOBrien, 3.2, 3.2, "William Smith O'Brien"),
  gray: siteAt(CHAIN.gray, 3.8, 3.8, 'Sir John Gray'),
  larkin: siteAt(CHAIN.larkin, 1.8, 1.8, 'Jim Larkin'),
  fatherMathew: siteAt(CHAIN.fatherMathew, 3.5, 3.5, 'Father Mathew'),
  parnell: siteAt(CHAIN.parnell, 7, 9, 'Parnell Monument'),
};
