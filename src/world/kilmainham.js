// Kilmainham (docs/research/kilmainham.md): the Blender heroes (tools/blender/build_kilmainham.py ->
// public/models/kilmainham.glb: the Gaol and its Courthouse, the Royal Hospital with its Garden House, the Richmond
// Tower), their textures painted here at load (tiling limestone ashlar, calp rubble, roughcast render, dressings,
// slate, copper, and a 1024 atlas of windows, doors, the serpent door, clocks, arms and railings with a night twin),
// placed from sites.js (KH), each landmark merged into one mesh per material. Also the ground round them: the Royal
// Hospital's formal gardens (gravel walks, box hedges, cone yews, standard hollies, the statue roundel), the lime
// avenues and the meadow trees, the calp boundary wall round the grounds, and the Proclamation figures on their plaza
// across Inchicore Road. After dark the gaol front and the hospital are washed with light (heroes.js uplit), the
// windows glow and the lantern over the gaol door burns. Low / Battery saver paints the textures at half size.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { load, stoneTile, uplit } from './heroes.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { plantTrees } from './trees.js';
import { KERB_H } from './roads.js';
import { addBox, addPolyline } from '../game/collision.js';
import { chunkedInstances } from './chunks.js';
import { world, pointInPolygon, v2 } from './geo.js';

// atlas regions, px in 1024 x 1024 (must match KM_ATLAS in tools/blender/build_kilmainham.py)
export const KM_ATLAS = {
  sash: [0, 0, 64, 128], tallarch: [64, 0, 64, 192], rose: [128, 0, 128, 256], dormer: [256, 0, 64, 64],
  rhkdoor: [320, 0, 64, 128], arcback: [384, 0, 128, 128], clock: [512, 0, 128, 128], sundial: [640, 0, 64, 96],
  arms: [704, 0, 128, 128], belfry: [832, 0, 64, 128], pilaster: [896, 0, 32, 256], capital: [928, 0, 64, 32],
  gaolwin: [0, 256, 64, 128], gaoldoor: [64, 256, 128, 192], gaolarch: [192, 256, 64, 128], cellwin: [256, 256, 64, 64],
  barwin: [320, 256, 64, 96], blindarch: [384, 256, 128, 128], courtwin: [512, 256, 64, 128], courtdoor: [576, 256, 64, 128],
  rtwin: [640, 256, 64, 64], corbel: [704, 256, 256, 64], slit: [960, 256, 32, 96], lantern: [992, 256, 32, 64],
  railing: [0, 448, 256, 64], gate: [256, 448, 128, 128], court: [512, 512, 512, 512], gravel: [0, 576, 128, 128],
  iron: [384, 448, 32, 32], glass: [416, 448, 32, 32], lead: [448, 448, 32, 32], pot: [480, 448, 32, 32],
  brick: [384, 480, 32, 32], yard: [416, 480, 32, 32], flagpole: [448, 480, 32, 32],
  cross: [128, 576, 64, 128], gardenwin: [192, 576, 64, 96], gardendoor: [256, 576, 64, 128], crest: [832, 128, 128, 128],
  sashd: [960, 32, 64, 128],
};

// palette (sRGB), docs/research/kilmainham.md 3.4
const ASH = '#b3b1aa', ASH_J = '#6e6c67', RUB = '#77736c', RENDER = '#a39c8f', DRESS = '#b8b1a3', SLATE = '#565b60';
const COPPER = '#5f9e8b', FRAME = '#ece9e2', GLASS = '#20272c', GLASS_HI = '#3f4d57', IRON = '#1a1b1c', CALP = '#6e6b66';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(c, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = IS_MOBILE ? 4 : 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; else t.flipY = false;
  return t;
}
const archPath = (g, x, y, w, h) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); };
const segPath = (g, x, y, w, h, rise) => { // segmental head
  const r = (w * w / 4 + rise * rise) / (2 * rise), a = Math.asin(w / 2 / r);
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + rise); g.arc(x + w / 2, y + r, r, -Math.PI / 2 - a, -Math.PI / 2 + a); g.lineTo(x + w, y + h); g.closePath();
};

// ---------------- tiling surfaces ----------------
function roughcast(size, base, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size / 6; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? `rgba(60,56,50,${0.12 + r() * 0.15})` : `rgba(235,230,220,${0.1 + r() * 0.14})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  // faint weather streaks
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(70,66,60,${0.03 + r() * 0.04})`; g.fillRect(r() * size, 0, 3 + r() * 10, size); }
  return texture(c, true);
}
function rubbleTile(size, seed) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#a19c92'; g.fillRect(0, 0, size, size);  // lime mortar
  // random rubble, roughly brought to courses: stones of mixed size, some split into two smaller ones, irregular edges
  const stone = (x, y, w, h) => {
    const v = 84 + r() * 52, b = r() < 0.25 ? 10 : 0, j = () => (r() - 0.5) * Math.min(w, h) * 0.25;
    g.fillStyle = `rgb(${v - 3 + b | 0},${v - 5 | 0},${v - 10 - b | 0})`;
    g.beginPath(); g.moveTo(x + 1.5 + j(), y + 1.5 + j()); g.lineTo(x + w - 1.5 + j(), y + 1.5 + j()); g.lineTo(x + w - 1.5 + j(), y + h - 1.5 + j()); g.lineTo(x + 1.5 + j(), y + h - 1.5 + j()); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 3, y + 2.5, w - 6, 1.5);
  };
  let y = 0;
  while (y < size) {
    const h = size * (0.06 + r() * 0.07); let x = -r() * h;
    while (x < size) {
      const w = h * (0.8 + r() * 1.9);
      if (r() < 0.3) { const k = 0.35 + r() * 0.3; stone(x, y, w, h * k); stone(x, y + h * k, w * (0.4 + r() * 0.6), h * (1 - k)); stone(x + w * 0.55, y + h * k, w * 0.45, h * (1 - k)); }
      else stone(x, y, w, h);
      x += w;
    }
    y += h;
  }
  return texture(c, true);
}
function copperTile(size) {
  const c = canvas(size), g = c.getContext('2d'), r = rng(5);
  g.fillStyle = COPPER; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '64,98,86' : '160,196,182'},${0.08 + r() * 0.14})`; g.fillRect(r() * size, 0, 2 + r() * 5, size); }
  g.fillStyle = 'rgba(46,72,62,0.55)'; for (let x = 0; x < size; x += size / 4) g.fillRect(x, 0, 2, size);
  return texture(c, true);
}

// ---------------- the atlas ----------------
function paintAtlas(g, lit) {
  const R = KM_ATLAS, r = rng(lit ? 3 : 7);
  g.clearRect(0, 0, 1024, 1024);
  const reg = (k) => R[k];
  const fill = (k, col) => { const [x, y, w, h] = reg(k); g.fillStyle = col; g.fillRect(x, y, w, h); };
  const courses = (x, y, w, h, n, base, joint) => {
    g.fillStyle = base; g.fillRect(x, y, w, h);
    const ch = h / n;
    for (let k = 0; k < n; k++) {
      g.fillStyle = joint; g.fillRect(x, y + k * ch, w, 1.5);
      const off = (k % 2) * ch * 0.9;
      for (let s = -off; s < w; s += ch * 1.8) g.fillRect(x + s, y + k * ch, 1.5, ch);
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.05})`; g.fillRect(x, y + k * ch + 1.5, w, ch - 1.5);
    }
  };
  const glass = (x, y, w, h) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, GLASS_HI); gr.addColorStop(0.5, GLASS); gr.addColorStop(1, '#161b1f'); return gr; };
  const warm = (a) => `rgba(255,${214 + r() * 20 | 0},${150 + r() * 30 | 0},${a})`;
  const DARK = '#000';
  // everything opaque is black on the night map unless it glows
  if (lit) { g.fillStyle = DARK; g.fillRect(0, 0, 1024, 1024); }

  // --- sash (6 over 6): white frames, dark glass; 'sash' is lit after dark, 'sashd' (the same by day) stays dark
  for (const k of ['sash', 'sashd']) { const [x, y, w, h] = reg(k);
    if (!lit) { g.fillStyle = FRAME; g.fillRect(x + 4, y + 4, w - 8, h - 8); g.fillStyle = glass(x, y, w, h); g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.fillStyle = FRAME; g.fillRect(x + 8, y + h / 2 - 2, w - 16, 4); for (const f of [1 / 3, 2 / 3]) g.fillRect(x + 8 + (w - 16) * f - 1, y + 8, 2.5, h - 16); for (const f of [0.25, 0.75]) g.fillRect(x + 8, y + 8 + (h - 16) * f - 1, w - 16, 2);
      g.fillStyle = '#d8d3c6'; g.fillRect(x, y + h - 6, w, 6); }
    else if (k === 'sash') { g.fillStyle = warm(0.75); g.fillRect(x + 8, y + 8, w - 16, h - 16); g.fillStyle = DARK; g.fillRect(x + 8, y + h / 2 - 2, w - 16, 4); } }
  // --- tall round-headed window (the Great Hall, the Chapel)
  { const [x, y, w, h] = reg('tallarch');
    if (!lit) { g.fillStyle = DRESS; archPath(g, x + 2, y + 2, w - 4, h - 4); g.fill(); g.fillStyle = glass(x, y, w, h); archPath(g, x + 8, y + 8, w - 16, h - 14); g.fill();
      g.strokeStyle = FRAME; g.lineWidth = 2; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(x + 8 + (w - 16) * k / 3, y + 30); g.lineTo(x + 8 + (w - 16) * k / 3, y + h - 8); g.stroke(); }
      for (let yy = y + 36; yy < y + h - 10; yy += 16) { g.beginPath(); g.moveTo(x + 8, yy); g.lineTo(x + w - 8, yy); g.stroke(); }
      g.beginPath(); g.arc(x + w / 2, y + w / 2 + 4, (w - 16) / 2 * 0.55, Math.PI, 0); g.stroke(); }
    else { g.fillStyle = warm(0.55); archPath(g, x + 8, y + 8, w - 16, h - 14); g.fill(); } }
  // --- the chapel's great east window: round-headed, rose tracery in the head, mullions below
  { const [x, y, w, h] = reg('rose');
    if (!lit) { g.fillStyle = DRESS; archPath(g, x + 2, y + 2, w - 4, h - 4); g.fill(); g.fillStyle = glass(x, y, w, h); archPath(g, x + 10, y + 10, w - 20, h - 14); g.fill();
      g.strokeStyle = DRESS; g.lineWidth = 4; const cx = x + w / 2, cy = y + w / 2 + 6, rr = w / 2 - 16;
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, rr * 0.35, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * rr * 0.35, cy + Math.sin(a) * rr * 0.35); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); g.stroke(); }
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 10 + (w - 20) * k / 4, cy + rr); g.lineTo(x + 10 + (w - 20) * k / 4, y + h - 8); g.stroke(); }
      g.lineWidth = 2; for (let yy = cy + rr + 20; yy < y + h - 8; yy += 20) { g.beginPath(); g.moveTo(x + 10, yy); g.lineTo(x + w - 10, yy); g.stroke(); } }
    else { g.fillStyle = warm(0.4); archPath(g, x + 10, y + 10, w - 20, h - 14); g.fill(); } }
  // --- dormer: a small sash in a white frame on a lead-grey cheek
  { const [x, y, w, h] = reg('dormer');
    if (!lit) { g.fillStyle = '#6b6f73'; g.fillRect(x, y, w, h); g.fillStyle = FRAME; g.fillRect(x + 8, y + 6, w - 16, h - 10); g.fillStyle = glass(x, y, w, h); g.fillRect(x + 12, y + 10, w - 24, h - 18);
      g.fillStyle = FRAME; g.fillRect(x + 12, y + h / 2, w - 24, 3); g.fillRect(x + w / 2 - 1, y + 10, 2, h - 18); }
    else if (r() < 1) { g.fillStyle = warm(0.35); g.fillRect(x + 12, y + 10, w - 24, h - 18); } }
  // --- the hospital's doorcase: dressed surround, a segmental pediment, a round-headed grey door
  { const [x, y, w, h] = reg('rhkdoor');
    if (!lit) { g.fillStyle = DRESS; g.fillRect(x + 2, y + 18, w - 4, h - 18); g.beginPath(); g.moveTo(x, y + 22); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y + 22); g.fill();
      g.fillStyle = '#8f8a80'; g.fillRect(x, y + 20, w, 4);
      g.fillStyle = '#7d8286'; archPath(g, x + 12, y + 30, w - 24, h - 30); g.fill(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + w / 2 - 1, y + 50, 2, h - 50); }
    else { g.fillStyle = warm(0.25); archPath(g, x + 12, y + 30, w - 24, 28); g.fill(); } }
  // --- the arcade walks' back wall: in shadow, a door and a window
  { const [x, y, w, h] = reg('arcback');
    if (!lit) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3b3935'); gr.addColorStop(1, '#58544d'); g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = '#2a2826'; g.fillRect(x + w * 0.3, y + h * 0.35, w * 0.4, h * 0.65); g.fillStyle = 'rgba(200,196,186,0.25)'; g.fillRect(x + w * 0.33, y + h * 0.4, w * 0.34, h * 0.2); }
    else { g.fillStyle = 'rgba(255,200,140,0.16)'; g.fillRect(x, y, w, h); } }
  // --- clock: black dial, gilt ring and numerals, on the copper stage (ref 21)
  { const [x, y, w, h] = reg('clock'); const cx = x + w / 2, cy = y + h / 2, rr = w / 2 - 6;
    if (!lit) { g.fillStyle = COPPER; g.fillRect(x, y, w, h); g.fillStyle = '#b89a4a'; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill(); g.fillStyle = '#121416'; g.beginPath(); g.arc(cx, cy, rr - 5, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = 'rgba(255,236,190,0.35)'; g.beginPath(); g.arc(cx, cy, rr - 5, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = lit ? DARK : '#d6b25a'; g.lineWidth = 4;
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * (rr - 20), cy + Math.sin(a) * (rr - 20)); g.lineTo(cx + Math.cos(a) * (rr - 9), cy + Math.sin(a) * (rr - 9)); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 18, cy - 30); g.moveTo(cx, cy); g.lineTo(cx - 30, cy + 6); g.stroke(); }
  // --- sundial in the courtyard pediment (ref 30)
  { const [x, y, w, h] = reg('sundial');
    if (!lit) { g.fillStyle = '#d7d0c0'; g.fillRect(x, y, w, h); g.strokeStyle = '#6e685c'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
      for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(x + w / 2, y + 14); g.lineTo(x + w / 2 + k * 8, y + h - 8); g.stroke(); }
      g.fillStyle = '#8a3b28'; g.fillRect(x + w / 2 - 2, y + 12, 4, 30); } }
  // --- carved arms (on stone)
  const armsPaint = (x, y, w, h, bg) => {
    if (bg) { g.fillStyle = bg; g.fillRect(x, y, w, h); }
    g.fillStyle = '#8e8a82'; g.beginPath(); g.moveTo(x + w * 0.3, y + h * 0.25); g.lineTo(x + w * 0.7, y + h * 0.25); g.lineTo(x + w * 0.7, y + h * 0.62); g.quadraticCurveTo(x + w / 2, y + h * 0.92, x + w * 0.3, y + h * 0.62); g.closePath(); g.fill();
    g.fillStyle = '#a7a298'; g.beginPath(); g.arc(x + w / 2, y + h * 0.17, w * 0.13, 0, Math.PI * 2); g.fill();  // crown
    g.fillStyle = '#7a766e'; g.fillRect(x + w * 0.1, y + h * 0.3, w * 0.18, h * 0.5); g.fillRect(x + w * 0.72, y + h * 0.3, w * 0.18, h * 0.5); // supporters
    g.strokeStyle = '#6a665e'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w / 2, y + h * 0.27); g.lineTo(x + w / 2, y + h * 0.75); g.moveTo(x + w * 0.32, y + h * 0.45); g.lineTo(x + w * 0.68, y + h * 0.45); g.stroke();
  };
  if (!lit) { const [x, y, w, h] = reg('arms'); armsPaint(x, y, w, h, DRESS); }
  if (!lit) { const [x, y, w, h] = reg('crest'); g.clearRect(x, y, w, h); armsPaint(x, y, w, h, null); }
  // --- belfry: a round-headed louvred opening in a limestone surround on calp
  { const [x, y, w, h] = reg('belfry');
    if (!lit) { g.fillStyle = CALP; g.fillRect(x, y, w, h); g.fillStyle = DRESS; archPath(g, x + 6, y + 4, w - 12, h - 8); g.fill(); g.fillStyle = '#2a2b2c'; archPath(g, x + 12, y + 10, w - 24, h - 18); g.fill();
      g.fillStyle = '#c9c6bf'; for (let yy = y + 40; yy < y + h - 12; yy += 7) g.fillRect(x + 12, yy, w - 24, 3); } }
  { const [x, y, w, h] = reg('capital'); if (!lit) { g.fillStyle = DRESS; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(80,76,68,0.5)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + 8 + k * 12, y + h * 0.7, 5, Math.PI, 0); g.fill(); } g.fillStyle = '#d8d2c4'; g.fillRect(x, y, w, 5); } }

  // --- the gaol: the upper recess (a barred round-headed window over the balconette)
  { const [x, y, w, h] = reg('gaolwin');
    if (!lit) { courses(x, y, w, h, 12, '#8e8c86', ASH_J); g.fillStyle = '#5f5e5a'; archPath(g, x + 12, y + 10, w - 24, h * 0.62); g.fill(); g.fillStyle = glass(x, y, w, h); archPath(g, x + 16, y + 14, w - 32, h * 0.58); g.fill();
      g.fillStyle = IRON; for (let k = 1; k < 5; k++) g.fillRect(x + 16 + (w - 32) * k / 5 - 1, y + 20, 2.5, h * 0.52); g.fillRect(x + 16, y + 14 + h * 0.3, w - 32, 2.5); }
    else { g.fillStyle = 'rgba(255,190,120,0.12)'; archPath(g, x + 16, y + 14, w - 32, h * 0.58); g.fill(); } }
  // --- the door: the vermiculated arch, the chained serpents in the tympanum, the gated doorway (ref 03)
  { const [x, y, w, h] = reg('gaoldoor');
    if (!lit) {
      g.fillStyle = '#8c8a84'; g.fillRect(x, y, w, h);
      g.fillStyle = '#a3a097'; archPath(g, x + 4, y + 4, w - 8, h - 4); g.fill();
      // vermiculation: worm-like grooves over the surround
      g.strokeStyle = 'rgba(70,68,62,0.75)'; g.lineWidth = 1.6;
      for (let i = 0; i < 260; i++) { const px = x + 6 + r() * (w - 12), py = y + 6 + r() * (h - 8); g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + (r() - 0.5) * 10, py + (r() - 0.5) * 10, px + (r() - 0.5) * 12, py + (r() - 0.5) * 12); g.stroke(); }
      // the tympanum with the serpents
      const tx = x + 26, ty = y + 26, tw = w - 52;
      g.fillStyle = '#5d5b55'; archPath(g, tx, ty, tw, tw / 2 + 6); g.fill();
      g.strokeStyle = '#8f9086'; g.lineWidth = 5; g.lineCap = 'round';
      for (let k = 0; k < 5; k++) { const cy = ty + tw * 0.3 + k * 3; g.beginPath(); g.moveTo(tx + 8, cy + 8); g.bezierCurveTo(tx + tw * 0.3, cy - 18 + k * 4, tx + tw * 0.55, cy + 24 - k * 5, tx + tw - 8, cy - 2 + k * 2); g.stroke(); }
      g.strokeStyle = '#42413d'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(tx + tw * 0.2 + k * tw * 0.12, ty + tw * 0.34, 3, 0, Math.PI * 2); g.stroke(); } // the chain
      g.lineCap = 'butt';
      // the doorway and its iron gate
      const dy = ty + tw / 2 + 10;
      g.fillStyle = '#111214'; g.fillRect(tx + 6, dy, tw - 12, y + h - dy);
      g.fillStyle = '#2d2a26'; g.fillRect(tx + 14, dy + 16, tw - 28, y + h - dy - 16);
      g.fillStyle = IRON; for (let k = 0; k <= 8; k++) g.fillRect(tx + 6 + (tw - 12) * k / 8 - 1, dy, 2.5, y + h - dy); g.fillRect(tx + 6, dy + 30, tw - 12, 3);
    } else { g.fillStyle = 'rgba(255,190,120,0.35)'; const tx = x + 26, tw = w - 52; g.fillRect(tx + 14, y + 26 + tw / 2 + 26, tw - 28, h - tw / 2 - 52); } }
  // --- the gaol's blind ground-floor arches: a dark recess with a barred lunette
  { const [x, y, w, h] = reg('gaolarch');
    if (!lit) { courses(x, y, w, h, 10, '#85837d', ASH_J); g.fillStyle = '#3e3d3a'; archPath(g, x + 8, y + 8, w - 16, h - 8); g.fill(); g.fillStyle = glass(x, y, w, h); archPath(g, x + 12, y + 12, w - 24, (w - 24) / 2 + 6); g.fill();
      g.fillStyle = IRON; for (let k = 1; k < 4; k++) g.fillRect(x + 12 + (w - 24) * k / 4 - 1, y + 14, 2, (w - 24) / 2 + 4); } }
  // --- a cell window: small, segmental, barred, in a lighter surround (refs 04, 07)
  { const [x, y, w, h] = reg('cellwin');
    if (!lit) { g.fillStyle = RUB; g.fillRect(x, y, w, h); g.fillStyle = '#b3aea4'; segPath(g, x + 6, y + 6, w - 12, h - 10, 10); g.fill(); g.fillStyle = '#1e2124'; segPath(g, x + 12, y + 14, w - 24, h - 22, 6); g.fill();
      g.fillStyle = '#4a4a48'; for (let k = 1; k < 4; k++) g.fillRect(x + 12 + (w - 24) * k / 4 - 1, y + 14, 2, h - 22); } }
  { const [x, y, w, h] = reg('barwin');
    if (!lit) { courses(x, y, w, h, 8, '#8f8d87', ASH_J); g.fillStyle = '#b2aea5'; g.fillRect(x + 8, y + 8, w - 16, h - 14); g.fillStyle = glass(x, y, w, h); g.fillRect(x + 14, y + 14, w - 28, h - 26);
      g.fillStyle = IRON; for (let k = 1; k < 5; k++) g.fillRect(x + 14 + (w - 28) * k / 5 - 1, y + 14, 2.5, h - 26); for (const f of [0.33, 0.66]) g.fillRect(x + 14, y + 14 + (h - 26) * f, w - 28, 2.5); } }
  { const [x, y, w, h] = reg('blindarch');
    if (!lit) { courses(x, y, w, h, 10, '#8f8d87', ASH_J); g.strokeStyle = 'rgba(40,40,38,0.6)'; g.lineWidth = 5; archPath(g, x + 10, y + 8, w - 20, h - 8); g.stroke(); g.fillStyle = 'rgba(40,40,38,0.18)'; archPath(g, x + 14, y + 12, w - 28, h - 12); g.fill(); } }
  // --- the courthouse: round-headed windows with glazing bars, the black door
  { const [x, y, w, h] = reg('courtwin');
    if (!lit) { g.fillStyle = '#b6b1a6'; archPath(g, x + 2, y + 2, w - 4, h - 4); g.fill(); g.fillStyle = glass(x, y, w, h); archPath(g, x + 8, y + 8, w - 16, h - 12); g.fill();
      g.strokeStyle = FRAME; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, y + 10); g.lineTo(x + w / 2, y + h - 6); g.stroke(); for (let yy = y + 34; yy < y + h - 8; yy += 18) { g.beginPath(); g.moveTo(x + 8, yy); g.lineTo(x + w - 8, yy); g.stroke(); }
      for (let k = 1; k < 4; k++) { const a = Math.PI + k * Math.PI / 4; g.beginPath(); g.moveTo(x + w / 2, y + w / 2 + 4); g.lineTo(x + w / 2 + Math.cos(a) * 24, y + w / 2 + 4 + Math.sin(a) * 24); g.stroke(); } }
    else { g.fillStyle = warm(0.3); archPath(g, x + 8, y + 8, w - 16, h - 12); g.fill(); } }
  { const [x, y, w, h] = reg('courtdoor');
    if (!lit) { g.fillStyle = '#9e9a90'; g.fillRect(x, y, w, h); g.fillStyle = '#141414'; g.fillRect(x + 8, y + 18, w - 16, h - 18); g.fillStyle = '#e9e4d8'; g.fillRect(x + 12, y + 8, w - 24, 8); }
    else { g.fillStyle = warm(0.5); g.fillRect(x + 8, y + 18, w - 16, h - 18); } }
  // --- the Richmond Tower: a small Gothic window, the corbel table, arrow slits
  { const [x, y, w, h] = reg('rtwin');
    if (!lit) { g.fillStyle = '#8a867e'; g.fillRect(x, y, w, h); g.fillStyle = '#c8c3b8'; g.fillRect(x + 6, y + 10, w - 12, h - 18); g.fillStyle = GLASS; g.fillRect(x + 10, y + 14, w - 20, h - 26); g.fillStyle = '#c8c3b8'; for (const f of [1 / 3, 2 / 3]) g.fillRect(x + 10 + (w - 20) * f - 1.5, y + 14, 3, h - 26); } }
  { const [x, y, w, h] = reg('corbel');
    if (!lit) { g.fillStyle = '#8a867e'; g.fillRect(x, y, w, h); const n = 8;
      for (let k = 0; k < n; k++) { const bx = x + k * w / n; g.fillStyle = 'rgba(30,30,28,0.55)'; g.beginPath(); g.moveTo(bx + 4, y + h - 8); g.lineTo(bx + 4, y + h * 0.45); g.quadraticCurveTo(bx + w / n / 2, y + 4, bx + w / n - 4, y + h * 0.45); g.lineTo(bx + w / n - 4, y + h - 8); g.fill();
        g.fillStyle = '#a19c92'; g.fillRect(bx + w / n - 5, y + h * 0.4, 5, h * 0.6); } } }
  { const [x, y, w, h] = reg('slit'); if (!lit) { g.fillStyle = '#8a867e'; g.fillRect(x, y, w, h); g.fillStyle = '#1b1c1d'; g.fillRect(x + w / 2 - 4, y + 6, 8, h - 12); g.fillRect(x + 6, y + h / 2 - 3, w - 12, 6); } }
  fill('lantern', lit ? '#ffd9a0' : '#e8dcb8');
  // --- railings and a gate (alpha): black bars with spear heads on nothing
  if (!lit) {
    { const [x, y, w, h] = reg('railing'); g.clearRect(x, y, w, h); g.fillStyle = IRON; g.fillRect(x, y + 6, w, 3); g.fillRect(x, y + h - 10, w, 3);
      for (let bx = x + 2; bx < x + w; bx += 8) { g.fillRect(bx, y + 4, 2.5, h - 4); g.beginPath(); g.moveTo(bx - 1.5, y + 5); g.lineTo(bx + 1.25, y); g.lineTo(bx + 4, y + 5); g.fill(); } }
    { const [x, y, w, h] = reg('gate'); g.clearRect(x, y, w, h); g.fillStyle = IRON; g.fillRect(x, y + 10, w, 4); g.fillRect(x, y + h / 2, w, 4); g.fillRect(x, y + h - 6, w, 6); g.fillRect(x, y, 5, h); g.fillRect(x + w - 5, y, 5, h);
      for (let bx = x + 10; bx < x + w - 6; bx += 9) { g.fillRect(bx, y + 4, 3, h - 4); g.beginPath(); g.moveTo(bx - 2, y + 6); g.lineTo(bx + 1.5, y); g.lineTo(bx + 5, y + 6); g.fill(); }
      g.strokeStyle = IRON; g.lineWidth = 3; g.beginPath(); g.arc(x + w / 2, y + h * 0.32, 14, 0, Math.PI * 2); g.stroke(); }
  }
  // --- the hospital's courtyard: cobbles, a flagged cross and a circle (ref 24)
  { const [x, y, w, h] = reg('court');
    if (!lit) {
      g.fillStyle = '#7d776d'; g.fillRect(x, y, w, h);
      for (let yy = y; yy < y + h; yy += 5) for (let xx = x + ((yy / 5) % 2) * 2.5; xx < x + w; xx += 5) { const v = 100 + r() * 50; g.fillStyle = `rgb(${v | 0},${v - 5 | 0},${v - 12 | 0})`; g.fillRect(xx + 0.6, yy + 0.6, 4, 4); }
      g.fillStyle = '#b8b3aa'; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * 0.3, h * 0.3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c4bfb5'; g.fillRect(x + w / 2 - w * 0.06, y, w * 0.12, h); g.fillRect(x, y + h / 2 - h * 0.05, w, h * 0.1);
      g.strokeStyle = 'rgba(90,86,80,0.35)'; g.lineWidth = 1;
      for (let k = 0; k < 40; k++) { g.beginPath(); g.moveTo(x + w / 2 - w * 0.06, y + k * h / 40); g.lineTo(x + w / 2 + w * 0.06, y + k * h / 40); g.stroke(); }
    } }
  { const [x, y, w, h] = reg('gravel');
    if (!lit) { g.fillStyle = '#8f897e'; g.fillRect(x, y, w, h); for (let i = 0; i < 1600; i++) { const v = 110 + r() * 60; g.fillStyle = `rgba(${v | 0},${v - 4 | 0},${v - 12 | 0},0.7)`; g.fillRect(x + r() * w, y + r() * h, 1.5, 1.5); } } }
  if (!lit) {
    fill('iron', IRON); fill('glass', '#8fa2ab'); fill('lead', '#6d7176'); fill('pot', '#a8573a'); fill('brick', '#b2926a'); fill('yard', '#9a958c'); fill('flagpole', '#d8d8d4');
    { const [x, y, w, h] = reg('cross'); g.fillStyle = RUB; g.fillRect(x, y, w, h); g.fillStyle = '#111'; g.fillRect(x + w / 2 - 4, y + 10, 8, h - 10); g.fillRect(x + 12, y + 34, w - 24, 8); }
  } else { fill('glass', '#ffe2b0'); }
  // --- the Garden House
  { const [x, y, w, h] = reg('gardenwin');
    if (!lit) { g.fillStyle = DRESS; g.fillRect(x + 4, y + 4, w - 8, h - 8); g.fillStyle = glass(x, y, w, h); g.fillRect(x + 10, y + 10, w - 20, h - 20); g.fillStyle = FRAME; g.fillRect(x + 10, y + h / 2, w - 20, 3); g.fillRect(x + w / 2 - 1, y + 10, 2, h - 20); } }
  { const [x, y, w, h] = reg('gardendoor');
    if (!lit) { g.fillStyle = DRESS; archPath(g, x + 2, y + 2, w - 4, h - 2); g.fill(); g.fillStyle = '#3d4a3f'; archPath(g, x + 10, y + 10, w - 20, h - 10); g.fill(); } }
}

let mats = null;
function materials() {
  if (mats) return mats;
  const S = LITE ? 512 : 1024;
  const paint = (lit) => { const c = canvas(S); const g = c.getContext('2d'); g.scale(S / 1024, S / 1024); paintAtlas(g, lit); return texture(c); };
  const atlas = paint(false), atlasN = paint(true);
  const T = LITE ? 128 : 256;
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = true; return m; }; // AO baked into COLOR_0
  mats = {
    ashlar: uplit(std({ map: stoneTile(T, ASH, 6, 0.16, 'rgba(84,82,76,0.3)', 0.16), roughness: 0.86 }), 15),
    rubble: uplit(std({ map: rubbleTile(T, 17), roughness: 0.93 }), 9),
    render: uplit(std({ map: roughcast(T, RENDER, 9), roughness: 0.92 }), 12),
    dress: uplit(std({ map: stoneTile(T, DRESS, 5, 0.12, 'rgba(116,110,100,0.35)', 0.12), roughness: 0.8 }), 12),
    slate: std({ map: stoneTile(T / 2, SLATE, 16, 0.05, 'rgba(28,32,34,0.55)', 0.3), roughness: 0.68 }),
    copper: std({ map: copperTile(T / 2), roughness: 0.62, metalness: 0.12 }),
    atlas: std({ map: atlas, roughness: 0.62, emissive: 0xffffff, emissiveMap: atlasN, emissiveIntensity: 0 }),
    // railings, gates, the crest, and the yard and courtyard floors (pulled forward past the grounds' grass, which roads.js
    // grassMat pulls forward itself)
    cut: std({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
  };
  return mats;
}

const decoded = new WeakSet();
function prepare(root) {
  const M = materials();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    if (!g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    const col = g.attributes.color;
    if (col.normalized && !decoded.has(col)) { // the baked AO: sRGB bytes read as linear; decode and keep a floor
      for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, 0.4 + 0.6 * Math.pow(col.getComponent(i, c), 1 / 2.2));
      decoded.add(col);
    }
    const k = o.material.name.replace(/^km_/, '');
    o.material = M[k] || M.ashlar;
  });
}

// one mesh per material for a placed group (keeps the AO colours)
function mergeGroup(group, name) {
  group.updateMatrixWorld(true);
  const by = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (g.attributes.color && g.attributes.color.normalized) {
      const c = g.attributes.color, f = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) for (let j = 0; j < 3; j++) f[i * 3 + j] = c.getComponent(i, j);
      g.setAttribute('color', new THREE.BufferAttribute(f, 3));
    } else if (g.attributes.color && g.attributes.color.itemSize === 4) {
      const c = g.attributes.color, f = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) for (let j = 0; j < 3; j++) f[i * 3 + j] = c.getComponent(i, j);
      g.setAttribute('color', new THREE.BufferAttribute(f, 3));
    }
    g.applyMatrix4(o.matrixWorld);
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material).push(g);
  });
  const out = new THREE.Group(); out.name = name;
  const M = materials();
  for (const [mat, geos] of by) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = mat !== M.cut && mat !== M.atlas;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    out.add(mesh);
  }
  return out;
}

// ---------------- ground dressing: the gardens, the avenues, the wall ----------------
function gardenDressing(scene, KH) {
  const { rhkAt, garden } = KH;
  const M = materials();
  const walks = [], hedges = [], cones = [], hollies = [];
  const G = garden, y = KERB_H + 0.012;
  // a flat quad in the hospital's frame (u0..u1 x v0..v1) at height y
  const flatQuad = (u0, u1, v0, v1) => {
    let p = [rhkAt(u0, v0), rhkAt(u1, v0), rhkAt(u1, v1), rhkAt(u0, v1)];
    // wind it so it faces up (+y): the signed area in x-z decides
    const area = p.reduce((s, q, i) => { const r2 = p[(i + 1) % 4]; return s + q.x * r2.z - r2.x * q.z; }, 0);
    if (area > 0) p = p.reverse();
    const tri = [p[0], p[1], p[2], p[0], p[2], p[3]];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flatMap((q) => [q.x, y, q.z]), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(tri.flatMap((q) => [q.x / 4, q.z / 4]), 2));
    walks.push(g);
  };
  const u0 = G.u0, u1 = G.u1, v0 = G.v0, v1 = G.v1, W = 2.6;
  // the perimeter walk, the central axis and three cross walks
  flatQuad(u0, u1, v0, v0 + W); flatQuad(u0, u1, v1 - W, v1); flatQuad(u0, u0 + W, v0, v1); flatQuad(u1 - W, u1, v0, v1);
  flatQuad(-W / 2 - 0.3, W / 2 + 0.3, v0, v1);
  const cross = [v0 + (v1 - v0) * 0.28, v0 + (v1 - v0) * 0.5, v0 + (v1 - v0) * 0.72];
  for (const c of cross) flatQuad(u0, u1, c - W / 2, c + W / 2);
  // the roundel in the middle: a gravel circle with the statue
  { const c = rhkAt(0, cross[1]); const g = new THREE.CircleGeometry(5.2, 24).toNonIndexed(); g.rotateX(-Math.PI / 2); g.translate(c.x, y + 0.002, c.z); g.deleteAttribute('normal'); walks.push(g); }
  // the beds: box hedges round each lawn, cone yews at the corners, hollies along the walks
  const bedsU = [[u0 + W, -W / 2 - 0.3], [W / 2 + 0.3, u1 - W]];
  const bedsV = [[v0 + W, cross[0] - W / 2], [cross[0] + W / 2, cross[1] - W / 2], [cross[1] + W / 2, cross[2] - W / 2], [cross[2] + W / 2, v1 - W]];
  for (const [a, b] of bedsU) for (const [c, d] of bedsV) {
    const m = 0.5, A = a + m, B = b - m, C = c + m, D = d - m;
    for (const [p, q] of [[[A, C], [B, C]], [[B, C], [B, D]], [[B, D], [A, D]], [[A, D], [A, C]]]) {
      const P = rhkAt(...p), Q = rhkAt(...q), L = v2.len(v2.sub(Q, P));
      // leave a gap in the middle of the long sides (the way into the bed)
      hedges.push({ ...v2.lerp(P, Q, 0.5), rot: Math.atan2(Q.x - P.x, Q.z - P.z), s: new THREE.Vector3(0.55, 0.62, L) });
    }
    for (const [p, q] of [[A, C], [B, C], [B, D], [A, D]]) cones.push({ ...rhkAt(p, q), s: 0.9 + ((p * 7 + q * 3) % 3) * 0.08 });
    const mu = (A + B) / 2, mv = (C + D) / 2;
    cones.push({ ...rhkAt(mu, mv), s: 1.25 });
  }
  for (const c of cross) for (const u of [u0 + W + 2, -W - 2, W + 2, u1 - W - 2]) hollies.push({ ...rhkAt(u, c + W / 2 + 0.9) }, { ...rhkAt(u, c - W / 2 - 0.9) });
  for (let v = v0 + 8; v < v1 - 4; v += 9) for (const u of [-W / 2 - 1.2, W / 2 + 1.2]) hollies.push({ ...rhkAt(u, v) });
  // over the grounds' grass, which is itself pulled forward (roads.js grassMat): pull harder
  const gravel = new THREE.MeshStandardMaterial({ color: 0xc2b79d, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const walkMesh = new THREE.Mesh(mergeGeometries(walks.map((g) => { g.computeVertexNormals(); return g; })), gravel);
  walkMesh.receiveShadow = true; walkMesh.matrixAutoUpdate = false; walkMesh.updateMatrix();
  scene.add(walkMesh);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f4a26, roughness: 0.9 });
  const hedgeGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(0.62, 2.4, 8).translate(0, 1.2 + 0.15, 0);
  const hollyGeo = mergeGeometries([new THREE.CylinderGeometry(0.06, 0.08, 1.4, 5).translate(0, 0.7, 0).toNonIndexed(), new THREE.IcosahedronGeometry(0.55, 0).translate(0, 1.75, 0)]);
  const Y = KERB_H;
  scene.add(chunkedInstances(hedgeGeo, leaf, hedges, { shadow: true, y: Y }));
  scene.add(chunkedInstances(coneGeo, leaf, cones, { shadow: true, y: Y }));
  scene.add(chunkedInstances(hollyGeo, new THREE.MeshStandardMaterial({ color: 0x3c5a2e, roughness: 0.85, flatShading: true }), hollies, { shadow: true, y: Y }));
  // the statue on the roundel: a pedestal and a pale figure
  const c = rhkAt(0, cross[1]);
  const statue = new THREE.Group();
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4).translate(0, 0.8, 0), M.dress); ped.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(ped.geometry.attributes.position.count * 3).fill(1), 3));
  const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.9, 7).translate(0, 2.55, 0), new THREE.MeshStandardMaterial({ color: 0xd8d4ca, roughness: 0.6 }));
  statue.add(ped, fig); statue.position.set(c.x, Y, c.z); ped.castShadow = fig.castShadow = true;
  scene.add(statue);
  addBox(c.x, c.z, 0.8, 0.8, 0);
  return { cones: cones.length, hedges: hedges.length, hollies: hollies.length };
}

// the calp boundary wall round the Royal Hospital's grounds: the back of the footpath of every road that borders them,
// clipped to the grounds, with gaps at the gates
function boundaryWall(scene, KH) {
  const green = world.greens.find((g) => g.name === 'Royal Hospital Kilmainham');
  if (!green) return 0;
  const M = materials();
  const gates = KH.gates;
  const H = 2.8, T = 0.55;
  const geos = [];
  const quad = (a, b, c, d, n) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
    const along = (p) => (p.x + p.z) / 3;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((p) => [n === 'top' ? p.x / 3 : along(p), n === 'top' ? p.z / 3 : p.y / 3]), 2));
    // a little darker at the foot (a cheap stand-in for the baked AO the heroes have)
    g.setAttribute('color', new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((p) => { const k = p.y < 0.01 ? 0.72 : 1; return [k, k, k]; }), 3));
    g.computeVertexNormals();
    geos.push(g);
  };
  let n = 0;
  const seen = new Set();
  for (const way of world.ways) {
    if (way.bridge || way.name === 'Royal Hospital Kilmainham' || way.name === 'Irwin Street') continue;
    for (const side of [1, -1]) {
      const off = side * (way.width / 2 + way.pave + 0.35 + T / 2);
      for (let i = 0; i + 1 < way.pts.length; i++) {
        const a = way.pts[i], b = way.pts[i + 1], L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a)), nrm = { x: d.z, z: -d.x };
        let run = null;
        const flush = () => { if (run && run.length > 1) { walls(run); } run = null; };
        const walls = (pts) => {
          for (let k = 0; k + 1 < pts.length; k++) {
            const p = pts[k], q = pts[k + 1], e = v2.norm(v2.sub(q, p)), m = { x: -e.z * T / 2, z: e.x * T / 2 };
            const P = (o, s, yy) => ({ x: o.x + m.x * s, y: yy, z: o.z + m.z * s });
            quad(P(p, 1, 0), P(q, 1, 0), P(q, 1, H), P(p, 1, H)); quad(P(q, -1, 0), P(p, -1, 0), P(p, -1, H), P(q, -1, H));
            quad(P(p, -1, H), P(p, 1, H), P(q, 1, H), P(q, -1, H), 'top');
            addBox((p.x + q.x) / 2, (p.z + q.z) / 2, v2.len(v2.sub(q, p)) / 2, T / 2, Math.atan2(-e.z, e.x));
            n++;
          }
        };
        for (let s = 0; s <= L; s += 2) {
          const c = { x: a.x + d.x * s + nrm.x * off, z: a.z + d.z * s + nrm.z * off };
          const key = `${Math.round(c.x)},${Math.round(c.z)}`;
          const inside = pointInPolygon(c, green.poly) && !seen.has(key);
          const r = world.nearestRoad(c.x, c.z);
          const clear = !r || r.edgeDist > r.way.pave + 0.2;
          const nearGate = gates.some((gp) => Math.hypot(gp.x - c.x, gp.z - c.z) < gp.r);
          const inBuilding = KH.solids.some((o) => { const cc = Math.cos(o.rot), ss = Math.sin(o.rot), dx = c.x - o.x, dz = c.z - o.z; return Math.abs(dx * cc - dz * ss) < o.w / 2 + 1 && Math.abs(dx * ss + dz * cc) < o.d / 2 + 1; });
          if (inside && clear && !nearGate && !inBuilding) { seen.add(key); (run ||= []).push(c); } else flush();
        }
        flush();
      }
    }
  }
  if (!geos.length) return 0;
  const mesh = new THREE.Mesh(mergeGeometries(geos), M.rubble);
  mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  return n;
}

// trees: lime rows along both drives (clipped, like ref 29), specimen trees on the meadow, planes along the gaol plaza
function plantKilmainham(scene, KH) {
  const items = [];
  const green = world.greens.find((g) => g.name === 'Royal Hospital Kilmainham');
  const r = rng(1684);
  const onAvenue = (a, b, step, off) => {
    const A = world.nodes.get(a), B = world.nodes.get(b), L = v2.len(v2.sub(B, A)), d = v2.norm(v2.sub(B, A)), n = { x: d.z, z: -d.x };
    for (let s = step / 2; s < L - 2; s += step) for (const sg of [1, -1]) {
      const p = { x: A.x + d.x * s + n.x * off * sg, z: A.z + d.z * s + n.z * off * sg };
      const rd = world.nearestRoad(p.x, p.z);
      if (rd && rd.way.name !== 'Royal Hospital Kilmainham' && rd.edgeDist < rd.way.pave + 1.5) continue;
      if (KH.solids.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < Math.max(o.w, o.d) / 2 + 2)) continue;
      items.push({ ...p, y: KERB_H, rot: r() * 6.28, s: 0.78 + r() * 0.1, species: 'lime' });
    }
  };
  for (const [a, b] of [['KHA7', 'KHA8'], ['KHA8', 'KHA9'], ['KHM4', 'KHA3']]) onAvenue(a, b, 8.5, 5.2);
  // meadow trees: scattered in the grounds, off the drives, the buildings, the gardens and the walls
  let tries = 0;
  const xs = green ? green.poly.map((p) => p.x) : [], zs = green ? green.poly.map((p) => p.z) : [];
  const SP = ['chestnut', 'lime', 'plane', 'chestnut'];
  // Low / Battery saver: half as many meadow trees (the avenues' limes stay)
  const target = items.length + (LITE ? 35 : 70);
  while (green && items.length < target && tries++ < 3000) {
    const p = { x: Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z: Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs)) };
    if (!pointInPolygon(p, green.poly)) continue;
    const rd = world.nearestRoad(p.x, p.z);
    if (rd && rd.edgeDist < rd.way.pave + 4) continue;
    if (KH.inGarden(p) || KH.solids.some((o) => { const cc = Math.cos(o.rot), ss = Math.sin(o.rot), dx = p.x - o.x, dz = p.z - o.z; return Math.abs(dx * cc - dz * ss) < o.w / 2 + 5 && Math.abs(dx * ss + dz * cc) < o.d / 2 + 5; })) continue;
    if (items.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 9)) continue;
    items.push({ ...p, y: KERB_H, rot: r() * 6.28, s: 0.8 + r() * 0.35, species: SP[Math.floor(r() * SP.length)] });
  }
  plantTrees(scene, items, { lime: 1 });
  for (const t of items) addBox(t.x, t.z, 0.35, 0.35, 0);
  return items.length;
}

// Rowan Gillespie's Proclamation (2008): fourteen bronze figures in a ring round a plinth, on the plaza across
// Inchicore Road from the gaol (ref 15)
function proclamation(scene, KH) {
  const p = KH.plaza;
  const items = [];
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; items.push({ x: p.x + Math.cos(a) * 3.1, z: p.z + Math.sin(a) * 2.2, rot: a, s: 0.9 + (k % 3) * 0.06 }); }
  const fig = mergeGeometries([new THREE.CylinderGeometry(0.1, 0.16, 2.3, 5).translate(0, 1.15, 0).toNonIndexed(), new THREE.SphereGeometry(0.14, 5, 4).translate(0, 2.4, 0).toNonIndexed()]);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.45, metalness: 0.35 });
  scene.add(chunkedInstances(fig, bronze, items, { shadow: true, y: KERB_H }));
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.7).translate(0, 0.45, 0), new THREE.MeshStandardMaterial({ color: 0x6d5b44, roughness: 0.6 }));
  plinth.position.set(p.x, KERB_H, p.z); plinth.castShadow = true; scene.add(plinth);
  for (const it of items) addBox(it.x, it.z, 0.2, 0.2, 0);
  addBox(p.x, p.z, 0.6, 0.35, 0);
}

export async function placeKilmainham(scene, KH) {
  // collision first, so the buildings are solid whether or not the model loads
  for (const s of KH.solids) addBox(s.x, s.z, s.w / 2, s.d / 2, s.rot);
  addPolyline(KH.gaolRing, true);
  let gltf;
  try { gltf = await load('kilmainham'); } catch (e) { console.warn('kilmainham model failed to load', e); return null; }
  prepare(gltf.scene);
  // all three landmarks share their materials and stand within 300 m: one mesh per material for the lot
  const g = new THREE.Group();
  for (const nodes of Object.values(KH.groups)) {
    for (const [node, p] of Object.entries(nodes)) {
      const o = gltf.scene.getObjectByName(node);
      if (!o) continue;
      o.removeFromParent();
      o.position.set(p.x, 0, p.z); o.rotation.set(0, p.rot, 0);
      g.add(o);
    }
  }
  const merged = mergeGroup(g, 'Kilmainham');
  merged.children.forEach((m) => m.updateMatrix());
  scene.add(merged);
  const heroes = [merged];
  const garden = gardenDressing(scene, KH);
  const walls = boundaryWall(scene, KH);
  const trees = plantKilmainham(scene, KH);
  proclamation(scene, KH);
  console.log(`Kilmainham: ${heroes.map((h) => `${h.name} ${h.children.length} meshes`).join(', ')}; ${garden.cones} yews, ${garden.hedges} hedges, ${walls} wall pieces, ${trees} trees`);
  const M = materials();
  return {
    heroes,
    setNight(l) { M.atlas.emissiveIntensity = 1.1 * l; },
  };
}
