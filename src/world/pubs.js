// Pub-front kit (docs/research/pubs.md): famous Dublin pubs built from the specs in src/world/pubsites.js.
//
// Every face is painted into one canvas atlas (the shopfront at 48 px/m, the floors above at 24 px/m, party walls and
// backs at 8 px/m), with a matching half-resolution glow atlas for the night look: lit glass, lit fascia lettering,
// lanterns and neon. All the geometry of every pub (walls, fascia cornices, pilasters, awnings, hanging baskets,
// lanterns, blade signs, barrels) samples that one atlas through ONE material, so after the static batch the whole
// set costs a draw call or two per 400 m cell. Low / Battery saver paint the atlas at half resolution.
//
// Spec fields (per pub): key, name, a/b (road), at, side, corner, w, d, and
//   front: [segment...]   segments from the corner outward (else left to right from the street), each
//     { w, floors, fh, G (ground floor height), attic, upper: {...}, shop: {...} }
//   side:  { upper, shop } painted on the corner face (bays listed from the corner back)
//   upper: { wall: 'brick'|'render'|'paint', color, bays, win: 'sash'|'georgian'|'surround'|'plate', frame, blinds,
//            reveal, pilaster, parapet, cornice, frieze: {t, color}, panel, text: [{t,u,y,size}], textColor, textBay,
//            big: {t, y, size, color}, vtext: {t, u, color} }
//   shop:  { paint, trim, fascia, text, letter, outline, font: 'serif'|'script'|'sans', textScale, nums, numStyle, sub,
//            bays: ['win'|'bigwin'|'door'|'board'|'poster'|'panelwin'|'archwin'|'archdoor'|'gwin'|'gdoor'|'club'],
//            door, boardText, panels, frosted, tiles, whiteFrames, consoles, georgian, awnings: [bay idx], awning, awningText }
//   baskets: { front: [u], side: [u], y, sill }, lanterns: { front, side, y, blue }, blades: [{ face, u, y, w, h, bg,
//   lines, color, neon, lit }], barrels: { front, side }       (u: metres along the face from the corner / left end,
//   y: metres above the ground floor's top unless noted)
import * as THREE from 'three';
import { PUB_SPECS, pubSites } from './pubsites.js';
import { LITE } from '../render/quality.js';
import { lampUniforms, LAMP_GLSL } from '../render/lamplight.js';

const ATLAS = LITE ? 1024 : 2048;
const K = ATLAS / 2048;                                       // resolution scale (Low / Battery saver: half)
const PPM = { shop: 48 * K, upper: 24 * K, plain: 8 * K, patch: 32 * K };
const GLOW = 0.5;                                             // glow atlas scale relative to the colour atlas
const PAD = 3;

// ---------- small deterministic helpers ----------
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return '#' + ((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1);
};
const FONTS = {
  serif: (px) => `bold ${px}px Georgia, "Times New Roman", serif`,
  script: (px) => `italic bold ${px}px Georgia, "Times New Roman", serif`,
  sans: (px) => `900 ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`,
};

// ---------- atlas packing ----------
// jobs: { w, h (px), paint(P) } where P draws in metres; shelf-packed, tallest first
function pack(jobs) {
  const sorted = [...jobs].sort((a, b) => b.h - a.h);
  let x = 0, y = 0, row = 0;
  for (const j of sorted) {
    if (x + j.w + PAD > ATLAS) { x = 0; y += row + PAD; row = 0; }
    j.x = x; j.y = y; x += j.w + PAD; row = Math.max(row, j.h);
  }
  return y + row;
}

// A painter bound to one job on one canvas: metres in, pixels out. Each op takes a day colour and a night (glow)
// colour; on the glow canvas only ops with a glow colour draw.
function painter(ctx, job, glow) {
  const s = glow ? GLOW : 1, k = job.k * s, ox = job.x * s, oy = job.y * s;
  const on = (day, night) => (glow ? night : day);
  const P = {
    k, glow,
    rect(x, y, w, h, day, night) { const c = on(day, night); if (!c) return; ctx.fillStyle = c; ctx.fillRect(ox + x * k, oy + y * k, Math.max(1, w * k), Math.max(1, h * k)); },
    grad(x, y, w, h, stops, glowStops) {
      const st = on(stops, glowStops); if (!st) return;
      const g = ctx.createLinearGradient(0, oy + y * k, 0, oy + (y + h) * k);
      st.forEach((c, i) => g.addColorStop(i / (st.length - 1), c));
      ctx.fillStyle = g; ctx.fillRect(ox + x * k, oy + y * k, w * k, h * k);
    },
    path(fn, day, night, stroke = 0) {
      const c = on(day, night); if (!c) return;
      ctx.beginPath(); fn((x, y) => [ox + x * k, oy + y * k], k);
      if (stroke) { ctx.strokeStyle = c; ctx.lineWidth = stroke * k; ctx.stroke(); } else { ctx.fillStyle = c; ctx.fill(); }
    },
    text(str, x, y, size, font, day, night, { maxW = 0, align = 'center', outline = null, spacing = 0 } = {}) {
      const c = on(day, night); if (!c) return;
      const px = Math.max(4, size * k);
      ctx.font = (FONTS[font] || FONTS.serif)(px); ctx.textAlign = align; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * px}px`;
      const tw = ctx.measureText(str).width, sx = maxW && tw > maxW * k ? (maxW * k) / tw : 1;
      ctx.save(); ctx.translate(ox + x * k, oy + y * k); ctx.scale(sx, 1);
      if (outline && !glow) { ctx.lineWidth = Math.max(1, px * 0.08); ctx.strokeStyle = outline; ctx.strokeText(str, 0, 0); }
      ctx.fillStyle = c; ctx.fillText(str, 0, 0);
      ctx.restore();
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    },
    // mottle: n small random dabs (brick tone, weathering)
    mottle(x, y, w, h, n, colors, dw, dh, seed) {
      if (glow) return;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(ox + (x + hash(seed, i) * w) * k, oy + (y + hash(i, seed) * h) * k, dw * k, dh * k);
      }
    },
  };
  return P;
}

// ---------- the pieces of a front ----------
function wall(P, W, H, u, seed) {
  const base = u.color;
  P.rect(0, 0, W, H, base);
  if (u.wall === 'brick') {
    // courses every 2 bricks (finer lines alias), tone variation, a little soot towards the top
    for (let y = 0.15; y < H; y += 0.15) P.rect(0, y, W, 0.02, 'rgba(25,12,8,0.22)');
    P.mottle(0, 0, W, H, Math.round(W * H * 5), [shade(base, 1.12), shade(base, 0.86), shade(base, 1.05), shade(base, 0.92)], 0.22, 0.07, seed);
  } else {
    P.mottle(0, 0, W, H, Math.round(W * H * 1.5), ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.05)'], 0.6, 0.4, seed);
    P.grad(0, H * 0.6, W, H * 0.4, ['rgba(0,0,0,0)', 'rgba(40,35,25,0.12)']);
  }
}

// one upper-floor window: x, y top-left (metres), size w x h
function upperWindow(P, x, y, w, h, u, fl, lit, warm) {
  const frame = u.frame || '#f2efe6';
  const glassDay = ['#1d2429', '#34404a', '#232b31'];
  const glassNight = lit ? (warm ? ['#ffcf8a', '#e99a4a'] : ['#d8e2ff', '#9aaad0']) : null;
  if (u.reveal) P.rect(x - 0.14, y - 0.14, w + 0.28, h + 0.28, u.reveal);
  if (u.win === 'surround') {
    // white stucco aedicule: pilasters, a sill on consoles, a pediment on the first floor, a cornice above the others
    P.rect(x - 0.22, y - 0.1, w + 0.44, h + 0.3, frame);
    P.rect(x - 0.32, y + h + 0.1, w + 0.64, 0.14, shade(frame, 0.92));
    if (fl === 0) P.path((m) => { const [a, b] = m(x - 0.35, y - 0.12), [c, d] = m(x + w / 2, y - 0.6), [e, f] = m(x + w + 0.35, y - 0.12); ctx0(a, b, c, d, e, f); }, frame);
    else P.rect(x - 0.35, y - 0.3, w + 0.7, 0.2, frame);
    P.rect(x - 0.12, y + h + 0.3, w + 0.24, 0.35, shade(frame, 0.95)); // apron panel with roundels
    for (const t of [0.25, 0.5, 0.75]) P.rect(x + w * t - 0.06, y + h + 0.42, 0.12, 0.12, '#b23a30');
  } else if (u.wall === 'brick' && u.win !== 'plate') {
    P.rect(x - 0.08, y - 0.22, w + 0.16, 0.22, shade(u.color, 0.8)); // flat brick arch
    P.rect(x - 0.1, y + h, w + 0.2, 0.1, '#b9b3a6');                  // granite sill
  } else P.rect(x - 0.08, y + h, w + 0.16, 0.08, shade(u.color, 0.85));
  P.rect(x, y, w, h, frame);
  const f = u.win === 'plate' ? 0.1 : 0.07;
  P.grad(x + f, y + f, w - 2 * f, h - 2 * f, glassDay, glassNight);
  if (!lit && !P.glow) P.rect(x + f, y + f, (w - 2 * f) * 0.3, h - 2 * f, 'rgba(230,225,215,0.18)'); // net curtain
  // glazing bars
  const bars = u.win === 'georgian' ? [3, 4] : u.win === 'plate' ? [1, 1] : [2, 2];
  const [cols, rows] = bars;
  for (let c = 1; c < cols; c++) P.rect(x + (w * c) / cols - 0.02, y, 0.04, h, frame, '#000');
  P.rect(x, y + h * 0.5 - 0.03, w, 0.06, frame, '#000');             // meeting rail
  for (let r = 1; r < rows; r++) if (r * 2 !== rows) P.rect(x, y + (h * r) / rows - 0.015, w, 0.03, frame, '#000');
  if (u.win === 'georgian') for (const t of [1 / 6, 2 / 6, 4 / 6, 5 / 6]) P.rect(x, y + h * t - 0.015, w, 0.03, frame, '#000');
  if (u.blinds) {
    // red-and-white striped blind drawn down over the top of the sash
    for (let i = 0; i < 6; i++) P.rect(x + (w * i) / 6, y + 0.02, w / 6, 0.36, i % 2 ? '#f4efe6' : '#b3232a', i % 2 ? null : null);
    P.rect(x, y + 0.36, w, 0.05, '#8a1a1f');
  }
}
let _ctx = null; // the canvas currently painted (for path helpers that need raw coordinates)
function ctx0(a, b, c, d, e, f) { _ctx.moveTo(a, b); _ctx.lineTo(c, d); _ctx.lineTo(e, f); _ctx.closePath(); }

function paintUpper(P, W, H, u, seg, reversed, seed) {
  wall(P, W, H, u, seed);
  const fh = seg.fh, floors = seg.floors, attic = seg.attic ?? 0.8;
  // parapet and cornice
  P.rect(0, 0, W, attic, u.parapet || shade(u.color, 0.85));
  P.rect(0, attic - 0.16, W, 0.16, u.cornice || shade(u.parapet || u.color, 1.2));
  if (u.frieze) {
    P.rect(0, 0.1, W, attic - 0.3, u.parapet);
    P.text(u.frieze.t, W / 2, attic * 0.45, Math.min(0.7, attic * 0.55), 'serif', u.frieze.color, 'rgba(255,236,200,0.55)', { maxW: W * 0.8, spacing: 0.08 });
  }
  if (u.pilaster) {
    const nb = Math.max(1, u.bays);
    for (let i = 0; i <= nb; i++) P.rect(Math.min(W - 0.45, Math.max(0, (W * i) / nb - 0.22)), attic, 0.45, H - attic, u.pilaster);
  }
  // windows
  const nb = u.bays || 0;
  for (let fl = 0; fl < floors; fl++) {
    const top = attic + (floors - 1 - fl) * fh; // fl 0 = first floor (lowest)
    const h = fh * (u.win === 'plate' ? 0.62 : fl === 0 ? 0.62 : fl === floors - 1 ? 0.5 : 0.56);
    const y = top + fh - h - (u.win === 'plate' ? 0.9 : 0.75);
    for (let i = 0; i < nb; i++) {
      if (u.textBay === i) continue;
      const bw = W / nb, w = u.win === 'plate' ? bw * 0.62 : Math.min(1.25, bw * 0.5), x = bw * i + (bw - w) / 2;
      const r = hash(seed + fl * 7.1, i * 3.3);
      upperWindow(P, x, y, w, h, u, fl, r < 0.5, r < 0.4);
    }
  }
  if (u.panel) P.text(u.panel.t, reversed ? W - u.panel.u : u.panel.u, attic + fh * 0.45, 0.45, 'serif', u.panel.color, null);
  const Htop = seg.G + floors * fh + attic; // metres above ground at the face's top
  for (const t of u.text || []) P.text(t.t, reversed ? W - t.u : t.u, Htop - t.y, t.size, 'serif', u.textColor, 'rgba(255,245,225,0.25)', { maxW: W * 0.5, spacing: 0.06 });
  if (u.big) P.text(u.big.t, W / 2, Htop - (seg.G + u.big.y), u.big.size, 'serif', u.big.color, 'rgba(160,220,240,0.35)');
  if (u.vtext) {
    const x = reversed ? W - u.vtext.u : u.vtext.u, letters = u.vtext.t.split(''), step = Math.min(0.62, (H - attic - 1) / letters.length);
    letters.forEach((ch, i) => P.text(ch, x, attic + 0.8 + i * step, step * 0.95, 'serif', u.vtext.color, null));
  }
}

// ground-floor layout: bay kinds with their x ranges (metres, left to right as seen from the street)
const WEIGHT = { door: 0.8, win: 1, bigwin: 2.4, board: 1, poster: 1, panelwin: 1.1, archwin: 1, archdoor: 0.85, gwin: 1, gdoor: 1.05, club: 1.3 };
function shopLayout(shop, W) {
  const pil = 0.34, gap = 0.16, bays = shop.bays;
  const total = bays.reduce((a, t) => a + WEIGHT[t], 0), avail = W - 2 * pil - gap * (bays.length - 1);
  let x = pil;
  return bays.map((t, i) => { const w = (avail * WEIGHT[t]) / total, o = { t, i, x0: x, x1: x + w }; x += w + gap; return o; });
}
const fasciaH = (G) => Math.min(0.95, 0.2 * G);

function paintShop(P, W, G, s, layout, reversed) {
  const fT = 0.18, fH = fasciaH(G), fB = fT + fH;
  const lit = 'rgba(255,190,110,1)';
  const paintGlow = rgba(s.paint, s.wash ?? 0.14);
  if (s.georgian) {
    // Georgian house ground floor (brick, fanlit doors up steps, sash windows) with a club sign board
    P.rect(0, 0, W, G, s.paint, 'rgba(255,170,90,0.04)');
    for (let y = 0.15; y < G; y += 0.15) P.rect(0, y, W, 0.02, 'rgba(25,12,8,0.22)');
    P.rect(0, G - 0.6, W, 0.6, '#8f8b82');                                             // granite plinth
  } else {
    P.rect(0, 0, W, G, s.paint, paintGlow);
    if (s.tiles) {
      for (let y = fB; y < G - 0.6; y += 0.15) for (let x = 0; x < W; x += 0.15) P.rect(x + 0.01, y + 0.01, 0.13, 0.13, hash(x * 9, y * 7) < 0.5 ? shade(s.paint, 1.06) : shade(s.paint, 0.94));
      P.rect(0, G - 0.6, W, 0.6, '#161616');
    }
    P.rect(0, 0, W, fT, s.trim);                                                        // cornice
    P.rect(0, fT, W, fH, s.fascia, s.letterGlow || 'rgba(255,215,150,0.14)');         // fascia board
    P.rect(0, fB, W, 0.1, s.trim);
    P.rect(0, fT + 0.04, W, 0.03, s.outline || shade(s.fascia, 1.35));
    P.rect(0, fB - 0.07, W, 0.03, s.outline || shade(s.fascia, 1.35));
    const numW = s.nums ? 0.9 : 0.2;
    const size = fH * (s.font === 'script' ? 0.78 : 0.62) * (s.textScale || 1);
    P.text(s.text, W / 2, fT + fH * 0.53, size, s.font, s.letter, 'rgba(255,232,170,1)', { maxW: W - 2 * numW - 0.4, outline: s.outline, spacing: s.font === 'script' ? 0 : 0.05 });
    if (s.sub) P.text(s.sub, reversed ? W - 1.6 : 1.6, fT + fH * 0.55, fH * 0.34, 'script', s.letter, 'rgba(255,232,170,0.8)');
    if (s.nums) for (const x of [0.55, W - 0.55]) {
      if (s.numStyle === 'roundel') P.path((m, k) => { const [cx, cy] = m(x, fT + fH / 2); _ctx.arc(cx, cy, fH * 0.36 * k, 0, 7); }, s.letter, 'rgba(255,232,170,0.7)', 0.04);
      P.text(s.nums, x, fT + fH * 0.55, fH * 0.42, 'serif', s.letter, 'rgba(255,232,170,0.9)');
    }
    // end pilasters with capitals (and carved consoles)
    for (const x of [0, W - 0.34]) {
      P.rect(x, fB, 0.34, G - fB, s.trim);
      P.rect(x + 0.05, fB + 0.1, 0.24, 0.08, s.outline || s.letter);
      if (s.consoles) P.path((m) => { const [a, b] = m(x, fT), [c, d] = m(x + 0.34, fT), [e, f] = m(x + 0.34, fB + 0.4), [g, h] = m(x, fB + 0.6); _ctx.moveTo(a, b); _ctx.lineTo(c, d); _ctx.lineTo(e, f); _ctx.lineTo(g, h); _ctx.closePath(); }, '#0a0a0a');
    }
  }
  if (s.georgian) {
    P.rect(W * 0.18, fT + 0.05, W * 0.64, fH + 0.1, s.fascia, 'rgba(255,140,60,0.2)');
    P.rect(W * 0.18, fT + 0.05, W * 0.64, 0.05, s.letter, 'rgba(255,150,70,0.9)');
    P.text(s.text, W / 2, fT + 0.1 + fH * 0.5, fH * 0.55, s.font, s.letter, 'rgba(255,160,80,1)', { maxW: W * 0.6, spacing: 0.04 });
  }
  const top = fB + 0.12, stall = 0.72;
  for (const b of layout) {
    const x = b.x0, w = b.x1 - b.x0;
    if (b.i > 0 && !s.georgian) P.rect(x - 0.16, fB, 0.16, G - fB, s.trim);          // mullion pilaster
    const glass = s.frosted ? ['#8d8a7e', '#6d6a60'] : ['#3a2418', '#1c120c'];
    const glow = ['rgba(255,200,120,1)', 'rgba(230,140,60,1)'];
    const frame = s.whiteFrames ? '#f2efe6' : shade(s.paint, 0.75);
    switch (b.t) {
      case 'win': case 'bigwin': case 'panelwin': case 'board': case 'poster': {
        P.rect(x, top, w, G - top - stall, frame);
        P.grad(x + 0.07, top + 0.07, w - 0.14, G - top - stall - 0.14, glass, glow);
        if (!P.glow) P.rect(x + 0.07, top + 0.07, w - 0.14, 0.5, 'rgba(255,190,110,0.12)');
        P.rect(x, top + 0.55, w, 0.05, frame, '#000');                                  // transom bar
        const cols = b.t === 'bigwin' ? (s.whiteFrames ? 6 : 3) : 2, rows = s.whiteFrames ? 6 : 1;
        for (let c = 1; c < cols; c++) P.rect(x + (w * c) / cols - 0.025, top, 0.05, G - top - stall, frame, '#000');
        for (let r = 1; r < rows; r++) P.rect(x, top + 0.6 + ((G - top - stall - 0.6) * r) / rows, w, 0.04, frame, '#000');
        if (b.t === 'board' || b.t === 'poster') {
          const lines = b.t === 'board' ? s.boardText || ['FINE', 'WINES'] : ['LIVE', 'MUSIC', 'DAILY'];
          const bx = x + 0.15, by = top + 0.8, bw = w - 0.3, bh = Math.min(1.3, G - top - stall - 1);
          P.rect(bx, by, bw, bh, '#131313', 'rgba(255,200,120,0.25)');
          P.rect(bx + 0.04, by + 0.04, bw - 0.08, 0.03, s.letter || '#d9ad48');
          lines.forEach((l, i) => P.text(l, bx + bw / 2, by + (bh * (i + 0.6)) / (lines.length + 0.2), (bh / (lines.length + 0.5)) * (i === lines.length - 1 ? 0.8 : 0.6), i === 0 && b.t === 'board' ? 'script' : 'serif', s.letter || '#d9ad48', 'rgba(255,225,160,0.9)', { maxW: bw - 0.1 }));
        }
        if (b.t === 'panelwin') {
          const label = (s.panels || [])[layout.filter((q) => q.t === 'panelwin').indexOf(b)] || '';
          P.rect(x + 0.12, top + 0.1, w - 0.24, 0.4, '#1d1a10', 'rgba(255,220,150,0.3)');
          P.text(label, x + w / 2, top + 0.31, 0.26, 'serif', '#d9ad48', 'rgba(255,230,170,0.9)', { maxW: w - 0.3 });
        }
        // stall riser with a fielded panel
        P.rect(x, G - stall, w, stall, s.georgian ? '#8f8b82' : s.paint);
        P.rect(x + 0.1, G - stall + 0.12, w - 0.2, stall - 0.24, shade(s.paint, 0.82));
        break;
      }
      case 'archwin': case 'archdoor': {
        const door = b.t === 'archdoor', r = w / 2, y0 = top + r;
        P.path((m, k) => { const [cx, cy] = m(x + r, y0); _ctx.moveTo(cx - r * k, oyOf(m, G - (door ? 0 : stall))); _ctx.arc(cx, cy, r * k, Math.PI, 0); _ctx.lineTo(cx + r * k, oyOf(m, G - (door ? 0 : stall))); _ctx.closePath(); }, '#111');
        P.path((m, k) => { const [cx, cy] = m(x + r, y0); _ctx.moveTo(cx - (r - 0.08) * k, oyOf(m, G - (door ? 0.05 : stall + 0.05))); _ctx.arc(cx, cy, (r - 0.08) * k, Math.PI, 0); _ctx.lineTo(cx + (r - 0.08) * k, oyOf(m, G - (door ? 0.05 : stall + 0.05))); _ctx.closePath(); }, door ? s.door : '#2a1a12', door ? 'rgba(255,190,110,0.35)' : lit);
        if (door) { P.rect(x + 0.2, top + r + 0.4, w - 0.4, 0.9, 'rgba(255,200,120,0.25)', 'rgba(255,200,120,0.9)'); P.rect(x + 0.2, G - 1.1, w - 0.4, 0.05, shade(s.door, 0.7)); }
        else P.rect(x, G - stall, w, stall, '#161616');
        break;
      }
      case 'door': case 'gdoor': {
        const geo = b.t === 'gdoor';
        const dw = Math.min(w, geo ? 1.15 : 1.3), dx = x + (w - dw) / 2, dtop = top + (geo ? 0.9 : 0.55);
        if (geo) {
          // fanlit Georgian doorcase up three steps
          P.rect(dx - 0.3, top + 0.2, dw + 0.6, G - top - 0.2, '#efeae0');
          P.path((m, k) => { const [cx, cy] = m(dx + dw / 2, dtop); _ctx.arc(cx, cy, (dw / 2) * k, Math.PI, 0); _ctx.closePath(); }, '#30353a', 'rgba(255,205,130,1)');
          P.rect(x, G - 0.45, w, 0.45, '#9a968e');
          P.rect(dx, dtop, dw, G - dtop - 0.45, s.door);
        } else {
          P.rect(dx - 0.05, top, dw + 0.1, G - top, frame);
          P.grad(dx + 0.05, top + 0.05, dw - 0.1, 0.42, glass, glow);                  // transom light
          P.rect(dx, dtop, dw, G - dtop, s.door, 'rgba(255,170,90,0.05)');
          P.grad(dx + 0.12, dtop + 0.12, dw - 0.24, (G - dtop) * 0.42, glass, glow);     // glazed upper panels
          P.rect(dx + dw / 2 - 0.03, dtop, 0.06, G - dtop, shade(s.door, 0.7));
        }
        for (const t of [0.62, 0.84]) for (const hx of [0.12, dw / 2 + 0.06]) P.rect(dx + hx, dtop + (G - dtop) * t - 0.18, dw / 2 - 0.18, 0.3, shade(s.door, 0.8));
        if (s.whiteFrames) for (const t of [0.12, 0.45, 0.72]) P.rect(dx + 0.12, dtop + (G - dtop) * t, dw - 0.24, (G - dtop) * 0.2, '#f2efe6');
        break;
      }
      case 'gwin': {
        const ww = Math.min(w * 0.7, 1.2), wx = x + (w - ww) / 2, wy = top + 0.35, wh = G - top - 1.5;
        P.rect(wx - 0.08, wy - 0.2, ww + 0.16, 0.2, shade(s.paint, 0.8));
        upperWindow(P, wx, wy, ww, wh, { win: 'georgian', frame: '#f2efe6', color: s.paint, wall: 'brick' }, 1, true, true);
        // basement railings
        for (let rx = x; rx < x + w; rx += 0.12) P.rect(rx, G - 1.0, 0.025, 0.6, '#141414');
        P.rect(x, G - 1.0, w, 0.04, '#141414');
        break;
      }
      case 'club': {
        // the club's basement entrance under a canopy: black doors, copper uplight
        P.rect(x, top + 0.3, w, G - top - 0.3, '#1a1a1a', 'rgba(255,120,50,0.15)');
        P.rect(x + 0.1, top + 0.6, w - 0.2, 0.5, '#101010', 'rgba(255,140,60,0.5)');
        P.text('COPPERS', x + w / 2, top + 0.85, 0.34, 'sans', '#e0843a', 'rgba(255,160,80,1)', { maxW: w - 0.3 });
        P.rect(x + 0.25, top + 1.3, w - 0.5, G - top - 1.3, '#0c0c0c', 'rgba(255,130,60,0.3)');
        break;
      }
      default: break;
    }
  }
}
// raw canvas y of a metre y through a painter's mapping
const oyOf = (m, y) => m(0, y)[1];

// awnings: canvas stripes / a coloured blind with the name on its valance (3 m x 1.6 m patch)
function paintAwning(P, style, text) {
  const W = 3, H = 1.6;
  if (style === 'stripes') for (let i = 0; i < 12; i++) P.rect((W * i) / 12, 0, W / 12, H, i % 2 ? '#f4efe6' : '#a3141c', i % 2 ? 'rgba(255,220,180,0.1)' : 'rgba(200,40,40,0.1)');
  else P.rect(0, 0, W, H, style === 'green' ? '#1f5a3a' : '#141414', 'rgba(255,200,140,0.06)');
  P.rect(0, H - 0.34, W, 0.34, style === 'stripes' ? '#a3141c' : style === 'green' ? '#174a2f' : '#0e0e0e');
  if (text) P.text(text, W / 2, H - 0.17, 0.27, 'script', '#f3efe6', 'rgba(255,240,210,0.6)', { maxW: W - 0.3 });
}

// ---------- geometry ----------
// a quad from bl, br, tr, tl (each [x, y, z]) textured with atlas rect r ({ u0, v0, u1, v1 }), optionally a sub-rect
function quad(out, bl, br, tr, tl, r) {
  const e1 = new THREE.Vector3(...br).sub(new THREE.Vector3(...bl)), e2 = new THREE.Vector3(...tl).sub(new THREE.Vector3(...bl));
  const n = e1.cross(e2).normalize();
  const P = [bl, br, tr, bl, tr, tl], U = [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v0], [r.u1, r.v1], [r.u0, r.v1]];
  for (let i = 0; i < 6; i++) { out.p.push(...P[i]); out.n.push(n.x, n.y, n.z); out.uv.push(...U[i]); }
}
// a box (centre x, y0 bottom, z; size sx, sy, sz) with every face on one patch
function boxPatch(out, x, y0, z, sx, sy, sz, r) {
  const X0 = x - sx / 2, X1 = x + sx / 2, Y0 = y0, Y1 = y0 + sy, Z0 = z - sz / 2, Z1 = z + sz / 2;
  quad(out, [X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1], r);
  quad(out, [X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0], r);
  quad(out, [X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], r);
  quad(out, [X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0], r);
  quad(out, [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0], r);
}
// any three.js geometry, every vertex mapped into a patch (u spread by position for a mottled look)
function meshPatch(out, geo, x, y, z, r, s = 1, ownUV = false) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  const pos = g.attributes.position, nor = g.attributes.normal, guv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    if (ownUV) {
      out.p.push(x + pos.getX(i) * s, y + pos.getY(i) * s, z + pos.getZ(i) * s); out.n.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      out.uv.push(r.u0 + (r.u1 - r.u0) * Math.min(0.999, guv.getX(i)), r.v0 + (r.v1 - r.v0) * guv.getY(i));
      continue;
    }
    out.p.push(x + pos.getX(i) * s, y + pos.getY(i) * s, z + pos.getZ(i) * s);
    out.n.push(nor.getX(i), nor.getY(i), nor.getZ(i));
    const f = Math.floor(i / 3), h = hash(f * 1.7 + x, f * 0.3 + z);
    out.uv.push(r.u0 + (r.u1 - r.u0) * (0.15 + 0.7 * h), r.v0 + (r.v1 - r.v0) * (0.15 + 0.7 * hash(f, h)));
  }
}
function toGeometry(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  return g;
}

// ---------- the kit ----------
export function buildPubs(Builder) {
  const t0 = performance.now();
  const jobs = [];
  const job = (kind, wM, hM, paint) => { const k = PPM[kind]; const j = { k, w: Math.max(4, Math.ceil(wM * k)), h: Math.max(4, Math.ceil(hM * k)), paint }; jobs.push(j); return j; };
  // shared colour patches (solid colours for cornices, iron, glass, foliage...)
  const patches = new Map();
  const patch = (day, night = null, draw = null) => {
    const key = day + '|' + night + (draw ? '|d' + patches.size : '');
    if (!patches.has(key)) patches.set(key, job('patch', 0.5, 0.5, draw || ((P) => P.rect(0, 0, 0.5, 0.5, day, night))));
    return patches.get(key);
  };
  // basket planting: trailing leaves (greens) and the flowers over them (pinks, reds, a little white); each facet
  // of a basket takes one colour from its patch
  const foliage = patch('#3f6b2a', null, (P) => {
    for (let i = 0; i < 16; i++) P.rect((i % 4) * 0.125, Math.floor(i / 4) * 0.125, 0.125, 0.125, ['#3f7a2c', '#4f8c34', '#35682a', '#5a9a3c'][(i * 7) % 4]);
  });
  const flowers = patch('#d63a6a', null, (P) => {
    for (let i = 0; i < 16; i++) P.rect((i % 4) * 0.125, Math.floor(i / 4) * 0.125, 0.125, 0.125, ['#d63a6a', '#e8547e', '#b8244c', '#4f8c34', '#f3eef2', '#e04040', '#d63a6a', '#c8306a'][(i * 5) % 8]);
  });
  const iron = patch('#141414');
  const lampGlass = patch('#f4e7c4', '#ffd79a');
  const blueGlass = patch('#3050b8', '#6a8aff');
  const wood = patch('#6b4a2a', null, (P) => { P.rect(0, 0, 0.5, 0.5, '#6b4a2a'); for (let i = 0; i < 5; i++) P.rect(0, i * 0.1 + 0.02, 0.5, 0.015, '#3b2614'); P.rect(0, 0.12, 0.5, 0.03, '#2a2a2a'); P.rect(0, 0.36, 0.5, 0.03, '#2a2a2a'); });
  const roof = patch('#3b3e41');
  const awningJobs = {};
  const awningPatch = (style, text) => {
    const key = style + '|' + (text || '');
    if (!awningJobs[key]) awningJobs[key] = job('patch', 3, 1.6, (P) => paintAwning(P, style, text));
    return awningJobs[key];
  };

  // per pub: face jobs and the geometry that uses them (uv rects resolved after packing)
  const pubs = [];
  for (const spec of PUB_SPECS) {
    const site = pubSites[spec.key], cs = site.cornerSide;
    const revFront = cs === 1, revSide = cs === -1;
    const segs = revFront ? [...spec.front].reverse() : spec.front;
    const pub = { spec, site, faces: [] };
    let x = -spec.w / 2;
    segs.forEach((seg, si) => {
      const H = seg.G + seg.floors * seg.fh + (seg.attic ?? 0.8);
      const layout = shopLayout(seg.shop, seg.w);
      if (revFront) layout.reverse().forEach((b) => { const x0 = seg.w - b.x1, x1 = seg.w - b.x0; b.x0 = x0; b.x1 = x1; });
      // painting uses the layout in viewer order; bays keep their spec index for awnings
      const shopJ = job('shop', seg.w, seg.G, (P) => paintShop(P, seg.w, seg.G, seg.shop, layout, revFront));
      const upJ = job('upper', seg.w, H - seg.G, (P) => paintUpper(P, seg.w, H - seg.G, seg.upper, seg, revFront, si * 13 + spec.w));
      const plainJ = job('plain', spec.d, H, (P) => { wall(P, spec.d, H, { ...seg.upper, wall: seg.upper.wall === 'render' ? 'render' : 'brick', color: shade(seg.upper.color, 0.92) }, si); });
      const backJ = job('plain', seg.w, H, (P) => { wall(P, seg.w, H, { ...seg.upper, color: shade(seg.upper.color, 0.9) }, si + 5); });
      pub.faces.push({ seg, x0: x, x1: x + seg.w, H, layout, shopJ, upJ, plainJ, backJ, isCorner: cs !== 0 && (revFront ? si === segs.length - 1 : si === 0) });
      // register the solid-colour patches and blinds the geometry below will sample (all jobs exist before packing)
      patch(seg.shop.trim); patch(seg.upper.cornice || shade(seg.upper.parapet || seg.upper.color, 1.2)); patch(seg.upper.parapet || seg.upper.color);
      if (seg.shop.awnings) awningPatch(seg.shop.awning || 'stripes', seg.shop.awningText);
      x += seg.w;
    });
    pub.blades = (spec.blades || []).map((bl) => ({ bl, j: job('shop', bl.w, bl.h, (P) => {
      const lines = bl.lines;
      P.rect(0, 0, bl.w, bl.h, bl.bg, bl.neon ? 'rgba(0,0,0,1)' : bl.lit ? 'rgba(255,230,190,0.55)' : 'rgba(255,200,130,0.12)');
      P.rect(0.03, 0.03, bl.w - 0.06, 0.03, bl.color, bl.neon ? bl.color : null);
      P.rect(0.03, bl.h - 0.06, bl.w - 0.06, 0.03, bl.color, bl.neon ? bl.color : null);
      lines.forEach((l, i) => P.text(l, bl.w / 2, (bl.h * (i + 0.6)) / (lines.length + 0.2), (bl.h / (lines.length + 0.4)) * 0.78, bl.neon ? 'sans' : 'serif', bl.color, bl.neon ? bl.color : bl.lit ? shade(bl.color, 0.6) : 'rgba(255,225,160,0.8)', { maxW: bl.w - 0.12 }));
    }) }));
    if (spec.side) { patch(spec.side.shop.trim); if (spec.side.shop.awnings) awningPatch(spec.side.shop.awning || 'stripes', spec.side.shop.awningText); }
    if (spec.side && cs) {
      const cseg = pub.faces.find((f) => f.isCorner).seg, D = spec.d;
      const sseg = { ...cseg, w: D, upper: spec.side.upper, shop: spec.side.shop };
      const layout = shopLayout(spec.side.shop, D);
      if (revSide) layout.reverse().forEach((b) => { const x0 = D - b.x1, x1 = D - b.x0; b.x0 = x0; b.x1 = x1; });
      const H = cseg.G + cseg.floors * cseg.fh + (cseg.attic ?? 0.8);
      pub.side = { seg: sseg, H, layout,
        shopJ: job('shop', D, cseg.G, (P) => paintShop(P, D, cseg.G, sseg.shop, layout, revSide)),
        upJ: job('upper', D, H - cseg.G, (P) => paintUpper(P, D, H - cseg.G, sseg.upper, sseg, revSide, 99 + spec.w)) };
    }
    pubs.push(pub);
  }

  // pack and paint both atlases
  const used = pack(jobs);
  if (used > ATLAS) console.warn(`pub atlas overflow: ${used} px > ${ATLAS}`);
  const H = Math.min(ATLAS, 2 ** Math.ceil(Math.log2(Math.max(64, used))));
  const colour = document.createElement('canvas'), glowC = document.createElement('canvas');
  colour.width = ATLAS; colour.height = H; glowC.width = ATLAS * GLOW; glowC.height = H * GLOW;
  const cc = colour.getContext('2d'), gc = glowC.getContext('2d');
  cc.fillStyle = '#6a4a3a'; cc.fillRect(0, 0, ATLAS, H);
  gc.fillStyle = '#000'; gc.fillRect(0, 0, glowC.width, glowC.height);
  const tPaint = performance.now();
  for (const j of jobs) {
    for (const [ctx, glow] of [[cc, false], [gc, true]]) {
      _ctx = ctx; ctx.save();
      const s = glow ? GLOW : 1;
      ctx.beginPath(); ctx.rect(j.x * s, j.y * s, j.w * s, j.h * s); ctx.clip();
      j.paint(painter(ctx, j, glow));
      ctx.restore();
    }
  }
  const paintMs = Math.round(performance.now() - tPaint);
  const uv = (j, a = 0, b = 0, c = 1, d = 1) => {
    // sub-rect (a, b)-(c, d) of job j in 0..1 (b = 0 at the top), inset half a pixel
    const x0 = j.x + 0.5 + a * (j.w - 1), x1 = j.x + 0.5 + c * (j.w - 1), y0 = j.y + 0.5 + b * (j.h - 1), y1 = j.y + 0.5 + d * (j.h - 1);
    return { u0: x0 / ATLAS, u1: x1 / ATLAS, v0: 1 - y1 / H, v1: 1 - y0 / H };
  };
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; t.generateMipmaps = true;
    return t;
  };
  const mat = new THREE.MeshStandardMaterial({ map: tex(colour, true), emissive: 0xffffff, emissiveMap: tex(glowC, true), emissiveIntensity: 0.04, roughness: 0.72 });
  mat.name = 'pubs';
  // the baked street-lamp pools light the fronts after dark, as they do the filler facades (one texture tap)
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, lampUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPubW; varying vec3 vPubN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvPubW = (modelMatrix * vec4(transformed, 1.0)).xyz; vPubN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPubW; varying vec3 vPubN;\n${LAMP_GLSL}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.directDiffuse += diffuseColor.rgb * lampLight(vPubW.xz + vPubN.xz * 1.8) * exp(-max(vPubW.y - 2.5, 0.0) / 4.5) * 2.0 * (1.0 - abs(vPubN.y));`);
  };

  // build the geometry
  const groups = [];
  for (const pub of pubs) {
    const { spec, site } = pub, D = spec.d, W = spec.w, cs = site.cornerSide;
    const body = { p: [], n: [], uv: [] }, bits = { p: [], n: [], uv: [] };
    const zF = D / 2, fz = zF + 0.03; // front wall, shopfront just proud of it
    for (const f of pub.faces) {
      const { seg, x0, x1, H } = f, G = seg.G;
      quad(body, [x0, G, zF], [x1, G, zF], [x1, H, zF], [x0, H, zF], uv(f.upJ));
      quad(body, [x0, 0, fz], [x1, 0, fz], [x1, G, fz], [x0, G, fz], uv(f.shopJ));
      quad(body, [x1, 0, -zF], [x0, 0, -zF], [x0, H, -zF], [x1, H, -zF], uv(f.backJ));
      quad(body, [x0, H, zF], [x1, H, zF], [x1, H, -zF], [x0, H, -zF], uv(roof));
      // ends: the corner face is painted; other ends are plain party walls
      const cornerEnd = f.isCorner && pub.side ? cs : 0;
      if (cornerEnd !== -1) quad(body, [x0, 0, -zF], [x0, 0, zF], [x0, H, zF], [x0, H, -zF], uv(f.plainJ));
      if (cornerEnd !== 1) quad(body, [x1, 0, zF], [x1, 0, -zF], [x1, H, -zF], [x1, H, zF], uv(f.plainJ));
      // fascia cornice, shop pilasters and a parapet coping for relief
      const trim = patch(seg.shop.trim), fT = G - 0.18, fH = fasciaH(G);
      if (!seg.shop.georgian) {
        boxPatch(body, (x0 + x1) / 2, fT - 0.02, zF + 0.2, x1 - x0 + 0.1, 0.22, 0.36, uv(trim));
        boxPatch(body, (x0 + x1) / 2, G - 0.18 - fH - 0.12, zF + 0.1, x1 - x0, 0.1, 0.16, uv(trim));
        for (const b of [x0 + 0.17, x1 - 0.17]) boxPatch(body, b, 0, zF + 0.1, 0.36, G - 0.18 - fH, 0.18, uv(trim));
      }
      boxPatch(body, (x0 + x1) / 2, H - (seg.attic ?? 0.8) + 0.02, zF + 0.1, x1 - x0, 0.16, 0.2, uv(patch(seg.upper.cornice || shade(seg.upper.parapet || seg.upper.color, 1.2))));
      boxPatch(body, (x0 + x1) / 2, H, 0, x1 - x0 + 0.1, 0.12, D + 0.1, uv(patch(seg.upper.parapet || seg.upper.color)));
      // awnings over chosen bays
      const aw = seg.shop.awnings || [];
      for (const b of f.layout) {
        if (!aw.includes(specIndex(seg.shop, b))) continue;
        const style = seg.shop.awning || 'stripes', ap = awningPatch(style, seg.shop.awningText), top = G - 0.18 - fH - 0.2;
        awning(bits, x0 + b.x0 - 0.05, x0 + b.x1 + 0.05, top, zF, uv(ap, 0, 0, 1, 0.78), uv(ap, 0, 0.78, 1, 1));
      }
    }
    if (pub.side) {
      const sd = pub.side, G = sd.seg.G, x = cs * W / 2, xo = x + cs * 0.03, H = sd.H;
      // viewer order: at +x the viewer's left is the front corner (z = +D/2); at -x it is the back
      const zA = cs === 1 ? zF : -zF, zB = -zA;
      quad(body, [x, G, zA], [x, G, zB], [x, H, zB], [x, H, zA], uv(sd.upJ));
      quad(body, [xo, 0, zA], [xo, 0, zB], [xo, G, zB], [xo, G, zA], uv(sd.shopJ));
      const trim = patch(sd.seg.shop.trim), fH = fasciaH(G);
      boxPatch(body, x + cs * 0.2, G - 0.2, 0, 0.36, 0.22, D, uv(trim));
      for (const z of [zA - Math.sign(zA) * 0.17, zB - Math.sign(zB) * 0.17]) boxPatch(body, x + cs * 0.1, 0, z, 0.18, G - 0.18 - fH, 0.36, uv(trim));
      const aw = sd.seg.shop.awnings || [];
      for (const b of sd.layout) {
        if (!aw.includes(specIndex(sd.seg.shop, b))) continue;
        const ap = awningPatch(sd.seg.shop.awning || 'stripes', sd.seg.shop.awningText), top = G - 0.18 - fH - 0.2;
        // along the side: u runs from zA to zB
        const za = zA + (zB - zA) * (b.x0 - 0.05) / D, zb = zA + (zB - zA) * (b.x1 + 0.05) / D;
        awningSide(bits, x, cs, za, zb, top, uv(ap, 0, 0, 1, 0.78), uv(ap, 0, 0.78, 1, 1));
      }
    }
    // positions along a face: 'front' u from the corner (or the left end), 'side' u from the front corner
    const G0 = pub.faces[0].seg.G;
    const at = (face, u, out = 0.25) => {
      if (face === 'side') return { x: cs * (W / 2 + out), z: zF - u, nx: cs, nz: 0 };
      const xv = cs === 1 ? W / 2 - u : -W / 2 + u;
      return { x: xv, z: zF + out, nx: 0, nz: 1 };
    };
    const B = spec.baskets;
    if (B) {
      for (const face of ['front', 'side']) for (const u of B[face] || []) {
        const p = at(face, u, 0.55), y = G0 + B.y;
        const w = at(face, u, 0.05);
        boxPatch(bits, (p.x + w.x) / 2, y + 0.55, (p.z + w.z) / 2, Math.abs(p.x - w.x) + 0.04, 0.04, Math.abs(p.z - w.z) + 0.04, uv(iron)); // bracket
        boxPatch(bits, p.x, y + 0.2, p.z, 0.02, 0.36, 0.02, uv(iron));                                                                 // chain
        meshPatch(bits, new THREE.IcosahedronGeometry(0.42, 1), p.x, y, p.z, uv(foliage));
        meshPatch(bits, new THREE.IcosahedronGeometry(0.34, 1), p.x, y + 0.12, p.z, uv(flowers));
      }
      // flower boxes along the fascia cornice: short boxes, leaves and blooms in turn
      if (B.sill) for (const f of pub.faces) for (let x = f.x0 + 0.4, i = 0; x < f.x1 - 0.6; x += 0.62, i++) boxPatch(bits, x + 0.3, f.seg.G + 0.05, zF + 0.35, 0.6, 0.3 + 0.08 * (i % 2), 0.34, uv(i % 2 ? flowers : foliage, 0.3, 0.3, 0.45, 0.45));
    }
    const Lt = spec.lanterns;
    if (Lt) {
      const glass = uv(Lt.blue ? blueGlass : lampGlass);
      for (const face of ['front', 'side']) for (const u of Lt[face] || []) {
        const p = at(face, u, 0.5), w = at(face, u, 0.02), y = G0 + Lt.y;
        boxPatch(bits, (p.x + w.x) / 2, y + 0.62, (p.z + w.z) / 2, Math.abs(p.x - w.x) + 0.04, 0.04, Math.abs(p.z - w.z) + 0.04, uv(iron));
        boxPatch(bits, p.x, y, p.z, 0.3, 0.46, 0.3, glass);
        boxPatch(bits, p.x, y + 0.46, p.z, 0.36, 0.1, 0.36, uv(iron));
        boxPatch(bits, p.x, y - 0.06, p.z, 0.2, 0.06, 0.2, uv(iron));
      }
    }
    for (const { bl, j } of pub.blades) {
      // blade y is from the ground; the board stands 0.3 m off the wall on an iron bar
      const p = at(bl.face, bl.u, 0.3 + bl.w / 2), q = at(bl.face, bl.u, (0.3 + bl.w) / 2 + 0.02), L = 0.3 + bl.w;
      bladeSign(bits, p, bl.w, bl.h, bl.y, uv(j), uv(iron));
      boxPatch(bits, q.x, bl.y + bl.h + 0.05, q.z, p.nz ? 0.05 : L, 0.05, p.nz ? L : 0.05, uv(iron));
    }
    for (const face of ['front', 'side']) for (const u of (spec.barrels || {})[face] || []) {
      const p = at(face, u, 0.45);
      meshPatch(bits, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10), p.x, 0.45, p.z, uv(wood), 1, true);
    }
    pub.body = body; pub.bits = bits;
  }
  for (const pub of pubs) {
    const b = new Builder(pub.site);
    b.add(toGeometry(pub.body), mat);
    b.solid(0, 0, pub.spec.w, pub.spec.d);
    const g = b.build(pub.spec.name);
    const small = new Builder(pub.site);
    small.add(toGeometry(pub.bits), mat);
    const sg = small.build(pub.spec.name + ' details');
    sg.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // baskets and lanterns: shadows cost for nothing
    groups.push(g, sg);
  }
  mat.map.needsUpdate = true; mat.emissiveMap.needsUpdate = true;
  return {
    groups, material: mat, ms: Math.round(performance.now() - t0), paintMs, atlas: `${ATLAS}x${H}`,
    setNight(level) { mat.emissiveIntensity = 0.04 + (1.15 - 0.04) * level; },
  };
}

// index of a laid-out bay in the spec's bay list (layouts may be reversed for display)
function specIndex(shop, b) { return b.i; }

// a sloping blind over a bay on the front face: from the wall at y down and out; valance at its lip
function awning(out, x0, x1, y, z, r, rv) {
  const out1 = 1.15, drop = 0.75;
  quad(out, [x0, y - drop, z + out1], [x1, y - drop, z + out1], [x1, y, z], [x0, y, z], r);
  quad(out, [x0, y - drop - 0.3, z + out1], [x1, y - drop - 0.3, z + out1], [x1, y - drop, z + out1], [x0, y - drop, z + out1], rv);
  quad(out, [x1, y - drop, z + out1], [x0, y - drop, z + out1], [x0, y, z], [x1, y, z], r); // underside
}
function awningSide(out, x, cs, za, zb, y, r, rv) {
  const o = cs * 1.15, drop = 0.75;
  const A = cs === 1 ? [za, zb] : [za, zb];
  quad(out, [x + o, y - drop, A[0]], [x + o, y - drop, A[1]], [x, y, A[1]], [x, y, A[0]], r);
  quad(out, [x + o, y - drop - 0.3, A[0]], [x + o, y - drop - 0.3, A[1]], [x + o, y - drop, A[1]], [x + o, y - drop, A[0]], rv);
  quad(out, [x + o, y - drop, A[1]], [x + o, y - drop, A[0]], [x, y, A[0]], [x, y, A[1]], r);
}
// a double-sided blade sign standing out from the wall at p (its centre), facing along the wall
function bladeSign(out, p, w, h, y, r, edge) {
  const t = 0.05;
  if (p.nz) {
    // front face: the board spans x (out from the wall is +z): faces point along +-x... the board plane holds z and y
    const z0 = p.z - w / 2, z1 = p.z + w / 2;
    quad(out, [p.x + t, y, z1], [p.x + t, y, z0], [p.x + t, y + h, z0], [p.x + t, y + h, z1], r);
    quad(out, [p.x - t, y, z0], [p.x - t, y, z1], [p.x - t, y + h, z1], [p.x - t, y + h, z0], r);
  } else {
    const x0 = p.x - w / 2, x1 = p.x + w / 2;
    quad(out, [x0, y, p.z + t], [x1, y, p.z + t], [x1, y + h, p.z + t], [x0, y + h, p.z + t], r);
    quad(out, [x1, y, p.z - t], [x0, y, p.z - t], [x0, y + h, p.z - t], [x1, y + h, p.z - t], r);
  }
  boxPatch(out, p.x, y + h, p.z, p.nz ? 2 * t : w, 0.04, p.nz ? w : 2 * t, edge);
  boxPatch(out, p.x, y - 0.04, p.z, p.nz ? 2 * t : w, 0.04, p.nz ? w : 2 * t, edge);
}
