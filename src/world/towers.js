// Dublin's tall buildings (docs/research/tallest-buildings.md): the towers and spires off Wikipedia's "List of tallest
// buildings and structures in Dublin" that stand inside the map, built procedurally like O'Connell Bridge House: boxes
// in the landmark Builder, with a painted curtain-wall texture per building (colour, roughness/metalness and a lit-window
// map that comes up after dark), all merged into one mesh per material across the city (one draw call each).
// Positions and footprints: src/world/sites.js `tall` (OSM, slid clear of the roads). Plans ~0.55-0.6, heights real.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addReflections } from '../render/reflect.js';
import { rng } from './textures.js';
import { stoneTile } from './heroes.js';
import { tall } from './sites.js';

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- curtain walls ----------
// One canvas covers `bays` x `floors` cells (so lit windows don't repeat every bay). paint(g, mode, x, y, w, h, cell)
// draws one cell in the mode asked: 'map' (colour), 'rm' (roughness in G, metalness in B) or 'lit' (the lit-window
// emissive, black elsewhere). The cell's random draw (lit, tone) is shared by all three.
function panels({ bays, floors, bw = 32, fh = 48, seed = 1, litP = 0.28, paint }) {
  const r = rng(seed), cells = [];
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) cells.push({ b, f, lit: r() < litP ? 0.55 + r() * 0.45 : 0, tone: r(), warm: r() });
  const make = (mode) => canvasTex(bays * bw, floors * fh, (g) => { for (const c of cells) paint(g, mode, c.b * bw, (floors - 1 - c.f) * fh, bw, fh, c); }, mode !== 'rm');
  const t = ['map', 'rm', 'lit'].map(make);
  for (const x of t) x.repeat.set(1 / bays, 1 / floors);
  return t;
}
// fill helpers for the painters: glass (tinted, reflective, may be lit) and solid (frame, stone, spandrel)
function glass(g, mode, x, y, w, h, c, [top, bottom], litColor = [255, 214, 160]) {
  if (mode === 'map') {
    const k = Math.round((c.tone - 0.5) * 18), gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, `rgb(${top[0] + k},${top[1] + k},${top[2] + k})`); gr.addColorStop(1, `rgb(${bottom[0] + k},${bottom[1] + k},${bottom[2] + k})`);
    g.fillStyle = gr;
  } else if (mode === 'rm') g.fillStyle = 'rgb(0,20,200)';
  else {
    g.fillStyle = '#000'; g.fillRect(x, y, w, h);
    if (!c.lit) return;
    const cool = c.warm < 0.3 ? 0.82 : 1;
    g.fillStyle = `rgb(${Math.round(litColor[0] * c.lit * cool)},${Math.round(litColor[1] * c.lit)},${Math.round(litColor[2] * c.lit * (2 - cool))})`;
    g.fillRect(x, y + h * 0.15, w, h * 0.85); return;
  }
  g.fillRect(x, y, w, h);
}
function solid(g, mode, x, y, w, h, color, rough = 0.7, metal = 0) {
  g.fillStyle = mode === 'map' ? color : mode === 'rm' ? `rgb(0,${Math.round(rough * 255)},${Math.round(metal * 255)})` : '#000';
  g.fillRect(x, y, w, h);
}

const night = []; // { m, day, night }: emissive intensity after dark
function facadeMat(tex, { refl = 0.8, lit = 1.1, fog = '0.75' } = {}) {
  const [map, rm, litMap] = tex;
  const m = addReflections(new THREE.MeshStandardMaterial({ map, roughnessMap: rm, metalnessMap: rm, roughness: 1, metalness: 1, emissive: 0xffffff, emissiveMap: litMap, emissiveIntensity: 0 }), refl);
  m.defines = { FOG_SCALE: fog }; // reads further through the haze on the skyline (see atmosphere.js)
  night.push({ m, day: 0, night: lit });
  return m;
}
const plain = (o, fog = '0.75') => { const m = new THREE.MeshStandardMaterial(o); m.defines = { FOG_SCALE: fog }; return m; };
const glowing = (o, day, nightI, fog = '0.75') => { const m = plain({ emissive: o.emissive ?? o.color, emissiveIntensity: day, ...o }); night.push({ m, day, night: nightI }); return m; };

let T = null; // materials, made on first build (canvases need the DOM)
function materials() {
  if (T) return T;
  T = {};
  // Liberty Hall: a white concrete slab edge at every floor over a strip of blue-grey glass, slim aluminium mullions,
  // the odd orange or red blind (refs/tallest/libertyhall-1.jpg)
  T.lh = facadeMat(panels({ bays: 8, floors: 8, bw: 26, fh: 66, seed: 1965, litP: 0.3, paint(g, mode, x, y, w, h, c) {
    solid(g, mode, x, y, w, h, '#e9e7e0', 0.75);
    const gy = y + 2, gh = h - 20;
    glass(g, mode, x + 1, gy, w - 2, gh, c, c.tone > 0.965 ? [[150, 104, 78], [128, 88, 66]] : [[124, 146, 160], [74, 94, 108]]);
    solid(g, mode, x, gy, 1.5, gh, '#c9ccce', 0.4, 0.8);
  } }));
  T.white = plain({ color: 0xeceae3, roughness: 0.7 });
  T.copper = plain({ color: 0x6aa593, roughness: 0.7 });
  T.lhCrown = glowing({ color: 0x6aa593, roughness: 0.7, emissive: 0x9fe8d0 }, 0, 0.35);
  T.lhTop = glowing({ color: 0x2a3338, roughness: 0.25, metalness: 0.5, emissive: 0xffe3b8 }, 0, 0.9);
  T.shop = glowing({ color: 0x1d252b, roughness: 0.2, metalness: 0.5, emissive: 0xffe6c4 }, 0, 0.3);
  T.concrete = plain({ color: 0xbdb8ad, roughness: 0.85 });
  // George's Quay Plaza: blue-green reflective glass in a pale grey grid, a heavier stone line every floor
  T.gq = facadeMat(panels({ bays: 6, floors: 8, bw: 24, fh: 56, seed: 2002, litP: 0.24, paint(g, mode, x, y, w, h, c) {
    solid(g, mode, x, y, w, h, '#b9bdbd', 0.6, 0.2);
    glass(g, mode, x + 2, y + 4, w - 4, h - 12, c, [[118, 150, 156], [62, 92, 100]], [230, 236, 255]);
    solid(g, mode, x + w / 2 - 0.5, y + 4, 1, h - 12, '#9ea3a4', 0.5, 0.4);
  } }), { refl: 1.0, lit: 0.9 });
  T.stoneGrey = plain({ color: 0xc4c4bd, map: stoneTile(128, '#c9c8c1', 6, 0.15, 'rgba(110,110,105,0.35)', 0.12), roughness: 0.8 });
  T.zinc = addReflections(plain({ color: 0x4d555b, roughness: 0.35, metalness: 0.6 }), 0.6);
  // College Square: dark bronze frames round two storeys and three bays, dark glass, warm flats after dark
  T.cs = facadeMat(panels({ bays: 6, floors: 8, bw: 24, fh: 48, seed: 2025, litP: 0.34, paint(g, mode, x, y, w, h, c) {
    solid(g, mode, x, y, w, h, '#2b2724', 0.45, 0.6);
    glass(g, mode, x + 1.5, y + 2, w - 3, h - 4, c, [[150, 170, 184], [96, 114, 128]]);
    if (c.b % 3 === 0) solid(g, mode, x, y, 4, h, '#221f1c', 0.45, 0.6);
    if (c.f % 2 === 0) solid(g, mode, x, y + h - 4, w, 4, '#221f1c', 0.45, 0.6);
    solid(g, mode, x, y + h * 0.55, w, 1.5, '#3a3530', 0.45, 0.6);
  } }), { lit: 1.0 });
  T.bronze = plain({ color: 0x2a2623, roughness: 0.45, metalness: 0.6 });
  // College Square's office building: white fins over dark glass
  T.csOffice = facadeMat(panels({ bays: 8, floors: 6, bw: 20, fh: 50, seed: 2024, litP: 0.35, paint(g, mode, x, y, w, h, c) {
    solid(g, mode, x, y, w, h, '#eeefed', 0.5);
    glass(g, mode, x + 4, y + 3, w - 5, h - 9, c, [[86, 110, 130], [48, 64, 80]], [235, 240, 255]);
  } }));
  // Capital Dock: dark brown brick piers, a pale stone band every second floor, deep windows
  const brick = (g, mode, x, y, w, h) => {
    solid(g, mode, x, y, w, h, '#6e4637', 0.9);
    if (mode === 'map') for (let yy = y; yy < y + h; yy += 3) { g.fillStyle = 'rgba(20,12,10,0.25)'; g.fillRect(x, yy, w, 1); }
  };
  T.cd = facadeMat(panels({ bays: 6, floors: 8, bw: 28, fh: 44, seed: 2018, litP: 0.3, paint(g, mode, x, y, w, h, c) {
    brick(g, mode, x, y, w, h);
    glass(g, mode, x + 9, y + 5, w - 14, h - 10, c, [[112, 126, 134], [60, 72, 80]]);
    solid(g, mode, x + 7, y + h * 0.52, w - 11, 1.5, '#39393a', 0.5, 0.5);
    if (c.f % 2 === 0) solid(g, mode, x, y + h - 3, w, 3, '#c9c2b2', 0.8);
  } }));
  T.cdCrown = facadeMat(panels({ bays: 6, floors: 2, bw: 28, fh: 44, seed: 2019, litP: 0.4, paint(g, mode, x, y, w, h, c) {
    brick(g, mode, x, y, w, h);
    glass(g, mode, x + 6, y, w - 9, h, c, [[120, 136, 146], [70, 84, 94]]);
    solid(g, mode, x + w / 2, y, 1, h, '#2a2a2a', 0.5, 0.5);
  } }));
  T.brick = plain({ color: 0x6e4637, roughness: 0.9 });
  // the Exo: blue-grey glass behind the sky-blue steel frame
  T.exo = facadeMat(panels({ bays: 6, floors: 6, bw: 20, fh: 60, seed: 2022, litP: 0.3, paint(g, mode, x, y, w, h, c) {
    solid(g, mode, x, y, w, h, '#8d9aa2', 0.4, 0.7);
    glass(g, mode, x + 1, y + 2, w - 2, h - 10, c, [[104, 132, 150], [58, 82, 100]], [226, 234, 255]);
    solid(g, mode, x, y + h - 8, w, 2, '#b8c4ca', 0.4, 0.7);
  } }), { refl: 1.0, lit: 1.0 });
  T.exoBlue = glowing({ color: 0x3aa3e0, roughness: 0.45, metalness: 0.2, emissive: 0x3aa3e0 }, 0, 0.25);
  // the Millennium Tower: cream panels, paired windows; red-brown brick base
  T.mt = facadeMat(panels({ bays: 4, floors: 6, bw: 36, fh: 40, seed: 1998, litP: 0.32, paint(g, mode, x, y, w, h, c) {
    solid(g, mode, x, y, w, h, '#e4e0d4', 0.8);
    solid(g, mode, x, y + h - 2, w, 1, '#c8c3b6', 0.8);
    glass(g, mode, x + 6, y + 8, w - 12, h - 18, c, [[96, 110, 120], [52, 62, 70]]);
    solid(g, mode, x + w / 2 - 1, y + 8, 2, h - 18, '#d6d2c6', 0.8);
  } }));
  T.mtBrick = plain({ color: 0x7a3e2c, roughness: 0.9 });
  // Alto Vetro: floor-to-ceiling glass, thin mullions, a dark slab edge at each floor
  T.av = facadeMat(panels({ bays: 6, floors: 6, bw: 20, fh: 60, seed: 2008, litP: 0.34, paint(g, mode, x, y, w, h, c) {
    glass(g, mode, x, y, w, h, c, [[120, 150, 166], [60, 84, 100]]);
    solid(g, mode, x + w - 1.5, y, 1.5, h, '#d0d4d6', 0.4, 0.6);
    solid(g, mode, x, y + h - 7, w, 7, '#1d2226', 0.5, 0.3);
  } }), { refl: 1.0 });
  T.dark = plain({ color: 0x1b1f22, roughness: 0.6 });
  T.railGlass = addReflections(plain({ color: 0x9fb8c0, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.5, depthWrite: false }), 1);
  // churches: granite and limestone, floodlit after dark; slate roofs; lancet windows glowing warm at night
  const stone = (base, mortar, tint) => glowing({ color: 0xffffff, map: stoneTile(256, base, 8, 0.2, mortar, tint), roughness: 0.85, emissive: 0xfff0d8 }, 0, 0.16);
  T.granite = stone('#a9a69e', 'rgba(80,78,74,0.45)', 0.18);
  T.limestone = stone('#9a9993', 'rgba(60,60,58,0.5)', 0.3);
  T.dressing = stone('#dcd8cd', 'rgba(120,114,104,0.35)', 0.08);
  T.slate = plain({ color: 0x4d555a, roughness: 0.7 });
  const lancet = (lit) => canvasTex(64, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.beginPath(); g.moveTo(4, h); g.lineTo(4, 40); g.quadraticCurveTo(4, 4, w / 2, 0); g.quadraticCurveTo(w - 4, 4, w - 4, 40); g.lineTo(w - 4, h); g.closePath();
    g.fillStyle = lit ? '#b8834a' : '#20262c'; g.fill();
    g.strokeStyle = lit ? '#000' : '#8d8a82'; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w / 2, h); g.moveTo(4, 90); g.lineTo(w - 4, 90); g.stroke();
  });
  T.lancet = glowing({ color: 0xffffff, map: lancet(false), emissiveMap: lancet(true), emissive: 0xffffff, alphaTest: 0.5, roughness: 0.4, side: THREE.DoubleSide }, 0, 1.1);
  const clock = canvasTex(128, 128, (g) => {
    g.fillStyle = '#1d2226'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#d9b64a'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = '#d9b64a'; g.fillRect(64 + Math.sin(a) * 44 - 3, 64 - Math.cos(a) * 44 - 3, 6, 6); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(90, 50); g.moveTo(64, 64); g.lineTo(60, 22); g.stroke();
  });
  T.clock = plain({ map: clock, roughness: 0.5, alphaTest: 0.5 });
  return T;
}

// ---------- geometry helpers (in a building's local frame, via the landmark Builder) ----------
// A strut from (y0, z0) to (y1, z1) in the plane x = const (the Exo's braces)
function strut(b, mat, x, y0, z0, y1, z1, t = 0.5) {
  const L = Math.hypot(y1 - y0, z1 - z0);
  b.add(new THREE.BoxGeometry(t, L, t).translate(0, L / 2, 0), mat, { x, y: y0, z: z0, rx: Math.atan2(z1 - z0, y1 - y0) });
}
// A square pyramid of side s on a flat top at y (the George's Quay Plaza caps)
function pyramid(b, mat, s, h, o) {
  const g = new THREE.CylinderGeometry(0, s / Math.SQRT2, h, 4, 1).translate(0, h / 2, 0).toNonIndexed();
  g.computeVertexNormals(); // flat faces (the cylinder's own normals are smooth)
  b.add(g, mat, { ...o, ry: (o.ry || 0) + Math.PI / 4 });
}
// a lancet window facing +z (ry turns it) centred at (x, z), from y0 to y1
function lancetWin(b, x, y0, y1, z, w, ry = 0) { const h = y1 - y0; b.add(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0), T.lancet, { x, y: y0, z, ry }); }
// windows on all four faces of a square tower of half side r (centre cx, cz)
function round4(fn) { for (const [ry, sx, sz] of [[0, 0, 1], [Math.PI, 0, -1], [Math.PI / 2, 1, 0], [-Math.PI / 2, -1, 0]]) fn(ry, sx, sz); }
// the zig-zag fascia of a folded-plate roof along one side: n folds, from (x0,z0) to (x1,z1), top at y, dipping to y - dip
function zigzag(b, mat, x0, z0, x1, z1, y, dip, n) {
  const pos = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 0.5) / n, t2 = (i + 1) / n;
    const P = (t, yy) => [x0 + (x1 - x0) * t, yy, z0 + (z1 - z0) * t];
    pos.push(...P(t0, y), ...P(t1, y - dip), ...P(t1, y), ...P(t1, y), ...P(t1, y - dip), ...P(t2, y));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2)); g.computeVertexNormals();
  b.add(g, mat);
}

// ---------- the buildings ----------
function libertyHall(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, G = 4.6, FL = 3.3, N = 15, top = G + N * FL;
  b.box(W - 1.6, G, D - 1.6, T.shop, {});
  for (const sx of [-1, 1]) for (const sz of [-1, -1 / 3, 1 / 3, 1]) { b.box(0.7, G, 0.7, T.white, { x: sx * (W / 2 - 0.4), z: sz * (D / 2 - 0.4) }); b.box(0.7, G, 0.7, T.white, { x: sz * (W / 2 - 0.4), z: sx * (D / 2 - 0.4) }); }
  b.facade(W, N * FL, D, T.lh, T.white, { y: G }, 1.3, FL);
  for (let k = 0; k <= N; k++) b.box(W + 0.5, 0.35, D + 0.5, T.white, { y: G + k * FL - 0.3 }); // the slab edges, standing proud
  // the recessed top floor under the folded copper crown, and the plant room over it
  b.box(W - 1.6, 3.0, D - 1.6, T.lhTop, { y: top });
  const C = W / 2 + 1.3, cy = top + 3.3;
  b.box(2 * C, 0.25, 2 * C, T.lhCrown, { y: cy });
  for (const [x0, z0, x1, z1] of [[-C, C, C, C], [C, C, C, -C], [C, -C, -C, -C], [-C, -C, -C, C]]) zigzag(b, T.lhCrown, x0, z0, x1, z1, cy + 0.9, 1.3, 7);
  b.box(W * 0.55, 2.0, D * 0.55, T.copper, { y: cy + 0.25 });
  b.box(W * 0.35, 1.2, D * 0.3, T.copper, { x: -W * 0.08, y: cy + 2.25 });
  b.solid(0, 0, W, D);
  // the theatre wing on Eden Quay: two storeys of glass and white bands under a folded roof (in the tower's frame)
  const w = S.wing, c = Math.cos(S.rot), s = Math.sin(S.rot), dx = w.x - S.x, dz = w.z - S.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c, WW = w.w, WD = w.d;
  b.box(WW, 3.6, WD, T.shop, { x: lx, z: lz });
  b.facade(WW, 5.4, WD, T.lh, T.white, { x: lx, y: 3.6, z: lz }, 1.3, 2.7);
  b.box(WW + 0.4, 0.4, WD + 0.4, T.white, { x: lx, y: 3.4 });
  for (let k = 0; k < 6; k++) b.gable(WW / 6, 1.3, WD + 0.6, T.lhCrown, { x: lx - WW / 2 + (k + 0.5) * (WW / 6), y: 9, z: lz });
  b.solid(lx, lz, WW, WD);
  return b;
}

function gqPlaza(Builder, S) {
  const b = new Builder(S), c = Math.cos(S.rot), s = Math.sin(S.rot);
  for (const k of S.blocks) {
    const dx = k.x - S.x, dz = k.z - S.z, x = dx * c - dz * s, z = dx * s + dz * c, w = k.w, h = k.h;
    b.box(w - 1.2, 4.2, w - 1.2, T.shop, { x, z });
    b.facade(w, h - 4.2, w, T.gq, T.zinc, { x, y: 4.2, z }, 1.5, 3.5);
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(1.0, h, 1.0, T.stoneGrey, { x: x + px * (w / 2 - 0.35), z: z + pz * (w / 2 - 0.35) });
    b.box(w + 0.3, 0.8, w + 0.3, T.stoneGrey, { x, y: h - 0.8, z });
    pyramid(b, T.zinc, w + 0.2, 7, { x, y: h, z });
    b.solid(x, z, w, w);
  }
  return b;
}

function collegeSquare(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, H = 79;
  b.box(W - 1.4, 5, D - 1.4, T.shop, {});
  b.facade(W, H - 5, D, T.cs, T.bronze, { y: 5 }, 1.6, 3.2);
  // the frame's step at the eighth floor and the corner posts, the open crown frame over the roof terrace
  b.box(W + 0.5, 0.6, D + 0.5, T.bronze, { y: 29 });
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(0.8, H + 4 - 5, 0.8, T.bronze, { x: px * (W / 2 - 0.1), y: 5, z: pz * (D / 2 - 0.1) });
  for (const sz of [-1, 1]) b.box(W, 0.7, 0.7, T.bronze, { y: H + 3.3, z: sz * (D / 2 - 0.1) });
  for (const sx of [-1, 1]) b.box(0.7, 0.7, D, T.bronze, { x: sx * (W / 2 - 0.1), y: H + 3.3 });
  b.box(W * 0.55, 3, D * 0.5, T.lhTop, { x: W * 0.12, y: H });
  b.box(W - 1, 1.1, D - 1, T.railGlass, { y: H });
  b.solid(0, 0, W, D);
  // the office building: two storeys of bronze-framed glass, nine of white fins, a set-back top floor
  const o = S.office, c = Math.cos(S.rot), s = Math.sin(S.rot), dx = o.x - S.x, dz = o.z - S.z;
  const x = dx * c - dz * s, z = dx * s + dz * c;
  b.facade(o.w, 8, o.d, T.cs, T.bronze, { x, z }, 1.6, 4);
  b.facade(o.w, 31, o.d, T.csOffice, T.concrete, { x, y: 8, z }, 1.5, 3.45);
  b.facade(o.w - 3, 4, o.d - 3, T.csOffice, T.concrete, { x, y: 39, z }, 1.5, 4);
  b.solid(x, z, o.w, o.d);
  return b;
}

function capitalDock(Builder, S) {
  const b = new Builder(S), c = Math.cos(S.rot), s = Math.sin(S.rot);
  for (const p of S.parts) {
    const dx = p.x - S.x, dz = p.z - S.z, x = dx * c - dz * s, z = dx * s + dz * c;
    const fh = (p.h - 1.5) / (p.fl + 0.6), G = fh * 1.6, crown = p.fl >= 19 ? 3 : 0, body = p.h - 1.5 - G - crown * fh;
    b.box(p.w - 1, G, p.d - 1, T.shop, { x, z });
    for (const sx of [-1, 1]) b.box(0.9, G, p.d, T.brick, { x: x + sx * (p.w / 2 - 0.45), z });
    b.facade(p.w, body, p.d, T.cd, T.concrete, { x, y: G, z }, 1.75, fh);
    if (crown) b.facade(p.w, crown * fh, p.d, T.cdCrown, T.concrete, { x, y: G + body, z }, 1.75, fh);
    b.box(p.w + 0.2, 1.5, p.d + 0.2, T.brick, { x, y: p.h - 1.5, z });
    b.box(p.w * 0.4, 2.5, p.d * 0.4, T.concrete, { x, y: p.h, z });
    b.solid(x, z, p.w, p.d);
  }
  return b;
}

function exo(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, G = 5.5, H = 70, mid = (G + H) / 2;
  b.box(W - 3, G, D - 5, T.shop, {});
  b.box(W, 0.8, D, T.bronze, { y: G - 0.8 });
  b.facade(W, H - G, D, T.exo, T.concrete, { y: G }, 1.5, (H - G) / 16);
  b.box(W - 0.6, 3, D - 0.6, T.railGlass, { y: H });
  // the blue exoskeleton on the long faces: two tiers of diagonals, with verticals at the quarter points
  const e = 0.6;
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + e);
    for (const zq of [-2, -1, 0, 1, 2]) b.box(0.5, H - G + 0.5, 0.5, T.exoBlue, { x, y: G - 0.5, z: (zq * D) / 4 });
    for (const y of [G - 0.5, mid, H]) b.box(0.5, 0.5, D + 0.5, T.exoBlue, { x, y, z: 0 });
    for (const [y0, y1] of [[G, mid], [mid, H]]) {
      strut(b, T.exoBlue, x, y0, -D / 4, y1, 0); strut(b, T.exoBlue, x, y0, D / 4, y1, 0);
      strut(b, T.exoBlue, x, y0, -D / 2, y1, -D / 4); strut(b, T.exoBlue, x, y0, D / 2, y1, D / 4);
    }
  }
  for (const sz of [-1, 1]) b.box(W + 2 * e + 0.5, 0.5, 0.5, T.exoBlue, { y: H, z: sz * (D / 2) });
  b.solid(0, 0, W + 1.4, D);
  return b;
}

function millennium(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, B = 6.6, FL = 3.1, N = 14, top = B + N * FL;
  b.box(W - 1, 3.4, D - 1, T.shop, {});
  b.facade(W, B - 3.4, D, T.mtBrick, T.concrete, { y: 3.4 }, 3, 3);
  b.facade(W, N * FL, D, T.mt, T.concrete, { y: B }, 3, FL);
  // corner balconies stacked up the water side
  for (let k = 0; k < N; k++) for (const sx of [-1, 1]) {
    b.box(2.6, 0.2, 1.4, T.white, { x: sx * (W / 2 - 1.3), y: B + k * FL, z: -D / 2 - 0.7 });
    b.box(2.6, 1.0, 0.05, T.railGlass, { x: sx * (W / 2 - 1.3), y: B + k * FL + 0.2, z: -D / 2 - 1.38 });
  }
  b.box(W - 2, 3, D - 2, T.lhTop, { y: top });
  b.box(W + 0.4, 0.5, D + 0.4, T.white, { y: top + 3 });
  pyramid(b, T.zinc, Math.min(W, D) * 0.8, 4, { y: top + 3.5 });
  b.cyl(0.08, 0.22, 63 - top - 7.5, T.white, { y: top + 7.5 }, 6);
  b.solid(0, 0, W, D);
  return b;
}

function altoVetro(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, FL = 3.05, N = 16, top = N * FL;
  b.facade(W, top, D, T.av, T.dark, {}, 1.2, FL);
  // cantilevered balcony boxes, alternating along the long faces
  for (let k = 2; k < N; k++) for (const sx of [-1, 1]) {
    const z = ((k * 5 + (sx > 0 ? 2 : 0)) % 7) / 7 * (D - 3) - D / 2 + 1.5;
    b.box(1.5, FL - 0.4, 2.6, T.dark, { x: sx * (W / 2 + 0.75), y: k * FL + 0.2, z });
  }
  b.box(W + 0.2, 1.1, D + 0.2, T.railGlass, { y: top });
  b.box(W * 0.6, 2.4, D * 0.35, T.lhTop, { y: top, z: D * 0.2 });
  b.box(W * 0.62, 0.25, D * 0.37, T.dark, { y: top + 2.4, z: D * 0.2 });
  b.solid(0, 0, W + 3, D);
  return b;
}

// John's Lane: nave to the north (local -z), front on Thomas Street (+z) with the tower and spire over the entrance
function johnsLane(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, WALL = 17, RIDGE = 25;
  const t = 6.8, tz = D / 2 - t / 2, TH = 42; // tower
  b.facade(W, WALL, D - t + 1, T.granite, T.slate, { z: -t / 2 + 0.5 }, 4, 4);
  b.gable(W + 0.6, RIDGE - WALL, D - t + 1, T.slate, { y: WALL, z: -t / 2 + 0.5 });
  for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) lancetWin(b, sx * (W / 2 + 0.03), 5, 13, -D / 2 + 3 + k * 4.2, 1.6, sx * Math.PI / 2);
  for (const sx of [-1, 1]) b.box(1.1, WALL + 2, 1.1, T.dressing, { x: sx * (W / 2 - 0.2), z: tz - t / 2 - 0.6 });
  // the tower: granite with pale quoins, the portal, the belfry's paired lancets, gablets and pinnacles, the spire
  b.facade(t, TH, t, T.granite, T.slate, { z: tz }, 4, 4);
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(0.8, TH + 0.4, 0.8, T.dressing, { x: px * (t / 2 - 0.2), z: tz + pz * (t / 2 - 0.2) });
  lancetWin(b, 0, 0.3, 7.5, D / 2 + 0.04, 3.0);
  lancetWin(b, 0, 12, 20, D / 2 + 0.04, 2.2);
  round4((ry, sx, sz) => { for (const o of [-1, 1]) lancetWin(b, sx * (t / 2 + 0.04) + sz * o * 1.2, 29, 39, tz + sz * (t / 2 + 0.04) - sx * o * 1.2, 1.4, ry); });
  b.box(t + 0.6, 0.8, t + 0.6, T.dressing, { y: TH, z: tz });
  round4((ry, sx, sz) => b.prism(t * 0.62, 5.5, 0.6, T.dressing, { x: sx * (t / 2 - 0.3), y: TH + 0.8, z: tz + sz * (t / 2 - 0.3), ry }));
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    b.cyl(0.45, 0.45, 3, T.dressing, { x: px * (t / 2 - 0.1), y: TH + 0.8, z: tz + pz * (t / 2 - 0.1) }, 8);
    b.cyl(0.02, 0.5, 5, T.dressing, { x: px * (t / 2 - 0.1), y: TH + 3.8, z: tz + pz * (t / 2 - 0.1) }, 8);
  }
  b.cyl(0.08, t * 0.47, 70.4 - TH - 1.4, T.granite, { y: TH + 0.8, z: tz }, 8);
  b.cyl(0.05, 0.05, 1.4, T.dressing, { y: 69, z: tz }, 4);
  b.solid(0, 0, W, D);
  return b;
}

// St George's: body to the north-east (local -z), the Ionic portico and the steeple over it facing +z
function stGeorges(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, WALL = 14, P = 4.4, bodyD = D - P;
  const bz = -D / 2 + bodyD / 2;
  b.facade(W, WALL, bodyD, T.dressing, T.slate, { z: bz }, 4, 4);
  b.box(W + 0.5, 0.8, bodyD + 0.5, T.dressing, { y: WALL - 0.8, z: bz });
  b.gable(W - 1, 3, bodyD - 1, T.slate, { y: WALL, z: bz });
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) b.box(0.05, 5, 1.6, T.dark, { x: sx * (W / 2 + 0.03), y: 5, z: -D / 2 + 3 + k * 4 });
  // the portico: four Ionic columns on a stepped base, entablature and pediment
  const fz = -D / 2 + bodyD, cz = fz + P - 0.9;
  b.box(W * 0.8, 1.2, P, T.dressing, { z: fz + P / 2 });
  for (const x of [-1.5, -0.5, 0.5, 1.5]) b.column(x * (W * 0.8 - 2) / 3, cz, 9.5, 0.5, T.dressing, 1.2);
  b.box(W * 0.8, 1.6, P, T.dressing, { y: 10.7, z: fz + P / 2 });
  b.prism(W * 0.8, 2.6, P, T.dressing, { y: 12.3, z: fz + P / 2 });
  // the steeple, from the front of the body: square clock stage, colonnaded belfry, two octagonal stages, spire
  const sz = fz - 3;
  b.box(6.2, WALL + 11 - 12, 6.2, T.dressing, { y: 12, z: sz });
  round4((ry, sx, s2) => b.add(new THREE.PlaneGeometry(2.4, 2.4), T.clock, { x: sx * 3.12, y: WALL + 6.5, z: sz + s2 * 3.12, ry }));
  b.box(6.8, 0.7, 6.8, T.dressing, { y: WALL + 11, z: sz });
  // the belfry: a stone core with a tall round-headed opening on each face, paired columns at the corners
  b.box(4.6, 8, 4.6, T.dressing, { y: WALL + 11.7, z: sz });
  round4((ry, sx, s2) => b.add(new THREE.PlaneGeometry(1.7, 5.2).translate(0, 2.6, 0), T.lancet, { x: sx * 2.33, y: WALL + 12.9, z: sz + s2 * 2.33, ry }));
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (const [ox, oz] of [[2.75, 1.7], [1.7, 2.75]]) b.cyl(0.28, 0.3, 7.6, T.dressing, { x: px * ox, y: WALL + 11.7, z: sz + pz * oz }, 8);
  b.box(6.4, 0.9, 6.4, T.dressing, { y: WALL + 19.7, z: sz });
  b.cyl(2.3, 2.5, 6.5, T.dressing, { y: WALL + 20.6, z: sz }, 8);
  b.cyl(2.6, 2.6, 0.5, T.dressing, { y: WALL + 27.1, z: sz }, 8);
  b.cyl(1.6, 1.8, 4.5, T.dressing, { y: WALL + 27.6, z: sz }, 8);
  b.cyl(0.06, 1.6, 61 - WALL - 32.1, T.dressing, { y: WALL + 32.1, z: sz }, 8);
  b.solid(0, 0, W, D);
  return b;
}

// Findlater's: gable and corner tower to the square (local -z), the tower on the Frederick Street corner (local -x)
function findlaters(Builder, S) {
  const b = new Builder(S), W = S.w, D = S.d, WALL = 12, RIDGE = 20, t = 4.6;
  b.facade(W, WALL, D, T.limestone, T.slate, {}, 4, 4);
  b.gable(W + 0.5, RIDGE - WALL, D + 0.2, T.slate, { y: WALL });
  lancetWin(b, 0.6, 5, 15, -D / 2 - 0.05, 4.2, Math.PI);
  for (let k = 0; k < 4; k++) lancetWin(b, W / 2 + 0.05, 4, 10, -D / 2 + 4 + k * 4.4, 1.6, Math.PI / 2);
  // the corner tower: pale dressed limestone quoins, portal, clock, belfry lancets, pinnacles and a slender spire
  const tx = -W / 2 + t / 2 - 0.4, tz = -D / 2 + t / 2 - 0.4, TH = 30;
  b.facade(t, TH, t, T.limestone, T.slate, { x: tx, z: tz }, 4, 4);
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(0.6, TH + 1, 0.6, T.dressing, { x: tx + px * (t / 2 - 0.15), z: tz + pz * (t / 2 - 0.15) });
  lancetWin(b, tx, 0.3, 6, -D / 2 - 0.45, 2.2, Math.PI);
  b.add(new THREE.PlaneGeometry(1.9, 1.9), T.clock, { x: tx, y: 17.5, z: tz - t / 2 - 0.04, ry: Math.PI });
  round4((ry, sx, sz) => lancetWin(b, tx + sx * (t / 2 + 0.04), 21, 28, tz + sz * (t / 2 + 0.04), 1.6, ry));
  round4((ry, sx, sz) => b.prism(t * 0.6, 4, 0.4, T.dressing, { x: tx + sx * (t / 2 - 0.2), y: TH, z: tz + sz * (t / 2 - 0.2), ry }));
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.cyl(0.02, 0.35, 5, T.dressing, { x: tx + px * (t / 2 - 0.1), y: TH, z: tz + pz * (t / 2 - 0.1) }, 8);
  b.cyl(0.05, t * 0.45, 54.9 - TH, T.dressing, { x: tx, y: TH, z: tz }, 8);
  // the turret on the other front corner, under a slate cone
  const ux = W / 2 - 1.2, uz = -D / 2 + 1.2;
  b.cyl(1.35, 1.35, 16, T.limestone, { x: ux, z: uz }, 8);
  b.cyl(0.05, 1.55, 6.5, T.slate, { x: ux, y: 16, z: uz }, 8);
  b.solid(0, 0, W, D);
  return b;
}

// ---------- build ----------
// Builder: the landmark builder class (passed in to keep the module graph acyclic at load)
export function buildTowers(scene, Builder) {
  materials();
  const S = tall, builders = [
    libertyHall(Builder, S.libertyHall), gqPlaza(Builder, S.gqPlaza), collegeSquare(Builder, S.collegeSquare), capitalDock(Builder, S.capitalDock),
    exo(Builder, S.exo), millennium(Builder, S.millennium), altoVetro(Builder, S.altoVetro),
    johnsLane(Builder, S.johnsLane), stGeorges(Builder, S.stGeorges), findlaters(Builder, S.findlaters),
  ];
  // one mesh per material across all of them (they are static): the builders' parts moved into world space
  const byMat = new Map(), m4 = new THREE.Matrix4();
  for (const b of builders) {
    m4.makeRotationY(b.site.rot).setPosition(b.site.x, 0, b.site.z);
    for (const [mat, geos] of b.parts) {
      if (!byMat.has(mat)) byMat.set(mat, []);
      for (const g of geos) byMat.get(mat).push(g.applyMatrix4(m4));
    }
  }
  const group = new THREE.Group(); group.name = 'Tall buildings';
  let tris = 0;
  for (const [mat, geos] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = !mat.transparent && mat !== T.lancet && mat !== T.clock;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    tris += mesh.geometry.attributes.position.count / 3;
    group.add(mesh);
  }
  group.userData.tris = tris;
  scene.add(group);
  return {
    group,
    setNight(level) { for (const n of night) n.m.emissiveIntensity = n.day + (n.night - n.day) * level; },
  };
}
