// College Green's islands and Suffolk Street (docs/research/monuments.md 1.2, docs/research/kildare-street.md):
// the layout only (positions, outlines, site boxes); src/world/kildare.js builds them. Game metres.
// The College Green carriageway CG0-CGT runs east from Dame Street to the Trinity junction; `cgAt(s, l)` is s metres
// along it from CG0 and l to its left (north). Its lanes run 5 m either side of the centreline (streets.json laneOff)
// so traffic passes both sides of the islands, as the real one-lane-north / two-lanes-south layout does.
import { world, v2 } from './geo.js';

const C0 = world.nodes.get('CG0'), C1 = world.nodes.get('CGT');
const d = v2.norm(v2.sub(C1, C0)), n = { x: d.z, z: -d.x };
export const CG = { x: C0.x, z: C0.z, d, n, len: v2.len(v2.sub(C1, C0)), rot: Math.atan2(d.z * -1, d.x) };
export const cgAt = (s, l = 0) => ({ x: C0.x + d.x * s + n.x * l, z: C0.z + d.z * s + n.z * l });
// heading that faces along the road towards Trinity (east): a figure faces (sin h, cos h)
export const CG_EAST = Math.atan2(d.x, d.z);

// island outlines: [s, half width] stations, lens-shaped (OSM ways 314630989 and 314630988, clipped to the road)
const lens = (s0, s1, w, tip = 0.6) => {
  const pts = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, s = s0 + (s1 - s0) * t;
    pts.push([s, Math.max(tip, w * Math.pow(Math.sin(Math.PI * t), 0.45))]);
  }
  return pts;
};
const outline = (stations, off = 0) => [...stations.map(([s, w]) => cgAt(s, off + w)), ...stations.slice().reverse().map(([s, w]) => cgAt(s, off - w))];
export const CG_DAVIS = { s0: 8.5, s1: 31.5, w: 3.2 };   // the Davis plaza
export const CG_GRATTAN = { s0: 33.2, s1: 45.5, w: 3.3 }; // Grattan's island at the east end
export const CG_ISLANDS = [
  { name: 'Davis memorial island', stations: lens(CG_DAVIS.s0, CG_DAVIS.s1, CG_DAVIS.w), poly: outline(lens(CG_DAVIS.s0, CG_DAVIS.s1, CG_DAVIS.w)) },
  { name: 'Grattan island', stations: lens(CG_GRATTAN.s0, CG_GRATTAN.s1, CG_GRATTAN.w), poly: outline(lens(CG_GRATTAN.s0, CG_GRATTAN.s1, CG_GRATTAN.w)) },
];
// where things stand (s, l): Davis at the plaza's west end facing east to Trinity, the Four Angels fountain east of
// him, Grattan facing east with his two sea-horse lamps on the east side (NIAH 50020253)
export const CG_SPOTS = {
  davis: [11.2, 0], fountain: [18.6, 0], grattan: [37.2, 0], lamps: [[41.6, 1.5], [41.6, -1.5]],
};
const boxAt = (s, l, w, len) => ({ ...cgAt(s, l), rot: -Math.atan2(d.z, d.x), w: len, d: w });

// Suffolk Street: Molly Malone in front of St Andrew's Church (the former tourist office), at the foot of its
// north-east tower by the Church Lane corner, side-on to the street, pushing her barrow west along the church front
const S1 = world.nodes.get('KDS1'), S2 = world.nodes.get('KDS2');
const sd = v2.norm(v2.sub(S1, S2)), sn = { x: -sd.z, z: sd.x }; // sd: east along Suffolk St; sn: south, towards the church
const sfAt = (a, b) => ({ x: S2.x + sd.x * a + sn.x * b, z: S2.z + sd.z * a + sn.z * b });
export const SUFFOLK = { at: sfAt, dir: sd, south: sn, rot: -Math.atan2(sd.z, sd.x) };

export const collegeGreenSites = {
  davisIsland: boxAt((CG_DAVIS.s0 + CG_DAVIS.s1) / 2, 0, CG_DAVIS.w * 2, CG_DAVIS.s1 - CG_DAVIS.s0),
  grattanIsland: boxAt((CG_GRATTAN.s0 + CG_GRATTAN.s1) / 2, 0, CG_GRATTAN.w * 2, CG_GRATTAN.s1 - CG_GRATTAN.s0),
  // Molly on her plinth (the barrow alongside her, parallel to the street) and the church behind her
  molly: { ...sfAt(3.3, 6.0), rot: SUFFOLK.rot, w: 3.6, d: 1.7, fig: sfAt(4.25, 6.0), face: Math.atan2(-sd.x, -sd.z) },
  stAndrews: { ...sfAt(-3, 17.25), rot: SUFFOLK.rot, w: 22, d: 17.5 },
  stAndrewsPlaza: { ...sfAt(-3, 6.55), rot: SUFFOLK.rot, w: 22, d: 3.9 },
};
