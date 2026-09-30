// Famous Dublin pubs (docs/research/pubs.md): where each stands and what its front looks like. Data only; the
// pub-front kit in src/world/pubs.js builds them. sites.js keeps filler out of each footprint and lists the notable ones
// in Places.
//
// A pub is placed beside the game road a -> b, level with its real OSM position `at` [lat, lon] (or flush against the
// cross street when `corner` names the junction's other road node), `w` along the street and `d` deep. Its local +z
// faces the street; faces are painted per segment (see pubs.js for the spec fields).
import { world, v2, project, laneOffset } from './geo.js';

const N = (id) => world.nodes.get(id);
const wayBetween = (a, b) => world.ways.find((w) => {
  const i = w.nodeIds.indexOf(a), j = w.nodeIds.indexOf(b);
  return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
});

export function place(p) {
  const A = N(p.a), B = N(p.b), way = wayBetween(p.a, p.b);
  if (!A || !B || !way) throw new Error(`pub ${p.key}: no road ${p.a}-${p.b}`);
  const L = v2.len(v2.sub(B, A)), dir = v2.norm(v2.sub(B, A)), left = { x: dir.z, z: -dir.x };
  // either the real position `at` (projected onto the road) or `s`, metres from a (rows of fronts, graftonsites.js)
  const P = p.at ? project(p.at[0], p.at[1]) : v2.add(A, v2.scale(dir, p.s)), rel = v2.sub(P, A);
  const side = p.hand || (v2.dot(rel, left) >= 0 ? 1 : -1);
  const n = { x: left.x * side, z: left.z * side }; // away from the road
  let s = Math.max(0, Math.min(L, v2.dot(rel, dir)));
  let cornerSide = 0;
  if (p.corner) {
    // flush against the cross street's footpath: the junction node is whichever end of a -> b the cross street meets
    const C = [p.a, p.b].find((id) => wayBetween(id, p.corner)), cw = wayBetween(C, p.corner);
    const cd = v2.norm(v2.sub(N(p.corner), N(C))), sin = Math.max(0.5, Math.abs(dir.x * cd.z - dir.z * cd.x));
    const sC = v2.dot(v2.sub(N(C), A), dir), toward = Math.sign(s - sC) || (C === p.a ? 1 : -1);
    s = sC + toward * ((cw.width / 2 + cw.pave + 0.2) / sin + p.w / 2);
    // along +dir the local +x axis is dir x side: which local side faces the cross street
    cornerSide = -toward * side;
  }
  const setback = way.width / 2 + way.pave + 0.15 + p.d / 2;
  const centre = () => v2.add(v2.add(A, v2.scale(dir, s)), v2.scale(n, setback));
  if (p.corner) {
    // the back corners too: where the streets don't cross square, slide on until the whole footprint clears the
    // cross street's footpath
    const C = [p.a, p.b].find((id) => wayBetween(id, p.corner)), cw = wayBetween(C, p.corner), NC = N(C);
    const cd = v2.norm(v2.sub(N(p.corner), NC)), need = cw.width / 2 + cw.pave + 0.2;
    const sin = Math.max(0.5, Math.abs(dir.x * cd.z - dir.z * cd.x)), toward = -cornerSide * side;
    for (let it = 0; it < 3; it++) {
      const c0 = centre(), lx = v2.scale(dir, side * cornerSide * p.w / 2);
      const worst = Math.min(...[-1, 1].map((k) => {
        const q = v2.sub(v2.add(v2.add(c0, lx), v2.scale(n, (k * p.d) / 2)), NC);
        return Math.abs(q.x * cd.z - q.z * cd.x);
      }));
      if (worst >= need - 0.01) break;
      s += toward * (need - worst) / sin;
    }
  }
  const c = centre();
  const rot = Math.atan2(-n.x, -n.z);
  // teleport view: in the lane with the pub ahead on the left (or the only way a one-way street allows), ~30 m back
  const fwdOk = way.oneway !== -1, backOk = way.oneway !== 1;
  const forward = (side === 1 && fwdOk) || !backOk;
  const vdir = forward ? dir : v2.scale(dir, -1), vs = forward ? Math.max(4, s - 30) : Math.min(L - 4, s + 30);
  const off = laneOffset(way), q = v2.add(A, v2.scale(dir, vs));
  const view = { x: q.x + vdir.z * off, z: q.z - vdir.x * off, heading: Math.atan2(vdir.x, vdir.z) };
  return { ...p, x: c.x, z: c.z, rot, cornerSide, view, labelY: 20 };
}

// ---- colours shared by several fronts ----
const GOLD = '#d9ad48', CREAM = '#efe6cf';
const DUBLIN_BRICK = '#6e3d2e', RED_BRICK = '#8a4a36', ORANGE_BRICK = '#b25a3c';

export const PUB_SPECS = [
  {
    // The Temple Bar, 47-48 Temple Bar, SE corner of Temple Lane South: the red corner with the gilt fascia, three
    // storeys of dark brick over it, the painted wall name, hanging baskets and scroll lanterns everywhere, and the
    // Irish-named second house to the east (OSM way 294962764)
    key: 'templeBar', name: 'The Temple Bar', place: true, hand: -1, a: 'TTL', b: 'TFO', at: [53.345461, -6.264059], corner: 'DM1', w: 16, d: 13,
    blurb: 'The red corner pub on Temple Lane South, est. 1840',
    front: [
      {
        w: 9.5, floors: 3, fh: 3.05, G: 4.3,
        upper: { wall: 'brick', color: '#6a3a2c', bays: 3, win: 'sash', frame: '#f2efe6', parapet: '#5a3226',
          text: [{ t: 'THE', u: 4.75, y: 7.6, size: 0.5 }, { t: 'TEMPLE BAR', u: 4.75, y: 6.95, size: 0.62 }, { t: 'ESTD. 1840', u: 4.75, y: 6.35, size: 0.42 }], textColor: '#ece6d8', textBay: 1 },
        shop: { paint: '#b3121b', trim: '#7d0c12', wash: 0.32, fascia: '#121212', text: 'THE TEMPLE BAR', letter: GOLD, font: 'serif', nums: '48', numStyle: 'roundel',
          bays: ['win', 'door', 'board', 'win', 'poster'], door: '#9c1016', boardText: ['Importers of', 'TOBACCO'] },
      },
      {
        w: 6.5, floors: 3, fh: 2.95, G: 4.3,
        upper: { wall: 'brick', color: '#7e6a55', bays: 2, win: 'sash', frame: '#f2efe6', parapet: '#6d5b49' },
        shop: { paint: '#b3121b', trim: '#7d0c12', wash: 0.32, fascia: '#121212', text: 'TÁBHAIRNE BHARRA AN TEAMPAILL', letter: GOLD, font: 'serif', textScale: 0.62,
          bays: ['win', 'door'], door: '#9c1016' },
      },
    ],
    side: { upper: { wall: 'brick', color: '#6a3a2c', bays: 3, win: 'sash', frame: '#f2efe6', parapet: '#5a3226' },
      shop: { paint: '#b3121b', trim: '#7d0c12', wash: 0.32, fascia: '#121212', text: 'THE TEMPLE BAR', letter: GOLD, font: 'serif', nums: '48', numStyle: 'roundel',
        bays: ['win', 'win', 'door', 'win'], door: '#9c1016' } },
    baskets: { front: [1.2, 3.4, 5.8, 8.2, 11, 13.8], side: [1.6, 4.4, 7.4, 10.4], y: 1.7, sill: true },
    lanterns: { front: [2.4, 7.2, 12.4], side: [3, 9], y: 2.3 },
    blades: [{ face: 'side', u: 12.2, y: 9.6, w: 1.9, h: 0.75, bg: '#1a0a0c', lines: ['TEMPLE', 'BAR'], color: '#ff3a3a', neon: true },
      { face: 'side', u: 5.5, y: 5.6, w: 0.9, h: 1.2, bg: '#161616', lines: ['THE', 'TEMPLE', 'BAR', 'LIVE MUSIC'], color: GOLD }],
    barrels: { front: [6.6, 9.2], side: [11.5] },
  },
  {
    // The Long Hall, 51 South Great George's Street (1766, the front of 1881): a narrow two-bay house of orange-red brick
    // with white stucco window surrounds and red-and-white striped window blinds, over a deep maroon front with the
    // cream fascia and the name in script, blinds over both doors
    key: 'longHall', name: 'The Long Hall', place: true, hand: -1, a: 'GFFA', b: 'SGGS', at: [53.341856, -6.265315], w: 7.2, d: 14,
    blurb: 'Victorian red-and-gold bar on George’s Street, 1881 front',
    front: [{
      w: 7.2, floors: 3, fh: 3.3, G: 4.4,
      upper: { wall: 'brick', color: ORANGE_BRICK, bays: 2, win: 'surround', frame: '#f4f1ea', blinds: true, parapet: '#a24d33', cornice: '#e9e3d6' },
      shop: { paint: '#5e1016', trim: '#3d0a0e', fascia: CREAM, text: 'The Long Hall', letter: '#8a1a1f', outline: GOLD, font: 'script', nums: '51',
        bays: ['door', 'bigwin', 'door'], door: '#4a0c10', awnings: [0, 2] },
    }],
    lanterns: { front: [0.5, 6.7], y: 0.3 },
  },
  {
    // Kehoe's, 9 South Anne Street: a Victorian bar in a four-storey brick house, the dark varnished front with the gilt
    // fascia and the snug's frosted glass
    key: 'kehoes', name: "Kehoe's", hand: 1, a: 'GR2', b: 'DSA', at: [53.341259, -6.259444], w: 7.3, d: 12,
    front: [{
      w: 7.3, floors: 3, fh: 3.2, G: 4.2,
      upper: { wall: 'brick', color: RED_BRICK, bays: 2, win: 'sash', frame: '#f2efe6', parapet: '#76402f' },
      shop: { paint: '#2e1a12', trim: '#1c0f0a', fascia: '#1a0f0a', text: "KEHOE'S", letter: GOLD, font: 'serif', nums: '9',
        bays: ['door', 'win', 'win', 'door'], door: '#3a2216', frosted: true },
    }],
    baskets: { front: [1.2, 6.1], y: 1.4 },
    lanterns: { front: [3.65], y: 0.35 },
  },
  {
    // J. Grogan's Castle Lounge, 15 South William Street at Castle Market: four storeys of brick with the rendered ochre
    // gable along Castle Market carrying CASTLE LOUNGE in tall painted letters; red front, black fascias with gilt
    // lettering, green awnings, a box sign on the corner
    key: 'grogans', name: "Grogan's", hand: -1, a: 'SW1', b: 'GFCR', at: [53.342251, -6.262723], corner: 'CM1', w: 6.8, d: 13,
    front: [{
      w: 6.8, floors: 3, fh: 3.1, G: 4.2,
      upper: { wall: 'brick', color: '#8c4b36', bays: 2, win: 'sash', frame: '#e7e2d6', parapet: '#7a3f2e' },
      shop: { paint: '#9e1a1a', trim: '#6e1010', fascia: '#181818', text: 'J. GROGAN', letter: GOLD, font: 'serif', nums: '15',
        bays: ['win', 'win', 'door'], door: '#7a1414', awnings: [0, 1], awning: 'green' },
    }],
    side: { upper: { wall: 'render', color: '#c8a46a', bays: 0, parapet: '#b8935b',
      vtext: { t: 'CASTLE LOUNGE', u: 1.2, color: '#5c7a6a' } },
      shop: { paint: '#9e1a1a', trim: '#6e1010', fascia: '#181818', text: 'CASTLE LOUNGE', letter: GOLD, font: 'serif', nums: '15', sub: 'Estd. 1899',
        bays: ['win', 'win', 'door', 'win', 'win'], door: '#7a1414', awnings: [0, 1, 3, 4], awning: 'green' } },
    blades: [{ face: 'front', u: 6.4, y: 4.9, w: 1.3, h: 0.85, bg: '#f3eee4', lines: ['THE', 'CASTLE', 'LOUNGE', 'J. GROGAN'], color: '#b3121b', lit: true }],
    lanterns: { side: [7.5], y: 1.8 },
  },
  {
    // Davy Byrne's, 21 Duke Street (Joyce's "moral pub"): a slate-grey painted house with a big "21" between the first
    // floor windows, over a teal-green front with the name in script and blue lamps at each end
    key: 'davyByrnes', name: 'Davy Byrnes', hand: 1, a: 'DKM', b: 'GRD', at: [53.341851, -6.259362], w: 6.6, d: 11,
    front: [{
      w: 6.6, floors: 3, fh: 3.1, G: 4.2,
      upper: { wall: 'paint', color: '#4a5057', bays: 2, win: 'sash', frame: '#f2f2ee', parapet: '#33373c', big: { t: '21', y: 2.2, size: 1.0, color: '#7fb6c8' } },
      shop: { paint: '#3f6a68', trim: '#2c4d4b', fascia: '#4a7672', text: 'Davy Byrnes', letter: '#1e2322', font: 'script', nums: '21',
        bays: ['win', 'win', 'door'], door: '#7a5a34' },
    }],
    lanterns: { front: [0.25, 6.35], y: -0.9, blue: true },
    blades: [{ face: 'front', u: 5.9, y: 6.2, w: 0.8, h: 0.8, bg: '#0c1a14', lines: ['Davy', 'Byrnes'], color: '#4dffb0', neon: true }],
  },
  {
    // Mulligan's, 8-9 Poolbeg Street (1782): the mustard-grained front of J. Mulligan with WINES, SPIRITS, WHISKEY and
    // BONDER panels, the red-tiled LOUNGE BAR and the arched MULLIGAN'S door, under cream-painted upper floors.
    // Poolbeg Street has no room between Burgh Quay and College Square at half scale, so the front faces the quay
    // just west of the tower instead (docs/research/pubs.md)
    key: 'mulligans', name: "Mulligan's", hand: -1, a: 'SQ9', b: 'SQ10', at: [53.34703, -6.25625], w: 15.5, d: 9,
    front: [
      { w: 6.5, floors: 2, fh: 3.1, G: 4.0,
        upper: { wall: 'render', color: '#e9e1cf', bays: 3, win: 'sash', frame: '#f4f1e8', reveal: '#9a4a36', parapet: '#d8cfbb' },
        shop: { paint: '#b6862f', trim: '#7c5516', fascia: '#5a1e1a', text: 'J. MULLIGAN', letter: GOLD, font: 'serif',
          bays: ['door', 'panelwin', 'door', 'panelwin'], door: '#a37424', panels: ['WINES', 'SPIRITS'] } },
      { w: 4.5, floors: 2, fh: 3.1, G: 4.0,
        upper: { wall: 'render', color: '#ece6d6', bays: 2, win: 'sash', frame: '#f4f1e8', parapet: '#d8cfbb' },
        shop: { paint: '#b0402c', trim: '#1a1a1a', fascia: '#b0402c', text: 'LOUNGE BAR', letter: '#f3efe6', font: 'sans', tiles: true,
          bays: ['archwin', 'archdoor', 'archwin'], door: '#8a6424' } },
      { w: 4.5, floors: 2, fh: 3.1, G: 4.0,
        upper: { wall: 'render', color: '#e9e1cf', bays: 2, win: 'sash', frame: '#f4f1e8', parapet: '#d8cfbb' },
        shop: { paint: '#b6862f', trim: '#7c5516', fascia: '#5a1e1a', text: "MULLIGAN'S", letter: GOLD, font: 'serif',
          bays: ['archdoor', 'board', 'archdoor'], door: '#a37424', boardText: ['ULYSSES', 'Bloomsday'] } },
    ],
    lanterns: { front: [3.2, 13.2], y: 0.4 },
  },
  {
    // The Bleeding Horse, 24-25 Camden Street Upper at Charlotte Way: a big two-storey Victorian corner house, the
    // stucco ground floor and pilasters painted near-black, the brick first floor under a deep frieze with the name in
    // raised letters, black awnings (docs/research/pubs.md: not half-timbered in any of the photos)
    key: 'bleedingHorse', name: 'The Bleeding Horse', place: true, hand: -1, a: 'GXSCM3', b: 'GXSCM2', at: [53.333505, -6.264745], corner: 'GXSHC2', w: 16, d: 15,
    blurb: 'Big Victorian corner house on Camden Street, a tavern here since 1649',
    front: [{
      w: 16, floors: 1, fh: 3.6, G: 4.6, attic: 1.6,
      upper: { wall: 'brick', color: '#7d5540', bays: 4, win: 'plate', frame: '#26292b', pilaster: '#2a2d30', parapet: '#26292b',
        frieze: { t: 'THE BLEEDING HORSE', color: '#e8e2d2' }, panel: { t: '1649', u: 8, color: '#e8e2d2' } },
      shop: { paint: '#2a2d30', trim: '#1a1c1e', fascia: '#1d1f21', text: 'THE BLEEDING HORSE', letter: '#e8e2d2', font: 'serif', textScale: 0.8,
        bays: ['win', 'door', 'win', 'win', 'door', 'win'], door: '#6a3420', awnings: [0, 2, 3, 5], awning: 'black', awningText: 'The Bleeding Horse' },
    }],
    side: { upper: { wall: 'brick', color: '#7d5540', bays: 4, win: 'plate', frame: '#26292b', pilaster: '#2a2d30', parapet: '#26292b',
      frieze: { t: 'BLEEDING HORSE', color: '#e8e2d2' } },
      shop: { paint: '#2a2d30', trim: '#1a1c1e', fascia: '#1d1f21', text: 'THE BLEEDING HORSE', letter: '#e8e2d2', font: 'serif', textScale: 0.8,
        bays: ['win', 'win', 'door', 'win', 'win'], door: '#6a3420', awnings: [0, 1, 3, 4], awning: 'black' } },
    lanterns: { front: [0.6, 15.4], side: [7.5], y: 0.6 },
    barrels: { front: [4.4, 11.6] },
  },
  {
    // Copper Face Jacks, the nightclub under the Jackson Court Hotel, 29-30 Harcourt Street: two four-storey Georgian
    // brick houses with fanlit doors up granite steps, the club's copper-lettered signs and canopy over the basement
    // entrance (no free-licensed photo of the front was found: the details are generic Harcourt Street)
    key: 'copperFaceJacks', name: 'Copper Face Jacks', place: true, hand: -1, a: 'SGSW', b: 'HC1', at: [53.335436, -6.263509], w: 14.4, d: 14,
    blurb: 'The nightclub under the Jackson Court Hotel on Harcourt Street',
    front: [{
      w: 14.4, floors: 3, fh: 3.4, G: 4.4, attic: 0.3,
      upper: { wall: 'brick', color: '#6f3e2f', bays: 6, win: 'georgian', frame: '#f2efe6', parapet: '#63382a', cornice: '#bdb6a6' },
      shop: { paint: '#6f3e2f', trim: '#9b968c', fascia: '#141414', text: 'COPPER FACE JACKS', letter: '#e0843a', font: 'sans', georgian: true, sub: 'JACKSON COURT HOTEL',
        bays: ['gwin', 'gdoor', 'gwin', 'club', 'gwin', 'gdoor'], door: '#1d1d1d' },
    }],
    lanterns: { front: [2.2, 12.2], y: -1.4 },
    blades: [{ face: 'front', u: 7.2, y: 5.2, w: 1.1, h: 1.6, bg: '#101010', lines: ['COPPER', 'FACE', 'JACKS'], color: '#f08a3c', neon: true }],
  },
  {
    // Flannery's, 6-8 Camden Street Lower: a late-night bar in a three-storey terrace, the upper floors painted grey, a
    // glossy red front with gilt lettering on a red fascia, swan-neck lamps along it and a planted ledge over the fascia
    key: 'flannerys', name: "Flannery's", hand: 1, a: 'GXSCR1', b: 'GXSCM1', at: [53.336121, -6.265026], w: 9.5, d: 13,
    front: [{
      w: 9.5, floors: 2, fh: 3.2, G: 4.1,
      upper: { wall: 'paint', color: '#7d8388', bays: 3, win: 'sash', frame: '#ece8de', parapet: '#6f757a', cornice: '#d8d3c8' },
      shop: { paint: '#b8141b', trim: '#7d0c12', fascia: '#8e1015', text: "FLANNERY'S", letter: GOLD, font: 'serif', nums: '7', wash: 0.26,
        bays: ['win', 'door', 'win', 'win', 'door'], door: '#5e0f12' },
    }],
    lanterns: { front: [1.6, 3.4, 5.4, 7.6], y: 0.25 },
    baskets: { front: [0.5, 9], y: 1.3, sill: true },
  },
  {
    // O'Donoghue's, 15 Merrion Row (the Dubliners' pub): a narrow four-storey Georgian brick house over a black-and-white
    // front: the white fascia with 15 O'DONOGHUE'S 15 in black serif capitals, black pilasters with carved consoles,
    // a white multi-pane window and a white-panelled black door
    key: 'odonoghues', name: "O'Donoghue's", place: true, hand: -1, a: 'SGNE', b: 'MR1', at: [53.338157, -6.254186], w: 6.4, d: 13,
    blurb: 'The traditional music pub on Merrion Row, home of the Dubliners',
    front: [{
      w: 6.4, floors: 3, fh: 3.3, G: 4.3,
      upper: { wall: 'brick', color: '#744332', bays: 2, win: 'georgian', frame: '#f2efe6', parapet: '#673a2b' },
      shop: { paint: '#141414', trim: '#0a0a0a', fascia: '#f3f0e8', text: "O'DONOGHUE'S", letter: '#141414', font: 'serif', nums: '15',
        bays: ['door', 'bigwin', 'door'], door: '#141414', whiteFrames: true, consoles: true },
    }],
    lanterns: { front: [3.2], y: 0.35 },
  },
];

export const pubSites = Object.fromEntries(PUB_SPECS.map((p) => [p.key, place(p)]));
