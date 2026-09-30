// Procedural filler city: street-frontage lots on an occupancy grid, drawn as one instanced mesh.
// The facade shader paints Flemish-bond brick with bump, recessed sash windows with interior-mapped rooms,
// Georgian rusticated ground floors and fanlit doors, named shopfronts and curtain walls, and fades
// to an average colour in the distance.
import * as THREE from 'three';
import { world, PAVEMENT, v2 } from './geo.js';
import { parkPolys, campusPolys, dockPolys } from './ground.js';
import { canalBankPolys } from './canals.js';
import { reserved, sites } from './sites.js';
import { rng, fbmFast } from './textures.js';
import { addBox, addSegment } from '../game/collision.js';
import { noiseTexture, KERB_H } from './roads.js';
import { chunkedInstances } from './chunks.js';
import { addReflections } from '../render/reflect.js';
import { lampUniforms, LAMP_GLSL } from '../render/lamplight.js';

const B = world.bounds;
const CELL = 0.5;
const GW = Math.ceil(B.w / CELL), GH = Math.ceil(B.h / CELL);
const grid = new Uint8Array(GW * GH);
const rand = rng(1759);

// ---------- occupancy grid ----------
const gi = (x) => Math.floor((x - B.minX) / CELL), gj = (z) => Math.floor((z - B.minZ) / CELL);
function occupied(x, z) {
  const i = gi(x), j = gj(z);
  if (i < 2 || j < 2 || i >= GW - 2 || j >= GH - 2) return true;
  return grid[j * GW + i] !== 0;
}
function fillPolygon(poly, val = 1) {
  let z0 = Infinity, z1 = -Infinity;
  for (const p of poly) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  for (let j = Math.max(0, gj(z0)); j <= Math.min(GH - 1, gj(z1)); j++) {
    const z = B.minZ + (j + 0.5) * CELL;
    const xs = [];
    for (let k = 0, m = poly.length - 1; k < poly.length; m = k++) {
      const a = poly[k], b = poly[m];
      if ((a.z > z) !== (b.z > z)) xs.push(a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let i = Math.max(0, gi(xs[k])); i <= Math.min(GW - 1, gi(xs[k + 1])); i++) grid[j * GW + i] = val;
    }
  }
}
function fillSegment(a, b, r) {
  const i0 = Math.max(0, gi(Math.min(a.x, b.x) - r)), i1 = Math.min(GW - 1, gi(Math.max(a.x, b.x) + r));
  const j0 = Math.max(0, gj(Math.min(a.z, b.z) - r)), j1 = Math.min(GH - 1, gj(Math.max(a.z, b.z) + r));
  const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1e-9;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = B.minX + (i + 0.5) * CELL, z = B.minZ + (j + 0.5) * CELL;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - a.x - abx * t, dz = z - a.z - abz * t;
    if (dx * dx + dz * dz <= r * r) grid[j * GW + i] = 1;
  }
}
function obbCorners(o, shrink = 0) {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), hx = o.w / 2 - shrink, hz = o.d / 2 - shrink;
  return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].map(([lx, lz]) => ({ x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c }));
}
function testOBB(o, shrink = 0.4) {
  const c = Math.cos(o.rot), s = Math.sin(o.rot), hx = o.w / 2 - shrink, hz = o.d / 2 - shrink;
  for (let lx = -hx; lx <= hx + 1e-6; lx += Math.min(CELL, hx)) {
    for (let lz = -hz; lz <= hz + 1e-6; lz += Math.min(CELL, hz)) {
      if (occupied(o.x + lx * c + lz * s, o.z - lx * s + lz * c)) return false;
    }
  }
  return true;
}
const markOBB = (o, shrink = 0.4) => fillPolygon(obbCorners(o, shrink));

// roads + pavements, river, parks, campus, landmarks
for (const s of world.segs) fillSegment(s.a, s.b, s.way.width / 2 + s.way.pave);
fillPolygon(world.riverPoly);
for (const dk of dockPolys) fillPolygon(dk.poly);
for (const poly of canalBankPolys()) fillPolygon(poly);
for (const g of world.greens) fillPolygon(g.poly);
for (const p of [...parkPolys, ...campusPolys]) fillPolygon(p.poly);
for (const r of reserved) markOBB(r, -1);
// keep the Luas clear: the tracks and a strip each side for the platforms and the overhead-line poles
for (const line of world.luasLines) for (const pts of line.tracks) for (let i = 1; i < pts.length; i++) fillSegment(pts[i - 1], pts[i], 6.5);

// ---------- styles ----------
const S = { GEORGIAN: 0, BRICK: 1, STUCCO: 2, TEMPLEBAR: 3, MODERN: 4 };
const hex = (h) => new THREE.Color(h);
// Dublin brick is a dark, brownish red with grey-brown neighbours (refs: Dame St, Fitzwilliam St)
const BRICKS = ['#7b4331', '#6c3a2b', '#85503a', '#5f3a2d', '#744a3a', '#8b5a43', '#6a4636', '#7a6a5c', '#8e6049'].map(hex);
const DOORS = ['#a3201f', '#d9a520', '#1f3f7a', '#1d5a3a', '#161616', '#5a2a66', '#1f6f6f', '#b8521c', '#e9e4d8'].map(hex);
const STUCCO = ['#d9d0bd', '#b9b5ab', '#e6e2d8', '#9fa7a8', '#cdbf9f', '#c9c0ae', '#aeb1a8'].map(hex);
const VIVID = ['#9e2b25', '#2c4f78', '#d1a93a', '#2f6b4b', '#6a3b78', '#e3dccb', '#c46a36', '#2a2a2a'].map(hex);
const FASCIA = ['#17392a', '#1a1a1a', '#5a1a22', '#1b2745', '#e8e0cc', '#d9ae2c', '#1d5d5d', '#3b2a20'].map(hex);
const GLASS = ['#5f7887', '#4d5f6a', '#7c93a0', '#6c7f7a'].map(hex);
const PANELS = ['#c8c8c4', '#3a3d40', '#9aa0a3', '#b9b2a4'].map(hex);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const GEORGIAN_ST = /Merrion|Stephen's Green|Dawson|Kildare|Harcourt|Leeson|Baggot|Clare|Gardiner|Westland|Cuffe|King Street|Church Street|Merrion Row/;
const TEMPLE_BAR = /Temple Bar|Temple Lane|Fleet|Essex Street|Eustace|Crown Alley|Anglesea|Sycamore|Cope|Fownes|Fishamble|Wicklow/;
const VICTORIAN_ST = /South Great George's|Exchequer|Dame Lane|Dame Court|Fade Street|Castle Street|Cork Hill|Ship Street|Stephen Street|Golden Lane|Palace Street|Drury/;
const DOCK_ST =/North Wall|Rogerson|City Quay|Mayor|Commons|Memorial|Lombard|Sandwith|Townsend|Pearse|Store|Amiens|Tara|George's Quay/;

// Docklands: east of the Custom House, from Pearse Street up to Sheriff Street. The northern ring beyond it (North
// Strand, Ballybough, Clonliffe) is terraced housing, not glass towers.
const inDocks = (x, z) => x > 300 && z < 150 && z > -280;
// "Silicon Docks": Grand Canal Dock south of Pearse Street, Barrow Street and Grand Canal Quay (docs/research/
// barrow-street.md): glass and panel offices and apartments of four to eight storeys, the odd brick block
const inSilicon = (x, z) => x > 600 && x < 830 && z >= 150 && z < 530;
// Victorian and Edwardian red-brick terraces of the canal ring: two storeys with small front gardens
const TERRACE_ST = /North Circular|Ballybough|Clonliffe|Jones's|Russell|Summerhill Parade|Poplar|Portland Row|Seville|North Strand|Whitworth|Drumcondra|Prussia|Aughrim|Infirmary|Grove Road|Canal Road|Heytesbury|Clanbrassil Street Upper|South Circular|Lennox|Charlemont Mall|Avenue|Ardilaun|Great Charles|Haddington|Berkeley|Mountjoy Street|Blessington|Long Lane|Camden Row|New Bride|Lansdowne Road|Tritonville|Londonbridge/;
export const isTerrace = (way) => !!way && TERRACE_ST.test(way.name);
// Croke Park's neighbourhood (Jones's Road, Clonliffe Road, Ballybough, the NCR by Russell Street): red-brick terraces,
// two storeys on the side streets and three on the main roads (docs/research/croke-park.md 1.3), so the stadium
// towers over them as it does in the photos
const CP = sites.crokePark.centre;
const nearCroke = (x, z) => Math.hypot(x - CP.x, z - CP.z) < 330;
// Parkgate Street and the north bank by the Criminal Courts: a low Victorian terrace of pubs and shops, three storeys
// on the main road, and one- and two-storey offices and yards between it and the river (docs/research/
// criminal-courts.md 1.4), so the courts' drum stands over them as it does from Heuston
const CJ = sites.ccj;
const nearParkgate = (x, z) => x < -1170 && z < -30 && z > CJ.z - 60 && Math.hypot(x - CJ.x, z - CJ.z) < 240;
const riverSide = (x, z) => z > -89 - Math.max(0, -1290 - x) * 0.07; // between Parkgate St / Conyngham Rd and the Liffey
const parkgateFloors = (x, z, main) => (riverSide(x, z) ? 2 : main ? 3 + (hash01(x, z) < 0.3 ? 1 : 0) : 2 + (hash01(x, z) < 0.3 ? 1 : 0));
// a position hash in 0..1 (not rand(): an extra draw would reshuffle every building placed after these)
const hash01 = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

// The St James's Gate brewery north of James's Street, from Victoria Quay back (west of Watling Street): its quay front
// is a boundary wall (landmarks.js breweryWall) with low sheds and yards behind, over which the fermenters, the Power
// House stacks and the Storehouse show (docs/research/guinness.md 1.4), so the filler there is one or two storeys
// (street fronts two or three). No extra rand() calls: the rest of the city's filler is unchanged.
const inBrewery = (x, z) => z > -25 && z < 200 && x > -1185 && x < -962 - 0.12 * z;
const breweryFloors = (x, z) => 2 + ((Math.floor(x * 0.37 + z * 0.23) & 3) === 0 ? 1 : 0);

function styleFor(x, z, way) {
  const name = way ? way.name : '';
  if (nearCroke(x, z)) return rand() < 0.85 ? S.BRICK : S.STUCCO;
  if (inSilicon(x, z)) return rand() < 0.85 ? S.MODERN : S.BRICK;
  if (inDocks(x, z) && !GEORGIAN_ST.test(name)) return S.MODERN;
  if (x > 200 && DOCK_ST.test(name)) return rand() < 0.65 ? S.MODERN : S.BRICK;
  if (TEMPLE_BAR.test(name)) return rand() < 0.75 ? S.TEMPLEBAR : S.BRICK;
  // George's Street and the lanes round the Castle and the markets: Victorian red brick with some render, not
  // Temple Bar colour (docs/research/hotspots-green-templebar-dame.md 1.3; Exchequer St was painted Temple Bar)
  if (VICTORIAN_ST.test(name)) return rand() < 0.78 ? S.BRICK : S.STUCCO;
  // Dame Street: Victorian red brick and painted stucco, with the odd colourful front
  if (/Dame|College Green|Lord Edward/.test(name)) { const r = rand(); return r < 0.5 ? S.BRICK : r < 0.85 ? S.STUCCO : S.TEMPLEBAR; }
  if (GEORGIAN_ST.test(name)) return rand() < 0.88 ? S.GEORGIAN : S.BRICK;
  if (/Parnell|Capel|Aungier|Talbot|Marlborough/.test(name)) return rand() < 0.5 ? S.GEORGIAN : S.BRICK;
  if (/Quay|Bachelors/.test(name)) return rand() < 0.45 ? S.STUCCO : rand() < 0.6 ? S.BRICK : S.TEMPLEBAR;
  return rand() < 0.5 ? S.STUCCO : S.BRICK;
}

// Narrow plots like the refs: two or three bays each.
function lotSpec(style) {
  switch (style) {
    case S.GEORGIAN: { const bays = rand() < 0.75 ? 3 : 4; return { w: bays * 2.4 + 0.6, d: 12 + rand() * 5, floors: rand() < 0.7 ? 4 : rand() < 0.5 ? 3 : 5, fh: 3.4, bay: 2.4 }; }
    case S.BRICK: { const bays = 2 + Math.floor(rand() * 3); return { w: bays * 2.6 + 0.4, d: 13 + rand() * 7, floors: 4 + Math.floor(rand() * 3), fh: 3.5, bay: 2.6 }; }
    case S.STUCCO: { const bays = 2 + Math.floor(rand() * 3); return { w: bays * 2.7 + 0.4, d: 13 + rand() * 7, floors: 4 + Math.floor(rand() * 3), fh: 3.6, bay: 2.7 }; }
    case S.TEMPLEBAR: { const bays = 2 + Math.floor(rand() * 2); return { w: bays * 2.5 + 0.3, d: 9 + rand() * 5, floors: 3 + Math.floor(rand() * 2), fh: 3.2, bay: 2.5 }; }
    default: return { w: 18 + rand() * 18, d: 16 + rand() * 12, floors: 6 + Math.floor(rand() * 5) + (rand() < 0.2 ? 5 : 0), fh: 3.5, bay: 1.6 };
  }
}

function colorsFor(style) {
  switch (style) {
    case S.GEORGIAN: return [pick(BRICKS), pick(DOORS)];
    case S.BRICK: return [pick(BRICKS), pick(FASCIA)];
    case S.STUCCO: return [pick(STUCCO), pick(FASCIA)];
    case S.TEMPLEBAR: return [pick(VIVID), pick(FASCIA)];
    default: return [pick(GLASS), pick(PANELS)];
  }
}

// ---------- lot placement ----------
const lots = [];
function place(o, style, spec, frontage) {
  const [base, trim] = colorsFor(style);
  const parapet = style === S.MODERN ? 0.6 : 0.9;
  const h = spec.floors * spec.fh + parapet;
  const nb = Math.max(1, Math.round(o.w / spec.bay));
  const doorBay = rand() < 0.5 ? 0 : nb - 1; // Georgian doors sit at one end of the house
  lots.push({ ...o, h, style, fh: spec.fh, bay: spec.bay, base, trim, seed: rand(), nb, doorBay, sign: Math.floor(rand() * 64), weather: rand(), frontage });
  markOBB(o);
}

const priority = { boulevard: 0, primary: 1, quay: 1, secondary: 2, lane: 3 };
const ordered = world.ways.filter((w) => !w.bridge).sort((a, b) => priority[a.type] - priority[b.type]);
for (const way of ordered) {
  for (const side of [1, -1]) {
    for (let k = 0; k < way.pts.length - 1; k++) {
      const a = way.pts[k], b = way.pts[k + 1];
      const dir = v2.norm(v2.sub(b, a)), L = v2.len(v2.sub(b, a));
      const n = { x: dir.z * side, z: -dir.x * side }; // away from the road
      const setback = way.width / 2 + way.pave + 0.15;
      const rot = Math.atan2(-n.x, -n.z);
      let s = 0;
      while (s < L) {
        const mid = v2.add(a, v2.scale(dir, s));
        const terrace = isTerrace(way) && !inDocks(mid.x, mid.z);
        const style = terrace ? (rand() < 0.85 ? S.GEORGIAN : S.STUCCO) : styleFor(mid.x, mid.z, way);
        const spec = lotSpec(style);
        if (terrace) Object.assign(spec, { w: 2 * spec.bay + 0.5, d: 9 + rand() * 3, floors: rand() < 0.8 ? 2 : 3, fh: 3.2 });
        else if (nearCroke(mid.x, mid.z)) spec.floors = way.type === 'primary' ? 3 : rand() < 0.8 ? 2 : 3;
        else if (nearParkgate(mid.x, mid.z)) { const c = v2.add(mid, v2.scale(n, 12)); spec.floors = parkgateFloors(c.x, c.z, way.type === 'primary' || way.type === 'quay'); }
        else if (inBrewery(mid.x, mid.z)) spec.floors = breweryFloors(mid.x, mid.z);
        else if (inSilicon(mid.x, mid.z) && style === S.MODERN) spec.floors = Math.min(spec.floors, 8);
        const garden = terrace ? 2.2 : 0;
        if (s + spec.w > L + 3) { s += 2; continue; }
        let placed = false;
        for (const df of [1, 0.7, 0.5]) {
          const d = spec.d * df;
          if (d < 6) break;
          const c = v2.add(a, v2.scale(dir, s + spec.w / 2));
          const o = { x: c.x + n.x * (setback + garden + d / 2), z: c.z + n.z * (setback + garden + d / 2), rot, w: spec.w, d };
          if (testOBB(o)) { place(o, style, spec, true); placed = true; break; }
        }
        s += placed ? spec.w : 1.5;
      }
    }
  }
}
const frontageCount = lots.length;

// Interior backfill so block cores aren't empty when seen from above or across open ground
for (let z = B.minZ + 10; z < B.maxZ - 10; z += 11) {
  for (let x = B.minX + 10; x < B.maxX - 10; x += 11) {
    if (occupied(x, z)) continue;
    const road = world.nearestRoad(x, z);
    const seg = road ? road.seg : null;
    const rot = seg ? Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z) : 0;
    const style = inDocks(x, z) || inSilicon(x, z) ? S.MODERN : rand() < (nearCroke(x, z) ? 0.85 : 0.5) ? S.BRICK : S.STUCCO;
    for (const size of [14, 10, 7]) {
      const o = { x, z, rot, w: size + rand() * 3, d: size + rand() * 3 };
      if (testOBB(o)) {
        const spec = lotSpec(style);
        // block interiors stay lower than the street frontage (keeps Docklands from becoming a wall of towers)
        spec.floors = style === S.MODERN ? 3 + Math.floor(rand() * 4) : nearCroke(x, z) ? 2 : Math.max(3, spec.floors - 1);
        if (road && isTerrace(road.way)) spec.floors = 2; // back returns and mews behind the terraces
        if (nearParkgate(x, z)) spec.floors = Math.min(spec.floors, parkgateFloors(x, z, false));
        if (inBrewery(x, z)) spec.floors = breweryFloors(x, z) - 1; // brewery sheds and yards
        place(o, style, spec, false);
        break;
      }
    }
  }
}

// ---------- textures ----------
// Flemish-bond brick, 1.8 m tile. R: brick tone, G: hue variation, B: mortar mask (1 = mortar).
function brickTexture() {
  const size = 512, c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const n = fbmFast(size, 4, 17);
  const img = ctx.createImageData(size, size);
  const courses = 21, ch = size / courses;
  const unit = size / 5, str = unit * (0.235 / 0.3575), hdr = unit - str;
  const r2 = rng(5);
  const tones = new Float32Array(4096), hues = new Float32Array(4096);
  for (let i = 0; i < 4096; i++) { tones[i] = r2(); hues[i] = r2(); }
  const mortar = Math.max(1.6, size / 1.8 * 0.01);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / ch), fy = y - row * ch;
    const shift = row % 2 ? unit * 0.25 : 0;
    for (let x = 0; x < size; x++) {
      const xs = (x + shift) % size;
      const u = Math.floor(xs / unit), fu = xs - u * unit;
      const isHeader = fu >= str;
      const fx = isHeader ? fu - str : fu, bw = isHeader ? hdr : str;
      const id = (row * 11 + u * 2 + (isHeader ? 1 : 0)) % 4096;
      const m = fy < mortar || fx < mortar || (bw - fx) < 0.3 ? 1 : 0;
      const i = (y * size + x) * 4;
      // headers in Flemish bond are often darker ("burnt" ends)
      const tone = tones[id] * 0.75 + n[y * size + x] * 0.25 - (isHeader ? 0.12 : 0);
      img.data[i] = Math.max(0, Math.min(255, tone * 255));
      img.data[i + 1] = hues[id] * 255;
      img.data[i + 2] = m * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Shop fascia names (invented), white on transparent: 2 columns x 32 rows of 512 x 64.
const SHOP_NAMES = [
  "KAVANAGH'S", "O'REILLY & SONS", 'THE LIFFEY CAFÉ', 'BYRNE PHARMACY', "DOYLE'S BAR", 'MURRAY BOOKS', 'NOLAN OPTICIANS', "FITZGERALD'S",
  'CASEY & CO.', 'THE GEORGIAN DELI', 'WALSH BUTCHERS', "QUINN'S", "HANLON'S BAR", 'MORAN HARDWARE', "FLANAGAN'S", 'LENNON TAILORS',
  'GALLAGHER BAKERY', 'HEGARTY NEWS', 'CULLEN & SON', "MAHER'S", 'RYAN JEWELLERS', 'THE COPPER KETTLE', 'TWO BRIDGES CAFÉ', 'SMYTH SHOES',
  'CONWAY PHARMACY', "DALY'S", 'PURCELL FLOWERS', 'CORCORAN & CO.', "DEVLIN'S", 'MCGRATH BUTCHERS', "SHEEHAN'S", 'KINSELLA WINES',
  "FARRELL'S BAR", 'LYNCH ELECTRICAL', "TIERNEY'S", "O'DWYER'S", 'GRACE BOOKS', 'HALPIN OPTICIANS', "BURKE'S", 'THE QUAYS BAR',
  'MOONEY TOBACCONIST', 'CARROLL GIFTS', 'SWEENEY CHEMIST', 'THE BRAZEN LAMP', 'HOGAN & DUNNE', 'CLARKE BICYCLES', "KEEGAN'S", 'THE MARLIN',
  'DORAN CAFÉ', 'MULLIGAN STATIONERS', 'BARRY PHOTO', 'THE OLD STAND', "GAVIN'S", 'NUGENT OPTICIANS', 'PHELAN TAILORS', "LAWLOR'S",
  'THE STONE BOWL', 'COYLE BOOKS', "REDMOND'S", 'THE RAG TRADE', 'MOLONEY HATS', 'CAHILL & CO.', "HYNES'S", 'THE BLUE DOOR',
];
function signAtlas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 2048;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  SHOP_NAMES.forEach((name, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const serif = /'S$|BAR|INN|THE /.test(name) || i % 3 === 0;
    ctx.font = serif ? 'bold 44px Georgia, "Times New Roman", serif' : 'bold 40px "Arial Narrow", Arial, sans-serif';
    let w = ctx.measureText(name).width;
    const sx = Math.min(1, 470 / w);
    ctx.save(); ctx.translate(col * 512 + 256, row * 64 + 33); ctx.scale(sx, 1); ctx.fillText(name, 0, 0); ctx.restore();
  });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

export const buildingUniforms = {
  uNight: { value: 0 }, uWet: { value: 0 }, uIndoor: { value: 0.22 },
  uBrick: { value: null }, uSigns: { value: null }, uNoise: { value: null },
};

const FACADE_GLSL = /* glsl */ `
  uniform float uNight; uniform float uWet; uniform float uIndoor;
  uniform sampler2D uBrick; uniform sampler2D uSigns; uniform sampler2D uNoise;
  varying vec3 vBase; varying vec3 vTrim; varying vec4 vStyle; varying vec4 vExtra; varying vec4 vFacade; varying float vFace;
  varying vec3 vWPos; varying vec3 vFN;
  float gGlass; vec3 gEmit; float gH; float gBump; float gRough; float gMetal;
  float bh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float inRect(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
  vec3 hsv(float h, float s, float v) { vec3 k = clamp(abs(mod(h * 6.0 + vec3(0, 4, 2), 6.0) - 3.0) - 1.0, 0.0, 1.0); return v * mix(vec3(1), k, s); }

  // Interior mapping: the room behind a window. q: position on the glass (m, x centred, y above the floor),
  // rd: view ray in facade space (x along the facade, y up, z into the building).
  vec3 room(vec2 q, vec3 rd, float rs, float fh, float lit, float shop, float office) {
    float rw = mix(3.4, 6.0, shop), D = mix(4.5, 7.0, shop);
    vec3 ro = vec3(q.x, q.y, 0.0);
    vec3 r = normalize(rd);
    vec3 inv = 1.0 / max(abs(r), vec3(1e-4));
    float sgx = r.x >= 0.0 ? 1.0 : -1.0, sgy = r.y >= 0.0 ? 1.0 : -1.0;
    float tx = max(0.0, (sgx * rw * 0.5 - ro.x) * sgx) * inv.x;
    float ty = max(0.0, ((r.y >= 0.0 ? fh - 0.25 : 0.0) - ro.y) * sgy) * inv.y;
    float tz = D * inv.z;
    float t = min(tx, min(ty, tz));
    vec3 p = ro + r * t;
    float h1 = bh(vec2(rs, 1.3)), h2 = bh(vec2(rs, 2.7));
    vec3 wallC = office > 0.5 ? vec3(0.78, 0.78, 0.76) : hsv(h1 * 0.2 + 0.05, 0.12 + 0.18 * h2, 0.5 + 0.3 * h2);
    vec3 c;
    if (t == tz) {
      c = wallC;
      // furniture / shelving silhouettes against the back wall
      float furn = step(p.y, 0.9 + 0.5 * bh(vec2(rs, floor(p.x)))) * step(0.3, fract(p.x * 0.45 + h1));
      c = mix(c, hsv(h2, 0.3, 0.25), furn * (1.0 - office * 0.5));
      if (shop > 0.5) c = mix(c, hsv(fract(p.x * 0.37 + h1), 0.5, 0.6), step(0.5, fract(p.y * 2.5)) * step(0.2, fract(p.x * 1.3)));
      // a framed picture
      c = mix(c, hsv(h2 + 0.3, 0.4, 0.35), inRect(p.xy, vec2(-0.5 + h1, 1.5), vec2(0.2 + h1, 2.1)) * (1.0 - shop));
    } else if (t == tx) c = wallC * 0.78;
    else if (r.y < 0.0) c = office > 0.5 ? vec3(0.35, 0.36, 0.38) : vec3(0.32, 0.2, 0.12) * (0.85 + 0.15 * step(0.5, fract(p.x * 5.0)));
    else {
      c = vec3(0.86);
      // ceiling light fitting
      float l = office > 0.5 ? step(0.8, fract(p.z * 0.8)) * step(0.3, fract(p.x * 0.6)) : 1.0 - smoothstep(0.1, 0.35, length(p.xz - vec2(0.0, D * 0.5)));
      c += l * lit * 3.0;
    }
    float fall = 1.0 / (1.0 + t * 0.18);
    vec3 warm = office > 0.5 ? vec3(0.95, 0.9, 0.8) : vec3(1.0, 0.78, 0.5);
    float day = uIndoor * (1.0 - uNight) * mix(1.0, 0.55, shop);
    // offices are glazed floor to ceiling, so a lit one fills the whole bay: keep it well below a lit sash window
    return c * fall * (day + lit * warm * mix(0.75, 0.42, shop) * mix(1.0, 0.38, office));
  }
`;

function makeMaterial() {
  buildingUniforms.uBrick.value = brickTexture();
  buildingUniforms.uSigns.value = signAtlas();
  buildingUniforms.uNoise.value = noiseTexture;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, buildingUniforms, lampUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aBase; attribute vec3 aTrim; attribute vec4 aStyle; attribute vec4 aExtra;
        varying vec3 vBase; varying vec3 vTrim; varying vec4 vStyle; varying vec4 vExtra; varying vec4 vFacade; varying float vFace;
        varying vec3 vWPos; varying vec3 vFN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        float uu = abs(normal.x) > 0.5 ? (normal.x > 0.0 ? 0.5 - position.z : position.z + 0.5) * sc.z
                                       : (normal.z > 0.0 ? position.x + 0.5 : 0.5 - position.x) * sc.x;
        vFacade = vec4(uu, position.y * sc.y, abs(normal.x) > 0.5 ? sc.z : sc.x, sc.y);
        vFace = normal.y > 0.5 ? 0.0 : normal.z > 0.5 ? 1.0 : normal.z < -0.5 ? 2.0 : 3.0;
        vBase = aBase; vTrim = aTrim; vStyle = aStyle; vExtra = aExtra;
        vWPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        vFN = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * normal));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FACADE_GLSL}\n${LAMP_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float style = vStyle.x, fh = vStyle.y, bw = vStyle.z, seed = vStyle.w;
          float doorBay = vExtra.x, signIdx = vExtra.y, weather = vExtra.z, frontage = vExtra.w;
          float u = vFacade.x, v = vFacade.y, W = vFacade.z, H = vFacade.w;
          gGlass = 0.0; gEmit = vec3(0.0); gH = 0.5;
          // surface finish per facade element (roughness / metalness): brick, render, paint, stone, lead, metal
          gRough = 0.9; gMetal = 0.0;
          // textures sampled up front (uniform control flow keeps mip selection right)
          vec4 bt = texture2D(uBrick, vec2(u, v) / 1.8);
          vec4 nz = texture2D(uNoise, vec2(u * 0.06 + seed * 7.0, v * 0.05 + seed * 3.0));
          vec4 nzF = texture2D(uNoise, vec2(u, v) * 0.35 + seed);
          float nb = max(1.0, floor(W / bw + 0.5));
          float bayW = W / nb;
          float nfl = max(1.0, floor((H - 0.5) / fh));
          vec2 signUv; {
            float cell = mod(signIdx, 64.0);
            float sw = min(W * 0.8, fh * 0.18 * 8.0); // keep the 8:1 lettering aspect
            float sx = clamp((u - (W - sw) * 0.5) / sw, 0.0, 1.0);
            float sy = clamp((v - fh * 0.765) / (fh * 0.18), 0.0, 1.0);
            signUv = vec2((mod(cell, 2.0) + sx) * 0.5, 1.0 - (floor(cell / 2.0) + 1.0 - sy) / 32.0);
          }
          float signA = texture2D(uSigns, signUv).a;

          vec3 V = normalize(vWPos - cameraPosition);
          vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), vFN) + vec3(1e-5, 0.0, 0.0));
          vec3 vt = vec3(dot(V, T), V.y, dot(V, vFN)); // x along the facade, y up, z out of the wall
          vec3 rdRoom = vec3(vt.x, vt.y, -vt.z);
          float fw = max(fwidth(u), fwidth(v)); // metres per pixel
          float lod = smoothstep(0.16, 0.42, fw); // a bay is ~6 px wide when this reaches 1
          float mortarFade = smoothstep(0.012, 0.035, fw);
          // Relief (mortar joints, rustication, sills) is shaded from screen-space derivatives of the pattern.
          // Once the pattern is only a few pixels across those derivatives alias into moire rings, so the
          // relief fades out by ~7 mm per pixel (a few metres away on a phone) and is fully off beyond that.
          gBump = 1.0 - smoothstep(0.0025, 0.007, fw);

          bool brick = style < 1.5;
          vec3 wall;
          if (brick) {
            vec3 b = vBase * (0.7 + 0.55 * bt.r);
            b = mix(b, b * vec3(1.1, 0.92, 0.82), smoothstep(0.55, 1.0, bt.g));
            b = mix(b, b * vec3(0.82, 0.86, 0.9), smoothstep(0.45, 0.0, bt.g) * 0.6);
            float mortarVis = bt.b * (1.0 - mortarFade) + 0.18 * mortarFade;
            wall = mix(b, vec3(0.58, 0.56, 0.52) * (0.85 + 0.2 * nzF.r), mortarVis);
            gH = 1.0 - bt.b;
            gRough = mix(0.86, 0.97, mortarVis);               // fired brick, sandy mortar
          } else {
            wall = vBase * (0.93 + 0.1 * nzF.r);
            gH = nzF.r * 0.3;
            gRough = style > 2.5 && style < 3.5 ? 0.58 : 0.7;  // masonry paint (Temple Bar) / painted render
          }
          // building-scale weathering: patchy tone, soot toward the top, grime toward the street
          wall *= 0.88 + 0.22 * nz.r;
          wall *= 1.0 - 0.18 * weather * smoothstep(H * 0.6, H, v) * nz.g;
          wall *= 0.8 + 0.2 * smoothstep(0.0, 3.5, v);
          // rain darkens masonry, more toward the street where splash-back soaks it
          wall *= 1.0 - uWet * (0.12 + 0.1 * smoothstep(2.0, 0.0, v));

          vec3 col = wall;
          if (vFace < 0.5) {
            // roof: lead / felt with seams
            col = mix(vec3(0.21, 0.22, 0.23), vec3(0.3, 0.29, 0.27), bh(vec2(seed, 1.0)));
            gRough = mix(0.72, 0.3, uWet); // weathered lead and felt; wet roofs sheen
            col *= 0.85 + 0.25 * nz.r;
            gH = 0.5;
          } else if (lod < 0.97) {
            float bi = floor(u / bayW), fx = u - bi * bayW - bayW * 0.5; // metres from bay centre
            float fl = floor(v / fh), fy = v - fl * fh;
            bool front = vFace > 0.5 && vFace < 1.5;
            bool side = vFace > 2.5;
            float roomSeed = bi * 13.1 + fl * 7.7 + seed * 91.0 + vFace * 3.0;
            float lit = step(0.62, bh(vec2(roomSeed, 4.1))) * uNight;
            vec3 white = vec3(0.82, 0.81, 0.77);

            if (v > nfl * fh) {
              // parapet with stone coping; stucco gets a cornice
              if (v > H - 0.18) { col = vec3(0.7, 0.68, 0.64) * (0.9 + 0.2 * nzF.r); gRough = 0.82; }
              else if (!brick && v < nfl * fh + 0.25) col = wall * 1.08;
            } else if (style > 3.5) {
              // curtain wall: mullions, spandrel band at each slab, offices behind
              float cellW = 1.6;
              float cx = mod(u, cellW);
              float mull = 1.0 - step(0.05, cx) * step(cx, cellW - 0.05);
              float spandrel = step(fy, 0.9);
              if (spandrel > 0.5) { col = vTrim * (0.9 + 0.1 * nzF.r); gRough = 0.35; gMetal = 0.55; } // aluminium cladding
              else if (mull > 0.5) { col = vec3(0.16, 0.17, 0.18); gRough = 0.4; gMetal = 0.85; }
              else {
                float officeLit = step(0.62, bh(vec2(floor(u / 4.8) + seed * 5.0, fl))) * uNight;
                vec3 inside = room(vec2(cx - cellW * 0.5, fy), rdRoom, floor(u / 4.8) + fl * 3.0 + seed * 50.0, fh, officeLit, 0.0, 1.0);
                // blinds on some floors
                float blind = step(0.7, bh(vec2(fl, seed))) * step(fh - 0.6 - 1.5 * bh(vec2(bi, fl)), fy) * step(0.5, fract(fy * 12.0));
                inside = mix(inside, vec3(0.6) * (0.2 + officeLit * 0.4) * mix(1.0, 0.35, uNight), blind);
                col = vBase * 0.12; gGlass = 1.0; gEmit = inside;
              }
            } else {
              bool ground = fl < 0.5;
              bool shopfront = ground && front && frontage > 0.5 && style > 0.5;
              bool georgianGround = ground && style < 0.5;
              if (georgianGround) {
                // rusticated granite / painted stucco ground floor
                vec3 g = bh(vec2(seed, 9.0)) > 0.4 ? vec3(0.58, 0.57, 0.54) : vec3(0.84, 0.81, 0.74);
                float joint = step(fract(v / 0.38), 0.06);
                col = g * (0.9 + 0.15 * nzF.r) * (1.0 - joint * 0.35);
                gRough = g.r < 0.7 ? 0.8 : 0.62; // granite / painted stucco rustication
                gH = 1.0 - joint;
              }
              if (shopfront) {
                // pilasters, fascia with the shop name, display window, stall riser
                float edge = min(u, W - u);
                bool pilaster = edge < 0.35;
                gRough = 0.36; // painted timber shopfront (the glass sets its own finish)
                if (pilaster) col = vTrim * 0.85;
                else if (fy > fh * 0.76 && fy < fh * 0.94) {
                  float bright = dot(vTrim, vec3(0.3, 0.59, 0.11));
                  vec3 txt = bright > 0.45 ? vec3(0.1) : (bh(vec2(seed, 5.0)) > 0.5 ? vec3(0.85, 0.66, 0.28) : vec3(0.93, 0.9, 0.82));
                  col = mix(vTrim, txt, signA);
                  gEmit = signA * uNight * txt * 0.35;
                } else if (fy >= fh * 0.94) col = vTrim * 1.15;
                else if (fy < 0.55) col = vTrim * 0.75;
                else {
                  float pane = mod(u - 0.35, 1.7);
                  bool mullion = pane < 0.05;
                  float doorX = 0.35 + (doorBay > 0.5 ? W - 1.8 : 0.4);
                  bool door = u > doorX && u < doorX + 1.0;
                  if (mullion) col = vTrim * 0.8;
                  else {
                    float shopLit = step(0.25, bh(vec2(seed, 6.0))) * uNight;
                    vec3 inside = room(vec2(mod(u, 5.0) - 2.5, fy), rdRoom, seed * 31.0 + floor(u / 5.0), fh, shopLit, 1.0, 0.0);
                    if (door) inside *= 0.5;
                    col = vec3(0.02); gGlass = 1.0; gEmit = inside;
                  }
                }
              } else if (georgianGround && front && frontage > 0.5 && abs(bi - doorBay) < 0.5) {
                // Georgian door: stone surround with pilasters, panelled door, radial fanlight
                vec2 q = vec2(fx, fy);
                float dw = 0.56, dh = 2.3, fr = dw;
                float r = length(q - vec2(0.0, dh));
                bool inDoor = abs(q.x) < dw && q.y < dh;
                bool inFan = q.y >= dh && r < fr;
                bool surround = abs(q.x) < dw + 0.28 && (q.y < dh || r < fr + 0.2) && !inDoor && !inFan;
                if (surround) { col = vec3(0.86, 0.84, 0.78) * (0.92 + 0.1 * nzF.r); gH = 0.8; gRough = 0.8; }
                if (inDoor) {
                  vec2 pp = vec2(abs(q.x) / dw, q.y / dh);
                  float panel = inRect(fract(pp * vec2(1.0, 3.0)), vec2(0.2, 0.15), vec2(0.8, 0.85));
                  col = vTrim * mix(0.78, 1.0, panel);
                  gRough = 0.26; // Georgian doors are gloss-painted
                  gH = 0.3 + 0.2 * panel;
                  if (length(q - vec2(0.0, 1.45)) < 0.05) col = vec3(0.8, 0.65, 0.3);
                }
                if (inFan) {
                  float ang = atan(q.y - dh, q.x);
                  float bars = max(step(0.85, fract(ang * 2.55)), step(fr - 0.06, r));
                  vec3 fan = mix(vec3(0.05, 0.06, 0.07), vec3(1.0, 0.8, 0.5) * 0.9, uNight * step(0.3, bh(vec2(seed, 8.0))));
                  col = mix(fan, white, bars); gGlass = 1.0 - bars;
                  gEmit = (1.0 - bars) * uNight * vec3(1.0, 0.75, 0.45) * 0.8 * step(0.3, bh(vec2(seed, 8.0)));
                }
              } else if (!(side && W < 11.0)) {
                // sash window in a recessed opening; Georgian windows diminish as you go up
                vec2 hw = vec2(0.52, fh * 0.3);
                float y0 = fh * 0.24;
                if (style < 0.5) {
                  if (fl > 0.5 && fl < 1.5) { hw.y = fh * 0.34; y0 = fh * 0.14; }
                  else if (fl > nfl - 1.5) { hw.y = fh * 0.2; y0 = fh * 0.3; }
                  if (ground) { hw.y = fh * 0.26; y0 = fh * 0.3; }
                } else if (style > 2.5) { hw.x = 0.5; }
                else hw.x = 0.58;
                vec2 q = vec2(fx, fy - y0 - hw.y); // centred on the opening
                float depth = 0.14;
                vec2 shift = rdRoom.xy / max(rdRoom.z, 0.08) * depth;
                vec2 qg = q + shift;
                bool opening = abs(q.x) < hw.x && abs(q.y) < hw.y;
                if (opening) {
                  if (abs(qg.x) > hw.x || abs(qg.y) > hw.y) {
                    col = wall * 0.5; // reveal
                  } else {
                    vec2 w = (qg + hw) / (2.0 * hw); // 0..1 across the glass
                    vec2 px = vec2(fw) / (2.0 * hw); // derivative from uniform control flow
                    float fr = 0.055 / (2.0 * hw.x), frY = 0.055 / (2.0 * hw.y);
                    float frame = 1.0 - inRect(w, vec2(fr, frY), vec2(1.0 - fr, 1.0 - frY));
                    float meet = step(abs(w.y - 0.5), 0.02);
                    float panesX = style < 0.5 ? 3.0 : style > 2.5 ? 2.0 : 1.0;
                    float panesY = style < 0.5 ? 6.0 : 2.0;
                    float bx = abs(fract(w.x * panesX + 0.5) - 0.5) / panesX, by = abs(fract(w.y * panesY + 0.5) - 0.5) / panesY;
                    float bars = max(1.0 - smoothstep(0.012, 0.012 + px.x, bx), 1.0 - smoothstep(0.008, 0.008 + px.y, by));
                    bars *= 1.0 - smoothstep(0.03, 0.08, fw);
                    float solid = max(frame, max(meet, bars));
                    gRough = mix(gRough, 0.42, solid); // painted sash frames
                    vec3 frameCol = style > 2.5 && bh(vec2(seed, 2.0)) > 0.6 ? vTrim : white;
                    // curtains and blinds just behind the glass
                    float cw = 0.12 + 0.3 * bh(vec2(roomSeed, 5.5));
                    float curtain = (step(w.x, cw) + step(1.0 - cw, w.x)) * step(0.35, bh(vec2(roomSeed, 6.6)));
                    float blind = step(1.0 - 0.45 * bh(vec2(roomSeed, 7.7)), w.y) * step(0.7, bh(vec2(roomSeed, 8.8)));
                    vec3 inside = room(vec2((w.x - 0.5) * 2.0 * hw.x, y0 + w.y * 2.0 * hw.y), rdRoom, roomSeed, fh, lit, 0.0, 0.0);
                    vec3 fabric = hsv(bh(vec2(roomSeed, 9.9)), 0.25, 0.4) * (0.8 + 0.2 * sin(w.x * 60.0));
                    float light = uIndoor * (1.0 - uNight) + lit * 0.9;
                    inside = mix(inside, fabric * light, max(curtain, blind * 0.9));
                    col = mix(vec3(0.015, 0.02, 0.025), frameCol, solid);
                    gGlass = 1.0 - solid;
                    gEmit = inside * (1.0 - solid);
                  }
                } else {
                  // stone sill below, brick flat arch or stucco architrave above
                  if (abs(q.x) < hw.x + 0.12 && q.y < -hw.y && q.y > -hw.y - 0.1) { col = vec3(0.74, 0.72, 0.67) * (0.9 + 0.15 * nzF.r); gH = 0.9; gRough = 0.85; }
                  else if (brick && !georgianGround && abs(q.x) < hw.x + 0.08 && q.y > hw.y && q.y < hw.y + 0.28) col = wall * vec3(1.05, 0.95, 0.9);
                  else if (!brick && style < 2.5 && abs(q.x) < hw.x + 0.14 && q.y > -hw.y && q.y < hw.y + 0.14) col = mix(wall, vec3(0.86, 0.84, 0.8), 0.6);
                  // rain streaks under sills
                  if (abs(q.x) < hw.x && q.y < -hw.y - 0.1) col *= 1.0 - 0.18 * weather * smoothstep(-hw.y - 2.2, -hw.y - 0.1, q.y) * step(0.45, texture2D(uNoise, vec2(u * 1.7, 0.1)).r);
                }
              }
            }
          }
          if (vFace > 0.5) {
            // far away: average colour so the window grid does not shimmer
            vec3 avg = mix(wall, vec3(0.05, 0.06, 0.07), style > 3.5 ? 0.7 : 0.28);
            // far away the lit windows average out; keep it faint so night facades stay dark with a warm speckle
            float litAvg = uNight * 0.1;
            col = mix(col, avg, lod);
            gEmit = mix(gEmit, vec3(1.0, 0.75, 0.45) * litAvg * 0.28 * (style > 3.5 ? 0.6 : 1.0) + uIndoor * (1.0 - uNight) * 0.02, lod);
            gGlass = mix(gGlass, 0.25, lod);
          }
          diffuseColor.rgb = col;
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // bump from the procedural height (mortar joints, rustication, sills)
          vec3 sp = -vViewPosition;
          vec3 sx = dFdx(sp), sy = dFdy(sp);
          vec2 dh = vec2(dFdx(gH), dFdy(gH)) * 0.35 * (1.0 - gGlass) * gBump;
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1);
          vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
          normal = normalize(abs(det) * normal - grad);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(gRough * (1.0 - uWet * 0.4), 0.06, gGlass);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = gMetal * (1.0 - gGlass);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += gEmit;`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        if (vFace > 0.5) {
          // street lamps stand 1-2 m out from the facade: sample the lamp map just outside the wall, fading upward
          vec3 lampL = lampLight(vWPos.xz + vFN.xz * 1.8) * exp(-max(vWPos.y - 2.5, 0.0) / 4.5);
          reflectedLight.directDiffuse += diffuseColor.rgb * lampL * 2.0 * (1.0 - gGlass);
        }`);
  };
  // window glass reflects the environment at the preset level; walls keep the plain low level
  // window glass and metal cladding reflect the environment at the preset level; walls keep the plain low level
  return addReflections(mat, 0.9, 'max(gGlass, gMetal)');
}

// Georgian basement areas: railings on the pavement, a dark area below, granite steps up to the door.
function buildGeorgianFronts(scene) {
  const rail = [], pit = [], steps = [];
  for (const L of lots) {
    if (L.style !== S.GEORGIAN || !L.frontage) continue;
    const c = Math.cos(L.rot), s = Math.sin(L.rot);
    const toW = (lx, lz) => ({ x: L.x + lx * c + lz * s, z: L.z - lx * s + lz * c });
    const bayW = L.w / L.nb, zF = L.d / 2, zR = zF + 1.3;
    const doorX = -L.w / 2 + (L.doorBay + 0.5) * bayW;
    const gap = [doorX - 0.8, doorX + 0.8];
    for (const [x0, x1] of [[-L.w / 2 + 0.05, gap[0]], [gap[1], L.w / 2 - 0.05]]) {
      if (x1 - x0 < 0.3) continue;
      rail.push([toW(x0, zR), toW(x1, zR)]);
      pit.push([toW(x0, zF), toW(x1, zF), toW(x1, zR), toW(x0, zR)]);
      addSegment(toW(x0, zR).x, toW(x0, zR).z, toW(x1, zR).x, toW(x1, zR).z);
    }
    // side returns of the railings at the door gap
    for (const x of gap) { rail.push([toW(x, zF), toW(x, zR)]); addSegment(toW(x, zF).x, toW(x, zF).z, toW(x, zR).x, toW(x, zR).z); }
    steps.push({ ...toW(doorX, zF + 0.7), rot: L.rot });
  }
  // railings: vertical ribbons with an alpha-tested bar texture
  const rc = document.createElement('canvas');
  rc.width = 64; rc.height = 128;
  const rx = rc.getContext('2d');
  rx.fillStyle = '#141615';
  rx.fillRect(0, 14, 64, 5); rx.fillRect(0, 110, 64, 5);
  for (let x = 4; x < 64; x += 12) {
    rx.fillRect(x, 6, 3, 122);
    rx.beginPath(); rx.moveTo(x - 2, 8); rx.lineTo(x + 1.5, 0); rx.lineTo(x + 5, 8); rx.fill();
  }
  const rt = new THREE.CanvasTexture(rc);
  rt.wrapS = THREE.RepeatWrapping; rt.colorSpace = THREE.SRGBColorSpace;
  const pos = [], uv = [], idx = [];
  const Y0 = KERB_H, Y1 = KERB_H + 1.05;
  for (const [a, b] of rail) {
    const k = pos.length / 3, L = Math.hypot(b.x - a.x, b.z - a.z) / 0.5;
    pos.push(a.x, Y0, a.z, b.x, Y0, b.z, b.x, Y1, b.z, a.x, Y1, a.z);
    uv.push(0, 0, L, 0, L, 1, 0, 1);
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  rg.setIndex(idx); rg.computeVertexNormals();
  const railMesh = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0 }));
  railMesh.castShadow = true;
  // dark basement areas
  const pp = [], pi = [];
  for (const q of pit) {
    const k = pp.length / 3;
    for (const p of q) pp.push(p.x, KERB_H + 0.006, p.z);
    pi.push(k, k + 2, k + 1, k, k + 3, k + 2);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  pg.setIndex(pi); pg.computeVertexNormals();
  const pitMesh = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: 0x1a1b1c, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide }));
  // granite steps
  const sg = new THREE.BoxGeometry(1.6, 0.34, 1.4); sg.translate(0, 0.17, 0);
  const stepMesh = chunkedInstances(sg, new THREE.MeshStandardMaterial({ color: 0x9a9892, roughness: 0.85 }), steps, { y: KERB_H });
  scene.add(railMesh, pitMesh, stepMesh);
}

export function buildBuildings(scene) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const count = lots.length;
  const aBase = new Float32Array(count * 3), aTrim = new Float32Array(count * 3), aStyle = new Float32Array(count * 4), aExtra = new Float32Array(count * 4);
  const mats = new Float32Array(count * 16);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const chimneys = [], pots = [];
  lots.forEach((L, i) => {
    q.setFromAxisAngle(up, L.rot);
    m4.compose(new THREE.Vector3(L.x, 0, L.z), q, new THREE.Vector3(L.w, L.h, L.d));
    m4.toArray(mats, i * 16);
    aBase.set([L.base.r, L.base.g, L.base.b], i * 3);
    aTrim.set([L.trim.r, L.trim.g, L.trim.b], i * 3);
    aStyle.set([L.style, L.fh, L.bay, L.seed], i * 4);
    aExtra.set([L.doorBay, L.sign, L.weather, L.frontage ? 1 : 0], i * 4);
    addBox(L.x, L.z, L.w / 2, L.d / 2, L.rot);
    if (L.style === S.GEORGIAN || L.style === S.BRICK) {
      // chimney stacks on the party walls, each with a row of clay pots
      for (const sx of [-1, 1]) {
        if (rand() < 0.3) continue;
        const lx = sx * (L.w / 2 - 0.45), lz = (rand() - 0.5) * L.d * 0.3;
        const c = Math.cos(L.rot), s = Math.sin(L.rot);
        const ch = { x: L.x + lx * c + lz * s, z: L.z - lx * s + lz * c, y: L.h, rot: L.rot, color: L.base, h: 1.4 + rand() * 0.8 };
        chimneys.push(ch);
        const n = L.frontage ? 2 + Math.floor(rand() * 3) : 0;
        for (let k = 0; k < n; k++) {
          const pz = -0.95 + (1.9 * (k + 0.5)) / n;
          pots.push({ x: ch.x + pz * s, z: ch.z + pz * c, y: ch.y - 0.2 + ch.h, h: 0.35 + rand() * 0.3 });
        }
      }
    }
  });
  // One instanced mesh per ~450 m chunk rather than one for the whole city, so the camera and the shadow
  // camera can cull whole districts (the map is ~2.4 km wide and holds >10k buildings).
  const material = makeMaterial(), CH = 450, buckets = new Map();
  lots.forEach((L, i) => {
    const k = `${Math.floor(L.x / CH)},${Math.floor(L.z / CH)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(i);
  });
  const mesh = new THREE.Group();
  mesh.name = 'buildings';
  const pick = (src, n, ids) => { const out = new Float32Array(ids.length * n); ids.forEach((i, j) => out.set(src.subarray(i * n, i * n + n), j * n)); return out; };
  for (const ids of buckets.values()) {
    const g = geo.clone();
    g.setAttribute('aBase', new THREE.InstancedBufferAttribute(pick(aBase, 3, ids), 3));
    g.setAttribute('aTrim', new THREE.InstancedBufferAttribute(pick(aTrim, 3, ids), 3));
    g.setAttribute('aStyle', new THREE.InstancedBufferAttribute(pick(aStyle, 4, ids), 4));
    g.setAttribute('aExtra', new THREE.InstancedBufferAttribute(pick(aExtra, 4, ids), 4));
    const im = new THREE.InstancedMesh(g, material, ids.length);
    im.instanceMatrix.array.set(pick(mats, 16, ids));
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    im.matrixAutoUpdate = false;
    mesh.add(im);
  }
  scene.add(mesh);

  const cgeo = new THREE.BoxGeometry(0.8, 1, 2.3);
  cgeo.translate(0, 0.5, 0);
  const cm = chunkedInstances(cgeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    chimneys.map((c) => ({ x: c.x, y: c.y - 0.2, z: c.z, rot: c.rot, s: new THREE.Vector3(1, c.h, 1), color: c.color })),
    { shadow: true, colors: (c) => c.color.clone().multiplyScalar(0.8), size: 450 });
  const pgeo = new THREE.CylinderGeometry(0.1, 0.13, 1, 5, 1, true);
  pgeo.translate(0, 0.5, 0);
  const pm = chunkedInstances(pgeo, new THREE.MeshStandardMaterial({ color: 0x9a5a3c, roughness: 0.85, side: THREE.DoubleSide }),
    pots.map((p) => ({ x: p.x, y: p.y, z: p.z, s: new THREE.Vector3(1, p.h, 1) })), { size: 450 });
  scene.add(cm, pm);
  buildGeorgianFronts(scene);

  return { mesh, count, frontageCount, lots };
}
