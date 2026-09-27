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
const trinityFront = { ...beside('CGT', 'CG3', 0, 1, 64, 20, { gap: 9 }), gap: 9 };
const tfDir = { x: -Math.sin(trinityFront.rot), z: -Math.cos(trinityFront.rot) }; // into the campus
const campanile = { x: trinityFront.x + tfDir.x * 62, z: trinityFront.z + tfDir.z * 62, rot: trinityFront.rot, w: 12, d: 12 };

const sgPark = parkPolys.find((p) => p.name === "St Stephen's Green");

// Heuston: the head building faces east over the station forecourt, the train shed runs west behind it
const heustonFront = project(53.3465, -6.2922);
// Grand Canal Square: theatre at the west end facing east down the square to the dock, the Marker Hotel on its south side
const theatre = beside('MC1', 'MC2', 0.32, 1, 30, 32, { gap: 1 });
const thBack = { x: -Math.sin(theatre.rot), z: -Math.cos(theatre.rot) }; // from the theatre towards the dock
const beckett = bridges.find((b) => b.name === 'Samuel Beckett Bridge');

export const sites = {
  spire: {
    name: 'The Spire', x: N('OC2').x, z: N('OC2').z, rot: Math.atan2(oc.x, oc.z), w: 3, d: 3, labelY: 128,
    view: spot('OC1', 'OC2', 0.1),
  },
  gpo: {
    name: 'GPO', ...beside('OC1', 'OC2', 1, 1, 54, 32, { shift: -30, gap: 3 }), labelY: 34,
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
    name: 'Bank of Ireland', ...beside('CGT', 'CG0', 0.5, -1, 42, 34, { gap: 0.5 }), labelY: 28,
    view: spot('DM1', 'DMc', 0.2),
  },
  christChurch: {
    // set back in its grounds in the block between Winetavern St, Fishamble St and Christchurch Place
    name: 'Christ Church Cathedral', x: N('HS1').x + 34, z: N('HS1').z - 36, rot: 0, w: 46, d: 22, labelY: 52,
    view: spot('SQ2', 'HS1', 0.3),
  },
  customHouse: {
    name: 'Custom House', ...beside('NQ10', 'NQ11', 1, 1, 104, 32, { gap: 3 }), labelY: 50,
    view: spot('SQ9', 'SQ10', 0.3),
  },
  heuston: {
    name: 'Heuston Station', x: heustonFront.x - 52, z: heustonFront.z, rot: Math.PI / 2, w: 34, d: 104, labelY: 30,
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
    name: 'Convention Centre', ...beside('NQ15', 'NQ16', 1, 1, 60, 30, { gap: 2 }), labelY: 40,
    view: spot('NQ14', 'NQ15', 0.35),
  },
  threeArena: {
    name: '3Arena', ...beside('NQ18', 'NQ19', 0.5, 1, 70, 46, { gap: 3 }), labelY: 30,
    view: spot('NQ17', 'NQ18', 0.45),
  },
  grandCanal: {
    name: 'Grand Canal Theatre', ...theatre, labelY: 32,
    square: { x: theatre.x + thBack.x * 31, z: theatre.z + thBack.z * 31, rot: theatre.rot, w: 30, d: 30 },
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
  shifted(sites.customHouse, 0, -6, 128, 50),
];

// Smaller landmarks that are modelled but not in the teleport list
export const extraSites = {
  // the Cork Hill gate of Dublin Castle, on Lord Edward Street (the Upper Yard sits behind it)
  castle: beside('DM3', 'LE1', 0.55, 1, 40, 2, { gap: 0.5 }),
  // 72 Dame Street, on the Temple Bar side like the Central Bank
  olympia: beside('DM2', 'DM3', 0.35, -1, 12, 16, { gap: 0.15 }),
  clockCorner: beside('CG0', 'DMc', 0.22, 1, 16, 16, { gap: 0.15 }),
  // Grattan's statue on its island in the middle of College Green
  grattan: (() => { const a = N('CGT'), b = N('CG0'), p = v2.lerp(a, b, 0.5), d = v2.norm(v2.sub(b, a)); return { ...p, rot: Math.atan2(d.x, d.z) }; })(),
};

// Footprints the filler generator must avoid (landmark buildings; parks/campus handled separately).
export const reserved = [
  sites.gpo, sites.bankOfIreland, sites.christChurch, sites.customHouse, sites.trinity, ...grounds,
  sites.cityHall, sites.centralBank, extraSites.olympia, extraSites.clockCorner,
  { ...extraSites.castle, w: 44, d: 36, ...shifted(extraSites.castle, 0, -16, 44, 34) },
  sites.grandCanalSt, sites.heuston, sites.guinness, sites.convention, sites.threeArena, sites.grandCanal, sites.grandCanal.square,
  // Heuston's forecourt, open to the quay
  { x: heustonFront.x + 12, z: heustonFront.z, rot: Math.PI / 2, w: 34, d: 24 },
  // keep the square open all the way to the water
  { x: theatre.x + thBack.x * 50, z: theatre.z + thBack.z * 50, rot: theatre.rot, w: 30, d: 44 },
  // the Marker Hotel on Pearse Street, south side of the square
  (extraSites.marker = { ...beside('MC2', 'PS5', 0.5, 1, 44, 18, { gap: 0.5 }) }),
  // St James's Gate, in the brewery wall on James's Street
  (extraSites.jamesGate = { ...beside('TS3', 'JS1', 0.5, 1, 14, 4, { gap: 0.2 }) }),
  // Synod Hall across Winetavern Street from Christ Church
  (() => {
    const cc = sites.christChurch;
    return { x: N('HS1').x - 17, z: cc.z - 2, rot: cc.rot, w: 16, d: 18 };
  })(),
].filter(Boolean);

export { campusPolys, parkPolys };
