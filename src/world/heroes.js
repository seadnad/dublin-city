// Hero landmarks built in Blender (tools/blender/build_<name>.py -> public/models/<name>.glb). Each carries UVs into a
// small atlas that is painted here at load (patterns and cut-outs), so the GLBs stay tiny and nothing is baked into
// image files that would need regenerating. Models load after the city is up and replace any stand-in.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { addReflections } from '../render/reflect.js';
import { stoneTex } from './ground.js';
import { LITE } from '../render/quality.js';

const loader = new GLTFLoader();
loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`));

function atlas(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.anisotropy = 8;
  return t;
}

// ---------- Ha'penny Bridge ----------
// atlas regions (px, 1024): X-cell tile, railing tile, lamp-arch filigree, granite (see build_hapenny.py)
const IRON = '#ece6dd', IRON_SHADE = '#cfc7bb';
function paintHapenny(g, N) {
  g.clearRect(0, 0, N, N);
  // X-cell: a rectangular frame with both diagonals (the spandrel band's lattice), 1.2 m x 0.7 m
  {
    const [x, y, w, h] = [0, 0, 256, 160], t = 14;
    g.strokeStyle = IRON; g.lineCap = 'square';
    g.lineWidth = t; g.strokeRect(x + t / 2, y + t / 2, w - t, h - t);
    g.lineWidth = t * 0.75;
    g.beginPath(); g.moveTo(x + t, y + t); g.lineTo(x + w - t, y + h - t); g.moveTo(x + w - t, y + t); g.lineTo(x + t, y + h - t); g.stroke();
    g.fillStyle = IRON_SHADE; g.beginPath(); g.arc(x + w / 2, y + h / 2, 11, 0, Math.PI * 2); g.fill(); // boss at the crossing
  }
  // railing: plain close-set round bars with top and bottom rails and small spear finials, 1 m x 1.15 m
  {
    const [x, y, w, h] = [256, 0, 256, 256];
    g.fillStyle = IRON;
    g.fillRect(x, y + 18, w, 10); g.fillRect(x, y + h - 22, w, 12); g.fillRect(x, y + h * 0.55, w, 6);
    for (let k = 0; k < 9; k++) {
      const bx = x + 8 + k * (w / 9);
      g.fillRect(bx, y + 10, 6, h - 20);
      g.beginPath(); g.moveTo(bx - 3, y + 12); g.lineTo(bx + 3, y + 2); g.lineTo(bx + 9, y + 12); g.fill();
    }
  }
  // lamp arch: openwork ogee arch springing from both railings, scrolls in the spandrels, a finial at the apex
  {
    const [x, y, w, h] = [512, 0, 512, 512];
    g.save(); g.translate(x, y);
    g.strokeStyle = IRON; g.lineCap = 'round'; g.lineWidth = 22;
    const ogee = (inset) => {
      g.beginPath();
      g.moveTo(inset, h);
      g.bezierCurveTo(inset, h * 0.35, w / 2 - 40, h * 0.42, w / 2, 20 + inset * 0.4);
      g.bezierCurveTo(w / 2 + 40, h * 0.42, w - inset, h * 0.35, w - inset, h);
      g.stroke();
    };
    ogee(16); g.lineWidth = 13; ogee(62);
    g.lineWidth = 10;
    for (const sx of [1, -1]) {
      for (const [cy, r] of [[0.72, 44], [0.5, 34], [0.33, 24]]) {
        const cx = w / 2 + sx * (w * 0.18 + (1 - cy) * 60);
        g.beginPath(); g.arc(cx, h * cy, r, 0, Math.PI * 1.6 * sx > 0 ? Math.PI * 1.6 : -Math.PI * 1.6, sx < 0); g.stroke();
      }
      g.beginPath(); g.moveTo(w / 2 + sx * 60, h); g.lineTo(w / 2 + sx * 60, h * 0.78); g.stroke();
    }
    g.fillStyle = IRON; g.fillRect(w / 2 - 10, 0, 20, 60);
    g.restore();
  }
  // granite: the shared stone texture, darkened to Dublin quay granite
  {
    const [x, y, w, h] = [0, 512, 512, 512];
    if (stoneTex.image) g.drawImage(stoneTex.image, x, y, w, h);
    g.fillStyle = 'rgba(96,88,80,0.55)'; g.fillRect(x, y, w, h);
  }
}

const cache = new Map();
export function load(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`));
  return cache.get(name);
}

export async function placeHapenny(scene, site) {
  let gltf;
  try { gltf = await load('hapenny'); } catch (e) { console.warn('hapenny model failed to load', e); return null; }
  const map = atlas(1024, paintHapenny);
  const mats = {
    hp_iron: addReflections(new THREE.MeshStandardMaterial({ color: 0xece6dd, roughness: 0.42, metalness: 0 }), 0.5),
    hp_cut: new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.42 }),
    hp_granite: new THREE.MeshStandardMaterial({ map, roughness: 0.85 }),
    hp_asphalt: new THREE.MeshStandardMaterial({ color: 0x3e3e3e, roughness: 0.9 }),
    hp_lantern: new THREE.MeshStandardMaterial({ color: 0x8f9aad, emissive: 0xffd6a0, emissiveIntensity: 0.05, roughness: 0.15 }),
  };
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = mats[o.material.name] || o.material;
    o.castShadow = o.material !== mats.hp_asphalt;
    o.receiveShadow = true;
  });
  // the model runs north -> south along Blender +Y (three -Z); the site's local +z runs north -> south too
  root.rotation.y = site.rot + Math.PI;
  root.scale.set(1, 1, (site.d - 2) / 43);
  root.position.set(site.x, 0, site.z);
  root.name = "Ha'penny Bridge";
  scene.add(root);
  return { root, setNight(l) { mats.hp_lantern.emissiveIntensity = 0.05 + l * 3.5; } };
}

// ---------- stone landmarks (Christ Church, St Patrick's, Heuston): shared decal atlas and stone materials ----------
// decal atlas regions, px in 1024 (must match tools/blender/kit.py DECAL)
const DECAL = {
  lancet: [0, 0, 128, 384], lancet3: [128, 0, 384, 384], round: [512, 0, 128, 256], rose: [640, 0, 256, 256],
  louvre: [896, 0, 128, 384], cren: [0, 384, 512, 64], clock: [512, 384, 128, 128], door: [640, 256, 128, 256],
  oculus: [768, 256, 128, 128], sash: [896, 384, 128, 192], portal: [0, 448, 256, 320],
  attic: [512, 576, 512, 128], arcade: [256, 448, 256, 256],
};
const GLASS = '#1c2126', DRESS = '#d9c9a0', STONE_D = '#6e6b6c';
function paintDecals(g, N) {
  g.clearRect(0, 0, N, N);
  const arch = (x, y, w, h, pointed) => {
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + (pointed ? w * 0.9 : w / 2));
    if (pointed) { g.quadraticCurveTo(x, y, x + w / 2, y); g.quadraticCurveTo(x + w, y, x + w, y + w * 0.9); }
    else g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h); g.closePath();
  };
  const win = (x, y, w, h, pointed, lights = 1) => {
    g.fillStyle = DRESS; arch(x, y, w, h, pointed); g.fill();
    const m = Math.max(4, w * 0.12);
    g.fillStyle = GLASS; arch(x + m, y + m, w - 2 * m, h - m, pointed); g.fill();
    g.strokeStyle = 'rgba(160,150,120,0.8)'; g.lineWidth = 2;
    for (let k = 1; k < lights; k++) { const lx = x + m + ((w - 2 * m) * k) / lights; g.beginPath(); g.moveTo(lx, y + h * 0.25); g.lineTo(lx, y + h); g.stroke(); }
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x + m, y + (h * k) / 5 + m); g.lineTo(x + w - m, y + (h * k) / 5 + m); g.stroke(); }
  };
  { const [x, y, w, h] = DECAL.lancet; win(x + 24, y + 8, w - 48, h - 16, true); }
  { const [x, y, w, h] = DECAL.lancet3; // a stepped group of lancets, the middle one tallest
    const n = 5, lw = (w - 40) / n;
    for (let k = 0; k < n; k++) { const step = Math.abs(k - (n - 1) / 2) * 34; win(x + 20 + k * lw + 6, y + 8 + step, lw - 12, h - 16 - step, true); } }
  { const [x, y, w, h] = DECAL.round; win(x + 20, y + 8, w - 40, h - 16, false, 2); }
  { const [x, y, w] = DECAL.rose; const cx = x + w / 2, cy = y + w / 2, r = w / 2 - 6;
    g.fillStyle = DRESS; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = GLASS; g.beginPath(); g.arc(cx, cy, r - 14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = DRESS; g.lineWidth = 7;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); g.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14)); g.stroke(); }
    g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.stroke(); }
  { const [x, y, w, h] = DECAL.louvre; g.fillStyle = DRESS; arch(x + 16, y + 8, w - 32, h - 16, true); g.fill();
    g.fillStyle = '#2a2b2c'; arch(x + 26, y + 18, w - 52, h - 26, true); g.fill();
    g.fillStyle = '#56585a'; for (let yy = y + 70; yy < y + h - 10; yy += 18) g.fillRect(x + 26, yy, w - 52, 7); }
  { const [x, y, w] = DECAL.clock; const cx = x + w / 2, cy = y + w / 2;
    g.fillStyle = '#15171a'; g.beginPath(); g.arc(cx, cy, w / 2 - 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9a441'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, w / 2 - 10, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * (w / 2 - 22), cy + Math.sin(a) * (w / 2 - 22)); g.lineTo(cx + Math.cos(a) * (w / 2 - 14), cy + Math.sin(a) * (w / 2 - 14)); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 36); g.moveTo(cx, cy); g.lineTo(cx + 24, cy + 10); g.stroke(); }
  { const [x, y, w, h] = DECAL.door; g.fillStyle = DRESS; arch(x + 10, y + 6, w - 20, h - 6, true); g.fill(); g.fillStyle = '#2b1f18'; arch(x + 22, y + 18, w - 44, h - 18, true); g.fill(); }
  { const [x, y, w, h] = DECAL.oculus; g.fillStyle = DRESS; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 6, 0, Math.PI * 2); g.fill(); g.fillStyle = GLASS; g.beginPath(); g.arc(x + w / 2, y + h / 2, w / 2 - 20, 0, Math.PI * 2); g.fill(); }
  { const [x, y, w, h] = DECAL.sash; g.fillStyle = '#f2f0ea'; g.fillRect(x + 20, y + 10, w - 40, h - 20); g.fillStyle = GLASS; g.fillRect(x + 28, y + 18, w - 56, (h - 44) / 2); g.fillRect(x + 28, y + 26 + (h - 44) / 2, w - 56, (h - 44) / 2); }
  { const [x, y, w, h] = DECAL.portal; // a deep double doorway under one pointed arch with a tympanum roundel
    g.fillStyle = DRESS; arch(x + 8, y + 6, w - 16, h - 6, true); g.fill();
    g.fillStyle = '#4a4540'; arch(x + 28, y + 26, w - 56, h - 26, true); g.fill();
    g.fillStyle = '#2b1f18'; g.fillRect(x + 40, y + h * 0.45, (w - 92) / 2, h * 0.55); g.fillRect(x + w / 2 + 6, y + h * 0.45, (w - 92) / 2, h * 0.55);
    g.fillStyle = DRESS; g.beginPath(); g.arc(x + w / 2, y + h * 0.3, 26, 0, Math.PI * 2); g.fill(); }
  { const [x, y, w, h] = DECAL.attic; // Heuston's attic: carved arms either side of the inscription panels
    g.fillStyle = '#9d9a92'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#6f6d67'; g.lineWidth = 4; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
    g.fillStyle = '#4a4945'; g.font = 'bold 34px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('VIII VIC', x + w * 0.36, y + h / 2); g.fillText('A.D. 1844', x + w * 0.66, y + h / 2);
    for (const cx of [x + 40, x + w - 40]) { g.fillStyle = '#7d7a73'; g.beginPath(); g.ellipse(cx, y + h / 2, 22, 34, 0, 0, Math.PI * 2); g.fill(); } }
  { const [x, y, w, h] = DECAL.arcade; // rusticated round-headed arcade bay (ground floor)
    g.fillStyle = '#9d9a92'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(60,60,56,0.5)'; for (let yy = y + 20; yy < y + h; yy += 26) g.fillRect(x, yy, w, 3);
    g.fillStyle = '#2a3136'; arch(x + 56, y + 40, w - 112, h - 40, false); g.fill();
    g.strokeStyle = '#e6e3da'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + w / 2, y + 90); g.lineTo(x + w / 2, y + h); g.stroke(); }
  { const [x, y, , h] = DECAL.cren; g.fillStyle = STONE_D; for (let k = 0; k < 8; k++) g.fillRect(x + k * 64, y, 40, h); }
}
// tileable stone: calp rubble (grey, irregular), ashlar courses, slate, brick
function stoneTile(size, base, courses, jitter, mortar = 'rgba(40,38,36,0.55)') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size);
  let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ch = size / courses;
  for (let row = 0; row < courses; row++) {
    let x = -r() * 40;
    while (x < size) {
      const w = ch * (1.2 + r() * jitter * 2.5), l = (r() - 0.5) * 30;
      g.fillStyle = `hsl(30, 4%, ${45 + l * 0.5}%)`; g.globalAlpha = 0.35; g.fillRect(x, row * ch, w, ch); g.globalAlpha = 1;
      g.fillStyle = mortar; g.fillRect(x, row * ch, 2, ch);
      x += w;
    }
    g.fillStyle = mortar; g.fillRect(0, row * ch, size, 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
let stoneMats = null;
function stoneMaterials() {
  if (stoneMats) return stoneMats;
  const decal = atlas(1024, paintDecals);
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = true; return m; }; // AO baked into COLOR_0
  stoneMats = {
    decal: std({ map: decal, alphaTest: 0.5, roughness: 0.4, emissive: 0xffc27a, emissiveMap: decal, emissiveIntensity: 0 }),
    rubble: std({ map: stoneTile(256, '#8c8883', 10, 0.5), roughness: 0.9 }),
    ashlar: std({ map: stoneTile(256, '#b5a797', 6, 0.15, 'rgba(90,84,74,0.4)'), roughness: 0.85 }),
    slate: std({ map: stoneTile(128, '#5f6862', 16, 0.05, 'rgba(30,34,32,0.5)'), roughness: 0.75 }),
    synod: std({ map: stoneTile(256, '#8f8a82', 8, 0.3), roughness: 0.9 }),
    granite: std({ map: stoneTile(256, '#a8a59d', 7, 0.2, 'rgba(90,88,84,0.45)'), roughness: 0.85 }),
    brick: std({ map: stoneTile(128, '#a7452d', 16, 0.02, 'rgba(210,200,185,0.5)'), roughness: 0.9 }),
    copper: std({ color: 0x5f9e8b, roughness: 0.7 }),
    dark: std({ color: 0x1a1a1a, roughness: 0.6 }),
    white: std({ color: 0xece8de, roughness: 0.7 }),
    door: std({ color: 0x2c3e9a, roughness: 0.5 }),
    glass: std({ color: 0x9fb3bd, roughness: 0.2, metalness: 0.3 }),
    roof: std({ color: 0x6e7378, roughness: 0.6, metalness: 0.4 }),
  };
  return stoneMats;
}
const byName = (name) => {
  const m = stoneMaterials(), k = name.replace(/^[a-z]+_/, '');
  return m[k] || m.rubble;
};
const decoded = new WeakSet();
function prepare(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    // the AO bake is stored as sRGB bytes but read as linear: decode it, and keep it from crushing to black
    // meshes without a bake (the decals) get white, or vertexColors would read the unbound attribute as black
    if (!o.geometry.attributes.color) o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3));
    const col = o.geometry.attributes.color;
    if (col && col.normalized && !decoded.has(col)) { // the baked AO (normalised bytes), not the white fill
      for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) { const v = col.getComponent(i, c); col.setComponent(i, c, 0.3 + 0.7 * Math.pow(v, 1 / 2.2)); }
      decoded.add(col); col.needsUpdate = true;
    }
    o.material = byName(o.material.name);
    o.castShadow = o.material !== stoneMaterials().decal;
    o.receiveShadow = true;
  });
}
export function setStoneNight(level) { if (stoneMats) stoneMats.decal.emissiveIntensity = level * 0.9; }

// Place the named nodes of a stone-landmark GLB at the positions given in site.parts ({ x, z, rot, len? }).
export async function placeParts(scene, file, site, name) {
  let gltf;
  try { gltf = await load(file); } catch (e) { console.warn(`${file} model failed to load`, e); return null; }
  prepare(gltf.scene);
  const group = new THREE.Group(); group.name = name;
  for (const [part, p] of Object.entries(site.parts)) {
    const node = gltf.scene.getObjectByName(part);
    if (!node) continue;
    node.removeFromParent();
    node.position.set(p.x, 0, p.z);
    node.rotation.set(0, p.rot, 0);
    if (p.len) node.scale.set(p.len, 1, 1);
    group.add(node);
  }
  scene.add(group);
  return group;
}

// ---------- Croke Park ----------
// tools/blender/build_crokepark.py: two roots, 'stadium' (full detail, baked AO) and 'stadium_far' (a ~1.6k-triangle
// silhouette for beyond LOD_FAR). Its textures are painted here: a tiling texture of 8 horizontal bands (seats,
// underside, decks, cladding, terrace, ad boards, roof; each repeats along u only), a decal atlas and the pitch.
// Every stadium material thins its fog (FOG_SCALE) so the roof and the crown of masts still read on the skyline from
// the city centre; a Low / Battery saver device paints the textures at half size.
const CP_BANDS = ['seatlo', 'seathi', 'under', 'deck', 'clad', 'terrace', 'ads', 'roof'];
const CP_DECAL = {
  lattice: [0, 0, 1024, 64], wordmark: [0, 64, 1024, 128], welcome: [0, 192, 512, 96], museum: [512, 192, 512, 96],
  hogan: [0, 288, 512, 48], cusack: [0, 336, 512, 48], davin: [0, 384, 512, 48], hill: [0, 432, 512, 48],
  turnstile: [512, 288, 512, 192], screen: [0, 480, 256, 128], lamps: [256, 480, 128, 64],
};
const SEAT = '#5a6980', SEAT_D = '#3a4658', CONC = '#bdb9b0', CONC_D = '#8e8b85';
const LOD_FAR = 350;

function cpCanvas(w, h, scale, paint) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  paint(g);
  return c;
}
function cpTex(canvas, repeatU = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8;
  if (repeatU) t.wrapS = THREE.RepeatWrapping;
  return t;
}

// the tiling texture (1024 x 2048: band k occupies rows 256k .. 256k+255, drawn 8 px into the padding both ways)
function paintTile(g, emissive) {
  const W = 1024;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, 2048);
  let seed = 5;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 8; k++) {
    const y0 = k * 256, band = CP_BANDS[k];
    g.save(); g.beginPath(); g.rect(0, y0, W, 256); g.clip(); g.translate(0, y0 + 8);
    const H = 240; // content height; the paint runs 8 px past both edges as padding
    const rows = (n, fill) => { for (let i = -1; i <= n; i++) fill(i, (i * H) / n, H / n); };
    if (band === 'seatlo' || band === 'seathi') {
      const n = band === 'seatlo' ? 28 : 24;
      if (!emissive) {
        rows(n, (i, y, h) => {
          g.fillStyle = '#7b7f86'; g.fillRect(0, y, W, h);                 // concrete tread
          g.fillStyle = SEAT; g.fillRect(0, y + h * 0.18, W, h * 0.62);     // the row of seats
          g.fillStyle = SEAT_D; g.fillRect(0, y + h * 0.18, W, h * 0.12);   // seat backs in shade
          g.fillStyle = 'rgba(20,24,30,0.35)'; for (let x = 0; x < W; x += 42) g.fillRect(x, y + h * 0.18, 2, h * 0.62);
        });
        // aisles (stepped, lighter), every 6 m
        for (const ax of [0, 512]) {
          g.fillStyle = '#9d9c97'; g.fillRect(ax, -8, 34, H + 16);
          g.fillStyle = 'rgba(60,60,60,0.5)'; for (let y = 0; y < H; y += H / (n * 2)) g.fillRect(ax, y, 34, 1.5);
        }
        if (band === 'seatlo') for (const vx of [230, 742]) { // vomitory mouths
          g.fillStyle = CONC; g.fillRect(vx - 6, H * 0.46, 132, H * 0.3);
          g.fillStyle = '#16181b'; g.fillRect(vx, H * 0.49, 120, H * 0.27);
        }
      } else {
        g.fillStyle = '#1c2026'; g.fillRect(0, -8, W, H + 16); // floodlit seats catch a little light
      }
    } else if (band === 'under') {
      if (!emissive) {
        rows(18, (i, y, h) => { g.fillStyle = '#a9a79f'; g.fillRect(0, y, W, h); g.fillStyle = '#77756f'; g.fillRect(0, y + h * 0.62, W, h * 0.38); });
        for (const bx of [0, 512]) { g.fillStyle = '#8a8882'; g.fillRect(bx, -8, 26, H + 16); g.fillStyle = 'rgba(40,40,40,0.35)'; g.fillRect(bx + 26, -8, 8, H + 16); }
      } else {
        g.fillStyle = '#6f7686'; for (let x = 64; x < W; x += 128) for (let y = 30; y < H; y += 60) g.fillRect(x, y, 22, 5);
      }
    } else if (band === 'deck') { // four concourse levels: slab edge, railing, the dark deck with strip lights
      for (let lv = -1; lv <= 4; lv++) {
        const y = lv * (H / 4), h = H / 4;
        if (!emissive) {
          g.fillStyle = CONC; g.fillRect(0, y, W, h * 0.3);
          g.fillStyle = CONC_D; g.fillRect(0, y + h * 0.27, W, 3);
          g.fillStyle = '#26292d'; g.fillRect(0, y + h * 0.3, W, h * 0.7);
          g.fillStyle = '#4a4f55'; g.fillRect(0, y + h * 0.36, W, 3);
          g.fillStyle = 'rgba(200,205,210,0.55)'; for (let x = 0; x < W; x += 12) g.fillRect(x, y + h * 0.3, 2, h * 0.12); // railing bars
          g.fillStyle = '#6d747c'; for (let x = 0; x < W; x += 102) g.fillRect(x, y + h * 0.3, 56, 4);
          g.fillStyle = CONC_D; for (let x = 0; x < W; x += 256) g.fillRect(x + 100, y + h * 0.3, 18, h * 0.7); // columns
        } else {
          g.fillStyle = '#e8f0ff'; for (let x = 0; x < W; x += 102) g.fillRect(x, y + h * 0.3, 56, 4);
          g.fillStyle = '#2a3140'; g.fillRect(0, y + h * 0.38, W, h * 0.55);
        }
      }
    } else if (band === 'clad') { // slate panels, a ribbon of glazing in the middle
      if (!emissive) {
        g.fillStyle = '#3c4a5d'; g.fillRect(0, -8, W, H + 16);
        g.fillStyle = '#2e3a4a'; for (let x = 0; x < W; x += 64) g.fillRect(x, -8, 3, H + 16);
        g.fillRect(0, H * 0.28, W, 3); g.fillRect(0, H * 0.72, W, 3);
        g.fillStyle = '#2a3542'; g.fillRect(0, H * 0.31, W, H * 0.4);
        g.fillStyle = 'rgba(150,170,190,0.25)'; for (let x = 0; x < W; x += 128) g.fillRect(x + 10, H * 0.33, 50, H * 0.36);
        g.fillStyle = '#1d2530'; for (let x = 0; x < W; x += 32) g.fillRect(x, H * 0.31, 3, H * 0.4);
      } else {
        for (let x = 0; x < W; x += 32) { if (r() < 0.38) { g.fillStyle = r() < 0.7 ? '#b89868' : '#c9b89a'; g.fillRect(x + 5, H * 0.34, 22, H * 0.34); } }
      }
    } else if (band === 'terrace') { // Hill 16: stepped concrete terrace with white crush barriers
      if (!emissive) {
        rows(20, (i, y, h) => { g.fillStyle = '#8c8980'; g.fillRect(0, y, W, h); g.fillStyle = '#5c5a55'; g.fillRect(0, y + h * 0.72, W, h * 0.28); });
        g.fillStyle = '#d9d7cf';
        for (let i = 1; i < 20; i += 3) { const y = (i * H) / 20; for (let x = (i * 97) % 200; x < W; x += 200) g.fillRect(x, y - 2, 130, 4); }
        g.fillStyle = '#b6b3aa'; for (const ax of [0, 512]) g.fillRect(ax, -8, 26, H + 16);
      } else { g.fillStyle = '#15171a'; g.fillRect(0, -8, W, H + 16); }
    } else if (band === 'ads') { // LED ribbons (upper half) and pitch-side boards (lower half)
      const cols = ['#c8322b', '#1f4fa0', '#f2f2f2', '#127a4a', '#1f4fa0', '#e3a51c', '#c8322b', '#f2f2f2'];
      for (const [ya, yb] of [[-8, H * 0.5], [H * 0.55, H + 8]]) {
        for (let s = 0; s < 8; s++) {
          const x = s * 128, c = cols[(s + (ya < 0 ? 0 : 3)) % cols.length];
          g.fillStyle = c; g.fillRect(x, ya, 128, yb - ya);
          g.fillStyle = c === '#f2f2f2' ? '#1f4fa0' : '#ffffff';
          g.font = `bold ${Math.round((yb - ya) * 0.5)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(['GAA', 'CROKE PARK', 'GAA', 'SKYLINE', 'CLG', 'MUSEUM', 'GAA', 'PÁIRC'][s], x + 64, (ya + yb) / 2);
        }
        if (emissive) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, ya, W, yb - ya); }
      }
      if (!emissive) { g.fillStyle = '#20242a'; g.fillRect(0, H * 0.5, W, H * 0.05); }
    } else if (band === 'roof') { // top sheet with translucent strips (upper half), underside panels (lower half)
      if (!emissive) {
        g.fillStyle = '#8d949a'; g.fillRect(0, -8, W, H * 0.5 + 8);
        g.fillStyle = 'rgba(60,66,72,0.35)'; for (let x = 0; x < W; x += 16) g.fillRect(x, -8, 2, H * 0.5 + 8);
        g.fillStyle = '#c9ced2'; for (const x of [150, 662]) g.fillRect(x, -8, 90, H * 0.5 + 8);
        g.fillStyle = '#d8dbd6'; g.fillRect(0, H * 0.5, W, H * 0.5 + 8);
        g.fillStyle = '#9aa0a3'; for (let x = 0; x < W; x += 128) g.fillRect(x, H * 0.5, 10, H * 0.5 + 8);
        g.fillStyle = '#b5bab9'; for (let y = H * 0.5; y < H + 8; y += 30) g.fillRect(0, y, W, 4);
        g.fillStyle = '#eef0ec'; for (const x of [150, 662]) g.fillRect(x, H * 0.5, 90, H * 0.5 + 8);
      } else {
        g.fillStyle = '#3a3f4a'; g.fillRect(0, H * 0.5, W, H * 0.5 + 8); // the lit underside
      }
    }
    g.restore();
  }
}

function paintCpDecals(g, emissive) {
  g.clearRect(0, 0, 1024, 1024);
  if (emissive) { g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024); }
  const text = (s, x, y, size, color, weight = 'bold') => {
    g.fillStyle = color; g.font = `${weight} ${size}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
  };
  { // lattice truss web (Warren truss with verticals), white on transparent; repeats along u
    const [x, y, w, h] = CP_DECAL.lattice;
    if (!emissive) {
      g.strokeStyle = '#eef0f0'; g.lineWidth = 7;
      g.beginPath();
      for (let k = 0; k <= 4; k++) { const px = x + (k * w) / 4; g.moveTo(px, y + 4); g.lineTo(px, y + h - 4); }
      for (let k = 0; k < 4; k++) { const a = x + (k * w) / 4, b = a + w / 8, c = a + w / 4; g.moveTo(a, y + h - 6); g.lineTo(b, y + 6); g.lineTo(c, y + h - 6); }
      g.stroke();
      g.fillStyle = '#eef0f0'; g.fillRect(x, y, w, 8); g.fillRect(x, y + h - 8, w, 8);
    }
  }
  { // the wordmark: creative licence (no big lettering is confirmed on the real stand)
    const [x, y, w, h] = CP_DECAL.wordmark;
    text('CROKE PARK', x + w / 2, y + h * 0.33, 74, '#f4f6f8', '900');
    text('PÁIRC AN CHRÓCAIGH', x + w / 2, y + h * 0.78, 40, emissive ? '#cfe4ff' : '#9fc8ea', 'bold');
  }
  { const [x, y, w, h] = CP_DECAL.welcome;
    if (!emissive) { g.fillStyle = '#1b2a44'; g.fillRect(x, y, w, h); g.fillStyle = '#2e98dc'; g.fillRect(x, y + h - 12, w, 12); }
    text('Welcome to Croke Park', x + w / 2, y + h * 0.32, 34, '#ffffff'); text('Fáilte go Páirc an Chrócaigh', x + w / 2, y + h * 0.66, 26, emissive ? '#9fd0f5' : '#bfe0f7', 'italic bold'); }
  { const [x, y, w, h] = CP_DECAL.museum;
    if (!emissive) { g.fillStyle = '#20252c'; g.fillRect(x, y, w, h); }
    text('GAA MUSEUM', x + w / 2, y + h / 2, 52, '#f2f2f2', '900'); }
  for (const [k, s] of [['hogan', 'HOGAN STAND'], ['cusack', 'CUSACK STAND'], ['davin', 'DAVIN STAND'], ['hill', 'DINEEN HILL 16']]) {
    const [x, y, w, h] = CP_DECAL[k];
    g.fillStyle = emissive ? '#0b2a40' : '#2e98dc'; g.fillRect(x, y, w, h);
    text(s, x + w / 2, y + h / 2 + 1, 30, '#ffffff');
  }
  { // navy turnstile block: panelled, a row of gates
    const [x, y, w, h] = CP_DECAL.turnstile;
    if (!emissive) {
      g.fillStyle = '#2b3b52'; g.fillRect(x, y, w, h);
      g.fillStyle = '#5d6b7c'; for (let px = x; px < x + w; px += 32) g.fillRect(px, y, 2, h);
      g.fillRect(x, y + h * 0.18, w, 2);
      for (let k = 0; k < 6; k++) {
        const gx = x + 20 + k * 82;
        g.fillStyle = '#15191f'; g.fillRect(gx, y + h * 0.36, 56, h * 0.64);
        g.fillStyle = '#8b96a3'; for (let b = 0; b < 5; b++) g.fillRect(gx + 4 + b * 11, y + h * 0.36, 3, h * 0.64);
        text(`F${k + 1}`, gx + 28, y + h * 0.27, 18, '#e8eef4');
      }
    }
  }
  { const [x, y, w, h] = CP_DECAL.screen; // the big screen at the Hill 16 end
    g.fillStyle = emissive ? '#000' : '#f2f2f0'; g.fillRect(x, y, w, h);
    g.fillStyle = '#0d1a2a'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
    g.fillStyle = '#2f7a3a'; g.fillRect(x + 12, y + h * 0.55, w - 24, h * 0.35);
    text('CROKE PARK', x + w / 2, y + h * 0.26, 26, '#ffffff', '900'); text('GAA', x + w / 2, y + h * 0.72, 24, '#f2d24a'); }
  { const [x, y, w, h] = CP_DECAL.lamps; // floodlight head: a grid of lamps
    g.fillStyle = emissive ? '#000' : '#2b2f35'; g.fillRect(x, y, w, h);
    g.fillStyle = emissive ? '#ffffff' : '#dfe6ee';
    for (let rr = 0; rr < 4; rr++) for (let c = 0; c < 7; c++) { g.beginPath(); g.arc(x + 10 + c * 18, y + 9 + rr * 15, 6, 0, Math.PI * 2); g.fill(); }
  }
}

// the pitch: 640 x 1024 over b -50..50 (u) and a 79..-81 (v, the Hill 16 end at the top); 6.4 px per metre
function paintTurf(g) {
  const PX = 6.4, X = (b) => (b + 50) * PX, Y = (a) => (79 - a) * PX;
  g.fillStyle = '#a3533d'; g.fillRect(0, 0, 640, 1024);             // the terracotta surround at the tier fronts
  g.fillStyle = '#3f7d2e'; g.fillRect(X(-47), Y(76), 94 * PX, 154 * PX);
  for (let a = -76; a < 76; a += 12) { g.fillStyle = '#4c9138'; g.fillRect(X(-47), Y(a + 6), 94 * PX, 6 * PX); } // mowing stripes
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let b = -47; b < 47; b += 12) g.fillRect(X(b), Y(76), 6 * PX, 154 * PX);
  g.strokeStyle = 'rgba(245,245,240,0.9)'; g.lineWidth = 2;
  const L = (a0, b0, a1, b1) => { g.beginPath(); g.moveTo(X(b0), Y(a0)); g.lineTo(X(b1), Y(a1)); g.stroke(); };
  g.strokeRect(X(-42.5), Y(71.5), 85 * PX, 143 * PX);
  L(0, -42.5, 0, 42.5); L(0, -0.5, 0, 0.5);
  for (const s of [1, -1]) {
    for (const d of [13, 20, 45]) L(s * (71.5 - d), -42.5, s * (71.5 - d), 42.5);
    g.strokeRect(X(-9.5), Y(s > 0 ? 71.5 : -71.5 + 14), 19 * PX, 14 * PX);      // large rectangle 19 x 14
    g.strokeRect(X(-4.5), Y(s > 0 ? 71.5 : -71.5 + 4.5), 9 * PX, 4.5 * PX);     // small rectangle
    g.beginPath(); g.arc(X(0), Y(s * 51.5), 13 * PX, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : 0); g.stroke(); // the D
  }
}

let cpMats = null;
function crokeMaterials() {
  if (cpMats) return cpMats;
  const S = LITE ? 0.5 : 1;
  const tileMap = cpTex(cpCanvas(1024, 2048, S, (g) => paintTile(g, false)), true);
  const tileEm = cpTex(cpCanvas(1024, 2048, S * 0.5, (g) => paintTile(g, true)), true);
  const decMap = cpTex(cpCanvas(1024, 1024, S, (g) => paintCpDecals(g, false)), true);
  const decEm = cpTex(cpCanvas(1024, 1024, S * 0.5, (g) => paintCpDecals(g, true)), true);
  const turf = cpTex(cpCanvas(640, 1024, S, paintTurf));
  const std = (o, vc = true) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = vc; m.defines = { FOG_SCALE: '0.55' }; return m; };
  cpMats = {
    tile: std({ map: tileMap, emissive: 0xffffff, emissiveMap: tileEm, emissiveIntensity: 0, roughness: 0.85 }),
    concrete: std({ color: 0xbdb9b0, roughness: 0.9 }),
    white: std({ color: 0xe6e9ea, roughness: 0.45, metalness: 0.1 }),
    decal: std({ map: decMap, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: decEm, emissiveIntensity: 0.08, roughness: 0.5 }),
    turf: std({ map: turf, emissive: 0xffffff, emissiveMap: turf, emissiveIntensity: 0, roughness: 0.95 }),
    flood: std({ color: 0xf4f7ff, emissive: 0xf4f7ff, emissiveIntensity: 0.05, roughness: 0.3 }, false),
    whiteFar: std({ color: 0xb4bbc1, roughness: 0.5 }, false),
  };
  return cpMats;
}

// the floodlit bowl's halo above the roof, for the night view from outside
function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function placeCrokePark(scene, site) {
  let gltf;
  try { gltf = await load('crokepark'); } catch (e) { console.warn('crokepark model failed to load', e); return null; }
  const mats = crokeMaterials();
  const near = gltf.scene.getObjectByName('stadium'), far = gltf.scene.getObjectByName('stadium_far');
  if (!near || !far) return null;
  for (const [root, isFar] of [[near, false], [far, true]]) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.color) o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3));
      const col = o.geometry.attributes.color;
      if (col.normalized && !decoded.has(col)) { // baked AO (sRGB bytes): decode and keep it off black, as for the stone heroes
        for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, 0.35 + 0.65 * Math.pow(col.getComponent(i, c), 1 / 2.2));
        decoded.add(col); col.needsUpdate = true;
      }
      const key = o.material.name.replace(/^cp_/, '');
      o.material = (isFar && key === 'white' ? mats.whiteFar : mats[key]) || mats.concrete;
      o.castShadow = !isFar && key !== 'decal' && key !== 'flood' && key !== 'turf';
      o.receiveShadow = !isFar;
    });
    root.removeFromParent();
    root.position.set(0, 0, 0);
  }
  const lod = new THREE.LOD();
  lod.name = 'Croke Park';
  lod.addLevel(near, 0, 0.04);
  lod.addLevel(far, LOD_FAR, 0.04);
  lod.position.set(site.centre.x, 0, site.centre.z);
  lod.rotation.y = site.centre.rot;
  scene.add(lod);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: 0xdfe8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
  halo.position.set(site.centre.x, 30, site.centre.z);
  halo.scale.set(170, 64, 1);
  halo.visible = false;
  scene.add(halo);
  return {
    root: lod,
    setNight(l) {
      mats.flood.emissiveIntensity = 0.05 + l * 3.2;
      mats.tile.emissiveIntensity = l * 0.8;
      mats.decal.emissiveIntensity = 0.08 + l * 1.1;
      mats.turf.emissiveIntensity = l * 0.42;
      halo.material.opacity = l * 0.42; halo.visible = l > 0.01;
    },
  };
}
