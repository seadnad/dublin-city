// Hero landmarks built in Blender (tools/blender/build_<name>.py -> public/models/<name>.glb). Each carries UVs into a
// small atlas that is painted here at load (patterns and cut-outs), so the GLBs stay tiny and nothing is baked into
// image files that would need regenerating. Models load after the city is up and replace any stand-in.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { addReflections } from '../render/reflect.js';
import { stoneTex } from './ground.js';
import { IS_MOBILE } from './textures.js';
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
// ---------- Parliament House (Bank of Ireland): its own small decal atlas ----------
// regions, px in 512 (must match tools/blender/build_parliament.py PDECAL)
const PDECAL = {
  niche: [0, 0, 128, 256], roundel: [128, 0, 128, 128], coffer: [128, 128, 128, 128], ionic: [256, 0, 128, 64],
  corinth: [256, 64, 128, 128], lamp: [384, 0, 64, 64], door: [448, 0, 64, 128], blind: [384, 128, 128, 128],
  arms: [0, 256, 256, 128], balust: [256, 256, 256, 64], railing: [256, 320, 256, 64], triumph: [256, 384, 128, 128],
};
const PORT = '#e4e1da', PORT_D = '#a3a099', GRAN = '#aca69c', RECESS = '#6f6b64', IRONB = '#1b1c1d';
function paintParliament(g, N) {
  g.clearRect(0, 0, N, N);
  const roundArch = (x, y, w, h) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); };
  const courses = (x, y, w, h, step, col) => { g.fillStyle = col; for (let yy = y + step; yy < y + h; yy += step) g.fillRect(x, yy, w, 2); };
  { // blind round-headed niche in a Portland architrave frame (the cornice over it is geometry)
    const [x, y, w, h] = PDECAL.niche;
    g.fillStyle = PORT; g.fillRect(x, y, w, h);
    g.fillStyle = PORT_D; g.fillRect(x + 12, y + 12, w - 24, h - 16);
    g.fillStyle = GRAN; g.fillRect(x + 16, y + 16, w - 32, h - 22); courses(x + 16, y + 16, w - 32, h - 22, 22, 'rgba(90,88,84,0.45)');
    const nx = x + 30, nw = w - 60;
    g.fillStyle = '#8a8680'; roundArch(nx - 5, y + 30, nw + 10, h - 50); g.fill();
    const grd = g.createLinearGradient(nx, 0, nx + nw, 0); grd.addColorStop(0, '#4f4c47'); grd.addColorStop(0.55, RECESS); grd.addColorStop(1, '#85817a');
    g.fillStyle = grd; roundArch(nx, y + 35, nw, h - 57); g.fill();
    g.fillStyle = '#5a5751'; g.fillRect(nx - 6, y + 30 + nw / 2 + 2, nw + 12, 5); // impost
    g.fillStyle = PORT; g.fillRect(x + w / 2 - 7, y + 28, 14, 16); // keystone
    g.fillStyle = '#8f8b84'; g.fillRect(nx, y + h - 26, nw, 6); // sill
  }
  { // Portland roundel: a moulded ring round a sunk disc, a laurel wreath
    const [x, y, w] = PDECAL.roundel, cx = x + w / 2, cy = y + w / 2;
    g.fillStyle = PORT; g.beginPath(); g.arc(cx, cy, w / 2 - 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = PORT_D; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, w / 2 - 14, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#b7b3a9'; g.beginPath(); g.arc(cx, cy, w / 2 - 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9d998f'; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 7, 3.5, a + 0.6, 0, Math.PI * 2); g.fill(); }
  }
  { // coffered soffit: 2 x 2 recessed panels with rosettes
    const [x, y, w, h] = PDECAL.coffer;
    g.fillStyle = '#b9b5ac'; g.fillRect(x, y, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const px = x + 8 + i * 60, py = y + 8 + j * 60;
      g.fillStyle = '#8f8c85'; g.fillRect(px, py, 52, 52);
      g.fillStyle = '#76736c'; g.fillRect(px + 8, py + 8, 36, 36);
      g.fillStyle = '#c4c0b6'; g.beginPath(); g.arc(px + 26, py + 26, 7, 0, Math.PI * 2); g.fill();
    }
  }
  { // Ionic capital: the volute pair joined by an egg-and-dart band (cut out)
    const [x, y, w, h] = PDECAL.ionic;
    g.fillStyle = PORT; g.fillRect(x + 14, y + 8, w - 28, 16);
    g.fillStyle = '#b5b1a7'; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x + 32 + k * 11, y + 32, 4, 6, 0, 0, Math.PI * 2); g.fill(); }
    for (const cx of [x + 18, x + w - 18]) {
      g.fillStyle = PORT; g.beginPath(); g.arc(cx, y + 36, 17, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8d8a82'; g.lineWidth = 3; g.beginPath();
      for (let t = 0; t < 14; t += 0.2) { const r = 15 - t, a = t * 1.1; g.lineTo(cx + Math.cos(a) * r, y + 36 + Math.sin(a) * r); }
      g.stroke();
    }
  }
  { // Corinthian bell: one acanthus leaf per face (cut out), two tiers and a small volute at the top
    const [x, y, w, h] = PDECAL.corinth;
    const leaf = (cx, by, lw, lh) => {
      g.fillStyle = PORT; g.beginPath(); g.moveTo(cx - lw / 2, by);
      g.bezierCurveTo(cx - lw / 2 - 8, by - lh * 0.6, cx - 10, by - lh * 0.9, cx, by - lh);
      g.bezierCurveTo(cx + 10, by - lh * 0.9, cx + lw / 2 + 8, by - lh * 0.6, cx + lw / 2, by); g.closePath(); g.fill();
      g.strokeStyle = '#8f8b83'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, by - lh + 6); g.stroke();
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx, by - (lh * k) / 4); g.lineTo(cx - lw * 0.3, by - (lh * k) / 4 - 8); g.moveTo(cx, by - (lh * k) / 4); g.lineTo(cx + lw * 0.3, by - (lh * k) / 4 - 8); g.stroke(); }
    };
    leaf(x + w / 2, y + h, w * 0.9, h * 0.62);
    leaf(x + w / 2, y + h * 0.62, w * 0.62, h * 0.5);
    g.fillStyle = PORT; g.fillRect(x + 8, y + 2, w - 16, 12);
    g.strokeStyle = PORT; g.lineWidth = 7; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + w / 2 + s * 44, y + 20, 10, 0, Math.PI * 1.5); g.stroke(); }
  }
  { // lantern glass
    const [x, y, w, h] = PDECAL.lamp; g.fillStyle = '#f3e2b0'; g.fillRect(x, y, w, h);
  }
  { // panelled timber door in a Portland surround
    const [x, y, w, h] = PDECAL.door;
    g.fillStyle = PORT; g.fillRect(x, y, w, h);
    g.fillStyle = '#3a2e25'; roundArch(x + 8, y + 8, w - 16, h - 8); g.fill();
    g.strokeStyle = '#241b15'; g.lineWidth = 2;
    for (const [px, py, pw, ph] of [[x + 13, y + 44, 17, 30], [x + 34, y + 44, 17, 30], [x + 13, y + 80, 17, 40], [x + 34, y + 80, 17, 40]]) g.strokeRect(px, py, pw, ph);
    g.fillStyle = '#5a4a3a'; g.fillRect(x + 12, y + 24, w - 24, 12); // fanlight bar
  }
  { // rusticated blind arch (under the porticos)
    const [x, y, w, h] = PDECAL.blind;
    g.fillStyle = '#9c968c'; g.fillRect(x, y, w, h); courses(x, y, w, h, 16, 'rgba(55,53,49,0.8)');
    g.fillStyle = '#b1ab9f'; roundArch(x + 20, y + 14, w - 40, h - 14); g.fill();
    g.fillStyle = '#7d786f'; roundArch(x + 28, y + 22, w - 56, h - 22); g.fill();
    g.strokeStyle = 'rgba(60,58,54,0.7)'; g.lineWidth = 2;
    for (let k = 1; k < 7; k++) { const a = Math.PI + (k / 7) * Math.PI; g.beginPath(); g.moveTo(x + w / 2 + Math.cos(a) * 36, y + 14 + (w - 40) / 2 + Math.sin(a) * 36); g.lineTo(x + w / 2 + Math.cos(a) * 44, y + 14 + (w - 40) / 2 + Math.sin(a) * 44); g.stroke(); }
  }
  { // the royal arms carved in the south tympanum (relief in the same stone): shield, crown, lion and unicorn
    const [x, y, w, h] = PDECAL.arms, cx = x + w / 2;
    g.fillStyle = '#cfcbc1';
    g.beginPath(); g.moveTo(cx - 30, y + 38); g.lineTo(cx + 30, y + 38); g.lineTo(cx + 30, y + 86); g.quadraticCurveTo(cx, y + 118, cx - 30, y + 86); g.closePath(); g.fill();
    g.strokeStyle = '#8f8b83'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y + 38); g.lineTo(cx, y + 104); g.moveTo(cx - 30, y + 66); g.lineTo(cx + 30, y + 66); g.stroke();
    g.beginPath(); g.arc(cx, y + 72, 44, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); // garter
    g.fillStyle = '#cfcbc1'; g.beginPath(); g.moveTo(cx - 18, y + 34); g.lineTo(cx - 20, y + 16); g.lineTo(cx - 8, y + 24); g.lineTo(cx, y + 8); g.lineTo(cx + 8, y + 24); g.lineTo(cx + 20, y + 16); g.lineTo(cx + 18, y + 34); g.closePath(); g.fill();
    for (const s of [-1, 1]) { // rampant supporters
      const bx = cx + s * 62;
      g.beginPath(); g.ellipse(bx, y + 78, 18, 30, s * 0.35, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(bx + s * 8, y + 42, 12, 0, Math.PI * 2); g.fill();
      g.fillRect(bx - 14, y + 100, 8, 22); g.fillRect(bx + 4, y + 100, 8, 22);
      g.beginPath(); g.moveTo(bx - s * 6, y + 60); g.lineTo(bx - s * 30, y + 50); g.lineTo(bx - s * 28, y + 58); g.closePath(); g.fill();
      if (s > 0) { g.fillRect(bx + 14, y + 22, 3, 16); } else { g.beginPath(); g.arc(bx - 8, y + 34, 16, Math.PI * 1.1, Math.PI * 1.9); g.fill(); }
    }
    g.fillRect(x + 30, y + h - 8, w - 60, 6);
  }
  { // Portland balusters (cut out), six per strip
    const [x, y, w, h] = PDECAL.balust, n = 6, bw = w / n;
    for (let k = 0; k < n; k++) {
      const cx = x + (k + 0.5) * bw;
      g.fillStyle = PORT; g.beginPath();
      g.moveTo(cx - 9, y + h); g.lineTo(cx - 9, y + h - 6); g.bezierCurveTo(cx - 20, y + h - 20, cx - 16, y + 26, cx - 5, y + 16);
      g.lineTo(cx - 9, y + 8); g.lineTo(cx - 9, y); g.lineTo(cx + 9, y); g.lineTo(cx + 9, y + 8); g.lineTo(cx + 5, y + 16);
      g.bezierCurveTo(cx + 16, y + 26, cx + 20, y + h - 20, cx + 9, y + h - 6); g.lineTo(cx + 9, y + h); g.closePath(); g.fill();
      g.fillStyle = 'rgba(120,116,108,0.5)'; g.fillRect(cx + 3, y + 18, 5, h - 26);
    }
  }
  { // Kennan cast-iron railing: spear-topped bars, top rail, a row of dog bars
    const [x, y, w, h] = PDECAL.railing;
    g.fillStyle = IRONB;
    g.fillRect(x, y + 10, w, 3); g.fillRect(x, y + h - 6, w, 4); g.fillRect(x, y + h - 20, w, 2);
    for (let bx = x + 2; bx < x + w; bx += 10) {
      g.fillRect(bx, y + 4, 2.5, h - 6);
      g.beginPath(); g.moveTo(bx - 2.5, y + 6); g.lineTo(bx + 1.25, y); g.lineTo(bx + 5, y + 6); g.fill();
      g.fillRect(bx + 5, y + h - 20, 1.5, 14);
    }
  }
  { // triumphal arch at the north ends of the flanks: an arched opening between engaged columns
    const [x, y, w, h] = PDECAL.triumph;
    g.fillStyle = PORT; g.fillRect(x, y, w, h);
    g.fillStyle = PORT_D; g.fillRect(x + 6, y, 16, h); g.fillRect(x + w - 22, y, 16, h);
    g.fillStyle = '#2a2b2c'; roundArch(x + 32, y + 18, w - 64, h - 18); g.fill();
    g.strokeStyle = '#46474a'; g.lineWidth = 2; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(x + 32 + k * (w - 64) / 6, y + 50); g.lineTo(x + 32 + k * (w - 64) / 6, y + h); g.stroke(); }
    g.fillStyle = '#c4c0b6'; g.fillRect(x, y + 8, w, 6);
  }
}
// Night uplighting for the Parliament House: ground-mounted warm floods wash the stone, brightest at the foot of
// the walls and columns and fading out above the cornice. One shared uniform; per-fragment it is a height ramp
// in world space, so no extra vertex data.
const uplight = { value: 0 };
export function uplit(m, top = 11) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uUplight = uplight;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vUpY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUpY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uUplight;\nvarying float vUpY;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uUplight * diffuseColor.rgb * vec3(1.0, 0.88, 0.72) * (0.03 + 0.42 * (1.0 - smoothstep(0.0, ${top.toFixed(1)}, vUpY)));`);
  };
  m.customProgramCacheKey = () => `uplit${top}`;
  return m;
}

// tileable stone: calp rubble (grey, irregular), ashlar courses, slate, brick
export function stoneTile(size, base, courses, jitter, mortar = 'rgba(40,38,36,0.55)', tint = 0.35, joint = 2) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size);
  let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ch = size / courses;
  for (let row = 0; row < courses; row++) {
    let x = -r() * 40;
    while (x < size) {
      const w = ch * (1.2 + r() * jitter * 2.5), l = (r() - 0.5) * 30;
      g.fillStyle = `hsl(30, 4%, ${45 + l * 0.5}%)`; g.globalAlpha = tint; g.fillRect(x, row * ch, w, ch); g.globalAlpha = 1;
      g.fillStyle = mortar; g.fillRect(x, row * ch, 2, ch);
      x += w;
    }
    g.fillStyle = mortar; g.fillRect(0, row * ch, size, joint);
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
    // Parliament House: white Portland stone dressings against grey granite walls, rusticated below the platband
    portland: uplit(std({ map: stoneTile(256, PORT, 6, 0.15, 'rgba(120,114,104,0.35)', 0.1), roughness: 0.72 })),
    pgranite: uplit(std({ map: stoneTile(256, GRAN, 7, 0.2, 'rgba(90,88,84,0.45)', 0.18), roughness: 0.82 })),
    prustic: uplit(std({ map: stoneTile(256, '#a39d93', 5, 0.1, 'rgba(70,68,63,0.6)', 0.18, 5), roughness: 0.88 })),
    lead: std({ color: 0x6b7075, roughness: 0.6, metalness: 0.3 }),
    plamp: std({ color: 0xfff1d6, emissive: 0xffc98a, emissiveIntensity: 0.15, roughness: 0.3 }),
  };
  const pat = atlas(512, paintParliament);
  stoneMats.pdecal = uplit(std({ map: pat, alphaTest: 0.5, roughness: 0.7 }));
  stoneMats.pcut = uplit(std({ map: pat, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 })); // railings, balusters, capitals
  setStoneNight(stoneNight);
  return stoneMats;
}
const byName = (name) => {
  const m = stoneMaterials(), k = name.replace(/^[a-z]+_/, '');
  if (name.startsWith('pk_') && parkMaterials()[k]) return parkMats[k];
  return m[k] || m.rubble;
};

// ---------- Phoenix Park heroes (tools/blender/build_phoenixpark.py): their own atlas of bronze reliefs and ironwork ----------
// regions, px in 1024 (must match build_phoenixpark.py PARK)
const PARK = {
  waterloo: [0, 0, 1024, 192], liberty: [0, 192, 1024, 192], india: [0, 384, 1024, 192], inscr: [0, 576, 1024, 192],
  ncr: [0, 768, 256, 256], aras: [256, 768, 256, 256], phx: [512, 768, 256, 128], arms: [512, 896, 256, 128], names: [768, 768, 256, 256],
};
function paintPark(g) {
  g.clearRect(0, 0, 1024, 1024);
  let seed = 5; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // bronze relief panels cast from Waterloo cannon: dark bronze, verdigris run-off, a frieze of figures in relief
  // (a stylised procession: standing and striding figures, horses, standards) lit from above
  const bronze = (key, scene) => {
    const [x, y, w, h] = PARK[key];
    const grd = g.createLinearGradient(0, y, 0, y + h); grd.addColorStop(0, '#2c302d'); grd.addColorStop(1, '#1a1d1c');
    g.fillStyle = grd; g.fillRect(x, y, w, h);
    g.strokeStyle = '#3f4a43'; g.lineWidth = 6; g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    const fig = (fx, base, s, lean = 0, horse = false) => {
      const hi = '#58615a', lo = '#141615';
      for (const [col, off] of [[lo, 2], [hi, 0]]) {
        g.fillStyle = col;
        if (horse) {
          g.beginPath(); g.ellipse(fx + off, base - 46 * s, 34 * s, 15 * s, 0, 0, 6.29); g.fill();          // body
          g.fillRect(fx - 26 * s + off, base - 40 * s, 6 * s, 40 * s); g.fillRect(fx + 22 * s + off, base - 40 * s, 6 * s, 40 * s);
          g.beginPath(); g.moveTo(fx + 28 * s + off, base - 52 * s); g.lineTo(fx + 48 * s + off, base - 84 * s); g.lineTo(fx + 58 * s + off, base - 76 * s); g.lineTo(fx + 36 * s + off, base - 44 * s); g.fill(); // neck
          g.beginPath(); g.ellipse(fx - 2 * s + off, base - 78 * s, 8 * s, 16 * s, 0, 0, 6.29); g.fill(); // rider
          g.beginPath(); g.arc(fx - 2 * s + off, base - 100 * s, 7 * s, 0, 6.29); g.fill();
        } else {
          g.beginPath(); g.arc(fx + lean * 10 * s + off, base - 112 * s, 9 * s, 0, 6.29); g.fill();        // head
          g.beginPath(); g.moveTo(fx - 12 * s + lean * 8 * s + off, base - 100 * s); g.lineTo(fx + 12 * s + lean * 8 * s + off, base - 100 * s);
          g.lineTo(fx + 16 * s + off, base - 40 * s); g.lineTo(fx - 16 * s + off, base - 40 * s); g.fill();    // cloaked body
          g.fillRect(fx - 12 * s + off, base - 40 * s, 8 * s, 40 * s); g.fillRect(fx + 4 * s + lean * 8 * s + off, base - 40 * s, 8 * s, 40 * s);
        }
      }
    };
    const base = y + h - 22;
    let fx = x + 40;
    while (fx < x + w - 40) {
      const k = r();
      if (scene === 'battle' && k < 0.28) { fig(fx + 30, base, 1.05, 0, true); fx += 110; }
      else { fig(fx, base, 1.0 + (r() - 0.5) * 0.12, (r() - 0.5) * 1.4); fx += 44 + r() * 26; }
      if (scene === 'battle' && r() < 0.18) { g.fillStyle = '#58615a'; g.fillRect(fx - 20, y + 20, 4, h - 44); g.fillRect(fx - 16, y + 22, 34, 22); } // standard
    }
    // verdigris streaks
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(80,120,100,${0.08 + r() * 0.12})`; g.fillRect(x + r() * w, y + h * 0.3 + r() * h * 0.5, 3 + r() * 6, h * 0.4); }
  };
  bronze('waterloo', 'battle'); bronze('liberty', 'civic'); bronze('india', 'battle');
  { // the east face's inscription panel
    const [x, y, w, h] = PARK.inscr;
    g.fillStyle = '#262a28'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#4a544d'; g.lineWidth = 6; g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    g.fillStyle = '#7d8a80'; g.font = 'bold 26px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['ASIA AND EUROPE, SAVED BY THEE, PROCLAIM', 'INVINCIBLE IN WAR THY DEATHLESS NAME,', 'NOW ROUND THY BROW THE CIVIC OAK WE TWINE', 'THAT EVERY EARTHLY GLORY MAY BE THINE.']
      .forEach((t, i) => g.fillText(t, x + w / 2, y + 36 + i * 40));
  }
  { // battle names cut into the shaft (dark lettering on a transparent ground)
    const [x, y, w, h] = PARK.names;
    g.fillStyle = 'rgba(40,42,40,0.75)'; g.font = 'bold 17px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const names = ['WATERLOO', 'VITTORIA', 'SALAMANCA', 'TALAVERA', 'BUSACO', 'ASSAYE', 'SERINGAPATAM', 'TOULOUSE', 'BADAJOZ', 'ORTHES'];
    names.forEach((t, i) => g.fillText(t, x + w / 2, y + 14 + i * 24));
  }
  { // white cast-iron openwork (NCR gate screens and piers, Áras railings): verticals with spear heads, a scroll band
    const [x, y, w, h] = PARK.ncr;
    g.fillStyle = '#f1efe8';
    g.fillRect(x, y + 6, w, 10); g.fillRect(x, y + h - 16, w, 12); g.fillRect(x, y + h * 0.62, w, 7);
    for (let k = 0; k < 10; k++) {
      const bx = x + 8 + k * (w / 10);
      g.fillRect(bx, y + 10, 7, h - 20);
      g.beginPath(); g.moveTo(bx - 4, y + 14); g.lineTo(bx + 3.5, y); g.lineTo(bx + 11, y + 14); g.fill();
    }
    g.strokeStyle = '#f1efe8'; g.lineWidth = 5;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + 25 + k * 51, y + h * 0.75, 17, 0, 6.29); g.stroke(); }
  }
  { // the Áras gate leaf: bars, a double rail, scrolls and a crest roundel
    const [x, y, w, h] = PARK.aras;
    g.fillStyle = '#f4f2ec';
    g.fillRect(x, y + h - 14, w, 12); g.fillRect(x, y + h * 0.4, w, 8); g.fillRect(x, y + h * 0.55, w, 6);
    for (let k = 0; k < 12; k++) { const bx = x + 4 + k * (w / 12); const top = y + 18 + Math.abs(k - 5.5) * 5; g.fillRect(bx, top, 6, y + h - top); g.beginPath(); g.moveTo(bx - 4, top + 6); g.lineTo(bx + 3, top - 10); g.lineTo(bx + 10, top + 6); g.fill(); }
    g.strokeStyle = '#f4f2ec'; g.lineWidth = 6; g.beginPath(); g.arc(x + w / 2, y + h * 0.47, 26, 0, 6.29); g.stroke();
  }
  { // the Phoenix column's inscribed marble plaque
    const [x, y, w, h] = PARK.phx;
    g.fillStyle = '#d9d4c7'; g.fillRect(x, y, w, h); g.strokeStyle = '#8f8a80'; g.lineWidth = 5; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
    g.fillStyle = '#5a564f'; g.font = 'bold 14px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['PHILIPPUS DORMER STANHOPE', 'COMES DE CHESTERFIELD', 'PROREX', 'MDCCXLVII'].forEach((t, i) => g.fillText(t, x + w / 2, y + 30 + i * 22));
  }
  { // carved arms on the north and south faces
    const [x, y, w, h] = PARK.arms;
    g.fillStyle = '#c9c4b8'; g.fillRect(x, y, w, h);
    g.fillStyle = '#9d988c'; g.beginPath(); g.moveTo(x + w / 2 - 34, y + 22); g.lineTo(x + w / 2 + 34, y + 22); g.lineTo(x + w / 2 + 30, y + 80); g.quadraticCurveTo(x + w / 2, y + 112, x + w / 2 - 30, y + 80); g.fill();
    g.fillStyle = '#b3aea2'; g.fillRect(x + w / 2 - 4, y + 30, 8, 60); g.fillRect(x + w / 2 - 26, y + 48, 52, 8);
    for (const s of [-1, 1]) { g.fillStyle = '#a9a498'; g.beginPath(); g.ellipse(x + w / 2 + s * 70, y + 64, 18, 40, 0, 0, 6.29); g.fill(); }
  }
}
let parkMats = null;
function parkMaterials() {
  if (parkMats) return parkMats;
  const map = atlas(1024, paintPark);
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = true; return m; };
  parkMats = {
    granite: stoneMaterials().granite,
    // Portland stone (the Phoenix column): pale, floodlit after dark (OPW; docs/research/phoenix-park.md §3.2)
    portland: std({ map: stoneTile(256, '#e2ddd0', 6, 0.15, 'rgba(120,114,104,0.35)'), roughness: 0.85, emissive: 0xfff2dc, emissiveIntensity: 0 }),
    limestone: std({ map: stoneTile(256, '#8f8f8c', 7, 0.2, 'rgba(60,58,56,0.5)'), roughness: 0.85 }),
    bronze: std({ map, roughness: 0.45, metalness: 0.35, alphaTest: 0.3, transparent: false }),
    cut: std({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }),
    white: std({ color: 0xece9e1, roughness: 0.55 }),
    slate: stoneMaterials().slate,
    render: std({ color: 0xd8d2c2, roughness: 0.9 }),
    lantern: std({ color: 0xe8d9b0, emissive: 0xffb36a, emissiveIntensity: 0.04, roughness: 0.2 }),
    grass: std({ color: 0x5b7a3e, roughness: 0.95, side: THREE.DoubleSide }), // lathed mounds: either winding
    sett: std({ map: stoneTile(128, '#7a7a7b', 14, 0.05, 'rgba(40,40,40,0.55)'), roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), // over the island's grass (which is offset itself)
    dark: stoneMaterials().dark,
    decal: stoneMaterials().decal,
  };
  parkMats.sett.map.repeat.set(3, 3);
  return parkMats;
}
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
    const m = stoneMaterials();
    o.castShadow = o.material !== m.decal && o.material !== m.pdecal && o.material !== m.pcut; // cut-outs would cast solid quads
    o.receiveShadow = true;
  });
}
let stoneNight = 0; // remembered so a model that loads after dark comes up lit
export function setStoneNight(level) {
  stoneNight = level;
  if (parkMats) { parkMats.lantern.emissiveIntensity = 0.04 + level * 2.6; parkMats.portland.emissiveIntensity = level * 0.14; }
  if (!stoneMats) return;
  stoneMats.decal.emissiveIntensity = level * 0.9;
  stoneMats.plamp.emissiveIntensity = 0.15 + level * 3.2;
  uplight.value = level;
}

// Place the named nodes of a stone-landmark GLB at the positions given in site.parts ({ x, z, rot, len? }).
export async function placeParts(scene, file, site, name) {
  let gltf;
  try { gltf = await load(file); } catch (e) { console.warn(`${file} model failed to load`, e); return null; }
  prepare(gltf.scene);
  const group = new THREE.Group(); group.name = name;
  // a part may name the node it copies ({ node: 'pier' }): one model placed several times (gate piers)
  for (const [part, p] of Object.entries(site.parts)) {
    let node = gltf.scene.getObjectByName(p.node || part);
    if (!node) continue;
    if (p.node) node = node.clone(); else node.removeFromParent();
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
