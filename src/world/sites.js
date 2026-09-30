// Landmark sites, anchored to street-graph nodes so they always sit correctly against the roads.
// Each site: position, rotation (local +z faces the street), footprint (w along street, d deep),
// a label height, and a teleport spot on a nearby road looking at it.
import { world, v2, PAVEMENT, pointInPolygon, laneOffset, project } from './geo.js';
import { bridges, parkPolys, campusPolys, dockPolys } from './ground.js';
import { monumentSites, along, chainageOf } from './oconnell.js';
import ncLayout from '../data/northcity.json';
const { clerys: CLERYS, parnell: PARNELL, busaras: BUSARAS } = ncLayout;
import { collegeGreenSites, cgAt, CG_SPOTS, CG_EAST } from './collegegreen.js';
import { KD_BOXES, KD_OPEN } from './kildarelayout.js';
import tanksData from '../data/guinness-tanks.json';
import bsLayout from '../data/barrowst.json';
import { spans as railSpans, at as railAt, footprints as railFootprints, pearseFront, fireTower } from './railline.js';
import { pubSites } from './pubsites.js';
import { gqSites } from './graftonsites.js';
import * as LQ from './liffeysites.js';
import { aras, zooSite } from './aras-zoo.js';

const N = (id) => world.nodes.get(id);
const wayBetween = (a, b) => world.ways.find((w) => {
  const i = w.nodeIds.indexOf(a), j = w.nodeIds.indexOf(b);
  return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
});

// Place a footprint beside the road from->to. side +1 = left of travel, -1 = right.
function beside(fromId, toId, t, side, w, d, { shift = 0, gap = 0.5 } = {}) {
  const A = N(fromId), B = N(toId);
  const dir = v2.norm(v2.sub(B, A));
  const left = { x: dir.z, z: -dir.x };
  const way = wayBetween(fromId, toId);
  const setback = way.width / 2 + way.pave + gap + d / 2;
  const p = v2.add(v2.lerp(A, B, t), v2.scale(dir, shift));
  const n = { x: left.x * side, z: left.z * side }; // points away from the road
  return { x: p.x + n.x * setback, z: p.z + n.z * setback, rot: Math.atan2(-n.x, -n.z), w, d };
}

// Teleport spot on the left lane of from->to at t, facing along the road.
export function spot(fromId, toId, t) {
  const A = N(fromId), B = N(toId);
  const dir = v2.norm(v2.sub(B, A));
  const way = wayBetween(fromId, toId);
  const off = laneOffset(way);
  const p = v2.lerp(A, B, t);
  return { x: p.x + dir.z * off, z: p.z - dir.x * off, heading: Math.atan2(dir.x, dir.z) };
}

function centroid(poly) {
  const c = poly.reduce((a, p) => ({ x: a.x + p.x, z: a.z + p.z }), { x: 0, z: 0 });
  return { x: c.x / poly.length, z: c.z / poly.length };
}

const oc = v2.norm(v2.sub(N('OC2'), N('OC1')));
const oconnellBridge = bridges.find((b) => b.name === "O'Connell Bridge");

// Ha'penny Bridge: pedestrian, from Liffey Street to Merchant's Arch
// square to the river, from the Liffey Street landing to the landing opposite Merchant's Arch
const hpA = N('NQ6'), hpB = N('HPS');
const hpDir = v2.norm(v2.sub(hpB, hpA));
let hp0 = null, hp1 = null;
for (let i = 0; i <= 200; i++) {
  const p = v2.lerp(hpA, hpB, i / 200);
  if (pointInPolygon(p, world.riverPoly)) { if (!hp0) hp0 = p; hp1 = p; }
}

// Trinity's Front Gate closes the view down Dame Street: the front is centred on the College Green junction
const trinityFront = { ...beside('CGT', 'CGC', 0, 1, 64, 20, { gap: 9 }), gap: 9 };
const tfDir = { x: -Math.sin(trinityFront.rot), z: -Math.cos(trinityFront.rot) }; // into the campus
const campanile = { x: trinityFront.x + tfDir.x * 62, z: trinityFront.z + tfDir.z * 62, rot: trinityFront.rot, w: 12, d: 12 };

const sgPark = parkPolys.find((p) => p.name === "St Stephen's Green");

// Heuston: the head building faces east over the station forecourt, the train shed runs west behind it
// Heuston lies south of St John's Road West, parallel to it, its head building facing east over a forecourt
// to Steevens Lane. Local +z points east along the road; the train shed runs west behind the head building.
// docs/research/heuston.md: the station lies NORTH of St John's Road West, between it and the Liffey, its head
// building facing east (8 degrees north of due east) over the forecourt and the Luas stop. The model is 32.5 m
// north-south and ~115 m east-west (with the shed); its north side sits just inside the game's south bank.
const heustonFront = (() => {
  const f = project(53.34656, -6.2922), bank = project(53.34692, -6.2922);
  return { x: f.x, z: bank.z + 17.5 };
})();
const at = (lat, lon) => project(lat, lon);
// Grand Canal Square (docs/research/grand-canal-square.md): the theatre at the west end with its glass front facing east
// down the square to the water, the Marker along the north side on Misery Hill's paved section, 4-5 Grand Canal Square
// across Misery Hill from the theatre, 2 Grand Canal Square behind (south of) the theatre, 1 Grand Canal Square on the
// square's south side. Footprints in game (x, z), from the OSM footprints projected and nudged clear of Misery Hill
// (streets.json MC1-MH1-MH2-MH3-HQ1); the Blender hero (tools/blender/build_gcsquare.py) is built on the same numbers.
const P = (x, z) => ({ x, z });
export const GCSQ = {
  origin: P(640, 150),                                                           // the hero's origin
  theatre: [P(614.8, 156.57), P(657.5, 164), P(650.6, 190.8), P(614.8, 173.8)],        // NW, NE, SE (the glass front's foot), SW
  marker: [P(647, 148), P(685.5, 155.4), P(687, 140.8), P(648.5, 133.4)],        // front W, front E, back E, back W
  // 4-5 GCS at street level: the two-storey base, less the entrance notch on Misery Hill (the upper floors oversail it)
  north: [P(641.5, 146.4), P(644, 100), P(621.8, 89.6), P(621.05, 136), P(627, 135.5), P(634, 143.7)],
  south: [P(614, 173.8), P(642, 185.9), P(640.5, 210.5), P(612.5, 207.5)],     // 2 GCS
  one: [P(649.4, 195.6), P(676.8, 208.1), P(674.3, 227), P(645.8, 223.3)],      // 1 GCS
  wedge: [P(660.2, 166.8), P(667.5, 168), P(666.4, 173.4), P(659.6, 171.6)],   // the car park stair on the square
};
// the smallest box at angle rot (local +z = (sin rot, cos rot)) round a polygon, grown by pad
function fitBox(poly, rot, pad = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const lx = poly.map((p) => p.x * c - p.z * s), lz = poly.map((p) => p.x * s + p.z * c);
  const x0 = Math.min(...lx) - pad, x1 = Math.max(...lx) + pad, z0 = Math.min(...lz) - pad, z1 = Math.max(...lz) + pad;
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  return { x: mx * c + mz * s, z: -mx * s + mz * c, rot, w: x1 - x0, d: z1 - z0 };
}
// the theatre's box runs along its north wall (Misery Hill); the Marker's along its front, out over the lawn terrace
const theatre = fitBox(GCSQ.theatre, -Math.atan2(6.7, 38.5));
const mkRot = -Math.atan2(7.4, 38.5);
const markerBox = fitBox([...GCSQ.marker, ...GCSQ.marker.slice(0, 2).map((p) => ({ x: p.x + Math.sin(mkRot) * 3.3, z: p.z + Math.cos(mkRot) * 3.3 }))], mkRot);
// the square: local +z faces the theatre (west), local -z runs out to the water (east), local +x is south
const gcSquare = { x: 671, z: 179, rot: -Math.PI / 2, w: 24, d: 32 };
const beckett = bridges.find((b) => b.name === 'Samuel Beckett Bridge');
// Barrow Street, the Google campus and Boland's Quay (docs/research/barrow-street.md): the hero's building boxes and
// the Google Docks outline come from src/data/barrowst.json (game metres, squeezed clear of the roads), shared with
// the Blender build. The DART embankment runs along the rail line between its bridges (over Grand Canal Quay and the
// canal's mouth, and over Barrow Street), as boxes along each straight.
const BS = bsLayout.boxes;
const bsMontevetro = bsLayout.montevetro.poly.map(([x, z]) => ({ x, z }));
const bsRail = (() => {
  const R = bsLayout.rail, line = R.line.map(([x, z]) => ({ x, z })), out = [], ranges = [];
  let xa = line[0].x;
  for (const [s0, s1] of R.spans) { ranges.push([xa, s0]); xa = s1; }
  ranges.push([xa, line[line.length - 1].x]);
  for (const [lo, hi] of ranges) for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1], x0 = Math.max(lo, a.x), x1 = Math.min(hi, b.x);
    if (x1 - x0 < 0.5) continue;
    const at = (x) => ({ x, z: a.z + ((x - a.x) / (b.x - a.x)) * (b.z - a.z) }), p = at(x0), q = at(x1), d = v2.sub(q, p);
    out.push({ ...v2.lerp(p, q, 0.5), rot: Math.atan2(d.x, d.z), w: 2 * R.half, d: v2.len(d) });
  }
  return out;
})();
// 3Arena (docs/research/three-arena.md): the old Point Depot's front stands on North Wall Quay behind a 2.2 m railed
// forecourt at the back of the footpath, square to the quay, its east wall just clear of East Wall Road. The hero is
// placed by the middle of that front (arenaFront; local +x east along the quay, local -z north, u / v in the model);
// the site box covers u -22.5 .. 21.5 and v -2.2 .. 54 (the forecourt to the north gables).
const arenaFront = (() => {
  const A = N('NQ18'), B = N('NQ19'), dir = v2.norm(v2.sub(B, A)), way = wayBetween('NQ18', 'NQ19');
  const p = v2.lerp(A, B, 0.617), off = way.width / 2 + way.pave + 2.2;
  return { x: p.x + dir.z * off, z: p.z - dir.x * off, rot: Math.atan2(-dir.z, dir.x) };
})();
const arenaAt = (u, v) => ({ x: arenaFront.x + u * Math.cos(arenaFront.rot) - v * Math.sin(arenaFront.rot), z: arenaFront.z - u * Math.sin(arenaFront.rot) - v * Math.cos(arenaFront.rot) });

// Croke Park, placed from OSM (docs/research/croke-park.md 3.2): the stadium frame has its origin at the pitch centre,
// +a along the pitch towards Hill 16 (N19.3E), +b across towards the Cusack Stand, in real metres; the model is built
// in that frame at plan scale 0.5 (tools/blender/build_crokepark.py), so a frame point maps to the map directly.
const CP_TH = (19.3 * Math.PI) / 180;
const cpCentre = at(53.360753, -6.25113);
export const cpAt = (a, b) => {
  const east = a * Math.sin(CP_TH) + b * Math.cos(CP_TH), north = a * Math.cos(CP_TH) - b * Math.sin(CP_TH);
  return { x: cpCentre.x + east * 0.5, z: cpCentre.z - north * 0.5 };
};
// a rectangle in the frame as a site box (local x = b, local z = -a)
const cpBox = (a0, a1, b0, b1) => ({ ...cpAt((a0 + a1) / 2, (b0 + b1) / 2), rot: -CP_TH, w: (b1 - b0) * 0.5, d: (a1 - a0) * 0.5 });
// the stadium's outline at ground level (the stand bases, corners and the Hill 16 rear wall), for collision
const cpOutline = (() => {
  const P = [];
  const arcPts = (cb, ca, r, deg0, deg1) => { for (let k = 0; k <= 12; k++) { const t = ((deg0 + (deg1 - deg0) * (k / 12)) * Math.PI) / 180; P.push([ca + Math.sin(t) * r, cb + Math.cos(t) * r]); } };
  P.push([54, -84]);
  arcPts(-38, -68, 46, 180, 270); // SW corner (the base at 34 m + the 12 m tier-front radius)
  arcPts(38, -68, 46, 270, 360);  // SE corner
  P.push([47, 84]);
  for (const [b, a] of [[85, 73], [71, 104], [48, 112], [-26, 100], [-28, 92], [-77, 88], [-96, 71], [-96, 59], [-112, 59], [-112, 54]]) P.push([a, b]);
  return P.map(([a, b]) => cpAt(a, b));
})();
// Parliament House / Bank of Ireland (docs/research/parliament-house.md). The hero model
// (tools/blender/build_parliament.py) is built in real metres: origin at the middle of the piazza front (on the
// colonnade line), +u east along College Green, +v north into the building; it is scaled 0.43 x 0.62 in plan and
// turned so the front runs parallel to College Green's north kerb (the east end further north, as in reality).
export const BOI = { ...at(53.344605, -6.260085), rot: 0.29, sx: 0.43, sy: 0.62 };
export function boiAt(u, v) {
  const c = Math.cos(BOI.rot), s = Math.sin(BOI.rot);
  return { x: BOI.x + BOI.sx * u * c - BOI.sy * v * s, z: BOI.z - BOI.sx * u * s - BOI.sy * v * c };
}
// a footprint given in model metres (u0..u1 along the front, v0..v1 into the building)
const boiBox = (u0, u1, v0, v1) => ({ ...boiAt((u0 + u1) / 2, (v0 + v1) / 2), rot: BOI.rot, w: (u1 - u0) * BOI.sx, d: (v1 - v0) * BOI.sy });

// The Four Courts (docs/research/four-courts.md): the river front runs parallel to the chord of Inns Quay (NQ0-NQ2),
// the portico steps just behind the quay's north footpath, the dome axis at its real x. The model
// (tools/blender/build_fourcourts.py) is built in game metres: u east along the front, v north into the building, the
// origin on the screens' face on the dome axis (the portico and its steps stand 3.6 m in front of it).
export const FC = (() => {
  const A = N('NQ0'), B = N('NQ2'), d = v2.norm(v2.sub(B, A)), n = { x: d.z, z: -d.x }; // n points away from the river
  const quay = wayBetween('NQ0', 'NQ1'), off = quay.width / 2 + quay.pave + 0.3 + 3.6;
  const dome = project(53.3459, -6.2735), t = (dome.x - A.x - n.x * off) / d.x;
  const o = { x: A.x + d.x * t + n.x * off, z: A.z + d.z * t + n.z * off };
  return { ...o, d, n, rot: Math.atan2(-d.z, d.x), zs: 1.1 }; // zs: the model's height stretch (build_fourcourts.py ZS_)
})();
export const fcAt = (u, v) => ({ x: FC.x + FC.d.x * u + FC.n.x * v, z: FC.z + FC.d.z * u + FC.n.z * v });
// a rectangle in model metres (u0..u1 along the front, v0..v1 into the building) as a site box
const fcBox = (u0, u1, v0, v1) => ({ ...fcAt((u0 + u1) / 2, (v0 + v1) / 2), rot: FC.rot, w: u1 - u0, d: v1 - v0 });

// Aviva Stadium (docs/research/aviva.md): the model's origin is the pitch centre, turned so its north end points 16
// degrees west of north (bearing 344), and moved 13.5 m north along that axis: roads are not compressed, and the real
// south face stands only ~5 m from Lansdowne Road. Plan scale 0.6 across x 0.55 along the axis (build_aviva.py).
const AV_ROT = (16 * Math.PI) / 180;
const avivaCentre = (() => {
  const p = project(53.33519, -6.22827), k = 13.5;
  return { x: p.x - Math.sin(AV_ROT) * k, z: p.z - Math.cos(AV_ROT) * k };
})();
// the outer ring (real metres from the pitch centre every 15 degrees, clockwise from the north end), scaled to the game
const AV_R = [80, 83, 91, 102, 106, 105, 105, 108, 113, 117, 115, 111, 108, 111, 117, 118, 113, 110, 108, 108, 108, 104, 91, 83];
const avivaLocal = (inset = 0) => AV_R.map((R, i) => { const a = (i * 15 * Math.PI) / 180; return { x: (R - inset) * Math.sin(a) * 0.6, z: -(R - inset) * Math.cos(a) * 0.55 }; });
const toWorldRot = (c, rot, p) => ({ x: c.x + p.x * Math.cos(rot) + p.z * Math.sin(rot), z: c.z - p.x * Math.sin(rot) + p.z * Math.cos(rot) });
// Footprint as horizontal slabs (local frame) fitted round the bulge of the facade, so the filler can build right up
// to the curve (Havelock Square's terraces press against the north end) without a bounding box eating the corners.
function avivaSlabs(margin = 1.5) {
  const ring = avivaLocal(0), out = [];
  const zs = [-47, -34, -18, 18, 38, 50, 62];
  for (let k = 0; k + 1 < zs.length; k++) {
    const z0 = zs[k], z1 = zs[k + 1];
    let x0 = Infinity, x1 = -Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      for (let t = 0; t <= 1; t += 0.05) {
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        if (z >= z0 - 1 && z <= z1 + 1) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      }
    }
    if (x0 > x1) continue;
    const c = toWorldRot(avivaCentre, AV_ROT, { x: (x0 + x1) / 2, z: (z0 + z1) / 2 });
    out.push({ ...c, rot: AV_ROT, w: x1 - x0 + 2 * margin, d: z1 - z0 });
  }
  return out;
}
// The DART crosses Lansdowne Road on the level (XR001, node AVLX) and runs NW under the stadium's west podium in a
// covered way; the station platforms run SE. Frame: s along the track (+ = north-west), q across it (+ = north-east,
// the stadium side), and u / w along and north of the road. Track bearing 322 degrees (OSM covered way).
const lansdowneXing = (() => {
  const X = N('AVLX'), road = v2.norm(v2.sub(N('AVL3'), N('AVL2')));
  const B = (322 * Math.PI) / 180, track = { x: Math.sin(B), z: -Math.cos(B) };
  const n = { x: -track.z, z: track.x }, north = { x: road.z, z: -road.x };
  const way = wayBetween('AVLX', 'AVL3');
  const at = (s, q) => ({ x: X.x + track.x * s + n.x * q, z: X.z + track.z * s + n.z * q });
  const atRoad = (u, w) => ({ x: X.x + road.x * u + north.x * w, z: X.z + road.z * u + north.z * w });
  // (s, q) of the point on the line q = q0 that stands w0 north of the road centreline
  const sAtW = (q0, w0) => (w0 - v2.dot(n, north) * q0) / v2.dot(track, north);
  const podium = { face: way.width / 2 + way.pave + 2.5, top: 4.4, west: -7.5, east: 16, north: 60, portal: [-5, 5], stairs: 7.5 };
  return { x: X.x, z: X.z, road, track, n, north, way, at, atRoad, sAtW, podium, trackRot: Math.atan2(track.x, track.z), roadRot: Math.atan2(-road.z, road.x) };
})();
// O'Connell Bridge House (docs/research/oconnell-bridge-house.md): the 12-storey tower on the corner of D'Olier Street
// and Burgh Quay, its long side on D'Olier St and its short front to the river and O'Connell Bridge, the Heineken sign
// down the stone pier at the west end of that front. The 7-storey extension continues down D'Olier St behind it.
// Local +z faces the river (up D'Olier St, towards the bridge), local +x faces D'Olier St. The tower stands square to
// D'Olier St like the real one, so its front is skewed to the quay and a wedge of pavement opens at the corner.
const obh = (() => {
  const A = N('SQ8'), d = v2.norm(v2.sub(N('DO1'), A)), n = { x: d.z, z: -d.x }; // n: away from D'Olier St (NE)
  const dol = wayBetween('SQ8', 'DO1'), bq = wayBetween('SQ8', 'SQ9'), q = v2.norm(v2.sub(N('SQ9'), A));
  const south = { x: -q.z, z: q.x }; // off Burgh Quay, towards the building
  const W = 12.8, D = 20.8, off = dol.width / 2 + dol.pave + 1.2 + W / 2, clear = bq.width / 2 + bq.pave + 1.2;
  // slide down D'Olier St until the tower's front corner on the quay side (local -x, +z) clears Burgh Quay's footpath
  let s = 0, c;
  for (; s < 80; s += 0.1) {
    c = { x: A.x + d.x * s + n.x * off, z: A.z + d.z * s + n.z * off };
    const k = { x: c.x + n.x * (W / 2) - d.x * (D / 2), z: c.z + n.z * (W / 2) - d.z * (D / 2) };
    if (v2.dot(v2.sub(k, A), south) >= clear) break;
  }
  const rot = Math.atan2(-d.x, -d.z), E = 15; // E: the extension's length down D'Olier St
  const at = (lx, lz) => ({ x: c.x + lx * Math.cos(rot) + lz * Math.sin(rot), z: c.z - lx * Math.sin(rot) + lz * Math.cos(rot) });
  return { ...c, rot, w: W, d: D, ext: { ...at(0.4, -D / 2 - E / 2), rot, w: W + 0.8, d: E }, at };
})();
// Criminal Courts of Justice (docs/research/criminal-courts.md): the glass drum on the corner of Parkgate Street and
// Infirmary Road, at the Phoenix Park end. East of PARK_X, so no east-west squeeze. The OSM circle is centred at
// 53.348694 / -6.295695; the model (tools/blender/build_ccj.py, plan scale 0.58) is moved north so its south terrace
// wall clears Conyngham Road's widened carriageway and footpath (the real south face is ~12 m off the kerb).
export const CCJ = (() => {
  const c = project(53.348694, -6.295695), a = N('PG1'), b = N('PX01'), way = wayBetween('PG1', 'PX01');
  const roadZ = a.z + ((c.x - a.x) / (b.x - a.x)) * (b.z - a.z);
  return { x: c.x, z: Math.min(c.z, roadZ - way.width / 2 - way.pave - 26.5), plan: 0.58 };
})();
// the drum's glazing line in real metres at a bearing (degrees clockwise from north), as in build_ccj.py
const ccjR = (b) => 39.45 - 1.95 * Math.cos((b * Math.PI) / 180);
// how far things stand out from it: the screen wall, the entrance steps, the terrace wall, the service wing, the stair tower
const ccjExtra = (b) => (b >= 84 && b <= 123 ? 3.5 : b > 123 && b <= 169 ? 8.2 : b > 169 && b <= 216 ? 3.1 : b >= 276 && b <= 298 ? 8.6 : b >= 4 && b <= 14 ? 8.6 : 1.0);
export function ccjOutline(pad = 0) {
  const out = [];
  for (let d = 0; d < 360; d += 2) {
    const r = (ccjR(d) + ccjExtra(d)) * CCJ.plan + pad, t = (d * Math.PI) / 180;
    out.push({ x: CCJ.x + r * Math.sin(t), z: CCJ.z - r * Math.cos(t) });
  }
  return out;
}
// Kilmainham (docs/research/kilmainham.md; the Blender heroes in tools/blender/build_kilmainham.py are built in game
// metres, x east / y north in each model, and turned by `rot` about the vertical). West of PARK_X the map is squeezed
// east-west to 0.35 of real but the roads are not, so each hero is slid off the carriageways and footpaths it would
// otherwise stand on:
//   the Courthouse west off the SCR, then south off Inchicore Road;
//   the Gaol (plan 0.55 of its OSM wall ring, turned square to Inchicore Road) west until its east wall clears the
//     Courthouse, then south until its front clears Inchicore Road;
//   the Royal Hospital (plan 0.55) stands on its OSM centre, turned 11 degrees like the real quadrangle; its drives
//     (streets.json KHA*) run round it in the same frame;
//   the Richmond Tower straddles the avenue's last straight, east of the SCR's footpath.
export const KH = (() => {
  const roadClear = (pts, keep = () => true, margin = 0.3) => pts.every((p) => {
    for (const s of world.segsNear(p.x, p.z)) {
      if (!keep(s.way)) continue;
      const a = s.a, b = s.b, abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1e-9;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / l2));
      if (Math.hypot(p.x - a.x - abx * t, p.z - a.z - abz * t) < s.way.width / 2 + s.way.pave + margin) return false;
    }
    return true;
  });
  // model (u east, v north) -> world, for an origin and a rotation (three.js rotation.y)
  const frame = (o, rot) => { const c = Math.cos(rot), s = Math.sin(rot); return (u, v) => ({ x: o.x + u * c - v * s, z: o.z - u * s - v * c }); };
  const toModel = (o, rot) => { const c = Math.cos(rot), s = Math.sin(rot); return (p) => { const dx = p.x - o.x, dz = p.z - o.z; return { u: dx * c - dz * s, v: -(dx * s + dz * c) }; }; };
  const grid = (u0, u1, v0, v1, step = 1) => { const out = []; for (let u = u0; u <= u1 + 1e-6; u += Math.min(step, u1 - u0 || 1)) for (let v = v0; v <= v1 + 1e-6; v += Math.min(step, v1 - v0 || 1)) out.push([u, v]); return out; };
  const boxOf = (at, rot, u0, u1, v0, v1) => ({ ...at((u0 + u1) / 2, (v0 + v1) / 2), rot, w: u1 - u0, d: v1 - v0 });
  const slide = (o, rot, pts, du, dv, keep, max = 60) => {
    for (let k = 0; k <= max * 4; k++) {
      const at = frame({ x: o.x + (du * Math.cos(rot) - dv * Math.sin(rot)) * k * 0.25, z: o.z + (-du * Math.sin(rot) - dv * Math.cos(rot)) * k * 0.25 }, rot);
      if (roadClear(pts.map(([u, v]) => at(u, v)), keep)) return { x: o.x + (du * Math.cos(rot) - dv * Math.sin(rot)) * k * 0.25, z: o.z + (-du * Math.sin(rot) - dv * Math.cos(rot)) * k * 0.25 };
    }
    console.warn('Kilmainham: no clear spot near', Math.round(o.x), Math.round(o.z));
    return o;
  };
  const isNamed = (re) => (w) => re.test(w.name);

  // ---- Inchicore Road: the gaol and the courthouse
  const ia = N('KHG2'), ib = N('KHG1'), id = v2.norm(v2.sub(ib, ia));
  const gRot = Math.atan2(-id.z, id.x);
  // the courthouse (plan 0.45 x 0.5): 14.8 x 12.5 m and 2.4 m of railed forecourt
  const CT = { u0: -7.4, u1: 7.4, v0: -6.25, v1: 8.65 };
  let ct = project(53.34177, -6.3085);
  ct = slide(ct, gRot, grid(CT.u0, CT.u1, CT.v0, CT.v1), -1, 0, isNamed(/South Circular/));
  ct = slide(ct, gRot, grid(CT.u0, CT.u1, CT.v0, CT.v1), 0, -1, isNamed(/Inchicore|South Circular/));
  const ctAt = frame(ct, gRot);
  // the gaol: the OSM wall ring's first node, then west of the courthouse and south of the road
  const G = { u0: -21.0, u1: 35.1, v0: -39.3, v1: 0.8 };
  let go = project(53.3420594, -6.3097445);
  { const ctIn = toModel(go, gRot)(ctAt(CT.u0, 0)); go = frame(go, gRot)(Math.min(0, ctIn.u - 0.6 - G.u1), 0); }
  go = slide(go, gRot, grid(G.u0, G.u1, 0, G.v1).filter(([, v]) => v > 0), 0, -1, isNamed(/Inchicore/));
  const gaolAt = frame(go, gRot);
  // the wall ring (build_kilmainham.py RING, turned 5.8 degrees and scaled 0.55), for collision
  const TH = (5.8 * Math.PI) / 180;
  const RING = [[0, 0], [-1.7, 0.8], [-19.2, 2.6], [-30.0, 3.7], [-34.7, 2.7], [-36.7, 0.9], [-37.8, -2.1], [-38.2, -6.5], [-32.4, -7.1],
    [-33.3, -15.5], [-32.7, -17.9], [-33.9, -26.8], [-37.0, -55.4], [-38.3, -55.2], [-39.7, -65.7], [-28.3, -67.0], [34.0, -73.6],
    [45.8, -75.8], [57.0, -64.5], [57.2, -62.1], [61.9, -15.0], [62.1, -12.8], [61.8, -10.7], [60.5, -8.5], [57.7, -7.4],
    [55.9, -6.2], [41.9, -4.4], [23.7, -2.3]];
  const gaolRing = RING.map(([x, y]) => gaolAt((x * Math.cos(TH) - y * Math.sin(TH)) * 0.55, (x * Math.sin(TH) + y * Math.cos(TH)) * 0.55));
  // the Proclamation plaza across the road from the gaol's door
  const door = gaolAt(5.8, 1), dr = world.nearestRoad(door.x, door.z);
  const nv = { x: -Math.sin(gRot), z: -Math.cos(gRot) }; // the model's +v (north) in the world
  const plaza = { x: dr.cx + nv.x * (dr.way.width / 2 + dr.way.pave + 8), z: dr.cz + nv.z * (dr.way.width / 2 + dr.way.pave + 8), rot: gRot, w: 24, d: 13 };

  // ---- the Royal Hospital
  const rRot = (11 * Math.PI) / 180, rc = project(53.34294, -6.30005), rhkAt = frame(rc, rRot), rhkIn = toModel(rc, rRot);
  const garden = { u0: -26, u1: 26, v0: 41.5, v1: 128 };
  const gh = { u: -6, v: 133 };

  // ---- the Richmond Tower: on the avenue's last straight, east of the SCR
  const ta = N('KHA9'), tb = N('KHK1'), td = v2.norm(v2.sub(ta, tb)); // eastward, into the grounds
  const tRot = Math.atan2(-td.z, td.x);
  const RT = { u0: -3.4, u1: 3.4, v0: -10.6, v1: 7.0 };
  const to = slide({ x: tb.x, z: tb.z }, tRot, grid(RT.u0, RT.u1, RT.v0, RT.v1).filter(([, v]) => Math.abs(v) > 3.1), 1, 0, (w) => w.name !== 'Royal Hospital Kilmainham');
  const rtAt = frame(to, tRot);

  const solids = {
    gaolWest: boxOf(gaolAt, gRot, -6.7, 0.1, -12.1, 0.8), gaolEast: boxOf(gaolAt, gRot, 11.4, 18.3, -12.1, 0.8),
    courthouse: boxOf(ctAt, gRot, CT.u0, CT.u1, CT.v0, 6.25), courtForecourt: boxOf(ctAt, gRot, CT.u0, CT.u1, 6.25, CT.v1),
    rhk: boxOf(rhkAt, rRot, -24.5, 24.5, -26, 26), rhkNorth: boxOf(rhkAt, rRot, -6.0, 6.0, 26, 32.1),
    gardenHouse: boxOf(rhkAt, rRot, gh.u - 4.1, gh.u + 4.1, gh.v - 4.1, gh.v + 4.1),
    richmondN: boxOf(rtAt, tRot, -3.4, 3.4, 3.05, 6.95), richmondS: boxOf(rtAt, tRot, -3.4, 3.4, -6.95, -3.05),
    richmondTurret: boxOf(rtAt, tRot, -3.5, 2.3, -10.6, -6.95),
    richmondWallN: boxOf(rtAt, tRot, -1.1, -0.5, 6.95, 13.5), richmondWallS: boxOf(rtAt, tRot, -1.1, -0.5, -12.2, -10.6),
  };
  return {
    gaolAt, rhkAt, rtAt, ctAt, rhkIn, gaolRing, plaza, garden, gh, gRot, rRot, tRot,
    enclosure: boxOf(gaolAt, gRot, G.u0, G.u1, G.v0, G.v1),
    solids: Object.values(solids), named: solids,
    groups: {
      'Kilmainham Gaol': { gaol: { ...go, rot: gRot }, courthouse: { ...ct, rot: gRot } },
      'Royal Hospital Kilmainham': { rhk: { ...rc, rot: rRot }, gardenhouse: { ...rhkAt(gh.u, gh.v), rot: rRot } },
      'Richmond Tower': { richmond: { ...to, rot: tRot } },
    },
    gates: [{ ...N('KHM4'), r: 7 }, { ...to, r: 8 }],
    inGarden: (p) => { const q = rhkIn(p); return q.u > garden.u0 - 1 && q.u < garden.u1 + 1 && q.v > garden.v0 - 1 && q.v < garden.v1 + 10; },
  };
})();
const xingBox = (s0, s1, q0, q1) => ({ ...lansdowneXing.at((s0 + s1) / 2, (q0 + q1) / 2), rot: lansdowneXing.trackRot, w: q1 - q0, d: s1 - s0 });
const xingRoadBox = (u0, u1, w0, w1) => ({ ...lansdowneXing.atRoad((u0 + u1) / 2, (w0 + w1) / 2), rot: lansdowneXing.roadRot, w: u1 - u0, d: w1 - w0 });

export const sites = {
  spire: {
    name: 'The Spire', x: N('OC2').x, z: N('OC2').z, rot: Math.atan2(oc.x, oc.z), w: 3, d: 3, labelY: 128,
    view: spot('OC1', 'OC2', 0.1),
  },
  gpo: {
    name: 'GPO', ...beside('OC1', 'OC2', 1, 1, 54, 32, { shift: -26, gap: 3 }), labelY: 34,
    view: spot('OC1', 'OC2', 0.05),
  },
  oconnellBridge: {
    name: "O'Connell Bridge", x: oconnellBridge.centre.x, z: oconnellBridge.centre.z, rot: Math.atan2(oconnellBridge.dir.x, oconnellBridge.dir.z),
    w: oconnellBridge.width, d: oconnellBridge.length, labelY: 16, bridge: oconnellBridge,
    view: spot('WM1', 'WMS', 0.4),
  },
  hapenny: {
    name: "Ha'penny Bridge", x: (hp0.x + hp1.x) / 2, z: (hp0.z + hp1.z) / 2, rot: Math.atan2(hpDir.x, hpDir.z),
    w: 3.2, d: v2.len(v2.sub(hp1, hp0)) + 2, labelY: 16,
    view: spot('SQ7', 'HPS', 0.2),
  },
  trinity: {
    name: 'Trinity College', ...trinityFront, labelY: 36, campanile,
    view: spot('CG0', 'CGT', 0.3),
  },
  cityHall: {
    // at the top of Parliament Street, where Dame Street becomes Lord Edward Street
    name: 'City Hall', ...beside('DSY', 'DM3', 1, 1, 26, 24, { shift: -5, gap: 3 }), labelY: 30,
    view: spot('SQ4', 'PARL', 0.55),
  },
  centralBank: {
    name: 'Central Bank', ...beside('DAN', 'DMc', 0.62, -1, 24, 14, { gap: 4 }), plaza: 4, labelY: 44,
    view: spot('DFU', 'DMc', 0.3),
  },
  bankOfIreland: {
    // the main block from the piazza's back wall to the north wall; the piazza, quadrants and porticos are in
    // extraSites (boi*) so the filler and the footprint test see the real outline
    name: 'Bank of Ireland', ...boiBox(-55.4, 51.85, 17, 79), labelY: 22,
    parts: { parliament: { x: BOI.x, z: BOI.z, rot: BOI.rot } },
    view: spot('DAN', 'CG0', 0.5),
  },
  christChurch: (() => {
    // docs/research/christ-church.md: the cathedral sits in its grounds between Winetavern St (west), Fishamble St
    // (east) and the curve of Christchurch Place (south), its east end turned ~5 degrees north; the Synod Hall is
    // across Winetavern St, and the covered bridge spans the street from the Synod Hall's east face to the
    // cathedral's SW link block. Plan scale 0.6 (the model is built that way).
    const wt = wayBetween('WTB', 'HS1'), hs = N('HS1'), rot = 0.087;
    const westFront = { x: hs.x + wt.width / 2 + PAVEMENT + 1.2, z: hs.z - 32.5 };
    const synodFace = { x: hs.x - wt.width / 2 - PAVEMENT - 0.6, z: hs.z - 23.2 };
    const bridgeZ = hs.z - 21.2;
    // the cathedral model's origin is the west front on the nave axis; its footprint centre is ~16 m east
    const c = Math.cos(rot), s = Math.sin(rot), L = 33.6, W = 18.6;
    return {
      name: 'Christ Church Cathedral', x: westFront.x + (L / 2) * c, z: westFront.z - (L / 2) * s, rot, w: L, d: W, labelY: 40,
      view: spot('CC2', 'CC1', 0.3),
      parts: {
        cathedral: { x: westFront.x, z: westFront.z, rot },
        synod: { x: synodFace.x, z: synodFace.z, rot: 0 },
        bridge: { x: (synodFace.x + westFront.x) / 2, z: bridgeZ, rot: 0, len: (westFront.x - synodFace.x + 0.6) / 18 },
      },
      synod: { x: synodFace.x - 8.4, z: synodFace.z, rot: 0, w: 16.8, d: 25.8 },
    };
  })(),
  stPatricks: (() => {
    // west front on the Patrick St building line (a 2.5 m railed forecourt), nave axis just south of the park;
    // the model is scaled 0.56 x 0.52 in plan (50.8 x 24 m) with real heights: Minot's Tower and the 66 m spire
    const a = N('PK2'), c = N('PK3'), pat = wayBetween('PK2', 'PK3'), zAxis = a.z + 6;
    const xRoad = a.x + ((zAxis - a.z) / (c.z - a.z)) * (c.x - a.x);
    const x0 = xRoad + pat.width / 2 + pat.pave + 2.5, L = 50.8;
    return {
      name: "St Patrick's Cathedral", x: x0 + L / 2, z: zAxis, rot: 0, w: L, d: 24.2, labelY: 70,
      view: spot('PK1', 'PK2', 0.35),
      parts: { cathedral: { x: x0, z: zAxis, rot: 0 } },
    };
  })(),
  fourCourts: {
    // the central block, courtyards, wings and back ranges; the portico and its steps are extraSites.fcPortico
    name: 'Four Courts', ...fcBox(-42.3, 42.3, -0.3, 49.3), labelY: 36,
    parts: { fourcourts: { x: FC.x, z: FC.z, rot: FC.rot } },
    view: spot('SQ2', 'NQ2', 0.25), // off O'Donovan Rossa Bridge, the dome ahead on the left
  },
  customHouse: {
    name: 'Custom House', ...beside('NQ10', 'NQ11', 1, 1, 100, 24, { gap: 3 }), labelY: 50,
    view: spot('SQ9', 'SQ10', 0.3),
  },
  heuston: {
    // footprint for the filler and the footprint test: the site's local +z is the front (east), w runs north-south
    name: 'Heuston Station', x: heustonFront.x - 57 * Math.cos(0.14), z: heustonFront.z + 57 * Math.sin(0.14), rot: Math.PI / 2 + 0.14, w: 32.5, d: 114, labelY: 30,
    view: spot('WT2', 'VQ2', 0.55),
    parts: { station: { x: heustonFront.x, z: heustonFront.z, rot: 0.14 } },
  },
  guinness: (() => {
    // docs/research/guinness.md: the Storehouse on its OSM footprint (way 44597908, 54 x 48 m; the model is plan x0.6,
    // 32.4 x 28.8), its south front on the Market Street South building line; the Gravity Bar ~11 m in from the east
    // front. The brewery skyline around it (Power House and its four stacks, St Patrick's Tower) from OSM too.
    const c = at(53.341851, -6.286735), A = N('BV1'), B = N('MK1'), mk = wayBetween('BV1', 'MK1');
    const zRoad = A.z + ((B.z - A.z) * (c.x - A.x)) / (B.x - A.x), d = 28.8;
    const z = zRoad - mk.width / 2 - mk.pave - 0.4 - d / 2;
    const ph = at(53.34408, -6.28585), phRot = 0.169;
    // the fermenters and vats (src/data/guinness-tanks.json): plan x0.55, ~4 diameters tall (x0.9), none inside the
    // Power House; each bank's box keeps the filler out
    const inPower = (p) => {
      const dx = p.x - ph.x, dz = p.z - ph.z, c2 = Math.cos(phRot), s2 = Math.sin(phRot);
      return Math.abs(dx * c2 - dz * s2) < 9.8 && Math.abs(dx * s2 + dz * c2) < 16.4;
    };
    let k = 0;
    const tankBanks = tanksData.groups.map((g) => g.tanks.map(([lat, lon, dia]) => {
      const p = at(lat, lon), jitter = 1 + 0.12 * Math.sin(++k * 2.39);
      return { ...p, r: dia * 0.275, h: Math.min(25, Math.max(9, 4 * dia)) * 0.9 * jitter };
    }).filter((t) => !inPower(t)));
    return {
      name: 'Guinness Storehouse', x: c.x, z, rot: 0, w: 32.4, d, labelY: 44,
      view: spot('MK1', 'BV1', 0.12),
      bar: { x: c.x + 14.6 * 0.6, y: 40, z }, // the Gravity Bar's drum (build_guinness.py BX; real heights)
      parts: {
        powerhouse: { ...ph, rot: phRot },                                   // way 352819252, turned 9.7 degrees
        stack_w: at(53.3443512, -6.2861451), stack_e: at(53.3443912, -6.2857052), // chimney nodes 2989865725 / 6
        stack_steel: at(53.3440781, -6.2859364), stack_cream: at(53.3447048, -6.2855102), // 5827403777, 4711077901
        tower: at(53.344049, -6.284071),                                      // St Patrick's Tower, way 44597921
      },
      tanks: tankBanks.flat(),
      tankBanks: tankBanks.filter((b) => b.length).map((b) => {
        const x0 = Math.min(...b.map((t) => t.x - t.r)), x1 = Math.max(...b.map((t) => t.x + t.r));
        const z0 = Math.min(...b.map((t) => t.z - t.r)), z1 = Math.max(...b.map((t) => t.z + t.r));
        return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, rot: 0, w: x1 - x0 + 1, d: z1 - z0 + 1 };
      }),
    };
  })(),
  beckett: {
    name: 'Samuel Beckett Bridge', x: beckett.centre.x, z: beckett.centre.z, rot: Math.atan2(beckett.dir.x, beckett.dir.z),
    w: beckett.width, d: beckett.length, labelY: 50, bridge: beckett,
    view: spot('SQ14', 'SQ15', 0.25),
  },
  convention: {
    name: 'Convention Centre', ...beside('NQ15', 'NQ16', 1, 1, 56, 30, { gap: 13 }), labelY: 40,
    view: spot('SQ15', 'NQ15', 0.45), // from the Beckett Bridge, looking across to it
  },
  threeArena: {
    name: '3Arena', ...arenaAt(-0.5, 25.9), rot: arenaFront.rot, w: 44, d: 56.2, labelY: 30,
    front: arenaFront, at: arenaAt,
    plaza: { ...arenaAt(-0.5, 57), rot: arenaFront.rot, w: 44, d: 6 }, // paved, out to the Luas terminus
    view: spot('NQ17', 'NQ18', 0.45),
  },
  grandCanal: {
    name: 'Grand Canal Theatre', ...theatre, labelY: 32,
    square: gcSquare,
    view: spot('HQM', 'HQ1', 0.55),
  },
  marker: {
    // the Marker hotel, with Misery Hill between the theatre and 4-5 Grand Canal Square
    name: 'The Marker and Misery Hill', ...markerBox, labelY: 30,
    view: spot('MC1', 'MH1', 0.1),
  },
  grandCanalSt: {
    // the precast-concrete office block on the corner of Grattan Street (south side), set back behind a raised
    // forecourt with steps up from the footpath
    name: 'Grand Canal Street', ...beside('GT1', 'GCM', 0.52, -1, 24, 20, { gap: 7 }), plaza: 6.5, labelY: 30,
    view: spot('HOL1', 'GT1', 0.3),
  },
  crokePark: {
    // the bowl (tier fronts to the stand bases); the Hogan's rear block, the Cusack's decks, Hill 16 and the Davin's
    // span over the canal are further boxes below. The model itself is placed at the pitch centre.
    name: 'Croke Park', ...cpBox(-114, 78, -84, 84), labelY: 45,
    centre: { ...cpCentre, rot: -CP_TH },
    outline: cpOutline,
    // ground-level solids beyond the outline: the Hogan's rear block and turnstiles, the Cusack's deck stacks, the
    // Davin's stair towers on the canal's south bank (frame coordinates; see build_crokepark.py)
    solids: [cpBox(-100, 54, -118, -84), cpBox(-68, -43, 84, 111.6), cpBox(4, 44, 84, 111.6), cpBox(-9.5, -2.5, 96.5, 103.5), cpBox(48.5, 55.5, 86.5, 93.5),
      ...[-34, 34].map((b) => { const a = -121.7 - 0.0201 * (b + 279) - 16.5; return cpBox(a - 3, a + 3, b - 3, b + 3); })],
    view: spot('RN62', 'KP6', 0.3), // Jones's Road, northbound under the Hogan Stand
  },
  stephensGreen: {
    name: "St Stephen's Green", ...centroid(sgPark.poly), rot: 0, w: 0, d: 0, labelY: 30, park: sgPark,
    view: spot('GFCH', 'SGNW', 0.05),
  },
  aviva: {
    // w x d is the bounding box for the map; the filler keeps off the fitted slabs below (extraSites.avivaSlabs)
    name: 'Aviva Stadium', ...avivaCentre, rot: AV_ROT, w: 126, d: 104, labelY: 42,
    outline: avivaLocal(3).map((p) => toWorldRot(avivaCentre, AV_ROT, p)), // the plinth, for collision
    view: spot('AVL2', 'AVLX', 0.2),
  },
  oconnellBridgeHouse: {
    // the tower; the extension down D'Olier St is extraSites.obhExtension. View: southbound on O'Connell Street
    // near the bridge, where the tower and its sign close the view across the river
    name: "O'Connell Bridge House", x: obh.x, z: obh.z, rot: obh.rot, w: obh.w, d: obh.d, labelY: 48, at: obh.at, ext: obh.ext,
    view: spot('OC1', 'NQ8', 0.35),
  },
  google: {
    // Google Docks (the old Montevetro, 2010, 65.6 m): the slab along the north of its outline; the rest of the Barrow
    // Street campus (Gordon House, Gasworks House, the skybridge) is in extraSites. Seen northbound out of the underpass.
    name: 'Google (Barrow Street)', x: 727.3, z: 413.1, rot: -0.108, w: 30.3, d: 7.5, labelY: 70, outline: bsMontevetro,
    view: spot('BWS2', 'BWS3', 0.08),
  },
  bolands: {
    // Boland's Quay: BOL1 behind the restored 1830s mills on Ringsend Road; seen from MacMahon Bridge, eastbound
    name: "Boland's Quay", ...BS.bol1, labelY: 58,
    view: spot('PS5', 'RR1', 0.2),
  },
  ccj: {
    // w x d: the drum and its terrace for the map and the filler; the outline (with the steps, the screen wall, the
    // stair tower and the service wing) is what collides. Viewed from Parkgate Street, westbound towards the park.
    name: 'Criminal Courts of Justice', x: CCJ.x, z: CCJ.z, rot: 0, w: 50, d: 50, labelY: 34,
    outline: ccjOutline(),
    view: spot('WT3', 'PG1', 0.35),
  },
  kilmainhamGaol: {
    // the walled enclosure; the front blocks, the courthouse and its forecourt are extraSites.kh* (see KH above)
    name: 'Kilmainham Gaol', ...KH.enclosure, labelY: 22,
    view: spot('KHK1', 'KHG1', 0.55), // westbound on Inchicore Road, the front on the left
  },
  royalHospital: {
    name: 'Royal Hospital Kilmainham', ...KH.named.rhk, labelY: 42,
    view: spot('KHA8', 'KHA7', 0.25), // up the lime avenue towards the west front
  },
  richmondTower: {
    name: 'Richmond Tower', ...KH.named.richmondN, labelY: 18,
    view: spot('KHG1', 'KHK1', 0.1), // eastbound on Inchicore Road, the gate closing the view
  },
  // Connolly Station (docs/research/railway.md): William Deane Butler's 1844 granite front with its Italianate tower,
  // on the east side of Amiens Street at the Talbot Street / Store Street junction, facing west (local +z). The
  // train shed over platforms 1-4 runs north-east behind it (railway.js); the Loop Line's DART platforms pass south of
  // it, beyond the Luas stop (left open). Seen from Talbot Street, eastbound.
  connolly: {
    name: 'Connolly Station', ...beside('BP3', 'AM', 1, -1, 40, 17, { gap: 0.6, shift: -14 }), labelY: 36, // clear of Sheriff Street
    view: spot('TB1', 'AM', 0.55),
  },
  // the Loopline Bridge (1891): the lattice girders over the Liffey between Custom House Quay and George's Quay, in
  // front of the Custom House (a bridge: not a footprint). Seen from Burgh Quay, eastbound, with the dome behind it.
  loopline: (() => {
    const sp = railSpans.find((k) => k.hero), a = railAt(sp ? (sp.s0 + sp.s1) / 2 : 0);
    return { name: 'Loopline Bridge', x: a.x, z: a.z, rot: Math.atan2(a.d.x, a.d.z), w: 12, d: sp ? sp.s1 - sp.s0 : 0, labelY: 14, bridge: true, view: spot('SQ8', 'SQ9', 0.55) };
  })(),
  aras: {
    // Áras an Uachtaráin (src/world/aras-zoo.js): the main range and its terrace, set back behind its lawn and the
    // ha-ha. The view is on Chesterfield Avenue where the house's vista meets it, facing up the lawn to the portico.
    name: 'Áras an Uachtaráin', x: aras.x + aras.f.x * -5.2, z: aras.z + aras.f.z * -5.2, rot: aras.rot, w: 49.6, d: 17, labelY: 18,
    view: aras.view,
  },
  zoo: {
    // Dublin Zoo's entrance building on the Hollow (the lettered wall faces the park); seen from the road across the Hollow
    name: 'Dublin Zoo', x: zooSite.x + Math.sin(zooSite.rot) * -2.9, z: zooSite.z + Math.cos(zooSite.rot) * -2.9, rot: zooSite.rot, w: 28, d: 6, labelY: 8,
    view: zooSite.view,
  },
};

// A railway bridge over the road at a node (the GSWR, docs/research/croke-park.md 1.2; no trains, so only the deck
// and a short stub of embankment each side). bearing: the railway's, in degrees from north. The deck spans the road
// corridor at its crossing angle; the stubs start just beyond the footpaths.
function railBridge(nodeId, bearing) {
  const p = N(nodeId), way = world.ways.find((w) => w.nodeIds.includes(nodeId)), i = way.nodeIds.indexOf(nodeId);
  const a = N(way.nodeIds[Math.max(0, i - 1)]), b = N(way.nodeIds[Math.min(way.nodeIds.length - 1, i + 1)]);
  const road = v2.norm(v2.sub(b, a)), t = (bearing * Math.PI) / 180, r = { x: Math.sin(t), z: -Math.cos(t) };
  const sin = Math.max(0.4, Math.abs(r.x * road.z - r.z * road.x));
  const half = (way.width / 2 + way.pave) / sin + 0.6, rot = Math.PI - t, L = 14;
  const stub = (s) => ({ x: p.x + r.x * s * (half + L / 2), z: p.z + r.z * s * (half + L / 2), rot, w: 7, d: L });
  return { x: p.x, z: p.z, rot, w: 6, d: 2 * half + 1.2, half, road: way.name, stubs: [stub(1), stub(-1)] };
}

// Offset a site's centre along its local axes (local +z faces the street).
function shifted(site, lx, lz, w, d) {
  const c = Math.cos(site.rot), s = Math.sin(site.rot);
  return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c, rot: site.rot, w, d };
}
// Open grounds kept free of filler buildings and painted as lawn.
export const grounds = [

  shifted(sites.customHouse, 0, -3, 124, 34),
  // Leinster Lawn, from Leinster House's garden front to Merrion Square West
  { ...KD_OPEN.lawn, lawn: 1 }, { ...KD_OPEN.lawnEast, lawn: 1 }, { ...KD_OPEN.lawnEast2, lawn: 1 },
  // Lansdowne FC's back pitch, between the stadium's east side and the Dodder
  { ...shifted(sites.aviva, 75.5, -2, 15, 78), lawn: 1 },
  // Lansdowne Lawn Tennis Club, north of it up to Bath Avenue: open courts, so the stadium shows across the Dodder
  { ...shifted(sites.aviva, 61, -69, 34, 50), lawn: 2 },
  // Havelock Square's green: the gap in the Bath Avenue terrace that opens on the stadium's low north end
  (() => {
    const a = N('AVBA2'), b = N('AVBA3'), d = v2.norm(v2.sub(b, a)), h = N('AVBH'), rot = Math.atan2(-d.z, d.x);
    const edge = wayBetween('AVBH', 'AVBA3'), off = edge.width / 2 + edge.pave + 1, L = 60;
    return { x: h.x - d.z * (off + L / 2), z: h.z + d.x * (off + L / 2), rot, w: 22, d: L, lawn: 4 };
  })(),
];
// Shelbourne Park greyhound stadium (OSM way 28769109): open ground east of South Lotts Road - the track, its car parks
// and a low stand - which is why the Aviva shows over it from Ringsend Road and the dock
// (squeezed east-west between the uncompressed road and the Dodder's banks: 74 x 93 m, the track 62 x 42 m)
export const shelbournePark = (() => {
  const a = N('AVSL3'), b = N('SD1'), way = wayBetween('AVSL3', 'SD1');
  const n = project(53.34133, -6.2308), s = project(53.33965, -6.2308);
  // the road slants north-east: clear it at the park's north edge
  const x0 = a.x + ((n.z - a.z) / (b.z - a.z)) * (b.x - a.x) + way.width / 2 + way.pave + 2, x1 = x0 + 74;
  return { x: (x0 + x1) / 2, z: (n.z + s.z) / 2, rot: 0, w: x1 - x0, d: s.z - n.z, track: { rx: 31, rz: 21 } };
})();

// Smaller landmarks that are modelled but not in the teleport list
export const extraSites = {
  // the Cork Hill gate of Dublin Castle, on Lord Edward Street (the Upper Yard sits behind it)
  castle: beside('DM3', 'LE1', 0.55, 1, 40, 2, { gap: 0.5 }),
  // 72 Dame Street, on the Temple Bar side like the Central Bank
  olympia: beside('DSY', 'DM3', 0.2, -1, 12, 16, { gap: 0.15 }),
  clockCorner: beside('CG0', 'DAN', 0.4, 1, 16, 16, { gap: 0.15 }),
  // Grafton Street: Bewley's, Brown Thomas at the Wicklow Street corner with Weir & Sons across it,
  // and the St Stephen's Green Shopping Centre at the top
  // Merchants' Hall (Frederick Darley, 1821): the granite hall on the quay the Merchant's Arch passage runs through,
  // 14 x 14.7 m, with the passage in its west bay lined up with the Ha'penny Bridge (docs/research/temple-bar.md)
  merchantsHall: beside('SQ6', 'HPS', 1, -1, 14, 14, { shift: 4.67, gap: 0.15 }),
  // the Four Courts' portico and its steps, in front of the screens' line
  fcPortico: fcBox(-7.7, 7.7, -3.6, 0.3),
  // Iveagh Play Centre, facing St Patrick's Park across Bull Alley
  iveaghPlay: beside('PK1', 'BD3', 0.5, 1, 34, 15, { gap: 0.3 }),
  // (the Temple Bar pub on the Temple Lane South corner is in src/world/pubsites.js with the other pubs)
  // Temple Bar Square: the flagged square on the south side of Temple Bar, west of Crown Alley
  tbSquare: (() => { const ca = wayBetween('TBQ', 'CCA'); return beside('TBQ', 'TFO', 0, 1, 21, 13, { shift: ca.width / 2 + ca.pave + 10.8, gap: 0.1 }); })(),
  // (Grafton Street is split at Duke Street, GRD, 0.352 of the way from GR1 to GR2 on the same line: same spots)
  // (and again at Johnson's Court, GFJC, 0.47 of the way from GRD to GR2: Bewley's keeps its spot)
  bewleys: beside('GFJC', 'GR2', ((0.78 - 0.352) / 0.648 - 0.47) / 0.53, -1, 12, 8, { gap: 0.15 }),
  // (20 deep, so its back clears Clarendon Street; Weir & Sons stands on the north corner of the slanting Wicklow Street)
  brownThomas: beside('GR1', 'GRD', 0.3 / 0.352, -1, 28, 20, { gap: 0.15 }),
  weir: beside('CG3', 'GR1', 0.78, -1, 10, 14, { gap: 0.15 }),
  sgCentre: (() => {
    const W = 56, D = 54, kss = v2.len(v2.sub(N('GFKR'), N('SGNW'))); // (King St is split at Clarendon Row, GFKR)
    const west = wayBetween('SGNW', 'SGW'); // St Stephen's Green West: its half width and footpath set the corner
    // the Green West road slants ~12 degrees west going south: allow for it so the far end clears the footpath
    return beside('SGNW', 'GFKR', (west.width / 2 + west.pave + 0.4 + D * 0.22 + W / 2) / kss, 1, W, D, { gap: 0.3 });
  })(),
  // Grattan's statue on its island at the east end of College Green, in front of the east arch pavilion, facing
  // west down Dame Street (the island's east tip stays clear of the Trinity junction)
  // (docs/research/kildare-street.md: the islands, Davis and the fountain are src/world/collegegreen.js; he faces Trinity)
  grattan: { ...cgAt(...CG_SPOTS.grattan), rot: CG_EAST },
  // Parliament House outline beyond the main block: the piazza with its arch pavilions, the porticos on Foster
  // Place and Westmoreland Street, the SE corner block
  boiPiazza: boiBox(-23.9, 23.9, -2.4, 17),
  boiFoster: boiBox(-61, -55.4, 31.7, 46.9),
  boiLords: boiBox(51.85, 63.3, 36.8, 57.6),
  boiCorner: boiBox(51.85, 55.4, 23.5, 36.8),
  // the Lansdowne Road level crossing and the stadium's west podium over the covered way (see lansdowneXing above)
  lansdowneXing,
  // O'Connell Bridge House's 7-storey extension down D'Olier Street (the tower is sites.oconnellBridgeHouse)
  obhExtension: obh.ext,
  // Kilmainham: the gaol's front blocks, the courthouse and its railed forecourt, the Proclamation plaza, the Royal
  // Hospital's north front and steps, the Garden House, the Richmond Tower's piers, turret and wall stubs
  ...Object.fromEntries(Object.entries(KH.named).filter(([k]) => !['rhk', 'richmondN'].includes(k)).map(([k, s]) => ['kh_' + k, s])),
  kh_plaza: KH.plaza,
};
// Aviva footprint slabs, the podium over the DART (a strip along the track and its front on Lansdowne Road with the
// grand stairs), the station's track bed and platforms, and the station building - all kept free of filler
{
  const X = lansdowneXing, P = X.podium;
  const uOf = (s, q) => v2.dot(v2.sub(X.at(s, q), X), X.road);
  const uWest = uOf(X.sAtW(P.west, P.face), P.west), uEast = uOf(X.sAtW(P.east, P.face), P.east);
  avivaSlabs().forEach((s, i) => { extraSites[`avivaSlab${i}`] = s; });
  Object.assign(extraSites, {
    avivaPodium: xingBox(X.sAtW(P.west, P.face), P.north, P.west - 0.5, P.east),
    avivaPodiumFront: xingRoadBox(uWest - 0.5, uEast, P.face, P.face + P.stairs + 4),
    lansdowneTrack: xingBox(-62, -15, -9, 9),
    lansdowneStation: { ...X.atRoad(20, -13.5), rot: X.roadRot, w: 8, d: 5 },
  });
}
// the two quadrant screen walls, as steps inside the curve (column line radius 31 m, centre (+-23.35, 31.4))
for (const s of [-1, 1]) {
  const edges = [23.9, 31, 38, 44, 49, 53, 55.4];
  for (let k = 0; k < edges.length - 1; k++) {
    const a = edges[k], b = edges[k + 1], dx = a - 23.35;
    const v0 = 31.4 - Math.sqrt(32 * 32 - dx * dx);
    if (v0 > 16) continue; // the main block already covers it
    extraSites[`boiQuad${s < 0 ? 'W' : 'E'}${k}`] = s < 0 ? boiBox(-b, -a, v0, 17) : boiBox(a, b, v0, 17);
  }
}
// the Westmoreland Street footpath in front of the east front north of the Lords portico widens northwards (the
// portico's column line is ~17 degrees off the street): keep it open, stepping out to the footpath's edge
{
  const wm = wayBetween('CG1', 'WM1'), A = N('CG1'), B = N('WM1');
  for (let k = 0; k < 4; k++) {
    const v0 = 57.6 + k * 5.35, v1 = v0 + 5.35;
    let gap = Infinity;
    for (const v of [v0, v1]) {
      const p = boiAt(51.85, v), t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, A), v2.sub(B, A)) / v2.dot(v2.sub(B, A), v2.sub(B, A))));
      gap = Math.min(gap, v2.len(v2.sub(p, v2.lerp(A, B, t))) - wm.width / 2 - wm.pave);
    }
    if (gap > 1) extraSites[`boiWalk${k}`] = boiBox(51.85, 51.85 + gap / BOI.sx, v0, v1);
  }
}

// the rest of the Barrow Street hero: every building box, Google Docks' south-east wedge, the station's stair tower on
// Barrow Street and the DART embankment pieces (all kept free of filler, and solid)
Object.assign(extraSites, Object.fromEntries(Object.entries(BS).map(([k, b]) => ['bs_' + k, b])));
extraSites.bs_mvWedge = { x: 735.5, z: 423.5, rot: -0.108, w: 11, d: 14 };
extraSites.bs_stairs = { x: 737, z: 434.4, rot: 0, w: 4.4, d: 4.4 };
bsRail.forEach((b, i) => { extraSites['bs_rail' + i] = b; });
// Boland's Quay's open plaza on the dock edge, between the mill, the towers and the balconied warehouse (open, not solid)
extraSites.bsPlaza = bsLayout.plaza;

// the O'Connell Street monuments on their islands down the middle of the street (src/world/oconnell.js)
Object.assign(extraSites, monumentSites);
// College Green's islands (Davis and the Four Angels, Grattan), Molly Malone and St Andrew's Church on Suffolk Street
Object.assign(extraSites, collegeGreenSites);
// Kildare Street / Merrion Street (src/world/kildarelayout.js): the Library, Museum, Leinster House and its wings, the
// Natural History Museum, the Gallery, Government Buildings, the Shelbourne; the forecourt, the lawn, the courtyard
for (const [k, b] of Object.entries(KD_BOXES)) extraSites['kd_' + k] = b;
for (const [k, b] of Object.entries(KD_OPEN)) extraSites['kdOpen_' + k] = b;
Object.assign(sites, {
  leinsterHouse: { name: 'Leinster House', ...KD_BOXES.leinster, labelY: 26, view: spot('KDK1', 'KDK2', 0.12) },
  govBuildings: { name: 'Government Buildings', ...KD_BOXES.govCentre, labelY: 40, view: spot('MR1', 'MSSW', 0.12) },
  shelbourne: { name: 'The Shelbourne', ...KD_BOXES.shelbourne, labelY: 28, view: spot('DS1', 'KS1', 0.45) },
  mollyMalone: { name: 'Molly Malone', ...collegeGreenSites.molly, labelY: 5, view: spot('CG3', 'KDS1', 0.3) },
});

// ---------- Dublin's tall buildings (docs/research/tallest-buildings.md; built in src/world/towers.js) ----------
// Each stands on its OSM centre and is then slid (along a given direction, in 0.25 m steps) until every part of it is
// clear of the carriageways and their footpaths, the river and the docks, and the neighbouring landmarks. Plans are
// scaled ~0.55-0.6 of real (the map is half scale but the roads are not, so a true 0.5 reads too thin next to them);
// heights are real.
const boxPts = (o, step = 1) => {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), out = [];
  const nx = Math.max(1, Math.ceil(o.w / step)), nz = Math.max(1, Math.ceil(o.d / step));
  for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) {
    const lx = -o.w / 2 + (o.w * i) / nx, lz = -o.d / 2 + (o.d * k) / nz;
    out.push({ x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c });
  }
  return out;
};
const insideBox = (p, o, pad = 0) => {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), dx = p.x - o.x, dz = p.z - o.z;
  return Math.abs(dx * c - dz * s) < o.w / 2 + pad && Math.abs(dx * s + dz * c) < o.d / 2 + pad;
};
function clearSpot(o, avoid, margin) {
  for (const p of boxPts(o)) {
    const r = world.nearestRoad(p.x, p.z);
    if (r && !r.way.pedestrian && r.edgeDist < r.way.pave + margin) return false;
    if (pointInPolygon(p, world.riverPoly) || dockPolys.some((dk) => pointInPolygon(p, dk.poly))) return false;
    if (avoid.some((a) => insideBox(p, a, 0.5))) return false;
    if (world.luasNear(p.x, p.z, 4.5)) return false; // off the Luas tracks and their platforms
  }
  return true;
}
/// slide a group of boxes (all moved together) until they are all clear, trying each direction (compass bearings) and
// taking the shortest move; returns it
// pull: start that far back towards the street (against the first bearing), so a building that fronts the street ends
// up hard against its footpath instead of wherever its OSM centre happened to fall (the roads are not compressed)
function slideClear(boxes, bearings, { avoid = [], margin = 0.4, max = 40, pull = 0 } = {}) {
  if (pull) { const u = unit([].concat(bearings)[0]); for (const b of boxes) { b.x -= u.x * pull; b.z -= u.z * pull; } }
  let best = null;
  for (const brg of [].concat(bearings)) {
    const dir = unit(brg);
    for (let k = 0; k <= max * 4 && (!best || k * 0.25 < best.k); k++) {
      const dx = dir.x * k * 0.25, dz = dir.z * k * 0.25;
      if (boxes.every((b) => clearSpot({ ...b, x: b.x + dx, z: b.z + dz }, avoid, margin))) { best = { k: k * 0.25, dx, dz }; break; }
    }
  }
  if (!best) { console.warn('tall building: no clear spot near', Math.round(boxes[0].x), Math.round(boxes[0].z)); return -1; }
  for (const b of boxes) { b.x += best.dx; b.z += best.dz; }
  return best.k;
}
const unit = (deg) => ({ x: Math.sin((deg * Math.PI) / 180), z: -Math.cos((deg * Math.PI) / 180) }); // compass bearing -> world
const bearingOf = (a, b) => { const d = v2.sub(N(b), N(a)); return (Math.atan2(d.x, -d.z) * 180) / Math.PI; };
// a rotation whose local +x runs along compass bearing `deg` (local +z is then 90 degrees clockwise of it)
const rotAlong = (deg) => { const d = unit(deg); return Math.atan2(-d.z, d.x); };
// parts at real-metre offsets (east, north) from an OSM origin, scaled by k; each box w along bearing brg, d across
function composition(lat, lon, k, brg, parts) {
  const o = project(lat, lon), rot = rotAlong(brg);
  return parts.map(([e, n, w, d, extra]) => ({ x: o.x + k * e, z: o.z - k * n, rot, w: w * k, d: d * k, ...extra }));
}
// real metres (east, north) between two OSM points
const enOf = (lat0, lon0, lat, lon) => [(lon - lon0) * 111320 * Math.cos((lat0 * Math.PI) / 180), (lat - lat0) * 111320];

export const tall = (() => {
  const T = {};
  const arena = [sites.threeArena, sites.threeArena.plaza, sites.convention];
  // Liberty Hall (OSM way 42266091 and its parts): the 17 x 17 m tower on the corner of Eden Quay and Beresford
  // Place, 59.4 m to the top of its plant room; the low theatre wing with its folded roof runs west along the quay.
  {
    const brg = bearingOf('NQ9', 'NQ10');
    const [tower, wing] = composition(53.348462, -6.255344, 0.6, brg, [[0, 0, 17, 17], [-23, -1.5, 22, 19]]);
    slideClear([tower, wing], [brg - 90, brg - 135, brg + 180], { avoid: [sites.customHouse], pull: 8 });
    T.libertyHall = { ...tower, wing, h: 59.4 };
  }
  // College Square (2025, on the Hawkins House site): the 22-storey tower on Tara Street, 82-83 m with its open
  // crown, and the 11-storey office building (43 m) behind it
  {
    const brg = bearingOf('SQ10', 'TA1'); // down Tara Street, southward (local +z is then westward, off the street)
    const [e0, n0] = enOf(53.346646, -6.255447, 53.34618, -6.25615);
    const [tower, office] = composition(53.346646, -6.255447, 0.6, brg, [[0, 0, 26, 22], [e0, n0, 40, 30]]);
    slideClear([tower, office], [brg + 90, brg + 60, brg + 120], { avoid: [sites.oconnellBridgeHouse, extraSites.obhExtension], pull: 8 });
    T.collegeSquare = { ...tower, office, h: 83 };
  }
  // George's Quay Plaza (2002): seven 15 m square glass towers stepped up to the middle one and down again, each under
  // a 7 m glass-and-zinc pyramid (OSM building:parts 1488401186-1205: roofs 31/38/45/52/45/38/31 m, tops +7)
  {
    const lat0 = 53.346784, lon0 = -6.25328;
    const P = [[53.346963, -6.253777, 31], [53.346950, -6.253518, 38], [53.346797, -6.253540, 45], [53.346784, -6.253280, 52],
      [53.346633, -6.253307, 45], [53.346620, -6.253052, 38], [53.346465, -6.253070, 31]];
    const blocks = composition(lat0, lon0, 0.56, 95, P.map(([la, lo, h]) => [...enOf(lat0, lon0, la, lo), 15.3, 15.3, { h }]));
    slideClear(blocks, [180, 135, 225], { pull: 8 });
    T.gqPlaza = { ...blocks[3], blocks };
  }
  // Capital Dock (2018): the 22-storey, 79 m tower on Sir John Rogerson's Quay with the 19-storey tower beside it,
  // and the ten- and nine-storey blocks south of them (OSM parts 1271279149-1271279152)
  {
    const lat0 = 53.345257, lon0 = -6.231011, at = (la, lo) => enOf(lat0, lon0, la, lo);
    const B = composition(lat0, lon0, 0.6, 97, [[...at(53.345257, -6.231011), 16.8, 17.2, { h: 79, fl: 22 }], [...at(53.345240, -6.231266), 17, 16.1, { h: 66, fl: 19 }],
      [...at(53.344872, -6.231219), 32.5, 40.9, { h: 36, fl: 10 }], [...at(53.345067, -6.231206), 13, 12, { h: 33, fl: 9 }]]);
    slideClear(B, [187, 150, 220], { pull: 30 });
    T.capitalDock = { ...B[0], parts: B };
  }
  // The Exo Building (2022, 73 m, 17 storeys): the tower part only (37.8 m north-south); its eight-storey wing south of
  // it would stand in East Wall Road here. The tower keeps west of East Wall Road and north of the 3Arena's forecourt,
  // at 0.5 across (a slimmer footprint) and 0.55 along.
  {
    const brg = bearingOf('NQ19', 'EW2') - 90; // across East Wall Road, westward
    const [t] = composition(53.347978, -6.227434, 1, brg, [[0, 0, 9.4, 20.8]]);
    slideClear([t], [brg, brg + 45, brg + 90], { avoid: arena, max: 60, pull: 6 });
    T.exo = { ...t, h: 73 };
  }
  // Grand Canal Dock, south side: the Millennium Tower on Charlotte Quay (1998, 16 storeys, 63 m to the mast) at the
  // water's edge, and Alto Vetro (2008, 16 storeys, 52 m), the glass blade at the corner of Grand Canal Quay and
  // Ringsend Road where the canal comes into the basin
  {
    const brg = bearingOf('RR1', 'CQ1');
    const [m] = composition(53.342856, -6.236881, 0.52, brg, [[0, 0, 21.5, 19.7]]);
    slideClear([m], [brg + 90, brg - 90, brg, brg + 180], { max: 30 });
    T.millennium = { ...m, h: 63 };
    const [a] = composition(53.342245, -6.238723, 0.55, 97, [[0, 0, 9.6, 20.9]]);
    slideClear([a], [270, 180, 225, 315], { max: 30 });
    T.altoVetro = { ...a, h: 52 };
  }
  // John's Lane Church (SS Augustine and John, Pugin & Ashlin 1862-95): the nave runs north from Thomas Street, the
  // tower and 70 m spire over the entrance on the street
  {
    const brg = bearingOf('CM', 'TS1'); // Thomas Street, westward
    const [c] = composition(53.343151, -6.277518, 0.55, brg + 180, [[0, 0, 24.3, 50.4]]);
    slideClear([c], [brg + 90, brg + 45, brg + 135], { pull: 8 });
    T.johnsLane = { ...c, h: 70.4 };
  }
  // St George's Church, Hardwicke Place (Francis Johnston, 1802-13): Ionic portico and a 61 m steeple facing
  // south-west down Hardwicke Street; Hardwicke Place is not in the street graph, so it stands inside its block
  {
    const [c] = composition(53.357368, -6.262781, 0.55, 126, [[0, 0, 24, 40]]);
    slideClear([c], [36, 126, 306], {});
    T.stGeorges = { ...c, h: 61 };
  }
  // Findlater's Church (Abbey Presbyterian, 1864): on the corner of Parnell Square North and Frederick Street North,
  // the gable and the corner spire (55 m) to the square, the nave running up Frederick Street
  {
    const brg = bearingOf('RN03', 'RN13'); // up Frederick Street
    const [c] = composition(53.354566, -6.263908, 0.55, brg - 90, [[0, 0, 18.3, 39]]);
    slideClear([c], [brg, brg - 45, brg - 90], { pull: 6 });
    T.findlaters = { ...c, h: 54.9 };
  }
  return T;
})();
// ---------- North city: Clerys, Parnell Square, Busáras (docs/research/north-city.md) ----------
// One Blender hero (tools/blender/build_northcity.py -> public/models/northcity.glb) with a root per building, each
// built in game metres in its own front frame: u along the front, v into the building, origin at the middle of the
// front at ground level. A frame is placed by a point and the direction d of u (the building is to the LEFT of d);
// three.js rotation.y = atan2(-d.z, d.x), as for the 3Arena. Keep the dimensions here in step with the build script.
export const NC = (() => {
  // a frame: origin p, u along d, v to the left of d
  const frame = (p, d) => {
    const n = { x: d.z, z: -d.x };
    const at = (u, v) => ({ x: p.x + d.x * u + n.x * v, z: p.z + d.z * u + n.z * v });
    const box = (u0, u1, v0, v1) => ({ ...at((u0 + u1) / 2, (v0 + v1) / 2), rot: Math.atan2(-d.z, d.x), w: u1 - u0, d: v1 - v0 });
    return { x: p.x, z: p.z, rot: Math.atan2(-d.z, d.x), d, n, at, box };
  };
  // the road edge (back of the footpath) of a->b, pushed a further `extra` to its left, as a point and direction
  const edge = (a, b, extra = 0) => {
    const A = N(a), B = N(b), d = v2.norm(v2.sub(B, A)), way = wayBetween(a, b), off = way.width / 2 + way.pave + extra;
    return { p: { x: A.x + d.z * off, z: A.z - d.x * off }, d, A, B };
  };
  const meet = (e, f) => { // where two edge lines cross
    const den = e.d.x * f.d.z - e.d.z * f.d.x, t = ((f.p.x - e.p.x) * f.d.z - (f.p.z - e.p.z) * f.d.x) / den;
    return { x: e.p.x + e.d.x * t, z: e.p.z + e.d.z * t };
  };
  const walk = (p, d, s) => ({ x: p.x + d.x * s, z: p.z + d.z * s });

  // Clerys (Robert Atkinson, 1922) on the east side of O'Connell Street Lower, facing the GPO. The front runs
  // southbound (so the building is on its left); the clock hangs over the main entrance, south of the middle.
  const bw = wayBetween('OC1', 'OC2');
  const sClock = chainageOf(project(53.3492209, -6.2596962)); // OSM 1348371011, "Clery's Clock"
  const cp = along(sClock + CLERYS.clockU, -(bw.width / 2 + bw.pave + 0.2));
  const clerys = frame(cp, { x: -cp.dir.x, z: -cp.dir.z });

  // Parnell Square: the Rotunda block between Parnell Street, Cavendish Row, Parnell Square East, North and West
  const pSt = edge('RN01', 'OC4'), cav = edge('OC4', 'RN04'), east = edge('RN04', 'RN03'), north = edge('RN03', 'RN02'), west = edge('RN02', 'RN01');
  const SW = meet(west, pSt), SE = meet(pSt, cav), KINK = meet(cav, east), NE = meet(east, north), NW = meet(north, west);
  // the hospital's front stands behind a railed forecourt (ref 02), its main block 26.5 m in from the west corner
  const rotunda = frame(walk(walk(SW, pSt.d, PARNELL.rotundaS), { x: pSt.d.z, z: -pSt.d.x }, PARNELL.forecourt), pSt.d);
  // the Ambassador drum sits in the corner facing up O'Connell Street, just clear of both footpaths
  const R = PARNELL.drumR + 0.6;
  const drum = meet({ p: walk(pSt.p, { x: pSt.d.z, z: -pSt.d.x }, R), d: pSt.d }, { p: walk(cav.p, { x: cav.d.z, z: -cav.d.x }, R), d: cav.d });
  // the Gate faces Cavendish Row, its north end at the bend into Parnell Square East
  const gate = frame(walk(KINK, cav.d, -PARNELL.gateW / 2 - 0.4), cav.d);
  // the Garden of Remembrance fills the north end, along Parnell Square North, behind its railings
  // (a trapezoid: its west end runs parallel to Parnell Square West; u runs west, v south into the square)
  const garden = frame(walk(walk(NE, north.d, 1.5 + PARNELL.gardenW / 2), { x: north.d.z, z: -north.d.x }, 0.6), north.d);
  const { gardenW: GW, gardenD: GD, gardenKW: GK } = PARNELL;
  garden.poly = [garden.at(-GW / 2, 0), garden.at(GW / 2, 0), garden.at(GW / 2 - GK * GD, GD), garden.at(-GW / 2, GD)];

  // Busáras (Michael Scott, 1953) between Store Street, Beresford Place and Amiens Street: squared to Store Street,
  // the concourse and its wavy canopy on the Beresford Place side, the bus yard east of it towards Amiens Street
  // (left open: the railway comes along Amiens Street and over Store Street to Connolly)
  const st = edge('ST1', 'BP2'), bp = edge('BP2', 'BP3');
  const bsw = meet(st, bp);
  const busaras = frame(walk(walk(bsw, { x: 1, z: 0 }, BUSARAS.w / 2 + 0.3), { x: 0, z: -1 }, 0.4), { x: 1, z: 0 });
  return { clerys, rotunda, drum, gate, garden, busaras, block: [SW, SE, KINK, NE, NW] };
})();
// the Places list and the filler, from the frames above
Object.assign(sites, {
  clerys: { name: 'Clerys', ...NC.clerys.box(-CLERYS.w / 2, CLERYS.w / 2, 0, CLERYS.d), labelY: 28, view: spot('OC1', 'OC2', 0.25) },
  rotunda: { name: 'Parnell Square and the Rotunda', ...NC.rotunda.box(-26, PARNELL.linkU, 0, 14), labelY: 36, view: spot('OC3', 'OC4', 0.4) },
  gardenOfRemembrance: { name: 'Garden of Remembrance', ...NC.garden.box(-PARNELL.gardenW / 2, PARNELL.gardenW / 2 - PARNELL.gardenKW * PARNELL.gardenD / 2, 0, PARNELL.gardenD / 2), labelY: 14, view: spot('RN02', 'RN03', 0.3) },
  busaras: { name: 'Busáras', ...NC.busaras.box(-BUSARAS.w / 2, BUSARAS.w / 2, 0, BUSARAS.d), labelY: 32, view: spot('NQ10', 'NQ11', 0.6) },
});
Object.assign(extraSites, {
  // the hospital's rear ranges, the Ambassador (its drum's square), the Gate, and Busáras's open bus yard (not solid)
  rotundaRear: NC.rotunda.box(-26, 19, 14, 34),
  ambassador: { x: NC.drum.x, z: NC.drum.z, rot: NC.rotunda.rot, w: PARNELL.drumR * 2, d: PARNELL.drumR * 2 },
  gate: NC.gate.box(-PARNELL.gateW / 2, PARNELL.gateW / 2, 0, PARNELL.gateD),
  gardenSouth: NC.garden.box(-PARNELL.gardenW / 2, PARNELL.gardenW / 2 - PARNELL.gardenKW * PARNELL.gardenD, PARNELL.gardenD / 2, PARNELL.gardenD),
  busarasYard: NC.busaras.box(BUSARAS.w / 2, BUSARAS.w / 2 + 22, 0, BUSARAS.d),
});
const northCityFootprints = [sites.clerys, sites.rotunda, sites.gardenOfRemembrance, sites.busaras, extraSites.rotundaRear, extraSites.ambassador, extraSites.gate, extraSites.gardenSouth, extraSites.busarasYard];

// the notable ones join the Places list; every part is kept free of filler and checked by footprints.mjs
Object.assign(sites, {
  libertyHall: { name: 'Liberty Hall', ...tall.libertyHall, labelY: 62, view: spot('NQ8', 'NQ9', 0.35) },
  georgesQuayPlaza: { name: "George's Quay Plaza", ...tall.gqPlaza, labelY: 62, view: spot('SQ9', 'SQ10', 0.35) },
  collegeSquare: { name: 'College Square', ...tall.collegeSquare, labelY: 86, view: spot('TA1', 'SQ10', 0.25) },
  capitalDock: { name: 'Capital Dock', ...tall.capitalDock, labelY: 82, view: spot('SQ16', 'SQ17', 0.3) },
  exo: { name: 'The Exo Building', ...tall.exo, labelY: 76, view: spot('NQ16', 'NQ17', 0.5) },
  johnsLane: { name: "John's Lane Church", ...tall.johnsLane, labelY: 72, view: spot('TS2', 'TS1', 0.5) },
  stGeorges: { name: "St George's Church", ...tall.stGeorges, labelY: 63, view: spot('RN43', 'RN16', 0.6) },
  findlaters: { name: "Findlater's Church", ...tall.findlaters, labelY: 57, view: spot('RN02', 'RN03', 0.4) },
});
Object.assign(extraSites, {
  libertyHallWing: tall.libertyHall.wing, collegeSquareOffice: tall.collegeSquare.office,
  millenniumTower: tall.millennium, altoVetro: tall.altoVetro,
  ...Object.fromEntries(tall.gqPlaza.blocks.map((b, i) => [`gqPlaza${i}`, b])),
  ...Object.fromEntries(tall.capitalDock.parts.slice(1).map((b, i) => [`capitalDock${i + 1}`, b])),
});
const tallFootprints = [sites.libertyHall, sites.collegeSquare, sites.capitalDock, sites.exo, sites.johnsLane, sites.stGeorges, sites.findlaters,
  ...Object.entries(extraSites).filter(([k]) => /^(libertyHallWing|collegeSquareOffice|millenniumTower|altoVetro|gqPlaza\d|capitalDock\d)$/.test(k)).map(([, s]) => s)];

// the famous pubs join the Places list (the Temple Bar, the Long Hall, the Bleeding Horse, Copper Face Jacks and
// O'Donoghue's; Kehoe's, Grogan's, Davy Byrnes, Mulligan's and Flannery's are built but not listed)
for (const p of Object.values(pubSites)) {
  if (p.place) sites[p.key] = { name: p.name, x: p.x, z: p.z, rot: p.rot, w: p.w, d: p.d, labelY: 20, view: p.view, blurb: p.blurb };
}
// ...and the Grafton quarter's landmarks: the Gaiety Theatre, Powerscourt Townhouse and George's Street Arcade
for (const p of Object.values(gqSites)) {
  if (p.place) sites[p.key] = { name: p.name, x: p.x, z: p.z, rot: p.rot, w: p.w, d: p.d, labelY: 24, view: p.view, blurb: p.blurb };
}
// the Liffey's riverside landmarks (src/world/liffeysites.js, docs/research/liffey-quays.md) join the Places list
Object.assign(sites, {
  famine: { name: 'Famine Memorial', ...LQ.FAMINE.site, view: spot('NQ12', 'NQ13', 0.04) },
  jeanieJohnston: { name: 'Jeanie Johnston', x: LQ.SHIP.x, z: LQ.SHIP.z, rot: LQ.SHIP.rot, w: LQ.SHIP.w, d: LQ.SHIP.d, labelY: 24, water: true, view: spot('NQ13', 'NQ12', 0.12) },
  millenniumBridge: { name: 'Millennium Bridge', ...LQ.MILLENNIUM, view: spot('SQ4', 'SQ5', 0.72) },
  ocaseyBridge: { name: "Seán O'Casey Bridge", ...LQ.OCASEY, view: spot('SQ12', 'SQ13', 0.2) },
});
extraSites.chq = { ...LQ.CHQ };

// Footprints the filler generator must avoid (landmark buildings; parks/campus handled separately).
export const reserved = [
  sites.gpo, sites.bankOfIreland, ...Object.entries(extraSites).filter(([k]) => k.startsWith('boi')).map(([, s]) => s), sites.christChurch, sites.stPatricks, extraSites.iveaghPlay, sites.customHouse, sites.trinity, ...grounds,
  sites.cityHall, sites.centralBank, extraSites.olympia, extraSites.clockCorner,
  extraSites.bewleys, extraSites.brownThomas, extraSites.weir, extraSites.sgCentre, extraSites.merchantsHall, extraSites.tbSquare,
  // the famous pubs (src/world/pubsites.js) and the Grafton quarter's fronts (src/world/graftonsites.js)
  ...Object.values(gqSites),
  ...Object.values(pubSites),
  shifted(extraSites.sgCentre, -extraSites.sgCentre.w / 2 - 8, 0, 16, extraSites.sgCentre.d), // broad footpath facing the Green
  { ...extraSites.castle, w: 44, d: 36, ...shifted(extraSites.castle, 0, -16, 44, 34) },
  shifted(sites.convention, 0, sites.convention.d / 2 + 6.5, sites.convention.w, 13), // its forecourt
  sites.grandCanalSt, shifted(sites.grandCanalSt, 0, sites.grandCanalSt.d / 2 + 3.25, sites.grandCanalSt.w + 4, 6.5), // its raised forecourt
  shifted(sites.grandCanalSt, sites.grandCanalSt.w / 2 + 9, 3, 18, sites.grandCanalSt.d + 6.5), // open corner to Grattan Street (steps, parking)
  sites.fourCourts, extraSites.fcPortico,
  sites.heuston, sites.guinness, sites.convention, sites.threeArena, sites.threeArena.plaza, sites.grandCanal, sites.grandCanal.square,
  // the Luas terminus at The Point: both platforms and their shelters, from the end of the track back past the stop
  (() => { const a = N('PT'), b = N('PTE'), L = v2.len(v2.sub(b, a)), dir = v2.norm(v2.sub(b, a)); return { ...v2.lerp(a, b, 0.5), rot: Math.atan2(dir.x, dir.z), w: 15, d: L + 6 }; })(),
  // Heuston's forecourt, open to the quay
  // Heuston forecourt: the Luas stop, bus bays and lawn in front of the east front, kept open to the road
  { x: heustonFront.x + 16, z: heustonFront.z + 4, rot: 0.14, w: 30, d: 44 },
  // Dr Steevens' Hospital (1720s): across St John's Road West from the station, facing north over its lawn
  (extraSites.steevens = { ...at(53.34537, -6.29229), rot: Math.PI, w: 40, d: 30 }),

  // Grand Canal Square: the Marker on the north side, 4-5 GCS across Misery Hill (its main block and the strip along
  // Misery Hill, so the box stays off the road), 2 GCS behind the theatre, the car park stair on the square, and 1 GCS
  sites.marker,
  (extraSites.gcsNorth = fitBox(GCSQ.north.filter((p) => p.z < 141), -0.02)),
  (extraSites.gcsNorthS = fitBox([P(621, 139), P(641.5, 146.4), P(641.5, 138), P(621, 131)], -Math.atan2(7.4, 20.5))),
  (extraSites.gcsSouth = fitBox(GCSQ.south, -0.05)),
  (extraSites.gcsWedge = fitBox(GCSQ.wedge, -0.16)),
  // open paving between the theatre, the square and 1 GCS, out to the dock (no filler in front of the theatre)
  (extraSites.gcsPlaza = { x: 668, z: 194.5, rot: 0, w: 46, d: 7 }),
  (extraSites.gcsOffice = fitBox(GCSQ.one, -0.13)),
  // St James's Gate, in the brewery wall on James's Street
  (extraSites.jamesGate = { ...beside('TS3', 'JS1', 0.5, 1, 14, 4, { gap: 0.2 }) }),
  // the St James's Gate skyline round the Storehouse (placed with it, src/world/heroes.js placeGuinness): the Power
  // House, the stacks that stand clear of it, and St Patrick's Tower
  (extraSites.gsPower = { ...sites.guinness.parts.powerhouse, w: 18.4, d: 31.7 }),
  ...['stack_w', 'stack_e', 'stack_cream'].map((k) => (extraSites['gs_' + k] = { ...sites.guinness.parts[k], rot: 0, w: 4.4, d: 4.4 })),
  (extraSites.gsTower = { ...sites.guinness.parts.tower, rot: 0, w: 11, d: 11 }),
  ...sites.guinness.tankBanks.map((b, i) => (extraSites['gsTanks' + i] = b)),
  // the brewery's boundary wall along Victoria Quay and the yard behind it (landmarks.js breweryWall), trimmed clear of
  // the Watling Street and St John's Road junctions
  ...[['UI1', 'VQ1', 10, 3], ['VQ1', 'VQ2', 2, 16]].map(([a, b, t0, t1], i) => {
    const A = N(a), B = N(b), L = Math.hypot(B.x - A.x, B.z - A.z);
    return (extraSites['breweryWall' + i] = { ...beside(a, b, 0.5, 1, L - t0 - t1, 14, { gap: 0.1, shift: (t0 - t1) / 2 }), gate: i === 0 });
  }),
  // the Synod Hall across Winetavern Street from Christ Church
  sites.christChurch.synod,
  // Croke Park: the bowl, the Hogan's rear block (trimmed clear of Jones's Road), Hill 16 and the Nally terrace, the
  // Cusack's deck stacks, the Davin's span over the Royal Canal with its stair towers, and the entrance plaza south of them
  sites.crokePark,
  (extraSites.cpHogan = cpBox(-100, 60, -118, -84)), (extraSites.cpHill = cpBox(54, 112, -100, 86)), (extraSites.cpCusack = cpBox(-90, 47, 84, 112)),
  (extraSites.cpDavin = cpBox(-150, -114, -45, 45)), (extraSites.cpPlaza = cpBox(-176, -150, -40, 40)),
  // the GSWR embankment either side of its bridges over Jones's Road and Ballybough Road
  ...(extraSites.railBridges = [railBridge('KP9', 103), railBridge('KP21', 107)]).flatMap((b, i) => b.stubs.map((s, k) => (extraSites[`railStub${i}${k}`] = s))),
  // Aviva Stadium: its fitted footprint, the west podium over the DART and the Lansdowne Road station
  ...Object.entries(extraSites).filter(([k]) => /^aviva|^lansdowneT|^lansdowneS/.test(k)).map(([, s]) => s),
  (extraSites.shelbournePark = shelbournePark),
  // O'Connell Bridge House: the tower, its extension, and the wedge of pavement between its front and Burgh Quay
  sites.oconnellBridgeHouse, extraSites.obhExtension,
  { ...obh.at(obh.w / 4, obh.d / 2 + 3), rot: obh.rot, w: obh.w / 2, d: 6 },
  // the Criminal Courts of Justice, and its paved forecourt and plane trees between the drum and Infirmary Road
  sites.ccj,
  // Barrow Street, Google and Boland's Quay (src/data/barrowst.json)
  sites.google, extraSites.bsPlaza, ...Object.entries(extraSites).filter(([k]) => k.startsWith('bs_')).map(([, s]) => s),
  (extraSites.ccjForecourt = { x: CCJ.x + 34, z: CCJ.z + 9, rot: 0, w: 14, d: 30 }),
  // ...and the grounds behind it, out to the park wall (the green's edge, src/data/streets.json) on the west and north
  (extraSites.ccjWest = { x: CCJ.x - 34, z: CCJ.z - 10, rot: 0, w: 18, d: 38 }),
  (extraSites.ccjNorth = { x: CCJ.x - 6, z: CCJ.z - 29, rot: 0, w: 38, d: 8 }),
  // Kildare Street / Merrion Street, the Shelbourne, St Andrew's Church and Molly's corner (not the College Green islands)
  ...Object.entries(extraSites).filter(([k]) => /^kd_|^kdOpen_|^stAndrews/.test(k)).map(([, s]) => s), sites.mollyMalone,
  // CHQ on Custom House Quay (src/world/liffey.js)
  extraSites.chq,
  // the tall buildings (src/world/towers.js)
  ...tallFootprints,
  // Kilmainham: the gaol enclosure, the Royal Hospital, the Richmond Tower and the rest of their parts (KH above)
  sites.kilmainhamGaol, sites.royalHospital, sites.richmondTower, ...Object.entries(extraSites).filter(([k]) => k.startsWith('kh_')).map(([, s]) => s),
  // the Heuston rail yards between St John's Road West and the Liffey, out to the SCR: no filler
  ...heustonYard(),
  // Clerys, Parnell Square (the Rotunda, the Ambassador, the Gate, the Garden of Remembrance) and Busáras
  ...northCityFootprints,
  // the DART viaduct between its street bridges (railline.js), Connolly's front, Pearse's front on Westland Row, and
  // the Tara Street fire station's tower
  ...railFootprints().map((b, i) => (extraSites[`rail${i}`] = b)),
  sites.connolly,
  (extraSites.pearseFront = (() => { const F = pearseFront(); return F ? fitBox(F.poly, Math.atan2(F.poly[1].x - F.poly[0].x, F.poly[1].z - F.poly[0].z)) : null; })()),
  (extraSites.fireTower = { x: fireTower.x, z: fireTower.z, rot: 0, w: fireTower.w + 1, d: fireTower.w + 1 }),
].filter(Boolean);

// The rail yards west of Heuston: open ground (tracks, sidings, the station car park) from the station's west end to
// the South Circular Road, between St John's Road West and the river. A grid of boxes north of the road.
function heustonYard() {
  const road = ['SJ2', 'KHM0', 'SJ3', 'KHS1', 'KHS2', 'KHS3', 'KHS4', 'KHS5', 'KHJ'].map((id) => N(id));
  const scr = N('KHN3').x + 5.5 + 3.5 + 2;
  const out = [];
  for (let x = -1640; x < -1340; x += 12) for (let z = -40; z < 210; z += 12) {
    const p = { x: x + 6, z: z + 6 };
    if (p.x < scr + 6 || pointInPolygon(p, world.riverPoly)) continue;
    // north of St John's Road West: the road's z at this x, less its half width and footpath
    let rz = null;
    for (let i = 0; i + 1 < road.length; i++) { const a = road[i], b = road[i + 1]; if ((a.x - p.x) * (b.x - p.x) <= 0 && a.x !== b.x) rz = a.z + ((p.x - a.x) / (b.x - a.x)) * (b.z - a.z); }
    if (rz === null || p.z > rz - 7 - 3.5 - 6.5) continue;
    if (p.x > -1350 && p.z > 20) continue; // Heuston's own west end
    out.push({ ...p, rot: 0, w: 12, d: 12 });
  }
  return out;
}

export { campusPolys, parkPolys };
