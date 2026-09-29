// Heuston Station, v2 (docs/research/heuston-v2.md): the Blender hero (tools/blender/build_heuston.py ->
// public/models/heuston.glb), its own 2048 x 1024 atlas painted here at load (windows, capitals, swags, balusters,
// inscriptions...) with a matching emissive canvas for the lit glass, true-scale stone tiles, and the night
// floodlighting: the bake writes a flood mask per vertex (COLOR_0.a: window reveals, pediments, the cornice soffit)
// and the granite shader adds a warm wash there after dark. Also the forecourt: lawn, clipped hedge and mounds,
// trees, bollards, guard rails.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { load } from './heroes.js';
import { LITE } from '../render/quality.js';
import { plantTrees } from './trees.js';
import { KERB_H } from './roads.js';
import { addBox } from '../game/collision.js';
import { world } from './geo.js';
import { bridges } from './ground.js';

// atlas regions, px in 2048 x 1024 (must match HS_ATLAS in tools/blender/build_heuston.py)
export const HS_ATLAS = {
  win: [0, 0, 192, 384], archwin: [192, 0, 192, 384], doorglaz: [384, 0, 192, 384], door: [576, 0, 128, 256],
  wingwin: [704, 0, 128, 256], loggia: [832, 0, 192, 320], sash: [1024, 0, 128, 192], blind: [1152, 0, 128, 256],
  capital: [1280, 0, 256, 128], vous: [1280, 128, 256, 128], modsoffit: [1280, 256, 512, 64],
  swag: [1536, 0, 256, 96], balcon: [1536, 96, 128, 64], lion: [1664, 96, 64, 64], patera: [1728, 96, 64, 64],
  oculus: [1856, 96, 64, 64], vic: [1792, 0, 256, 96], ad: [1536, 160, 256, 96], arms: [1920, 96, 128, 128],
  diepanel: [1792, 160, 64, 128], white: [1024, 192, 32, 32], lunette: [1024, 256, 256, 128],
  balus: [0, 384, 512, 96], spandrel: [0, 480, 512, 160], ring: [512, 384, 256, 96], plate1821: [768, 384, 128, 64],
};

// palette (sRGB), docs/research/heuston-v2.md section 8
const STONE = '#b3afa5', STONE_HI = '#c4c0b6', STONE_LO = '#8f8b82', CREVICE = '#5f5d57';
const SASH = '#eceae3', GLASS = '#1f272d', GLASS_HI = '#43535e', IRON = '#1b1c1e';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const archPath = (g, x, y, w, h) => { // round-headed opening: x, y top-left of the bounding box
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath();
};

// ---------------- the atlas ----------------
function glassFill(g, x, y, w, h) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, GLASS_HI); gr.addColorStop(0.45, GLASS); gr.addColorStop(1, '#161c21');
  return gr;
}
// a round-headed sash window filling (x, y, w, h): radial fanlight over sashes of cols x rows panes
function sashWindow(g, x, y, w, h, cols, rows, emit) {
  const m = Math.round(w * 0.07), bar = Math.max(3, Math.round(w * 0.028)), r = w / 2;
  g.fillStyle = emit ? '#000' : SASH; archPath(g, x, y, w, h); g.fill();
  const gx = x + m, gy = y + m, gw = w - 2 * m, gh = h - 2 * m;
  g.fillStyle = emit ? emit : glassFill(g, gx, gy, gw, gh); archPath(g, gx, gy, gw, gh); g.fill();
  if (emit) return;
  g.strokeStyle = SASH; g.lineWidth = bar;
  // fanlight: radial bars and a ring, a transom at the springing
  const cx = x + r, cy = y + r;
  for (let k = 1; k < 5; k++) { const a = Math.PI + (k / 5) * Math.PI; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - m), cy + Math.sin(a) * (r - m)); g.stroke(); }
  g.beginPath(); g.arc(cx, cy, (r - m) * 0.35, Math.PI, 0); g.stroke();
  g.lineWidth = bar * 1.6; g.beginPath(); g.moveTo(gx, cy); g.lineTo(gx + gw, cy); g.stroke();
  // meeting rail halfway down the sashes
  const s0 = cy, s1 = gy + gh, mid = (s0 + s1) / 2;
  g.lineWidth = bar * 1.8; g.beginPath(); g.moveTo(gx, mid); g.lineTo(gx + gw, mid); g.stroke();
  g.lineWidth = bar;
  for (let c = 1; c < cols; c++) { const lx = gx + (gw * c) / cols; g.beginPath(); g.moveTo(lx, s0); g.lineTo(lx, s1); g.stroke(); }
  for (let rr = 1; rr < rows; rr++) for (const [a, b] of [[s0, mid], [mid, s1]]) { const ly = a + ((b - a) * rr) / rows; g.beginPath(); g.moveTo(gx, ly); g.lineTo(gx + gw, ly); g.stroke(); }
}
function stoneNoise(g, x, y, w, h, n = 60, a = 0.08) {
  let seed = 7 + x * 3 + y; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,58,52' : '220,216,206'},${r() * a})`; g.fillRect(x + r() * w, y + r() * h, 2 + r() * w * 0.1, 1 + r() * 4); }
}

function paintAtlas(g, emit) {
  const R = (k) => HS_ATLAS[k];
  g.clearRect(0, 0, 2048, 1024);
  if (emit) { g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 1024); }
  // piano-nobile window: arched top sash with radial bars, 2 x 3 panes in each lower sash (v2-04)
  { const [x, y, w, h] = R('win'); if (emit) { g.fillStyle = '#000'; g.fillRect(x, y, w, h); } sashWindow(g, x, y, w, h, 2, 3, emit && '#8a6a44'); }
  { const [x, y, w, h] = R('wingwin'); if (emit) { g.fillStyle = '#000'; g.fillRect(x, y, w, h); } sashWindow(g, x, y, w, h, 2, 3, emit && '#7a5a38'); }
  // end-bay ground-floor windows: a white sash with a fanlight in the arch (ref 07, v2-02 bay 1)
  { const [x, y, w, h] = R('archwin'); if (emit) { g.fillStyle = '#000'; g.fillRect(x, y, w, h); } sashWindow(g, x, y, w, h, 3, 3, emit && '#c8a878'); }
  // glazed entrance: aluminium doors and transom, a lit concourse behind (v2-03, v2-08)
  {
    const [x, y, w, h] = R('doorglaz');
    if (!emit) {
      g.fillStyle = '#2e3b43'; g.fillRect(x, y, w, h);
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#3a4a54'); gr.addColorStop(1, '#27323a');
      g.fillStyle = gr; g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.fillStyle = '#5f7fa8'; g.fillRect(x + w * 0.3, y + h * 0.5, w * 0.4, 10);             // signage band
      g.fillStyle = '#8d949a';
      g.fillRect(x, y + h * 0.44, w, 7); g.fillRect(x + w / 2 - 3, y + h * 0.44, 6, h * 0.56);
      g.fillRect(x + 6, y + h * 0.44, 6, h * 0.56); g.fillRect(x + w - 12, y + h * 0.44, 6, h * 0.56);
      g.fillRect(x, y + h - 10, w, 10);
    } else {
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#a08a68'); gr.addColorStop(0.5, '#dcc49a'); gr.addColorStop(1, '#b49c78');
      g.fillStyle = gr; g.fillRect(x + 8, y + 8, w - 16, h - 16);
      g.fillStyle = '#4f8fe8'; g.fillRect(x + w * 0.3, y + h * 0.5, w * 0.4, 10);
      g.fillStyle = '#000'; g.fillRect(x, y + h * 0.44, w, 7); g.fillRect(x + w / 2 - 3, y + h * 0.44, 6, h * 0.56);
    }
  }
  // panelled timber door in the wings (v2-07)
  {
    const [x, y, w, h] = R('door');
    if (!emit) {
      g.fillStyle = '#5b2b20'; g.fillRect(x, y, w, h);
      g.fillStyle = GLASS; g.fillRect(x + 10, y + 8, w - 20, h * 0.16);
      g.strokeStyle = '#3a1a12'; g.lineWidth = 4;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.strokeRect(x + 14 + c * (w - 20) / 2, y + h * 0.24 + r * h * 0.25, (w - 36) / 2, h * 0.2);
      g.fillStyle = '#2a120c'; g.fillRect(x + w / 2 - 2, y + h * 0.2, 4, h * 0.8);
    } else { g.fillStyle = '#000'; g.fillRect(x, y, w, h); }
  }
  // south range loggia window: arched, radial fanlight, iron grille (ref 09)
  {
    const [x, y, w, h] = R('loggia');
    if (!emit) {
      g.fillStyle = STONE; g.fillRect(x, y, w, h);
      g.fillStyle = STONE_LO; archPath(g, x + 14, y + 10, w - 28, h - 20); g.fill();
      sashWindow(g, x + 26, y + 22, w - 52, h - 50, 3, 2);
      g.strokeStyle = IRON; g.lineWidth = 3;
      for (let k = 1; k < 8; k++) { const lx = x + 26 + ((w - 52) * k) / 8; g.beginPath(); g.moveTo(lx, y + 22 + (w - 52) / 2); g.lineTo(lx, y + h - 28); g.stroke(); }
      g.fillStyle = STONE_HI; g.fillRect(x + 18, y + h - 30, w - 36, 12);
    } else sashWindow(g, x + 26, y + 22, w - 52, h - 50, 3, 2, '#b08850');
  }
  // square-headed sash (north return)
  {
    const [x, y, w, h] = R('sash');
    if (!emit) {
      g.fillStyle = STONE_HI; g.fillRect(x + 8, y + 4, w - 16, h - 8);
      g.fillStyle = SASH; g.fillRect(x + 18, y + 14, w - 36, h - 28);
      g.fillStyle = glassFill(g, x, y + 20, w, h - 40); g.fillRect(x + 24, y + 20, w - 48, (h - 50) / 2); g.fillRect(x + 24, y + 30 + (h - 50) / 2, w - 48, (h - 50) / 2);
      g.fillStyle = SASH; g.fillRect(x + w / 2 - 2, y + 20, 4, h - 40);
    } else { g.fillStyle = '#6a5030'; g.fillRect(x + 24, y + 20, w - 48, h - 40); }
  }
  // blind brick arch on the shed walls: a darker recessed panel in a gauged-brick ring on granite imposts
  if (!emit) {
    const [x, y, w, h] = R('blind');
    g.fillStyle = '#7a4030'; archPath(g, x + 4, y + 4, w - 8, h - 8); g.fill();
    g.fillStyle = '#5a2e22'; archPath(g, x + 16, y + 16, w - 32, h - 20); g.fill();
    g.fillStyle = 'rgba(200,190,170,0.35)'; for (let yy = y + 20; yy < y + h; yy += 6) g.fillRect(x + 16, yy, w - 32, 1);
    g.fillStyle = STONE; g.fillRect(x + 2, y + w / 2, 18, 10); g.fillRect(x + w - 20, y + w / 2, 18, 10);
  }
  // Corinthian capital (two tiers of acanthus, volutes, a lion mask in the middle), wraps 270 degrees (v2-04)
  if (!emit) {
    const [x, y, w, h] = R('capital');
    g.fillStyle = STONE; g.fillRect(x, y, w, h);
    const leaf = (cx, by, lw, lh, tone) => {
      g.fillStyle = tone; g.beginPath(); g.moveTo(cx - lw / 2, by); g.quadraticCurveTo(cx - lw / 2, by - lh * 0.7, cx, by - lh); g.quadraticCurveTo(cx + lw / 2, by - lh * 0.7, cx + lw / 2, by); g.fill();
      g.strokeStyle = CREVICE; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, by - lh * 0.85); g.stroke();
      g.beginPath(); g.moveTo(cx - lw * 0.25, by - lh * 0.2); g.lineTo(cx - lw * 0.1, by - lh * 0.6); g.moveTo(cx + lw * 0.25, by - lh * 0.2); g.lineTo(cx + lw * 0.1, by - lh * 0.6); g.stroke();
      g.fillStyle = CREVICE; g.beginPath(); g.arc(cx, by - lh + 6, 4, 0, Math.PI * 2); g.fill();
    };
    g.fillStyle = CREVICE; g.fillRect(x, y + h - 30, w, 30);
    for (let k = 0; k <= 8; k++) leaf(x + (k * w) / 8, y + h, w / 8 + 8, 62, STONE_HI);
    for (let k = 0; k < 8; k++) leaf(x + ((k + 0.5) * w) / 8, y + h - 34, w / 8 + 4, 60, '#bbb7ad');
    g.fillStyle = STONE_HI; g.fillRect(x, y, w, 16); g.fillStyle = STONE_LO; g.fillRect(x, y + 16, w, 3);
    for (const vx of [x + w * 0.17, x + w * 0.83]) { g.strokeStyle = CREVICE; g.lineWidth = 4; g.beginPath(); g.arc(vx, y + 30, 12, 0, Math.PI * 1.7); g.stroke(); }
    const lx = x + w / 2, ly = y + 38; // lion mask
    g.fillStyle = '#9c978c'; g.beginPath(); g.arc(lx, ly, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = CREVICE; g.fillRect(lx - 8, ly - 5, 5, 4); g.fillRect(lx + 3, ly - 5, 5, 4); g.fillRect(lx - 5, ly + 7, 10, 3);
    stoneNoise(g, x, y, w, h, 80, 0.1);
  }
  // voussoirs round a ground-floor arch: an alpha ring, 11 blocks with V-joints (v2-03)
  if (!emit) {
    const [x, y, w, h] = R('vous'); const cx = x + w / 2, cy = y + h, ro = h - 1, ri = ro * 0.727;
    for (let k = 0; k < 11; k++) {
      const a0 = Math.PI + (k / 11) * Math.PI, a1 = Math.PI + ((k + 1) / 11) * Math.PI;
      g.fillStyle = k % 2 ? '#aaa69c' : '#b2aea4';
      g.beginPath(); g.arc(cx, cy, ro, a0, a1); g.arc(cx, cy, ri, a1, a0, true); g.closePath(); g.fill();
      g.strokeStyle = CREVICE; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri); g.lineTo(cx + Math.cos(a0) * ro, cy + Math.sin(a0) * ro); g.stroke();
    }
    g.strokeStyle = '#7e7a71'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, ro - 1, Math.PI, 0); g.stroke();
  }
  // modillion brackets with coffers between, for the flank soffits (seen from below)
  if (!emit) {
    const [x, y, w, h] = R('modsoffit');
    g.fillStyle = '#8c887f'; g.fillRect(x, y, w, h);
    for (let k = 0; k < 8; k++) { const bx = x + k * 64; g.fillStyle = STONE; g.fillRect(bx + 22, y, 20, h); g.strokeStyle = CREVICE; g.lineWidth = 2; g.strokeRect(bx + 4, y + 6, 14, h - 12); g.strokeRect(bx + 46, y + 6, 14, h - 12); }
  }
  // fruit swag with ribbon ends (v2-02, ref 07), alpha
  if (!emit) {
    const [x, y, w, h] = R('swag');
    g.save(); g.translate(x, y);
    g.strokeStyle = '#8a867d'; g.lineCap = 'round';
    for (const [lw, col, dy] of [[26, '#8a867d', 2], [20, '#a9a59b', 0], [10, '#bdb9af', -3]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(20, 16 + dy); g.quadraticCurveTo(w / 2, h * 1.05 + dy, w - 20, 16 + dy); g.stroke();
    }
    g.fillStyle = CREVICE; for (let k = 0; k < 14; k++) { const t = (k + 0.5) / 14, px = 20 + t * (w - 40), py = 16 + 2 * t * (1 - t) * (h * 1.05 - 16) * 2 * 0.5 + 2 * t * (1 - t) * 0; g.beginPath(); g.arc(px, py + (k % 2 ? 4 : -3), 2.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#a9a59b'; for (const sx of [14, w - 22]) { g.fillRect(sx, 8, 8, h * 0.8); g.fillStyle = '#8a867d'; g.fillRect(sx + 6, 10, 2, h * 0.78); g.fillStyle = '#a9a59b'; }
    g.beginPath(); g.arc(20, 12, 9, 0, Math.PI * 2); g.arc(w - 20, 12, 9, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // wrought-iron balconette, near black, alpha (v2-04)
  if (!emit) {
    const [x, y, w, h] = R('balcon');
    g.strokeStyle = IRON; g.fillStyle = IRON; g.lineWidth = 3;
    g.fillRect(x, y + 4, w, 4); g.fillRect(x, y + h - 6, w, 5);
    for (const cx of [x + w * 0.25, x + w * 0.75]) {
      g.beginPath(); g.arc(cx - 10, y + h / 2, 11, -Math.PI / 2, Math.PI * 1.2); g.stroke();
      g.beginPath(); g.arc(cx + 10, y + h / 2, 11, Math.PI * 1.5, -Math.PI * 0.2, true); g.stroke();
      g.fillRect(cx - 1.5, y + 6, 3, h - 10);
    }
    g.fillRect(x + w / 2 - 1.5, y + 6, 3, h - 10);
  }
  // lion mask, patera, oculus
  if (!emit) {
    { const [x, y, w] = R('lion'); const c = x + w / 2, cy = y + w / 2;
      g.fillStyle = STONE_LO; g.beginPath(); g.arc(c, cy, w / 2 - 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = STONE_HI; g.beginPath(); g.arc(c, cy + 2, w / 2 - 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = CREVICE; g.fillRect(c - 12, cy - 6, 8, 5); g.fillRect(c + 4, cy - 6, 8, 5); g.fillRect(c - 3, cy, 6, 8); g.fillRect(c - 9, cy + 12, 18, 4); }
    { const [x, y, w] = R('patera'); const c = x + w / 2, cy = y + w / 2;
      g.fillStyle = STONE_LO; g.beginPath(); g.arc(c, cy, w / 2 - 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = STONE_HI; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.ellipse(c + Math.cos(a) * 14, cy + Math.sin(a) * 14, 9, 5, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = CREVICE; g.beginPath(); g.arc(c, cy, 6, 0, Math.PI * 2); g.fill(); }
  }
  { const [x, y, w] = R('oculus'); const c = x + w / 2, cy = y + w / 2;
    if (!emit) { g.fillStyle = STONE; g.fillRect(x, y, w, w); g.fillStyle = STONE_LO; g.beginPath(); g.arc(c, cy, w / 2 - 2, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = emit ? '#000' : '#15191c'; g.beginPath(); g.arc(c, cy, w / 2 - 9, 0, Math.PI * 2); g.fill(); }
  // attic inscriptions: incised serif caps in recessed panels
  for (const [k, text] of [['vic', 'VIII.VIC'], ['ad', 'A.D.1844']]) {
    if (emit) break;
    const [x, y, w, h] = R(k);
    g.fillStyle = STONE; g.fillRect(x, y, w, h);
    g.fillStyle = STONE_LO; g.fillRect(x + 8, y + 8, w - 16, 4); g.fillRect(x + 8, y + 8, 4, h - 16);
    g.fillStyle = STONE_HI; g.fillRect(x + 8, y + h - 12, w - 16, 4); g.fillRect(x + w - 12, y + 8, 4, h - 16);
    g.font = 'bold 42px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = STONE_HI; g.fillText(text, x + w / 2 + 1, y + h / 2 + 3);
    g.fillStyle = '#3f3e3a'; g.fillText(text, x + w / 2, y + h / 2 + 1);
  }
  // arms: a crowned shield in a scrolled cartouche (generic; the real heraldry is unidentified)
  if (!emit) {
    const [x, y, w, h] = R('arms'); const c = x + w / 2, cy = y + h / 2;
    g.fillStyle = STONE; g.fillRect(x, y, w, h);
    g.fillStyle = STONE_LO; g.beginPath(); g.ellipse(c, cy + 6, w / 2 - 6, h / 2 - 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = STONE_HI; g.beginPath(); g.moveTo(c - 26, cy - 18); g.lineTo(c + 26, cy - 18); g.lineTo(c + 26, cy + 10); g.quadraticCurveTo(c, cy + 44, c - 26, cy + 10); g.closePath(); g.fill();
    g.strokeStyle = CREVICE; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.moveTo(c, cy - 18); g.lineTo(c, cy + 30); g.moveTo(c - 26, cy); g.lineTo(c + 26, cy); g.stroke();
    g.fillStyle = '#a19d93'; g.beginPath(); g.moveTo(c - 22, cy - 22); g.lineTo(c - 22, cy - 40); g.lineTo(c - 11, cy - 30); g.lineTo(c, cy - 46); g.lineTo(c + 11, cy - 30); g.lineTo(c + 22, cy - 40); g.lineTo(c + 22, cy - 22); g.closePath(); g.fill(); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(c + sx * 44, cy + 18, 12, 0, Math.PI * 1.6); g.stroke(); }
  }
  // die panel: a carved trophy in a sunk panel
  if (!emit) {
    const [x, y, w, h] = R('diepanel');
    g.fillStyle = STONE; g.fillRect(x, y, w, h);
    g.fillStyle = STONE_LO; g.fillRect(x + 6, y + 6, w - 12, h - 12);
    g.fillStyle = STONE_HI; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.45, 14, 34, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = CREVICE; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(x + w / 2, y + 14); g.lineTo(x + w / 2, y + h - 14); g.stroke();
  }
  { const [x, y, w, h] = R('white'); g.fillStyle = emit ? '#000' : '#e8e8e6'; g.fillRect(x, y, w, h); }
  // lunette: a semicircular fanlight (south range pavilion)
  {
    const [x, y, w, h] = R('lunette'); const cx = x + w / 2, cy = y + h - 2;
    g.fillStyle = emit ? '#000' : SASH; g.beginPath(); g.arc(cx, cy, h - 4, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = emit ? '#a08050' : glassFill(g, x, y, w, h); g.beginPath(); g.arc(cx, cy, h - 14, Math.PI, 0); g.closePath(); g.fill();
    if (!emit) { g.strokeStyle = SASH; g.lineWidth = 5; for (let k = 1; k < 6; k++) { const a = Math.PI + (k / 6) * Math.PI; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (h - 10), cy + Math.sin(a) * (h - 10)); g.stroke(); } }
  }
  // balusters: 8 vase balusters per repeat, shaded, alpha
  if (!emit) {
    const [x, y, w, h] = R('balus'); const n = 8, bw = w / n;
    for (let k = 0; k < n; k++) {
      const cx = x + (k + 0.5) * bw;
      const prof = [[0.5, 0], [0.5, 0.1], [0.28, 0.16], [0.22, 0.3], [0.42, 0.58], [0.42, 0.66], [0.2, 0.82], [0.2, 0.88], [0.4, 0.92], [0.4, 1]];
      const pts = prof.map(([r, t]) => [r * bw * 0.8, y + h - t * h]);
      const gr = g.createLinearGradient(cx - bw * 0.4, 0, cx + bw * 0.4, 0);
      gr.addColorStop(0, '#8d897f'); gr.addColorStop(0.4, '#c8c4ba'); gr.addColorStop(1, '#8a867c');
      g.fillStyle = gr; g.beginPath(); pts.forEach(([r, py], i) => (i ? g.lineTo(cx + r, py) : g.moveTo(cx + r, py))); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(cx - pts[i][0], pts[i][1]); g.closePath(); g.fill();
    }
  }
  // Sean Heuston Bridge: spandrel panel, openwork parapet rings, the 1821 plate (tools/blender/build_heustonbridge.py)
  if (!emit) {
    { const [x, y, w, h] = R('spandrel');
      g.fillStyle = '#dcdcd6'; g.fillRect(x, y, w, h);
      g.strokeStyle = '#6f716e'; g.lineWidth = 6; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
      const cx = x + w / 2, cy = y + h / 2;
      g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, h * 0.3, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#6f716e'; g.beginPath(); g.moveTo(cx - 22, cy + 8); g.lineTo(cx - 22, cy - 12); g.lineTo(cx - 11, cy - 2); g.lineTo(cx, cy - 18); g.lineTo(cx + 11, cy - 2); g.lineTo(cx + 22, cy - 12); g.lineTo(cx + 22, cy + 8); g.closePath(); g.fill();
      g.lineWidth = 5;
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + sx * (90 + k * 55), cy + (k % 2 ? 14 : -14), 20, 0, Math.PI * 1.5); g.stroke(); }
      g.beginPath(); g.moveTo(x + 30, cy); g.lineTo(cx - h * 0.3, cy); g.moveTo(cx + h * 0.3, cy); g.lineTo(x + w - 30, cy); g.stroke(); }
    { const [x, y, w, h] = R('ring');
      g.strokeStyle = '#2a2620'; g.lineWidth = 7; g.fillStyle = '#2a2620';
      g.fillRect(x, y + 2, w, 8); g.fillRect(x, y + h - 10, w, 8);
      for (let k = 0; k < 4; k++) { const cx = x + (k + 0.5) * (w / 4); g.beginPath(); g.arc(cx, y + h / 2, h * 0.34, 0, Math.PI * 2); g.stroke(); }
      g.strokeStyle = '#9a7a3a'; g.lineWidth = 3; for (let k = 0; k <= 4; k++) { const cx = x + k * (w / 4); g.beginPath(); g.arc(cx, y + h / 2, 9, 0, Math.PI * 2); g.stroke(); } }
    { const [x, y, w, h] = R('plate1821');
      g.fillStyle = '#2a2620'; g.fillRect(x, y, w, h); g.strokeStyle = '#9a7a3a'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
      g.fillStyle = '#c9a44a'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1821', x + w / 2, y + h / 2 + 2); }
  }
}

function atlasTexture(emit) {
  let c = canvas(2048, 1024);
  paintAtlas(c.getContext('2d'), emit);
  if (LITE) { // Low / Battery saver: a quarter of the texels
    const s = canvas(1024, 512); const g = s.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, 1024, 512); c = s;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8;
  return t;
}

// ---------------- tiles (world UVs in game metres) ----------------
function tile(size, paint) {
  const c = canvas(size, size); paint(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// granite ashlar: a 4 m tile of 12 courses, blocks of 0.6-1 m, fine joints, lightness varying +-4% only
const graniteTile = () => tile(256, (g, N) => {
  const r = rng(29); g.fillStyle = '#aca89e'; g.fillRect(0, 0, N, N);
  const rows = 12, ch = N / rows;
  for (let row = 0; row < rows; row++) {
    let x = -r() * 50;
    while (x < N) {
      const w = 38 + r() * 26, l = 64 + (r() - 0.5) * 6;
      g.fillStyle = `hsl(40, 9%, ${l + 6}%)`; g.fillRect(x, row * ch, w, ch);
      g.fillStyle = 'rgba(110,106,98,0.55)'; g.fillRect(x, row * ch, 1, ch);
      x += w;
    }
    g.fillStyle = 'rgba(110,106,98,0.55)'; g.fillRect(0, row * ch, N, 1);
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,68,64' : '235,232,224'},${0.06 + r() * 0.08})`; g.fillRect(r() * N, r() * N, 1.5, 1.5); }
});
// channelled rustication: 3.3 m tile of 8 courses with deep horizontal channels and faint verticals
const rusticTile = () => tile(512, (g, N) => {
  const r = rng(41); g.fillStyle = '#aaa69c'; g.fillRect(0, 0, N, N);
  const rows = 8, ch = N / rows;
  for (let row = 0; row < rows; row++) {
    let x = row % 2 ? -80 : 0;
    while (x < N) {
      const w = 150 + r() * 40;
      g.fillStyle = `hsl(40, 9%, ${69 + (r() - 0.5) * 6}%)`; g.fillRect(x, row * ch, w, ch);
      g.fillStyle = 'rgba(95,94,89,0.45)'; g.fillRect(x, row * ch, 2, ch);
      x += w;
    }
    g.fillStyle = '#5f5e59'; g.fillRect(0, row * ch, N, 6);             // the channel
    g.fillStyle = 'rgba(210,206,196,0.8)'; g.fillRect(0, row * ch + 6, N, 2);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,68,64' : '235,232,224'},${0.05 + r() * 0.08})`; g.fillRect(r() * N, r() * N, 2, 2); }
});
// Flemish-bond brick (the shed): 3 m tile, 48 courses, headers and stretchers alternating in each course
const brickTile = () => tile(256, (g, N) => {
  const r = rng(53); g.fillStyle = '#b8b0a0'; g.fillRect(0, 0, N, N);
  const rows = 48, ch = N / rows, st = 10.5, hd = 5;
  for (let row = 0; row < rows; row++) {
    let x = row % 2 ? -st * 0.75 : 0, k = 0;
    while (x < N) {
      const w = k % 2 ? hd : st;
      const l = 36 + (r() - 0.5) * 8 - (k % 2 ? 4 : 0);
      g.fillStyle = `hsl(14, 42%, ${l}%)`; g.fillRect(x + 0.5, row * ch + 0.8, w - 1, ch - 1);
      x += w; k++;
    }
  }
});
const slateTile = () => tile(128, (g, N) => {
  const r = rng(61); g.fillStyle = '#4a4f55'; g.fillRect(0, 0, N, N);
  for (let row = 0; row < 16; row++) { let x = row % 2 ? -4 : 0; while (x < N) { g.fillStyle = `hsl(210, 7%, ${30 + (r() - 0.5) * 6}%)`; g.fillRect(x, row * 8, 7, 7); x += 8; } }
});

// ---------------- materials ----------------
// Pale granite under a grey Dublin sky reads light on every face; the game's key light is a low south-western sun, so
// the east front (the one everybody sees) is always the shade side. uSkyLift raises the sky/ambient share on the
// stone only, so the shade side lands near the reference photos (docs/research/heuston-v2.md 5.9, 13.3).
const flood = { level: { value: 0 }, tint: { value: new THREE.Color(0xffc890) }, sky: { value: 3.3 } };
function withFlood(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFloodLevel = flood.level; sh.uniforms.uFloodTint = flood.tint; sh.uniforms.uSkyLift = flood.sky;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFlood;\nvarying float vFlood;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlood = aFlood;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFloodLevel, uSkyLift;\nuniform vec3 uFloodTint;\nvarying float vFlood;')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= uSkyLift;')
      // warm uplight wash on the reveals, pediments and cornice soffit, lit by the stone's own colour
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uFloodTint * diffuseColor.rgb * (vFlood * vFlood) * uFloodLevel * 1.15;');
  };
  m.customProgramCacheKey = () => 'heuston-flood';
  return m;
}
let mats = null;
function materials() {
  if (mats) return mats;
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
  const map = atlasTexture(false), emissiveMap = atlasTexture(true);
  mats = {
    hs_granite: withFlood(std({ map: graniteTile(), roughness: 0.85 })),
    hs_rustic: withFlood(std({ map: rusticTile(), roughness: 0.88 })),
    hs_slate: std({ map: slateTile(), roughness: 0.75 }),
    hs_brick: std({ map: brickTile(), roughness: 0.9 }),
    hs_roof: std({ color: 0x6e7378, roughness: 0.6, metalness: 0.4 }),
    hs_glass: std({ color: 0x9fb3bd, roughness: 0.2, metalness: 0.3 }),
    hb_iron: withFlood(std({ color: 0xdcdcd6, roughness: 0.45 })),
    hb_rib: std({ color: 0x1f2530, roughness: 0.5 }),
    hb_lantern: std({ color: 0x8f9aad, emissive: 0xffd6a0, emissiveIntensity: 0.05, roughness: 0.15 }),
    hs_atlas: withFlood(std({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 })),
  };
  return mats;
}

// Baked AO arrives as normalised sRGB bytes (read as linear): decode it and lift it, so open wall stays >= ~0.9 and
// only real re-entrant corners go dark; the flood mask moves from COLOR_0.a to its own attribute.
function prepare(root, useFlood = true) {
  const M = materials();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry, n = geo.attributes.position.count;
    const col = geo.attributes.color;
    const rgb = new Float32Array(n * 3).fill(1), fl = new Float32Array(n);
    if (col) {
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.min(1, 0.36 + 0.72 * Math.pow(col.getComponent(i, c), 1 / 2.2));
        if (useFlood && col.itemSize === 4) fl[i] = col.getComponent(i, 3);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    geo.setAttribute('aFlood', new THREE.BufferAttribute(fl, 1));
    o.material = M[o.material.name] || o.material;
    o.castShadow = true;
    o.receiveShadow = true;
  });
}

// ---------------- forecourt (docs/research/heuston-v2.md section 10.1) ----------------
// Local frame of the head building: u east out of the front, v north along it (game metres), origin the middle of
// the front at ground level.
function frame(st) {
  const c = Math.cos(st.rot), s = Math.sin(st.rot);
  return (u, v) => ({ x: st.x + u * c - v * s, z: st.z - u * s - v * c });
}
function forecourt(scene, st) {
  const P = frame(st), y0 = KERB_H;
  const g = new THREE.Group(); g.name = 'Heuston forecourt';
  const place = (geo, u, v, y = y0, rot = 0) => { const p = P(u, v); const q = geo.clone(); q.rotateY(st.rot + rot); q.translate(p.x, y, p.z); return q; };
  const green = [], hedge = [], bol = [];
  // stainless bollards along the front, 1.6 m apart (v2-02, v2-08)
  const bollard = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8).translate(0, 0.45, 0);
  for (let v = -15.5; v <= 15.5; v += 1.6) {
    if (Math.abs(v) < 1.2) continue;
    bol.push(place(bollard, 2.6, v));
  }
  // the lawn in the corner between the east platform, the river and the junction (the game squeezes the real lawn
  // east of the stop into this triangle), with a clipped hedge along the St John's Road side and round clipped
  // mounds (ref 04)
  const LAWN = [[22.8, 7.2], [25.6, 7.2], [29.2, 13.2], [29.2, 16.0], [22.8, 16.0]];
  const shape = new THREE.Shape(LAWN.map(([u, v]) => { const p = P(u, v); return new THREE.Vector2(p.x, -p.z); }));
  green.push(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y0 + 0.03, 0));
  const hedgeBox = new THREE.BoxGeometry(0.9, 0.9, 1).translate(0, 0.45, 0);
  const hedgeRun = (a, b) => { // a box hedge from a to b (u, v)
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
    hedge.push(place(hedgeBox.clone().scale(1, 1, L), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, y0, -ang));
  };
  hedgeRun([22.9, 7.6], [25.4, 7.6]); hedgeRun([25.6, 7.6], [28.9, 13.1]);
  const mound = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [u, v, r] of [[24.4, 10.4, 1.1], [26.6, 14.3, 1.0], [24.1, 14.6, 0.8]]) hedge.push(place(mound.clone().scale(r, r * 0.75, r), u, v, y0));
  // galvanised guard rail along the St John's Road West kerb by the junction (refs 03, 08, 09)
  const rail = [];
  const post = new THREE.BoxGeometry(0.05, 1.0, 0.05).translate(0, 0.5, 0);
  const bar = new THREE.BoxGeometry(0.03, 0.8, 0.03).translate(0, 0.5, 0);
  const rails = new THREE.BoxGeometry(0.05, 0.05, 2.0);
  const topRail = rails.clone().translate(0, 1.0, 1.0), botRail = rails.clone().translate(0, 0.12, 1.0);
  const a = world.nodes.get('SJ1'), b = world.nodes.get('VQ2');
  if (a && b) {
    const L = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
    // the kerb on the station side (the side facing the station's front)
    let nx = -dz, nz = dx; const m = P(10, 0); if ((m.x - a.x) * nx + (m.z - a.z) * nz < 0) { nx = -nx; nz = -nz; }
    const way = world.ways.find((w) => w.name === "St John's Road West"), off = (way ? way.width / 2 : 7) + 0.35;
    const ang = Math.atan2(dx, dz);
    for (let t = L * 0.22; t < L * 0.72; t += 2) {
      const x = a.x + dx * t + nx * off, z = a.z + dz * t + nz * off;
      for (const geo of [post, topRail, botRail]) { const q = geo.clone(); q.rotateY(ang); q.translate(x, y0, z); rail.push(q); }
      for (let k = 1; k < 10; k++) { const q = bar.clone(); q.translate(x + dx * k * 0.2, y0, z + dz * k * 0.2); rail.push(q); }
    }
  }
  const mk = (list, mat, shadow = true) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = shadow; m.receiveShadow = true; g.add(m); };
  mk(bol, new THREE.MeshStandardMaterial({ color: 0xc9ccce, roughness: 0.3, metalness: 0.8 }));
  mk(green, new THREE.MeshStandardMaterial({ color: 0x5f7f3a, roughness: 0.95 }), false);
  mk(hedge, new THREE.MeshStandardMaterial({ color: 0x3f5a2c, roughness: 0.95 }));
  mk(rail, new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.5, metalness: 0.6 }));
  scene.add(g);
  for (let v = -15.5; v <= 15.5; v += 1.6) { if (Math.abs(v) < 1.2) continue; const p = P(2.6, v); addBox(p.x, p.z, 0.08, 0.08, 0); }
  { const c = P(26, 11.6); addBox(c.x, c.z, 2.6, 3.8, st.rot); }
  // trees: silver birches by the wings, a row of broad limes along the lawn and the footpath (these hide the ground
  // floor in ref 03)
  const T = (u, v, s) => ({ ...P(u, v), y: y0, rot: (u * 7.3 + v * 3.1) % 6.28, s });
  plantTrees(scene, [T(-1.3, 11.0, 0.55), T(-1.3, -11.0, 0.58), T(-3.3, 15.4, 0.5), T(-3.3, -15.4, 0.52)], { birch: 1 });
  plantTrees(scene, [T(23.4, 4.6, 0.72), T(23.6, 9.6, 0.8), T(23.8, 14.2, 0.76)], { lime: 1 });
  return g;
}

// ---------------- Sean Heuston Bridge (tools/blender/build_heustonbridge.py) ----------------
const BRIDGE_SPAN = 51.34; // the river channel the model was built for
async function placeBridge(scene) {
  const br = bridges.find((b) => /Heuston/.test(b.name));
  if (!br) return null;
  let gltf;
  try { gltf = await load('heustonbridge'); } catch (e) { console.warn('heustonbridge model failed to load', e); return null; }
  prepare(gltf.scene, false);
  const root = gltf.scene.getObjectByName('bridge');
  root.removeFromParent();
  // the model spans its local x: turn it onto the bridge's direction and fit it to the channel
  root.rotation.set(0, Math.atan2(br.dir.x, br.dir.z) - Math.PI / 2, 0);
  root.scale.set(br.length / BRIDGE_SPAN, 1, 1);
  root.position.set(br.centre.x, 0, br.centre.z);
  root.name = `${br.name} (hero)`;
  scene.add(root);
  // hide the generic arch and parapets (their collision stays)
  const standIn = scene.getObjectByName(br.name);
  if (standIn) standIn.traverse((o) => { if (o.userData.standIn) o.visible = false; });
  return root;
}

// ---------------- placement ----------------
export async function placeHeuston(scene, site) {
  let gltf;
  try { gltf = await load('heuston'); } catch (e) { console.warn('heuston model failed to load', e); return null; }
  prepare(gltf.scene);
  const group = new THREE.Group(); group.name = 'Heuston Station';
  const st = site.parts.station, node = gltf.scene.getObjectByName('station');
  node.removeFromParent();
  node.position.set(st.x, 0, st.z); node.rotation.set(0, st.rot, 0);
  group.add(node);
  scene.add(group);
  forecourt(scene, st);
  placeBridge(scene);
  const M = materials();
  return {
    group,
    // after dark: the floodlit reveals, pediments and cornice; lit shops in the ground-floor arches
    setNight(level) {
      flood.level.value = level; flood.sky.value = 3.3 - 2.1 * level;
      M.hs_atlas.emissiveIntensity = level * 0.7;
      M.hb_lantern.emissiveIntensity = 0.05 + level * 3;
      // green for St Patrick's Day (ref 03)
      const d = new Date(); flood.tint.value.set(d.getMonth() === 2 && d.getDate() === 17 ? 0x5cff7a : 0xffc890);
    },
  };
}
