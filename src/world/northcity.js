// The north city heroes (docs/research/north-city.md): Clerys and its clock on O'Connell Street, the Parnell Square
// block (the Rotunda Hospital, the Ambassador drum, the Gate Theatre, the Garden of Remembrance with the Children of
// Lir) and Busáras. One Blender model (tools/blender/build_northcity.py -> public/models/northcity.glb), a root per
// building, placed by the frames in sites.js (NC). The textures are painted here at load: stone, granite, render and
// brick tiles in true metres, Busáras' curtain wall (a 6.2 m tile of glass, white bands and blue mosaic spandrels, lit
// at night) and a 1024 atlas of windows, shopfronts, the clock, lettering, railings, the swag frieze, the pool mosaic
// and the swans' wings, with a matching night canvas. The stone is floodlit after dark by the shared uplight
// (heroes.js, driven by setStoneNight); the Clerys clock's faces and its lanterns glow. Low / Battery saver paints the
// textures at half size.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { load, stoneTile, uplit } from './heroes.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { getStreets } from './ground.js';
import { plantTrees } from './trees.js';
import { NC, sites, extraSites } from './sites.js';
import { addBox, addPolyline } from '../game/collision.js';
import layout from '../data/northcity.json';

// atlas regions, px in 1024 x 1024 (must match NC_ATLAS in tools/blender/build_northcity.py)
const A = {
  cwin: [0, 0, 128, 256], cshop: [128, 0, 256, 128], cdoor: [128, 128, 256, 128], cattic: [384, 0, 64, 64],
  cname: [448, 0, 256, 64], clock: [704, 0, 128, 128], balus: [384, 64, 256, 64], cside: [832, 0, 64, 128],
  sash: [0, 256, 64, 128], arch: [64, 256, 64, 128], gate: [128, 256, 256, 64], swag: [128, 320, 256, 64],
  blind: [384, 256, 64, 128], door: [448, 256, 64, 128], lamp: [512, 256, 64, 64], amb: [576, 256, 256, 64],
  rail: [0, 384, 512, 64], mosaic: [512, 384, 256, 256], wing: [768, 384, 256, 256],
  conc: [0, 448, 256, 256], tri: [256, 448, 256, 64], bname: [256, 512, 256, 64], marble: [256, 576, 256, 128],
  flag: [768, 640, 128, 64], wave: [896, 640, 128, 64], hwin: [0, 704, 128, 128],
};
// palette (sRGB), docs/research/north-city.md 4
const STONE = '#d9d4c8', GRANITE = '#b3ab9c', RENDER = '#bdb096', BRONZE = '#5e6b5c', GLASS = '#27313a', WARM = '#ffd9a0';
const GOLD = '#d4a93c', CLOCKFACE = '#1f4a3a', MOSAIC = '#2c5f8e';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvas(w, h, scale, paint) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale); paint(g);
  return c;
}
function tex(c, { atlas = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = IS_MOBILE ? 4 : 8;
  if (atlas) t.flipY = false; else t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function paintAtlas(g, lit) {
  g.clearRect(0, 0, 1024, 1024);
  const r = rng(lit ? 5 : 3);
  const fill = (k, col) => { const [x, y, w, h] = A[k]; g.fillStyle = col; g.fillRect(x, y, w, h); };
  const glass = (x, y, w, h, on = 1) => {
    if (lit) { g.fillStyle = on > 0.5 ? WARM : on > 0.2 ? '#8a6a44' : '#000'; g.fillRect(x, y, w, h); return; }
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#46525c'); gr.addColorStop(1, GLASS);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  const text = (k, s, font, col, stroke) => {
    const [x, y, w, h] = A[k];
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = 4; g.strokeStyle = stroke; g.strokeText(s, x + w / 2, y + h / 2 + 2); }
    g.fillStyle = col; g.fillText(s, x + w / 2, y + h / 2 + 2);
  };
  // opaque regions stay black on the night canvas unless they glow
  if (lit) for (const k of ['cwin', 'cshop', 'cdoor', 'cattic', 'clock', 'cside', 'sash', 'arch', 'blind', 'door', 'lamp', 'mosaic', 'conc', 'tri', 'marble', 'wave', 'hwin', 'cname', 'amb', 'bname', 'flag']) fill(k, '#000');

  { // Clerys: the three storeys of big metal-framed windows between the columns, bronze balconettes at two levels
    const [x, y, w, h] = A.cwin;
    if (!lit) { g.fillStyle = '#c9c3b5'; g.fillRect(x, y, w, h); }
    for (let k = 0; k < 3; k++) {
      const y0 = y + 4 + k * 84;
      if (!lit) { g.fillStyle = '#5a6a5e'; g.fillRect(x + 4, y0, w - 8, 76); }
      for (let i = 0; i < 3; i++) glass(x + 8 + i * 38, y0 + 4, 34, 68, r() < 0.8 ? 1 : 0.3);
      if (!lit) {
        g.fillStyle = '#5a6a5e'; g.fillRect(x + 4, y0 + 26, w - 8, 4);
        if (k < 2) { // the balconette across the foot of the next storey up: green bronze ironwork
          g.fillStyle = BRONZE; g.fillRect(x + 2, y0 + 76, w - 4, 3); g.fillRect(x + 2, y0 + 82, w - 4, 2);
          for (let bx = x + 6; bx < x + w - 4; bx += 10) { g.beginPath(); g.arc(bx + 3, y0 + 79, 3, 0, 7); g.strokeStyle = BRONZE; g.lineWidth = 1.5; g.stroke(); }
        }
      }
    }
  }
  { // shopfront: dark bronze frame, a fascia, plate glass with displays
    const [x, y, w, h] = A.cshop;
    if (!lit) { g.fillStyle = '#2b2a26'; g.fillRect(x, y, w, h); g.fillStyle = '#1a1a18'; g.fillRect(x, y, w, 18); }
    else { g.fillStyle = '#000'; g.fillRect(x, y, w, h); }
    for (let i = 0; i < 3; i++) {
      const px = x + 6 + i * 83, py = y + 24;
      if (lit) { const gr = g.createLinearGradient(0, py, 0, py + 98); gr.addColorStop(0, '#fff2d6'); gr.addColorStop(1, '#e0b070'); g.fillStyle = gr; g.fillRect(px, py, 77, 98); }
      else { glass(px, py, 77, 98); g.fillStyle = 'rgba(220,210,190,0.25)'; g.fillRect(px + 10, py + 40, 20, 58); g.fillStyle = 'rgba(160,40,40,0.35)'; g.fillRect(px + 40, py + 50, 26, 48); }
    }
  }
  { // the main entrance: the gilt CLERY & CO fascia over glazed doors
    const [x, y, w, h] = A.cdoor;
    if (!lit) { g.fillStyle = '#1e1d1b'; g.fillRect(x, y, w, h); }
    g.fillStyle = lit ? '#6a5020' : '#141312'; g.fillRect(x + 50, y + 4, w - 100, 20);
    g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = lit ? '#ffd780' : GOLD; g.fillText('CLERY & Co. LTD', x + w / 2, y + 15);
    for (let i = 0; i < 4; i++) { const px = x + 14 + i * 58; if (lit) { g.fillStyle = WARM; g.fillRect(px, y + 32, 52, 94); } else { glass(px, y + 32, 52, 94); g.fillStyle = '#6a5a3a'; g.fillRect(px + 24, y + 32, 3, 94); } }
  }
  { const [x, y, w, h] = A.cattic; if (!lit) { g.fillStyle = '#c9c3b5'; g.fillRect(x, y, w, h); } glass(x + 8, y + 8, w - 16, h - 12, r() < 0.7 ? 1 : 0); if (!lit) { g.fillStyle = '#e8e4da'; g.fillRect(x + w / 2 - 1, y + 8, 3, h - 12); } }
  { // CLERY & CO LTD carved into the raised panel on the parapet
    const [x, y, w, h] = A.cname;
    if (!lit) { g.fillStyle = STONE; g.fillRect(x, y, w, h); g.strokeStyle = '#a9a396'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, w - 6, h - 6); text('cname', 'CLERY & CO LTD', 'bold 30px Georgia, serif', '#6e6a61'); }
  }
  // the clock: a green dial in a black case, gold numerals and hands, CLERYS gilt on the top rail (ref 04)
  const dial = (cx, cy, rx, ry) => {
    g.save(); g.translate(cx, cy); g.scale(rx / 50, ry / 50);
    g.fillStyle = lit ? '#e8f4dc' : CLOCKFACE; g.beginPath(); g.arc(0, 0, 50, 0, 7); g.fill();
    g.strokeStyle = GOLD; g.lineWidth = 3; g.stroke();
    g.fillStyle = lit ? '#2a2410' : GOLD;
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.fillRect(Math.cos(a) * 38 - 3, Math.sin(a) * 38 - 5, 6, 10); }
    g.strokeStyle = lit ? '#2a2410' : GOLD; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(-22, -12); g.stroke();
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(6, -38); g.stroke();
    g.restore();
  };
  { const [x, y, w, h] = A.clock; g.fillStyle = lit ? '#000' : '#121513'; g.fillRect(x, y, w, h); dial(x + w / 2, y + 70, 48, 48);
    g.font = 'bold 17px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = lit ? '#ffcf70' : GOLD; g.fillText('CLERYS', x + w / 2, y + 11); }
  { const [x, y, w, h] = A.cside; g.fillStyle = lit ? '#000' : '#121513'; g.fillRect(x, y, w, h); dial(x + w / 2, y + 70, 24, 46); }
  { // balustrade: stone balusters and rails, cut out between
    const [x, y, w, h] = A.balus;
    if (!lit) {
      g.fillStyle = STONE; g.fillRect(x, y, w, 8); g.fillRect(x, y + h - 8, w, 8);
      for (let bx = x + 4; bx < x + w - 6; bx += 12) { g.beginPath(); g.moveTo(bx + 2, y + 8); g.lineTo(bx + 6, y + 8); g.quadraticCurveTo(bx + 10, y + 30, bx + 6, y + h - 8); g.lineTo(bx + 2, y + h - 8); g.quadraticCurveTo(bx - 2, y + 30, bx + 2, y + 8); g.fill(); }
    }
  }
  { // Georgian sash: painted frame, six over six
    const [x, y, w, h] = A.sash;
    if (!lit) { g.fillStyle = '#ece8de'; g.fillRect(x, y, w, h); }
    const on = r();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) glass(x + 5 + i * 18, y + 5 + j * 30, 16, 28, on < 0.55 ? 1 : 0);
  }
  { // round-headed window
    const [x, y, w, h] = A.arch;
    if (!lit) { g.fillStyle = '#ece8de'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill(); }
    const on = r() < 0.5 ? 1 : 0;
    g.save(); g.beginPath(); g.moveTo(x + 5, y + h - 4); g.lineTo(x + 5, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2 - 5, Math.PI, 0); g.lineTo(x + w - 5, y + h - 4); g.closePath(); g.clip();
    glass(x, y, w, h, on); if (!lit) { g.fillStyle = '#ece8de'; g.fillRect(x + w / 2 - 1.5, y, 3, h); for (let j = 1; j < 5; j++) g.fillRect(x, y + j * 24 + 8, w, 3); }
    g.restore();
  }
  { // GATE, in big pale letters on the parapet block (ref 01)
    if (lit) text('gate', 'GATE', 'bold 58px Arial, Helvetica, sans-serif', '#fff4dc');
    else text('gate', 'GATE', 'bold 58px Arial, Helvetica, sans-serif', '#efe9dc', '#3a2c24');
  }
  { // the Coade-stone swags and ox skulls on the buff frieze
    const [x, y, w, h] = A.swag;
    if (!lit) {
      g.fillStyle = RENDER; g.fillRect(x, y, w, h);
      g.strokeStyle = '#e6dcc6'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x + 30, y + 16); g.quadraticCurveTo(x + w / 2, y + 62, x + w - 30, y + 16); g.stroke();
      g.fillStyle = '#e6dcc6';
      for (const cx of [x + 18, x + w - 18]) { g.beginPath(); g.ellipse(cx, y + 26, 9, 14, 0, 0, 7); g.fill(); g.fillRect(cx - 13, y + 12, 26, 5); }
      g.fillStyle = 'rgba(80,70,50,0.3)'; g.fillRect(x, y, w, 4); g.fillRect(x, y + h - 4, w, 4);
    }
  }
  { const [x, y, w, h] = A.blind; if (!lit) { g.fillStyle = '#a99d84'; g.fillRect(x, y, w, h); g.fillStyle = '#958a72'; g.fillRect(x + 6, y + 6, w - 12, h - 12); g.fillStyle = '#b6aa90'; g.fillRect(x + 6, y + 6, w - 12, 4); } }
  { // panelled door under a fanlight
    const [x, y, w, h] = A.door;
    if (!lit) { g.fillStyle = '#1f3b5c'; g.fillRect(x, y + 30, w, h - 30); g.strokeStyle = '#162a42'; g.lineWidth = 3; for (const [px, py, pw, ph] of [[8, 40, 20, 34], [36, 40, 20, 34], [8, 82, 20, 40], [36, 82, 20, 40]]) g.strokeRect(x + px, y + py, pw, ph); }
    glass(x + 4, y + 2, w - 8, 26, 1);
  }
  { const [x, y, w, h] = A.lamp; g.fillStyle = lit ? '#fff0c8' : '#dfe6dc'; g.fillRect(x + 8, y + 8, w - 16, h - 12); g.fillStyle = lit ? '#000' : '#1b2a24'; g.fillRect(x, y, w, 8); }
  { // AMBASSADOR over the entrance range (red on cream)
    const [x, y, w, h] = A.amb;
    if (!lit) { g.fillStyle = '#e8e0cc'; g.fillRect(x, y, w, h); }
    text('amb', 'AMBASSADOR', 'bold 30px Georgia, serif', lit ? '#ff6a5a' : '#9c1f1f');
  }
  { // railings: black iron bars, top rail, spear finials (cut out)
    const [x, y, w, h] = A.rail;
    g.fillStyle = lit ? '#000' : '#15171a';
    g.fillRect(x, y + 12, w, 3); g.fillRect(x, y + h - 8, w, 4);
    for (let bx = x + 2; bx < x + w; bx += 7) { g.fillRect(bx, y + 6, 2, h - 8); g.beginPath(); g.moveTo(bx - 1.5, y + 8); g.lineTo(bx + 1, y + 1); g.lineTo(bx + 3.5, y + 8); g.fill(); }
  }
  { // the pool floor: blue mosaic with the broken spears, swords and shields laid in it
    const [x, y, w, h] = A.mosaic;
    if (!lit) {
      g.fillStyle = MOSAIC; g.fillRect(x, y, w, h);
      for (let i = 0; i < 1400; i++) { const l = 26 + r() * 16; g.fillStyle = `hsl(${205 + r() * 20}, 50%, ${l}%)`; g.fillRect(x + ((r() * w) | 0), y + ((r() * h) | 0), 5, 5); }
      g.strokeStyle = 'rgba(220,210,170,0.5)'; g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) { const cx = x + 20 + r() * (w - 40), cy = y + 20 + r() * (h - 40), a = r() * 3.14, L2 = 30 + r() * 40; g.beginPath(); g.moveTo(cx - Math.cos(a) * L2, cy - Math.sin(a) * L2); g.lineTo(cx + Math.cos(a) * L2 * 0.4, cy + Math.sin(a) * L2 * 0.4); g.stroke(); }
      g.fillStyle = 'rgba(200,185,130,0.35)';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + 40 + r() * (w - 80), y + 40 + r() * (h - 80), 16, 20, r(), 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.10)'; for (let i = 0; i < 12; i++) g.fillRect(x, y + r() * h, w, 2); // ripples
    }
  }
  { // a swan's wing, raised: bronze feathers fanning from the root (bottom left) to the tip (top right)
    const [x, y, w, h] = A.wing;
    if (!lit) {
      g.save(); g.beginPath(); g.moveTo(x + 6, y + h - 6); g.lineTo(x + w - 20, y + h - 30); g.lineTo(x + w - 4, y + 4); g.quadraticCurveTo(x + 60, y + 40, x + 10, y + 90); g.closePath(); g.clip();
      g.fillStyle = '#4c554b'; g.fillRect(x, y, w, h);
      for (let k = 0; k < 16; k++) { g.strokeStyle = k % 2 ? '#3a4239' : '#667062'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 10, y + h - 10); g.lineTo(x + w - 10 - k * 6, y + 6 + k * 13); g.stroke(); }
      g.restore();
      g.fillStyle = '#4c554b';
      for (let k = 0; k < 9; k++) { const px = x + w - 30 - k * 14, py = y + h - 30 + k * 1; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 10, py + 22); g.lineTo(px - 6, py + 4); g.fill(); }
    }
  }
  { // Busáras' concourse glazing: tall panes, slim dark mullions, a transom; warm at night
    const [x, y, w, h] = A.conc;
    if (!lit) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#9fb0bc'); gr.addColorStop(0.5, '#4f6170'); gr.addColorStop(1, '#2a3540'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    else { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff4dc'); gr.addColorStop(1, '#e8c890'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    g.fillStyle = lit ? 'rgba(40,30,20,0.7)' : '#2c3134';
    for (let k = 0; k <= 6; k++) g.fillRect(x + (k * w) / 6 - 2, y, 4, h);
    g.fillRect(x, y + h * 0.3, w, 4); g.fillRect(x, y, w, 5);
  }
  { // the blue and white triangle mosaic (ref 08)
    const [x, y, w, h] = A.tri;
    if (!lit) { g.fillStyle = '#e8ecef'; g.fillRect(x, y, w, h); for (let k = 0; k < 16; k++) { const c = ['#1e4f8f', '#3a78b8', '#153a66', '#5a92c8'][k % 4]; g.fillStyle = c; g.beginPath(); g.moveTo(x + k * 16, y + h); g.lineTo(x + k * 16 + 8, y); g.lineTo(x + k * 16 + 16, y + h); g.fill(); g.fillStyle = ['#2b5f9e', '#9cc0e0'][k % 2]; g.beginPath(); g.moveTo(x + k * 16 + 8, y); g.lineTo(x + k * 16 + 16, y + h); g.lineTo(x + k * 16 + 24, y); g.fill(); } }
  }
  text('bname', 'BUSÁRAS', 'bold 40px Arial, Helvetica, sans-serif', lit ? '#dff0ff' : '#23384f');
  { const [x, y, w, h] = A.marble; if (!lit) { g.fillStyle = '#dcdad3'; g.fillRect(x, y, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(150,150,145,${0.15 + r() * 0.2})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x + r() * w, y); g.lineTo(x + r() * w, y + h); g.stroke(); } g.fillStyle = '#b9b7b0'; for (let k = 0; k <= 4; k++) g.fillRect(x + (k * w) / 4 - 1, y, 2, h); g.fillRect(x, y + h / 2 - 1, w, 2); } }
  { const [x, y, w, h] = A.flag; if (!lit) { g.fillStyle = '#169b62'; g.fillRect(x, y, w / 3, h); g.fillStyle = '#ffffff'; g.fillRect(x + w / 3, y, w / 3, h); g.fillStyle = '#ff883e'; g.fillRect(x + (2 * w) / 3, y, w / 3, h); } }
  { const [x, y, w, h] = A.wave; if (!lit) { g.fillStyle = '#8f8c86'; g.fillRect(x, y, w, h); g.strokeStyle = '#6a6863'; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); for (let i = 0; i <= w; i += 4) g.lineTo(x + i, y + 8 + k * 11 + Math.sin(i / 8) * 3); g.stroke(); } } }
  { const [x, y, w, h] = A.hwin; if (!lit) { g.fillStyle = '#c9c3b5'; g.fillRect(x, y, w, h); g.fillStyle = '#5a6a5e'; g.fillRect(x + 10, y + 10, w - 20, h - 20); } glass(x + 16, y + 16, w - 32, h - 32, 1); if (!lit) { g.fillStyle = '#5a6a5e'; g.fillRect(x + w / 2 - 2, y + 16, 4, h - 32); g.fillRect(x + 16, y + h / 2 - 2, w - 32, 4); } }
}

// Busáras' curtain wall: a 6.2 m tile, two storeys (3.1 m, floors at 4.65 + 3.1k, so at v 0.25 and 0.75) by four
// 1.55 m bays: blue-grey glass, a white floor band, a blue mosaic spandrel under each sill; at night most offices lit
function paintCurtain(g, lit) {
  const S = 256, r = rng(lit ? 17 : 9);
  g.fillStyle = lit ? '#000' : '#34495f'; g.fillRect(0, 0, S, S);
  for (const fy of [64, 192]) {         // canvas y of a floor line (the top of the canvas is v = 1)
    // the storey above this floor line: glass from the spandrel's top up to the next floor
    const top = fy - 128, spTop = fy - 38;
    for (let k = 0; k < 4; k++) {
      const x = k * 64;
      if (lit) { const v = r(); g.fillStyle = v < 0.25 ? '#141210' : v < 0.45 ? '#7a6a52' : '#f2dcb0'; g.fillRect(x + 3, top + 4 < 0 ? 0 : top + 4, 58, spTop - top - 4); if (top < 0) { g.fillRect(x + 3, S + top + 4, 58, -top - 4); } continue; }
      const gr = g.createLinearGradient(0, spTop - 90, 0, spTop); gr.addColorStop(0, '#6f8ba6'); gr.addColorStop(1, '#2f455c');
      g.fillStyle = gr; g.fillRect(x + 3, Math.max(0, top + 4), 58, spTop - Math.max(0, top + 4));
      if (top < 0) { g.fillRect(x + 3, S + top + 4, 58, -top - 4); }
      // the spandrel: small blue tiles
      for (let i = 0; i < 60; i++) { g.fillStyle = `hsl(${208 + r() * 14}, 60%, ${38 + r() * 18}%)`; g.fillRect(x + 3 + ((r() * 56) | 0), spTop + ((r() * 34) | 0), 4, 4); }
    }
    if (!lit) { g.fillStyle = '#eef0ee'; g.fillRect(0, fy - 4, S, 8); } // the white floor band
  }
  if (!lit) { g.fillStyle = '#d6dadc'; for (let k = 0; k <= 4; k++) g.fillRect(k * 64 - 2, 0, 4, S); } // mullions
}

let mats = null;
function materials() {
  if (mats) return mats;
  const S = LITE ? 0.5 : 1;
  const dec = tex(canvas(1024, 1024, S, (g) => paintAtlas(g, false)), { atlas: true });
  const decEm = tex(canvas(1024, 1024, S * 0.5, (g) => paintAtlas(g, true)), { atlas: true });
  const curtain = tex(canvas(256, 256, S, (g) => paintCurtain(g, false)));
  const curtainEm = tex(canvas(256, 256, S * 0.5, (g) => paintCurtain(g, true)));
  const std = (o, vc = true) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = vc; return m; };
  mats = {
    stone: uplit(std({ map: stoneTile(256, STONE, 8, 0.15, 'rgba(120,114,104,0.35)', 0.1), roughness: 0.75 }), 24),
    granite: uplit(std({ map: stoneTile(256, GRANITE, 7, 0.2, 'rgba(90,86,80,0.45)', 0.16), roughness: 0.84 }), 16),
    rustic: uplit(std({ map: stoneTile(256, '#a8a092', 5, 0.1, 'rgba(62,60,56,0.62)', 0.16, 6), roughness: 0.88 }), 16),
    render: uplit(std({ map: stoneTile(256, RENDER, 6, 0.1, 'rgba(120,108,86,0.25)', 0.08), roughness: 0.85 }), 14),
    brick: std({ map: stoneTile(128, '#9a4b33', 16, 0.02, 'rgba(210,200,185,0.5)'), roughness: 0.9 }),
    slate: std({ map: stoneTile(128, '#50565c', 16, 0.05, 'rgba(28,30,32,0.5)', 0.3), roughness: 0.7 }),
    copper: std({ color: 0x6fa596, roughness: 0.6, metalness: 0.15 }),
    metal: std({ color: 0x3d4144, roughness: 0.5, metalness: 0.4 }),
    pave: std({ map: stoneTile(128, '#b0aca3', 8, 0.05, 'rgba(70,68,64,0.4)', 0.15), roughness: 0.85 }),
    lawn: getStreets().grassMat,
    bronze: std({ color: 0x55605a, roughness: 0.5, metalness: 0.45 }, false),
    conc: uplit(std({ map: stoneTile(128, '#e4e2dc', 4, 0.05, 'rgba(150,150,145,0.25)', 0.05), roughness: 0.8 }), 7),
    curtain: std({ map: curtain, roughness: 0.25, metalness: 0.25, emissive: 0xffffff, emissiveMap: curtainEm, emissiveIntensity: 0 }, false),
    dec: std({ map: dec, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4, emissive: 0xffffff, emissiveMap: decEm, emissiveIntensity: 0 }),
  };
  return mats;
}

const decoded = new WeakSet();
// merge several placed roots into one mesh per material in world space, keeping the baked AO colours
function mergeWorld(roots) {
  const by = new Map(), m = new THREE.Matrix4();
  for (const r of roots) {
    r.updateMatrixWorld(true);
    r.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      const c = g.attributes.color, f = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) { f[i * 3] = c.getX(i); f[i * 3 + 1] = c.getY(i); f[i * 3 + 2] = c.getZ(i); }
      g.setAttribute('color', new THREE.BufferAttribute(f, 3));
      g.applyMatrix4(m.copy(o.matrixWorld));
      if (!by.has(o.material)) by.set(o.material, { geos: [], cast: o.castShadow });
      by.get(o.material).geos.push(g);
    });
  }
  const out = new THREE.Group();
  for (const [mat, { geos, cast }] of by) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = cast; mesh.receiveShadow = true;
    out.add(mesh);
  }
  return out;
}
// placement of each root: its frame from sites.js (the Ambassador at the drum's centre, turned with Parnell Street)
const FRAMES = () => ({ clerys: NC.clerys, rotunda: NC.rotunda, ambassador: { ...NC.drum, rot: NC.rotunda.rot }, gate: NC.gate, garden: NC.garden, busaras: NC.busaras });

// colliders: every building box, the drum as a ring, the garden's terrace (the Children of Lir stand inside it)
export function northCityColliders() {
  for (const s of [sites.clerys, sites.rotunda, extraSites.rotundaRear, extraSites.gate, sites.busaras]) addBox(s.x, s.z, s.w / 2, s.d / 2, s.rot);
  addPolyline(NC.garden.poly, true);
  const R = layout.parnell.drumR + 2.2, ring = [];
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; ring.push({ x: NC.drum.x + Math.cos(a) * R, z: NC.drum.z + Math.sin(a) * R }); }
  addPolyline(ring, true);
}

export async function placeNorthCity(scene) {
  let gltf;
  try { gltf = await load('northcity'); } catch (e) { console.warn('northcity model failed to load', e); return null; }
  const M = materials(), F = FRAMES(), group = new THREE.Group();
  group.name = 'North city';
  for (const [name, f] of Object.entries(F)) {
    const root = gltf.scene.getObjectByName(name);
    if (!root) continue;
    root.removeFromParent();
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.color) o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3));
      const col = o.geometry.attributes.color;
      if (col.normalized && !decoded.has(col)) { // the AO bake (sRGB bytes): decode it and keep it off black
        for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, 0.3 + 0.7 * Math.pow(col.getComponent(i, c), 1 / 2.2));
        decoded.add(col); col.needsUpdate = true;
      }
      const key = o.material.name.replace(/^nc_/, '').replace(/\.\d+$/, '');
      o.material = M[key] || M.metal;
      o.castShadow = !['dec', 'pave', 'lawn'].includes(key);
      o.receiveShadow = true;
    });
    root.position.set(f.x, 0, f.z);
    root.rotation.set(0, f.rot, 0);
    group.add(root);
  }
  // pure efficiency: the four Parnell Square roots stand together, so merge them into one mesh per material (about
  // 30 draw calls down to 13); Clerys and Busáras are far apart and keep their own (each culled on its own)
  const parnell = ['rotunda', 'ambassador', 'gate', 'garden'].map((n) => group.getObjectByName(n)).filter(Boolean);
  if (parnell.length) {
    const merged = mergeWorld(parnell);
    merged.name = 'Parnell Square';
    for (const r of parnell) r.removeFromParent();
    group.add(merged);
  }
  scene.add(group);
  // the garden's trees: on the lawns round the sunken court (the terrace is 1.1 m up)
  {
    const r = rng(21), items = [];
    for (const [u, v] of [[-40, 8], [-39, 40], [-38, 24], [23, 7], [22, 40], [26, 22], [-20, 6.5], [0, 7], [14, 6.5], [-18, 40], [2, 40.5]]) {
      const p = NC.garden.at(u, v);
      items.push({ x: p.x, y: 1.1, z: p.z, rot: r() * 6.28, s: 0.85 + r() * 0.25 });
    }
    plantTrees(scene, items, { lime: 2, plane: 1, birch: 1 }, r);
  }
  return {
    group,
    setNight(l) {
      M.dec.emissiveIntensity = 1.2 * l;
      M.curtain.emissiveIntensity = 0.9 * l;
    },
  };
}
