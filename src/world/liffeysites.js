// Where the Liffey's riverside landmarks go (docs/research/liffey-quays.md): Rowan Gillespie's Famine, the Jeanie
// Johnston, the CHQ building, the Liffey Boardwalk and the two footbridges (their landings are in ground.js
// footbridges). Positions along the river come from the OSM coordinates; across it they are taken from the game's
// own banks, because the game's quays sit ~15-20 m north of the real ones here (the river keeps its real width while
// the city is at half scale), so an absolute latitude would put the Famine figures in the water.
import { world, v2 } from './geo.js';
import { bridges, footbridges } from './ground.js';

// the point on a bank polyline at x, its tangent (west -> east) and the normal pointing out over the water
export function bankAt(bank, x) {
  const pts = bank === 'north' ? world.northBank : world.southBank;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x) || a.x === b.x) continue;
    const t = v2.norm(v2.sub(b, a)), p = v2.lerp(a, b, (x - a.x) / (b.x - a.x));
    const n = bank === 'north' ? { x: -t.z, z: t.x } : { x: t.z, z: -t.x };
    return { x: p.x, z: p.z, t, n };
  }
  return null;
}
// the centreline of the quay road (node chain) at x
function quayAt(ids, x) {
  for (let i = 0; i + 1 < ids.length; i++) {
    const A = world.nodes.get(ids[i]), B = world.nodes.get(ids[i + 1]);
    if (x >= Math.min(A.x, B.x) && x <= Math.max(A.x, B.x)) return v2.lerp(A, B, (x - A.x) / (B.x - A.x));
  }
  return null;
}

const fb = (name) => footbridges.find((f) => f.name === name);
const footSite = (f, extra) => ({ x: f.centre.x, z: f.centre.z, rot: Math.atan2(f.dir.x, f.dir.z), w: extra.w, d: f.length + 2, bridge: true, span: f.length, ...extra });

// ---------- the Famine (1997): six figures and the dog walking east along Custom House Quay towards the port ----------
// Real group: OSM way 666422768, lon -6.25014 to -6.24994 (game x 299-306), ~50 m real east of Talbot Memorial Bridge.
// The game's Talbot Memorial Bridge lands 70 m east of the real one (NQ12, x 320.6), so the group keeps its order
// (Talbot, the Famine, the O'Casey footbridge, the ship) and stands just east of it, on the riverside footpath (the quay
// road's kerb to the parapet is 3.5 m here), in a loose staggered line ~16 m long.
const FAMINE_X0 = 334;
export const FAMINE = (() => {
  const figs = [
    // [body, dx along the quay (east +), offset from the parapet (m), height] - the dog trails at the west end
    ['famine_dog', 0, 1.9, 1.78],
    ['famine_sack', 2.2, 2.3, 2.12],
    ['famine_shawl', 4.6, 1.5, 1.98],
    ['famine_bundle', 7.2, 2.4, 2.02],
    ['famine_shawl', 9.4, 1.4, 1.92],
    ['famine_carrier', 12.2, 2.2, 2.08],
    ['famine_bundle', 15.0, 1.6, 1.96],
  ].map(([body, dx, off, h], i) => {
    const b = bankAt('north', FAMINE_X0 + dx);
    return { body, x: b.x - b.n.x * off, z: b.z - b.n.z * off, rot: Math.atan2(b.t.x, b.t.z) + (i % 2 ? 0.06 : -0.05), height: h };
  });
  const b = bankAt('north', FAMINE_X0 + 7.5);
  return {
    figs, x0: FAMINE_X0 - 1.5, x1: FAMINE_X0 + 16.5,
    site: { x: b.x - b.n.x * 1.9, z: b.z - b.n.z * 1.9, rot: Math.atan2(-b.n.x, -b.n.z), w: 17, d: 2.6, labelY: 6 },
  };
})();

// ---------- the Jeanie Johnston (2002 replica of the 1847 barque), moored on Custom House Quay ----------
// OSM way 590878259: the hull from x 401.5 (the bow, pointing upriver) to 423.4, beside a floating pontoon on the quay
// wall, the gangway at the stern end. Modelled at 0.75 of real size (37.5 m on deck -> 28 m, beam 8 -> 6 m, 28 m air
// draft -> 21 m), like the rest of the city's heroes, which are between half and three-quarter scale.
export const SHIP_SCALE = 0.75;
export const SHIP = (() => {
  const L = 37.5 * SHIP_SCALE, B = 8 * SHIP_SCALE, cx = 410;
  const bk = bankAt('north', cx), pontoon = 3.2;
  const off = pontoon + 0.4 + B / 2;
  return {
    L, B, pontoon, bank: bk,
    x: bk.x + bk.n.x * off, z: bk.z + bk.n.z * off,
    rot: Math.atan2(-bk.t.x, -bk.t.z), // local +z runs from the stern to the bow (west)
    w: B, d: L,
  };
})();

// ---------- the CHQ building (Stack A, John Rennie 1820; EPIC in its vaults) ----------
// OSM way 581158887: x 360-392, from the quay north to George's Dock. The game's block between the quay and Mayor Street
// Lower is only ~40 m deep (the quays are further north than the real ones), so the building keeps its width on the
// quay and is shortened north-south.
export const CHQ = (() => {
  const q = quayAt(['NQ12', 'NQ13'], 376);
  const front = q.z - 5.5 - 3.5 - 0.8; // the quay road's north kerb, its footpath, a strip of paving
  const back = -151.5;                 // clear of Mayor Street Lower's footpath
  return { x: 376, z: (front + back) / 2, rot: 0, w: 30, d: front - back, front, back, h: 11 };
})();

// ---------- the footbridges ----------
export const MILLENNIUM = footSite(fb('Millennium Bridge'), { w: 4, labelY: 10 });
export const OCASEY = footSite(fb("Seán O'Casey Bridge"), { w: 4.6, labelY: 12 });

// ---------- the Liffey Boardwalk (2000, extended 2005) ----------
// Cantilevered off the north quay walls outside the granite parapet, from Grattan Bridge to Butt Bridge, broken at every
// bridge (OSM ways 43325905, 43325903, 43319604, 286891495, 286891496). Runs are [x0, x1] along the north bank.
export const BOARDWALK = (() => {
  const W = 3.6;
  const gaps = [];
  for (const br of [...bridges, ...footbridges]) {
    // where the bridge crosses the north bank, and how far either side the deck and its landing reach
    const p = br.p0.z < br.p1.z ? br.p0 : br.p1, half = (br.width || 4) / 2 + (br.halfGap ? 0.8 : 1.6);
    gaps.push([p.x - half, p.x + half]);
  }
  const grattan = bridges.find((b) => b.name === 'Grattan Bridge'), butt = bridges.find((b) => b.name === 'Butt Bridge');
  const x0 = Math.min(grattan.p0.x, grattan.p1.x) + grattan.width / 2 + 1.6, x1 = Math.max(butt.p0.x, butt.p1.x) - butt.width / 2 - 1.6;
  const runs = [];
  let s = x0;
  for (const [g0, g1] of gaps.filter(([a, b]) => b > x0 && a < x1).sort((a, b) => a[0] - b[0])) {
    if (g0 - s > 6) runs.push([s, g0]);
    s = Math.max(s, g1);
  }
  if (x1 - s > 6) runs.push([s, x1]);
  return { W, runs };
})();
