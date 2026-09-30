// Temple Bar's street character (docs/research/temple-bar-v2.md): what hangs off the filler fronts - painted hanging
// boards and neon blade signs, flags on angled poles, hanging baskets, swan-neck lanterns, the odd projecting clock -
// plus people with pints outside the pubs, buskers, and the warm spill of pub windows on the setts after dark.
//
// Every piece reads its front from the buildings' lots (the TEMPLEBAR style: buildings.js, the shared shopfront set in
// shopfronts.js decides which fronts are pubs), and all of it samples ONE small canvas atlas (colour + glow) through
// ONE material, built with the pub-front kit's geometry helpers, so after the static batch it is a draw call or two per
// 400 m cell. Low / Battery saver paint the atlas at half size.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { quad, boxPatch, meshPatch, toGeometry } from './pubs.js';
import { pubSites } from './pubsites.js';
import { SHOPFRONT_TILES, SHOPFRONT_NAMES, nameFont } from './shopfronts.js';
import { templeBarFronts } from './buildings.js';
import { extraSites } from './sites.js';
import { KERB_H } from './roads.js';
import { addBox } from '../game/collision.js';
import { LITE } from '../render/quality.js';
import { lampUniforms, LAMP_GLSL } from '../render/lamplight.js';

const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const K = LITE ? 32 : 64;          // atlas px per metre
const SIZE = LITE ? 512 : 1024;

// ---------- the atlas: a grid packer over a colour and a glow canvas ----------
function makeAtlas() {
  const colour = document.createElement('canvas'), glow = document.createElement('canvas');
  colour.width = colour.height = glow.width = glow.height = SIZE;
  const cc = colour.getContext('2d'), gc = glow.getContext('2d');
  cc.fillStyle = '#222'; cc.fillRect(0, 0, SIZE, SIZE); gc.fillStyle = '#000'; gc.fillRect(0, 0, SIZE, SIZE);
  let x = 0, y = 0, row = 0;
  // add(wM, hM, paint(ctx, glowCtx, w, h)) -> uv rect
  const add = (wM, hM, paint) => {
    const w = Math.max(4, Math.ceil(wM * K)), h = Math.max(4, Math.ceil(hM * K));
    if (x + w + 2 > SIZE) { x = 0; y += row + 2; row = 0; }
    const r = { x, y, w, h };
    for (const [ctx, isGlow] of [[cc, false], [gc, true]]) {
      ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      paint(ctx, isGlow, w, h); ctx.restore();
    }
    x += w + 2; row = Math.max(row, h);
    if (y + h > SIZE) console.warn('temple bar atlas overflow');
    return { u0: (r.x + 0.5) / SIZE, u1: (r.x + r.w - 0.5) / SIZE, v0: 1 - (r.y + r.h - 0.5) / SIZE, v1: 1 - (r.y + 0.5) / SIZE };
  };
  const solid = (day, night = null) => add(0.25, 0.25, (ctx, g, w, h) => { const c = g ? night : day; if (c) { ctx.fillStyle = c; ctx.fillRect(0, 0, w, h); } });
  return { add, solid, colour, glow };
}

const text = (ctx, str, x, y, px, font, color, maxW) => {
  ctx.font = font === 'script' ? `italic bold ${px}px Georgia, serif` : font === 'sans' ? `900 ${px}px "Arial Black", Arial, sans-serif` : `bold ${px}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  const tw = ctx.measureText(str).width, sx = Math.min(1, maxW / Math.max(1, tw));
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); ctx.fillText(str, 0, 0); ctx.restore();
};

// national flags on the pub fronts (plain stripes: the ones the photos show most) - vertical or horizontal tricolours
const FLAGS = [
  ['v', '#169b62', '#ffffff', '#ff883e'], ['v', '#009246', '#ffffff', '#ce2b37'], ['v', '#0055a4', '#ffffff', '#ef4135'],
  ['h', '#000000', '#dd0000', '#ffce00'], ['h', '#ae1c28', '#ffffff', '#21468b'], ['h', '#0057b7', '#0057b7', '#ffd700'],
  ['v', '#169b62', '#ffffff', '#ff883e'], ['h', '#ffffff', '#ffffff', '#dc143c'],
];
const NEON = [['BAR', '#ff3048'], ['LIVE MUSIC', '#34f07a'], ['PUB', '#ff5a2a'], ['TRAD', '#4fa8ff'], ['OPEN', '#ff3048'], ['CRAIC', '#34f07a'], ['BAR', '#4fa8ff'], ['CAFÉ', '#ffd24a']];
const BOARD_BG = ['#141414', '#1b2745', '#1e4d34', '#5a1a22', '#141414', '#2a1d14'];

export function buildTempleBar(Builder) {
  const t0 = performance.now();
  const A = makeAtlas();
  const iron = A.solid('#141414'), lampGlass = A.solid('#f4e7c4', '#ffd79a'), wood = A.solid('#6b4a2a');
  const foliage = A.add(0.5, 0.5, (ctx, g, w, h) => { if (g) return; for (let i = 0; i < 16; i++) { ctx.fillStyle = ['#3f7a2c', '#4f8c34', '#35682a', '#5a9a3c'][(i * 7) % 4]; ctx.fillRect((i % 4) * w / 4, Math.floor(i / 4) * h / 4, w / 4 + 1, h / 4 + 1); } });
  const flowers = A.add(0.5, 0.5, (ctx, g, w, h) => { if (g) return; for (let i = 0; i < 16; i++) { ctx.fillStyle = ['#d63a6a', '#e8547e', '#b8244c', '#4f8c34', '#f3eef2', '#e04040', '#8e3fb0', '#f2c230'][(i * 5) % 8]; ctx.fillRect((i % 4) * w / 4, Math.floor(i / 4) * h / 4, w / 4 + 1, h / 4 + 1); } });
  const clockFace = A.add(0.6, 0.6, (ctx, g, w, h) => {
    ctx.fillStyle = g ? 'rgba(255,235,190,0.8)' : '#f2eee2'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.46, 0, 7); ctx.fill();
    if (g) return; ctx.strokeStyle = '#141414'; ctx.lineWidth = w * 0.05; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2, h * 0.18); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w * 0.72, h * 0.55); ctx.stroke();
  });
  const flagUV = FLAGS.map(([dir, a, b, c]) => A.add(1.2, 0.8, (ctx, g, w, h) => {
    if (g) return;
    [a, b, c].forEach((col, i) => { ctx.fillStyle = col; if (dir === 'v') ctx.fillRect((i * w) / 3, 0, w / 3 + 1, h); else ctx.fillRect(0, (i * h) / 3, w, h / 3 + 1); });
  }));
  const neonUV = NEON.map(([word, col]) => A.add(0.5, 1.7, (ctx, g, w, h) => {
    ctx.fillStyle = g ? '#000' : '#141018'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = g ? col : col; ctx.lineWidth = Math.max(1, w * 0.05); ctx.strokeRect(w * 0.08, w * 0.08, w * 0.84, h - w * 0.16);
    const letters = word.split(''), step = (h - w * 0.4) / letters.length;
    letters.forEach((ch, i) => text(ctx, ch, w / 2, w * 0.2 + step * (i + 0.5), Math.min(w * 0.7, step * 0.9), 'sans', col, w * 0.8));
  }));
  // hanging boards: one per name, painted gold on a dark board with a border (pubs) or a lighter shop board
  const boardUV = new Map();
  const board = (i) => {
    if (!boardUV.has(i)) {
      const name = SHOPFRONT_NAMES[i], bg = BOARD_BG[i % BOARD_BG.length], words = name.replace(/^THE /, '').split(' ');
      boardUV.set(i, A.add(0.9, 0.72, (ctx, g, w, h) => {
        ctx.fillStyle = g ? 'rgba(255,200,130,0.10)' : bg; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = g ? 'rgba(255,225,160,0.5)' : '#d4a63a'; ctx.lineWidth = Math.max(1, w * 0.03); ctx.strokeRect(w * 0.06, h * 0.07, w * 0.88, h * 0.86);
        const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words;
        lines.forEach((l, k) => text(ctx, l, w / 2, h * (0.5 + (k - (lines.length - 1) / 2) * 0.32), h * (lines.length > 1 ? 0.24 : 0.3), nameFont(i), g ? 'rgba(255,225,160,0.7)' : '#d9ad48', w * 0.8));
      }));
    }
    return boardUV.get(i);
  };

  // ---------- geometry, in world coordinates ----------
  // one buffer per 200 m cell so the camera and shadow passes can cull them
  const cells = new Map();
  let out = null;
  const cellOf = (x, z) => { const k = `${Math.floor(x / 200)},${Math.floor(z / 200)}`; if (!cells.has(k)) cells.set(k, { p: [], n: [], uv: [] }); return cells.get(k); };
  const people = [], lampSpots = [], stats = { fronts: 0, pubs: 0, blades: 0, neon: 0, flags: 0, baskets: 0, lanterns: 0, clocks: 0 };
  // a double-sided board standing out from the wall: from wall point w (world) along n, 'out' to 'out + len'
  const blade = (w, n, y, len, h, r, out0 = 0.3) => {
    const t = { x: n.z, z: -n.x }, e = 0.03;
    for (const s of [1, -1]) {
      const o = { x: t.x * e * s, z: t.z * e * s };
      const p0 = [w.x + n.x * out0 + o.x, y, w.z + n.z * out0 + o.z], p1 = [w.x + n.x * (out0 + len) + o.x, y, w.z + n.z * (out0 + len) + o.z];
      if (s === 1) quad(out, p0, p1, [p1[0], y + h, p1[2]], [p0[0], y + h, p0[2]], r);
      else quad(out, p1, p0, [p0[0], y + h, p0[2]], [p1[0], y + h, p1[2]], r);
    }
    // the iron bar it hangs from
    const m = { x: w.x + n.x * (out0 + len / 2), z: w.z + n.z * (out0 + len / 2) };
    boxPatch(out, m.x, y + h + 0.04, m.z, Math.abs(n.x) * (len + out0) + 0.05, 0.05, Math.abs(n.z) * (len + out0) + 0.05, iron);
  };
  const basket = (p, y) => {
    meshPatch(out, new THREE.IcosahedronGeometry(0.4, 1), p.x, y, p.z, foliage);
    meshPatch(out, new THREE.IcosahedronGeometry(0.32, 1), p.x, y + 0.13, p.z, flowers);
    boxPatch(out, p.x, y + 0.3, p.z, 0.02, 0.45, 0.02, iron);
    stats.baskets++;
  };

  const fronts = templeBarFronts();
  for (const L of fronts) {
    stats.fronts++;
    out = cellOf(L.x, L.z);
    const c = Math.cos(L.rot), s = Math.sin(L.rot), n = { x: s, z: c }, tng = { x: c, z: -s };
    const at = (lx, out) => ({ x: L.x + lx * c + (L.d / 2 + out) * s, z: L.z - lx * s + (L.d / 2 + out) * c });
    const G = L.fh * L.tbGround, nRep = Math.max(1, Math.floor(L.w / 5.6 + 0.35)), repW = L.w / nRep;
    for (let rep = 0; rep < nRep; rep++) {
      const si = (L.sign % 64 + rep * 5) % 64, tile = SHOPFRONT_TILES[si % 16], pub = tile.kind === 'pub';
      const h1 = hash(L.seed * 97 + rep, 1), h2 = hash(L.seed * 97 + rep, 2), h3 = hash(L.seed * 97 + rep, 3);
      const x0 = -L.w / 2 + rep * repW, xm = x0 + repW / 2;
      if (pub) stats.pubs++;
      // hanging baskets at the ends of pub fronts (and some cafés), over the fascia cornice
      if (pub || h1 < 0.3) for (const lx of [x0 + 0.45, x0 + repW - 0.45]) { const p = at(lx, 0.55), w0 = at(lx, 0.05); boxPatch(out, (p.x + w0.x) / 2, G + 1.05, (p.z + w0.z) / 2, Math.abs(p.x - w0.x) + 0.04, 0.04, Math.abs(p.z - w0.z) + 0.04, iron); basket(p, G + 0.45); }
      // swan-neck lanterns over the fascia
      if (pub ? h2 < 0.7 : h2 < 0.25) for (const lx of [xm - repW * 0.28, xm + repW * 0.28]) {
        const p = at(lx, 0.45), w0 = at(lx, 0.02);
        boxPatch(out, (p.x + w0.x) / 2, G + 0.55, (p.z + w0.z) / 2, Math.abs(p.x - w0.x) + 0.04, 0.04, Math.abs(p.z - w0.z) + 0.04, iron);
        boxPatch(out, p.x, G + 0.05, p.z, 0.26, 0.4, 0.26, lampGlass);
        boxPatch(out, p.x, G + 0.45, p.z, 0.32, 0.08, 0.32, iron);
        stats.lanterns++;
      }
      // a blade sign at one end: a neon one on one pub in three, else a painted hanging board with the name
      const endX = h3 < 0.5 ? x0 + 0.35 : x0 + repW - 0.35, wp = at(endX, 0);
      if (pub && h1 > 0.66) { blade(wp, n, G + 1.1, 0.5, 1.7, neonUV[Math.floor(h2 * NEON.length)], 0.25); stats.neon++; }
      else if (h1 < 0.8) { blade(wp, n, G + 1.35, 0.9, 0.72, board(si)); stats.blades++; }
      // flags on angled poles from the first floor (mostly pubs), a row of one to three
      if ((pub && h2 > 0.45) || h2 > 0.9) {
        const k = 1 + Math.floor(h3 * 3);
        for (let f = 0; f < k; f++) {
          const lx = xm + (f - (k - 1) / 2) * 1.5, w0 = at(lx, 0), y0 = G + 1.9, len = 2.1, a = 0.75; // pole 43 deg up from the wall
          const tip = { x: w0.x + n.x * len * Math.cos(a), z: w0.z + n.z * len * Math.cos(a) }, ty = y0 + len * Math.sin(a);
          const mid = { x: (w0.x + tip.x) / 2, z: (w0.z + tip.z) / 2 };
          const g = new THREE.CylinderGeometry(0.025, 0.025, len, 4).rotateX(Math.PI / 2 - a);
          g.rotateY(Math.atan2(n.x, n.z));
          meshPatch(out, g, mid.x, (y0 + ty) / 2, mid.z, iron);
          // the flag hangs from the pole's outer half, in the plane of pole and vertical
          const fr = flagUV[Math.floor(hash(L.seed * 13 + f, rep) * FLAGS.length)], fw = 1.1, fh = 0.72;
          const pA = { x: w0.x + n.x * len * 0.45 * Math.cos(a), z: w0.z + n.z * len * 0.45 * Math.cos(a) }, yA = y0 + len * 0.45 * Math.sin(a);
          const pB = { x: pA.x + n.x * fw * Math.cos(a), z: pA.z + n.z * fw * Math.cos(a) }, yB = yA + fw * Math.sin(a);
          for (const sd of [1, -1]) {
            const o = { x: tng.x * 0.01 * sd, z: tng.z * 0.01 * sd };
            const P = (q, y) => [q.x + o.x, y, q.z + o.z];
            if (sd === 1) quad(out, P(pA, yA - fh), P(pB, yB - fh), P(pB, yB), P(pA, yA), fr);
            else quad(out, P(pB, yB - fh), P(pA, yA - fh), P(pA, yA), P(pB, yB), fr);
          }
          stats.flags++;
        }
      }
      // a projecting clock now and then
      if (h3 > 0.95) {
        const p = at(xm, 0.55);
        boxPatch(out, p.x, G + 1.2, p.z, 0.12 + Math.abs(tng.x) * 0.5, 0.62, 0.12 + Math.abs(tng.z) * 0.5, iron);
        for (const sd of [1, -1]) {
          const q = { x: p.x + tng.x * 0.07 * sd, z: p.z + tng.z * 0.07 * sd }, e = { x: n.x * 0.28, z: n.z * 0.28 };
          if (sd === 1) quad(out, [q.x - e.x, G + 1.21, q.z - e.z], [q.x + e.x, G + 1.21, q.z + e.z], [q.x + e.x, G + 1.77, q.z + e.z], [q.x - e.x, G + 1.77, q.z - e.z], clockFace);
          else quad(out, [q.x + e.x, G + 1.21, q.z + e.z], [q.x - e.x, G + 1.21, q.z - e.z], [q.x - e.x, G + 1.77, q.z - e.z], [q.x + e.x, G + 1.77, q.z + e.z], clockFace);
        }
        stats.clocks++;
      }
      // after dark the lit pub windows throw a warm pool on the footpath and setts (baked with the street lamps)
      if (pub) { const q = at(xm, 1.4); lampSpots.push({ hx: q.x, hz: q.z, hy: 3 }); }
      // a few people with pints outside the pubs, round a barrel
      if (pub && h3 < 0.3) {
        const b = at(xm + (h1 - 0.5) * repW * 0.5, 0.9);
        meshPatch(out, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10), b.x, KERB_H + 0.45, b.z, wood, 1, true);
        addBox(b.x, b.z, 0.35, 0.35, 0);
        const k = 2 + Math.floor(h2 * 2);
        for (let i = 0; i < k; i++) {
          const a = (i / k) * Math.PI * 2 + h1 * 6, r = 0.75;
          const px = b.x + Math.cos(a) * r, pz = b.z + Math.sin(a) * r;
          people.push({ x: px, z: pz, face: Math.atan2(b.x - px, b.z - pz), pint: true, seed: L.seed * 31 + rep * 7 + i });
        }
      }
    }
  }

  // buskers: outside the Temple Bar pub, in Temple Bar Square, and at the south mouth of Merchant's Arch
  const buskers = [];
  {
    const tbp = pubSites.templeBar, c = Math.cos(tbp.rot), s = Math.sin(tbp.rot);
    const q = (lx, lz) => ({ x: tbp.x + lx * c + lz * s, z: tbp.z - lx * s + lz * c });
    const p = q(-2, tbp.d / 2 + 2.2), f = q(-2, tbp.d / 2 + 6);
    buskers.push({ x: p.x, z: p.z, face: Math.atan2(f.x - p.x, f.z - p.z), seed: 3 });
    const sq = extraSites.tbSquare, cs = Math.cos(sq.rot), sn = Math.sin(sq.rot);
    const b2 = { x: sq.x - 4 * cs, z: sq.z + 4 * sn };
    buskers.push({ x: b2.x, z: b2.z, face: sq.rot, seed: 11 });
  }
  for (const b of buskers) {
    people.push({ ...b, busker: true });
    // a few people stopped to listen
    for (let i = 0; i < 4; i++) {
      const a = b.face + (i - 1.5) * 0.45, r = 3 + hash(b.seed, i) * 0.8;
      const px = b.x + Math.sin(a) * r, pz = b.z + Math.cos(a) * r;
      people.push({ x: px, z: pz, face: Math.atan2(b.x - px, b.z - pz), pint: i === 1, seed: b.seed * 5 + i });
    }
    addBox(b.x, b.z, 0.5, 0.5, 0);
  }

  // ---------- material ----------
  const tex = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const mat = new THREE.MeshStandardMaterial({ map: tex(A.colour, true), emissive: 0xffffff, emissiveMap: tex(A.glow, true), emissiveIntensity: 0.03, roughness: 0.7 });
  mat.name = 'templebar';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, lampUniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTbW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTbW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vTbW;\n${LAMP_GLSL}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.directDiffuse += diffuseColor.rgb * lampLight(vTbW.xz) * exp(-max(vTbW.y - 2.5, 0.0) / 4.5) * 2.0;`);
  };
  const group = new THREE.Group(); group.name = 'Temple Bar fronts';
  for (const o of cells.values()) if (o.p.length) group.add(new THREE.Mesh(toGeometry(o), mat));
  group.traverse((o) => { if (o.isMesh) o.castShadow = false; });

  // ---------- people (static figures; vertex colours, one mesh) ----------
  const figures = buildFigures(people, Builder);
  return {
    groups: [group, figures], material: mat, lampSpots, stats, ms: Math.round(performance.now() - t0),
    setNight(level) { mat.emissiveIntensity = 0.03 + (1.2 - 0.03) * level; },
  };
}

// Low-poly standing figures: coat, legs, head and hair, an arm raised with a pint (or a busker with a guitar, its case
// open at their feet). Vertex colours through one material; no animation, no shadows.
const COATS = ['#1d2230', '#2b2b2e', '#39414d', '#5a4a3a', '#23344f', '#6e2a2a', '#a8a39a', '#3d2f4a', '#8a6a3a', '#2f5d7c', '#b23a2a', '#d8b43a', '#4b5a3a'];
const LEGS = ['#1b1d24', '#25262b', '#2d3a55', '#3b4a6b', '#4a4a4f', '#1a1a1a'];
const SKIN = ['#f1d3bf', '#e8bfa3', '#d9a888', '#c48e6a', '#a26d4c', '#7a4e36'];
const HAIR = ['#2a1d14', '#3b2a1c', '#5a3e25', '#8a6a42', '#c49a5a', '#b3542a', '#1b1b1b', '#8e8b86'];
function buildFigures(people, Builder) {
  const col = new THREE.Color();
  const all = [];
  for (const P of people) {
    const h = (k) => hash(P.seed, k), pick = (a, k) => a[Math.floor(h(k) * a.length) % a.length];
    const coat = pick(COATS, 1), legs = pick(LEGS, 2), skin = pick(SKIN, 3), hair = pick(HAIR, 4), s = 0.92 + h(5) * 0.16;
    const parts = [];
    const add = (g, hex, x, y, z, rx = 0) => parts.push([g, hex, x * s, y * s, z * s, rx]);
    add(new THREE.CylinderGeometry(0.19, 0.17, 0.62, 7).scale(1, 1, 0.65), coat, 0, 1.16, 0);
    add(new THREE.CylinderGeometry(0.165, 0.19, 0.3, 7).scale(1, 1, 0.66), coat, 0, 0.73, 0);
    for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.055, 0.84, 5), legs, sx * 0.09, 0.42, 0);
    add(new THREE.SphereGeometry(0.11, 7, 5), skin, 0, 1.63, 0);
    add(new THREE.SphereGeometry(0.117, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.655, -0.01);
    if (P.busker) {
      // guitar across the body, the right arm strumming; the open case in front
      add(new THREE.SphereGeometry(0.2, 8, 5).scale(1, 1.25, 0.35), '#8a5a2a', 0.05, 1.0, 0.2);
      add(new THREE.BoxGeometry(0.06, 0.55, 0.04).rotateZ(-1.0), '#3b2616', 0.32, 1.22, 0.22);
      for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.05, 0.045, 0.58, 5).rotateZ(sx * 0.7).rotateX(-0.6), coat, sx * 0.16, 1.18, 0.14);
      add(new THREE.BoxGeometry(0.4, 0.08, 1.0), '#1a1a1a', 0, 0.04, 0.9);
      add(new THREE.BoxGeometry(0.34, 0.03, 0.9), '#7a2020', 0, 0.09, 0.9);
      add(new THREE.BoxGeometry(0.35, 0.4, 0.25), '#202020', -0.55, 0.2, 0.1); // a small amp
    } else {
      add(new THREE.CylinderGeometry(0.055, 0.045, 0.6, 5), coat, -0.23, 1.13, 0);
      if (P.pint) {
        // right forearm up, the pint at chest height: dark stout under a cream head
        add(new THREE.CylinderGeometry(0.05, 0.045, 0.34, 5).rotateX(-1.2), coat, 0.22, 1.3, 0.12);
        add(new THREE.CylinderGeometry(0.042, 0.036, 0.13, 7), '#1a0e08', 0.22, 1.3, 0.3);
        add(new THREE.CylinderGeometry(0.043, 0.043, 0.03, 7), '#efe4c8', 0.22, 1.38, 0.3);
      } else add(new THREE.CylinderGeometry(0.055, 0.045, 0.6, 5), coat, 0.23, 1.13, 0);
    }
    for (const [g, hex, x, y, z, rx] of parts) {
      const gg = g.index ? g.toNonIndexed() : g;
      if (rx) gg.rotateX(rx);
      gg.translate(x, y, z); gg.rotateY(P.face); gg.translate(P.x, KERB_H * 0.5, P.z);
      col.set(hex);
      const n = gg.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3);
      gg.setAttribute('color', new THREE.BufferAttribute(c, 3));
      gg.deleteAttribute('uv');
      all.push(gg);
    }
  }
  const group = new THREE.Group(); group.name = 'Temple Bar people';
  if (all.length) {
    const mesh = new THREE.Mesh(mergeGeometries(all), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    mesh.castShadow = false; mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
