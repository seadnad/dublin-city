// Meeting House Square (docs/research/temple-bar-v2.md, hotspots-green-templebar-dame.md 2.2): the flagged square
// behind Eustace Street with its chequered paving and four tall umbrella masts, The Ark's copper-clad stage curtain on
// the east side, the Gallery of Photography's grid of square windows on the south, and on Eustace Street The Ark's
// brick front and the Irish Film Institute's Georgian doorcase under its blue neon. The Saturday food market fills the
// square by day (striped stalls, the umbrellas open); after dark the stalls are packed away and the umbrellas furled.
// Sites: sites.js extraSites.meetingHouse / mhArk / mhIfi / mhGallery (reserved, so the filler keeps out).
import * as THREE from 'three';
import { extraSites } from './sites.js';
import { LITE } from '../render/quality.js';

const PX = LITE ? 16 : 32;
function paint(wM, hM, draw) {
  const c = document.createElement('canvas'), g = document.createElement('canvas');
  c.width = g.width = Math.ceil(wM * PX); c.height = g.height = Math.ceil(hM * PX);
  const cx = c.getContext('2d'), gx = g.getContext('2d');
  gx.fillStyle = '#000'; gx.fillRect(0, 0, g.width, g.height);
  draw(cx, gx, PX);
  const t = (cv) => { const x = new THREE.CanvasTexture(cv); x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 4; return x; };
  return { map: t(c), glow: t(g) };
}
const bricks = (ctx, x, y, w, h, base, k) => {
  ctx.fillStyle = base; ctx.fillRect(x * k, y * k, w * k, h * k);
  ctx.fillStyle = 'rgba(25,12,8,0.25)'; for (let yy = y + 0.15; yy < y + h; yy += 0.15) ctx.fillRect(x * k, yy * k, w * k, Math.max(1, 0.02 * k));
};
const sash = (ctx, gx, x, y, w, h, k, lit) => {
  ctx.fillStyle = '#f2efe6'; ctx.fillRect(x * k, y * k, w * k, h * k);
  ctx.fillStyle = '#26303a'; ctx.fillRect((x + 0.07) * k, (y + 0.07) * k, (w - 0.14) * k, (h - 0.14) * k);
  ctx.fillStyle = '#f2efe6'; ctx.fillRect(x * k, (y + h / 2 - 0.03) * k, w * k, 0.06 * k); ctx.fillRect((x + w / 2 - 0.02) * k, y * k, 0.04 * k, h * k);
  if (lit) { gx.fillStyle = 'rgba(255,200,130,0.8)'; gx.fillRect((x + 0.07) * k, (y + 0.07) * k, (w - 0.14) * k, (h - 0.14) * k); }
};
const letters = (ctx, str, x, y, px, font, color) => { ctx.font = `${font} ${px}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(str, x, y); };

export function buildMeetingHouse({ Builder, M }) {
  const S = extraSites, groups = [], mats = [];
  const lit = (tex, rough = 0.85) => { const m = new THREE.MeshStandardMaterial({ map: tex.map, emissive: 0xffffff, emissiveMap: tex.glow, emissiveIntensity: 0.02, roughness: rough }); mats.push(m); return m; };
  // the square itself: granite flags wall to wall with the chequered panel in the middle, benches
  {
    const sq = S.meetingHouse, b = new Builder(sq);
    const floor = paint(sq.w, sq.d, (ctx, gx, k) => {
      ctx.fillStyle = '#a19e97'; ctx.fillRect(0, 0, sq.w * k, sq.d * k);
      for (let x = 0; x < sq.w; x += 0.9) for (let y = 0; y < sq.d; y += 0.6) { ctx.fillStyle = ((x * 7 + y * 13) % 3) < 1 ? '#9a978f' : '#a8a59d'; ctx.fillRect(x * k + 1, y * k + 1, 0.9 * k - 2, 0.6 * k - 2); }
      // the chequer: dark and pale granite squares
      for (let i = 0; i < 8; i++) for (let j = 0; j < 10; j++) { ctx.fillStyle = (i + j) % 2 ? '#5f5d58' : '#c9c5bb'; ctx.fillRect((sq.w / 2 - 4 + i) * k, (sq.d / 2 - 5 + j) * k, k, k); }
    });
    b.add(new THREE.PlaneGeometry(sq.w, sq.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floor.map, roughness: 0.8 }), { y: 0.03 });
    for (const [x, z] of [[-5.5, -6.5], [5.5, -6.5], [-5.5, 6.5], [5.5, 6.5]]) {
      b.box(1.8, 0.08, 0.55, M.timber, { x, y: 0.45, z });
      b.box(1.6, 0.45, 0.12, M.dark, { x, z });
      b.solid(x, z, 1.8, 0.55);
    }
    // the four umbrella masts: steel poles on granite plinths
    for (const [x, z] of [[-3.5, -4], [3.5, -4], [-3.5, 4], [3.5, 4]]) {
      b.cyl(0.14, 0.17, 7.6, M.steelMatte || M.dark, { x, z }, 10);
      b.cyl(0.35, 0.35, 0.3, M.granite, { x, z }, 10);
      b.solid(x, z, 0.5, 0.5);
    }
    groups.push(b.build('Meeting House Square'));
  }

  // The Ark on Eustace Street: three storeys of brick, the name over the door in bright letters; behind, onto the
  // square, the copper-framed curved stage curtain
  {
    const s = S.mhArk, b = new Builder(s), H = 12;
    const front = paint(s.w, H, (ctx, gx, k) => {
      bricks(ctx, 0, 0, s.w, H, '#7a4636', k);
      for (let f = 0; f < 3; f++) for (let i = 0; i < 3; i++) sash(ctx, gx, 1.3 + i * 3, 1.2 + f * 2.9, 1.2, 1.9, k, (f + i) % 2 === 0);
      ctx.fillStyle = '#e8e2d2'; ctx.fillRect(0, (H - 3.6) * k, s.w * k, 3.6 * k);
      ctx.fillStyle = '#2a3a52'; ctx.fillRect(3.6 * k, (H - 3.1) * k, 2.8 * k, 3.1 * k);
      gx.fillStyle = 'rgba(255,210,140,0.6)'; gx.fillRect(3.8 * k, (H - 2.9) * k, 2.4 * k, 2.2 * k);
      const word = 'THE ARK', cols = ['#e84a3a', '#f2b632', '#3aa0d8', '#e84a3a', '#5ab04a', '#f2b632', '#3aa0d8'];
      [...word].forEach((ch, i) => letters(ctx, ch, (2.4 + i * 0.85) * k, (H - 3.4) * k, 0.62 * k, 'bold', cols[i]));
      letters(gx, 'THE ARK', 5 * k, (H - 3.4) * k, 0.62 * k, 'bold', 'rgba(255,220,160,0.6)');
    });
    b.box(s.w, H, s.d - 0.2, M.stucco || M.granite, { z: -0.1 });
    b.add(new THREE.PlaneGeometry(s.w, H), lit(front), { y: H / 2, z: s.d / 2 + 0.02 });
    // the stage curtain: a copper-framed curved wall bowing out toward the square, the stage recess at its foot
    const copper = new THREE.MeshStandardMaterial({ color: 0x9c5b34, roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide });
    const arc = new THREE.CylinderGeometry(7, 7, 8.5, 20, 1, true, -0.62, 1.24).translate(0, 4.25, 0);
    b.add(arc, copper, { y: 0.6, z: -s.d / 2 + 5.4, ry: Math.PI });
    for (let k = -3; k <= 3; k++) b.box(0.08, 8.5, 0.08, M.dark, { x: 7 * Math.sin(k * 0.19), y: 0.6, z: -s.d / 2 + 5.4 - 7 * Math.cos(k * 0.19) - 0.05 });
    b.box(5.5, 3.1, 0.3, M.dark, { y: 0.6, z: -s.d / 2 - 1.45 });                         // the stage opening
    b.box(6.2, 0.6, 1.6, M.granite, { z: -s.d / 2 - 0.8 });                              // the stage apron
    b.solid(0, 0, s.w, s.d);
    groups.push(b.build('The Ark'));
  }

  // Irish Film Institute: the old Friends' Meeting House front, Georgian brick, a tall pedimented stone doorcase and
  // the institute's name in blue neon over it
  {
    const s = S.mhIfi, b = new Builder(s), H = 12.5;
    const front = paint(s.w, H, (ctx, gx, k) => {
      bricks(ctx, 0, 0, s.w, H, '#6e3d2e', k);
      for (let f = 0; f < 2; f++) for (const x of [0.7, 5.1]) sash(ctx, gx, x, 1.4 + f * 3.1, 1.2, 2.2, k, true);
      ctx.fillStyle = '#d9d3c4'; // the doorcase: pilasters, entablature, pediment
      ctx.fillRect(2.3 * k, (H - 5.2) * k, 2.4 * k, 5.2 * k);
      ctx.beginPath(); ctx.moveTo(2.0 * k, (H - 5.2) * k); ctx.lineTo(3.5 * k, (H - 6.3) * k); ctx.lineTo(5.0 * k, (H - 5.2) * k); ctx.fill();
      ctx.fillStyle = '#1b1f26'; ctx.fillRect(2.75 * k, (H - 4.4) * k, 1.5 * k, 4.4 * k);
      gx.fillStyle = 'rgba(255,215,160,0.7)'; gx.fillRect(2.8 * k, (H - 4.3) * k, 1.4 * k, 1.6 * k);
      ctx.fillStyle = '#10141c'; ctx.fillRect(0.4 * k, (H - 7.3) * k, (s.w - 0.8) * k, 0.8 * k);
      letters(ctx, 'IRISH FILM INSTITUTE', (s.w / 2) * k, (H - 6.9) * k, 0.42 * k, 'bold', '#58a8ff');
      letters(gx, 'IRISH FILM INSTITUTE', (s.w / 2) * k, (H - 6.9) * k, 0.42 * k, 'bold', '#3f8cff');
    });
    b.box(s.w, H, s.d - 0.2, M.stucco || M.granite, { z: -0.1 });
    b.add(new THREE.PlaneGeometry(s.w, H), lit(front), { y: H / 2, z: s.d / 2 + 0.02 });
    b.solid(0, 0, s.w, s.d);
    groups.push(b.build('Irish Film Institute'));
  }

  // Gallery of Photography: pale render, a grid of square windows, its name along the top of the ground floor
  {
    const s = S.mhGallery, b = new Builder(s), H = 11;
    const front = paint(s.w, H, (ctx, gx, k) => {
      ctx.fillStyle = '#d8d4ca'; ctx.fillRect(0, 0, s.w * k, H * k);
      for (let f = 0; f < 3; f++) for (let i = 0; i < 6; i++) {
        const x = 0.9 + i * 2.1, y = 0.9 + f * 2.6;
        ctx.fillStyle = '#2b3036'; ctx.fillRect(x * k, y * k, 1.4 * k, 1.4 * k);
        if ((f * 5 + i) % 3) { gx.fillStyle = 'rgba(235,235,255,0.55)'; gx.fillRect(x * k, y * k, 1.4 * k, 1.4 * k); }
      }
      ctx.fillStyle = '#1f2327'; ctx.fillRect(0.6 * k, (H - 3.4) * k, (s.w - 1.2) * k, 3.4 * k);
      gx.fillStyle = 'rgba(255,245,230,0.6)'; gx.fillRect(1 * k, (H - 3.0) * k, (s.w - 2) * k, 2.6 * k);
      letters(ctx, 'GALLERY OF PHOTOGRAPHY', (s.w / 2) * k, (H - 3.9) * k, 0.45 * k, '600', '#1f2327');
    });
    b.box(s.w, H, s.d - 0.2, M.stucco || M.granite, { z: -0.1 });
    b.add(new THREE.PlaneGeometry(s.w, H), lit(front, 0.7), { y: H / 2, z: s.d / 2 + 0.02 });
    b.solid(0, 0, s.w, s.d);
    groups.push(b.build('Gallery of Photography'));
  }

  // day and night pieces (not batched: they swap at dusk): the umbrellas open over the market stalls by day, furled
  // after dark
  const day = new THREE.Group(), night = new THREE.Group();
  {
    const sq = S.meetingHouse;
    const canvas = new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.9, side: THREE.DoubleSide });
    const db = new Builder(sq), nb = new Builder(sq);
    for (const [x, z] of [[-3.5, -4], [3.5, -4], [-3.5, 4], [3.5, 4]]) {
      // open: a shallow square canopy (an inverted pyramid of fabric), furled: a slim sleeve at the mast head
      db.add(new THREE.ConeGeometry(4.6, 1.2, 4, 1, true).rotateY(Math.PI / 4), canvas, { x, y: 7.1, z });
      nb.add(new THREE.CylinderGeometry(0.1, 0.35, 3.2, 8), canvas, { x, y: 4.6, z });
    }
    // the Saturday food market: striped gazebos over trestles of produce
    const stripes = ['#b3232a', '#1f5a3a', '#1b2f6a', '#c98a1a'].map((c) => {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const x = cv.getContext('2d');
      for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f4efe6' : c; x.fillRect(i * 8, 0, 8, 8); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide });
    });
    const produce = ['#d8452e', '#e8b43a', '#5a9a3c', '#8a4a2a', '#e8e0c8', '#b8244c'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
    let k = 0;
    for (const z of [-6, 0, 6]) for (const x of [-5, 0, 5]) {
      if (x === 0 && z === 0) continue;
      db.add(new THREE.ConeGeometry(1.75, 0.7, 4, 1, true).rotateY(Math.PI / 4), stripes[k % 4], { x, y: 2.75, z });
      for (const [px, pz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) db.box(0.05, 2.4, 0.05, M.dark, { x: x + px, z: z + pz });
      db.box(2.2, 0.08, 1.0, M.timber, { x, y: 0.85, z: z + 0.5 });
      for (let i = 0; i < 4; i++) db.box(0.45, 0.14, 0.7, produce[(k + i) % produce.length], { x: x - 0.75 + i * 0.5, y: 0.93, z: z + 0.5 });
      k++;
    }
    const dg = db.build('Meeting House Square market'), ng = nb.build('Meeting House Square umbrellas furled');
    for (const g of [dg, ng]) g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.dynamic = true; } });
    day.add(dg); night.add(ng); night.visible = false;
  }
  return {
    groups, dynamic: [day, night],
    setNight(level) {
      for (const m of mats) m.emissiveIntensity = 0.02 + 1.1 * level;
      day.visible = level < 0.5; night.visible = level >= 0.5;
    },
  };
}
