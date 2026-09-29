// Grand Canal Square (docs/research/grand-canal-square.md): the Blender hero (tools/blender/build_gcsquare.py ->
// public/models/gcsquare.glb) holding the Bord Gáis Energy Theatre, the Marker, 4-5 Grand Canal Square (the leaning
// glass prow on Misery Hill), 2 Grand Canal Square and 1 Grand Canal Square. Its textures are painted here at load,
// each with a night twin for the emissive map: the office curtain glass (a 4-bay x 4-floor tile), the theatre's lobby
// glass with its green steel lattice, the theatre's stainless rainscreen in diagonal courses, and a 1024 atlas for everything else (the
// Marker's GRC, its windows and ground-floor glazing, the office bases, the signs). Four draw calls. After dark the
// Marker's rooms and rooftop bar light up, the theatre lobby glows through the leaning glass and the offices show lit
// floors. Low / Battery saver paints the textures at half size.
import * as THREE from 'three';
import { load } from './heroes.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { addPolyline } from '../game/collision.js';
import { GCSQ } from './sites.js';

// atlas regions, px in 1024 x 1024 (must match A in tools/blender/build_gcsquare.py)
export const GCS_ATLAS = {
  grc: [0, 0, 64, 64], frame: [64, 0, 64, 64], steel: [128, 0, 64, 64], white: [192, 0, 64, 64],
  granite: [256, 0, 64, 64], paving: [320, 0, 64, 64], lawn: [384, 0, 64, 64], void: [448, 0, 64, 64],
  soffit: [512, 0, 64, 64], greyglass: [576, 0, 64, 64], roof: [640, 0, 64, 64], planting: [704, 0, 64, 64],
  louvreback: [768, 0, 64, 64], mesh: [832, 0, 64, 64], clad: [896, 0, 64, 64], dark: [960, 0, 64, 64],
  win0: [0, 64, 128, 128], win1: [128, 64, 128, 128], win2: [256, 64, 128, 128], win3: [384, 64, 128, 128],
  bar: [512, 64, 128, 128], grnd: [640, 64, 128, 256], base: [768, 64, 128, 256], door: [896, 64, 128, 256],
  name: [0, 448, 1024, 96], marker: [0, 544, 512, 96], gcsign: [512, 544, 512, 96],
};

// palette (sRGB), docs/research/grand-canal-square.md 3.1-3.3
const GRC = '#e4e2dc', FRAME = '#2b2f33', WARM = '#ffe2b4', WARM2 = '#ffd79c';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvas(w, h, paint) {
  const k = LITE ? 0.5 : 1, c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.scale(k, k); paint(g);
  return c;
}
function texture(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  // Blender's exporter already flipped v: the canvas top is the top of each tile / region
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = IS_MOBILE ? 4 : 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------- office curtain glass: 4 bays (128 px, 1.5 m) x 4 floors (256 px, 3.5 m) ----------------
// Each floor: a vision pane over a dark fritted spandrel at the slab, thin dark mullions; Libeskind's geometric frit as
// faint diagonals. At night most panes glow with office light, some dim, a few dark.
function paintGlass(g, lit) {
  const r = rng(lit ? 23 : 5);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 1024);
  for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
    const x = b * 128, y = f * 256, sp = 62; // spandrel at the foot of each floor
    if (!lit) {
      const k = 0.92 + r() * 0.16, gr = g.createLinearGradient(0, y, 0, y + 256 - sp);
      gr.addColorStop(0, `rgb(${150 * k | 0},${176 * k | 0},${182 * k | 0})`);
      gr.addColorStop(0.5, `rgb(${96 * k | 0},${122 * k | 0},${128 * k | 0})`);
      gr.addColorStop(1, `rgb(${70 * k | 0},${92 * k | 0},${98 * k | 0})`);
      g.fillStyle = gr; g.fillRect(x, y, 128, 256 - sp);
      g.fillStyle = '#3c4a4e'; g.fillRect(x, y + 256 - sp, 128, sp);
      g.fillStyle = 'rgba(200,210,212,0.22)'; for (let i = 0; i < 128; i += 8) for (let j = 0; j < sp; j += 8) g.fillRect(x + i + ((j / 8) % 2) * 4, y + 256 - sp + j, 3, 3);
      // the frit's diagonals (Libeskind's "geometric ceramic frit patterns")
      g.strokeStyle = 'rgba(215,225,226,0.28)'; g.lineWidth = 2;
      g.beginPath(); if ((b + f) % 2) { g.moveTo(x, y); g.lineTo(x + 128, y + 256 - sp); } else { g.moveTo(x + 128, y); g.lineTo(x, y + 256 - sp); } g.stroke();
      g.fillStyle = '#343b3f'; g.fillRect(x, y, 4, 256); g.fillRect(x, y + 256 - sp - 3, 128, 5); g.fillRect(x, y, 128, 3);
    } else {
      const v = r(), on = v < 0.3 ? 0 : v < 0.5 ? 0.3 : 0.6 + r() * 0.3, warm = r() < 0.7;
      if (on > 0) {
        const gr = g.createLinearGradient(0, y, 0, y + 256 - sp);
        const col = (a) => (warm ? `rgba(255,231,196,${a})` : `rgba(226,236,244,${a})`);
        gr.addColorStop(0, col(on)); gr.addColorStop(0.15, col(on * 0.9)); gr.addColorStop(1, col(on * 0.45));
        g.fillStyle = gr; g.fillRect(x + 4, y + 3, 124, 256 - sp - 6);
      }
    }
  }
}

// ---------------- the theatre's lobby glass: panes 1.5 m x 3 m, green box-section lattice (6 m x 12 m tile) ----------------
function paintLobby(g, lit) {
  const r = rng(lit ? 41 : 9);
  if (!lit) {
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, '#9fbdb4'); gr.addColorStop(0.5, '#5f8a80'); gr.addColorStop(1, '#3e5f57');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.06})`; g.fillRect((i % 4) * 128, Math.floor(i / 4) * 256, 128, 256); }
  } else {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 1024);
    const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, 'rgba(255,236,204,0.75)'); gr.addColorStop(1, 'rgba(255,214,160,1)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
  }
  // the lattice: mullions, transoms and the steel diagonals, green-tinted by day and dark against the lit lobby
  g.strokeStyle = lit ? 'rgba(40,30,20,0.85)' : '#8fb8a6';
  g.lineWidth = 7; for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  g.lineWidth = 5; for (let y = 0; y <= 1024; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.lineWidth = 9; for (let k = -2; k < 3; k++) { g.beginPath(); g.moveTo(k * 256, 1024); g.lineTo(k * 256 + 512, 0); g.stroke(); }
  if (lit) { // balconies and stairs inside, the odd bright downlight
    g.fillStyle = 'rgba(60,40,24,0.5)'; for (let y = 180; y < 1024; y += 340) g.fillRect(0, y, 512, 14);
    for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(255,250,236,0.9)'; g.beginPath(); g.arc(r() * 512, r() * 1024, 3, 0, 7); g.fill(); }
  }
}

// ---------------- the theatre's stainless rainscreen: panels in diagonal courses (16 m tile), glazing strips ----------------
function paintClad(g, lit) {
  // Courses rise at 1 in 2 (27 degrees) across the tile: course k lies between y = 32k - x/2 and y = 32(k+1) - x/2, its
  // panels 256 px (8 m) long, staggered on alternate courses. Every period divides 512, so the tile wraps seamlessly; shades
  // come from a hash of the course (mod 16) and the panel (mod 2). One course per tile is a narrow glazing strip.
  g.fillStyle = lit ? '#000' : '#b0b4b6'; g.fillRect(0, 0, 512, 512);
  const CH = 32, PW = 256, mod = (a, n) => ((a % n) + n) % n;
  const shade = (k, i) => { const s = Math.sin(mod(k, 16) * 12.9898 + mod(i, 2) * 78.233) * 43758.5453; return s - Math.floor(s); };
  for (let k = -2; k < 34; k++) {
    const off = mod(k, 2) ? PW / 2 : 0, strip = mod(k, 16) === 5;
    for (let i = -2; i < 6; i++) {
      const x0 = i * PW + off, x1 = x0 + PW, y = (x, t) => CH * (k + t) - x / 2;
      g.beginPath(); g.moveTo(x0 + 1, y(x0 + 1, 0.05)); g.lineTo(x1 - 1, y(x1 - 1, 0.05)); g.lineTo(x1 - 1, y(x1 - 1, 0.95)); g.lineTo(x0 + 1, y(x0 + 1, 0.95)); g.closePath();
      if (lit) { if (strip) { g.fillStyle = 'rgba(200,218,236,0.5)'; g.fill(); } continue; }
      const v = strip ? 150 : 214 + shade(k, i) * 16;
      g.fillStyle = `rgb(${v | 0},${(v + 3) | 0},${(v + 5) | 0})`; g.fill();
    }
  }
}

// ---------------- the atlas ----------------
function paintAtlas(g, lit) {
  const R = GCS_ATLAS, r = rng(lit ? 3 : 7);
  g.clearRect(0, 0, 1024, 1024);
  const box = (k, col) => { const [x, y, w, h] = R[k]; g.fillStyle = col; g.fillRect(x, y, w, h); };
  const swatches = { grc: GRC, frame: FRAME, steel: '#c4c8ca', white: '#eceeec', granite: '#8e8d89', paving: '#b3b0a8', lawn: '#5f833b', void: '#101214', soffit: '#6a6e72', greyglass: '#7f898e', roof: '#6f7173', planting: '#7c7a48', louvreback: '#2a2e31', clad: '#b9bdbf', dark: '#1b1d1f' };
  for (const [k, c] of Object.entries(swatches)) box(k, lit ? '#000' : c);
  if (lit) { box('soffit', '#26221c'); box('greyglass', '#3a4450'); }
  if (!lit) { // grit in the GRC and granite, blades in the planting
    for (const k of ['grc', 'granite', 'paving']) { const [x, y, w, h] = R[k]; for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.06 * r()})`; g.fillRect(x + r() * w, y + r() * h, 2, 2); } }
    { const [x, y, w, h] = R.mesh; g.fillStyle = '#9ea3a5'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(60,64,66,0.5)'; g.lineWidth = 1; for (let i = -h; i < w; i += 4) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i + h, y + h); g.stroke(); g.beginPath(); g.moveTo(x + i + h, y); g.lineTo(x + i, y + h); g.stroke(); } }
  } else box('mesh', '#000');
  // the Marker's windows: dark frame, glass, pale curtains drawn to different widths; at night lit (warm), dim or dark
  for (let k = 0; k < 4; k++) {
    const [x, y, w, h] = R['win' + k];
    if (!lit) {
      g.fillStyle = FRAME; g.fillRect(x, y, w, h);
      g.fillStyle = '#2a353c'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 8, y + 8, w - 16, (h - 16) * 0.4);
      const c = [0.35, 0.5, 0.2, 0.7][k];
      g.fillStyle = '#c9cdc9'; g.fillRect(x + 8, y + 8, (w - 16) * c * 0.5, h - 16); g.fillRect(x + w - 8 - (w - 16) * c * 0.5, y + 8, (w - 16) * c * 0.5, h - 16);
      g.fillStyle = FRAME; g.fillRect(x + w / 2 - 2, y + 8, 4, h - 16);
    } else {
      const on = [1, 0.55, 0, 0.85][k];
      g.fillStyle = '#000'; g.fillRect(x, y, w, h);
      if (on) { const gr = g.createRadialGradient(x + w / 2, y + h * 0.35, 4, x + w / 2, y + h / 2, w * 0.7); gr.addColorStop(0, `rgba(255,226,178,${on})`); gr.addColorStop(1, `rgba(255,190,120,${on * 0.6})`); g.fillStyle = gr; g.fillRect(x + 8, y + 8, w - 16, h - 16); }
    }
  }
  { // the rooftop bar's glazing
    const [x, y, w, h] = R.bar;
    if (!lit) { g.fillStyle = FRAME; g.fillRect(x, y, w, h); g.fillStyle = '#26323a'; g.fillRect(x + 4, y + 6, w - 8, h - 10); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 4, y + 6, w - 8, 30); g.fillStyle = FRAME; g.fillRect(x + w / 2 - 2, y, 4, h); }
    else { g.fillStyle = '#000'; g.fillRect(x, y, w, h); g.fillStyle = WARM; g.fillRect(x + 4, y + 6, w - 8, h - 10); g.fillStyle = '#6b4a2a'; g.fillRect(x + w / 2 - 2, y, 4, h); }
  }
  // the Marker's glazed ground floor (3 m x 7.2 m) and the office bases (3.2 m x 8 m / 5.2 m): tall panes on dark frames
  for (const [k, split] of [['grnd', 0.72], ['base', 0.5]]) {
    const [x, y, w, h] = R[k];
    if (!lit) {
      g.fillStyle = FRAME; g.fillRect(x, y, w, h);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#8aa3a6'); gr.addColorStop(0.55, '#51666b'); gr.addColorStop(1, '#2d3a3f');
      g.fillStyle = gr; g.fillRect(x + 3, y + 3, w - 6, h - 6);
      g.fillStyle = 'rgba(210,190,150,0.18)'; g.fillRect(x + 3, y + h * 0.6, w - 6, h * 0.4 - 3); // the warm interior behind
      g.fillStyle = FRAME; g.fillRect(x, y + h * (1 - split) - 3, w, 6); g.fillRect(x + w / 2 - 2, y, 4, h);
    } else {
      g.fillStyle = '#000'; g.fillRect(x, y, w, h);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,215,156,0.75)'); gr.addColorStop(1, 'rgba(255,226,180,0.6)');
      g.fillStyle = gr; g.fillRect(x + 3, y + 3, w - 6, h - 6);
      g.fillStyle = '#3a2a1a'; g.fillRect(x, y + h * (1 - split) - 3, w, 6); g.fillRect(x + w / 2 - 2, y, 4, h);
    }
  }
  { // glazed doors
    const [x, y, w, h] = R.door;
    g.fillStyle = lit ? '#000' : FRAME; g.fillRect(x, y, w, h);
    g.fillStyle = lit ? WARM : '#2c373d'; g.fillRect(x + 8, y + 10, w / 2 - 12, h - 14); g.fillRect(x + w / 2 + 4, y + 10, w / 2 - 12, h - 14);
    if (!lit) { g.fillStyle = '#9aa0a4'; g.fillRect(x + w / 2 - 10, y + h * 0.5, 4, 40); g.fillRect(x + w / 2 + 6, y + h * 0.5, 4, 40); }
  }
  const text = (k, str, bg, fg, font, spacing = 0) => {
    const [x, y, w, h] = R[k];
    g.fillStyle = bg; g.fillRect(x, y, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
    g.fillText(str, x + w / 2, y + h / 2 + 3, w * 0.94);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
  };
  // the theatre's name on the white fascia (refs 08, 13), lit white at night; the hotel's name on its porte-cochere;
  // the office's address on its granite plinth
  text('name', 'BORD GÁIS ENERGY THEATRE', lit ? '#000' : '#e6e9e9', lit ? '#fbfbf6' : '#5d646a', '600 64px "Segoe UI", "Helvetica Neue", Arial, sans-serif', 6);
  text('marker', 'THE MARKER', lit ? '#000' : '#1b1d1f', lit ? '#f4e6c8' : '#e9e6de', '300 58px Georgia, "Times New Roman", serif', 12);
  text('gcsign', '4 GRAND CANAL SQUARE', lit ? '#000' : '#8e8d89', lit ? '#6f6a60' : '#d8dadb', '500 52px "Segoe UI", Arial, sans-serif', 5);
}

let mats = null;
function materials() {
  if (mats) return mats;
  const T = (w, h, fn, lit, rep) => texture(canvas(w, h, (g) => fn(g, lit)), rep);
  const std = (o, vc) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = vc; return m; };
  mats = {
    // reflective glass: mostly what it mirrors, a green-grey tint and the lit floors after dark
    gcs_glass: std({ map: T(512, 1024, paintGlass, false, true), roughness: 0.12, metalness: 0.4, envMapIntensity: 2.0, emissive: 0xffffff, emissiveMap: T(512, 1024, paintGlass, true, true), emissiveIntensity: 0 }, false),
    gcs_lobby: std({ map: T(512, 1024, paintLobby, false, true), roughness: 0.1, metalness: 0.3, envMapIntensity: 1.8, emissive: 0xffffff, emissiveMap: T(512, 1024, paintLobby, true, true), emissiveIntensity: 0 }, false),
    gcs_clad: std({ map: T(512, 512, paintClad, false, true), roughness: 0.42, metalness: 0.18, envMapIntensity: 0.9, emissive: 0xffffff, emissiveMap: T(512, 512, paintClad, true, true), emissiveIntensity: 0 }, true),
    gcs_main: std({ map: T(1024, 1024, paintAtlas, false, false), roughness: 0.72, metalness: 0.02, emissive: 0xffffff, emissiveMap: T(1024, 1024, paintAtlas, true, false), emissiveIntensity: 0 }, true),
  };
  return mats;
}

// Solid at street level whether or not the model loads: the theatre, the Marker, the office blocks, the car park stair
export function gcsColliders() {
  for (const k of ['theatre', 'marker', 'north', 'south', 'one', 'wedge']) addPolyline(GCSQ[k], true);
}

const decoded = new WeakSet();
export async function placeGrandCanal(scene) {
  let gltf;
  try { gltf = await load('gcsquare'); } catch (e) { console.warn('gcsquare model failed to load', e); return null; }
  const M = materials();
  const root = gltf.scene.getObjectByName('gcsquare');
  if (!root) return null;
  root.removeFromParent();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mat = M[o.material.name] || M.gcs_main;
    if (mat.vertexColors) {
      // AO baked in COLOR_0 (sRGB bytes): decode and keep it off black; white where not baked
      if (!o.geometry.attributes.color) o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3));
      const col = o.geometry.attributes.color;
      if (col.normalized && !decoded.has(col)) {
        for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, 0.32 + 0.68 * Math.pow(col.getComponent(i, c), 1 / 2.2));
        decoded.add(col); col.needsUpdate = true;
      }
    }
    o.material = mat;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  root.position.set(GCSQ.origin.x, 0, GCSQ.origin.z);
  root.name = 'Grand Canal Square';
  scene.add(root);
  return {
    root,
    setNight(l) {
      M.gcs_glass.emissiveIntensity = 0.5 * l;
      M.gcs_lobby.emissiveIntensity = 0.8 * l;
      M.gcs_clad.emissiveIntensity = 0.3 * l;
      M.gcs_main.emissiveIntensity = 0.85 * l;
    },
  };
}
