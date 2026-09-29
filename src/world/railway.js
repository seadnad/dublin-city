// The DART line through the city centre (docs/research/railway.md; the numbers are in railline.js): the masonry
// viaduct with its blind arches between the streets, plate-girder bridges on cast-iron columns over them, the ballast,
// sleepers and rails, the overhead line, the platforms and canopies at Connolly, Tara Street and Pearse (with Pearse's
// iron-and-glass shed and its red-brick front on Westland Row), the Tara Street fire station's hose tower, and the
// dark mouth of the covered way under the Aviva's west podium. The Loopline Bridge and the lattice span over Beresford
// Place are a Blender hero (tools/blender/build_loopline.py, placed by placeLoopline); Connolly's 1844 front is another
// (tools/blender/build_connolly.py, placeConnolly).
//
// Everything procedural is built per material in 150 m pieces of the line and handed to the static batch with the
// other landmarks (one draw call per material per map block). Low / Battery saver paints the textures at half size.
import * as THREE from 'three';
import { v2 } from './geo.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { addSegment, addBox } from '../game/collision.js';
import { load } from './heroes.js';
import { batchStatic } from '../render/batch.js';
import * as R from './railline.js';

const { at, offsetAt, deckAt, halfAt, trackAt, spans, stations, GCD, LANSDOWNE, PLATFORM } = R;
const PARAPET = 1.1, WALL_T = 0.45, BAY = 7; // parapet height over the ballast, its thickness, one blind arch
const GIRDER = { below: 1.3, above: 1.15 }; // plate girders: web from deck - below to deck + above

// ---------- textures ----------
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvas(w, h, paint, scale = 1) {
  const k = (LITE ? 0.5 : 1) * scale, c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(w * k)); c.height = Math.max(4, Math.round(h * k));
  const g = c.getContext('2d'); g.scale(k, k); paint(g, w, h);
  return c;
}
function tex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = IS_MOBILE ? 4 : 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// calp limestone rubble: grey, irregular courses
function rubble(g, x0, y0, w, h, r, base = [118, 116, 110], course = 9) {
  g.fillStyle = `rgb(${base.join(',')})`; g.fillRect(x0, y0, w, h);
  for (let y = y0; y < y0 + h; y += course) {
    let x = x0 - r() * 18;
    while (x < x0 + w) {
      const sw = 10 + r() * 22, l = (r() - 0.5) * 30;
      g.fillStyle = `rgb(${base[0] + l},${base[1] + l},${base[2] + l - 2})`;
      g.fillRect(x + 1, y + 1, sw - 2, course - 2);
      x += sw;
    }
  }
}
// the viaduct wall: one blind arch per 7 m bay, v = 0 at the ground, 1 at the parapet top (deck 6.5 m, parapet 7.6 m):
// the string course at the deck (v 0.855), the ashlar parapet over it, calp rubble below with a recessed arch of
// brick voussoirs (the Loop Line's arches, refs 06, 09)
function paintArcade(g, W, H) {
  const r = rng(5);
  rubble(g, 0, 0, W, H, r);
  const sy = H * (1 - 0.855); // string course (canvas y runs down)
  // the recess: darker, sooty
  const cx = W / 2, aw = W * 0.64, spring = H * (1 - 0.52), crown = H * (1 - 0.72);
  g.save();
  g.beginPath(); g.moveTo(cx - aw / 2, H); g.lineTo(cx - aw / 2, spring); g.ellipse(cx, spring, aw / 2, spring - crown, 0, Math.PI, 0); g.lineTo(cx + aw / 2, H); g.closePath();
  g.clip(); rubble(g, 0, 0, W, H, r, [84, 83, 80], 8); g.fillStyle = 'rgba(20,20,22,0.35)'; g.fillRect(0, 0, W, H);
  g.restore();
  // brick voussoirs round the head
  g.strokeStyle = '#7a4632'; g.lineWidth = 9;
  g.beginPath(); g.ellipse(cx, spring, aw / 2 + 4.5, spring - crown + 4.5, 0, Math.PI, 0); g.stroke();
  g.strokeStyle = 'rgba(40,20,14,0.6)'; g.lineWidth = 1;
  for (let k = 0; k <= 16; k++) { const a = Math.PI + (k / 16) * Math.PI; g.beginPath(); g.moveTo(cx + Math.cos(a) * (aw / 2), spring + Math.sin(a) * (spring - crown)); g.lineTo(cx + Math.cos(a) * (aw / 2 + 9), spring + Math.sin(a) * (spring - crown + 9)); g.stroke(); }
  // imposts, the string course and the ashlar parapet with its coping
  g.fillStyle = '#9a978f'; g.fillRect(cx - aw / 2 - 6, spring - 3, 12, 6); g.fillRect(cx + aw / 2 - 6, spring - 3, 12, 6);
  g.fillStyle = '#a7a39a'; g.fillRect(0, 0, W, sy);
  g.fillStyle = 'rgba(60,58,54,0.5)'; for (let x = 0; x < W; x += 32) g.fillRect(x + (r() * 4), 4, 1.5, sy - 8); g.fillRect(0, sy * 0.5, W, 1.2);
  g.fillStyle = '#8f8b83'; g.fillRect(0, sy - 5, W, 7);
  g.fillStyle = '#b8b4ab'; g.fillRect(0, 0, W, 4);
  // soot and weathering streaks
  for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(30,30,30,${0.04 + r() * 0.06})`; g.fillRect(r() * W, sy, 2 + r() * 6, r() * H * 0.5); }
}
// ballast: u 0..0.5 plain stone, 0.5..1 a concrete sleeper across it (one sleeper per 0.65 m of v)
function paintBallast(g, W, H) {
  const r = rng(9);
  g.fillStyle = '#5f5a54'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 700; i++) { const l = 50 + r() * 70; g.fillStyle = `rgba(${l + 10},${l + 6},${l},0.7)`; g.fillRect(r() * W, r() * H, 1.5 + r() * 2, 1.5 + r() * 2); }
  g.fillStyle = '#8c8984'; g.fillRect(W * 0.53, H * 0.3, W * 0.44, H * 0.4);
  g.fillStyle = 'rgba(40,36,32,0.5)'; g.fillRect(W * 0.53, H * 0.66, W * 0.44, H * 0.05);
  g.fillStyle = '#3a3633'; for (const u of [0.62, 0.88]) g.fillRect(W * u - 2, H * 0.34, 4, H * 0.32); // the rail clips
}
// platform paving: u 0 at the edge (white coping, the yellow line), v along (repeats every 2 m)
function paintPlatform(g, W, H) {
  const r = rng(13);
  g.fillStyle = '#a8a59e'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 16) for (let x = 20; x < W; x += 16) { const l = (r() - 0.5) * 14; g.fillStyle = `rgb(${168 + l},${165 + l},${158 + l})`; g.fillRect(x + 1, y + 1, 14, 14); }
  g.fillStyle = '#d9d6cc'; g.fillRect(0, 0, 12, H);
  g.fillStyle = '#e2b52a'; g.fillRect(22, 0, 5, H);
}
// plate girder faces: panels between stiffeners, a flange line top and bottom and the black-and-yellow height bar
// along the soffit; two paints, v 0..0.5 the Westland Row maroon (ref 16), 0.5..1 grey
function paintGirder(g, W, H) {
  const half = H / 2;
  for (const [y0, base, dark, trim] of [[0, '#5a2622', '#3e1916', '#b58d4c'], [half, '#5d6468', '#41474a', '#7b8286']]) {
    g.fillStyle = base; g.fillRect(0, y0, W, half);
    g.fillStyle = dark; g.fillRect(0, y0, W, 5); g.fillRect(0, y0 + half * 0.72, W, 4);
    for (let x = 0; x < W; x += W / 4) { g.fillRect(x, y0, 5, half * 0.8); }
    g.strokeStyle = trim; g.lineWidth = 2; // riveted panel outlines (the Westland Row girders' gilt roundels)
    for (let x = 0; x < W; x += W / 4) g.strokeRect(x + 10, y0 + 12, W / 4 - 20, half * 0.58);
    if (y0 === 0) { g.fillStyle = trim; for (let x = W / 8; x < W; x += W / 4) { g.beginPath(); g.arc(x, y0 + 12 + half * 0.29, 8, 0, 7); g.fill(); } }
    // the height bar: black and yellow chevrons along the bottom
    const by = y0 + half * 0.78, bh = half * 0.2;
    g.fillStyle = '#141414'; g.fillRect(0, by, W, bh);
    g.fillStyle = '#f2c21b';
    for (let k = -1; k < 12; k++) { g.beginPath(); g.moveTo(k * 24, by + bh); g.lineTo(k * 24 + 12, by + bh); g.lineTo(k * 24 + 24, by); g.lineTo(k * 24 + 12, by); g.closePath(); g.fill(); }
  }
}
// corrugated grey cladding (canopies and the platform back walls, ref 14)
function paintClad(g, W, H) {
  g.fillStyle = '#8e9396'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#767b7e'); gr.addColorStop(0.5, '#a3a8ab'); gr.addColorStop(1, '#767b7e'); g.fillStyle = gr; g.fillRect(x, 0, 8, H); }
  g.fillStyle = 'rgba(40,40,40,0.15)'; g.fillRect(0, H - 6, W, 6);
}
// the shed's glazing: panes between iron glazing bars (u along, v up the curve); lit from inside at night
function paintGlaze(g, W, H, night) {
  g.fillStyle = night ? '#000' : '#4b4f52'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += W / 6) for (let y = 0; y < H; y += H / 3) {
    if (night) { g.fillStyle = 'rgba(255,226,170,0.8)'; g.fillRect(x + 3, y + 3, W / 6 - 6, H / 3 - 6); continue; }
    const gr = g.createLinearGradient(0, y, 0, y + H / 3); gr.addColorStop(0, '#c8d2d6'); gr.addColorStop(1, '#8e9ba1');
    g.fillStyle = gr; g.fillRect(x + 3, y + 3, W / 6 - 6, H / 3 - 6);
  }
}
// red brick in Flemish bond with a tall round-headed window per 4.5 m bay (Pearse's front, v = 4.5 m a storey)
function paintBrick(g, W, H, night) {
  const r = rng(17);
  if (!night) {
    g.fillStyle = '#8d4a33'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 ? -8 : 0; x < W; x += 16) { const l = (r() - 0.5) * 26; g.fillStyle = `rgb(${150 + l},${74 + l * 0.6},${52 + l * 0.4})`; g.fillRect(x + 1, y + 1, 14, 4); }
    g.fillStyle = '#b9ad98'; g.fillRect(0, H - 14, W, 6); // limestone string course
  } else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  const ww = W * 0.34, wx = (W - ww) / 2, wy = H * 0.2, wh = H * 0.58;
  g.fillStyle = night ? (r() < 0.8 ? 'rgba(255,214,150,0.9)' : '#000') : '#23282c';
  g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill();
  if (!night) { g.strokeStyle = '#d8d2c2'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#d8d2c2'; g.fillRect(wx + ww / 2 - 1, wy + 6, 2, wh - 6); g.fillRect(wx, wy + wh * 0.55, ww, 2); }
}
// signs atlas (1024 x 512): the Irish Rail name boards (blue, green stripe, Irish over English), a clock face, swatches
const SIGN = { tara: [0, 0, 512, 96], connolly: [512, 0, 512, 96], pearse: [0, 96, 512, 96], clock: [512, 96, 128, 128], lamp: [640, 96, 64, 64], white: [704, 96, 64, 64], black: [768, 96, 64, 64] };
function paintSigns(g, W, H, night) {
  g.clearRect(0, 0, W, H);
  const board = ([x, y, w, h], ga, en) => {
    g.fillStyle = night ? '#0c2a5c' : '#16408a'; g.fillRect(x, y, w, h);
    g.fillStyle = night ? '#1b6b3a' : '#2d9a4e'; g.fillRect(x, y, w, 12);
    g.fillStyle = night ? '#e8ecf4' : '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = 'italic 26px Arial, sans-serif'; g.fillText(ga, x + 20, y + 36);
    g.font = 'bold 38px Arial, sans-serif'; g.fillText(en, x + 20, y + 72);
  };
  board(SIGN.tara, 'Sráid na Teamhrach', 'Tara Street');
  board(SIGN.connolly, 'Stáisiún Uí Chonghaile', 'Connolly');
  board(SIGN.pearse, 'Stáisiún na bPiarsach', 'Pearse');
  { const [x, y, w] = SIGN.clock, c = x + w / 2, m = y + w / 2; // the fire tower's clock
    g.fillStyle = night ? '#fff4d8' : '#f4f1e6'; g.beginPath(); g.arc(c, m, w / 2 - 4, 0, 7); g.fill();
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#1a1a1a'; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillRect(c + Math.cos(a) * 48 - 2, m + Math.sin(a) * 48 - 2, 4, 4); }
    g.lineWidth = 4; g.beginPath(); g.moveTo(c, m); g.lineTo(c + 22, m - 20); g.moveTo(c, m); g.lineTo(c - 4, m - 42); g.stroke(); }
  for (const [k, col, lit] of [['lamp', '#f5f2e8', '#fff6e0'], ['white', '#e9e7e0', '#000'], ['black', '#101214', '#000']]) { const [x, y, w, h] = SIGN[k]; g.fillStyle = night ? lit : col; g.fillRect(x, y, w, h); }
}

let mats = null;
function materials() {
  if (mats) return mats;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const pair = (w, h, paint) => [tex(canvas(w, h, (g, W, H) => paint(g, W, H, false))), tex(canvas(w, h, (g, W, H) => paint(g, W, H, true), 0.5))];
  const glaze = pair(256, 128, paintGlaze), brick = pair(128, 144, paintBrick);
  const signs = [tex(canvas(1024, 512, (g, W, H) => paintSigns(g, W, H, false)), { repeat: false }), tex(canvas(1024, 512, (g, W, H) => paintSigns(g, W, H, true), 0.5), { repeat: false })];
  mats = {
    arcade: std({ map: tex(canvas(256, 256, paintArcade)), roughness: 0.93 }),
    ballast: std({ map: tex(canvas(128, 64, paintBallast)), roughness: 0.97 }),
    plat: std({ map: tex(canvas(128, 64, paintPlatform)), roughness: 0.85 }),
    girder: std({ map: tex(canvas(256, 256, paintGirder)), roughness: 0.6, metalness: 0.25 }),
    clad: std({ map: tex(canvas(64, 64, paintClad)), roughness: 0.55, metalness: 0.3 }),
    glaze: std({ map: glaze[0], emissive: 0xffffff, emissiveMap: glaze[1], emissiveIntensity: 0, roughness: 0.25, metalness: 0.2 }),
    brick: std({ map: brick[0], emissive: 0xffffff, emissiveMap: brick[1], emissiveIntensity: 0, roughness: 0.88 }),
    sign: std({ map: signs[0], emissive: 0xffffff, emissiveMap: signs[1], emissiveIntensity: 0, roughness: 0.5 }),
    // everything plain-coloured shares one material (vertex colours): rails, masts, wires, columns, the portal
    paint: std({ vertexColors: true, roughness: 0.5, metalness: 0.35 }),
  };
  for (const [k, m] of Object.entries(mats)) m.name = 'rail_' + k;
  return mats;
}
// vertex colours are linear: written here in sRGB and converted
const lin = (c) => c.map((v) => Math.pow(v, 2.2));
const COL = Object.fromEntries(Object.entries({ rail: [0.55, 0.57, 0.6], mast: [0.5, 0.53, 0.52], wire: [0.12, 0.12, 0.13], iron: [0.2, 0.25, 0.24], dark: [0.05, 0.055, 0.06], post: [0.3, 0.32, 0.33], maroon: [0.38, 0.15, 0.13], gold: [0.72, 0.57, 0.3], stone: [0.66, 0.65, 0.62], cap: [0.3, 0.32, 0.34], band: [0.55, 0.26, 0.19] }).map(([k, v]) => [k, lin(v)]));

// ---------- geometry accumulator: per material, per 150 m of line ----------
class Acc {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  tri(a, b, c, ua, ub, uc, n, col) {
    this.p.push(...a, ...b, ...c); this.n.push(...n, ...n, ...n); this.uv.push(...ua, ...ub, ...uc);
    const k = col || [1, 1, 1]; this.c.push(...k, ...k, ...k);
  }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function build() {
  const acc = new Map();
  const get = (mat, s) => { const k = `${mat}|${Math.floor(s / 150)}`; if (!acc.has(k)) acc.set(k, { mat, a: new Acc() }); return acc.get(k).a; };
  // a quad a-b-c-d (any winding) facing along hint; uvs per corner
  const quad = (mat, s, a, b, c, d, uvs, hint, col) => {
    let n = norm3(cross(sub(b, a), sub(d, a)));
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { [b, d] = [d, b]; uvs = [uvs[0], uvs[3], uvs[2], uvs[1]]; n = n.map((v) => -v); }
    const A = get(mat, s);
    A.tri(a, b, c, uvs[0], uvs[1], uvs[2], n, col); A.tri(a, c, d, uvs[0], uvs[2], uvs[3], n, col);
  };
  const P3 = (p, y) => [p.x, y, p.z];
  const U0 = [[0, 0], [0, 0], [0, 0], [0, 0]];
  // an axis-free box in the line's frame: s0..s1 along, q0..q1 across, y0..y1 up (paint material)
  const lineBox = (s0, s1, q0, q1, y0, y1, col, mat = 'paint', uv = U0) => {
    const c = [[s0, q0], [s1, q0], [s1, q1], [s0, q1]].map(([s, q]) => offsetAt(s, q)), m = (s0 + s1) / 2, f = at(m);
    const out = [[c[0], c[1], [-f.n.x, 0, -f.n.z]], [c[1], c[2], [f.d.x, 0, f.d.z]], [c[2], c[3], [f.n.x, 0, f.n.z]], [c[3], c[0], [-f.d.x, 0, -f.d.z]]];
    for (const [a, b, h] of out) quad(mat, m, P3(a, y0), P3(b, y0), P3(b, y1), P3(a, y1), uv, h, col);
    quad(mat, m, P3(c[0], y1), P3(c[1], y1), P3(c[2], y1), P3(c[3], y1), uv, [0, 1, 0], col);
  };
  // a box at a point, turned to heading rot (paint)
  const box = (x, z, rot, w, d, y0, y1, col, s) => {
    const cs = Math.cos(rot), sn = Math.sin(rot), P = (lx, lz, y) => [x + lx * cs + lz * sn, y, z - lx * sn + lz * cs];
    const hw = w / 2, hd = d / 2, C = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = C[i], [bx, bz] = C[(i + 1) % 4], mx = (ax + bx) / 2, mz = (az + bz) / 2;
      quad('paint', s, P(ax, az, y0), P(bx, bz, y0), P(bx, bz, y1), P(ax, az, y1), U0, [mx * cs + mz * sn, 0, -mx * sn + mz * cs], col);
    }
    quad('paint', s, P(-hw, -hd, y1), P(hw, -hd, y1), P(hw, hd, y1), P(-hw, hd, y1), U0, [0, 1, 0], col);
  };
  const cyl = (x, z, r, y0, y1, col, s, seg = 8) => {
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      quad('paint', s, [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r], [x + Math.cos(a1) * r, y1, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y1, z + Math.sin(a0) * r], U0, [Math.cos(am), 0, Math.sin(am)], col);
    }
  };
  const samples = (a, b, step = 2) => { const n = Math.max(1, Math.ceil((b - a) / step)), out = []; for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n); return out; };
  // a ribbon between two offsets across the line, at heights ya / yb (functions of s), facing hint(s)
  const ribbon = (mat, a, b, qa, qb, ya, yb, uvf, hint, step = 2, col) => {
    const ss = samples(a, b, step);
    for (let i = 0; i + 1 < ss.length; i++) {
      const s0 = ss[i], s1 = ss[i + 1];
      const A = offsetAt(s0, qa(s0)), B = offsetAt(s1, qa(s1)), C = offsetAt(s1, qb(s1)), D = offsetAt(s0, qb(s0));
      quad(mat, s0, P3(A, ya(s0)), P3(B, ya(s1)), P3(C, yb(s1)), P3(D, yb(s0)), [uvf(s0, 0), uvf(s1, 0), uvf(s1, 1), uvf(s0, 1)], hint(s0), col);
    }
  };
  const nrm = (s, k = 1) => { const f = at(s); return [f.n.x * k, 0, f.n.z * k]; };
  const UP = () => [0, 1, 0];
  const top = (s) => deckAt(s) + PARAPET;
  const inGCD = (s) => s > GCD.s0 - 0.5 && s < GCD.s1 + 0.5;
  const pearse = stations.find((st) => st.canopy === 'pearse');
  const shed = pearse ? { s0: pearse.s - pearse.len / 2 - 3, s1: pearse.s + pearse.len / 2 + 1, q: 7.4, spring: 5.2, rise: 4.4 } : null;

  // ---- the masonry viaduct between the spans: blind-arched calp walls, parapets, end walls (solid for the car)
  for (const [a, b] of R.solidRanges()) {
    const ss = samples(a, b, 2);
    const plain = (s) => deckAt(s) < 4.2; // the low wall of the ramp down to Lansdowne Road: no arches
    const vOf = (s, y) => (plain(s) ? 0.88 + (0.1 * y) / top(s) : y / top(s));
    for (const side of [-1, 1]) {
      const O = (s) => side * halfAt(s), I = (s) => side * (halfAt(s) - WALL_T);
      ribbon('arcade', a, b, O, O, () => -0.05, top, (s, t) => [s / BAY, t ? vOf(s, top(s)) : 0], (s) => nrm(s, side));
      ribbon('arcade', a, b, I, I, deckAt, top, (s, t) => [s / BAY, t ? 0.99 : 0.9], (s) => nrm(s, -side));
      ribbon('plat', a, b, I, O, top, top, (s, t) => [0.3 + t * 0.2, s / 2], UP);
      const pts = ss.map((s) => offsetAt(s, O(s)));
      for (let i = 0; i + 1 < pts.length; i++) addSegment(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
    }
    // end walls where the viaduct meets a span (not where the line runs on into barrowst's embankment or the ramp's foot)
    for (const [s, k] of [[a, -1], [b, 1]]) {
      if (s < 0.5 && k < 0) { /* the north end of the modelled line */ } else if (inGCD(s + k) || s >= LANSDOWNE.s0 - 0.5) continue;
      const h = halfAt(s), L = offsetAt(s, -h), Rr = offsetAt(s, h), f = at(s);
      quad('arcade', s, P3(L, -0.05), P3(Rr, -0.05), P3(Rr, top(s)), P3(L, top(s)), [[0, 0.88], [1.6, 0.88], [1.6, 0.98], [0, 0.98]], [f.d.x * k, 0, f.d.z * k]);
      addSegment(L.x, L.z, Rr.x, Rr.z);
    }
  }

  // ---- the track bed along the whole line (barrowst and the Lansdowne crossing have their own): ballast, sleepers, rails
  const bedRanges = [[0, GCD.s0], [GCD.s1, LANSDOWNE.s0 + 1]];
  for (const [a, b] of bedRanges) {
    const inner = (s) => halfAt(s) - WALL_T;
    ribbon('ballast', a, b, (s) => -inner(s), inner, deckAt, deckAt, (s, t) => [0.08 + t * 0.34, s / 3], UP);
    for (const tr of [-1, 1]) {
      const c = (s) => tr * trackAt(s);
      ribbon('ballast', a, b, (s) => c(s) - 1.3, (s) => c(s) + 1.3, (s) => deckAt(s) + 0.03, (s) => deckAt(s) + 0.03, (s, t) => [0.5 + t * 0.5, s / 0.65], UP);
      for (const rr of [-0.8, 0.8]) {
        const q = (s) => c(s) + rr, rt = (s) => deckAt(s) + R.RAIL_UP, rb = (s) => deckAt(s) + 0.05;
        ribbon('paint', a, b, (s) => q(s) - 0.04, (s) => q(s) + 0.04, rt, rt, () => [0, 0], UP, 4, COL.rail);
        ribbon('paint', a, b, (s) => q(s) - 0.04, (s) => q(s) - 0.04, rb, rt, () => [0, 0], (s) => nrm(s, -1), 4, COL.rail);
        ribbon('paint', a, b, (s) => q(s) + 0.04, (s) => q(s) + 0.04, rb, rt, () => [0, 0], (s) => nrm(s, 1), 4, COL.rail);
      }
    }
  }

  // ---- plate-girder bridges (the lattice ones are the Blender hero): two girders, the steel floor under the ballast,
  // stiffeners, cast-iron columns at the kerbs
  // girders: false for the lattice spans, whose girders come from the Blender hero (the floor and columns are built here)
  const plate = (sp, girders = true) => {
    const maroon = sp.over.some((n) => /Westland|Pearse/.test(n)); // the ornate Westland Row bridge (ref 16)
    // the girder texture is two paints: maroon in v 0.5..1, grey in v 0..0.5 (canvas top = v 1)
    const vT = maroon ? 0.995 : 0.495, vB = maroon ? 0.505 : 0.005, gb = (s) => deckAt(s) - GIRDER.below, gt = (s) => deckAt(s) + GIRDER.above;
    for (const side of (girders ? [-1, 1] : [])) {
      const O = (s) => side * halfAt(s), I = (s) => side * (halfAt(s) - 0.35);
      ribbon('girder', sp.s0, sp.s1, O, O, gb, gt, (s, t) => [s / 3.6, t ? vT : vB], (s) => nrm(s, side));
      ribbon('girder', sp.s0, sp.s1, I, I, deckAt, gt, (s, t) => [s / 3.6, t ? vT : vT - 0.3], (s) => nrm(s, -side));
      ribbon('girder', sp.s0, sp.s1, I, O, gt, gt, (s, t) => [s / 3.6, vT - 0.01 - t * 0.02], UP);
      ribbon('girder', sp.s0, sp.s1, I, O, gb, gb, (s, t) => [s / 3.6, vT - 0.01 - t * 0.02], () => [0, -1, 0]);
      // stiffeners on the outer face every 1.8 m, and on the Westland Row bridge a cast-iron balustrade over the top
      for (let s = sp.s0 + 0.9; s < sp.s1 - 0.4; s += 1.8) lineBox(s - 0.07, s + 0.07, O(s) + (side > 0 ? 0 : -0.07), O(s) + (side > 0 ? 0.07 : 0), gb(s) + 0.1, gt(s) - 0.05, maroon ? COL.maroon : COL.post);
      if (maroon) for (let s = sp.s0 + 0.4; s < sp.s1 - 0.2; s += 0.6) lineBox(s - 0.06, s + 0.06, I(s) + side * 0.12 - 0.05, I(s) + side * 0.12 + 0.05, gt(s), gt(s) + 0.75, COL.maroon);
      if (maroon) ribbon('paint', sp.s0, sp.s1, (s) => I(s) + side * 0.02, (s) => O(s) - side * 0.1, (s) => gt(s) + 0.75, (s) => gt(s) + 0.75, () => [0, 0], UP, 2, COL.gold);
    }
    // the floor: dark steel troughing under the ballast
    ribbon('paint', sp.s0, sp.s1, (s) => -halfAt(s) + 0.35, (s) => halfAt(s) - 0.35, (s) => deckAt(s) - 1.0, (s) => deckAt(s) - 1.0, () => [0, 0], () => [0, -1, 0], 2, COL.dark);
    for (let s = sp.s0 + 1.5; s < sp.s1 - 1; s += 3) lineBox(s - 0.12, s + 0.12, -halfAt(s) + 0.35, halfAt(s) - 0.35, deckAt(s) - 1.25, deckAt(s) - 1.0, COL.dark);
    // columns: fluted cast iron on a plinth, a capital and a cap plate under the girder
    for (const [s, side] of sp.cols) {
      const p = offsetAt(s, side * (halfAt(s) - 0.35)), y1 = gb(s);
      cyl(p.x, p.z, 0.55, 0, 0.9, COL.iron, s); cyl(p.x, p.z, 0.33, 0.9, y1 - 0.5, COL.iron, s, 10); cyl(p.x, p.z, 0.5, y1 - 0.5, y1, COL.iron, s);
      addBox(p.x, p.z, 0.55, 0.55, 0);
    }
  };
  for (const sp of spans) plate(sp, sp.style === 'plate');

  // ---- the overhead line: portal masts on both parapets every 30 m, a cross-girder, contact and catenary wires
  const wireRanges = [[3, LANSDOWNE.s0 - 1]];
  const halfW = (s) => (inGCD(s) ? 6.5 : halfAt(s));
  for (const [a, b] of wireRanges) {
    for (let s = a + 12; s < b; s += 30) {
      if (shed && s > shed.s0 - 2 && s < shed.s1 + 2) continue;
      const f = at(s), y0 = deckAt(s) + 0.6, rot = Math.atan2(f.d.x, f.d.z);
      for (const side of [-1, 1]) { const p = offsetAt(s, side * (halfW(s) + 0.25)); box(p.x, p.z, rot, 0.3, 0.3, y0, deckAt(s) + 6.9, COL.mast, s); }
      lineBox(s - 0.15, s + 0.15, -halfW(s) - 0.3, halfW(s) + 0.3, deckAt(s) + 6.45, deckAt(s) + 6.75, COL.mast);
      for (const tr of [-1, 1]) lineBox(s - 0.05, s + 0.05, tr * trackAt(s) - 0.05, tr * trackAt(s) + 0.05, deckAt(s) + 5.25, deckAt(s) + 6.45, COL.mast); // droppers to the registration arms
    }
    for (const tr of [-1, 1]) for (const [dy, w] of [[5.2, 0.035], [6.0, 0.03]]) {
      const q = (s) => tr * trackAt(s), y = (s) => deckAt(s) + dy;
      ribbon('paint', a, b, (s) => q(s) - w, (s) => q(s) + w, y, y, () => [0, 0], () => [0, -1, 0], 6, COL.wire);
      ribbon('paint', a, b, q, q, (s) => y(s) - w, (s) => y(s) + w, () => [0, 0], (s) => nrm(s, 1), 6, COL.wire);
    }
  }

  // ---- stations: side platforms, canopies with lamps, name boards; Pearse's shed
  for (const st of stations) {
    if (st.dressed || !st.len) continue;
    // the platforms stop short of the street spans on either side
    let a = st.s - st.len / 2, b = st.s + st.len / 2;
    for (const sp of spans) { if (sp.s1 > a && sp.s1 < st.s) a = sp.s1 + 0.5; if (sp.s0 < b && sp.s0 > st.s) b = sp.s0 - 0.5; }
    st.range = [a, b];
    const board = st.canopy === 'tara' ? SIGN.tara : st.canopy === 'connolly' ? SIGN.connolly : SIGN.pearse;
    for (const side of [-1, 1]) {
      const E = () => side * PLATFORM.edge, B = (s) => side * (halfAt(s) - WALL_T), py = (s) => deckAt(s) + PLATFORM.up;
      ribbon('plat', a, b, E, B, py, py, (s, t) => [t, s / 2], UP);
      ribbon('arcade', a, b, E, E, (s) => deckAt(s) + 0.02, py, (s, t) => [s / BAY, t ? 0.99 : 0.95], (s) => nrm(s, -side));
      for (const [s, k] of [[a, -1], [b, 1]]) { const f = at(s); quad('arcade', s, P3(offsetAt(s, E()), deckAt(s)), P3(offsetAt(s, B(s)), deckAt(s)), P3(offsetAt(s, B(s)), py(s)), P3(offsetAt(s, E()), py(s)), [[0, 0.95], [0.3, 0.95], [0.3, 0.99], [0, 0.99]], [f.d.x * k, 0, f.d.z * k]); }
      if (st.canopy === 'pearse') continue;
      // canopy: posts, a sheet roof falling to the back, the corrugated back wall, a lamp strip along the front
      const c0 = a + 3, c1 = b - 3, rf = (s) => deckAt(s) + 4.25, rb = (s) => deckAt(s) + 4.55;
      for (let s = c0; s <= c1 + 0.01; s += 6) { const p = offsetAt(s, side * 5.4), f = at(s); box(p.x, p.z, Math.atan2(f.d.x, f.d.z), 0.22, 0.22, py(s), rf(s), COL.post, s); }
      ribbon('clad', c0, c1, (s) => side * 3.9, (s) => side * (halfAt(s) - 0.1), rf, rb, (s, t) => [s / 2, t * 2], UP);
      ribbon('clad', c0, c1, (s) => side * 3.9, (s) => side * (halfAt(s) - 0.1), (s) => rf(s) - 0.15, (s) => rb(s) - 0.15, (s, t) => [s / 2, t * 2], () => [0, -1, 0]);
      ribbon('clad', c0, c1, (s) => side * 3.9, (s) => side * 3.9, (s) => rf(s) - 0.45, rf, (s, t) => [s / 2, t * 0.3], (s) => nrm(s, -side));
      ribbon('clad', a + 1, b - 1, (s) => side * (halfAt(s) - WALL_T - 0.02), (s) => side * (halfAt(s) - WALL_T - 0.02), top, rb, (s, t) => [s / 2, t * 3], (s) => nrm(s, -side));
      ribbon('sign', c0, c1, (s) => side * 4.6, (s) => side * 4.85, (s) => rf(s) - 0.17, (s) => rf(s) - 0.17, () => [(SIGN.lamp[0] + 32) / 1024, 1 - (SIGN.lamp[1] + 32) / 512], () => [0, -1, 0]);
      // name boards on the back wall, facing the track, a third and two thirds along
      for (const f of [0.3, 0.7]) {
        const s0 = a + (b - a) * f - 2, s1 = s0 + 4, q = side * (halfAt(s0) - WALL_T - 0.05), y0 = deckAt(s0) + 2.1, y1 = y0 + 0.75;
        const [x, y, w, h] = board, uvs = [[x / 1024, 1 - (y + h) / 512], [(x + w) / 1024, 1 - (y + h) / 512], [(x + w) / 1024, 1 - y / 512], [x / 1024, 1 - y / 512]];
        const A = offsetAt(side > 0 ? s1 : s0, q), Bp = offsetAt(side > 0 ? s0 : s1, q); // text reads left to right from the track
        quad('sign', s0, P3(A, y0), P3(Bp, y0), P3(Bp, y1), P3(A, y1), uvs, nrm(s0, -side));
      }
    }
  }
  // Pearse: the 1880s shed, a segmental iron-and-glass vault over both platforms and tracks on red-brick side walls
  // (refs 16, 18), open at both ends; arched ribs every 7 m; hung lamps; its front building on Westland Row
  if (shed) {
    const N = 10, arc = (k) => { const t = k / N, a = Math.PI * (1 - t); return { q: Math.cos(a) * shed.q, y: shed.spring + Math.sin(a) * shed.rise }; };
    for (let k = 0; k < N; k++) {
      const p0 = arc(k), p1 = arc(k + 1), mq = (p0.q + p1.q) / 2, my = (p0.y + p1.y) / 2 - shed.spring;
      const h = (s) => [at(s).n.x * mq / shed.q, (my / shed.rise) * 1.4, at(s).n.z * mq / shed.q];
      ribbon('glaze', shed.s0, shed.s1, () => p0.q, () => p1.q, (s) => deckAt(s) + p0.y, (s) => deckAt(s) + p1.y, (s, t) => [s / 4, (k + t) / 3], (s) => norm3(h(s)));
      ribbon('glaze', shed.s0, shed.s1, () => p0.q, () => p1.q, (s) => deckAt(s) + p0.y - 0.08, (s) => deckAt(s) + p1.y - 0.08, (s, t) => [s / 4, (k + t) / 3], (s) => norm3(h(s)).map((v) => -v));
      for (let s = shed.s0; s <= shed.s1 + 0.01; s += 7) {
        const A = offsetAt(s, p0.q), B = offsetAt(s, p1.q), f = at(s);
        quad('paint', s, P3(A, deckAt(s) + p0.y - 0.5), P3(B, deckAt(s) + p1.y - 0.5), P3(B, deckAt(s) + p1.y - 0.05), P3(A, deckAt(s) + p0.y - 0.05), U0, [f.d.x, 0, f.d.z], COL.maroon);
        quad('paint', s, P3(A, deckAt(s) + p0.y - 0.5), P3(B, deckAt(s) + p1.y - 0.5), P3(B, deckAt(s) + p1.y - 0.05), P3(A, deckAt(s) + p0.y - 0.05), U0, [-f.d.x, 0, -f.d.z], COL.maroon);
      }
    }
    for (const side of [-1, 1]) {
      const q = () => side * shed.q, yT = (s) => deckAt(s) + shed.spring;
      ribbon('brick', shed.s0, shed.s1, q, q, () => -0.05, yT, (s, t) => [s / 4.5, t ? yT(s) / 4.5 : 0], (s) => nrm(s, side));
      ribbon('brick', shed.s0, shed.s1, q, q, (s) => deckAt(s) + PLATFORM.up, yT, (s, t) => [s / 4.5, t ? 1 : 0.1], (s) => nrm(s, -side));
      ribbon('plat', shed.s0, shed.s1, (s) => side * (shed.q - 0.5), (s) => side * (shed.q + 0.3), (s) => yT(s) + 0.01, (s) => yT(s) + 0.01, (s, t) => [0.4 + t * 0.2, s / 2], UP);
      const pts = samples(shed.s0, shed.s1, 4).map((s) => offsetAt(s, q()));
      for (let i = 0; i + 1 < pts.length; i++) addSegment(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
      for (let s = shed.s0 + 4; s < shed.s1 - 2; s += 8) ribbon('sign', s - 1.5, s + 1.5, () => side * 3.2, () => side * 3.45, (x) => deckAt(x) + 5.0, (x) => deckAt(x) + 5.0, () => [(SIGN.lamp[0] + 32) / 1024, 1 - (SIGN.lamp[1] + 32) / 512], () => [0, -1, 0]);
    }
    // the platforms' boards under the vault
    for (const side of [-1, 1]) for (const f of [0.25, 0.65]) {
      const s0 = shed.s0 + (shed.s1 - shed.s0) * f, s1 = s0 + 4, q = side * 5.5, y0 = deckAt(s0) + 3.0, y1 = y0 + 0.75, [x, y, w, h] = SIGN.pearse;
      const uvs = [[x / 1024, 1 - (y + h) / 512], [(x + w) / 1024, 1 - (y + h) / 512], [(x + w) / 1024, 1 - y / 512], [x / 1024, 1 - y / 512]];
      for (const k of [-1, 1]) { const A = offsetAt(k * side > 0 ? s1 : s0, q), Bp = offsetAt(k * side > 0 ? s0 : s1, q); quad('sign', s0, P3(A, y0), P3(Bp, y0), P3(Bp, y1), P3(A, y1), uvs, nrm(s0, -side * k)); }
    }
    // the red-brick front on Westland Row (R.pearseFront: a quadrilateral against the street and the viaduct)
    const F = R.pearseFront();
    if (F) {
      const H = 15, s = F.s, sides = F.poly.map((p, i) => [p, F.poly[(i + 1) % 4]]);
      for (const [p, q] of sides) {
        const d = v2.norm(v2.sub(q, p)), L = v2.len(v2.sub(q, p)), out = [d.z, 0, -d.x];
        const c = v2.lerp(p, q, 0.5), toC = v2.sub(c, F.centre), hint = out[0] * toC.x + out[2] * toC.z > 0 ? out : out.map((v) => -v);
        quad('brick', s, P3(p, -0.05), P3(q, -0.05), P3(q, H), P3(p, H), [[0, 0], [L / 4.5, 0], [L / 4.5, H / 4.5], [0, H / 4.5]], hint);
        addSegment(p.x, p.z, q.x, q.z);
      }
      const [A, B, C, D] = F.poly;
      quad('plat', s, P3(A, H), P3(B, H), P3(C, H), P3(D, H), [[0.3, 0], [0.5, 0], [0.5, 2], [0.3, 2]], [0, 1, 0]);
      // the "Stáisiún na bPiarsach / Pearse Station" board over the entrance on the street front
      const [x, y, w, h] = SIGN.pearse, d = v2.norm(v2.sub(B, A)), m = v2.lerp(A, B, 0.5), out = { x: d.z, z: -d.x };
      const o = v2.dot(out, v2.sub(m, F.centre)) > 0 ? 0.08 : -0.08, e0 = { x: m.x - d.x * 3 + out.x * o, z: m.z - d.z * 3 + out.z * o }, e1 = { x: m.x + d.x * 3 + out.x * o, z: m.z + d.z * 3 + out.z * o };
      const uvs = [[x / 1024, 1 - (y + h) / 512], [(x + w) / 1024, 1 - (y + h) / 512], [(x + w) / 1024, 1 - y / 512], [x / 1024, 1 - y / 512]];
      const hint = [out.x * Math.sign(o), 0, out.z * Math.sign(o)];
      quad('sign', s, [e0.x, 3.4, e0.z], [e1.x, 3.4, e1.z], [e1.x, 4.4, e1.z], [e0.x, 4.4, e0.z], o > 0 ? uvs : [uvs[1], uvs[0], uvs[3], uvs[2]], hint);
    }
  }

  // ---- the covered way under the Aviva's west podium: the dark mouth on its north face
  {
    const s = LANSDOWNE.podium, f = at(s), L = offsetAt(s + 0.05, -4.6), Rr = offsetAt(s + 0.05, 4.6);
    quad('paint', s, P3(L, 0.1), P3(Rr, 0.1), P3(Rr, 4.0), P3(L, 4.0), U0, [-f.d.x, 0, -f.d.z], COL.dark);
  }

  // ---- the Tara Street fire station's hose tower (1906, 40 m, red brick; docs/research/tallest-buildings.md, ref 24):
  // a plain brick shaft, a corbelled band, the clock stage, an arcaded belfry stage, a bracketed cornice and a low cap
  {
    const T = R.fireTower, x = T.x, z = T.z, s = R.sOf(T), w = T.w;
    const FACES = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // outward normals
    const prism = (pw, y0, y1, mat, uvk, col) => {
      const h = pw / 2;
      for (const [nx, nz] of FACES) {
        const t = { x: -nz, z: nx }, cx = x + nx * h, cz = z + nz * h; // t runs along the face
        const a = [cx - t.x * h, 0, cz - t.z * h], b = [cx + t.x * h, 0, cz + t.z * h];
        quad(mat, s, [a[0], y0, a[2]], [b[0], y0, b[2]], [b[0], y1, b[2]], [a[0], y1, a[2]], [[0, y0 / uvk], [pw / uvk, y0 / uvk], [pw / uvk, y1 / uvk], [0, y1 / uvk]], [nx, 0, nz], col);
      }
      quad(mat, s, [x - h, y1, z - h], [x + h, y1, z - h], [x + h, y1, z + h], [x - h, y1, z + h], U0, [0, 1, 0], col);
    };
    prism(w, -0.05, 30, 'brick', 4.5);
    prism(w + 0.5, 30, 31.4, 'paint', 1, COL.band);
    prism(w - 0.2, 31.4, 36.6, 'brick', 4.5);
    prism(w + 0.9, 36.6, 37.3, 'paint', 1, COL.stone);
    for (const [nx, nz] of FACES) {
      const t = { x: -nz, z: nx };
      for (const o of [-0.55, 0.55]) { // the belfry's twin openings
        const cx = x + nx * ((w - 0.2) / 2 + 0.02) + t.x * o, cz = z + nz * ((w - 0.2) / 2 + 0.02) + t.z * o;
        quad('paint', s, [cx - t.x * 0.35, 32.3, cz - t.z * 0.35], [cx + t.x * 0.35, 32.3, cz + t.z * 0.35], [cx + t.x * 0.35, 35.4, cz + t.z * 0.35], [cx - t.x * 0.35, 35.4, cz - t.z * 0.35], U0, [nx, 0, nz], COL.dark);
      }
      const cx = x + nx * (w / 2 + 0.03), cz = z + nz * (w / 2 + 0.03), r = 0.95, [u, v, sw] = SIGN.clock; // a clock face on each side
      quad('sign', s, [cx - t.x * r, 23.2, cz - t.z * r], [cx + t.x * r, 23.2, cz + t.z * r], [cx + t.x * r, 25.1, cz + t.z * r], [cx - t.x * r, 25.1, cz - t.z * r],
        [[u / 1024, 1 - (v + sw) / 512], [(u + sw) / 1024, 1 - (v + sw) / 512], [(u + sw) / 1024, 1 - v / 512], [u / 1024, 1 - v / 512]], [nx, 0, nz]);
      // the cap: a shallow slated pyramid over the cornice
      const h = (w + 0.9) / 2, ex = x + nx * h, ez = z + nz * h, p0 = [ex - t.x * h, 37.3, ez - t.z * h], p1 = [ex + t.x * h, 37.3, ez + t.z * h];
      const n = norm3([nx, 0.9, nz]), A = get('paint', s), apex = [x, 40, z], capC = COL.cap;
      const wind = norm3(cross(sub(p1, p0), sub(apex, p0)));
      if (wind[0] * n[0] + wind[1] * n[1] + wind[2] * n[2] > 0) A.tri(p0, p1, apex, [0, 0], [0, 0], [0, 0], n, capC);
      else A.tri(p1, p0, apex, [0, 0], [0, 0], [0, 0], n, capC);
    }
    addBox(x, z, w / 2, w / 2, 0);
  }

  // ---- meshes
  const M = materials(), group = new THREE.Group();
  group.name = 'railway';
  for (const { mat, a } of acc.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
    if (mat === 'paint') g.setAttribute('color', new THREE.Float32BufferAttribute(a.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, M[mat]);
    m.castShadow = !['ballast', 'sign', 'plat'].includes(mat);
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

// the static line (one group for the landmark batch) and its night switch
export function buildRailway() {
  const group = build();
  return { group, setNight };
}
function setNight(l) {
  if (!mats) return;
  mats.sign.emissiveIntensity = 1.1 * l;
  mats.glaze.emissiveIntensity = 0.55 * l;
  mats.brick.emissiveIntensity = 0.6 * l;
}

// ---------- the Loopline Bridge (Blender hero) ----------
// tools/blender/build_loopline.py builds the lattice girders over the Liffey, George's Quay, Custom House Quay and
// Beresford Place, their floors, and the river piers (pairs of cast-iron cylinders banded black and gold) in world
// coordinates from models/railway-layout.json. Its textures are painted here.
const LL = { lattice: '#5f6a66', latticeDark: '#454e4b', pier: '#141618', gold: '#b8923f' };
function paintLoopAtlas(g, W, H) {
  // 0..512: the pier cylinders' bands (u round, v up); 512..1024 swatches: paint, dark, stone, gold
  const r = rng(21);
  g.fillStyle = LL.pier; g.fillRect(0, 0, 512, H);
  for (let y = 0; y < H; y += 22) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y, 512, 2); }
  g.fillStyle = LL.gold; g.fillRect(0, 40, 512, 18); g.fillRect(0, 150, 512, 10);
  // a shield on each face of the upper drum (Dublin Port and Docks' arms, simplified)
  for (let k = 0; k < 4; k++) {
    const cx = 64 + k * 128, cy = 100;
    g.fillStyle = LL.gold; g.beginPath(); g.moveTo(cx - 20, cy - 26); g.lineTo(cx + 20, cy - 26); g.lineTo(cx + 20, cy + 2); g.quadraticCurveTo(cx, cy + 30, cx - 20, cy + 2); g.closePath(); g.fill();
    g.fillStyle = LL.pier; g.beginPath(); g.moveTo(cx - 14, cy - 20); g.lineTo(cx + 14, cy - 20); g.lineTo(cx + 14, cy); g.quadraticCurveTo(cx, cy + 22, cx - 14, cy); g.closePath(); g.fill();
  }
  const sw = [['#5f6a66', 0], ['#3a403e', 1], ['#8d8a83', 2], [LL.gold, 3], ['#0d0f10', 4], ['#4b4f52', 5]];
  for (const [c, i] of sw) { g.fillStyle = c; g.fillRect(512 + (i % 4) * 128, Math.floor(i / 4) * 128, 128, 128); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(512 + r() * 512, r() * 128, 3, 3); }
}
export async function placeLoopline(scene) {
  let gltf;
  try { gltf = await load('loopline'); } catch (e) { console.warn('loopline model failed to load', e); return fallbackLattice(scene); }
  const root = gltf.scene.getObjectByName('loopline');
  if (!root) return fallbackLattice(scene);
  const atlas = tex(canvas(1024, 256, paintLoopAtlas), { repeat: false });
  atlas.flipY = false;
  const M = {
    ll_iron: new THREE.MeshStandardMaterial({ color: LL.lattice, roughness: 0.55, metalness: 0.35 }),
    ll_atlas: new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.45, metalness: 0.3 }),
    ll_stone: new THREE.MeshStandardMaterial({ color: 0x8e8b84, roughness: 0.9 }),
    ll_dark: new THREE.MeshStandardMaterial({ color: 0x1c1f21, roughness: 0.7 }),
  };
  for (const [k, m] of Object.entries(M)) m.name = k;
  const decoded = new WeakSet();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const col = o.geometry.attributes.color;
    if (col && col.normalized && !decoded.has(col)) { // the baked AO: decode and keep it off black (as heroes.js)
      for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, 0.35 + 0.65 * Math.pow(col.getComponent(i, c), 1 / 2.2));
      decoded.add(col); col.needsUpdate = true;
    }
    o.material = M[o.material.name] || M.ll_iron;
    if (col) { o.material.vertexColors = true; }
    o.castShadow = true; o.receiveShadow = true;
  });
  root.removeFromParent();
  scene.add(root);
  // one mesh per material per map block
  const b = batchStatic(scene, [root], { name: 'Loopline Bridge (batched)' });
  return { root: b.group };
}
// if the hero can't load, the lattice spans are left with their floors and columns only (reported in the console)
function fallbackLattice(scene) {
  console.warn('Loopline: plate-girder stand-in');
  return null;
}

