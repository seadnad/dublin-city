// Hero landmarks built in Blender (tools/blender/build_<name>.py -> public/models/<name>.glb). Each carries UVs into a
// small atlas that is painted here at load (patterns and cut-outs), so the GLBs stay tiny and nothing is baked into
// image files that would need regenerating. Models load after the city is up and replace any stand-in.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { addReflections } from '../render/reflect.js';
import { stoneTex } from './ground.js';

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
    o.castShadow = o.material !== stoneMaterials().decal;
    o.receiveShadow = true;
  });
}
export function setStoneNight(level) {
  if (stoneMats) stoneMats.decal.emissiveIntensity = level * 0.9;
  if (parkMats) { parkMats.lantern.emissiveIntensity = 0.04 + level * 2.6; parkMats.portland.emissiveIntensity = level * 0.14; }
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
