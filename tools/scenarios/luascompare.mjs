// docs/research/luas-compare.png: the real Luas (OSM tram ways and stops, data/osm/luas.json, drawn in the game's own
// projection) beside the game's tracks and stops. Top: the whole map; bottom: the city-centre loop.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(2500);
  await page.setViewport({ width: 2400, height: 1900 });
  await page.evaluate(async () => {
    const d = window.__dublin, { project } = await import('/src/world/geo.js');
    const osm = await (await fetch('/data/osm/luas.json')).json();
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;z-index:99999';
    document.body.appendChild(cv);
    const W = cv.width = innerWidth, H = cv.height = innerHeight; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#141b21'; ctx.fillRect(0, 0, W, H);
    const RED = '#e03a3a', GREEN = '#1fbf5f';
    const osmColour = (e) => (/Green|Cross City/.test(e.tags.name || '') ? GREEN : /Red/.test(e.tags.name || '') ? RED : null);
    const stopsOSM = new Map();
    for (const e of osm.elements) if (e.type === 'node' && e.tags && e.tags.railway === 'tram_stop' && !stopsOSM.has(e.tags.name)) stopsOSM.set(e.tags.name, project(e.lat, e.lon));
    function panel(x0, y0, pw, ph, box, real, title, labels) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, pw, ph); ctx.clip();
      ctx.fillStyle = '#1b2229'; ctx.fillRect(x0, y0, pw, ph);
      const a = project(box[2], box[1]), b = project(box[0], box[3]);
      const sc = Math.min(pw / (b.x - a.x), ph / (b.z - a.z));
      const T = (p) => [x0 + (p.x - a.x) * sc, y0 + (p.z - a.z) * sc];
      const line = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = T(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
      ctx.fillStyle = '#1c4f6e'; line(d.world.riverPoly); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const w of d.world.ways) { line(w.pts); ctx.strokeStyle = '#3a444d'; ctx.lineWidth = Math.max(1, w.width * sc * 0.8); ctx.stroke(); }
      const B = d.world.bounds; { const [p, q] = T({ x: B.minX, z: B.minZ }), [r, s] = T({ x: B.maxX, z: B.maxZ }); ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]); ctx.strokeRect(p, q, r - p, s - q); ctx.setLineDash([]); }
      const lw = Math.max(2.5, 1.8 * sc);
      if (real) {
        for (const e of osm.elements) { if (e.type !== 'way' || e.tags.railway !== 'tram' || e.tags.service === 'yard') continue; const c = osmColour(e); if (!c) continue; line(e.geometry.map((g) => project(g.lat, g.lon))); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke(); }
      } else {
        for (const l of d.world.luasLines) for (const t of l.tracks) { line(t); ctx.strokeStyle = /Green/.test(l.name) ? GREEN : RED; ctx.lineWidth = lw; ctx.stroke(); }
      }
      // stops
      const list = real ? [...stopsOSM.entries()].map(([name, p]) => ({ name, ...p }))
        : d.world.luasLines.flatMap((l) => Object.values(l.legs).flatMap((g) => g.stops.map((s) => ({ name: s.name, x: s.x, z: s.z }))));
      ctx.font = `${labels ? 19 : 15}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
      const drawn = new Set();
      for (const s of list) {
        const [x, y] = T(s); if (x < x0 || x > x0 + pw || y < y0 || y > y0 + ph) continue;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#141b21'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, labels ? 6 : 4.5, 0, 7); ctx.fill(); ctx.stroke();
        if (drawn.has(s.name)) continue; drawn.add(s.name);
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,27,33,0.9)'; ctx.strokeText(s.name, x + 9, y - 9); ctx.fillStyle = '#f1f3f5'; ctx.fillText(s.name, x + 9, y - 9);
      }
      ctx.restore();
      ctx.fillStyle = '#f1f3f5'; ctx.font = 'bold 28px system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.fillText(title, x0 + 16, y0 + 14);
      ctx.strokeStyle = '#55606a'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, pw, ph);
    }
    const all = [53.3262, -6.3370, 53.3700, -6.2180], centre = [53.3440, -6.2660, 53.3545, -6.2470];
    const gap = 16, pw = (W - 3 * gap) / 2;
    panel(gap, gap, pw, 760, all, true, 'The real Luas (OpenStreetMap, in the game\'s projection)', false);
    panel(2 * gap + pw, gap, pw, 760, all, false, 'In the game', false);
    panel(gap, 760 + 2 * gap, pw, H - 760 - 3 * gap, centre, true, 'City centre: real', true);
    panel(2 * gap + pw, 760 + 2 * gap, pw, H - 760 - 3 * gap, centre, false, 'City centre: game', true);
  });
  await wait(300); await shot('luas-compare');
}
