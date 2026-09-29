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
    view: spot('WM1', 'SQ8', 0.35),
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
    name: 'Bank of Ireland', ...(() => {
      const arm = wayBetween('CGT', 'CGM'), W = 36, L = v2.len(v2.sub(N('CG0'), N('CGT')));
      return beside('CGT', 'CG0', (arm.width / 2 + arm.pave + 7.5 + W / 2) / L, -1, W, 32, { gap: 0.5 }); // clear of the north arm even at College Green's slope
    })(), labelY: 28,
    view: spot('DMc', 'DAN', 0.2),
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
  stephensGreen: {
    name: "St Stephen's Green", ...centroid(sgPark.poly), rot: 0, w: 0, d: 0, labelY: 30, park: sgPark,
    view: spot('GR2', 'SGNW', 0.35),
  },
};

// Offset a site's centre along its local axes (local +z faces the street).
function shifted(site, lx, lz, w, d) {
  const c = Math.cos(site.rot), s = Math.sin(site.rot);
  return { x: site.x + lx * c + lz * s, z: site.z - lx * s + lz * c, rot: site.rot, w, d };
}
// Open grounds kept free of filler buildings and painted as lawn.
export const grounds = [

  shifted(sites.customHouse, 0, -3, 124, 34),
];

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
  // Grattan's statue on its island in the middle of College Green
  grattan: (() => { const a = N('CGT'), b = N('CG0'), p = v2.lerp(a, b, 0.5), d = v2.norm(v2.sub(b, a)); return { ...p, rot: Math.atan2(d.x, d.z) }; })(),
};

// the O'Connell Street monuments on their islands down the middle of the street (src/world/oconnell.js)
Object.assign(extraSites, monumentSites);

// Footprints the filler generator must avoid (landmark buildings; parks/campus handled separately).
export const reserved = [
  sites.gpo, sites.bankOfIreland, sites.christChurch, sites.stPatricks, extraSites.iveaghPlay, sites.customHouse, sites.trinity, ...grounds,
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
].filter(Boolean);

export { campusPolys, parkPolys };
