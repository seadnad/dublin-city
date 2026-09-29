// Landmark sites, anchored to street-graph nodes so they always sit correctly against the roads.
// Each site: position, rotation (local +z faces the street), footprint (w along street, d deep),
// a label height, and a teleport spot on a nearby road looking at it.
import { world, v2, PAVEMENT, pointInPolygon, laneOffset, project } from './geo.js';
import { bridges, parkPolys, campusPolys } from './ground.js';
import { monumentSites } from './oconnell.js';

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
// Grand Canal Square (positions from the OSM footprints): the theatre at the west end with its glass front facing
// east down the square to the water, the Marker Hotel along the north side, 1 Grand Canal Square to the south.
// Theatre local +z faces west (Macken Street), so its glass front (local -z) looks east.
const at = (lat, lon) => project(lat, lon);
const theatre = { ...at(53.34414, -6.23995), rot: -Math.PI / 2, w: 26, d: 34 };
const gcSquare = { ...at(53.34408, -6.23897), rot: -Math.PI / 2, w: 28, d: 33 };
const beckett = bridges.find((b) => b.name === 'Samuel Beckett Bridge');

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
  guinness: {
    name: 'Guinness Storehouse', ...beside('BV1', 'MK1', 0.55, -1, 40, 34, { gap: 2 }), labelY: 44,
    view: spot('MK1', 'BV1', 0.12),
  },
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
    name: '3Arena', ...beside('NQ18', 'NQ19', 0.5, 1, 70, 46, { gap: 3 }), labelY: 30,
    view: spot('NQ17', 'NQ18', 0.45),
  },
  grandCanal: {
    name: 'Grand Canal Theatre', ...theatre, labelY: 32,
    square: gcSquare,
    view: spot('HQM', 'HQ1', 0.55),
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
    view: spot('GR2', 'SGNW', 0.35),
  },
  aviva: {
    // w x d is the bounding box for the map; the filler keeps off the fitted slabs below (extraSites.avivaSlabs)
    name: 'Aviva Stadium', ...avivaCentre, rot: AV_ROT, w: 126, d: 104, labelY: 42,
    outline: avivaLocal(3).map((p) => toWorldRot(avivaCentre, AV_ROT, p)), // the plinth, for collision
    view: spot('AVL2', 'AVLX', 0.2),
  },
  ccj: {
    // w x d: the drum and its terrace for the map and the filler; the outline (with the steps, the screen wall, the
    // stair tower and the service wing) is what collides. Viewed from Parkgate Street, westbound towards the park.
    name: 'Criminal Courts of Justice', x: CCJ.x, z: CCJ.z, rot: 0, w: 50, d: 50, labelY: 34,
    outline: ccjOutline(),
    view: spot('WT3', 'PG1', 0.35),
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
  // Iveagh Play Centre, facing St Patrick's Park across Bull Alley
  iveaghPlay: beside('PK1', 'BD3', 0.5, 1, 34, 15, { gap: 0.3 }),
  // the red pub corner, SE of Temple Bar x Temple Lane South (invented name; the real one is a protected brand)
  redPub: (() => { const tl = wayBetween('DM1', 'TTL'); return beside('TTL', 'TFO', 0, -1, 16, 13, { shift: tl.width / 2 + tl.pave + 8.2, gap: 0.15 }); })(),
  // Temple Bar Square: the flagged square on the south side of Temple Bar, west of Crown Alley
  tbSquare: (() => { const ca = wayBetween('TBQ', 'CCA'); return beside('TBQ', 'TFO', 0, 1, 21, 13, { shift: ca.width / 2 + ca.pave + 10.8, gap: 0.1 }); })(),
  bewleys: beside('GR1', 'GR2', 0.78, -1, 12, 18, { gap: 0.15 }),
  brownThomas: beside('GR1', 'GR2', 0.3, -1, 28, 22, { gap: 0.15 }),
  weir: beside('CG3', 'GR1', 0.9, -1, 10, 14, { gap: 0.15 }),
  sgCentre: (() => {
    const W = 56, D = 54, kss = v2.len(v2.sub(N('KSS1'), N('SGNW')));
    const west = wayBetween('SGNW', 'SGW'); // St Stephen's Green West: its half width and footpath set the corner
    // the Green West road slants ~12 degrees west going south: allow for it so the far end clears the footpath
    return beside('SGNW', 'KSS1', (west.width / 2 + west.pave + 0.4 + D * 0.22 + W / 2) / kss, 1, W, D, { gap: 0.3 });
  })(),
  // Grattan's statue on its island at the east end of College Green, in front of the east arch pavilion, facing
  // west down Dame Street (the island's east tip stays clear of the Trinity junction)
  grattan: (() => { const a = N('CGT'), b = N('CG0'), p = v2.lerp(a, b, 0.31), d = v2.norm(v2.sub(b, a)); return { ...p, rot: Math.atan2(d.x, d.z) }; })(),
  // Parliament House outline beyond the main block: the piazza with its arch pavilions, the porticos on Foster
  // Place and Westmoreland Street, the SE corner block
  boiPiazza: boiBox(-23.9, 23.9, -2.4, 17),
  boiFoster: boiBox(-61, -55.4, 31.7, 46.9),
  boiLords: boiBox(51.85, 63.3, 36.8, 57.6),
  boiCorner: boiBox(51.85, 55.4, 23.5, 36.8),
  // the Lansdowne Road level crossing and the stadium's west podium over the covered way (see lansdowneXing above)
  lansdowneXing,
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

// the O'Connell Street monuments on their islands down the middle of the street (src/world/oconnell.js)
Object.assign(extraSites, monumentSites);

// Footprints the filler generator must avoid (landmark buildings; parks/campus handled separately).
export const reserved = [
  sites.gpo, sites.bankOfIreland, ...Object.entries(extraSites).filter(([k]) => k.startsWith('boi')).map(([, s]) => s), sites.christChurch, sites.stPatricks, extraSites.iveaghPlay, sites.customHouse, sites.trinity, ...grounds,
  sites.cityHall, sites.centralBank, extraSites.olympia, extraSites.clockCorner,
  extraSites.bewleys, extraSites.brownThomas, extraSites.weir, extraSites.sgCentre, extraSites.merchantsHall, extraSites.redPub, extraSites.tbSquare,
  shifted(extraSites.sgCentre, -extraSites.sgCentre.w / 2 - 8, 0, 16, extraSites.sgCentre.d), // broad footpath facing the Green
  { ...extraSites.castle, w: 44, d: 36, ...shifted(extraSites.castle, 0, -16, 44, 34) },
  shifted(sites.convention, 0, sites.convention.d / 2 + 6.5, sites.convention.w, 13), // its forecourt
  sites.grandCanalSt, shifted(sites.grandCanalSt, 0, sites.grandCanalSt.d / 2 + 3.25, sites.grandCanalSt.w + 4, 6.5), // its raised forecourt
  shifted(sites.grandCanalSt, sites.grandCanalSt.w / 2 + 9, 3, 18, sites.grandCanalSt.d + 6.5), // open corner to Grattan Street (steps, parking)
  sites.heuston, sites.guinness, sites.convention, sites.threeArena, sites.grandCanal, sites.grandCanal.square,
  // Heuston's forecourt, open to the quay
  // Heuston forecourt: the Luas stop, bus bays and lawn in front of the east front, kept open to the road
  { x: heustonFront.x + 16, z: heustonFront.z + 4, rot: 0.14, w: 30, d: 44 },
  // Dr Steevens' Hospital (1720s): across St John's Road West from the station, facing north over its lawn
  (extraSites.steevens = { ...at(53.34537, -6.29229), rot: Math.PI, w: 40, d: 30 }),

  // the Marker Hotel on Pearse Street, south side of the square
  (extraSites.marker = { ...at(53.34454, -6.2391), rot: 0, w: 36, d: 12 }),
  (extraSites.gcsOffice = { ...at(53.34348, -6.2392), rot: Math.PI, w: 26, d: 26 }),
  // St James's Gate, in the brewery wall on James's Street
  (extraSites.jamesGate = { ...beside('TS3', 'JS1', 0.5, 1, 14, 4, { gap: 0.2 }) }),
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
  // the Criminal Courts of Justice, and its paved forecourt and plane trees between the drum and Infirmary Road
  sites.ccj,
  (extraSites.ccjForecourt = { x: CCJ.x + 34, z: CCJ.z + 9, rot: 0, w: 14, d: 30 }),
  // ...and the grounds behind it, out to the park wall (the green's edge, src/data/streets.json) on the west and north
  (extraSites.ccjWest = { x: CCJ.x - 34, z: CCJ.z - 10, rot: 0, w: 18, d: 38 }),
  (extraSites.ccjNorth = { x: CCJ.x - 6, z: CCJ.z - 29, rot: 0, w: 38, d: 8 }),
].filter(Boolean);

export { campusPolys, parkPolys };
