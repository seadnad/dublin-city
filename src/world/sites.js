// Landmark sites, anchored to street-graph nodes so they always sit correctly against the roads.
// Each site: position, rotation (local +z faces the street), footprint (w along street, d deep),
// a label height, and a teleport spot on a nearby road looking at it.
import { world, v2, PAVEMENT, pointInPolygon, laneOffset, project } from './geo.js';
import { bridges, parkPolys, campusPolys } from './ground.js';

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
const hpA = N('NQ6'), hpB = N('SQ6');
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
const heustonAt = (along, w, d) => {
  const a = N('SJ1'), c = N('SJ3'), dir = v2.norm(v2.sub(c, a)), south = { x: dir.z, z: -dir.x };
  const off = 36; // road half width + footpath, the bend at SJ2, and half the station's width
  return { x: a.x + dir.x * along + south.x * off, z: a.z + dir.z * along + south.z * off, rot: Math.atan2(-dir.x, -dir.z), w, d };
};
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
    view: spot('SQ7', 'SQ6', 0.15),
  },
  trinity: {
    name: 'Trinity College', ...trinityFront, labelY: 36, campanile,
    view: spot('CG0', 'CGT', 0.3),
  },
  cityHall: {
    // at the top of Parliament Street, where Dame Street becomes Lord Edward Street
    name: 'City Hall', ...beside('DM2', 'DM3', 1, 1, 26, 24, { shift: -5, gap: 3 }), labelY: 30,
    view: spot('SQ4', 'PARL', 0.55),
  },
  centralBank: {
    name: 'Central Bank', ...beside('DMc', 'DM1', 0.5, -1, 26, 18, { gap: 7 }), plaza: 6, labelY: 44,
    view: spot('DM2', 'DM1', 0.35),
  },
  bankOfIreland: {
    name: 'Bank of Ireland', ...(() => {
      const arm = wayBetween('CGT', 'CGM'), W = 36, L = v2.len(v2.sub(N('CG0'), N('CGT')));
      return beside('CGT', 'CG0', (arm.width / 2 + arm.pave + 1 + W / 2) / L, -1, W, 32, { gap: 0.5 });
    })(), labelY: 28,
    view: spot('DM1', 'DMc', 0.2),
  },
  christChurch: {
    // set back in its grounds in the block between Winetavern St, Fishamble St and Christchurch Place
    name: 'Christ Church Cathedral', x: N('HS1').x + 34, z: N('HS1').z - 36, rot: 0, w: 46, d: 22, labelY: 52,
    view: spot('SQ2', 'HS1', 0.3),
  },
  customHouse: {
    name: 'Custom House', ...beside('NQ10', 'NQ11', 1, 1, 100, 24, { gap: 3 }), labelY: 50,
    view: spot('SQ9', 'SQ10', 0.3),
  },
  heuston: {
    name: 'Heuston Station', ...heustonAt(8 + 14 + 52, 34, 104), labelY: 30,
    view: spot('WT2', 'VQ2', 0.55),
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
    // the precast-concrete office block on the corner of Grattan Street
    name: 'Grand Canal Street', ...beside('GC1', 'GCM', 0.3, -1, 24, 20, { gap: 1 }), labelY: 30,
    view: spot('MSNE', 'GC1', 0.8),
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
  shifted(sites.christChurch, 3, 6, 60, 44),
  shifted(sites.customHouse, 0, -3, 124, 34),
];

// Smaller landmarks that are modelled but not in the teleport list
export const extraSites = {
  // the Cork Hill gate of Dublin Castle, on Lord Edward Street (the Upper Yard sits behind it)
  castle: beside('DM3', 'LE1', 0.55, 1, 40, 2, { gap: 0.5 }),
  // 72 Dame Street, on the Temple Bar side like the Central Bank
  olympia: beside('DM2', 'DM3', 0.35, -1, 12, 16, { gap: 0.15 }),
  clockCorner: beside('CG0', 'DMc', 0.22, 1, 16, 16, { gap: 0.15 }),
  // Grafton Street: Bewley's, Brown Thomas at the Wicklow Street corner with Weir & Sons across it,
  // and the St Stephen's Green Shopping Centre at the top
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

// Footprints the filler generator must avoid (landmark buildings; parks/campus handled separately).
export const reserved = [
  sites.gpo, sites.bankOfIreland, sites.christChurch, sites.customHouse, sites.trinity, ...grounds,
  sites.cityHall, sites.centralBank, extraSites.olympia, extraSites.clockCorner,
  extraSites.bewleys, extraSites.brownThomas, extraSites.weir, extraSites.sgCentre,
  shifted(extraSites.sgCentre, -extraSites.sgCentre.w / 2 - 8, 0, 16, extraSites.sgCentre.d), // broad footpath facing the Green
  { ...extraSites.castle, w: 44, d: 36, ...shifted(extraSites.castle, 0, -16, 44, 34) },
  shifted(sites.convention, 0, sites.convention.d / 2 + 6.5, sites.convention.w, 13), // its forecourt
  sites.grandCanalSt, sites.heuston, sites.guinness, sites.convention, sites.threeArena, sites.grandCanal, sites.grandCanal.square,
  // Heuston's forecourt, open to the quay
  heustonAt(8 + 7, 34, 14), // its forecourt

  // the Marker Hotel on Pearse Street, south side of the square
  (extraSites.marker = { ...at(53.34454, -6.2391), rot: 0, w: 36, d: 12 }),
  (extraSites.gcsOffice = { ...at(53.34348, -6.2392), rot: Math.PI, w: 26, d: 26 }),
  // St James's Gate, in the brewery wall on James's Street
  (extraSites.jamesGate = { ...beside('TS3', 'JS1', 0.5, 1, 14, 4, { gap: 0.2 }) }),
  // Synod Hall across Winetavern Street from Christ Church
  (() => {
    const cc = sites.christChurch;
    return { x: N('HS1').x - 17, z: cc.z - 2, rot: cc.rot, w: 16, d: 18 };
  })(),
].filter(Boolean);

export { campusPolys, parkPolys };
