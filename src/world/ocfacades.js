// O'Connell Street's frontages (docs/research/oconnell-street.md): every building between the side streets, the GPO
// and Clerys, built at load from src/data/oconnellst.json by a small procedural facade kit. The layout (frames along
// the street) is src/world/ocstreet.js. Each front is assembled from real openings: recessed windows with reveals,
// shopfronts with pilasters, a fascia and the sign, string courses, cornices, parapets, balustrades, pilasters and
// columns; the hero fronts are built by their own recipes (the Gresham, the Savoy, the Carlton, Eason's corner with
// its clock) and the signs the street is known for are drawn on (the Happy Ring House, Funland, the Confectioner's
// Hall). Textures are painted at load: stone, brick and render tiles in true metres (tinted per building by vertex
// colour, with a cheap baked shade under projections and at the foot of the walls) and one 2048 atlas of windows,
// shopfronts, fascias and signs with a night twin (windows lit at random, shop windows and signs lit). The whole
// street is two meshes per material (the Lower and the Upper street) so it costs ~16 draw calls; Low / Battery saver
// paint the textures at half size.
import * as THREE from 'three';
import { OCS } from './sites.js';
import { stoneTile, uplit } from './heroes.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { addBox } from '../game/collision.js';
import { footprintOf } from './ocstreet.js';
import { world, project } from './geo.js';
import { along, chainageOf, islandAt, halfWidth, CHAIN, LENGTH } from './oconnell.js';
import data from '../data/oconnellst.json';
import { sites } from './sites.js';

// ---------------------------------------------------------------------------------------------------------------------
// atlas regions, px in a 2048 x 2048 canvas: [x, y, w, h]
const WIN = ['sash6', 'sash2', 'case', 'arch', 'oval', 'deco', 'gwin', 'dormer'];          // 4 variants each, 64 x 128
const SHOPS = ['shop', 'bank', 'food', 'diner', 'cafe', 'pub', 'jewel', 'amuse', 'pharmacy', 'gift', 'hotel', 'office', 'cinema', 'book', 'hoard', 'garch'];
const R = {};
WIN.forEach((k, i) => { R[k] = [i * 256, 0, 256, 128]; });                                  // the 4 variants side by side
R.blind = [0, 128, 256, 128];
R.mod = [256, 128, 1024, 128];                                                             // 4 variants of 256 x 128
R.door = [1280, 128, 64, 128]; R.gdoor = [1344, 128, 128, 128]; R.balus = [1472, 128, 256, 64]; R.rail = [1472, 192, 256, 64];
R.flagIE = [1728, 128, 128, 64]; R.flagEU = [1856, 128, 128, 64]; R.flagH = [1728, 192, 128, 64]; R.canopy = [1856, 192, 128, 64];
SHOPS.forEach((k, i) => { R['s_' + k] = [(i % 8) * 256, 256 + Math.floor(i / 8) * 128, 256, 128]; });
// fascia signs: 512 x 48, four to a row from y 512
const SIGN0 = 512, SIGNW = 512, SIGNH = 48;
// specials from y 1200
Object.assign(R, {
  easonName: [0, 1200, 512, 64], easonDial: [512, 1200, 128, 128], easonTop: [640, 1200, 256, 64], easonCart: [896, 1200, 128, 64],
  greshamName: [1024, 1200, 1024, 64],
  carl: [0, 1328, 448, 64],                                                                  // C A R L T O N, 64 px each
  savoyV: [448, 1328, 64, 320], savoyBanner: [512, 1328, 512, 128], savoyTop: [1024, 1264, 512, 64],
  happy: [1536, 1264, 256, 320], confect: [1024, 1328, 512, 64], funland: [1024, 1392, 512, 128],
  ad: [1792, 1264, 256, 192], mural: [0, 1648, 1024, 256], mural2: [1024, 1648, 1024, 256],
  hammam: [1024, 1520, 512, 48], gpane: [1536, 1584, 256, 64],
});
const ATLAS = 2048;
const uvOf = (reg, s, t) => [(reg[0] + s * reg[2]) / ATLAS, (reg[1] + t * reg[3]) / ATLAS]; // flipY off: v runs down the canvas // s, t in 0..1, t down

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const hash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------------------------------------------------------------
// the painted atlas: day (lit = false) and night (lit = true: black unless it glows)
const WARM = '#ffd9a0';
function paintAtlas(g, lit, signs) {
  const r = rng(lit ? 11 : 7);
  g.clearRect(0, 0, ATLAS, ATLAS);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const glassDay = (x, y, w, h, tone = 0) => {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, ['#7d8d99', '#6f8494', '#8d9ba4'][tone % 3]); gr.addColorStop(1, '#27313a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.moveTo(x, y + h * 0.7); g.lineTo(x + w * 0.6, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h * 0.15); g.lineTo(x + w * 0.2, y + h); g.lineTo(x, y + h); g.fill();
  };
  // lit state of window variant k: 0 lit warm, 1 dark, 2 dim with a blind, 3 lit cool (offices)
  const glassNight = (x, y, w, h, k) => {
    if (k === 1) return rect(x, y, w, h, '#000');
    const c = k === 0 ? WARM : k === 2 ? '#6a4a2a' : '#e8eef8';
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c); gr.addColorStop(1, k === 2 ? '#3a2814' : '#b88a50');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    if (k === 2) rect(x, y, w, h * 0.55, '#2a1c10');
  };
  const glass = (x, y, w, h, k) => (lit ? glassNight(x, y, w, h, k) : glassDay(x, y, w, h, k));
  const bars = (x, y, w, h, nx, ny, c = '#ece8de', t = 2.5) => {
    if (lit) c = 'rgba(20,14,8,0.85)';
    g.fillStyle = c;
    for (let i = 1; i < nx; i++) g.fillRect(x + (i * w) / nx - t / 2, y, t, h);
    for (let j = 1; j < ny; j++) g.fillRect(x, y + (j * h) / ny - t / 2, w, t);
  };
  const frame = (x, y, w, h, c, t = 4) => { if (lit) return; g.fillStyle = c; g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t); g.fillRect(x, y, t, h); g.fillRect(x + w - t, y, t, h); };
  const text = (s, x, y, font, col, { align = 'center', stroke, maxW } = {}) => {
    g.font = font; g.textAlign = align; g.textBaseline = 'middle';
    if (stroke && !lit) { g.lineWidth = 3; g.strokeStyle = stroke; g.strokeText(s, x, y, maxW); }
    g.fillStyle = col; g.fillText(s, x, y, maxW);
  };

  // ---- windows: 4 variants of each (same by day bar the blinds; lit differently at night)
  for (const k of WIN) {
    const [X, Y] = R[k];
    for (let v = 0; v < 4; v++) {
      const x = X + v * 64, y = Y;
      if (k === 'sash6') { frame(x + 6, y + 4, 52, 120, '#efebe2', 4); glass(x + 10, y + 8, 44, 112, v); bars(x + 10, y + 8, 44, 112, 3, 4, '#efebe2', 3); if (!lit) rect(x + 8, y + 62, 48, 5, '#efebe2'); }
      else if (k === 'sash2') { frame(x + 6, y + 4, 52, 120, '#e9e5dc', 5); glass(x + 11, y + 9, 42, 110, v); bars(x + 11, y + 9, 42, 110, 1, 2, '#e9e5dc', 5); if (!lit && v === 2) rect(x + 11, y + 9, 42, 30, 'rgba(230,225,210,0.8)'); }
      else if (k === 'case') { frame(x + 4, y + 4, 56, 120, '#3c4640', 4); glass(x + 8, y + 8, 48, 112, v); bars(x + 8, y + 8, 48, 112, 2, 3, '#3c4640', 3); if (!lit) rect(x + 8, y + 40, 48, 4, '#3c4640'); }
      else if (k === 'arch' || k === 'gwin') {
        const c = k === 'gwin' ? '#e8e4da' : '#ece8de';
        g.save(); g.beginPath(); g.moveTo(x + 6, y + 124); g.lineTo(x + 6, y + 32); g.arc(x + 32, y + 32, 26, Math.PI, 0); g.lineTo(x + 58, y + 124); g.closePath(); g.clip();
        glass(x, y, 64, 128, v); bars(x + 6, y + 6, 52, 118, 2, k === 'gwin' ? 5 : 4, c, 3);
        if (!lit) { g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(x + 32, y + 32, 16, Math.PI, 0); g.stroke(); }
        g.restore();
        if (!lit) { g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 6, y + 124); g.lineTo(x + 6, y + 32); g.arc(x + 32, y + 32, 26, Math.PI, 0); g.lineTo(x + 58, y + 124); g.stroke(); }
      } else if (k === 'oval') {
        g.save(); g.beginPath(); g.ellipse(x + 32, y + 64, 26, 44, 0, 0, 7); g.clip(); glass(x, y, 64, 128, v); bars(x, y + 20, 64, 88, 2, 2, '#e8e4da', 3); g.restore();
        if (!lit) { g.strokeStyle = '#e8e4da'; g.lineWidth = 5; g.beginPath(); g.ellipse(x + 32, y + 64, 26, 44, 0, 0, 7); g.stroke(); }
      } else if (k === 'deco') { // the Carlton's tall blue windows with curved glazing bars
        if (!lit) { const gr = g.createLinearGradient(0, y, 0, y + 128); gr.addColorStop(0, '#6f9fd8'); gr.addColorStop(1, '#2c5aa0'); g.fillStyle = gr; g.fillRect(x + 4, y, 56, 128); g.strokeStyle = '#dfe8f4'; g.lineWidth = 2; for (let j = 0; j < 9; j++) { g.beginPath(); g.moveTo(x + 4, y + 10 + j * 14); g.quadraticCurveTo(x + 32, y + 2 + j * 14, x + 60, y + 10 + j * 14); g.stroke(); } bars(x + 4, y, 56, 128, 2, 1, '#dfe8f4', 2); }
        else rect(x + 4, y, 56, 128, v === 0 ? '#20283a' : '#000');
      } else if (k === 'dormer') { if (!lit) rect(x + 4, y + 20, 56, 108, '#e8e4da'); glass(x + 12, y + 30, 40, 90, v); bars(x + 12, y + 30, 40, 90, 2, 2, '#e8e4da', 3); }
    }
  }
  { const [x, y] = R.blind; for (let v = 0; v < 4; v++) { if (!lit) { rect(x + v * 64 + 6, y + 4, 52, 120, '#3a3a38'); rect(x + v * 64 + 10, y + 8, 44, 112, v % 2 ? '#56524a' : '#4a4640'); } } }
  { // modern ribbon glazing: a floor of glass between spandrels, mullions every 32 px
    const [X, Y] = R.mod;
    for (let v = 0; v < 4; v++) {
      const x = X + v * 256;
      for (let m = 0; m < 8; m++) glass(x + m * 32 + 2, Y + 8, 28, 112, lit ? [0, 3, 1, 3, 0, 1, 3, 3][(m + v * 3) % 8] : v);
      if (!lit) { rect(x, Y, 256, 8, '#9aa0a3'); rect(x, Y + 120, 256, 8, '#9aa0a3'); for (let m = 0; m <= 8; m++) rect(x + m * 32 - 1, Y, 3, 128, '#c8c8c4'); }
    }
  }
  { const [x, y, w, h] = R.door; if (!lit) { rect(x, y, w, h, '#ece8de'); rect(x + 6, y + 36, w - 12, h - 36, ['#1f3f7a', '#a3201f', '#1d5a3a'][1]); g.strokeStyle = '#6a1414'; g.lineWidth = 3; for (const [px, py, pw, ph] of [[12, 44, 18, 32], [34, 44, 18, 32], [12, 84, 18, 36], [34, 84, 18, 36]]) g.strokeRect(x + px, y + py, pw, ph); } g.save(); g.beginPath(); g.arc(x + 32, y + 34, 26, Math.PI, 0); g.closePath(); g.clip(); glass(x, y, 64, 36, 0); g.restore(); }
  { // the Gresham's doors: brass-framed glass under the canopy
    const [x, y, w, h] = R.gdoor;
    if (lit) { rect(x + 8, y + 8, w - 16, h - 8, WARM); } else { rect(x, y, w, h, '#2a2620'); glass(x + 10, y + 10, w - 20, h - 10, 0); rect(x + w / 2 - 2, y + 10, 4, h - 10, '#b8963c'); rect(x + 10, y + 10, w - 20, 4, '#b8963c'); }
  }
  { // balustrade (cut out) and railings
    const [x, y, w, h] = R.balus;
    if (!lit) { rect(x, y, w, 8, '#e3dfd5'); rect(x, y + h - 8, w, 8, '#e3dfd5'); g.fillStyle = '#e3dfd5';
      for (let bx = x + 4; bx < x + w - 6; bx += 12) { g.beginPath(); g.moveTo(bx + 2, y + 8); g.lineTo(bx + 6, y + 8); g.quadraticCurveTo(bx + 10, y + 30, bx + 6, y + h - 8); g.lineTo(bx + 2, y + h - 8); g.quadraticCurveTo(bx - 2, y + 30, bx + 2, y + 8); g.fill(); } }
  }
  { const [x, y, w, h] = R.rail; g.fillStyle = lit ? '#000' : '#15171a'; g.fillRect(x, y + 10, w, 3); g.fillRect(x, y + h - 6, w, 4); for (let bx = x + 2; bx < x + w; bx += 7) { g.fillRect(bx, y + 4, 2, h - 6); } }
  { // flags
    const f = (k, paint) => { const [x, y, w, h] = R[k]; if (!lit) paint(x, y, w, h); };
    f('flagIE', (x, y, w, h) => { rect(x, y, w / 3, h, '#169b62'); rect(x + w / 3, y, w / 3, h, '#ffffff'); rect(x + (2 * w) / 3, y, w / 3, h, '#ff883e'); });
    f('flagEU', (x, y, w, h) => { rect(x, y, w, h, '#003399'); g.fillStyle = '#ffcc00'; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.arc(x + w / 2 + Math.cos(a) * 20, y + h / 2 + Math.sin(a) * 20, 3, 0, 7); g.fill(); } });
    f('flagH', (x, y, w, h) => { rect(x, y, w, h, '#1b2a4a'); text('G', x + w / 2, y + h / 2 + 2, 'bold 40px Georgia, serif', '#d4af37'); });
    const [x, y, w, h] = R.canopy; // the canopy's glass and frame from below
    if (lit) { rect(x, y, w, h, '#fff0cc'); } else { rect(x, y, w, h, '#3b3a36'); for (let i = 0; i < 8; i++) glassDay(x + 4 + i * 15.5, y + 4, 12, h - 8, 2); }
  }

  // ---- shopfronts: display windows (the frame and fascia are geometry)
  const disp = (k, paint) => { const [x, y, w, h] = R['s_' + k]; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); paint(x, y, w, h); g.restore(); };
  const shopWin = (x, y, w, h, inner, { mull = 3, bright = 1, door = true } = {}) => {
    // inner(x, y, w, h): the goods / interior, drawn over the glass
    if (lit) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff4dc'); gr.addColorStop(1, '#e0b070'); g.fillStyle = gr; g.globalAlpha = bright; g.fillRect(x, y, w, h); g.globalAlpha = 1; }
    else glassDay(x, y, w, h, 1);
    g.globalAlpha = lit ? 0.5 : 0.55; inner(x, y, w, h); g.globalAlpha = 1;
    const c = lit ? 'rgba(0,0,0,0.8)' : '#1c1c1a';
    g.fillStyle = c; for (let i = 0; i <= mull; i++) g.fillRect(x + (i * (w - 4)) / mull, y, 4, h);
    if (door) { g.fillStyle = lit ? 'rgba(255,240,210,0.9)' : '#2c3238'; g.fillRect(x + w * 0.7, y + 6, w * 0.2, h - 6); g.fillStyle = c; g.fillRect(x + w * 0.7, y + 6, 3, h - 6); g.fillRect(x + w * 0.9 - 3, y + 6, 3, h - 6); }
  };
  const shelves = (x, y, w, h, cols) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 18; i++) { g.fillStyle = cols[(i + j * 3) % cols.length]; g.fillRect(x + 6 + i * (w - 12) / 18, y + 20 + j * 24, (w - 12) / 18 - 2, 18); } };
  const people = (x, y, w, h) => { for (let i = 0; i < 4; i++) { const px = x + 20 + r() * (w - 40); g.fillStyle = `hsl(${r() * 360},35%,30%)`; g.fillRect(px, y + h - 50, 12, 50); g.beginPath(); g.arc(px + 6, y + h - 56, 6, 0, 7); g.fill(); } };
  disp('shop', (x, y, w, h) => shopWin(x, y, w, h, () => { for (let i = 0; i < 6; i++) { g.fillStyle = `hsl(${(i * 67) % 360},25%,50%)`; g.fillRect(x + 12 + i * 38, y + 50 + (i % 2) * 10, 24, 60); } }));
  disp('bank', (x, y, w, h) => shopWin(x, y, w, h, () => { rect(x, y, w, h * 0.5, 'rgba(40,44,50,0.8)'); rect(x + 30, y + 60, 26, 36, '#1f3f7a'); rect(x + 34, y + 64, 18, 12, '#8fd0ff'); }, { bright: 0.6 }));
  disp('food', (x, y, w, h) => shopWin(x, y, w, h, () => { rect(x, y + 8, w, 26, '#c8102e'); for (let i = 0; i < 4; i++) { rect(x + 10 + i * 60, y + 12, 50, 18, '#ffc72c'); } rect(x, y + 80, w, 48, 'rgba(200,120,60,0.6)'); people(x, y, w, h); }, { bright: 1.1 }));
  disp('diner', (x, y, w, h) => shopWin(x, y, w, h, () => { for (let i = 0; i < 12; i++) rect(x + i * 22, y + 96, 11, 32, i % 2 ? '#fff' : '#111'); rect(x, y + 14, w, 10, '#ff3a3a'); people(x, y, w, h); }, { bright: 1.1 }));
  disp('cafe', (x, y, w, h) => shopWin(x, y, w, h, () => { rect(x, y + 70, w, 58, 'rgba(120,80,50,0.7)'); for (let i = 0; i < 5; i++) { g.fillStyle = '#e8d8b0'; g.beginPath(); g.arc(x + 25 + i * 48, y + 30, 8, 0, 7); g.fill(); } people(x, y, w, h); }, { bright: 0.9 }));
  disp('pub', (x, y, w, h) => { if (!lit) rect(x, y, w, h, '#123826'); shopWin(x + 10, y + 10, w - 20, h - 40, () => { rect(x + 10, y + 70, w - 20, 28, 'rgba(120,70,30,0.8)'); for (let i = 0; i < 9; i++) rect(x + 20 + i * 24, y + 22, 8, 22, `hsl(${30 + i * 10},60%,45%)`); }, { mull: 4, bright: 0.8 }); if (!lit) { rect(x, y + h - 30, w, 30, '#0d2a1b'); g.strokeStyle = '#c9a64a'; g.lineWidth = 2; for (let i = 0; i < 4; i++) g.strokeRect(x + 12 + i * 60, y + h - 26, 50, 22); } });
  disp('jewel', (x, y, w, h) => shopWin(x, y, w, h, () => { for (let j = 0; j < 3; j++) for (let i = 0; i < 10; i++) { g.fillStyle = (i + j) % 3 ? '#e8d27a' : '#dfe6ee'; g.beginPath(); g.arc(x + 18 + i * 23, y + 44 + j * 26, 4, 0, 7); g.fill(); } rect(x, y + 100, w, 28, 'rgba(30,30,40,0.6)'); }, { bright: 1.2 }));
  disp('amuse', (x, y, w, h) => shopWin(x, y, w, h, () => { for (let i = 0; i < 7; i++) { rect(x + 10 + i * 34, y + 30, 26, 70, `hsl(${(i * 53) % 360},90%,${lit ? 60 : 45}%)`); } }, { bright: 0.9 }));
  disp('pharmacy', (x, y, w, h) => shopWin(x, y, w, h, () => { shelves(x, y, w, h, ['#fff', '#8fd0a0', '#e8eef8', '#2f9e5a']); rect(x + 20, y + 14, 22, 22, '#18a84a'); rect(x + 27, y + 8, 8, 34, '#18a84a'); rect(x + 14, y + 21, 34, 8, '#18a84a'); }, { bright: 1.1 }));
  disp('gift', (x, y, w, h) => shopWin(x, y, w, h, () => { shelves(x, y, w, h, ['#169b62', '#ffffff', '#ff883e', '#1d6b3a', '#e8d27a']); }, { bright: 1 }));
  disp('hotel', (x, y, w, h) => shopWin(x, y, w, h, () => { rect(x, y + 60, w, 68, 'rgba(90,70,50,0.7)'); rect(x + 60, y + 30, 70, 50, 'rgba(230,200,140,0.6)'); }, { bright: 0.9, mull: 4 }));
  disp('office', (x, y, w, h) => shopWin(x, y, w, h, () => { rect(x, y + 70, w, 58, 'rgba(60,64,70,0.7)'); rect(x + 30, y + 30, 90, 36, '#f2c416'); }, { bright: 0.8, mull: 4 }));
  disp('cinema', (x, y, w, h) => { // the Savoy's foyer: poster cases on a white wall, glass doors
    if (!lit) rect(x, y, w, h, '#e9e9e4'); else rect(x, y, w, h, '#fff2d8');
    for (let i = 0; i < 4; i++) { const px = x + 10 + i * 62; rect(px, y + 24, 48, 70, lit ? '#000' : '#222'); g.fillStyle = `hsl(${(i * 83 + 20) % 360},70%,${lit ? 60 : 50}%)`; g.fillRect(px + 4, y + 28, 40, 62); }
    rect(x, y + h - 14, w, 14, lit ? '#000' : '#1c1c1a');
  });
  disp('book', (x, y, w, h) => shopWin(x, y, w, h, () => { shelves(x, y, w, h, ['#b3191d', '#1f3f7a', '#e8e0cc', '#2f6b4b', '#d9ae2c', '#6a3b78']); }, { bright: 1.1 }));
  disp('hoard', (x, y, w, h) => { if (!lit) { rect(x, y, w, h, '#23303a'); for (let i = 0; i < 5; i++) rect(x + i * 52, y, 2, h, '#141c22'); text('DUBLIN CITY COUNCIL', x + w / 2, y + 30, 'bold 16px Arial', '#e8e0cc'); } });
  disp('garch', (x, y, w, h) => { // the Gresham's arcade: a tall round-headed window with a fanlight (one 256 x 128 cell = 2 windows)
    for (let v = 0; v < 2; v++) {
      const X = x + v * 128;
      g.save(); g.beginPath(); g.moveTo(X + 12, y + 128); g.lineTo(X + 12, y + 52); g.arc(X + 64, y + 52, 52, Math.PI, 0); g.lineTo(X + 116, y + 128); g.closePath(); g.clip();
      if (lit) { const gr = g.createLinearGradient(0, y, 0, y + 128); gr.addColorStop(0, '#ffe3a8'); gr.addColorStop(1, '#d88a3a'); g.fillStyle = gr; g.fillRect(X, y, 128, 128); rect(X + 20, y + 60, 88, 68, 'rgba(120,40,20,0.35)'); }
      else { glassDay(X, y, 128, 128, 2); rect(X + 24, y + 62, 80, 66, 'rgba(90,40,30,0.45)'); }
      bars(X + 12, y + 52, 104, 76, 4, 3, '#e8e4da', 3);
      if (!lit) { g.strokeStyle = '#e8e4da'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { const a = Math.PI + (k / 4) * Math.PI; g.beginPath(); g.moveTo(X + 64, y + 52); g.lineTo(X + 64 + Math.cos(a) * 52, y + 52 + Math.sin(a) * 52); g.stroke(); } }
      g.restore();
    }
  });

  // ---- fascia signs, one per shop unit (lit letters at night)
  signs.forEach((sg, i) => {
    const x = (i % 4) * SIGNW, y = SIGN0 + Math.floor(i / 4) * SIGNH;
    if (!lit) rect(x, y, SIGNW, SIGNH, sg.c);
    const serif = /pub|jewel|bank|book|hotel/.test(sg.t);
    const fam = serif ? 'Georgia, serif' : 'Arial, Helvetica, sans-serif';
    const lum = new THREE.Color(sg.tc); const lc = lit ? `rgb(${Math.min(255, lum.r * 300)},${Math.min(255, lum.g * 300)},${Math.min(255, lum.b * 300)})` : sg.tc;
    text(sg.n, x + SIGNW / 2, y + SIGNH / 2 + 1, `bold ${sg.n.length > 20 ? 22 : 30}px ${fam}`, lc, { maxW: SIGNW - 30 });
    if (!lit && sg.t === 'pub') { g.strokeStyle = sg.tc; g.lineWidth = 2; g.strokeRect(x + 6, y + 5, SIGNW - 12, SIGNH - 10); }
  });

  // ---- specials
  { // Eason's: the fascia (lower-case white on dark green), the clock's dial and its EASON top panels, the 1919 cartouche
    const [x, y, w, h] = R.easonName; if (!lit) rect(x, y, w, h, '#0f3b2e'); text('eason', x + w / 2, y + h / 2 + 2, 'bold 44px Arial, Helvetica, sans-serif', lit ? '#f4fff8' : '#ffffff');
    const [dx, dy, dw] = R.easonDial;
    g.fillStyle = lit ? '#fff8e6' : '#e9e6dc'; g.beginPath(); g.arc(dx + dw / 2, dy + dw / 2, 58, 0, 7); g.fill();
    g.strokeStyle = '#c9a23a'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#1a1a1a'; g.font = 'bold 13px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((s, k) => { const a = (k / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(s, dx + dw / 2 + Math.cos(a) * 44, dy + dw / 2 + Math.sin(a) * 44); });
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(dx + 64, dy + 64); g.lineTo(dx + 40, dy + 50); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(dx + 64, dy + 64); g.lineTo(dx + 70, dy + 22); g.stroke();
    const [tx, ty, tw, th] = R.easonTop; if (!lit) rect(tx, ty, tw, th, '#b8bcb8'); else rect(tx, ty, tw, th, '#e8f0e8'); text('EASON', tx + tw / 2, ty + th / 2 + 2, 'bold 40px Georgia, serif', lit ? '#20302a' : '#2a3a34'); if (!lit) { g.strokeStyle = '#c9a23a'; g.lineWidth = 4; g.strokeRect(tx + 2, ty + 2, tw - 4, th - 4); }
    const [cx, cy, cw, ch] = R.easonCart; if (!lit) { rect(cx, cy, cw, ch, '#8a8578'); text('1919', cx + cw / 2, cy + 14, 'bold 14px Georgia, serif', '#e0dcd0'); text('EASON', cx + cw / 2, cy + 40, 'bold 22px Georgia, serif', '#c85a2a'); }
  }
  { const [x, y, w, h] = R.greshamName; text('THE GRESHAM HOTEL', x + w / 2, y + h / 2 + 2, '600 40px Georgia, serif', lit ? '#ffe6b0' : '#8c8778', { maxW: w - 40 }); }
  { // CARLTON: white letters on black panels
    const [x, y] = R.carl;
    'CARLTON'.split('').forEach((c, i) => { if (!lit) rect(x + i * 64, y, 64, 64, '#141414'); text(c, x + i * 64 + 32, y + 34, 'bold 46px Arial, Helvetica, sans-serif', lit ? '#20242c' : '#f2f2ee'); });
  }
  { // the Savoy: the vertical name, the film banner over the entrance, the name on the parapet
    const [x, y, w, h] = R.savoyV; if (!lit) rect(x, y, w, h, '#101012'); 'SAVOY'.split('').forEach((c, i) => text(c, x + w / 2, y + 36 + i * 60, 'bold 44px Arial, Helvetica, sans-serif', lit ? '#fff6e0' : '#f4f4f0'));
    const [bx, by, bw, bh] = R.savoyBanner;
    if (!lit) { const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#0e1a3a'); gr.addColorStop(0.5, '#2a4a8a'); gr.addColorStop(1, '#0e1a3a'); g.fillStyle = gr; g.fillRect(bx, by, bw, bh); }
    else rect(bx, by, bw, bh, '#3a4a70');
    text('NOW SHOWING', bx + 110, by + 36, 'bold 30px Arial', lit ? '#fff' : '#ffd84a');
    text('THE LIFFEY RUN', bx + 330, by + 64, 'bold 46px Georgia, serif', '#ffffff', { maxW: 330 });
    text('★★★★★  "A TRIUMPH"', bx + 120, by + 90, 'bold 18px Arial', lit ? '#fff' : '#9cd0ff');
    for (let i = 0; i < 3; i++) { g.fillStyle = `hsl(${20 + i * 30},40%,${lit ? 70 : 55}%)`; g.beginPath(); g.arc(bx + 190 + i * 34, by + 60, 14, 0, 7); g.fill(); g.fillRect(bx + 178 + i * 34, by + 74, 24, 54); }
    const [sx, sy, sw, sh] = R.savoyTop; text('SAVOY', sx + sw / 2, sy + sh / 2 + 2, 'bold 46px Arial, Helvetica, sans-serif', lit ? '#fff0d0' : '#2a2620', { maxW: sw - 20 });
  }
  { // the Happy Ring House (3 Upper): white bells, the neon lettering in blue, the couple, the horseshoes, the clock
    const [x, y, w, h] = R.happy, blue = lit ? '#7fc4ff' : '#2a55b8', white = lit ? '#ffffff' : '#f4f4f4';
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const bell = (cx, cy) => { g.fillStyle = white; g.beginPath(); g.moveTo(cx - 14, cy + 18); g.quadraticCurveTo(cx - 12, cy - 16, cx, cy - 18); g.quadraticCurveTo(cx + 12, cy - 16, cx + 14, cy + 18); g.fill(); };
    bell(x + 108, y + 36); bell(x + 140, y + 36); g.fillStyle = lit ? '#9fd4ff' : '#6f8fd0'; g.fillRect(x + 104, y + 12, 44, 6);
    text('The', x + 124, y + 78, 'italic bold 30px Georgia, serif', white, { stroke: blue });
    text('HAPPY', x + 70, y + 112, 'bold 34px Arial', white, { stroke: blue }); text('RING', x + 190, y + 104, 'bold 34px Arial', white, { stroke: blue });
    text('HOUSE', x + 128, y + 142, 'bold 32px Arial', white, { stroke: blue });
    g.fillStyle = white; g.beginPath(); g.ellipse(x + 118, y + 214, 18, 46, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 146, y + 212, 16, 44, 0, 0, 7); g.fill();
    g.fillStyle = lit ? '#bfe0ff' : '#b8c0d0'; g.beginPath(); g.arc(x + 118, y + 162, 10, 0, 7); g.fill(); g.beginPath(); g.arc(x + 146, y + 162, 10, 0, 7); g.fill();
    for (const [hx, hy] of [[x + 30, y + 180], [x + 226, y + 170]]) { g.strokeStyle = lit ? '#e8f2ff' : '#d8d8d8'; g.lineWidth = 7; g.beginPath(); g.arc(hx, hy, 16, 0.3, Math.PI - 0.3, true); g.stroke(); }
    g.fillStyle = '#141414'; g.beginPath(); g.arc(x + 128, y + 290, 26, 0, 7); g.fill(); g.strokeStyle = lit ? '#ffb070' : '#c85a2a'; g.lineWidth = 4; g.stroke();
    if (!lit) { g.fillStyle = '#eee'; g.beginPath(); g.arc(x + 128, y + 290, 16, 0, 7); g.fill(); }
    g.restore();
  }
  { const [x, y, w, h] = R.confect; if (!lit) { rect(x, y, w, h, '#8a5a44'); g.strokeStyle = '#d8c7a8'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, w - 8, h - 8); } text('THE CONFECTIONERS HALL', x + w / 2, y + h / 2 + 2, 'bold 28px Georgia, serif', lit ? '#3a2a20' : '#efe2c4', { maxW: w - 30 }); }
  { // Funland: "COME IN AND VISIT" over the big neon name (67 Upper)
    const [x, y, w, h] = R.funland;
    if (!lit) rect(x, y, w, h, '#20103a');
    text('COME IN AND VISIT', x + w / 2, y + 26, 'bold 26px Arial', lit ? '#fff2a0' : '#ffd84a');
    ['F', 'U', 'N', 'L', 'A', 'N', 'D'].forEach((c, i) => text(c, x + 60 + i * 66, y + 84, 'bold 66px Arial', lit ? ['#ff6af0', '#7fe0ff', '#ffe46a', '#8aff8a', '#ff8a6a', '#7fe0ff', '#ff6af0'][i] : ['#e03aa0', '#2ab0e0', '#e0b020', '#30c040', '#e05030', '#2ab0e0', '#e03aa0'][i]));
  }
  { // the big advertisement over the corner of Eden Quay (invented)
    const [x, y, w, h] = R.ad;
    if (!lit) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#0f5a3a'); gr.addColorStop(1, '#063020'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    else rect(x, y, w, h, '#0a3a26');
    text('CÉAD', x + w / 2, y + 50, 'bold 50px Georgia, serif', '#ffffff'); text('MÍLE', x + w / 2, y + 100, 'bold 50px Georgia, serif', '#ffffff'); text('FÁILTE', x + w / 2, y + 150, 'bold 46px Georgia, serif', lit ? '#ffe89a' : '#f2c416');
  }
  for (const [k, seed] of [['mural', 3], ['mural2', 9]]) { // murals on the hoardings of the vacant sites
    const [x, y, w, h] = R[k], m = rng(seed);
    if (lit) { rect(x, y, w, h, '#000'); continue; }
    rect(x, y, w, h, k === 'mural' ? '#2a3a4a' : '#e8d8b0');
    for (let i = 0; i < 26; i++) { g.fillStyle = `hsl(${m() * 360},${50 + m() * 40}%,${35 + m() * 35}%)`; g.beginPath(); g.ellipse(x + m() * w, y + m() * h, 20 + m() * 90, 14 + m() * 60, m() * 3, 0, 7); g.fill(); }
    if (k === 'mural') { g.fillStyle = '#f0e8d8'; g.beginPath(); g.ellipse(x + 520, y + 128, 90, 110, 0, 0, 7); g.fill(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(x + 490, y + 110, 10, 0, 7); g.arc(x + 550, y + 110, 10, 0, 7); g.fill(); }
    else text('ÁIT DO CHÁCH', x + w / 2, y + h / 2, 'bold 70px Arial', '#2a2a2a');
    for (let i = 0; i < 8; i++) rect(x + i * 128, y, 3, h, 'rgba(0,0,0,0.35)');
  }
  { const [x, y, w, h] = R.hammam; if (!lit) rect(x, y, w, h, '#d6d1c5'); text('HAMMAM BUILDINGS', x + w / 2, y + h / 2 + 2, '600 30px Georgia, serif', lit ? '#000' : '#7c776a'); }
  { const [x, y, w, h] = R.gpane; if (lit) rect(x, y, w, h, '#ffe8c0'); else { rect(x, y, w, h, '#2e2c28'); for (let i = 0; i < 4; i++) glassDay(x + 4 + i * 63, y + 4, 58, h - 8, 1); } }
}

// ---------------------------------------------------------------------------------------------------------------------
// geometry accumulation: per chunk (the Lower and the Upper street) per material
const MATS = ['stone', 'brick', 'render', 'roof', 'slate', 'metal', 'atlas'];
const TILE = { stone: 3, brick: 1.6, render: 4, roof: 4, slate: 2, metal: 4, atlas: 1 };
function newChunk() { const c = {}; for (const m of MATS) c[m] = { p: [], n: [], uv: [], c: [] }; return c; }
const chunks = { lower: newChunk(), upper: newChunk() };

// a builder for one building on its frame
class B {
  constructor(bld, chunk) {
    this.b = bld; this.f = bld.frame; this.C = chunk; this.tint = new THREE.Color(bld.tint || '#cccccc');
  }
  // local (u, v, z) to world [x, y, z]
  P(u, v, z) { const q = this.f.at(u, v); return [q.x, z, q.z]; }
  N(du, dv, dz) { const d = this.f.d, n = this.f.n; return [d.x * du + n.x * dv, dz, d.z * du + n.z * dv]; }
  // a quad from four local points (counter-clockwise seen from outside), with the outward normal nl (local) and uvs
  quad(mat, pts, nl, uvs, col) {
    const A = this.C[mat], W = pts.map((p) => this.P(...p)), n = this.N(...nl);
    // wind it so the face points along n
    const e1 = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], e2 = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    let idx = [0, 1, 2, 0, 2, 3];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) idx = [0, 2, 1, 0, 3, 2];
    const cols = Array.isArray(col[0]) ? col : [col, col, col, col];
    for (const i of idx) { A.p.push(...W[i]); A.n.push(...n); A.uv.push(...uvs[i]); A.c.push(...cols[i]); }
  }
  // world-metre uvs for a tiled material from local points on a face with normal nl
  tuv(mat, pts, nl) {
    const t = TILE[mat];
    return pts.map(([u, v, z]) => (Math.abs(nl[2]) > 0.5 ? [u / t, v / t] : Math.abs(nl[0]) > 0.5 ? [v / t, z / t] : [u / t, z / t]));
  }
  shade(z, k = 1, col = this.tint) { // the tint, darkened at the foot of the wall (a cheap stand-in for AO)
    const s = k * (0.78 + 0.22 * Math.min(1, z / 3));
    return [col.r * s, col.g * s, col.b * s];
  }
  // a flat face on the front plane (v = const), u0..u1 x z0..z1, facing the street (-v) unless back
  wall(mat, u0, u1, z0, z1, v = 0, { back = false, col, k = 1 } = {}) {
    if (u1 - u0 < 1e-3 || z1 - z0 < 1e-3) return;
    const pts = [[u0, v, z0], [u1, v, z0], [u1, v, z1], [u0, v, z1]], nl = [0, back ? 1 : -1, 0];
    const c = col || this.tint;
    this.quad(mat, pts, nl, this.tuv(mat, pts, nl), pts.map((p) => this.shade(p[2], k, c)));
  }
  // a side face (u = const) from v0..v1, z0..z1, facing sgn (+1 = +u)
  side(mat, u, v0, v1, z0, z1, sgn, { col, k = 1 } = {}) {
    if (v1 - v0 < 1e-3 || z1 - z0 < 1e-3) return;
    const pts = [[u, v0, z0], [u, v1, z0], [u, v1, z1], [u, v0, z1]], nl = [sgn, 0, 0];
    const c = col || this.tint;
    this.quad(mat, pts, nl, this.tuv(mat, pts, nl), pts.map((p) => this.shade(p[2], k, c)));
  }
  flat(mat, u0, u1, v0, v1, z, up = true, { col, k } = {}) {
    const pts = [[u0, v0, z], [u1, v0, z], [u1, v1, z], [u0, v1, z]], nl = [0, 0, up ? 1 : -1];
    const c = col || this.tint, kk = k ?? (up ? 1 : 0.62);
    this.quad(mat, pts, nl, this.tuv(mat, pts, nl), pts.map(() => [c.r * kk, c.g * kk, c.b * kk]));
  }
  // a box standing out of (or into) the front: u0..u1, v0..v1 (v0 < v1; negative v = in front of the wall), z0..z1
  box(mat, u0, u1, v0, v1, z0, z1, { col, top = true, bottom = true, back = false } = {}) {
    this.wall(mat, u0, u1, z0, z1, v0, { col });
    this.side(mat, u0, v0, v1, z0, z1, -1, { col, k: 0.9 });
    this.side(mat, u1, v0, v1, z0, z1, 1, { col, k: 0.9 });
    if (top) this.flat(mat, u0, u1, v0, v1, z1, true, { col });
    if (bottom) this.flat(mat, u0, u1, v0, v1, z0, false, { col });
    if (back) this.wall(mat, u0, u1, z0, z1, v1, { col, back: true });
  }
  // an atlas decal on the front plane at v, from region reg (s0..s1, t0..t1 within it), lit colour white
  decal(reg, u0, u1, z0, z1, v, { s0 = 0, s1 = 1, t0 = 0, t1 = 1, col = [1, 1, 1], nl = [0, -1, 0] } = {}) {
    const pts = [[u0, v, z0], [u1, v, z0], [u1, v, z1], [u0, v, z1]];
    const uvs = [uvOf(reg, s0, t1), uvOf(reg, s1, t1), uvOf(reg, s1, t0), uvOf(reg, s0, t0)];
    this.quad('atlas', pts, nl, uvs, col);
  }
  // a decal on a side plane (u const) facing sgn, v0..v1 left to right as seen from outside
  sideDecal(reg, u, v0, v1, z0, z1, sgn, o = {}) {
    const { s0 = 0, s1 = 1, t0 = 0, t1 = 1 } = o;
    const [a, b] = sgn > 0 ? [v0, v1] : [v1, v0];
    const pts = [[u, a, z0], [u, b, z0], [u, b, z1], [u, a, z1]];
    const uvs = [uvOf(reg, s0, t1), uvOf(reg, s1, t1), uvOf(reg, s1, t0), uvOf(reg, s0, t0)];
    this.quad('atlas', pts, [sgn, 0, 0], uvs, [1, 1, 1]);
  }
  // a recessed opening on the front: the reveals in mat, the decal at the back of the recess
  opening(mat, u0, u1, z0, z1, depth, reg, o = {}) {
    if (o.backing) this.wall(mat, u0, u1, z0, z1, depth + 0.02, { k: 0.8 }); // behind cut-out glass (arched heads)
    this.side(mat, u0, 0, depth, z0, z1, 1, { k: 0.72 });
    this.side(mat, u1, 0, depth, z0, z1, -1, { k: 0.72 });
    this.flat(mat, u0, u1, 0, depth, z1, false, { k: 0.55 });
    this.flat(mat, u0, u1, 0, depth, z0, true, { k: 0.95 });
    this.decal(reg, u0, u1, z0, z1, depth, o);
  }
  // a front wall from u0 to u1 between z0 and z1 with a row of window openings: wins = [[a, b], ...] in u, sill..head
  pierced(mat, u0, u1, z0, z1, wins, sill, head, depth, reg, variant, backing = false) {
    this.wall(mat, u0, u1, z0, sill); this.wall(mat, u0, u1, head, z1);
    let u = u0;
    for (const [a, b] of wins) { this.wall(mat, u, a, sill, head); u = b; }
    this.wall(mat, u, u1, sill, head);
    wins.forEach(([a, b], i) => {
      const k = variant(i), s = [k * 0.25, k * 0.25 + 0.25];
      this.opening(mat, a, b, sill, head, depth, reg, { s0: s[0], s1: s[1], backing });
    });
  }
}
// the variant of a window: mostly dark by day's end; lit ~45% (0), dark (1), a blind (2), cool (3)
const variantAt = (seed) => { const h = hash(seed, seed * 1.37); return h < 0.42 ? 0 : h < 0.72 ? 1 : h < 0.88 ? 2 : 3; };

// ---------------------------------------------------------------------------------------------------------------------
// the generic front: shop units on the ground floor, rows of windows over, string course, cornice, parapet
const WALLMAT = { stone: 'stone', brick: 'brick', render: 'render', glass: 'render' };
const signs = [];
function signIndex(shop) { signs.push(shop); return signs.length - 1; }
const signReg = (i) => [(i % 4) * SIGNW, SIGN0 + Math.floor(i / 4) * SIGNH, SIGNW, SIGNH];
const stoneCol = new THREE.Color('#d9d4c8'), metalCol = new THREE.Color('#3a3e40'), darkCol = new THREE.Color('#1e2022');

function genericFront(k, b) {
  const W = k.f.w, D = b.depth, mat = WALLMAT[b.mat] || 'render', lv = b.lv || 5;
  const gh = b.gh || (b.mat === 'glass' ? 4.2 : 4.6), fh = b.fh || (b.win === 'sash6' ? 3.3 : 3.4);
  const top = gh + (lv - 1) * fh, cor = (b.trim || []).includes('cornice'), ph = b.mat === 'glass' ? 0.6 : 1.0;
  const H = top + (cor ? 0.55 : 0) + ph;
  const trim = new Set(b.trim || []), U0 = -W / 2, U1 = W / 2;
  // bays
  const bayW = b.mat === 'glass' ? W : b.win === 'sash6' ? 2.3 : 2.6;
  const nb = Math.max(1, Math.round(W / bayW)), bw = W / nb;
  // ---- ground floor
  if (b.georgian) georgianGround(k, b, gh);
  else shopfronts(k, b, U0, U1, gh, mat);
  if (trim.has('string') || b.mat === 'stone') k.box(mat, U0 - 0.05, U1 + 0.05, -0.18, 0.05, gh - 0.05, gh + 0.3, { top: true });
  // ---- upper floors
  const seed = (b.s0 || 1) * 7.1 + b.id.length;
  for (let f = 0; f < lv - 1; f++) {
    const z0 = gh + f * fh + (trim.has('string') || b.mat === 'stone' ? 0.3 : 0) * (f === 0 ? 1 : 0), z1 = gh + (f + 1) * fh;
    if (b.mat === 'glass') { // ribbon glazing: a strip of glass between spandrels
      const sill = gh + f * fh + 0.95, head = gh + (f + 1) * fh - 0.35;
      k.wall('render', U0, U1, z0, sill); k.wall('render', U0, U1, head, z1);
      k.wall('render', U0, U0 + 0.4, sill, head); k.wall('render', U1 - 0.4, U1, sill, head);
      const v = variantAt(seed + f);
      k.opening('render', U0 + 0.4, U1 - 0.4, sill, head, 0.12, R.mod, { s0: v * 0.25, s1: v * 0.25 + 0.25 * Math.min(1, (W - 0.8) / 8) });
      continue;
    }
    const tall = b.win === 'sash6' ? [0.62, 0.66, 0.56, 0.46][f] || 0.46 : f === lv - 2 && trim.has('attic') ? 0.45 : 0.6;
    const sill = gh + f * fh + (f === 0 ? 0.75 : 0.85), head = Math.min(z1 - 0.35, sill + fh * tall + 0.2);
    const ww = Math.min(b.win === 'case' ? 1.5 : 1.25, bw * 0.52);
    const wins = []; for (let i = 0; i < nb; i++) { const c = U0 + bw * (i + 0.5); wins.push([c - ww / 2, c + ww / 2]); }
    const reg = R[b.win] || R.sash2, depth = b.mat === 'brick' ? 0.24 : 0.3;
    k.pierced(mat, U0, U1, z0, z1, wins, sill, head, depth, reg, (i) => variantAt(seed + f * 13 + i), /arch|oval/.test(b.win));
    // dressings: sills, window pediments on the first floor, pilasters between bays
    for (const [a, c] of wins) {
      k.box(mat === 'brick' ? 'stone' : mat, a - 0.08, c + 0.08, -0.08, 0, sill - 0.12, sill, { col: mat === 'brick' ? stoneCol : undefined, bottom: false });
      if (trim.has('pedim') && f === 0) k.box(mat, a - 0.15, c + 0.15, -0.14, 0, head + 0.05, head + 0.3, { bottom: true });
    }
  }
  if (trim.has('pil') && nb > 1) for (let i = 0; i <= nb; i++) { const u = U0 + i * bw; k.box(mat, Math.max(U0, u - 0.22), Math.min(U1, u + 0.22), -0.12, 0, gh + 0.3, top, { top: false, bottom: false }); }
  if (trim.has('giant')) giantOrder(k, b, U0, U1, nb, bw, gh, fh, mat);
  if (trim.has('quoins')) for (const [u, sg] of [[U0, 1], [U1, -1]]) for (let q = 0, z = gh + 0.3; z < top - 0.3; q++, z += 0.6) { const w = q % 2 ? 0.5 : 0.85; k.box('stone', sg > 0 ? u : u - w, sg > 0 ? u + w : u, -0.05, 0, z, z + 0.3, { col: stoneCol, top: false, bottom: false }); }
  // ---- cornice, parapet / balustrade, roof
  if (cor) { k.box(mat, U0 - 0.1, U1 + 0.1, -0.45, 0, top, top + 0.55); }
  const pz = top + (cor ? 0.55 : 0);
  if (trim.has('balus')) {
    k.box(mat, U0, U1, -0.1, 0.25, pz, pz + 0.15, { bottom: false });
    k.decal(R.balus, U0 + 0.2, U1 - 0.2, pz + 0.15, pz + ph - 0.15, 0.05);
    k.box(mat, U0, U1, -0.15, 0.25, pz + ph - 0.15, pz + ph);
    for (const u of [U0, U1 - 0.4]) k.box(mat, u, u + 0.4, -0.1, 0.3, pz, pz + ph);
  } else k.wall(mat, U0, U1, pz, H, 0);
  if (b.name) k.decal(R.hammam, -Math.min(6, W * 0.35), Math.min(6, W * 0.35), pz + 0.1, pz + 0.85, -0.02);
  body(k, b, H, mat);
  // signs the street is known for
  if (b.sign === 'happyring') { const w = Math.min(W - 0.6, 4.4); k.decal(R.happy, -w / 2, w / 2, gh + 1.0, gh + 1.0 + w * 1.25, -0.35); k.box('metal', -0.05, 0.05, -0.35, 0, gh + 1, gh + 1 + w * 1.25, { col: metalCol }); }
  if (b.sign === 'confect') k.decal(R.confect, U0 + 0.25, U1 - 0.25, top - 1.3, top - 0.55, -0.03);
  if (b.sign === 'funland') { k.decal(R.funland, U0 + 0.2, U1 - 0.2, gh + fh * 1.1, gh + fh * 1.1 + (W - 0.4) * 0.25, -0.12); }
  if (b.ad === 'corner') cornerAd(k, b, H);
  // the exposed ends at a side street: the same windows round the corner
  for (const [end, u, sgn] of [[b.endL, U0, -1], [b.endR, U1, 1]]) if (end && !b.georgian) sideWindows(k, b, u, sgn, gh, fh, lv, mat);
  return H;
}

// the rest of the building: the side returns, the back and the roof (flat, lead-grey), the parapet's back
function body(k, b, H, mat, { roofZ = H - 0.9 } = {}) {
  const W = k.f.w, D = b.depth, U0 = -W / 2, U1 = W / 2;
  const side = b.mat === 'glass' ? 'render' : mat;
  k.side(side, U0, 0, D, 0, H, -1, { k: 0.85 }); k.side(side, U1, 0, D, 0, H, 1, { k: 0.85 });
  k.wall(side === 'stone' ? 'render' : side, U0, U1, 0, H, D, { back: true, k: 0.8 });
  const roofCol = new THREE.Color('#5a5d60');
  k.flat('roof', U0, U1, 0.3, D, roofZ, true, { col: roofCol, k: 1 });
  k.wall(mat, U0, U1, roofZ, H, 0.3, { back: true, k: 0.7 });
  if (W > 7 && D > 8) k.box('metal', -W * 0.2, W * 0.15, D * 0.4, D * 0.7, roofZ, roofZ + 1.6, { col: new THREE.Color('#6a6e70'), bottom: false }); // plant room
}

// shop units across the ground floor: pilasters, a fascia with the sign, the display window, a stall riser
function shopfronts(k, b, U0, U1, gh, mat) {
  const list = b.shops || (b.shop ? [b.shop] : []);
  if (!list.length) { k.wall(mat, U0, U1, 0, gh); return; }
  const n = list.length, uw = (U1 - U0) / n;
  list.forEach((s, i) => {
    const a = U0 + i * uw, c = a + uw, P = 0.32;
    const fasciaCol = new THREE.Color(s.c), fz0 = gh - 1.05, fz1 = gh - 0.3;
    // pilasters (stone on stone buildings, painted timber otherwise) and the entablature over the fascia
    const pm = mat === 'stone' ? 'stone' : 'metal', pc = mat === 'stone' ? undefined : fasciaCol;
    k.box(pm, a, a + P, -0.14, 0, 0, gh - 0.3, { col: pc, top: false, bottom: false });
    k.box(pm, c - P, c, -0.14, 0, 0, gh - 0.3, { col: pc, top: false, bottom: false });
    k.wall(mat, a, c, gh - 0.3, gh);
    // the fascia board and its sign
    k.box('metal', a + P, c - P, -0.2, 0, fz0, fz1, { col: fasciaCol });
    const si = signIndex(s);
    k.decal(signReg(si), a + P + 0.1, c - P - 0.1, fz0 + 0.06, fz1 - 0.06, -0.205);
    // the display: recessed glass over a stall riser
    const reg = R['s_' + s.t] || R.s_shop, riser = s.t === 'pub' ? 0.0 : 0.45;
    if (riser > 0) k.box('metal', a + P, c - P, -0.02, 0.28, 0, riser, { col: s.t === 'food' || s.t === 'diner' ? fasciaCol : darkCol, bottom: false });
    k.opening('metal', a + P, c - P, riser, fz0, 0.28, reg, { s1: Math.min(1, (c - a - 2 * P) / 5.5) });
    // an awning (the Happy Ring House's green one)
    if (s.awning) awning(k, a + P, c - P, fz0, new THREE.Color(s.awning));
  });
}
function awning(k, u0, u1, z, col) {
  const pts = [[u0, 0, z + 0.1], [u1, 0, z + 0.1], [u1, -1.4, z - 0.7], [u0, -1.4, z - 0.7]];
  k.quad('metal', pts, [0, -0.5, 0.86], k.tuv('metal', pts, [0, -1, 0]), [col.r, col.g, col.b]);
  k.quad('metal', pts, [0, 0.5, -0.86], k.tuv('metal', pts, [0, -1, 0]), [col.r * 0.5, col.g * 0.5, col.b * 0.5]);
  k.wall('metal', u0, u1, z - 0.95, z - 0.7, -1.4, { col });
}
// Georgian ground floor (No. 42): a rusticated base with the door and fanlight, windows, railings in front
function georgianGround(k, b, gh) {
  const W = k.f.w, U0 = -W / 2, U1 = W / 2, rust = new THREE.Color('#bdb8ab');
  const d0 = U0 + 0.5, d1 = d0 + 1.2;
  k.wall('stone', U0, d0, 0, gh, 0, { col: rust }); k.wall('stone', d1, U1, 0, 0.9, 0, { col: rust }); k.wall('stone', d1, U1, gh - 0.8, gh, 0, { col: rust });
  k.wall('stone', d0, d1, 3.05, gh, 0, { col: rust });
  k.opening('stone', d0, d1, 0.15, 3.05, 0.4, R.door);
  const n = Math.max(1, Math.round((U1 - d1) / 2.3)), bw = (U1 - d1) / n;
  let u = d1;
  for (let i = 0; i < n; i++) { const c = d1 + bw * (i + 0.5); k.wall('stone', u, c - 0.6, 0.9, gh - 0.8, 0, { col: rust }); k.opening('stone', c - 0.6, c + 0.6, 0.9, gh - 0.8, 0.3, R.sash6, { s0: 0.25, s1: 0.5 }); u = c + 0.6; }
  k.wall('stone', u, U1, 0.9, gh - 0.8, 0, { col: rust });
  k.decal(R.rail, d1 + 0.1, U1, 0, 1.1, -1.1); k.decal(R.rail, U0, d0 - 0.1, 0, 1.1, -1.1);
}
// columns standing in front of the first to third floors (29 Lower, the Central Bar)
function giantOrder(k, b, U0, U1, nb, bw, gh, fh, mat) {
  const z0 = gh + 0.3, z1 = gh + Math.min(3, (b.lv || 5) - 1) * fh - 0.2;
  for (let i = 0; i <= nb; i++) {
    const u = Math.max(U0 + 0.35, Math.min(U1 - 0.35, U0 + i * bw)), r = 0.3;
    column(k, mat, u, -0.35, z0, z1, r);
    k.box(mat, u - 0.45, u + 0.45, -0.8, 0.05, z1, z1 + 0.35);
  }
  k.box(mat, U0, U1, -0.6, 0, z1 + 0.35, z1 + 0.8);
}
function column(k, mat, u, v, z0, z1, r, sides = 8) {
  const col = k.tint;
  for (let s = 0; s < sides; s++) {
    const a0 = (s / sides) * Math.PI * 2, a1 = ((s + 1) / sides) * Math.PI * 2;
    const p0 = [u + Math.cos(a0) * r, v + Math.sin(a0) * r], p1 = [u + Math.cos(a1) * r, v + Math.sin(a1) * r];
    const am = (a0 + a1) / 2, nl = [Math.cos(am), Math.sin(am), 0];
    if (nl[1] > 0.6) continue; // the back, against the wall
    const pts = [[p0[0], p0[1], z0], [p1[0], p1[1], z0], [p1[0], p1[1], z1], [p0[0], p0[1], z1]];
    const t = TILE[mat];
    k.quad(mat, pts, nl, [[s / 4, z0 / t], [(s + 1) / 4, z0 / t], [(s + 1) / 4, z1 / t], [s / 4, z1 / t]], pts.map((p) => k.shade(p[2], 0.8 + 0.2 * Math.cos(am + 1), col)));
  }
  k.box(mat, u - r * 1.25, u + r * 1.25, v - r * 1.25, v + r * 1.25, z0, z0 + 0.3, { bottom: false });
}
// windows round an exposed corner, on the first bays of the side return
function sideWindows(k, b, u, sgn, gh, fh, lv, mat) {
  if (b.mat === 'glass') return;
  const D = Math.min(b.depth, 9), n = Math.max(1, Math.floor(D / 2.8)), bw = D / n;
  for (let f = 0; f < lv - 1; f++) {
    const sill = gh + f * fh + 0.85, head = sill + fh * 0.55;
    for (let i = 0; i < n; i++) {
      const c = bw * (i + 0.5), v = variantAt(b.s0 * 3 + f * 7 + i);
      k.sideDecal(R[b.win] || R.sash2, u + sgn * 0.02, c - 0.6, c + 0.6, sill, head, sgn, { s0: v * 0.25, s1: v * 0.25 + 0.25 });
    }
  }
  // the shop's side window
  if (b.shop || b.shops) k.sideDecal(R['s_' + ((b.shops || [b.shop])[0].t)] || R.s_shop, u + sgn * 0.02, 0.6, Math.min(D, 5.5), 0.45, gh - 1.1, sgn, { s1: 0.8 });
}
// the big advertisement on the corner of Eden Quay (1 Lower), over the quay
function cornerAd(k, b, H) {
  const W = k.f.w, u = b.side === 'E' ? W / 2 : -W / 2, sgn = b.side === 'E' ? 1 : -1;
  k.sideDecal(R.ad, u + sgn * 0.25, 1.0, Math.min(b.depth - 0.5, 8.5), H - 6.8, H - 0.6, sgn);
  k.box('metal', u - (sgn > 0 ? 0 : 0.25), u + (sgn > 0 ? 0.25 : 0), 0.9, Math.min(b.depth - 0.4, 8.6), H - 7, H - 6.8, { col: metalCol });
}

// ---------------------------------------------------------------------------------------------------------------------
// THE GRESHAM (Robert Atkinson's 1927 rebuild): a long Portland stone front. A ground-floor arcade of tall
// round-headed windows between rusticated piers, the hotel's name on the frieze over it, the glass canopy out over
// the footpath at the doors, a balustraded balcony along the first floor with the flags, four storeys of plain
// windows, the end pavilions advanced with carved figures, a deep cornice, a raised central attic with urns, and
// slate mansards with dormers on the wings (refs 01-03).
function gresham(k, b) {
  const W = k.f.w, U0 = -W / 2, U1 = W / 2, st = 'stone', rust = new THREE.Color('#d2cdc2');
  const GH = 6.4, BAL = 7.2, FH = 3.2, NF = 4, TOP = BAL + NF * FH, COR = TOP + 0.8;       // 20.0 / 20.8
  const nArch = 9, aw = W / nArch;
  // the arcade: piers, arches, spandrels; the three middle bays hold the entrance under the canopy
  for (let i = 0; i < nArch; i++) {
    const a = U0 + i * aw, c = a + aw, m = (a + c) / 2, hw = aw * 0.32;
    k.wall(st, a, m - hw, 0, GH, 0, { col: rust }); k.wall(st, m + hw, c, 0, GH, 0, { col: rust });
    k.wall(st, m - hw, m + hw, GH - 0.55, GH, 0, { col: rust });
    for (let z = 0.6; z < GH - 0.6; z += 0.55) k.box(st, a, a + 0.12, -0.04, 0, z, z + 0.04, { col: rust, top: false }); // rustication joints
    const door = i >= 3 && i <= 5;
    if (door && i === 4) k.opening(st, m - hw, m + hw, 0, GH - 0.55, 0.45, R.gdoor);
    else if (door) { k.opening(st, m - hw, m + hw, 0.0, GH - 0.55, 0.4, R.s_garch, { s0: 0.03, s1: 0.47, backing: true }); }
    else { k.wall(st, m - hw, m + hw, 0, 0.9, 0, { col: rust }); k.opening(st, m - hw, m + hw, 0.9, GH - 0.55, 0.35, R.s_garch, { s0: i % 2 ? 0.53 : 0.03, s1: i % 2 ? 0.97 : 0.47, backing: true }); }
    k.box(st, m - 0.25, m + 0.25, -0.18, 0, GH - 0.75, GH - 0.25); // keystone
  }
  // the frieze with the name, the balcony slab, balustrade and the flags
  k.wall(st, U0, U1, GH, BAL, 0);
  k.decal(R.greshamName, -Math.min(9, W * 0.33), Math.min(9, W * 0.33), GH + 0.12, GH + 0.68, -0.02);
  k.box(st, U0 - 0.1, U1 + 0.1, -0.9, 0, BAL - 0.05, BAL + 0.2);
  k.decal(R.balus, U0 + 0.2, U1 - 0.2, BAL + 0.2, BAL + 1.1, -0.8);
  k.box(st, U0 - 0.1, U1 + 0.1, -0.9, -0.6, BAL + 1.1, BAL + 1.25);
  for (let i = 0; i <= nArch; i += 3) k.box(st, U0 + i * aw - 0.25, U0 + i * aw + 0.25, -0.9, -0.55, BAL + 0.2, BAL + 1.1);
  for (const [u, reg] of [[-aw * 1.2, R.flagIE], [aw * 1.2, R.flagEU], [0, R.flagH]]) flag(k, u, BAL + 1.2, reg);
  // four storeys of windows; the end pavilions (two bays) stand forward
  const nb = 11, bw = W / nb, PAV = 2 * bw;
  for (let f = 0; f < NF; f++) {
    const z0 = BAL + f * FH, z1 = z0 + FH, sill = z0 + (f === 0 ? 0.9 : 0.75), head = sill + (f === 0 ? 2.0 : 1.75);
    const wins = []; for (let i = 0; i < nb; i++) { const c = U0 + bw * (i + 0.5); wins.push([c - 0.62, c + 0.62]); }
    k.pierced(st, U0, U1, z0, z1, wins, sill, head, 0.32, R.sash2, (i) => variantAt(i * 3 + f * 17 + 5));
    for (const [a, c] of wins) { k.box(st, a - 0.1, c + 0.1, -0.1, 0, sill - 0.14, sill, { bottom: false }); if (f === 0) k.box(st, a - 0.18, c + 0.18, -0.15, 0, head + 0.05, head + 0.3); }
  }
  for (const [a, c] of [[U0, U0 + PAV], [U1 - PAV, U1]]) { // pavilions: a pilaster strip each side, a figure on a plinth
    k.box(st, a, a + 0.35, -0.3, 0, BAL + 1.25, TOP, { bottom: false }); k.box(st, c - 0.35, c, -0.3, 0, BAL + 1.25, TOP, { bottom: false });
    const m = (a + c) / 2; k.box(st, m - 0.6, m + 0.6, -0.5, 0, TOP - 3.6, TOP - 3.3); k.box(st, m - 0.35, m + 0.35, -0.45, -0.05, TOP - 3.3, TOP - 1.9);
  }
  // the cornice, a blocking course
  k.box(st, U0 - 0.2, U1 + 0.2, -0.7, 0, TOP, COR);
  k.box(st, U0, U1, -0.2, 0.2, COR, COR + 0.6, { bottom: false });
  // the central attic (five bays) with its pediment block and urns; mansards with dormers on the wings
  const aU = bw * 2.5, AT = COR + 3.4;
  k.box(st, -aU, aU, 0.2, 5, COR, AT, { bottom: false });
  for (let i = -2; i <= 2; i++) k.decal(R.sash2, i * bw - 0.5, i * bw + 0.5, COR + 0.9, COR + 2.5, 0.19, { s0: 0.25 * variantAt(i + 40), s1: 0.25 * variantAt(i + 40) + 0.25 });
  k.box(st, -aU - 0.15, aU + 0.15, 0.05, 5.1, AT, AT + 0.35);
  for (const u of [-aU, aU]) urn(k, u, 0.6, AT + 0.35);
  k.box(st, -1.2, 1.2, 0.1, 1.2, AT + 0.35, AT + 1.4); urn(k, 0, 0.6, AT + 1.4);
  const slate = new THREE.Color('#4a4f55');
  for (const [a, c] of [[U0 + 0.3, -aU], [aU, U1 - 0.3]]) {
    const z0 = COR + 0.6, z1 = z0 + 2.6;
    const pts = [[a, 0.6, z0], [c, 0.6, z0], [c, 2.2, z1], [a, 2.2, z1]];
    k.quad('slate', pts, [0, -0.85, 0.52], k.tuv('slate', pts, [0, -1, 0]).map(([u, z]) => [u, z * 1.2]), [slate.r, slate.g, slate.b]);
    k.flat('roof', a, c, 2.2, b.depth - 0.5, z1, true, { col: new THREE.Color('#5a5d60') });
    for (const s of [a, c]) k.side(st, s, 0.6, 2.2, z0, z1, s === a ? -1 : 1, { k: 0.8 });
    const n = Math.max(1, Math.round((c - a) / 3)), dw = (c - a) / n;
    for (let i = 0; i < n; i++) { const m = a + dw * (i + 0.5); k.box(st, m - 0.65, m + 0.65, 0.9, 1.6, z0 + 0.3, z0 + 2.0, { bottom: false }); k.decal(R.dormer, m - 0.5, m + 0.5, z0 + 0.35, z0 + 1.9, 0.89, { s0: 0.25 * variantAt(i + 60 + a), s1: 0.25 * variantAt(i + 60 + a) + 0.25 }); }
  }
  // the canopy over the doors: a glass roof on a bronze frame, tie rods back to the wall, the name on its edge
  const cu = aw * 1.5, CZ = 4.3, CD = 3.6;
  k.box('metal', -cu, cu, -CD, 0, CZ, CZ + 0.3, { col: new THREE.Color('#2e2a24') });
  k.decal(R.canopy, -cu + 0.1, cu - 0.1, -CD + 0.1, -0.1, CZ - 0.01, { nl: [0, 0, -1] });
  for (const u of [-cu + 0.3, 0, cu - 0.3]) { k.box('metal', u - 0.03, u + 0.03, -CD + 0.2, 0, CZ + 0.3, CZ + 0.36, { col: metalCol }); tie(k, u, -CD + 0.3, CZ + 0.3, 0, CZ + 2.0); }
  canopyUnderside(k, -cu, cu, -CD, CZ);
  body(k, b, COR + 0.6, st);
  // the side facing Cathal Brugha Street direction: windows round the corner
  if (b.endL) sideWindows(k, { ...b, win: 'sash2', lv: 6 }, U0, -1, BAL, FH, 5, st);
}
function canopyUnderside(k, u0, u1, v0, z) { // the soffit decal (so it reads lit from below at night)
  const pts = [[u0 + 0.1, v0 + 0.1, z - 0.02], [u1 - 0.1, v0 + 0.1, z - 0.02], [u1 - 0.1, -0.1, z - 0.02], [u0 + 0.1, -0.1, z - 0.02]];
  const reg = R.gpane; k.quad('atlas', pts, [0, 0, -1], [uvOf(reg, 0, 1), uvOf(reg, 1, 1), uvOf(reg, 1, 0), uvOf(reg, 0, 0)], [1, 1, 1]);
}
function tie(k, u, v0, z0, v1, z1) {
  const pts = [[u - 0.025, v0, z0], [u + 0.025, v0, z0], [u + 0.025, v1, z1], [u - 0.025, v1, z1]];
  k.quad('metal', pts, [0, -0.7, 0.7], [[0, 0], [0.1, 0], [0.1, 1], [0, 1]], [0.25, 0.25, 0.25]);
  k.quad('metal', pts, [0, 0.7, -0.7], [[0, 0], [0.1, 0], [0.1, 1], [0, 1]], [0.2, 0.2, 0.2]);
}
function urn(k, u, v, z) { column(k, 'stone', u, v, z, z + 0.5, 0.28, 6); k.box('stone', u - 0.2, u + 0.2, v - 0.2, v + 0.2, z + 0.5, z + 0.95); column(k, 'stone', u, v, z + 0.95, z + 1.2, 0.08, 5); }
function flag(k, u, z, reg) { // a flagpole leaning out from the balcony with its flag hanging
  const len = 3.2, a = 0.6, v1 = -Math.sin(a) * len - 0.8, z1 = z + Math.cos(a) * len;
  const pts = [[u - 0.04, -0.8, z], [u + 0.04, -0.8, z], [u + 0.04, v1, z1], [u - 0.04, v1, z1]];
  k.quad('metal', pts, [0, -0.8, 0.6], [[0, 0], [0.1, 0], [0.1, 1], [0, 1]], [0.7, 0.7, 0.72]);
  k.quad('metal', pts, [0, 0.8, -0.6], [[0, 0], [0.1, 0], [0.1, 1], [0, 1]], [0.5, 0.5, 0.52]);
  // the flag, hanging from the pole's upper half (both faces)
  const fu = 1.4, p = (t) => [-0.8 + (v1 + 0.8) * t, z + (z1 - z) * t];
  const [va, za] = p(0.45), [vb, zb] = p(0.98);
  for (const s of [1, -1]) {
    const q = [[u, va, za - 0.9], [u + s * fu, vb, zb - 1.2], [u + s * fu, vb, zb], [u, va, za + 0.1]];
    k.quad('atlas', s > 0 ? q : [q[1], q[0], q[3], q[2]], [0, -1, 0].map((x) => x * s), s > 0 ? [uvOf(reg, 0, 1), uvOf(reg, 1, 1), uvOf(reg, 1, 0), uvOf(reg, 0, 0)] : [uvOf(reg, 1, 1), uvOf(reg, 0, 1), uvOf(reg, 0, 0), uvOf(reg, 1, 0)], [1, 1, 1]);
  }
}

// THE SAVOY (1929; the front remade since): pale stone, a row of small windows along the top storey, the film banner
// across the first floor over the glazed foyer with its poster cases, the black side bay and the vertical SAVOY sign
// (ref 04); SAVOY on the parapet
function savoy(k, b) {
  const W = k.f.w, U0 = -W / 2, U1 = W / 2, st = 'stone', H = 19.5, GH = 4.4;
  const blk = new THREE.Color('#161618');
  const sideW = 2.6; // the black bay at the right with the exit doors
  // the foyer: glazing with poster cases, a stone pier at the left
  k.wall(st, U0, U0 + 1.2, 0, GH, 0);
  k.opening('metal', U0 + 1.2, U1 - sideW, 0, GH - 0.4, 0.3, R.s_cinema, { s1: 1 });
  k.wall(st, U0 + 1.2, U1 - sideW, GH - 0.4, GH, 0);
  k.box('metal', U1 - sideW, U1, -0.1, 0, 0, H - 2, { col: blk, bottom: false });
  k.decal(R.s_hoard, U1 - sideW + 0.3, U1 - 0.3, 0, 2.6, -0.11, { s0: 0.3, s1: 0.5 });
  // the vertical name at the left of the foyer
  k.box('metal', U0 + 1.25, U0 + 1.35, -0.9, 0, 0.4, GH + 0.2, { col: blk });
  k.sideDecal(R.savoyV, U0 + 1.24, -0.85, -0.05, 0.5, GH + 0.1, -1);
  k.sideDecal(R.savoyV, U0 + 1.36, -0.85, -0.05, 0.5, GH + 0.1, 1);
  k.wall(st, U1 - sideW, U1, H - 2, H, 0);
  // the banner
  const bz0 = GH + 0.4, bz1 = GH + 3.9;
  k.box('metal', U0 + 0.9, U1 - sideW - 0.2, -0.35, 0, bz0 - 0.1, bz1 + 0.1, { col: blk });
  k.decal(R.savoyBanner, U0 + 1.0, U1 - sideW - 0.3, bz0, bz1, -0.36);
  k.wall(st, U0, U0 + 0.9, GH, H, 0); k.wall(st, U0 + 0.9, U1 - sideW, GH, bz0 - 0.1, 0);
  k.wall(st, U0 + 0.9, U1 - sideW - 0.2, bz1 + 0.1, bz1 + 0.6, 0); k.wall(st, U1 - sideW - 0.2, U1 - sideW, bz0 - 0.1, bz1 + 0.6, 0);
  // two storeys of plain stone with a few windows, the top storey's row of small windows, a plain parapet
  const z2 = bz1 + 0.6, z3 = H - 4.2;
  const wins = []; const n = Math.max(3, Math.round((W - sideW) / 2.4)), bw = (W - sideW - 1) / n;
  for (let i = 0; i < n; i++) { const c = U0 + 0.5 + bw * (i + 0.5); wins.push([c - 0.5, c + 0.5]); }
  k.pierced(st, U0 + 0.9, U1 - sideW, z2, z3, wins.filter((w) => w[0] > U0 + 1), z2 + 2.2, z2 + 3.9, 0.3, R.case, (i) => variantAt(i + 90));
  k.pierced(st, U0, U1 - sideW, z3, H, wins, z3 + 1.2, z3 + 2.4, 0.25, R.case, (i) => variantAt(i + 95));
  k.box(st, U0 - 0.1, U1 - sideW, -0.3, 0, H - 1.3, H - 1.0);
  k.decal(R.savoyTop, -W * 0.2 - sideW / 2, W * 0.2 - sideW / 2, H - 0.95, H - 0.1, -0.02);
  body(k, b, H, st);
}

// THE CARLTON (1938): a pale stone front, giant pilasters between tall blue-glazed windows, CARLTON in white letters on
// black panels across them, red and white torch finials on the parapet (ref 05); the ground floor painted, shut up
function carlton(k, b) {
  const W = k.f.w, U0 = -W / 2, U1 = W / 2, st = 'stone', GH = 4.6, H = 17.5, render = new THREE.Color('#e8e2cf');
  const n = 7, side = Math.max(1.2, W * 0.1), bw = (W - 2 * side) / n;
  // ground floor: painted render with shut doors and poster frames under a plain fascia
  k.wall('render', U0, U1, 0, GH, 0, { col: render });
  for (let i = 0; i < 4; i++) { const c = U0 + (W * (i + 0.5)) / 4; k.opening('metal', c - 1.1, c + 1.1, 0.1, 3.2, 0.15, R.s_hoard, { s0: 0.05 + i * 0.2, s1: 0.2 + i * 0.2 }); }
  k.box('render', U0, U1, -0.3, 0, GH - 0.1, GH + 0.4, { col: render });
  // the upper front: side panels, pilasters with capitals, the tall windows with the letters across
  const z0 = GH + 0.4, wz0 = GH + 1.2, wz1 = H - 2.6;
  k.wall(st, U0, U0 + side, z0, H, 0); k.wall(st, U1 - side, U1, z0, H, 0);
  const wins = []; for (let i = 0; i < n; i++) { const a = U0 + side + i * bw; wins.push([a + 0.35, a + bw - 0.35]); }
  k.pierced(st, U0 + side, U1 - side, z0, H, wins, wz0, wz1, 0.3, R.deco, () => 0);
  // the letters: black panels part way up each window, standing just proud of the glass
  const lz0 = wz0 + (wz1 - wz0) * 0.42, lz1 = lz0 + Math.min(1.9, bw - 0.7);
  wins.forEach(([a, c], i) => k.decal(R.carl, a, c, lz0, lz1, 0.28, { s0: i / 7, s1: (i + 1) / 7 }));
  for (let i = 0; i <= n; i++) { const u = U0 + side + i * bw; k.box(st, u - 0.35, u + 0.35, -0.2, 0, z0, wz1 + 0.2, { bottom: false }); k.box(st, u - 0.42, u + 0.42, -0.28, 0, wz1 + 0.2, wz1 + 0.7); }
  k.box(st, U0 - 0.1, U1 + 0.1, -0.5, 0, H - 1.6, H - 1.1);
  k.box(st, U0, U1, -0.1, 0.2, H - 0.3, H, { bottom: false });
  // the torch finials (red and white) at the ends of the parapet
  for (const u of [U0 + side * 0.6, U1 - side * 0.6]) { k.box('render', u - 0.3, u + 0.3, -0.3, 0.3, H, H + 0.5, { col: new THREE.Color('#f2efe6') }); column(k, 'render', u, 0, H + 0.5, H + 1.3, 0.34, 6); k.box('render', u - 0.2, u + 0.2, -0.2, 0.2, H + 1.3, H + 1.5, { col: new THREE.Color('#c0282a') }); }
  body(k, b, H, st);
}

// EASON'S (1919): on the corner of Abbey Street Middle; its narrow end on O'Connell Street with the clock on a
// bracket, the long front on Abbey Street. Pink granite ground floor with the arched 1919 entrance and the "eason"
// fascia, Portland stone over with Ionic pilasters and sash windows, a cornice and a balustrade (refs 08-11).
function eason(k, b) {
  const W = k.f.w, D = b.depth, U0 = -W / 2, U1 = W / 2, st = 'stone', GH = 4.8, FH = 3.4, NF = 4, TOP = GH + NF * FH, H = TOP + 1.5;
  const gran = new THREE.Color('#b08a80');
  // ---- the long front on Abbey Street (u runs west to east, U1 is the O'Connell Street end)
  const nb = Math.max(4, Math.round(W / 2.8)), bw = W / nb;
  for (let i = 0; i < nb; i++) {
    const a = U0 + i * bw, c = a + bw, arch = i === nb - 3;
    k.wall(st, a, a + 0.45, 0, GH, 0, { col: gran }); k.wall(st, c - 0.1, c, 0, GH, 0, { col: gran });
    if (arch) { k.opening(st, a + 0.45, c - 0.1, 0, GH - 1.2, 0.5, R.s_book, { s1: 0.5 }); k.wall(st, a + 0.45, c - 0.1, GH - 1.2, GH, 0, { col: gran }); k.decal(R.easonCart, a + 0.9, c - 0.55, GH - 1.1, GH - 0.3, -0.03); }
    else { k.box('metal', a + 0.45, c - 0.1, -0.2, 0, GH - 1.0, GH - 0.3, { col: new THREE.Color('#0f3b2e') }); k.decal(R.easonName, a + 0.6, c - 0.25, GH - 0.95, GH - 0.35, -0.205); k.opening('metal', a + 0.45, c - 0.1, 0.4, GH - 1.0, 0.28, R.s_book, { s1: Math.min(1, (bw - 0.55) / 5.5) }); k.wall(st, a + 0.45, c - 0.1, 0, 0.4, 0, { col: gran }); k.wall(st, a + 0.45, c - 0.1, GH - 0.3, GH, 0, { col: gran }); }
  }
  k.box(st, U0 - 0.05, U1 + 0.05, -0.2, 0.05, GH, GH + 0.35);
  for (let f = 0; f < NF; f++) {
    const z0 = GH + 0.35 * (f === 0 ? 1 : 0) + f * FH, z1 = GH + (f + 1) * FH, sill = GH + f * FH + 0.8, head = sill + (f === NF - 1 ? 1.5 : 1.95);
    const wins = []; for (let i = 0; i < nb; i++) { const c = U0 + bw * (i + 0.5); wins.push([c - 0.62, c + 0.62]); }
    k.pierced(st, U0, U1, z0, z1, wins, sill, head, 0.3, R.sash2, (i) => variantAt(i * 5 + f * 11 + 3));
  }
  for (let i = 0; i <= nb; i++) { const u = Math.max(U0 + 0.3, Math.min(U1 - 0.3, U0 + i * bw)); k.box(st, u - 0.3, u + 0.3, -0.16, 0, GH + 0.35, TOP - 0.1, { bottom: false }); k.box(st, u - 0.4, u + 0.4, -0.28, 0, TOP - 0.6, TOP - 0.1); }
  k.box(st, U0 - 0.15, U1 + 0.15, -0.55, 0, TOP, TOP + 0.5);
  k.box(st, U0, U1, -0.1, 0.2, TOP + 0.5, TOP + 0.65, { bottom: false });
  k.decal(R.balus, U0 + 0.2, U1 - 0.2, TOP + 0.65, H - 0.15, 0.0);
  k.box(st, U0, U1, -0.15, 0.2, H - 0.15, H);
  // ---- the O'Connell Street end (u = U1, facing +u): the shopfront, the pilasters, windows, the clock
  const e = U1;
  k.side(st, e, 0, D, 0, H, 1);
  k.sideDecal(R.easonName, e + 0.21, 0.4, D - 0.4, GH - 0.95, GH - 0.35, 1);
  k.box('metal', e, e + 0.2, 0.3, D - 0.3, GH - 1.0, GH - 0.3, { col: new THREE.Color('#0f3b2e') });
  k.sideDecal(R.s_book, e + 0.03, 0.4, D - 0.4, 0.4, GH - 1.05, 1, { s1: Math.min(1, D / 5.5) });
  for (let f = 0; f < NF; f++) { const sill = GH + f * FH + 0.8, v = variantAt(f + 70); k.sideDecal(R.sash2, e + 0.03, D / 2 - 0.62, D / 2 + 0.62, sill, sill + 1.9, 1, { s0: v * 0.25, s1: v * 0.25 + 0.25 }); }
  k.box(st, e, e + 0.55, -0.15, D + 0.05, TOP, TOP + 0.5);
  // the clock: a square case with gilt frame, white dials on three faces, EASON over them, a pyramid roof and ball
  const cz = GH + 1.4, cs = 1.3, cu = e + 1.5, cv = D * 0.35;
  const caseCol = new THREE.Color('#1c2a24');
  const cb = { col: caseCol };
  k.box('metal', cu - cs / 2, cu + cs / 2, cv - cs / 2, cv + cs / 2, cz, cz + cs, { ...cb, back: true });
  k.box('metal', cu - cs / 2 - 0.05, cu + cs / 2 + 0.05, cv - cs / 2 - 0.05, cv + cs / 2 + 0.05, cz + cs, cz + cs + 0.45, { col: new THREE.Color('#b8963c'), back: true });
  k.decal(R.easonDial, cu - cs / 2 + 0.1, cu + cs / 2 - 0.1, cz + 0.1, cz + cs - 0.1, cv - cs / 2 - 0.01);
  k.decal(R.easonDial, cu + cs / 2 - 0.1, cu - cs / 2 + 0.1, cz + 0.1, cz + cs - 0.1, cv + cs / 2 + 0.01, { nl: [0, 1, 0] });
  k.sideDecal(R.easonDial, cu + cs / 2 + 0.01, cv - cs / 2 + 0.1, cv + cs / 2 - 0.1, cz + 0.1, cz + cs - 0.1, 1);
  k.decal(R.easonTop, cu - cs / 2, cu + cs / 2, cz + cs + 0.03, cz + cs + 0.42, cv - cs / 2 - 0.06);
  k.decal(R.easonTop, cu + cs / 2, cu - cs / 2, cz + cs + 0.03, cz + cs + 0.42, cv + cs / 2 + 0.06, { nl: [0, 1, 0] });
  k.sideDecal(R.easonTop, cu + cs / 2 + 0.06, cv - cs / 2, cv + cs / 2, cz + cs + 0.03, cz + cs + 0.42, 1);
  { // the pyramid roof and the gilt ball
    const z0 = cz + cs + 0.45, z1 = z0 + 0.9, h = cs / 2 + 0.05, apex = [cu, cv, z1], slate = new THREE.Color('#3a4a44');
    const c4 = [[cu - h, cv - h], [cu + h, cv - h], [cu + h, cv + h], [cu - h, cv + h]];
    for (let s = 0; s < 4; s++) { const [a0, a1] = [c4[s], c4[(s + 1) % 4]]; const mid = [(a0[0] + a1[0]) / 2 - cu, (a0[1] + a1[1]) / 2 - cv]; k.quad('metal', [[a0[0], a0[1], z0], [a1[0], a1[1], z0], apex, apex], [mid[0], mid[1], 0.6], [[0, 0], [1, 0], [0.5, 1], [0.5, 1]], [slate.r, slate.g, slate.b]); }
    k.box('metal', cu - 0.12, cu + 0.12, cv - 0.12, cv + 0.12, z1, z1 + 0.24, { col: new THREE.Color('#d4a93c') });
  }
  k.box('metal', e, cu - cs / 2, cv - 0.05, cv + 0.05, cz + cs * 0.6, cz + cs * 0.7, { col: caseCol }); // the bracket
  k.box('metal', e, cu - cs / 2, cv - 0.04, cv + 0.04, cz + 0.1, cz + 0.18, { col: caseCol });
  // back, roof
  k.side(st, U0, 0, D, 0, H, -1, { k: 0.85 });
  k.wall('render', U0, U1, 0, H, D, { back: true, k: 0.8 });
  k.flat('roof', U0, U1, 0.3, D, H - 0.9, true, { col: new THREE.Color('#5a5d60') });
  k.wall(st, U0, U1, H - 0.9, H, 0.3, { back: true, k: 0.7 });
  return { clock: k.P(cu, cv, cz + cs / 2) };
}

// a vacant site behind a hoarding: the painted boards along the building line, open ground behind, the neighbours'
// side walls showing (the Royal Dublin Hotel site at 40-41 Upper carries a mural, ref 17)
function hoarding(k, b) {
  const W = k.f.w, U0 = -W / 2, U1 = W / 2, H = b.mural ? 3.4 : 2.6;
  k.wall('metal', U0, U1, 0, H, -0.05, { col: new THREE.Color('#2a3440') });
  k.decal(b.mural ? R.mural : R.mural2, U0 + 0.05, U1 - 0.05, 0.05, H - 0.1, -0.07, { s1: Math.min(1, W / 12) });
  k.wall('metal', U0, U1, 0, H, 0.05, { back: true, col: new THREE.Color('#3a3e40') });
  k.flat('render', U0, U1, 0.1, b.depth, 0.04, true, { col: new THREE.Color('#6d6a62') });
}

// ---------------------------------------------------------------------------------------------------------------------
let built = null;
function materials() {
  const S = LITE ? 0.5 : 1;
  const mk = (w, h, s, paint) => { const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s); const g = c.getContext('2d'); g.scale(s, s); paint(g); return c; };
  const atlasTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = IS_MOBILE ? 4 : 8; return t; };
  const day = atlasTex(mk(ATLAS, ATLAS, S, (g) => paintAtlas(g, false, signs)));
  const night = atlasTex(mk(ATLAS, ATLAS, S * 0.5, (g) => paintAtlas(g, true, signs)));
  const tile = (t) => { t.repeat.set(1, 1); return t; };
  const std = (o) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
  return {
    stone: uplit(std({ map: tile(stoneTile(256, '#f2f0ea', 6, 0.15, 'rgba(120,114,104,0.16)', 0.07, 1)), roughness: 0.8 }), 6),
    brick: std({ map: tile(stoneTile(128, '#c9c1b6', 14, 0.02, 'rgba(235,228,215,0.55)', 0.3)), roughness: 0.9 }),
    render: uplit(std({ map: tile(stoneTile(128, '#e8e4dc', 2, 0.1, 'rgba(160,156,150,0.12)', 0.05)), roughness: 0.88 }), 6),
    roof: std({ map: tile(stoneTile(128, '#7c7f82', 4, 0.1, 'rgba(40,42,44,0.4)', 0.2)), roughness: 0.85 }),
    slate: std({ map: tile(stoneTile(128, '#9aa0a6', 12, 0.05, 'rgba(30,32,34,0.6)', 0.3)), roughness: 0.7 }),
    metal: std({ color: 0xffffff, roughness: 0.55, metalness: 0.2 }),
    atlas: std({ map: day, emissive: 0xffffff, emissiveMap: night, emissiveIntensity: 0, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45 }),
  };
}

// build every frontage; colliders for each; returns { group, setNight }
export function buildOConnellStreet(scene) {
  if (built) return built;
  const extras = {};
  const spire = 118.3;
  for (const b of OCS.buildings) {
    const chunk = (b.corner || (b.s0 + b.s1) / 2 < spire) ? chunks.lower : chunks.upper;
    const k = new B(b, chunk);
    if (b.special === 'gresham') gresham(k, b);
    else if (b.special === 'savoy') savoy(k, b);
    else if (b.special === 'carlton') carlton(k, b);
    else if (b.special === 'eason') extras.easonClock = eason(k, b).clock;
    else if (b.special === 'hoarding') hoarding(k, b);
    else genericFront(k, b);
    const fp = footprintOf(b);
    if (b.special !== 'hoarding') addBox(fp.x, fp.z, fp.w / 2, fp.d / 2, fp.rot);
    else addBox(fp.x, fp.z, fp.w / 2, 0.2, fp.rot); // just the boards (the site behind is shut)
  }
  const M = materials();
  const group = new THREE.Group();
  group.name = "O'Connell Street";
  let tris = 0;
  for (const [name, C] of Object.entries(chunks)) {
    for (const m of MATS) {
      const A = C[m];
      if (!A.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(A.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(A.c, 3));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, M[m]);
      mesh.name = `ocs_${name}_${m}`;
      mesh.castShadow = m !== 'atlas';
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      tris += A.p.length / 9;
      group.add(mesh);
      A.p = A.n = A.uv = A.c = null; // free the arrays
    }
  }
  scene.add(group);
  built = {
    group, tris, extras,
    setNight(l) { M.atlas.emissiveIntensity = 1.25 * l; },
  };
  return built;
}

// ---------------------------------------------------------------------------------------------------------------------
// The street's trees, from the OSM trees (src/data/oconnellst.json): the islands carry small rowans in groups (the
// 2006 plan's ornamental mountain ash), the footpaths the Oriental planes (7 m in OSM) along the south end of the
// Lower street and the Upper street, and young trees (3 m) in front of Clerys and the GPO, so the two fronts read
// across the street. The OSM spacing is real (half again in the game's chainage), so each row is thinned to a
// game spacing that keeps the real rhythm against the buildings. Returns { rowans, planes, young } as tree spots.
export function oconnellTrees() {
  const street = world.ways.find((w) => w.type === 'boulevard'), kerb = street.width / 2 + 1.4;
  const clear = [[CHAIN.oconnell, 6.2], [CHAIN.smithOBrien, 3.6], [CHAIN.gray, 3.8], [CHAIN.larkin, 3.4], [CHAIN.spire, 5], [CHAIN.fatherMathew, 3.8], [CHAIN.parnell, 16]];
  const free = (s) => clear.every(([c, r]) => Math.abs(s - c) > r);
  const portico = chainageOf(sites.gpo);
  const rows = new Map(), out = { rowans: [], planes: [], young: [] };
  const take = (key, s, gap) => { const last = rows.get(key); if (last !== undefined && Math.abs(s - last) < gap) return false; rows.set(key, s); return true; };
  const list = data.trees.map(([lat, lon, h, off]) => ({ s: chainageOf(project(lat, lon)), h, off })).sort((a, b) => a.s - b.s);
  for (const t of list) {
    if (t.s < 2 || t.s > LENGTH - 4) continue;
    if (Math.abs(t.off) < 8) { // the islands
      const isl = islandAt(t.s);
      if (!isl || isl.cobbles || !free(t.s)) continue;
      const hw = halfWidth(isl, t.s), side = t.off >= 0 ? -1 : 1, o = hw > 2.4 ? side * Math.min(1.3, hw - 1.0) : 0;
      if (!take('m' + (hw > 2.4 ? side : 0), t.s, 5.5)) continue;
      out.rowans.push({ ...along(t.s, o), s: 0.62 });
      continue;
    }
    const side = t.off > 0 ? -1 : 1; // + east in OSM; + west in the game
    if (side > 0 && Math.abs(t.s - portico) < 13) continue; // the GPO's portico stays open
    const big = t.h >= 6;
    if (!take('f' + side, t.s, big ? 11 : 9)) continue;
    const p = along(t.s, side * kerb), r = world.nearestRoad(p.x, p.z);
    if (r && r.way !== street && r.edgeDist < 1.5) continue; // not in a side street's mouth
    if (big) out.planes.push({ x: p.x, z: p.z, s: 0.82 });
    else out.young.push({ x: p.x, z: p.z, s: 0.72 });
  }
  return out;
}
