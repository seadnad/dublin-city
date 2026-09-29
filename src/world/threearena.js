// 3Arena, the old Point Depot (docs/research/three-arena.md): the Blender hero (tools/blender/build_threearena.py ->
// public/models/threearena.glb). Its textures are painted here at load: tiles in true metres for the limestone, the
// Flemish-bond brick, the rock-faced walls, the slate and the 2008 hall's silver cladding with its scattered mesh
// panels, and a 1024 atlas of glazing, doors, windows, railings and the signs, with a matching night canvas (the lit
// arcade, the cladding's LED glow, the rooftop 3Arena sign). The old stone is floodlit after dark by the shared
// uplight (heroes.js, driven by setStoneNight).
import * as THREE from 'three';
import { load, stoneTile, uplit } from './heroes.js';
import { LITE } from '../render/quality.js';

// atlas regions, px in 1024 x 1024 (must match TA_ATLAS in tools/blender/build_threearena.py)
const TA = {
  arch: [0, 0, 256, 256], door: [256, 0, 128, 256], side: [384, 0, 64, 128], win: [448, 0, 128, 256],
  seg: [576, 0, 128, 128], segdoor: [704, 0, 128, 256], oculus: [832, 0, 128, 128],
  garch: [0, 256, 256, 256], rail: [256, 256, 512, 128], entry: [768, 256, 256, 256],
  logo: [0, 512, 512, 256], word: [512, 512, 512, 128], badge: [512, 640, 256, 256], vent: [768, 640, 128, 256],
};
// palette (sRGB), docs/research/three-arena.md 3.3
const LIME = '#c3c2bb', BRICK = '#b25a3c', ROCK = '#9d9c96', FRAME = '#3b3f43', GLASS = '#2b343b', WARM = '#ffd49a';
const TEAL = '#12a9b4', GREEN = '#86bd3c', PINK = '#d8337a', NAVY = '#26327a';

function canvas(w, h, scale, paint) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale); paint(g);
  return c;
}
function tex(c, { atlas = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (atlas) t.flipY = false; else t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const roundArch = (g, x, y, w, h) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); };
const segArch = (g, x, y, w, h, rise) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + rise); g.quadraticCurveTo(x + w / 2, y - rise, x + w, y + rise); g.lineTo(x + w, y + h); g.closePath(); };

// the Three logo: a bold "3" and three coloured bars
function three(g, cx, cy, s, lit) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.font = 'bold 150px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 16; g.strokeStyle = lit ? '#000' : '#141414'; g.strokeText('3', 0, 6);
  g.fillStyle = lit ? '#ffffff' : '#f4f4f2'; g.fillText('3', 0, 6);
  g.restore();
}
function bars(g, x, y, w, h, lit) {
  [TEAL, GREEN, PINK].forEach((c, i) => { g.fillStyle = lit ? c : c; g.fillRect(x + i * w * 0.06, y + (i * h) / 3, w - i * w * 0.12, h / 3 - 3); });
}

function paintAtlas(g, lit) {
  g.clearRect(0, 0, 1024, 1024);
  const glass = (x, y, w, h, shape) => { // shaped glazing: dark by day, warm lit at night (a slight gradient)
    if (lit) { const grd = g.createLinearGradient(0, y, 0, y + h); grd.addColorStop(0, '#fff0cf'); grd.addColorStop(1, WARM); g.fillStyle = grd; } else g.fillStyle = GLASS;
    shape(); g.fill();
  };
  { // arcade arch: glazed powder-coated steel screen, transom at the springing, glazing bars radiating in the head
    const [x, y, w, h] = TA.arch;
    g.fillStyle = lit ? '#000' : FRAME; g.fillRect(x, y, w, h);
    glass(x + 8, y + 8, w - 16, h - 8, () => roundArch(g, x + 8, y + 8, w - 16, h - 8));
    g.strokeStyle = lit ? '#3a2a18' : '#4a4f55'; g.lineWidth = 6;
    const cx = x + w / 2, sy = y + w / 2;
    g.beginPath(); g.moveTo(x + 8, sy); g.lineTo(x + w - 8, sy); g.stroke();
    for (let k = 1; k < 4; k++) { const lx = x + 8 + ((w - 16) * k) / 4; g.beginPath(); g.moveTo(lx, sy); g.lineTo(lx, y + h); g.stroke(); }
    for (let k = 1; k < 4; k++) { const a = Math.PI + (k * Math.PI) / 4; g.beginPath(); g.moveTo(cx, sy); g.lineTo(cx + Math.cos(a) * 120, sy + Math.sin(a) * 120); g.stroke(); }
    g.beginPath(); g.moveTo(x + 8, y + h - 90); g.lineTo(x + w - 8, y + h - 90); g.stroke(); // door rail
  }
  { // panelled timber door under a fanlight
    const [x, y, w, h] = TA.door;
    g.fillStyle = lit ? '#000' : '#2e2a26'; g.fillRect(x, y, w, h);
    glass(x, y, w, w / 2, () => { g.beginPath(); g.moveTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.closePath(); });
    if (!lit) { g.strokeStyle = '#1b1917'; g.lineWidth = 3; for (const [px, py, pw, ph] of [[14, 80, 44, 70], [70, 80, 44, 70], [14, 164, 44, 80], [70, 164, 44, 80]]) g.strokeRect(x + px, y + py, pw, ph); }
  }
  { const [x, y, w, h] = TA.side; g.fillStyle = lit ? '#000' : FRAME; g.fillRect(x, y, w, h); glass(x + 4, y + 4, w - 8, h - 4, () => roundArch(g, x + 4, y + 4, w - 8, h - 4)); }
  { // first-floor window: dark frame, two lights with glazing bars
    const [x, y, w, h] = TA.win;
    g.fillStyle = lit ? '#000' : FRAME; g.fillRect(x, y, w, h);
    glass(x + 10, y + 10, w - 20, h - 20, () => g.rect(x + 10, y + 10, w - 20, h - 20));
    g.fillStyle = lit ? '#2a1c10' : '#50565c'; g.fillRect(x + w / 2 - 3, y, 6, h); for (let k = 1; k < 4; k++) g.fillRect(x, y + (h * k) / 4, w, 5);
  }
  { // east wall window: segmental head in a red-brick surround, limestone sill (the wall is transparent round it)
    const [x, y, w, h] = TA.seg;
    g.fillStyle = lit ? '#000' : BRICK; segArch(g, x + 6, y + 10, w - 12, h - 18, 12); g.fill();
    glass(x + 22, y + 26, w - 44, h - 44, () => segArch(g, x + 22, y + 26, w - 44, h - 44, 8));
    g.fillStyle = lit ? '#000' : LIME; g.fillRect(x + 12, y + h - 18, w - 24, 12);
    if (!lit) { g.fillStyle = '#4c5156'; g.fillRect(x + w / 2 - 2, y + 26, 4, h - 44); g.fillRect(x + 22, y + h / 2, w - 44, 4); }
  }
  { // east wall door: segmental brick arch, glazed steel doors with an overlight
    const [x, y, w, h] = TA.segdoor;
    g.fillStyle = lit ? '#000' : BRICK; segArch(g, x + 4, y + 8, w - 8, h - 8, 14); g.fill();
    glass(x + 18, y + 26, w - 36, h - 26, () => segArch(g, x + 18, y + 26, w - 36, h - 26, 10));
    g.fillStyle = lit ? '#2a1c10' : '#4c5156'; g.fillRect(x + 18, y + 80, w - 36, 6); g.fillRect(x + w / 2 - 3, y + 86, 6, h - 86);
  }
  { const [x, y, w] = TA.oculus; g.fillStyle = lit ? '#000' : BRICK; g.beginPath(); g.arc(x + w / 2, y + w / 2, w / 2 - 4, 0, 7); g.fill(); glass(0, y + 30, 0, w - 60, () => { g.beginPath(); g.arc(x + w / 2, y + w / 2, w / 2 - 26, 0, 7); }); }
  { // rear gable arch: smooth limestone archivolt round a glazed screen
    const [x, y, w, h] = TA.garch;
    g.fillStyle = lit ? '#000' : LIME; roundArch(g, x + 4, y + 4, w - 8, h - 4); g.fill();
    g.fillStyle = lit ? '#000' : FRAME; roundArch(g, x + 30, y + 30, w - 60, h - 30); g.fill();
    glass(x + 38, y + 38, w - 76, h - 38, () => roundArch(g, x + 38, y + 38, w - 76, h - 38));
    g.strokeStyle = lit ? '#3a2a18' : '#4a4f55'; g.lineWidth = 5;
    for (let k = 1; k < 3; k++) { const lx = x + 38 + ((w - 76) * k) / 3; g.beginPath(); g.moveTo(lx, y + 120); g.lineTo(lx, y + h); g.stroke(); }
    g.beginPath(); g.moveTo(x + 38, y + 128); g.lineTo(x + w - 38, y + 128); g.stroke();
  }
  { // railings: black steel bars with a top rail and finials (cut out)
    const [x, y, w, h] = TA.rail;
    g.fillStyle = lit ? '#000' : '#16181a';
    g.fillRect(x, y + 14, w, 5); g.fillRect(x, y + h - 10, w, 6); g.fillRect(x, y + h - 30, w, 3);
    for (let bx = x + 3; bx < x + w; bx += 11) { g.fillRect(bx, y + 6, 3, h - 8); g.beginPath(); g.moveTo(bx - 2, y + 8); g.lineTo(bx + 1.5, y); g.lineTo(bx + 5, y + 8); g.fill(); }
  }
  { // the 2008 entrance glazing: tall dark panes on a steel grid
    const [x, y, w, h] = TA.entry;
    g.fillStyle = lit ? '#000' : FRAME; g.fillRect(x, y, w, h);
    glass(x + 6, y + 6, w - 12, h - 6, () => g.rect(x + 6, y + 6, w - 12, h - 6));
    g.fillStyle = lit ? '#2a1c10' : '#5b6167';
    for (let k = 1; k < 5; k++) g.fillRect(x + (w * k) / 5 - 3, y, 6, h);
    g.fillRect(x, y + h * 0.3, w, 5);
  }
  { // rooftop sign: the Three "3", ARENA, and the coloured bars, on a transparent ground (refs 01, 11)
    const [x, y, w, h] = TA.logo;
    three(g, x + 110, y + 132, 1.45, lit);
    g.font = 'bold 74px Arial, Helvetica, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.lineWidth = 10; g.strokeStyle = '#141414'; g.strokeText('Arena', x + 205, y + 92);
    g.fillStyle = lit ? '#ffffff' : '#f4f4f2'; g.fillText('Arena', x + 205, y + 92);
    bars(g, x + 214, y + 118, 250, 120, lit);
  }
  { // wordmark on the west wing
    const [x, y, w, h] = TA.word;
    g.font = 'bold 96px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = lit ? '#e8f0ff' : NAVY; g.fillText('3Arena', x + w / 2, y + h / 2 + 4);
  }
  { // gable badge: the Three logo over the bars (ref 11)
    const [x, y, w, h] = TA.badge;
    three(g, x + w / 2, y + 90, 1.0, lit);
    bars(g, x + 40, y + 170, w - 80, 72, lit);
  }
  { // louvre panel
    const [x, y, w, h] = TA.vent;
    g.fillStyle = lit ? '#000' : '#7e8488'; g.fillRect(x, y, w, h);
    if (!lit) { g.fillStyle = '#5d6367'; for (let yy = y + 6; yy < y + h; yy += 10) g.fillRect(x + 4, yy, w - 8, 4); }
  }
}

// the 2008 hall's cladding: a 12 m tile of silver translucent planks with scattered grey mesh panels (refs 01, 09, 10);
// its night canvas is the LED glow behind the planks (ref 03)
function paintClad(g, lit) {
  const W = 512, P = W / 16; // 16 planks, 0.75 m each
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 16; k++) {
    const x = k * P;
    if (lit) { g.fillStyle = k % 3 ? '#5d6d8a' : '#6e80a0'; g.fillRect(x, 0, P, W); continue; }
    const grd = g.createLinearGradient(x, 0, x + P, 0); grd.addColorStop(0, '#c7cccf'); grd.addColorStop(0.5, '#e0e4e6'); grd.addColorStop(1, '#bfc4c7');
    g.fillStyle = grd; g.fillRect(x, 0, P, W);
    g.fillStyle = 'rgba(90,96,100,0.55)'; g.fillRect(x, 0, 2, W);
  }
  for (let y = 0; y < W; y += W / 4) { g.fillStyle = lit ? 'rgba(0,0,0,0.3)' : 'rgba(120,126,130,0.35)'; g.fillRect(0, y, W, 2); }
  // mesh panels: one plank wide, 1.5 to 3.5 m tall, stepping in loose diagonals
  for (let n = 0; n < 22; n++) {
    const k = Math.floor(r() * 16), y = Math.floor(r() * 24) * (W / 24), hh = (2 + Math.floor(r() * 4)) * (W / 24);
    if (lit) { g.fillStyle = r() < 0.5 ? '#c9dcff' : '#1e2433'; g.fillRect(k * P + 1, y, P - 2, hh); continue; }
    g.fillStyle = '#b3b8bb'; g.fillRect(k * P + 1, y, P - 2, hh);
    g.fillStyle = 'rgba(80,86,90,0.25)'; for (let yy = y + 2; yy < y + hh; yy += 4) g.fillRect(k * P + 2, yy, P - 4, 1.5);
  }
}
function paintBrick(g) { // Flemish bond: headers and stretchers alternating, courses 75 mm (2 m tile, 128 px)
  g.fillStyle = '#d8cfc2'; g.fillRect(0, 0, 128, 128);
  let seed = 3; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ch = 128 / 26, st = 128 / 9, hd = st / 2;
  for (let row = 0; row < 26; row++) {
    let x = row % 2 ? -hd * 0.75 : 0, k = 0;
    while (x < 128) {
      const w = k % 2 ? hd : st; const l = 38 + r() * 12;
      g.fillStyle = `hsl(${14 + r() * 6}, ${46 + r() * 10}%, ${l}%)`; g.fillRect(x + 0.6, row * ch + 0.6, w - 1.2, ch - 1.2);
      x += w; k++;
    }
  }
}

let mats = null;
function materials() {
  if (mats) return mats;
  const S = LITE ? 0.5 : 1;
  const dec = tex(canvas(1024, 1024, S, (g) => paintAtlas(g, false)), { atlas: true });
  const decEm = tex(canvas(1024, 1024, S * 0.5, (g) => paintAtlas(g, true)), { atlas: true });
  const clad = tex(canvas(512, 512, S, (g) => paintClad(g, false)));
  const cladEm = tex(canvas(512, 512, S * 0.5, (g) => paintClad(g, true)));
  const brick = tex(canvas(128, 128, 1, paintBrick));
  const std = (o, vc = true) => { const m = new THREE.MeshStandardMaterial(o); m.vertexColors = vc; return m; };
  mats = {
    lime: uplit(std({ map: stoneTile(256, LIME, 5, 0.12, 'rgba(110,108,100,0.35)', 0.12), roughness: 0.8 }), 10),
    brick: uplit(std({ map: brick, roughness: 0.88 }), 10),
    rock: uplit(std({ map: stoneTile(256, ROCK, 10, 0.55, 'rgba(70,70,66,0.55)', 0.3, 3), roughness: 0.92 }), 8),
    slate: std({ map: stoneTile(128, '#4f545a', 16, 0.05, 'rgba(28,30,32,0.5)', 0.3), roughness: 0.7 }),
    clad: std({ map: clad, roughness: 0.4, metalness: 0.15, emissive: 0xffffff, emissiveMap: cladEm, emissiveIntensity: 0 }),
    metal: std({ color: 0x9aa0a4, roughness: 0.5, metalness: 0.4 }),
    pave: std({ map: stoneTile(128, '#aeaca5', 8, 0.05, 'rgba(70,68,64,0.4)', 0.15), roughness: 0.85 }),
    dec: std({ map: dec, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.35, emissive: 0xffffff, emissiveMap: decEm, emissiveIntensity: 0 }),
  };
  return mats;
}

const decoded = new WeakSet();
export async function placeThreeArena(scene, front) {
  let gltf;
  try { gltf = await load('threearena'); } catch (e) { console.warn('threearena model failed to load', e); return null; }
  const M = materials();
  const root = gltf.scene.getObjectByName('threearena');
  if (!root) return null;
  root.removeFromParent();
  root.traverse((o) => {
    if (!o.isMesh) return;
    // AO baked in COLOR_0 (sRGB bytes): decode and keep it off black, as for the stone heroes; white where not baked
    if (!o.geometry.attributes.color) o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3));
    const col = o.geometry.attributes.color;
    if (col.normalized && !decoded.has(col)) {
      for (let i = 0; i < col.count; i++) for (let c = 0; c < 3; c++) col.setComponent(i, c, 0.3 + 0.7 * Math.pow(col.getComponent(i, c), 1 / 2.2));
      decoded.add(col); col.needsUpdate = true;
    }
    const key = o.material.name.replace(/^ta_/, '');
    o.material = M[key] || M.metal;
    o.castShadow = key !== 'dec' && key !== 'pave';
    o.receiveShadow = true;
  });
  // the model's u runs east along the quay (three +x), v north (three -z): turn it onto the quay
  root.position.set(front.x, 0, front.z);
  root.rotation.set(0, front.rot, 0);
  root.name = '3Arena';
  scene.add(root);
  return {
    root,
    setNight(l) {
      M.dec.emissiveIntensity = 1.15 * l;
      M.clad.emissiveIntensity = 0.75 * l;
    },
  };
}
