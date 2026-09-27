// Full-screen city map in a GTA-style dark theme: the playable area is lit, everything outside the city limit is
// dimmed and hatched. Landmarks are icons (tap one to see its name and drive there); a legend explains the symbols.
// Pan by dragging, zoom with the wheel / pinch / buttons. Tap a street to set a waypoint.
import { world } from '../world/geo.js';
import { parkPolys, campusPolys } from '../world/ground.js';

const B = world.bounds;
const C = {
  void: '#0a1219', outside: '#141f28', hatch: 'rgba(255,255,255,0.035)', land: '#2c3843', block: '#25303a',
  landmark: '#4a4236', park: '#2e5a3a', campus: '#34503d', water: '#1c4f6e', waterEdge: '#2b6a8e',
  road: '#9aa3ab', main: '#d8dce0', limit: '#e8c547', luas: '#b05bd8', text: '#e9edf0', halo: 'rgba(8,14,20,0.9)',
  district: 'rgba(233,237,240,0.42)', icon: '#f2b632', you: '#ffffff', waypoint: '#e04ce0',
};
const MAIN = new Set(['boulevard', 'primary', 'quay', 'bridge']);
// district names, anchored at nodes (GTA-style faint capitals)
const DISTRICTS = [
  ['SMITHFIELD', 'CHS1'], ['NORTH CITY', 'OC3'], ['DOCKLANDS', 'MY1'], ['TEMPLE BAR', 'TBQ'],
  ['THE LIBERTIES', 'NI1'], ['TRINITY', 'NS2', 0, -40], ['GRAFTON QUARTER', 'GR2', -60], ['MERRION', 'MSNE', -60, 20],
];
// short icon glyphs for each landmark
const GLYPH = { spire: 'S', gpo: 'P', oconnellBridge: 'B', hapenny: 'H', trinity: 'T', bankOfIreland: '£', christChurch: '✚', customHouse: 'C', stephensGreen: '♣' };

export function createWorldMap({ sites, lots, getLive, onTeleport, onWaypoint }) {
  const root = document.createElement('div');
  root.className = 'worldmap';
  root.hidden = true;
  root.innerHTML = `
    <canvas></canvas>
    <div class="wm-title">DUBLIN<small>Playable city centre</small></div>
    <div class="wm-controls">
      <button data-z="close" aria-label="Close map" title="Close (M)">&times;</button>
      <button data-z="in" aria-label="Zoom in">+</button>
      <button data-z="out" aria-label="Zoom out">&minus;</button>
      <button data-z="me" aria-label="Centre on me" title="Centre on me">&#9678;</button>
      <button data-z="fit" aria-label="Whole city" title="Whole city">&#10530;</button>
    </div>
    <div class="wm-card" hidden></div>
    <details class="wm-legend" open>
      <summary>Legend</summary>
      <ul>
        <li><i class="lg-you"></i>You</li>
        <li><i class="lg-icon">S</i>Landmark (tap for name)</li>
        <li><i class="lg-way"></i>Waypoint (tap a street)</li>
        <li><i class="lg-blip"></i>Mission target</li>
        <li><i class="lg-line lg-main"></i>Main road</li>
        <li><i class="lg-line lg-luas"></i>Luas Red Line</li>
        <li><i class="lg-swatch lg-park"></i>Park</li>
        <li><i class="lg-swatch lg-water"></i>River Liffey</li>
        <li><i class="lg-line lg-limit"></i>City limit</li>
      </ul>
    </details>`;
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const card = root.querySelector('.wm-card');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let scale = 1, cx = 0, cz = 0;
  let icons = [], selected = null, waypoint = null, timer = 0;

  const toS = (x, z) => [(x - cx) * scale + W / 2, (z - cz) * scale + H / 2];
  const toW = (sx, sy) => ({ x: (sx - W / 2) / scale + cx, z: (sy - H / 2) / scale + cz });
  const minScale = () => Math.min(W / B.w, H / B.h) * 0.9;
  const fit = () => { scale = minScale(); cx = B.minX + B.w / 2; cz = B.minZ + B.h / 2; };
  const clampView = () => {
    scale = Math.max(minScale() * 0.9, Math.min(8, scale));
    cx = Math.max(B.minX, Math.min(B.maxX, cx)); cz = Math.max(B.minZ, Math.min(B.maxZ, cz));
  };
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth; H = root.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  }
  const path = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = toS(p.x, p.z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); if (close) ctx.closePath(); };
  const rect = (r) => {
    const c = Math.cos(r.rot), s = Math.sin(r.rot), hx = r.w / 2, hz = r.d / 2;
    ctx.beginPath();
    [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].forEach(([lx, lz], i) => { const [x, y] = toS(r.x + lx * c + lz * s, r.z - lx * s + lz * c); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath();
  };

  function draw() {
    if (root.hidden) return;
    const live = getLive();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // outside the city limit: dark, hatched
    ctx.fillStyle = C.void; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.hatch; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -H; k < W; k += 14) { ctx.moveTo(k, 0); ctx.lineTo(k + H, H); }
    ctx.stroke();
    // playable area
    const [x0, y0] = toS(B.minX, B.minZ), [x1, y1] = toS(B.maxX, B.maxZ);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    ctx.fillStyle = C.land; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // blocks: building footprints, low contrast, so the city has texture without noise
    ctx.fillStyle = C.block;
    for (const L of lots) { rect(L); ctx.fill(); }
    for (const c of campusPolys) { path(c.poly, true); ctx.fillStyle = C.campus; ctx.fill(); }
    for (const p of parkPolys) { path(p.poly, true); ctx.fillStyle = C.park; ctx.fill(); }
    ctx.fillStyle = C.landmark;
    for (const s of Object.values(sites)) if (s.w && s.d && !s.bridge) { rect(s); ctx.fill(); }
    path(world.riverPoly, true); ctx.fillStyle = C.water; ctx.fill();
    ctx.strokeStyle = C.waterEdge; ctx.lineWidth = 1.5; ctx.stroke();
    // roads: minor, then main on top
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const w of world.ways) if (!MAIN.has(w.type)) { path(w.pts); ctx.strokeStyle = C.road; ctx.lineWidth = Math.max(1.2, w.width * scale * 0.8); ctx.stroke(); }
    for (const w of world.ways) if (MAIN.has(w.type)) { path(w.pts); ctx.strokeStyle = C.main; ctx.lineWidth = Math.max(2, w.width * scale * 0.85); ctx.stroke(); }
    ctx.setLineDash([5, 4]); path(world.luas.pts); ctx.strokeStyle = C.luas; ctx.lineWidth = 2.2; ctx.stroke(); ctx.setLineDash([]);
    districtLabels();
    if (scale > 1.5) streetLabels();
    ctx.restore();
    // city limit
    ctx.strokeStyle = C.limit; ctx.lineWidth = 2; ctx.setLineDash([10, 6]);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
    ctx.font = '700 10px system-ui, sans-serif'; ctx.fillStyle = C.limit; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    if (y0 > 16) ctx.fillText('CITY LIMIT', x0 + 4, y0 - 4);
    // tram, blips, waypoint, landmarks, player
    ctx.fillStyle = C.luas;
    for (const t of live.tram) { const [x, y] = toS(t.x, t.z); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
    for (const b of live.blips || []) { const [x, y] = toS(b.x, b.z); ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fillStyle = b.color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    if (waypoint) {
      const [x, y] = toS(waypoint.x, waypoint.z);
      ctx.fillStyle = C.waypoint; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y - 11); ctx.arc(x, y - 14, 7.5, Math.PI * 0.8, Math.PI * 2.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 14, 3, 0, 7); ctx.fill();
    }
    landmarkIcons();
    const [px, py] = toS(live.player.x, live.player.z);
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI - live.player.heading);
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8.5, 9); ctx.lineTo(0, 4.5); ctx.lineTo(-8.5, 9); ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
    ctx.fillStyle = C.you; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.restore();
    // scale bar
    const nice = [20, 50, 100, 200, 500].find((m) => m * scale > 60) || 500;
    ctx.fillStyle = 'rgba(233,237,240,0.8)'; ctx.fillRect(W - 20 - nice * scale, H - 22, nice * scale, 3);
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(`${nice} m`, W - 20, H - 27);
  }

  function districtLabels() {
    const size = Math.max(10, Math.min(15, 7 + scale * 4));
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.district;
    for (const [name, id, dx = 0, dz = 0] of DISTRICTS) {
      const n = world.nodes.get(id);
      if (!n) continue;
      const [x, y] = toS(n.x + dx, n.z + dz);
      ctx.save(); ctx.translate(x, y);
      ctx.fillText(name.split('').join(' '), 0, 0);
      ctx.restore();
    }
  }

  // main street names only, when zoomed in; one label per street, kept upright, no overlaps
  function streetLabels() {
    const placed = [], best = new Map();
    for (const w of world.ways) {
      if (!MAIN.has(w.type) || w.bridge) continue;
      for (let i = 0; i < w.pts.length - 1; i++) {
        const a = w.pts[i], b = w.pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
        if (!best.has(w.name) || L > best.get(w.name).L) best.set(w.name, { a, b, L });
      }
    }
    ctx.font = '600 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [name, s] of best) {
      const tw = ctx.measureText(name).width;
      if (s.L * scale < tw + 20) continue;
      const [ax, ay] = toS(s.a.x, s.a.z), [bx, by] = toS(s.b.x, s.b.z), mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (placed.some((p) => Math.hypot(p.x - mx, p.y - my) < (p.w + tw) / 2 + 10)) continue;
      placed.push({ x: mx, y: my, w: tw });
      let ang = Math.atan2(by - ay, bx - ax);
      if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
      ctx.lineWidth = 3; ctx.strokeStyle = C.halo; ctx.strokeText(name, 0, 0);
      ctx.fillStyle = C.text; ctx.fillText(name, 0, 0);
      ctx.restore();
    }
  }

  function landmarkIcons() {
    icons = [];
    const r = 11;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [key, s] of Object.entries(sites)) {
      const [x, y] = toS(s.x, s.z);
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
      ctx.fillStyle = key === selected ? '#ffffff' : C.icon; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#0d151c'; ctx.stroke();
      ctx.font = '800 11px system-ui, sans-serif'; ctx.fillStyle = '#0d151c';
      ctx.fillText(GLYPH[key] || s.name[0], x, y + 0.5);
      icons.push({ key, x, y, r: r + 6 });
    }
    if (selected) {
      const s = sites[selected];
      const [x, y] = toS(s.x, s.z);
      ctx.font = '700 12px system-ui, sans-serif';
      const tw = ctx.measureText(s.name).width + 16;
      ctx.fillStyle = 'rgba(8,14,20,0.9)'; ctx.beginPath(); ctx.roundRect(x - tw / 2, y - r - 28, tw, 20, 5); ctx.fill();
      ctx.fillStyle = C.text; ctx.fillText(s.name, x, y - r - 18);
    }
  }

  function showCard(key) {
    selected = key;
    if (!key) { card.hidden = true; return; }
    card.innerHTML = `<b>${sites[key].name}</b><button data-go="${key}">Drive there</button><button data-way="${key}">Set waypoint</button>`;
    card.hidden = false;
  }
  card.addEventListener('click', (e) => {
    const go = e.target.dataset.go, way = e.target.dataset.way;
    if (go) { api.close(); onTeleport(go); }
    if (way) { const s = sites[way]; const road = world.nearestRoad(s.x, s.z); waypoint = { x: road ? road.cx : s.x, z: road ? road.cz : s.z, name: s.name }; onWaypoint(waypoint); showCard(null); draw(); }
  });

  // ---- interaction
  const pointers = new Map();
  let dragStart = null, pinch = null, moved = false;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 1) dragStart = { x: e.clientX, y: e.clientY, cx, cz };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale }; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) { const [a, b] = [...pointers.values()]; scale = pinch.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d; moved = true; }
    else if (dragStart) {
      const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 5) moved = true;
      cx = dragStart.cx - dx / scale; cz = dragStart.cz - dy / scale;
    }
    clampView(); draw();
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (!moved) { const r = canvas.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); }
      dragStart = null;
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = toW(mx, my);
    scale *= Math.exp(-e.deltaY * 0.0015);
    clampView();
    const after = toW(mx, my);
    cx += before.x - after.x; cz += before.z - after.z;
    clampView(); draw();
  }, { passive: false });

  function tap(sx, sy) {
    const hit = icons.find((ic) => Math.hypot(ic.x - sx, ic.y - sy) < ic.r);
    if (hit) { showCard(hit.key); draw(); return; }
    showCard(null);
    const p = toW(sx, sy);
    const road = world.nearestRoad(p.x, p.z);
    if (!road || road.edgeDist > 10) { draw(); return; }
    waypoint = { x: road.cx, z: road.cz, name: road.way.name };
    onWaypoint(waypoint);
    draw();
  }
  root.querySelector('.wm-controls').addEventListener('click', (e) => {
    const z = e.target.closest('button')?.dataset.z;
    if (z === 'close') return api.close();
    if (z === 'in') scale *= 1.5;
    if (z === 'out') scale /= 1.5;
    if (z === 'fit') fit();
    if (z === 'me') { const p = getLive().player; cx = p.x; cz = p.z; scale = Math.max(scale, 2); }
    clampView(); draw();
  });
  window.addEventListener('resize', () => { if (!root.hidden) { resize(); clampView(); draw(); } });

  const api = {
    get isOpen() { return !root.hidden; },
    open() {
      root.hidden = false;
      resize();
      // open centred on the player, zoomed so a few blocks around are readable
      const p = getLive().player;
      scale = Math.max(minScale(), Math.min(W, H) / 380); cx = p.x; cz = p.z;
      clampView();
      root.querySelector('.wm-legend').open = W > 700 && !matchMedia('(pointer: coarse)').matches;
      showCard(null); draw();
      clearInterval(timer); timer = setInterval(draw, 250);
    },
    close() { root.hidden = true; clearInterval(timer); },
    toggle() { root.hidden ? api.open() : api.close(); },
    setWaypoint(p) { waypoint = p; },
  };
  return api;
}
