// Full-screen world map: vector layers (land, parks, river, building footprints, roads, Luas), street names,
// landmark pins and live traffic. Pan / zoom with mouse or touch. Click a landmark to go there, or anywhere
// else to drop a waypoint.
import { world } from '../world/geo.js';
import { parkPolys, campusPolys } from '../world/ground.js';

const B = world.bounds;
const C = {
  outside: '#cfcac1', land: '#ece8df', building: '#d9d3c8', landmark: '#c7b48f', park: '#c9e0b1', campus: '#d6e6c3',
  water: '#a8cde0', casing: '#b9b1a3', road: '#ffffff', main: '#fbe7a1', mainCasing: '#d7b95d', lane: '#f3efe6',
  luas: '#7b3fa0', text: '#3b3a36', halo: 'rgba(255,255,255,0.9)',
};
const MAIN = new Set(['boulevard', 'primary', 'quay', 'bridge']);

export function createWorldMap({ sites, lots, getLive, onTeleport, onWaypoint }) {
  const root = document.createElement('div');
  root.className = 'worldmap';
  root.hidden = true;
  root.innerHTML = `
    <canvas></canvas>
    <header>
      <h2>Dublin</h2>
      <p>Click a landmark to go there, or anywhere on the streets to set a waypoint. Scroll or pinch to zoom.</p>
      <div class="wm-buttons">
        <button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">&minus;</button>
        <button data-z="me">Centre on me</button><button data-z="fit">Whole city</button>
        <button data-z="clear">Clear waypoint</button>
        <button class="close" aria-label="Close map">&times;</button>
      </div>
    </header>`;
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let scale = 1, cx = 0, cz = 0; // CSS px per metre, world point at the centre
  let hits = [];
  let waypoint = null;
  let timer = 0;

  const toS = (x, z) => [(x - cx) * scale + W / 2, (z - cz) * scale + H / 2];
  const toW = (sx, sy) => ({ x: (sx - W / 2) / scale + cx, z: (sy - H / 2) / scale + cz });
  const fit = () => { scale = Math.min(W / B.w, H / B.h) * 0.94; cx = B.minX + B.w / 2; cz = B.minZ + B.h / 2; };
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth; H = root.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  }

  const poly = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = toS(p.x, p.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
  const line = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = toS(p.x, p.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };

  function draw() {
    if (root.hidden) return;
    const live = getLive();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.outside; ctx.fillRect(0, 0, W, H);
    const [x0, y0] = toS(B.minX, B.minZ), [x1, y1] = toS(B.maxX, B.maxZ);
    ctx.fillStyle = C.land; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (const c of campusPolys) { poly(c.poly); ctx.fillStyle = C.campus; ctx.fill(); }
    for (const p of parkPolys) { poly(p.poly); ctx.fillStyle = C.park; ctx.fill(); }
    poly(world.riverPoly); ctx.fillStyle = C.water; ctx.fill();
    // building footprints
    ctx.fillStyle = C.building;
    for (const L of lots) {
      const c = Math.cos(L.rot), s = Math.sin(L.rot), hx = L.w / 2, hz = L.d / 2;
      ctx.beginPath();
      [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].forEach(([lx, lz], i) => { const [sx, sy] = toS(L.x + lx * c + lz * s, L.z - lx * s + lz * c); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      ctx.fill();
    }
    ctx.fillStyle = C.landmark;
    for (const s of Object.values(sites)) {
      if (!s.w || !s.d || s.bridge) continue;
      const c = Math.cos(s.rot), sn = Math.sin(s.rot), hx = s.w / 2, hz = s.d / 2;
      ctx.beginPath();
      [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].forEach(([lx, lz], i) => { const [sx, sy] = toS(s.x + lx * c + lz * sn, s.z - lx * sn + lz * c); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      ctx.fill();
    }
    // roads: casings, then fills (lanes, streets, then main roads on top)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ways = world.ways.slice().sort((a, b) => (MAIN.has(a.type) ? 1 : 0) - (MAIN.has(b.type) ? 1 : 0));
    for (const w of ways) { line(w.pts); ctx.strokeStyle = MAIN.has(w.type) ? C.mainCasing : C.casing; ctx.lineWidth = Math.max(2.5, w.width * scale + 2); ctx.stroke(); }
    for (const w of ways) { line(w.pts); ctx.strokeStyle = w.type === 'lane' ? C.lane : MAIN.has(w.type) ? C.main : C.road; ctx.lineWidth = Math.max(1.5, w.width * scale); ctx.stroke(); }
    // Luas
    ctx.setLineDash([6, 4]); line(world.luas.pts); ctx.strokeStyle = C.luas; ctx.lineWidth = 2.5; ctx.stroke(); ctx.setLineDash([]);
    streetLabels();
    // live traffic and tram
    ctx.fillStyle = '#6b6f75';
    for (const v of live.traffic) { const [x, y] = toS(v.x, v.z); ctx.fillRect(x - 2, y - 2, 4, 4); }
    ctx.fillStyle = C.luas;
    for (const t of live.tram) { const [x, y] = toS(t.x, t.z); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
    // waypoint flag
    if (waypoint) {
      const [x, y] = toS(waypoint.x, waypoint.z);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 24); ctx.stroke();
      ctx.fillStyle = '#ff883e'; ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x + 16, y - 19); ctx.lineTo(x, y - 13); ctx.fill();
    }
    for (const b of live.blips || []) {
      const [x, y] = toS(b.x, b.z);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = b.color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    landmarkPins();
    // player
    const [px, py] = toS(live.player.x, live.player.z);
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI - live.player.heading);
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 9); ctx.lineTo(0, 5); ctx.lineTo(-8, 9); ctx.closePath();
    ctx.fillStyle = '#ff883e'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
    // scale bar
    const nice = [20, 50, 100, 200, 500, 1000].find((m) => m * scale > 70) || 1000;
    ctx.fillStyle = C.text; ctx.fillRect(20, H - 30, nice * scale, 4);
    ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${nice} m (game scale)`, 20, H - 38);
  }

  // one label per street, on its longest segment that fits, kept upright
  function streetLabels() {
    const placed = [];
    const byName = new Map();
    for (const w of world.ways) {
      if (w.bridge && scale < 1.2) continue;
      for (let i = 0; i < w.pts.length - 1; i++) {
        const a = w.pts[i], b = w.pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
        const cur = byName.get(w.name);
        if (!cur || L > cur.L) byName.set(w.name, { a, b, L, main: MAIN.has(w.type) });
      }
    }
    const size = Math.max(10, Math.min(14, 8 + scale * 3));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [name, s] of [...byName].sort((p, q) => (q[1].main - p[1].main) || (q[1].L - p[1].L))) {
      ctx.font = `${s.main ? 600 : 500} ${size}px system-ui, sans-serif`;
      const tw = ctx.measureText(name).width;
      if (s.L * scale < tw + 16) continue;
      const [ax, ay] = toS(s.a.x, s.a.z), [bx, by] = toS(s.b.x, s.b.z);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (mx < -50 || my < -50 || mx > W + 50 || my > H + 50) continue;
      if (placed.some((p) => Math.abs(p.x - mx) < (p.w + tw) / 2 && Math.abs(p.y - my) < size * 1.6)) continue;
      placed.push({ x: mx, y: my, w: tw });
      let ang = Math.atan2(by - ay, bx - ax);
      if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
      ctx.lineWidth = 3.5; ctx.strokeStyle = C.halo; ctx.strokeText(name, 0, 0);
      ctx.fillStyle = C.text; ctx.fillText(name, 0, 0);
      ctx.restore();
    }
  }

  function landmarkPins() {
    hits = [];
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '600 13px system-ui, sans-serif';
    for (const [key, s] of Object.entries(sites)) {
      const [x, y] = toS(s.x, s.z);
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fillStyle = '#169b62'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      const tw = ctx.measureText(s.name).width;
      const bx = x + 11, by = y - 11;
      ctx.fillStyle = 'rgba(18,40,30,0.88)';
      ctx.beginPath(); ctx.roundRect(bx, by, tw + 14, 22, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(s.name, bx + 7, by + 11.5);
      hits.push({ key, x0: x - 9, y0: by, x1: bx + tw + 14, y1: by + 22 });
    }
  }

  // ---- interaction ----
  const pointers = new Map();
  let dragStart = null, pinch = null, moved = false;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 1) dragStart = { x: e.clientX, y: e.clientY, cx, cz };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      scale = Math.max(0.3, Math.min(8, pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
      moved = true; draw();
    } else if (dragStart) {
      const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 4) moved = true;
      cx = dragStart.cx - dx / scale; cz = dragStart.cz - dy / scale;
      draw();
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (!moved) click(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
      dragStart = null;
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = toW(mx, my);
    scale = Math.max(0.3, Math.min(8, scale * Math.exp(-e.deltaY * 0.0015)));
    const after = toW(mx, my);
    cx += before.x - after.x; cz += before.z - after.z;
    draw();
  }, { passive: false });

  function click(sx, sy) {
    const h = hits.find((t) => sx >= t.x0 && sx <= t.x1 && sy >= t.y0 && sy <= t.y1);
    if (h) { api.close(); onTeleport(h.key); return; }
    const p = toW(sx, sy);
    const road = world.nearestRoad(p.x, p.z);
    if (!road || road.edgeDist > 12) return;
    waypoint = { x: road.cx, z: road.cz, name: road.way.name };
    onWaypoint(waypoint);
    draw();
  }
  root.querySelector('.wm-buttons').addEventListener('click', (e) => {
    const z = e.target.dataset.z;
    if (e.target.classList.contains('close')) return api.close();
    if (z === 'in' || z === 'out') scale = Math.max(0.3, Math.min(8, scale * (z === 'in' ? 1.4 : 1 / 1.4)));
    if (z === 'fit') fit();
    if (z === 'me') { const p = getLive().player; cx = p.x; cz = p.z; scale = Math.max(scale, 2); }
    if (z === 'clear') { waypoint = null; onWaypoint(null); }
    draw();
  });
  window.addEventListener('resize', () => { if (!root.hidden) { resize(); draw(); } });

  const api = {
    get isOpen() { return !root.hidden; },
    open() {
      root.hidden = false;
      resize(); fit(); draw();
      clearInterval(timer); timer = setInterval(draw, 250);
    },
    close() { root.hidden = true; clearInterval(timer); },
    toggle() { root.hidden ? api.open() : api.close(); },
    setWaypoint(p) { waypoint = p; },
  };
  return api;
}
