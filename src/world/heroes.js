// Hero landmarks built in Blender (tools/blender/build_<name>.py -> public/models/<name>.glb). Each carries UVs into a
// small atlas that is painted here at load (patterns and cut-outs), so the GLBs stay tiny and nothing is baked into
// image files that would need regenerating. Models load after the city is up and replace any stand-in.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { addReflections } from '../render/reflect.js';
import { stoneTex } from './ground.js';
import { IS_MOBILE } from './textures.js';

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
function load(name) {
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

// ---------- Aviva Stadium ----------
// tools/blender/build_aviva.py: two root nodes, `aviva` (near) and `aviva_far` (a light LOD for the skyline), whose
// meshes carry av_* materials. Every texture is a small tile painted here; the model's UVs repeat it (metres around
// the ring, by height up the facade), so nothing needs an atlas. docs/research/aviva.md 3.3 has the colours.
function tile(w, h, paint, { repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // Blender's exporter already flipped v: the canvas top is the top of each tile
  t.anisotropy = IS_MOBILE ? 4 : 8;
  return t;
}

function avivaTextures() {
  // plinth: one 12 m x 5 m bay: beige render panels, then a glazed entrance bay with doors (and its night mask)
  const plinthBay = (g, w, h, lit) => {
    g.fillStyle = lit ? '#000' : '#b3a68c'; g.fillRect(0, 0, w, h);
    if (!lit) { g.fillStyle = 'rgba(80,70,50,0.35)'; for (let x = 0; x < w * 0.58; x += w / 10) g.fillRect(x, 0, 2, h); g.fillRect(0, h * 0.5, w * 0.58, 2); g.fillStyle = '#948a74'; g.fillRect(0, 0, w, 6); }
    g.fillStyle = lit ? '#ffe2b8' : '#23302d'; g.fillRect(w * 0.6, h * 0.12, w * 0.4, h * 0.88);
    g.fillStyle = lit ? '#4a3a26' : '#a9b0ad';
    for (let x = w * 0.6; x <= w; x += w * 0.08) g.fillRect(x, h * 0.12, 3, h * 0.88);
    g.fillRect(w * 0.6, h * 0.12, w * 0.4, 4); g.fillRect(w * 0.6, h * 0.55, w * 0.4, 3);
  };
  const plinth = tile(512, 128, (g, w, h) => plinthBay(g, w, h, false));
  const plinthGlow = tile(512, 128, (g, w, h) => plinthBay(g, w, h, true));
  // the concourse behind the skin: one 8 m bay by one 4.5 m floor, slab edge at the foot, columns, a stair, lit ceiling
  const core = tile(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#8f9c98'); grd.addColorStop(0.8, '#76837f'); grd.addColorStop(1, '#6b7774');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a3aaa7'; g.fillRect(0, h * 0.84, w, h * 0.16); // floor slab edge
    g.fillStyle = '#88908d'; g.fillRect(0, h * 0.84, w, 4);
    g.fillStyle = '#4c5754'; g.fillRect(0, 0, 10, h * 0.84); g.fillRect(w / 2 - 4, 0, 8, h * 0.84); // columns
    g.fillStyle = '#b6c6c1'; g.fillRect(0, 0, w, 10); // ceiling light band
  });
  const coreGlow = tile(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h * 0.84); grd.addColorStop(0, '#fff1d8'); grd.addColorStop(0.35, '#b39a78'); grd.addColorStop(1, '#3a3026');
    g.fillStyle = grd; g.fillRect(0, 0, w, h * 0.84);
    g.fillStyle = '#d6f0dc'; g.fillRect(w * 0.52, 0, w * 0.46, h * 0.3); // a greener bay
    g.fillStyle = '#3a3024'; g.fillRect(0, 0, 10, h * 0.84); g.fillRect(w / 2 - 4, 0, 8, h * 0.84);
    g.fillStyle = '#2a241c'; g.fillRect(0, h * 0.84, w, h * 0.16);
  });
  // polycarbonate louvre course: one 3 m panel by 1.4 m, clear (low alpha) with a bright steel rail and rows of bolts
  const louvre = tile(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(236,244,242,0.8)'); grd.addColorStop(0.25, 'rgba(214,230,226,0.52)'); grd.addColorStop(0.9, 'rgba(200,220,216,0.44)'); grd.addColorStop(1, 'rgba(246,250,249,0.85)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(236,240,240,0.95)'; g.fillRect(0, 4, w, 9); // rail
    g.fillStyle = 'rgba(120,130,130,0.8)'; g.fillRect(0, 13, w, 2);
    g.fillStyle = 'rgba(250,252,252,0.95)';
    for (const bx of [w * 0.12, w * 0.62]) for (let y = 20; y < h - 6; y += 12) { g.beginPath(); g.arc(bx, y, 2.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(w * 0.985, 0, w * 0.015, h); // panel joint
  });
  // roof: radial corrugated clear sheet over the purlins, one 6 m tile down the slope, a silver seam at the edge
  const roof = tile(128, 256, (g, w, h) => {
    g.fillStyle = '#b9bcb8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(70,76,74,0.12)'; g.fillRect(x + 4, 0, 2, h); }
    g.fillStyle = 'rgba(80,86,84,0.25)'; g.fillRect(0, h * 0.5, w, 3); g.fillRect(0, 0, w, 3); // purlins seen through
    g.fillStyle = '#e3e6e7'; g.fillRect(0, 0, 5, h);
  });
  // leading-edge truss: one W panel (per model segment) between the chords, cut out
  const web = tile(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#f0f0ec'; g.lineCap = 'square';
    g.lineWidth = 24; g.beginPath(); g.moveTo(0, 12); g.lineTo(w, 12); g.moveTo(0, h - 12); g.lineTo(w, h - 12); g.stroke();
    g.lineWidth = 16; g.beginPath(); g.moveTo(0, h - 12); g.lineTo(w / 2, 12); g.lineTo(w, h - 12); g.stroke();
    g.lineWidth = 9; g.beginPath(); g.moveTo(w / 2, 12); g.lineTo(w / 2, h - 12); g.moveTo(0, 12); g.lineTo(0, h - 12); g.stroke();
  }, { repeat: false });
  web.wrapS = THREE.RepeatWrapping;
  // seats: one 6.4 m tile up the rake (8 rows of green seats) with a grey stair aisle
  const seat = tile(128, 256, (g, w, h) => {
    g.fillStyle = '#16542b'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 8; k++) { const y = (k * h) / 8; g.fillStyle = '#1f6e3a'; g.fillRect(0, y, w, h / 8 * 0.55); g.fillStyle = '#2b8248'; g.fillRect(0, y, w, 3); }
    g.fillStyle = '#8f928c'; g.fillRect(0, 0, 10, h);
  });
  // tier front: the Aviva-yellow band over the white box band with its dark glazing
  const fascia = tile(256, 64, (g, w, h) => {
    g.fillStyle = '#f2c500'; g.fillRect(0, 0, w, h * 0.45);
    g.fillStyle = '#ecece6'; g.fillRect(0, h * 0.45, w, h * 0.55);
    g.fillStyle = '#26302e'; for (let x = 6; x < w; x += 32) g.fillRect(x, h * 0.55, 26, h * 0.36);
  });
  // pitch: 90 x 136 m (play area and run-off), mown stripes, rugby markings
  const pitch = tile(256, 512, (g, w, h) => {
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#4a6b1c' : '#527625'; g.fillRect(0, (k * h) / 16, w, h / 16 + 1); }
    const X = (m) => w / 2 + (m / 90) * w, Y = (m) => h / 2 + (m / 136) * h;
    g.strokeStyle = 'rgba(245,245,240,0.9)'; g.lineWidth = 2.5;
    g.strokeRect(X(-35), Y(-60), X(35) - X(-35), Y(60) - Y(-60));
    for (const m of [-50, -28, 0, 28, 50]) { g.beginPath(); g.moveTo(X(-35), Y(m)); g.lineTo(X(35), Y(m)); g.stroke(); }
    g.setLineDash([6, 6]); for (const m of [-10, 10]) { g.beginPath(); g.moveTo(X(-35), Y(m)); g.lineTo(X(35), Y(m)); g.stroke(); }
  }, { repeat: false });
  // letters: AVIVA STADIUM in Aviva blue (top half), AVIVA in white seats (bottom half)
  const sign = tile(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 86px Arial, Helvetica, sans-serif'; g.fillStyle = '#2a56b8';
    g.fillText('AVIVA STADIUM', w / 2, h * 0.25, w * 0.96);
    g.font = 'bold 118px Arial, Helvetica, sans-serif'; g.fillStyle = '#f4f4f0';
    g.fillText('A V I V A', w / 2, h * 0.76, w * 0.96);
  }, { repeat: false });
  const glow = tile(8, 64, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, 0, 0); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { repeat: false });
  // far LOD: the whole facade band (plinth top to shoulder) in one 16 m tile - the concourse with the louvre courses over it
  const farFacade = tile(128, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#b2bcb9'); grd.addColorStop(0.5, '#98a3a0'); grd.addColorStop(1, '#86918e');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 16; k++) { const y = (k * h) / 16; g.fillStyle = 'rgba(232,240,238,0.55)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(40,52,48,0.25)'; g.fillRect(0, y + 5, w, 5); }
  });
  const farGlow = tile(128, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 7; k++) { const y = h * 0.22 + (k * h * 0.72) / 7; g.fillStyle = k % 3 === 1 ? '#c8e6cf' : '#ffe6c2'; g.fillRect(0, y, w, h * 0.06); }
  });
  return { plinth, plinthGlow, core, coreGlow, louvre, roof, web, seat, fascia, pitch, sign, glow, farFacade, farGlow };
}

// Keep the stadium legible through the haze (it is the landmark on the south-east skyline): a lighter share of the
// global fog on its materials only. The fog chunk is atmosphere.js's; this scales its density.
function lightFog(m, k = 0.55) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', THREE.ShaderChunk.fog_fragment.replace('float fogD = fogDensity', `float fogD = ${k.toFixed(2)} * fogDensity`));
  };
  m.customProgramCacheKey = () => `avfog${k}`;
  return m;
}

export async function placeAviva(scene, site, { lite = false } = {}) {
  let gltf;
  try { gltf = await load('aviva'); } catch (e) { console.warn('aviva model failed to load', e); return null; }
  const T = avivaTextures();
  const S = (o) => lightFog(new THREE.MeshStandardMaterial(o));
  const mats = {
    av_plinth: S({ map: T.plinth, roughness: 0.8, emissive: 0xffffff, emissiveMap: T.plinthGlow, emissiveIntensity: 0 }),
    av_core: S({ map: T.core, roughness: 0.55, metalness: 0.1, emissive: 0xffffff, emissiveMap: T.coreGlow, emissiveIntensity: 0 }),
    // clear polycarbonate: mostly what it reflects (the sky), so metallic with a strong environment term
    av_louvre: S({ map: T.louvre, color: 0xf2f8f6, transparent: true, depthWrite: false, roughness: 0.2, metalness: 0.55, envMapIntensity: 2.2, emissive: 0xd6efe6, emissiveIntensity: 0 }),
    av_roof: S({ map: T.roof, color: 0xf4f6f4, roughness: 0.3, metalness: 0.15, side: THREE.DoubleSide }),
    av_truss: S({ color: 0xf0f0ec, roughness: 0.45, side: THREE.DoubleSide, emissive: 0xf4f1e6, emissiveIntensity: 0 }),
    av_web: S({ map: T.web, alphaTest: 0.5, roughness: 0.45, side: THREE.DoubleSide, emissive: 0xf4f1e6, emissiveMap: T.web, emissiveIntensity: 0 }),
    av_flood: S({ color: 0x9aa0a4, roughness: 0.3, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.1 }),
    av_seat: S({ map: T.seat, roughness: 0.7, vertexColors: true, emissive: 0xffffff, emissiveMap: T.seat, emissiveIntensity: 0 }),
    av_fascia: S({ map: T.fascia, roughness: 0.6, emissive: 0xffffff, emissiveMap: T.fascia, emissiveIntensity: 0 }),
    av_pitch: S({ map: T.pitch, roughness: 0.85, emissive: 0xffffff, emissiveMap: T.pitch, emissiveIntensity: 0 }),
    av_sign: S({ map: T.sign, alphaTest: 0.4, roughness: 0.4, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: T.sign, emissiveIntensity: 0.15 }),
    av_farfacade: S({ map: T.farFacade, roughness: 0.35, metalness: 0.2, emissive: 0xffffff, emissiveMap: T.farGlow, emissiveIntensity: 0 }),
    av_glow: new THREE.MeshBasicMaterial({ map: T.glow, color: 0xfff4dc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
  };
  const near = gltf.scene.getObjectByName('aviva'), far = gltf.scene.getObjectByName('aviva_far');
  const glows = [];
  for (const lvl of [near, far]) {
    lvl.removeFromParent();
    lvl.position.set(0, 0, 0);
    lvl.traverse((o) => {
      if (!o.isMesh) return;
      const m = mats[o.material.name];
      if (!m) return;
      o.material = m;
      if (m === mats.av_glow) { glows.push(o); o.visible = false; o.renderOrder = 3; return; }
      if (m === mats.av_louvre) { o.renderOrder = 1; if (lite) o.visible = false; } // Low / Battery saver: no translucent layer
      // only the near level's shell and truss cast (the far one is beyond the shadow map; the bowl's insides shade
      // nothing anyone sees from outside)
      o.castShadow = lvl === near && [mats.av_plinth, mats.av_core, mats.av_roof, mats.av_truss, mats.av_web].includes(m);
      o.receiveShadow = lvl === near;
    });
  }
  const lod = new THREE.LOD();
  lod.addLevel(near, 0, 0.04);
  lod.addLevel(far, lite ? 240 : 360, 0.04);
  lod.position.set(site.x, 0, site.z);
  lod.rotation.y = site.rot; // the model's north end (Blender +Y) turns to the pitch axis, 16 degrees west of north
  lod.name = 'Aviva Stadium';
  scene.add(lod);
  return {
    root: lod,
    setNight(l) {
      mats.av_core.emissiveIntensity = 0.95 * l;
      mats.av_farfacade.emissiveIntensity = 1.1 * l;
      mats.av_plinth.emissiveIntensity = 1.1 * l;
      mats.av_louvre.emissiveIntensity = 0.22 * l;
      mats.av_truss.emissiveIntensity = mats.av_web.emissiveIntensity = 0.45 * l;
      mats.av_flood.emissiveIntensity = 0.1 + 3.2 * l;
      mats.av_seat.emissiveIntensity = mats.av_fascia.emissiveIntensity = 0.28 * l;
      mats.av_pitch.emissiveIntensity = 0.42 * l;
      mats.av_sign.emissiveIntensity = 0.15 + 2.2 * l;
      mats.av_glow.opacity = 0.2 * l;
      for (const g of glows) g.visible = l > 0.01;
    },
  };
}
