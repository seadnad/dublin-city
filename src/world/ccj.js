// Criminal Courts of Justice (docs/research/criminal-courts.md): the Blender hero (tools/blender/build_ccj.py ->
// public/models/ccj.glb) with its textures painted here at load: an 8 x 4 pane texture for the saw-toothed glass
// tiers and a 1024 atlas for everything else (bronze cladding, louvred slots, lobby and top-storey glazing, limestone,
// calp, the atrium roof, the Justice figure, the lettering, the flags), each with a night twin for the emissive map.
// Three draw calls. After dark the courtrooms glow through the tiers, the lobby and the atrium roof are bright, the
// stair landings show in the slots and the screen wall is washed with light. Low / Battery saver paints at half size.
import * as THREE from 'three';
import { load } from './heroes.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { plantTrees } from './trees.js';
import { KERB_H } from './roads.js';
import { addBox, addPolyline } from '../game/collision.js';

// atlas regions, px in 1024 x 1024 (must match A in tools/blender/build_ccj.py)
export const CCJ_ATLAS = {
  white: [0, 0, 64, 64], roof: [64, 0, 64, 64], steps: [128, 0, 64, 64], canopy: [192, 0, 64, 64],
  bronze: [0, 64, 256, 192], ground: [256, 0, 256, 128], top: [256, 128, 256, 128],
  louvre: [512, 0, 256, 512], lobby: [768, 0, 256, 256], skylight: [768, 256, 256, 256],
  stone: [0, 256, 256, 512], calp: [256, 256, 256, 128], core: [256, 384, 256, 384],
  justice: [512, 512, 256, 256], text: [0, 768, 1024, 128], harp: [768, 512, 64, 128],
  flagie: [832, 512, 192, 96], flageu: [832, 608, 192, 96],
};

// palette (sRGB), docs/research/criminal-courts.md 3.3
const LIME = '#d6d0c3', LIME_J = '#bdb6a8', CALP = '#5d5f5c', BRONZE = '#6f5a48', BRONZE_D = '#4f3f32', FRAME = '#e3e6e6';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = IS_MOBILE ? 4 : 8;
  return t;
}

// ---------------- the tier glazing: 8 panes (128 px) across x 4 tiers (256 px) down ----------------
// Each tier is two storeys (a double-height courtroom): a transom at the floor between, silver frames at the edges.
function paintGlass(g, lit) {
  const r = rng(11);
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const x = i * 128, y = j * 256;
    if (!lit) {
      // green-grey reflective glass, lighter where it picks up the sky at the head of the lean
      const k = 0.9 + r() * 0.2, gr = g.createLinearGradient(0, y, 0, y + 256);
      gr.addColorStop(0, `rgb(${176 * k | 0},${194 * k | 0},${192 * k | 0})`);
      gr.addColorStop(0.45, `rgb(${124 * k | 0},${142 * k | 0},${136 * k | 0})`);
      gr.addColorStop(1, `rgb(${98 * k | 0},${114 * k | 0},${110 * k | 0})`);
      g.fillStyle = gr; g.fillRect(x, y, 128, 256);
      // the perforated screen behind: faint vertical fins
      g.fillStyle = 'rgba(40,52,52,0.18)';
      for (let f = 10; f < 128; f += 14) g.fillRect(x + f, y + 8, 3, 240);
      // frames: silver edges, a transom where the two storeys meet
      g.fillStyle = FRAME; g.fillRect(x, y, 128, 5); g.fillRect(x, y + 251, 128, 5); g.fillRect(x, y, 4, 256); g.fillRect(x + 124, y, 4, 256);
      g.fillStyle = 'rgba(214,220,220,0.85)'; g.fillRect(x, y + 124, 128, 5);
    } else {
      // courtrooms and corridors behind the screen, most lit (a warm white), some dim, a few dark
      // (an even glow through the screens, as in night photos: a few rooms dimmer, the odd one dark)
      const v = r(), on = v < 0.07 ? 0.2 : v < 0.25 ? 0.62 : 0.82 + r() * 0.12;
      const warm = r() < 0.88;
      for (const [y0, h] of [[y + 6, 118], [y + 130, 120]]) {
        const w = on * (0.9 + r() * 0.12);
        const gr = g.createLinearGradient(0, y0, 0, y0 + h);
        const col = (a) => (warm ? `rgba(255,228,188,${a})` : `rgba(228,236,238,${a})`);
        gr.addColorStop(0, col(Math.min(1, w))); gr.addColorStop(0.2, col(w * 0.85)); gr.addColorStop(1, col(w * 0.45));
        g.fillStyle = gr; g.fillRect(x + 4, y0, 120, h);
        g.fillStyle = 'rgba(0,0,0,0.35)'; for (let f = 10; f < 128; f += 14) g.fillRect(x + f, y0, 3, h); // the screen
      }
    }
  }
}

// ---------------- the atlas ----------------
function paintAtlas(g, lit) {
  const R = CCJ_ATLAS, r = rng(7);
  g.clearRect(0, 0, 1024, 1024);
  const box = (k, col) => { const [x, y, w, h] = R[k]; g.fillStyle = col; g.fillRect(x, y, w, h); };
  const noise = (k, n, a, s = 6) => { const [x, y, w, h] = R[k]; for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${a * r()})`; g.fillRect(x + r() * w, y + r() * h, s * (0.5 + r()), s * (0.5 + r())); } };
  // opaque regions are filled black on the night map unless they glow
  for (const k of ['white', 'roof', 'steps', 'canopy', 'bronze', 'ground', 'top', 'louvre', 'lobby', 'skylight', 'stone', 'calp', 'core']) box(k, '#000');
  if (!lit) {
    box('white', FRAME);
    box('roof', '#8b8d8c'); noise('roof', 60, 0.12, 4);
    box('steps', '#7c7e80'); { const [x, y, w] = R.steps; g.fillStyle = 'rgba(40,40,40,0.35)'; for (let k = 0; k < 4; k++) g.fillRect(x, y + 6 + k * 16, w, 2); }
    box('canopy', '#b3c6c8'); { const [x, y, w, h] = R.canopy; g.fillStyle = '#e8ecec'; for (let k = 0; k <= 4; k++) g.fillRect(x + (k * w) / 4 - 1, y, 3, h); }
  } else {
    box('canopy', '#5a5044');
  }
  { // bronze cladding: long horizontal panels with dark joints and a few vertical joints
    const [x, y, w, h] = R.bronze;
    if (!lit) {
      const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, BRONZE_D); gr.addColorStop(0.5, BRONZE); gr.addColorStop(1, '#7a6553');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(30,22,16,0.55)'; g.fillRect(x, y + (k * h) / 24, w, 2); g.fillStyle = 'rgba(160,136,112,0.25)'; g.fillRect(x, y + (k * h) / 24 + 2, w, 1); }
      for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(30,22,16,0.45)'; const vx = x + (((k * 37) % 4) + 0.5) * (w / 4); g.fillRect(vx, y + (k * h) / 24, 2, h / 24); }
    }
  }
  { // ground-storey glazing (one ~3.5 m facet x 5 m): mullions every metre and a half, a transom, reflections
    const [x, y, w, h] = R.ground;
    if (!lit) {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3a4750'); gr.addColorStop(1, '#1f272d');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#9aa3a6'; for (let k = 0; k <= 3; k++) g.fillRect(x + (k * w) / 3 - 2, y, 4, h); g.fillRect(x, y + h * 0.3, w, 3); g.fillRect(x, y + h - 6, w, 6);
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff0d4'); gr.addColorStop(0.4, '#c9a878'); gr.addColorStop(1, '#6a5438');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#000'; for (let k = 0; k <= 3; k++) g.fillRect(x + (k * w) / 3 - 2, y, 4, h);
    }
  }
  { // the set-back top storey: clear bluish glazing, close mullions, a solid spandrel at the foot
    const [x, y, w, h] = R.top;
    if (!lit) {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#9fb6c6'); gr.addColorStop(0.6, '#5f7a8c'); gr.addColorStop(1, '#465c6a');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#d7dcde'; for (let k = 0; k <= 4; k++) g.fillRect(x + (k * w) / 4 - 2, y, 4, h); g.fillRect(x, y, w, 4);
      g.fillStyle = '#39454d'; g.fillRect(x, y + h * 0.84, w, h * 0.16);
    } else {
      for (let k = 0; k < 4; k++) { const v = r(); g.fillStyle = v < 0.2 ? '#2a2620' : v < 0.5 ? '#9c8e76' : '#f2e2c4'; g.fillRect(x + (k * w) / 4 + 2, y + 6, w / 4 - 4, h * 0.78); }
    }
  }
  { // louvred slot: dark glazing behind bronze louvre blades; a floor slab every 3.5 m (six floors over the region)
    const [x, y, w, h] = R.louvre;
    if (!lit) {
      g.fillStyle = '#1d2429'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(120,140,150,0.25)'; g.fillRect(x + w * 0.1, y, w * 0.25, h);
      for (let k = 0; k < 6; k++) {
        const fy = y + (k * h) / 6;
        g.fillStyle = '#3b3f40'; g.fillRect(x, fy, w, 6);             // slab edge
        g.fillStyle = BRONZE; for (let b = 0; b < 7; b++) g.fillRect(x, fy + 18 + b * 9, w, 4); // louvre blades
        g.fillStyle = '#8c9396'; g.fillRect(x, fy + h / 6 - 14, w, 3); // balustrade rail
      }
      g.fillStyle = '#a7aeb0'; for (let k = 0; k <= 4; k++) g.fillRect(x + (k * w) / 4 - 2, y, 4, h);
    } else {
      for (let k = 0; k < 6; k++) {
        const fy = y + (k * h) / 6;
        const gr = g.createLinearGradient(0, fy, 0, fy + h / 6); gr.addColorStop(0, '#fff4dc'); gr.addColorStop(0.5, '#a8987c'); gr.addColorStop(1, '#3c342a');
        g.fillStyle = gr; g.fillRect(x, fy + 6, w, h / 6 - 6);
        g.fillStyle = '#000'; for (let b = 0; b < 7; b++) g.fillRect(x, fy + 18 + b * 9, w, 4);
      }
    }
  }
  { // the double-height lobby: a grid of large panes, the reception and people inside at night
    const [x, y, w, h] = R.lobby;
    if (!lit) {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#6f8f98'); gr.addColorStop(0.5, '#3f565f'); gr.addColorStop(1, '#2b393f');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(200,220,220,0.18)'; g.beginPath(); g.moveTo(x, y + h * 0.2); g.lineTo(x + w, y); g.lineTo(x + w, y + h * 0.1); g.lineTo(x, y + h * 0.35); g.fill();
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff6e0'); gr.addColorStop(0.7, '#e8c890'); gr.addColorStop(1, '#8a6e48');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    g.fillStyle = lit ? '#000' : '#aeb5b8';
    for (let k = 0; k <= 4; k++) g.fillRect(x + (k * w) / 4 - 3, y, 6, h);
    g.fillRect(x, y + h * 0.42, w, 5); g.fillRect(x, y, w, 6); g.fillRect(x, y + h - 8, w, 8);
  }
  { // the atrium's glass roof: glazing bars over a lit well
    const [x, y, w, h] = R.skylight;
    if (!lit) { g.fillStyle = '#8fa6ae'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, h * 0.3); }
    else { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff1d6'); gr.addColorStop(1, '#d8b888'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    g.fillStyle = lit ? '#403426' : '#dfe3e3';
    for (let k = 0; k <= 8; k++) g.fillRect(x + (k * w) / 8 - 2, y, 4, h);
    for (let k = 0; k <= 4; k++) g.fillRect(x, y + (k * h) / 4 - 2, w, 4);
  }
  { // limestone ashlar: long courses, staggered joints (refs 03, 07); night: a floodlit wash, brightest at the foot
    const [x, y, w, h] = R.stone;
    if (!lit) {
      g.fillStyle = LIME; g.fillRect(x, y, w, h);
      const rows = 16, rh = h / rows;
      for (let k = 0; k < rows; k++) {
        const tone = 0.94 + r() * 0.1;
        for (let c = 0; c < 3; c++) { g.fillStyle = `rgba(${200 * tone | 0},${194 * tone | 0},${180 * tone | 0},0.35)`; g.fillRect(x + c * (w / 3) + (k % 2) * (w / 6), y + k * rh, w / 3, rh); }
        g.fillStyle = LIME_J; g.fillRect(x, y + k * rh, w, 2);
        for (let c = 0; c < 4; c++) g.fillRect(x + ((c * w) / 3 + (k % 2) * (w / 6)) % w, y + k * rh, 2, rh);
      }
      noise('stone', 200, 0.05, 5);
    } else {
      const gr = g.createLinearGradient(0, y + h, 0, y); gr.addColorStop(0, '#6a6052'); gr.addColorStop(1, '#2a2620');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
  }
  { // calp limestone rubble (the plinth, ref 07): dark grey stones of mixed size in pale mortar
    const [x, y, w, h] = R.calp;
    if (!lit) {
      g.fillStyle = '#8a8a84'; g.fillRect(x, y, w, h);
      let yy = y;
      while (yy < y + h) {
        const rh = 12 + r() * 14; let xx = x - r() * 20;
        while (xx < x + w) { const rw = 18 + r() * 34, v = 70 + r() * 40; g.fillStyle = `rgb(${v | 0},${(v + 2) | 0},${(v - 2) | 0})`; g.fillRect(xx + 2, yy + 2, rw - 3, rh - 3); xx += rw; }
        yy += rh;
      }
    }
  }
  { // the north stair tower: limestone with a tall glazed slit
    const [x, y, w, h] = R.core;
    if (!lit) {
      g.fillStyle = LIME; g.fillRect(x, y, w, h);
      for (let k = 0; k < 14; k++) { g.fillStyle = LIME_J; g.fillRect(x, y + (k * h) / 14, w, 2); }
      g.fillStyle = '#2c363c'; g.fillRect(x + w * 0.42, y + h * 0.06, w * 0.16, h * 0.8);
      g.fillStyle = '#a9b0b3'; for (let k = 0; k < 9; k++) g.fillRect(x + w * 0.42, y + h * 0.06 + (k * h * 0.8) / 8, w * 0.16, 3);
    } else {
      g.fillStyle = '#e8dcc4'; g.fillRect(x + w * 0.42, y + h * 0.06, w * 0.16, h * 0.8);
    }
  }
  if (lit) return; // the decals don't glow
  { // the bronze Justice (blindfolded, with her scales; refs 03, 04, 07): stylised cut plates
    const [x, y, w, h] = R.justice;
    g.save(); g.translate(x, y); g.scale(w / 256, h / 256);
    const plate = (col, pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
    plate('#6b5140', [[62, 118], [112, 108], [124, 252], [92, 254], [50, 192]]);          // the cloak falling from the shoulder
    plate('#8a8f86', [[80, 66], [152, 36], [194, 90], [172, 152], [120, 162], [84, 130]]); // the head in profile
    plate('#767b72', [[56, 58], [110, 26], [152, 30], [98, 70]]);                           // hair / hood
    plate('#3c3a34', [[84, 76], [180, 62], [182, 82], [86, 96]]);                           // the blindfold
    plate('#949a8f', [[108, 150], [172, 146], [152, 232], [116, 238]]);                     // the neck and breast
    g.strokeStyle = '#3e3a33'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(186, 36); g.lineTo(186, 150); g.stroke();                        // the scales' post
    g.beginPath(); g.moveTo(130, 112); g.lineTo(240, 100); g.stroke();                      // the beam
    g.lineWidth = 2; for (const bx of [136, 234]) { g.beginPath(); g.moveTo(bx, 112); g.lineTo(bx - 14, 150); g.moveTo(bx, 112); g.lineTo(bx + 14, 148); g.stroke(); }
    g.fillStyle = '#3e3a33'; for (const bx of [136, 234]) { g.beginPath(); g.ellipse(bx, 152, 18, 6, 0, 0, Math.PI); g.fill(); }
    g.restore();
  }
  { // the lettering, in the dark bronze of the harp (refs 03, 04, 07)
    const [x, y, w, h] = R.text;
    g.fillStyle = '#2f2c28'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '500 44px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    g.fillText('Na Cúirteanna Breithiúnais Coiriúla', x + w / 2, y + h * 0.28, w * 0.96);
    g.fillText('The Criminal Courts of Justice', x + w / 2 + w * 0.03, y + h * 0.74, w * 0.9);
  }
  { // the harp on its shield
    const [x, y, w, h] = R.harp;
    g.fillStyle = '#26282a';
    g.beginPath(); g.moveTo(x + 6, y + 8); g.lineTo(x + w - 6, y + 8); g.lineTo(x + w - 6, y + h * 0.6); g.quadraticCurveTo(x + w / 2, y + h - 4, x + 6, y + h * 0.6); g.closePath(); g.fill();
    g.strokeStyle = '#4c4f52'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x + 18 + k * 6, y + 24); g.lineTo(x + 18 + k * 6, y + 80); g.stroke(); }
  }
  { // the tricolour
    const [x, y, w, h] = R.flagie;
    g.fillStyle = '#169b62'; g.fillRect(x, y, w / 3, h); g.fillStyle = '#f4f4f0'; g.fillRect(x + w / 3, y, w / 3, h); g.fillStyle = '#ff883e'; g.fillRect(x + (2 * w) / 3, y, w / 3, h);
  }
  { // the EU flag
    const [x, y, w, h] = R.flageu;
    g.fillStyle = '#003399'; g.fillRect(x, y, w, h);
    g.fillStyle = '#ffcc00';
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.arc(x + w / 2 + Math.cos(a) * h * 0.32, y + h / 2 + Math.sin(a) * h * 0.32, 3.5, 0, Math.PI * 2); g.fill(); }
  }
}

let mats = null;
function materials() {
  if (mats) return mats;
  const S = LITE ? 512 : 1024, paint = (fn, lit) => { const c = canvas(S); const g = c.getContext('2d'); g.scale(S / 1024, S / 1024); fn(g, lit); return texture(c); };
  const atlas = paint(paintAtlas, false), atlasN = paint(paintAtlas, true);
  const glass = paint(paintGlass, false), glassN = paint(paintGlass, true);
  mats = {
    // reflective glass: mostly what it mirrors, so a strong metallic / environment term over a green-grey tint
    ccj_glass: new THREE.MeshStandardMaterial({ map: glass, roughness: 0.14, metalness: 0.35, envMapIntensity: 2.0, emissive: 0xffffff, emissiveMap: glassN, emissiveIntensity: 0 }),
    ccj_atlas: new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.62, metalness: 0.08, emissive: 0xffffff, emissiveMap: atlasN, emissiveIntensity: 0 }),
    // (lit after dark with the floodlit wall behind it)
    ccj_decal: new THREE.MeshStandardMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0 }),
  };
  return mats;
}

export async function placeCCJ(scene, site, outline) {
  // collision first, so the building is solid whether or not the model loads
  addPolyline(outline, true);
  let gltf;
  try { gltf = await load('ccj'); } catch (e) { console.warn('ccj model failed to load', e); return null; }
  const M = materials();
  const root = gltf.scene.getObjectByName('ccj');
  if (!root) return null;
  root.removeFromParent();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = M[o.material.name] || M.ccj_atlas;
    o.castShadow = o.material !== M.ccj_decal;
    o.receiveShadow = true;
  });
  root.position.set(site.x, 0, site.z);
  root.name = 'Criminal Courts of Justice';
  scene.add(root);
  // London planes in the forecourt towards Infirmary Road and on the terrace (ref 01)
  const T = (dx, dz, s) => ({ x: site.x + dx, y: KERB_H, z: site.z + dz, rot: (dx * 7.3 + dz * 3.1) % 6.28, s });
  const trees = [T(31, -4, 0.9), T(33, 8, 0.95), T(34, 19, 0.85), T(-9, 27.5, 0.8), T(-21, 21, 0.85)];
  plantTrees(scene, trees, { plane: 1 });
  for (const t of trees) addBox(t.x, t.z, 0.4, 0.4, 0);
  return {
    root,
    setNight(l) {
      M.ccj_glass.emissiveIntensity = 0.5 * l;
      M.ccj_atlas.emissiveIntensity = 1.0 * l;
      M.ccj_decal.emissiveIntensity = 0.3 * l;
    },
  };
}
