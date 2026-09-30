// The Grafton quarter (docs/research/grafton-quarter.md): Grafton Street's shopfronts on both sides, the side-street
// pubs (McDaid's, Bruxelles, Neary's, Sheehan's, the International Bar), the Gaiety Theatre, Powerscourt Townhouse and
// the George's Street Arcade. Data only: the front kit in src/world/pubs.js builds them (buildFronts), the street
// dressing (stalls, buskers, café tables, bikes) is src/world/graftonquarter.js.
//
// Rows of fronts are laid along a road a -> b from `s0` (metres from a), each front `w` wide, on side `hand`
// (1: the left of a -> b, -1 the right). A front flush with a cross street names that street's other node in `corner`
// and gets its painted return face (`side`). Shop names on the chain stores are invented; the historic names are
// real (Bewley's, Brown Thomas and Weir's are in landmarks.js, the pubs and the three landmarks here).
import { place } from './pubsites.js';

// ---------- palette ----------
const GOLD = '#d9ad48', CREAM = '#efe6cf', WHITE = '#f2efe6';
const BRICK = '#7a4331', DARK_BRICK = '#5f3a2d', RED_BRICK = '#8a4a36', ORANGE = '#b25a3c', TERRACOTTA = '#b8553a';
const STUCCO = ['#e6dfcf', '#d9d0bd', '#c9c0ae', '#e9e2d0', '#cfc8b8', '#b9b5ab'];

// one shop in a terraced row: a single segment with sensible defaults
function shop(o) {
  const floors = o.floors ?? 3, fh = o.fh ?? 3.2, G = o.G ?? 4.4;
  const upper = { wall: 'brick', color: BRICK, bays: Math.max(1, Math.round(o.w / 2.6)), win: 'sash', frame: WHITE, ...o.upper };
  const modern = o.modern ?? true;
  const shopSpec = {
    paint: '#1c1c1c', trim: '#111111', fascia: '#161616', letter: '#f2efe6', font: modern ? 'sans' : 'serif', modern,
    bays: o.w > 7 ? ['display', 'glass', 'display'] : ['display', 'glass'], ...o.shop,
  };
  return {
    key: o.key, name: o.name, terrace: o.terrace ?? true, w: o.w, d: o.d ?? 13, corner: o.corner, hand: o.hand, a: o.a, b: o.b, s: o.s,
    front: [{ w: o.w, floors, fh, G, attic: o.attic, gables: o.gables, roof: o.roof, upper, shop: shopSpec }],
    // a corner shop carries its upper floors and a shopfront round the corner
    side: o.side || (o.corner ? { upper: { ...upper, bays: Math.max(1, Math.round((o.d ?? 13) / 3)) }, shop: { ...shopSpec, bays: ['display', 'display'], awnings: undefined } } : undefined), baskets: o.baskets, lanterns: o.lanterns, blades: o.blades, clocks: o.clocks, turrets: o.turrets, awnings: o.awnings,
    place: o.place, blurb: o.blurb, view: o.view,
  };
}
// lay a row: fronts one after another from s0 along a -> b on one side
function row(a, b, hand, s0, list) {
  let s = s0;
  // (bw: the built width when a corner front needs to stand back from a slanting cross street, w still its share)
  return list.map((o) => { const r = shop({ ...o, w: o.bw ?? o.w, a, b, hand, s: s + o.w / 2 }); s += o.w; return r; });
}

// ---------- Grafton Street, west side (from Suffolk Street to the Green) ----------
const graftonWest = [
  ...row('CG3', 'GR1', -1, 11.2, [
    { key: 'gfHouseIreland', name: 'House of Irish Gifts', w: 8, corner: 'KDS1', floors: 4, upper: { wall: 'render', color: STUCCO[0], win: 'sash', parapet: '#cfc6b2', cornice: '#efe9dc' },
      shop: { paint: '#1d4a33', trim: '#14331f', fascia: '#1d4a33', text: 'HOUSE OF IRISH GIFTS', letter: GOLD, font: 'serif', modern: false, bays: ['win', 'door', 'win'], door: '#1d4a33' } },
    { key: 'gfBarnardo', name: 'J. M. Barnardo', w: 6, floors: 4, upper: { wall: 'brick', color: DARK_BRICK, win: 'sash' },
      shop: { paint: '#16301f', trim: '#0e2015', fascia: '#16301f', text: 'J. M. BARNARDO', sub: 'Furriers  est. 1812', letter: GOLD, font: 'serif', modern: false, bays: ['win', 'door', 'win'], door: '#16301f' },
      lanterns: { front: [0.4, 5.6], y: 0.3 } },
    { key: 'gfAran', name: 'Aran knitwear', w: 6, floors: 4, upper: { wall: 'render', color: STUCCO[4], win: 'sash', parapet: '#bdb5a3' },
      shop: { paint: '#2c3e57', trim: '#1c283a', fascia: '#2c3e57', text: 'ARAN KNITWEAR', letter: CREAM, font: 'serif', modern: false, bays: ['win', 'door', 'win'], door: '#2c3e57', goods: ['#e8e0cc', '#cfc3a6', '#7d8a6a'] },
      baskets: { front: [0.5, 6], y: 1.2 } },
    // the tall terracotta building with the stepped gables that closes the view up the street from both ends
    { key: 'gfTerracotta', name: 'Grafton terracotta building', w: 11, d: 15, floors: 4, fh: 3.3, G: 4.6, attic: 0.6, terrace: false,
      upper: { wall: 'brick', color: TERRACOTTA, bays: 4, win: 'tall', frame: '#f4efe4', parapet: '#a34a31', cornice: '#d9a07a',
        bands: [{ y: 3.25, h: 0.3, color: '#d38a64' }, { y: 6.55, h: 0.3, color: '#d38a64' }, { y: 9.85, h: 0.25, color: '#d38a64' }] },
      gables: [{ u: 5.5, w: 7.5, h: 4.6, win: 'tall' }],
      shop: { paint: '#3a2a4a', trim: '#2a1e36', fascia: '#4a3560', text: 'MARLOWE', letter: '#f0e6f4', bays: ['display', 'glass', 'display', 'display'], goods: ['#d9a3c0', '#f2ede4', '#7a5a8c', '#e0c060'] } },
    { key: 'gfProvincial', name: 'Provincial Bank', w: 6.2, floors: 4, fh: 3.3, G: 4.6, attic: 1,
      upper: { wall: 'ashlar', color: '#c9c2b0', win: 'surround', frame: '#e9e4d8', parapet: '#b8b09d', cornice: '#ddd6c6' },
      shop: { paint: '#bfb7a3', trim: '#a39b88', fascia: '#1f2f4a', text: 'PROVINCIAL BANK', letter: WHITE, font: 'serif', modern: false, bays: ['win', 'door', 'win'], door: '#233552', whiteFrames: true } },
  ]),
  ...row('GRD', 'GFJC', -1, 10.4, [
    { key: 'gfShoeHall', name: 'Shoe hall', w: 9, bw: 5, d: 11, corner: 'GFCP', floors: 3, upper: { wall: 'render', color: STUCCO[1], win: 'sash', parapet: '#c6bca6' },
      shop: { paint: '#202020', trim: '#141414', fascia: '#e9e4d8', text: 'THE SHOE HALL', letter: '#202020', bays: ['display', 'glass', 'display'], goods: ['#6a3a22', '#141414', '#b88a5a', '#e0d8c8'], shelves: true } },
  ]),
  ...row('GFJC', 'GR2', -1, 14.8, [
    { key: 'gfGelato', name: 'Gelateria', w: 4.6, d: 7, corner: 'GFHA1', floors: 3, upper: { wall: 'brick', color: RED_BRICK, bays: 1, win: 'sash' },
      shop: { paint: '#f3e9d6', trim: '#d9c9a8', fascia: '#e7a0b0', text: 'GELATERIA', letter: '#5a2030', font: 'script', bays: ['cafe', 'glass'], cafeText: 'gelato', stall: '#d9c9a8' } },
  ]),
  ...row('GR2', 'GFCH', -1, 4.9, [
    // the savings bank on the Harry Street corner (grey granite ground floor, red brick over it): the flower sellers
    // stand in front of it
    { key: 'gfBank', name: 'City Savings Bank', w: 8, bw: 6.6, d: 9, corner: 'GFHA1', floors: 3, fh: 3.3, G: 4.6,
      upper: { wall: 'brick', color: '#9a4a38', win: 'sash', frame: WHITE, bays: 3, parapet: '#7e3a2c', cornice: '#b9b3a6' },
      shop: { paint: '#8e9194', trim: '#6e7174', fascia: '#8e9194', text: 'city savings bank', letter: '#1c2e6a', bays: ['display', 'glass', 'display'], frame: '#1c2e6a', goods: ['#d9dde2', '#1c2e6a'], shelves: true },
      side: { upper: { wall: 'brick', color: '#9a4a38', win: 'sash', frame: WHITE, bays: 3, parapet: '#7e3a2c' },
        shop: { paint: '#8e9194', trim: '#6e7174', fascia: '#8e9194', text: 'city savings bank', letter: '#1c2e6a', modern: true, font: 'sans', bays: ['display', 'display'], frame: '#1c2e6a', goods: ['#d9dde2'] } } },
    { key: 'gfShoesCo', name: 'Shoes & Co', w: 5.6, d: 9, floors: 3, upper: { wall: 'render', color: STUCCO[2], win: 'sash' },
      shop: { paint: '#e9e4da', trim: '#c8c0b0', fascia: '#1a1a1a', text: 'SHOES & CO', letter: WHITE, bays: ['display', 'glass'], goods: ['#1a1a1a', '#8a5a3a', '#c8b89a'], shelves: true } },
    { key: 'gfMenswear', name: 'Menswear', w: 6.5, d: 10, corner: 'GFCL', floors: 3, upper: { wall: 'brick', color: BRICK, win: 'sash' },
      shop: { paint: '#141414', trim: '#0a0a0a', fascia: '#141414', text: 'KERR TAILORING', letter: WHITE, bays: ['display', 'glass'], goods: ['#2a3140', '#707880', '#c9c2b6'] } },
  ]),
  ...row('GFCH', 'SGNW', -1, 4.4, [
    { key: 'gfOutdoor', name: 'Outdoor outfitters', w: 8, bw: 5.8, d: 9, corner: 'GFCL', floors: 3, upper: { wall: 'brick', color: RED_BRICK, win: 'sash' },
      shop: { paint: '#1a1a1a', trim: '#0e0e0e', fascia: '#b8141b', text: 'NORTHERN OUTFITTERS', letter: WHITE, bays: ['display', 'glass', 'display'], goods: ['#b8141b', '#1a1a1a', '#e2e0da', '#35507a'] } },
    // the navy toy shop front with the gold script (the corner the Grafton St walk ends on)
    { key: 'gfToyShop', name: 'The Toy Shop', w: 10, d: 9, floors: 3, fh: 3.3, upper: { wall: 'render', color: '#f1ede4', win: 'sash', parapet: '#dcd6ca' },
      shop: { paint: '#2a3a6e', trim: '#1c2850', fascia: '#2a3a6e', text: 'The Toy Shop', letter: '#f0c850', font: 'script', modern: false, bays: ['display', 'display', 'glass', 'display'], frame: '#2a3a6e', goods: ['#e04a3a', '#f0c850', '#4aa0e0', '#6ac060', '#e87ab0'] },
      baskets: { front: [0.6, 9.4], y: 1.1 } },
    { key: 'gfColours', name: 'Colours knitwear', w: 6, floors: 3, upper: { wall: 'brick', color: DARK_BRICK, win: 'sash' },
      shop: { paint: '#1d5a36', trim: '#123d24', fascia: '#1d5a36', text: 'COLOURS', letter: WHITE, bays: ['display', 'glass'], goods: ['#e04a3a', '#f0c850', '#4aa0e0', '#6ac060'] } },
    { key: 'gfSports', name: 'Sports store', w: 7, floors: 3, upper: { wall: 'render', color: STUCCO[3], win: 'sash' },
      shop: { paint: '#101010', trim: '#080808', fascia: '#101010', text: 'GRAFTON SPORTS', letter: '#f0c020', bays: ['display', 'glass', 'display'], goods: ['#e0e0e0', '#1a6ad0', '#101010', '#d02020'] } },
    { key: 'gfCamera', name: 'Camera Centre', w: 6, floors: 3, upper: { wall: 'brick', color: BRICK, win: 'sash' },
      shop: { paint: '#262626', trim: '#161616', fascia: '#c01818', text: 'CAMERA CENTRE', letter: WHITE, bays: ['display', 'glass'], goods: ['#202020', '#909090', '#d8d8d8'], shelves: true } },
    { key: 'gfNews', name: 'Newsagent', w: 7.3, corner: 'GFKR', floors: 4, upper: { wall: 'render', color: STUCCO[5], win: 'sash', parapet: '#aaa598' },
      shop: { paint: '#1f3a6a', trim: '#142850', fascia: '#1f3a6a', text: 'NEWSAGENT', letter: '#f2d040', bays: ['display', 'glass'], goods: ['#e04040', '#f2d040', '#40a0e0', '#e0e0e0'], shelves: true } },
  ]),
];

// ---------- Grafton Street, east side (from Nassau Street to the Green) ----------
const graftonEast = [
  ...row('CG3', 'GR1', 1, 11.2, [
    { key: 'gfCeltic', name: 'Celtic Gold', w: 8, bw: 6.4, corner: 'NS1', floors: 4, upper: { wall: 'render', color: STUCCO[0], win: 'sash', parapet: '#cdc4af' },
      shop: { paint: '#1a1a1a', trim: '#0e0e0e', fascia: '#1a1a1a', text: 'CELTIC GOLD', sub: 'jewellers', letter: GOLD, font: 'serif', modern: false, bays: ['display', 'glass', 'display'], goods: ['#e0c060', '#f2f2f2', '#c0c0c0'], shelves: true } },
    { key: 'gfGrill', name: 'Grafton Grill', w: 6, floors: 4, upper: { wall: 'brick', color: RED_BRICK, win: 'sash' },
      shop: { paint: '#b01c1c', trim: '#801010', fascia: '#b01c1c', text: 'GRAFTON GRILL', letter: WHITE, bays: ['cafe', 'glass'], cafeText: 'open late' } },
    { key: 'gfCrystal', name: 'Crystal house', w: 6, floors: 4, upper: { wall: 'render', color: STUCCO[2], win: 'sash' },
      shop: { paint: '#e8e8ec', trim: '#c8c8d0', fascia: '#1a2a4a', text: 'CRYSTAL HOUSE', letter: WHITE, bays: ['display', 'glass'], goods: ['#d0e0f0', '#f2f2f2', '#8090b0'], shelves: true } },
    { key: 'gfNews2', name: 'News', w: 5.5, floors: 3, upper: { wall: 'brick', color: DARK_BRICK, win: 'sash' },
      shop: { paint: '#20406a', trim: '#142a48', fascia: '#20406a', text: 'NEWS', letter: '#f2d040', bays: ['display', 'glass'], goods: ['#e04040', '#f2d040', '#e0e0e0'], shelves: true } },
    // 9-11: the Victorian block with the oriel bays over a fast-food front
    { key: 'gfVictorian', name: '9-11 Grafton Street', w: 12, d: 15, floors: 4, fh: 3.3, G: 4.6, attic: 1.2, terrace: false,
      upper: { wall: 'brick', color: '#8e4a36', bays: 4, win: 'arch', frame: WHITE, archColor: '#d8cdb8', sill: '#d8cdb8', parapet: '#d8cdb8', cornice: '#e6ddcb',
        bands: [{ y: 3.3, h: 0.25, color: '#d8cdb8' }, { y: 6.6, h: 0.25, color: '#d8cdb8' }], quoins: '#d8cdb8' },
      shop: { paint: '#c8141b', trim: '#8e0c12', fascia: '#c8141b', text: 'BURGER BAR', letter: '#f4c830', bays: ['cafe', 'glass', 'cafe'], cafeText: 'burgers' } },
    { key: 'gfPharmacy', name: 'Pharmacy', w: 6.5, floors: 4, upper: { wall: 'render', color: STUCCO[1], win: 'sash' },
      shop: { paint: '#f2f2f2', trim: '#d0d0d0', fascia: '#0a5a3a', text: 'PHARMACY', letter: WHITE, bays: ['display', 'glass'], goods: ['#e8e8e8', '#0a8a5a', '#40a0e0'], shelves: true },
      blades: [{ face: 'front', u: 6.2, y: 5.3, w: 0.8, h: 0.8, bg: '#0a8a4a', lines: ['+'], color: '#aaffcc', neon: true }] },
    { key: 'gfShoeCo2', name: 'Footwear', w: 6.4, floors: 4, upper: { wall: 'brick', color: BRICK, win: 'sash' },
      shop: { paint: '#141414', trim: '#0a0a0a', fascia: '#e8e2d6', text: 'FOOTWEAR', letter: '#141414', bays: ['display', 'glass'], goods: ['#6a3a22', '#141414', '#c8b89a'], shelves: true } },
  ]),
  // 15-20: the department store in the old Brown Thomas building (Victorian-style front), on the Duke Street corner
  ...row('GR1', 'GRD', 1, 6.8, [
    { key: 'gfDept', name: 'Grafton House stores', w: 13.2, d: 20, corner: 'DKM', floors: 4, fh: 3.4, G: 5, attic: 1.1, terrace: false,
      upper: { wall: 'brick', color: '#8a4432', bays: 5, win: 'arch', frame: WHITE, archColor: '#e2d8c4', sill: '#e2d8c4', parapet: '#e2d8c4', cornice: '#efe8da',
        bands: [{ y: 3.4, h: 0.3, color: '#e2d8c4' }, { y: 6.8, h: 0.3, color: '#e2d8c4' }, { y: 10.2, h: 0.3, color: '#e2d8c4' }], quoins: '#e2d8c4', floorWin: ['tall', 'arch', 'tall', 'sash'] },
      gables: [{ u: 6.6, w: 6, h: 3.4 }],
      shop: { paint: '#123a2a', trim: '#0a2a1c', fascia: '#123a2a', text: 'GRAFTON HOUSE', letter: GOLD, font: 'serif', modern: false, bays: ['display', 'display', 'glass', 'display', 'display'], frame: '#123a2a', goods: ['#e8dcc8', '#a0303a', '#303848', '#d0b060'] },
      side: { upper: { wall: 'brick', color: '#8a4432', bays: 6, win: 'tall', frame: WHITE, parapet: '#e2d8c4', bands: [{ y: 3.4, h: 0.3, color: '#e2d8c4' }, { y: 6.8, h: 0.3, color: '#e2d8c4' }] },
        shop: { paint: '#123a2a', trim: '#0a2a1c', fascia: '#123a2a', text: 'GRAFTON HOUSE', letter: GOLD, font: 'serif', bays: ['display', 'display', 'glass', 'display'], frame: '#123a2a', goods: ['#e8dcc8', '#a0303a', '#303848'] } },
      clocks: [{ u: 12.4, y: 6.6 }] },
  ]),
  ...row('GRD', 'GFJC', 1, 4.9, [
    { key: 'gfChemist', name: 'Chemist', w: 7, corner: 'DKM', floors: 3, upper: { wall: 'render', color: STUCCO[3], win: 'sash' },
      shop: { paint: '#1c3a6a', trim: '#12284a', fascia: '#1c3a6a', text: "HICKEY'S PHARMACY", letter: WHITE, font: 'serif', modern: false, bays: ['display', 'glass'], goods: ['#e8e8e8', '#40a0e0', '#e04040'], shelves: true } },
    { key: 'gfBoutique', name: 'Boutique', w: 7.8, floors: 3, upper: { wall: 'brick', color: RED_BRICK, win: 'sash' },
      shop: { paint: '#e9e4da', trim: '#cfc6b6', fascia: '#e9e4da', text: 'MAISON', letter: '#2a2a2a', font: 'serif', bays: ['display', 'glass', 'display'], goods: ['#d8c8b0', '#3a3a3a', '#a07860', '#f2f0ea'] } },
  ]),
  ...row('GFJC', 'GR2', 1, 2.2, [
    { key: 'gfGifts', name: 'Card gallery', w: 6.5, floors: 3, upper: { wall: 'brick', color: BRICK, win: 'sash' },
      shop: { paint: '#6a1a3a', trim: '#4a1028', fascia: '#6a1a3a', text: 'CARD GALLERY', letter: WHITE, bays: ['display', 'glass'], goods: ['#e04a7a', '#f2d060', '#60a0e0'], shelves: true } },
    { key: 'gfJeweller', name: 'Jeweller', w: 5.5, floors: 4, upper: { wall: 'render', color: STUCCO[4], win: 'sash' },
      shop: { paint: '#141414', trim: '#0a0a0a', fascia: '#141414', text: 'BRERETON', sub: 'jewellers', letter: GOLD, font: 'serif', modern: false, bays: ['display', 'glass'], goods: ['#e0c060', '#f2f2f2'], shelves: true } },
    { key: 'gfOptics', name: 'Optician', w: 5.4, corner: 'DSA', floors: 4, upper: { wall: 'brick', color: DARK_BRICK, win: 'sash' },
      shop: { paint: '#2a2a2a', trim: '#141414', fascia: '#f2f2f2', text: 'OPTICIANS', letter: '#1a1a1a', bays: ['display', 'glass'], goods: ['#1a1a1a', '#c0a060'], shelves: true } },
  ]),
  ...row('GR2', 'GFCH', 1, 4.9, [
    { key: 'gfIceCream', name: 'Ice cream parlour', w: 6, corner: 'DSA', floors: 4, upper: { wall: 'render', color: STUCCO[0], win: 'sash' },
      shop: { paint: '#f4d8e0', trim: '#d8b0bc', fascia: '#6a2a40', text: 'ICE CREAM PARLOUR', letter: WHITE, font: 'script', bays: ['cafe', 'glass'], cafeText: 'gelato', stall: '#d8b0bc' } },
    { key: 'gfBooks', name: 'Grafton Books', w: 7, floors: 4, upper: { wall: 'brick', color: BRICK, win: 'sash' },
      shop: { paint: '#1c1c3a', trim: '#10102a', fascia: '#1c1c3a', text: 'GRAFTON BOOKS', letter: CREAM, font: 'serif', modern: false, bays: ['display', 'glass', 'display'], goods: ['#b03030', '#2050a0', '#e0c060', '#2a6a3a', '#e8e0d0'], shelves: true } },
    { key: 'gfIrishGifts', name: 'Irish gifts', w: 7, floors: 4, upper: { wall: 'render', color: STUCCO[2], win: 'sash' },
      shop: { paint: '#1d6a3a', trim: '#124a28', fascia: '#1d6a3a', text: 'IRISH GIFTS', letter: WHITE, bays: ['display', 'glass', 'display'], goods: ['#2a9a4a', '#f2f2f2', '#e08a30', '#e8e0cc'], shelves: true } },
  ]),
  ...row('GFCH', 'SGNW', 1, 4.4, [
    { key: 'gfBricks', name: 'Toy bricks', w: 7, floors: 4, upper: { wall: 'brick', color: RED_BRICK, win: 'sash' },
      shop: { paint: '#f2c80a', trim: '#c8a000', fascia: '#d01818', text: 'TOY BRICKS', letter: WHITE, bays: ['display', 'glass'], goods: ['#d01818', '#f2c80a', '#1a60c0', '#2a9a3a'], shelves: true } },
    { key: 'gfTailors', name: 'Tailors', w: 7, floors: 4, upper: { wall: 'render', color: STUCCO[3], win: 'sash' },
      shop: { paint: '#20242a', trim: '#12151a', fascia: '#20242a', text: 'BAKER & SONS', letter: CREAM, font: 'serif', bays: ['display', 'glass', 'display'], goods: ['#2a3140', '#707880', '#c9c2b6'] } },
    { key: 'gfCigar', name: 'Cigar Emporium', w: 6, floors: 3, upper: { wall: 'brick', color: DARK_BRICK, win: 'sash' },
      shop: { paint: '#3a2416', trim: '#24160c', fascia: '#1a1008', text: 'CIGAR EMPORIUM', letter: GOLD, font: 'serif', modern: false, bays: ['win', 'door', 'win'], door: '#3a2416' },
      lanterns: { front: [0.4, 5.6], y: 0.3 } },
    { key: 'gfPhones', name: 'Phones', w: 6, floors: 4, upper: { wall: 'render', color: STUCCO[1], win: 'sash' },
      shop: { paint: '#e8e8e8', trim: '#c8c8c8', fascia: '#e8e8e8', text: 'mobile', letter: '#d01818', bays: ['display', 'glass'], goods: ['#1a1a1a', '#e8e8e8', '#d01818'], shelves: true } },
    { key: 'gfBears', name: 'Teddy bears', w: 6.8, floors: 4, upper: { wall: 'brick', color: BRICK, win: 'sash' },
      shop: { paint: '#3a7ac0', trim: '#285a90', fascia: '#3a7ac0', text: 'BEAR WORKSHOP', letter: WHITE, bays: ['display', 'glass'], goods: ['#b07a4a', '#e8c080', '#e04a7a'] } },
    // the chocolate café on the corner with the Green: black front, gold script, cream blinds
    { key: 'gfChocolate', name: 'Chocolate café', w: 6.6, corner: 'DS1', floors: 4, upper: { wall: 'brick', color: '#7a4a38', win: 'sash' },
      shop: { paint: '#111111', trim: '#060606', fascia: '#111111', text: 'Chocolate Café', letter: GOLD, font: 'script', modern: false, bays: ['cafe', 'glass', 'cafe'], cafeText: 'hot chocolate', awnings: [0, 2], awning: '#efe6cf' } },
  ]),
];

// ---------- the side streets' pubs ----------
const sidePubs = [
  // McDaid's, 3 Harry Street (est. 1779, Behan's and Kavanagh's pub): a yellow-painted house with navy quoins over the
  // navy Victorian front with the red colonnettes, the round-arched lights and McDAIDS in cream on the fascia
  { key: 'mcdaids', name: "McDaid's", hand: 1, a: 'GR2', b: 'GFHA1', s: 19.4, w: 5.6, d: 10, terrace: true,
    front: [{ w: 5.6, floors: 2, fh: 3.1, G: 4.6,
      upper: { wall: 'paint', color: '#e8cf6a', bays: 2, win: 'sash', frame: '#1c2c5a', parapet: '#d8bd58', quoins: '#1c2c5a' },
      shop: { paint: '#1c2c5a', trim: '#101a3a', fascia: '#1c2c5a', text: 'McDAIDS', letter: '#f2ead0', font: 'sans', textScale: 1.1, bays: ['archwin', 'archdoor', 'archwin'], door: '#1c2c5a' } }],
    lanterns: { front: [2.8], y: 0.2 } },
  // Bruxelles, 7-8 Harry Street: a red terracotta-brick Victorian house, the green awning with the name, the clock on
  // its bracket; Phil Lynott's statue stands outside (graftonquarter.js)
  { key: 'bruxelles', name: 'Bruxelles', hand: -1, a: 'GR2', b: 'GFHA1', s: 18.6, w: 7.4, d: 8, terrace: true,
    front: [{ w: 7.4, floors: 3, fh: 3.2, G: 4.4,
      upper: { wall: 'brick', color: '#a8452f', bays: 3, win: 'arch', frame: WHITE, archColor: '#c8634a', sill: '#c8634a', parapet: '#8a3624', cornice: '#c8634a' },
      shop: { paint: '#1a4a32', trim: '#0f3322', fascia: '#1a4a32', text: 'BRUXELLES', letter: GOLD, font: 'serif', bays: ['win', 'door', 'win'], door: '#1a4a32', awnings: [0, 1, 2], awning: '#1f7a58', awningText: 'Bruxelles' } }],
    clocks: [{ u: 0.8, y: 6.2 }],
    lanterns: { front: [3.7], y: 0.4 } },
  // Neary's, 1 Chatham Street: the actors' pub behind the Gaiety, its front lit by the famous brass arms holding lamps
  // either side of the door
  { key: 'nearys', name: "Neary's", hand: 1, a: 'GFCH', b: 'GFCL', s: 20.2, w: 5.6, d: 8, terrace: true,
    front: [{ w: 5.6, floors: 3, fh: 3.1, G: 4.4,
      upper: { wall: 'brick', color: '#7a4232', bays: 2, win: 'sash', frame: WHITE, parapet: '#6a3628' },
      shop: { paint: '#5a1a14', trim: '#3a0e0a', fascia: '#1a0e0a', text: "NEARY'S", letter: GOLD, font: 'serif', bays: ['win', 'door', 'win'], door: '#4a1410', frosted: true } }],
    lanterns: { front: [1.6, 4.0], y: -1.4, arm: true } },
  // Sheehan's, 17 Chatham Street: green front, gilt lettering, baskets
  { key: 'sheehans', name: "Sheehan's", hand: -1, a: 'GFCL', b: 'GFBA', s: 3.9, w: 6.6, d: 7, terrace: true,
    front: [{ w: 6.6, floors: 3, fh: 3.1, G: 4.3,
      upper: { wall: 'brick', color: RED_BRICK, bays: 2, win: 'sash', frame: WHITE, parapet: '#76402f' },
      shop: { paint: '#1f4a2c', trim: '#12301c', fascia: '#12301c', text: "SHEEHAN'S", letter: GOLD, font: 'serif', nums: '17', bays: ['win', 'door', 'win'], door: '#1f4a2c' } }],
    baskets: { front: [0.6, 6], y: 1.3 } },
  // The International Bar, 23 Wicklow Street: four storeys of red brick with round-arched windows, the black fascia
  // with 23 THE INTERNATIONAL BAR in gilt, the black awning and the neon script sign on the corner
  { key: 'international', name: 'The International Bar', hand: -1, a: 'GFCW', b: 'WK1', s: 47.6, w: 7.4, d: 12, terrace: true,
    front: [{ w: 7.4, floors: 3, fh: 3.2, G: 4.5, attic: 1.1,
      upper: { wall: 'brick', color: '#9a5038', bays: 2, win: 'arch', frame: WHITE, archColor: '#86432f', sill: '#b9b3a6', parapet: '#8a8478', cornice: '#b9b3a6' },
      shop: { paint: '#9a5038', trim: '#141414', fascia: '#141414', text: 'THE INTERNATIONAL BAR', letter: GOLD, font: 'serif', textScale: 0.8, nums: '23', bays: ['win', 'door', 'win'], door: '#141414', consoles: true, awnings: [0, 1, 2], awning: 'black', awningText: 'The International Bar' } }],
    blades: [{ face: 'front', u: 7.0, y: 5.4, w: 1.3, h: 0.7, bg: '#101010', lines: ['International', 'BAR'], color: '#ff5a4a', neon: true, font: 'script' }] },
];

// ---------- the three landmarks ----------
const landmarks = [
  // The Gaiety Theatre, 46 King Street South (C. J. Phipps, 1871): four storeys of buff brick banded with red, paired
  // round-arched windows on the first floor, a stone arcade of pointed arches over the doors, the glazed canopy with
  // GAIETY etched across it and the red neon sign at the corner
  { key: 'gaiety', name: 'Gaiety Theatre', place: true, blurb: "Dublin's oldest theatre (1871), on South King Street",
    hand: -1, a: 'SGNW', b: 'GFKR', s: 37.5, w: 28, d: 26,
    front: [{ w: 28, floors: 3, fh: 3.5, G: 5.4, attic: 1.2,
      upper: { wall: 'brick', color: '#d9c89c', bays: 8, win: 'pair', frame: '#f4efe4', archColor: '#b5563a', sill: '#e6dcc4', parapet: '#cbb88a', cornice: '#efe6d0',
        floorWin: ['pair', 'tall', 'sash'], winW: 1.1,
        bands: [{ y: 0.2, h: 0.35, color: '#b5563a' }, { y: 3.0, h: 0.2, color: '#b5563a' }, { y: 3.45, h: 0.2, color: '#b5563a' }, { y: 6.5, h: 0.2, color: '#b5563a' }, { y: 6.95, h: 0.2, color: '#b5563a' }, { y: 10.2, h: 0.25, color: '#b5563a' }] },
      shop: { paint: '#d9c89c', trim: '#c9b88c', fascia: '#e6dcc4', text: '', rustic: 'ashlar', stone: '#ddd3bc', door: '#5a2a1a',
        bays: ['rdoor', 'gothic', 'gothic', 'gothic', 'gothic', 'gothic', 'rarch', 'rarch'] } }],
    canopy: { u0: 5.5, u1: 22.5, y: 3.6, out: 3.2, text: 'GAIETY' },
    blades: [{ face: 'front', u: 27.4, y: 12.2, w: 2.6, h: 1.0, bg: '#1a0808', lines: ['GAIETY', 'THEATRE'], color: '#ff3020', neon: true }],
    lanterns: { front: [2.2, 25.8], y: -0.6 } },
  // Powerscourt House, 59 South William Street (Robert Mack, 1771-74), now the Powerscourt Townhouse Centre: a granite
  // mansion of three storeys over a rusticated ground floor of round-arched windows, the pedimented breakfront with the
  // Venetian window, and the black POWERSCOURT banners
  { key: 'powerscourt', name: 'Powerscourt Townhouse', place: true, blurb: 'Georgian mansion of 1774, now a shopping centre',
    hand: 1, a: 'WK1', b: 'SW1', s: 27.5, w: 27, d: 18, terrace: false,
    front: [{ w: 27, floors: 2, fh: 4.2, G: 5.2, attic: 1.6,
      upper: { wall: 'ashlar', color: '#8f8c80', bays: 9, win: 'surround', frame: '#e9e6dc', parapet: '#86837a', cornice: '#a9a69a', quoins: '#9d9a8e' },
      shop: { paint: '#85827a', trim: '#6e6b64', rustic: 'rock', stone: '#a3a095', door: '#1e2226', text: '',
        bays: ['rarch', 'rarch', 'rarch', 'rarch', 'rdoor', 'rarch', 'rarch', 'rarch', 'rarch'] } }],
    pediments: [{ u: 13.5, w: 9.5, h: 2.4, drop: 1.4, color: '#9a978b' }],
    blades: [{ face: 'front', u: 9.8, y: 6.2, w: 0.7, h: 3.2, bg: '#121212', lines: ['P', 'O', 'W', 'E', 'R', 'S', 'C', 'O', 'U', 'R', 'T'], color: '#e8e4da', lit: true },
      { face: 'front', u: 17.2, y: 6.2, w: 0.7, h: 3.2, bg: '#121212', lines: ['P', 'O', 'W', 'E', 'R', 'S', 'C', 'O', 'U', 'R', 'T'], color: '#e8e4da', lit: true }],
    lanterns: { front: [12.2, 14.8], y: -1.2 } },
  // The South City Markets (Lockwood and Mawson, 1881) on South Great George's Street, George's Street Arcade running
  // through it: orange-red brick Victorian Gothic, rows of round-arched windows, a slate roof with gabled dormers, and
  // the tall entrance gable between two turrets with spires
  { key: 'georgesArcade', name: "George's Street Arcade", place: true, blurb: 'Victorian red-brick market hall of 1881',
    hand: -1, a: 'GFFA', b: 'SGG1', corner: 'GFDR', w: 34, d: 18, terrace: false,
    front: [
      { w: 12, floors: 2, fh: 3.4, G: 4.6, attic: 0.9, roof: { h: 3.2, set: 0.4 },
        upper: { wall: 'brick', color: '#b0492f', bays: 5, win: 'arch', frame: '#f2ede2', archColor: '#8a3522', sill: '#c9765a', parapet: '#9a3d27', cornice: '#c9765a', bands: [{ y: 3.3, h: 0.25, color: '#c9765a' }] },
        gables: [{ u: 3, w: 3.2, h: 2.8, drop: -0.1 }, { u: 9, w: 3.2, h: 2.8, drop: -0.1 }],
        shop: { paint: '#6a1e18', trim: '#4a120e', fascia: '#141414', text: 'COFFEE HOUSE', letter: GOLD, font: 'serif', modern: false, bays: ['cafe', 'glass', 'display', 'display'], goods: ['#e0c060', '#b03030', '#2a6a3a'] } },
      { w: 10, floors: 2, fh: 3.4, G: 4.6, attic: 0.9, roof: { h: 3.2, set: 0.4 },
        upper: { wall: 'brick', color: '#b0492f', bays: 1, win: 'pair', frame: '#f2ede2', archColor: '#8a3522', sill: '#c9765a', parapet: '#9a3d27', cornice: '#c9765a', winW: 1.6, bands: [{ y: 3.3, h: 0.25, color: '#c9765a' }] },
        gables: [{ u: 5, w: 9, h: 6, drop: -0.1, rose: true }],
        shop: { paint: '#b0492f', trim: '#8a3522', fascia: '#b0492f', text: '', rustic: 'brick', stone: '#c9765a', letter: '#f3ead8', entranceText: "GEORGE'S STREET ARCADE",
          bays: ['rarch', 'entrance', 'rarch'] } },
      { w: 12, floors: 2, fh: 3.4, G: 4.6, attic: 0.9, roof: { h: 3.2, set: 0.4 },
        upper: { wall: 'brick', color: '#b0492f', bays: 5, win: 'arch', frame: '#f2ede2', archColor: '#8a3522', sill: '#c9765a', parapet: '#9a3d27', cornice: '#c9765a', bands: [{ y: 3.3, h: 0.25, color: '#c9765a' }] },
        gables: [{ u: 3, w: 3.2, h: 2.8, drop: -0.1 }, { u: 9, w: 3.2, h: 2.8, drop: -0.1 }],
        shop: { paint: '#141414', trim: '#0a0a0a', fascia: '#141414', text: 'RECORDS & VINTAGE', letter: '#f3ead8', bays: ['display', 'glass', 'display', 'display'], goods: ['#e04a3a', '#f0c850', '#202020', '#4aa0e0'] } },
    ],
    side: { upper: { wall: 'brick', color: '#b0492f', bays: 6, win: 'arch', frame: '#f2ede2', archColor: '#8a3522', sill: '#c9765a', parapet: '#9a3d27', cornice: '#c9765a', bands: [{ y: 3.3, h: 0.25, color: '#c9765a' }] },
      shop: { paint: '#6a1e18', trim: '#4a120e', fascia: '#141414', text: 'SOUTH CITY MARKETS', letter: GOLD, font: 'serif', bays: ['display', 'glass', 'display', 'display'], goods: ['#e0c060', '#b03030', '#2a6a3a'] } },
    turrets: [{ u: 11.9, r: 0.75, h: 2.4, spire: 4.5 }, { u: 22.1, r: 0.75, h: 2.4, spire: 4.5 }, { u: 0.4, r: 0.95, h: 1.6, spire: 3.4 }],
    lanterns: { front: [16, 18], y: -0.3 } },
];

// the George's Street Arcade itself is the Dublin Castle hero's (build_dublincastle.py): its front kit spec is kept but not built
export const GQ_SPECS = [...graftonWest, ...graftonEast, ...sidePubs, ...landmarks].filter((p) => p.key !== 'georgesArcade');
export const gqSites = Object.fromEntries(GQ_SPECS.map((p) => [p.key, place(p)]));
