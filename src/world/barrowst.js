// Barrow Street, the Google campus and Boland's Quay (docs/research/barrow-street.md): the Blender hero
// (tools/blender/build_barrowst.py -> public/models/barrowst.glb, laid out from src/data/barrowst.json) with its
// textures painted here at load: one repeating facade module per curtain wall (Google Docks' black grid and its yellow
// east end, plain office glass, Boland's Quay's pale panels and slots, its copper fins, the calp mills with their sash
// windows), plain calp for the gables and the DART embankment, and a 1024 atlas for the
// BOLANDS FLOUR MILLS lettering, the station boards, the bridge's chevron bar and the flat colours. Each lit material
// has a night twin as its emissive map: offices lit floor by floor, the mills' windows, the lettering. Nine draw calls.
// Low / Battery saver paints the textures at half size.
// Also here: the trees along the Grand Canal Quay promenade (Pearse Street to the square).
import * as THREE from 'three';
import { load, mergeByMaterial, stoneTile } from './heroes.js';
import { addReflections } from '../render/reflect.js';
import { LITE } from '../render/quality.js';
import { IS_MOBILE } from './textures.js';
import { plantTrees } from './trees.js';
import { KERB_H } from './roads.js';
import { addBox } from '../game/collision.js';
import { world, v2, pointInPolygon } from './geo.js';
import { dockPolys, openQuay } from './ground.js';
import layout from '../data/barrowst.json';

// facade modules (metres across, metres up): must match MOD in tools/blender/build_barrowst.py
const MOD = { mv: [14.4, 17.5], mvy: [7.2, 17.5], glass: [12, 15.2], bol: [12, 15.6], cu: [6, 15.6], stone: [4.8, 6.6], calp: [4, 4] };
// the atlas (px in 1024 x 1024): must match DEC there
const DEC = { letters: [0, 0, 1024, 256], sign: [0, 256, 512, 128], chevron: [512, 256, 512, 64], roundel: [512, 320, 64, 64], gordon: [0, 384, 512, 64] };
const SWATCH = { roof: '#8d8f8e', dark: '#1e2124', white: '#e9ebea', slate: '#4a4e52', gravel: '#6a645c', conc: '#a29d94', rail: '#3b3531', pave: '#b5b2aa', glassd: '#27333b', steel: '#9ea3a6', copper: '#9c4a2c', balc: '#1a1d20', stilt: '#3c4145', wood: '#6f5a44', hullg: '#2f5a3c', hullr: '#7a2424', cream: '#e4dcc6' };
Object.keys(SWATCH).forEach((k, i) => { DEC[k] = [(i * 64) % 1024, 448 + Math.floor((i * 64) / 1024) * 64, 64, 64]; });
const SWATCH_LIT = { white: '#3a3a36' }; // the visitor centre's lit windows show as a faint glow on the white box

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvas(w, h, paint, scale = 1) {
  const k = (LITE ? 0.5 : 1) * scale, c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.scale(k, k); paint(g);
  return c;
}
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = IS_MOBILE ? 4 : 8;
  t.flipY = false; // glTF UVs: v runs down from the top of the canvas (the Blender build writes v = z / module height)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// A generic curtain wall: `cols` x `rows` cells over the module, painted bottom-up (row 0 is the ground floor of the
// module; canvas y runs down, so row r sits at the bottom minus (r + 1) cells). cell(g, x, y, w, h, i, j) paints one.
function grid(W, H, cols, rows, cell) {
  return (g) => { for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cell(g, (i * W) / cols, H - ((j + 1) * H) / rows, W / cols, H / rows, i, j); };
}
const lit = (r, on = 0.62) => r() < on; // offices: most floors lit at night, some dark
const warm = (r, a = 1) => (r() < 0.75 ? `rgba(236,232,218,${a * 0.85})` : `rgba(255,214,160,${a * 0.85})`);

// Google Docks: black frame grid, each bay split into two panes, a black floor band; blue-green glass that catches
// the sky higher up. 4 bays x 4 floors, 512 x 622 px.
function paintMv(g, night, yellow = false) {
  const W = yellow ? 256 : 512, H = 622, r = rng(yellow ? 5 : 3);
  const cols = yellow ? 2 : 4;
  g.fillStyle = night ? '#000' : '#15181b'; g.fillRect(0, 0, W, H);
  grid(W, H, cols, 4, (g2, x, y, w, h) => {
    const band = h * 0.2; // the spandrel under each floor's glass
    if (yellow) { g2.fillStyle = night ? '#3a2c08' : '#dcae2a'; g2.fillRect(x, y + h - band, w, band - 3); }
    const on = night && lit(r, 0.7), a = 0.75 + r() * 0.25;
    for (let k = 0; k < 2; k++) {
      const px = x + 5 + (k * (w - 10)) / 2, pw = (w - 10) / 2 - 4;
      if (night) { g2.fillStyle = on ? warm(r, a) : 'rgba(20,26,34,1)'; g2.fillRect(px, y + 4, pw, h - band - 8); continue; }
      const gr = g2.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#6f92a6'); gr.addColorStop(1, '#3a5566');
      g2.fillStyle = gr; g2.fillRect(px, y + 4, pw, h - band - 8);
      g2.fillStyle = 'rgba(255,255,255,0.07)'; g2.fillRect(px, y + 4, pw * 0.4, h - band - 8);
    }
  })(g);
}
// plain office glass (Gordon House, Gasworks House, Grand Mill Quay, the skybridge): silver frames, 8 bays x 4 floors
function paintGlass(g, night) {
  const W = 512, H = 648, r = rng(9);
  g.fillStyle = night ? '#000' : '#aeb4b7'; g.fillRect(0, 0, W, H);
  grid(W, H, 8, 4, (g2, x, y, w, h) => {
    const sp = h * 0.24, on = night && lit(r, 0.66);
    if (night) { g2.fillStyle = on ? warm(r, 0.7 + r() * 0.3) : '#10151a'; g2.fillRect(x + 3, y + 3, w - 6, h - sp - 6); return; }
    const gr = g2.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#7f9eb0'); gr.addColorStop(1, '#4b6474');
    g2.fillStyle = gr; g2.fillRect(x + 3, y + 3, w - 6, h - sp - 6);
    g2.fillStyle = '#8e9599'; g2.fillRect(x, y + h - sp, w, sp - 2);
  })(g);
}
// Boland's Quay: pale grey-white rainscreen panels with narrow dark window slots scattered floor by floor
function paintBol(g, night) {
  const W = 512, H = 666, r = rng(21), fh = H / 4;
  g.fillStyle = night ? '#000' : '#e2e2dc'; g.fillRect(0, 0, W, H);
  if (!night) { g.fillStyle = 'rgba(120,120,112,0.25)'; for (let x = 0; x < W; x += 21) g.fillRect(x, 0, 1.5, H); for (let j = 0; j < 4; j++) g.fillRect(0, j * fh, W, 2); }
  for (let j = 0; j < 4; j++) {
    let x = r() * 12;
    while (x < W - 10) {
      const w = 12 + r() * 26, gap = 10 + r() * 34;
      const on = lit(r, 0.72);
      if (night) g.fillStyle = on ? warm(r, 0.75 + r() * 0.25) : '#0c0f12';
      else { const gr = g.createLinearGradient(0, j * fh, 0, (j + 1) * fh); gr.addColorStop(0, '#6f8796'); gr.addColorStop(1, '#3e5260'); g.fillStyle = gr; }
      g.fillRect(x, j * fh + 8, Math.min(w, W - x), fh - 18);
      x += w + gap;
    }
  }
}
// its copper-red fins with dark glass between (the back and the flanks)
function paintCu(g, night) {
  const W = 256, H = 666, r = rng(33), fh = H / 4;
  g.fillStyle = night ? '#000' : '#26282a'; g.fillRect(0, 0, W, H);
  for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
    const x = k * 64;
    if (night) { g.fillStyle = lit(r, 0.65) ? warm(r, 0.8) : '#0a0c0e'; g.fillRect(x + 22, j * fh + 6, 38, fh - 12); continue; }
    g.fillStyle = '#35434c'; g.fillRect(x + 22, j * fh + 6, 38, fh - 12);
  }
  if (!night) for (let k = 0; k < 8; k++) { const x = k * 32; const gr = g.createLinearGradient(x, 0, x + 18, 0); gr.addColorStop(0, '#7c3820'); gr.addColorStop(0.5, '#b0603a'); gr.addColorStop(1, '#6e311c'); g.fillStyle = gr; g.fillRect(x, 0, k % 2 ? 12 : 18, H); }
}
// calp limestone with small segmental-headed sash windows, 2 bays x 2 floors (the mills and the old stores)
function paintStone(g, night) {
  const W = 256, H = 352, r = rng(41);
  if (!night) {
    g.fillStyle = '#8a857d'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 9) { let x = -r() * 20; while (x < W) { const w = 14 + r() * 26; g.fillStyle = `hsl(${30 + r() * 12}, ${3 + r() * 5}%, ${46 + r() * 16}%)`; g.fillRect(x + 1, y + 1, w - 2, 7); x += w; } }
  } else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const cx = i * 128 + 64, y0 = j * 176 + 40, w = 52, h = 84;
    if (!night) {
      g.fillStyle = '#a9a295'; g.fillRect(cx - w / 2 - 6, y0 - 8, w + 12, 10); g.fillRect(cx - w / 2 - 5, y0 + h, w + 10, 7); // head, sill
      g.fillStyle = '#1e2226'; g.fillRect(cx - w / 2, y0, w, h);
      g.fillStyle = '#d8d6cf'; g.fillRect(cx - w / 2, y0 + h / 2 - 2, w, 4); g.fillRect(cx - 2, y0, 4, h);
      for (let k = 1; k < 3; k++) { g.fillRect(cx - w / 2, y0 + (k * h) / 6, w, 2); g.fillRect(cx - w / 2, y0 + h / 2 + (k * h) / 6, w, 2); }
    } else {
      g.fillStyle = lit(r, 0.55) ? warm(r, 0.85) : '#000'; g.fillRect(cx - w / 2, y0, w, h);
    }
  }
}
function paintDec(g, night) {
  g.clearRect(0, 0, 1024, 1024);
  for (const [k, col] of Object.entries(SWATCH)) { const [x, y, w, h] = DEC[k]; g.fillStyle = night ? SWATCH_LIT[k] || '#000' : col; g.fillRect(x, y, w, h); }
  { // BOLANDS / FLOUR MILLS in raised orange-gold letters (refs 09-12), two lines, transparent ground
    const [x, y, w, h] = DEC.letters;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 104px Georgia, "Times New Roman", serif';
    for (const [t, cy] of [['BOLANDS', y + h * 0.27], ['FLOUR  MILLS', y + h * 0.75]]) {
      g.lineWidth = 10; g.strokeStyle = night ? 'rgba(80,40,0,0.9)' : '#5a3a14'; g.strokeText(t, x + w / 2, cy);
      g.fillStyle = night ? '#ffc060' : '#e39a2d'; g.fillText(t, x + w / 2, cy);
    }
  }
  { // the station name board: Iarnród Éireann blue with the green top stripe
    const [x, y, w, h] = DEC.sign;
    g.fillStyle = night ? '#0c2a5c' : '#16408a'; g.fillRect(x, y, w, h);
    g.fillStyle = night ? '#1b6b3a' : '#2d9a4e'; g.fillRect(x, y, w, 14);
    g.fillStyle = night ? '#f2f4f8' : '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = 'italic 30px Arial, sans-serif'; g.fillText('Dug na Canálach Móire', x + 22, y + 46);
    g.font = 'bold 40px Arial, sans-serif'; g.fillText('Grand Canal Dock', x + 22, y + 94);
  }
  { // the chevron bar on the railway bridge (black and yellow), day only
    const [x, y, w, h] = DEC.chevron;
    g.fillStyle = night ? '#000' : '#141414'; g.fillRect(x, y, w, h);
    if (!night) { g.fillStyle = '#f2c21b'; for (let k = -2; k < 18; k++) { g.beginPath(); g.moveTo(x + k * 32, y + h); g.lineTo(x + k * 32 + 16, y + h); g.lineTo(x + k * 32 + 32, y); g.lineTo(x + k * 32 + 16, y); g.closePath(); g.fill(); } }
  }
  { // the 3.67 m headroom roundel
    const [x, y, w] = DEC.roundel, c = x + w / 2;
    g.fillStyle = night ? '#000' : '#ffffff'; g.beginPath(); g.arc(c, y + w / 2, w / 2 - 2, 0, 7); g.fill();
    if (!night) { g.lineWidth = 7; g.strokeStyle = '#c8202a'; g.stroke(); g.fillStyle = '#111'; g.font = 'bold 15px Arial'; g.textAlign = 'center'; g.fillText('3.67m', c, y + w / 2 + 1); }
  }
  { // GORDON HOUSE in brushed steel letters
    const [x, y, w, h] = DEC.gordon;
    g.font = 'bold 44px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = night ? '#dfe6ee' : '#e6e8ea'; g.fillText('GORDON HOUSE', x + w / 2, y + h / 2 + 2);
  }
}

let mats = null;
function materials() {
  if (mats) return mats;
  // the night twins are painted at half size: the lit panes are big flat blocks, so nothing is lost
  const pair = (w, h, paint) => [tex(canvas(w, h, (g) => paint(g, false))), tex(canvas(w, h, (g) => paint(g, true), 0.5))];
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glassy = (m, k = 0.8) => addReflections(m, k);
  const lm = ([map, em], o = {}) => std({ map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0, ...o });
  const decMaps = [tex(canvas(1024, 1024, (g) => paintDec(g, false)), false), tex(canvas(1024, 1024, (g) => paintDec(g, true)), false)];
  mats = {
    bs_mv: glassy(lm(pair(512, 622, (g, n) => paintMv(g, n)), { roughness: 0.18, metalness: 0.35 })),
    bs_mvy: glassy(lm(pair(256, 622, (g, n) => paintMv(g, n, true)), { roughness: 0.25, metalness: 0.3 })),
    bs_glass: glassy(lm(pair(512, 648, paintGlass), { roughness: 0.2, metalness: 0.3 })),
    bs_bol: lm(pair(512, 666, paintBol), { roughness: 0.55, metalness: 0.05 }),
    bs_cu: lm(pair(256, 666, paintCu), { roughness: 0.45, metalness: 0.3 }),
    bs_stone: lm(pair(256, 352, paintStone), { roughness: 0.9 }),
    bs_calp: std({ map: stoneTile(256, '#8a857d', 12, 0.5, 'rgba(38,36,34,0.55)', 0.4), roughness: 0.92 }),
    bs_dec: lm(decMaps, { alphaTest: 0.5, roughness: 0.6 }),
  };
  for (const [k, m] of Object.entries(mats)) m.name = k;
  return mats;
}

// the double row of young trees along the water on the Grand Canal Quay promenade (58 in OSM), with their trunks solid
function promenadeTrees(scene) {
  const way = world.ways.find((w) => w.name === 'Grand Canal Quay' && w.pedestrian);
  if (!way) return;
  const items = [];
  const r = rng(77);
  for (let i = 0; i + 1 < way.pts.length; i++) {
    const a = way.pts[i], b = way.pts[i + 1], L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
    const east = { x: -d.z, z: d.x }; // the way runs north: its right is east, towards the water
    const n = { x: east.x * (Math.sign(east.x) || 1), z: east.z * (Math.sign(east.x) || 1) };
    for (let s = i === 0 ? 13 : 2; s < L - 1; s += 4.2) {
      for (const off of [1.9, 3.4]) {
        const p = { x: a.x + d.x * (s + (off > 2 ? 2.1 : 0)) + n.x * off, z: a.z + d.z * (s + (off > 2 ? 2.1 : 0)) + n.z * off };
        items.push({ x: p.x, y: KERB_H, z: p.z, rot: r() * 6.28, s: 0.55 + r() * 0.15 });
        addBox(p.x, p.z, 0.25, 0.25, 0);
      }
    }
  }
  plantTrees(scene, items, { young: 3, birch: 1 }, r);
}

// cast-iron bollards along the open quay edges (where ground.js leaves the railings off), one instanced mesh
function quayBollards(scene) {
  const spots = [];
  for (const dk of dockPolys) {
    if (dk.canal) continue;
    const ring = [...dk.poly, dk.poly[0]];
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i];
      if (!openQuay(a, b)) continue;
      const L = v2.len(v2.sub(b, a)), d = v2.norm(v2.sub(b, a));
      let n = { x: -d.z, z: d.x };
      const probe = { x: (a.x + b.x) / 2 + n.x * 0.6, z: (a.z + b.z) / 2 + n.z * 0.6 };
      if (pointInPolygon(probe, dk.poly)) n = { x: -n.x, z: -n.z }; // step onto the quay, not the water
      for (let s = 1.5; s < L - 0.5; s += 4.5) spots.push({ x: a.x + d.x * s + n.x * 0.45, z: a.z + d.z * s + n.z * 0.45 });
    }
  }
  if (!spots.length) return;
  const geo = new THREE.CylinderGeometry(0.1, 0.13, 0.62, 8).translate(0, KERB_H + 0.31, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x1d2023, roughness: 0.5, metalness: 0.4 }), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, 0, p.z)));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere();
  mesh.name = 'quay bollards';
  scene.add(mesh);
}

export async function placeBarrowStreet(scene) {
  promenadeTrees(scene);
  quayBollards(scene);
  let gltf;
  try { gltf = await load('barrowst'); } catch (e) { console.warn('barrowst model failed to load', e); return null; }
  const root = gltf.scene.getObjectByName('barrowst');
  if (!root) return null;
  const M = materials();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = M[o.material.name] || M.bs_calp;
    o.castShadow = o.material !== M.bs_dec;
    o.receiveShadow = true;
  });
  root.removeFromParent();
  const group = mergeByMaterial(root);
  for (const m of group.children) { m.castShadow = m.material !== M.bs_dec; m.receiveShadow = true; }
  const [ox, oz] = layout.origin;
  group.position.set(ox, 0, oz);
  group.name = 'Barrow Street';
  scene.add(group);
  return {
    root: group,
    setNight(l) {
      for (const k of ['bs_mv', 'bs_mvy', 'bs_glass']) M[k].emissiveIntensity = 0.6 * l;
      M.bs_bol.emissiveIntensity = 0.62 * l;
      M.bs_cu.emissiveIntensity = 0.5 * l;
      M.bs_stone.emissiveIntensity = 0.7 * l;
      M.bs_dec.emissiveIntensity = 1.0 * l;
    },
  };
}
