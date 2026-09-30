// The shared shopfront set (docs/research/temple-bar-v2.md): period Irish shop and pub fronts - pilasters with
// capitals and consoles, a deep fascia, stall risers with fielded panels, recessed half-glazed doors, painted poster
// and "fine wines" boards, arched and faience fronts - painted once by the pub-front kit's shop painter (pubs.js
// paintShopfront) into one small atlas that the filler facade shader tiles along a building's ground floor.
//
// The tiles are painted in KEY colours so that one tile serves every colour of front, and the facade shader recolours
// them per building:
//   alpha 0    glass        -> the shader's interior-mapped shop (lit after dark)
//   alpha 1/3  paint        -> the building's shopfront colour (aTrim) x the shade stored in r (0.5 = 1x)
//   alpha 2/3  fascia board -> a fascia colour picked per building x shade; the shop name is laid over it from the
//                              sign atlas (buildings.js), so names are not tied to tiles
//   alpha 1    fixed        -> painted as is (gilt capitals and lines, black consoles, poster and wine boards)
// Adjacent classes (glass-paint, paint-fascia, fascia-fixed) blend linearly, so filtering between them stays sane.
//
// API
//   SHOPFRONT_TILES           tile specs: { kind, shop } (kind: 'pub' | 'cafe' | 'shop' | 'music' | 'food')
//   SHOPFRONT_TILE = { W, G }  metres one tile covers (6.4 m wide, 4.2 m high ground floor)
//   SHOPFRONT_NAMES            64 invented names; name i suits tile i % 16 (same kind)
//   shopfrontUniforms          { uShopfronts }: the atlas (built on first use)
//   SHOPFRONT_GLSL             `vec4 shopfrontTile(vec2 t, float tile, vec2 gx, vec2 gy)` - t: 0..1 across / up the
//                              tile; gx, gy: screen derivatives of t (take them outside any branch)
//   shopfrontCanvas(W, G, spec, { name, k })  a full-colour front for a landmark or hero plane (Dame St, George's St,
//                              the squares): a CanvasTexture, spec as a pub `shop` spec (pubs.js)
import * as THREE from 'three';
import { paintShopfront } from './pubs.js';
import { LITE } from '../render/quality.js';

export const SHOPFRONT_TILE = { W: 6.4, G: 4.2 };
const COLS = 4, ROWS = 4;
const K = LITE ? 30 : 60;                         // px per metre (Low / Battery saver: half)
const TW = Math.round(SHOPFRONT_TILE.W * K), TH = 2 ** Math.ceil(Math.log2(SHOPFRONT_TILE.G * K));

// key colours (see above)
const PAINT = '#ff00ff', TRIM = '#bf00bf', DARK = '#990099', FASCIA = '#ffff00', GLASS = ['#00ffff', '#00ffff'];
const GILT = '#d9ad48', VARNISH = '#3b2616';
const base = { paint: PAINT, trim: TRIM, fascia: FASCIA, text: '', letter: GILT, outline: GILT, glass: GLASS, font: 'serif' };
const T = (kind, o) => ({ kind, shop: { ...base, door: DARK, ...o } });
export const SHOPFRONT_TILES = [
  T('pub', { bays: ['win', 'door', 'bigwin'], consoles: true }),
  T('pub', { bays: ['bigwin', 'door', 'win'], door: VARNISH }),
  T('pub', { bays: ['win', 'board', 'door', 'poster'], consoles: true }),
  T('cafe', { bays: ['bigwin', 'door'] }),
  T('shop', { bays: ['win', 'door', 'win'], whiteFrames: true }),
  T('pub', { bays: ['archwin', 'archdoor', 'archwin'], tiles: true, door: VARNISH }),
  T('music', { bays: ['poster', 'door', 'poster', 'win'] }),
  T('food', { bays: ['panelwin', 'door', 'panelwin'], panels: ['DINING', 'WINES'], consoles: true }),
  T('shop', { bays: ['door', 'bigwin'], door: VARNISH }),
  T('pub', { bays: ['archwin', 'door', 'archwin'], consoles: true }),
  T('shop', { bays: ['win', 'win', 'door'] }),
  T('cafe', { bays: ['door', 'bigwin', 'win'], door: VARNISH }),
  T('pub', { bays: ['board', 'win', 'door', 'win'], boardText: ['Traditional', 'MUSIC'], consoles: true }),
  T('shop', { bays: ['bigwin', 'door', 'bigwin'] }),
  T('pub', { bays: ['win', 'door', 'win', 'poster'], tiles: true }),
  T('food', { bays: ['door', 'panelwin', 'panelwin'], panels: ['OYSTERS', 'ALES'], door: VARNISH }),
];

// Invented names in period lettering (no real pub or brand: docs/research/temple-bar.md C3)
const POOL = {
  pub: ["THE LIFFEY REST", "CRAMPTON'S", 'THE ESSEX TAVERN', 'FLEET HOUSE', 'THE COPPER FIDDLE', "MOLLOY'S", 'THE WREN\'S NEST',
    'THE GILDED BARREL', 'THE SALMON LEAP', 'THE TIN WHISTLE', 'THE HALF DOOR', 'THE THREE CASKS', "O'HARE'S", "DEVANE'S BAR",
    'THE LAMPLIGHTER', 'THE BOATMAN', "THE WEAVER'S ARMS", 'THE RIVER GATE', 'THE OLD QUILL', "HENNESSY'S", 'THE CROOKED STILE',
    "BRADY'S", 'THE SNUG', 'THE HOP LOFT', "NOLAN'S", 'THE CASK & CANDLE', 'THE BARD\'S REST',
    "FEENEY'S", 'THE LANTERN', 'THE MERRY PLOUGH', 'THE FERRYMAN', "TOBIN'S"],
  cafe: ['TEMPLE LANE CAFÉ', 'COBBLES COFFEE', 'THE TEA ROOMS', 'CAFÉ DE LA RUE', 'THE BLUE KETTLE', 'SETT & SAUCER', 'BEAN HOUSE', 'CAFÉ LIFFEY'],
  shop: ['CELTIC CRAFTS', 'IRISH WOOLLENS', 'EUSTACE BOOKS', 'PRINTS & MAPS', 'THE VINTAGE ROOM', 'SILVER & GOLD', 'DUBLIN HATTERS',
    'THE CRAFT BAZAAR', 'FOWNES GALLERY', 'CLADDAGH SILVER', 'THE GIFT HOUSE', 'COPE ST RECORDS', 'LINEN & LACE', 'TWEED & CO.',
    'THE POSTER SHOP', 'CROWN ALLEY COMICS'],
  music: ['FIDDLE & BOW MUSIC', 'THE TRAD SHOP', 'ESSEX ST RECORDS', 'BODHRÁN & PIPE'],
  food: ['TRATTORIA LUNA', 'BISTRO VERDE', 'OYSTER & ALE', 'THE NOODLE HOUSE', 'SEAFOOD KITCHEN', 'LA COCINA', 'THE CHOP HOUSE', 'CURRY LANE'],
};
export const SHOPFRONT_NAMES = (() => {
  const used = { pub: 0, cafe: 0, shop: 0, music: 0, food: 0 };
  return Array.from({ length: 64 }, (_, i) => { const k = SHOPFRONT_TILES[i % 16].kind, p = POOL[k]; return p[used[k]++ % p.length]; });
})();
// lettering style per name (buildings.js sign atlas): script for some pubs and cafés, serif capitals otherwise
export const nameFont = (i) => (SHOPFRONT_TILES[i % 16].kind === 'cafe' || (i % 7 === 3) ? 'script' : 'serif');

export const shopfrontUniforms = { uShopfronts: { value: null } };
let atlas = null;
export function shopfrontAtlas() {
  if (atlas) return atlas;
  const c = document.createElement('canvas');
  c.width = TW * COLS; c.height = TH * ROWS;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = PAINT; ctx.fillRect(0, 0, c.width, c.height);
  // each tile is painted G tall at the top of its TH-px cell; the rest of the cell repeats paint (never sampled)
  SHOPFRONT_TILES.forEach((t, i) => paintShopfront(ctx, (i % COLS) * TW, Math.floor(i / COLS) * TH, K, SHOPFRONT_TILE.W, SHOPFRONT_TILE.G, t.shop, { round: true }));
  // key colours -> classes (see the header)
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let a = 255, sh = -1;
    if (Math.abs(r - b) <= 14 && g + 90 < Math.min(r, b)) { a = 85; sh = Math.max(r, b) / 255 + g / 255; }            // paint
    else if (Math.abs(r - g) <= 14 && b + 90 < Math.min(r, g)) { a = 170; sh = Math.max(r, g) / 255 + b / 255; }       // fascia
    else if (Math.abs(g - b) <= 24 && r + 90 < Math.min(g, b)) { a = 0; sh = 0; }                                       // glass
    if (sh >= 0) { const v = Math.round(Math.min(1, sh / 2) * 255); d[i] = d[i + 1] = d[i + 2] = v; }
    d[i + 3] = a;
  }
  const tex = new THREE.DataTexture(new Uint8Array(d.buffer), c.width, c.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.NoColorSpace; // fixed colours are decoded in the shader (pow 2.2); shades are linear
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.anisotropy = 4; tex.needsUpdate = true;
  shopfrontUniforms.uShopfronts.value = tex;
  atlas = { texture: tex, width: c.width, height: c.height };
  return atlas;
}

// canvas row 0 is texture v = 0 (DataTexture, no flip): tile rows run down the atlas
export const SHOPFRONT_GLSL = /* glsl */ `
  uniform sampler2D uShopfronts;
  vec4 shopfrontTile(vec2 t, float tile, vec2 gx, vec2 gy) {
    vec2 cr = vec2(mod(tile, ${COLS}.0), floor(tile / ${COLS}.0));
    vec2 k = vec2(1.0 / ${COLS}.0, ${(SHOPFRONT_TILE.G * K / TH).toFixed(5)} / ${ROWS}.0);
    vec2 uv = vec2((cr.x + clamp(t.x, 0.002, 0.998)) / ${COLS}.0, (cr.y * ${TH}.0 + (1.0 - clamp(t.y, 0.0, 1.0)) * ${(SHOPFRONT_TILE.G * K).toFixed(2)}) / ${TH * ROWS}.0);
    return textureGrad(uShopfronts, uv, gx * vec2(k.x, -k.y), gy * vec2(k.x, -k.y));
  }
`;

// A full-colour front for a landmark or hero plane, with its name on the fascia (reusable for Dame St / George's St)
export function shopfrontCanvas(W, G, spec, { name = '', k = LITE ? 32 : 64 } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * k); c.height = Math.ceil(G * k);
  const ctx = c.getContext('2d');
  const shop = { letter: GILT, font: 'serif', ...spec, text: name || spec.text || '' };
  paintShopfront(ctx, 0, 0, k, W, G, shop);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
