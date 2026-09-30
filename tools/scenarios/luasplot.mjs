// Plan view of the Luas: the game's streets and tracks against the OSM tram ways and stops (data/osm/luas.json),
// all projected with the game's own project(). PLOTS="name:minLat,minLon,maxLat,maxLon[,labels];..." (labels=1 prints
// node ids). Default: the whole network, then close-ups.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT = [
  'all:53.3265,-6.3365,53.3690,-6.2185',
  'centre:53.3440,-6.2650,53.3545,-6.2540,1',
  'north:53.3500,-6.2880,53.3690,-6.2580,1',
  'south:53.3270,-6.2680,53.3460,-6.2540,1',
  'east:53.3460,-6.2560,53.3530,-6.2250,1',
  'west:53.3270,-6.3365,53.3500,-6.2640,1',
].join(';');
export default async function (page, shot) {
  await wait(2500);
  await page.setViewport({ width: +(process.env.PW || 2400), height: +(process.env.PH || 1500) });
  const plots = (process.env.PLOTS || DEFAULT).split(';').filter(Boolean);
  for (const pl of plots) {
    const [name, rest] = pl.split(':');
    const [la0, lo0, la1, lo1, labels] = rest.split(',');
    await page.evaluate(async (la0, lo0, la1, lo1, labels) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const osm = await (await fetch('/data/osm/luas.json')).json();
      let cv = document.getElementById('luasplot');
      if (!cv) { cv = document.createElement('canvas'); cv.id = 'luasplot'; cv.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1b2229'; document.body.appendChild(cv); }
      const W = cv.width = innerWidth, H = cv.height = innerHeight;
      cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#1b2229'; ctx.fillRect(0, 0, W, H);
      const a = project(+la1, +lo0), b = project(+la0, +lo1); // NW, SE
      const sc = Math.min(W / (b.x - a.x), H / (b.z - a.z));
      const T = (p) => [(p.x - a.x) * sc, (p.z - a.z) * sc];
      const line = (pts) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = T(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
      // city limit
      const B = d.world.bounds; { const [x0, y0] = T({ x: B.minX, z: B.minZ }), [x1, y1] = T({ x: B.maxX, z: B.maxZ }); ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]); }
      ctx.fillStyle = '#1c4f6e'; line(d.world.riverPoly); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const w of d.world.ways) { line(w.pts); ctx.strokeStyle = w.bridge ? '#6d7f8c' : '#4a545d'; ctx.lineWidth = Math.max(1.5, w.width * sc); ctx.stroke(); }
      // O'Connell St islands, if exposed
      // OSM tram ways
      for (const e of osm.elements) {
        if (e.type !== 'way' || e.tags.railway !== 'tram') continue;
        line(e.geometry.map((g) => project(g.lat, g.lon)));
        ctx.strokeStyle = /Green|Cross City/.test(e.tags.name || '') ? '#36d17a' : /Red/.test(e.tags.name || '') ? '#ff4d4d' : '#999'; ctx.lineWidth = 2; ctx.stroke();
      }
      // game track: each rendered single track
      for (const l of d.world.luasLines) for (const t of l.tracks || [l.pts]) { line(t); ctx.strokeStyle = 'rgba(230,120,255,0.95)'; ctx.lineWidth = 2; ctx.stroke(); }
      // OSM stops
      ctx.font = `${Math.round(20)}px sans-serif`;
      const seen = new Set();
      for (const e of osm.elements) {
        if (e.type !== 'node' || !e.tags || e.tags.railway !== 'tram_stop') continue;
        const [x, y] = T(project(e.lat, e.lon)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
        if (!seen.has(e.tags.name)) { seen.add(e.tags.name); ctx.fillStyle = '#ffe28a'; ctx.fillText(e.tags.name, x + 8, y - 8); }
      }
      // game stops
      for (const l of d.world.luasLines) for (const s of Object.values(l.legs || {}).flatMap((g) => g.stops)) { const [x, y] = T(s); ctx.strokeStyle = '#ff9df5'; ctx.lineWidth = 3; ctx.strokeRect(x - 7, y - 7, 14, 14); }
      // trams
      if (d.tram.trams) for (const t of d.tram.trams) for (const c of t.carriages) { const [x, y] = T(c); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      if (+labels) {
        ctx.font = '15px monospace'; ctx.fillStyle = '#9fd3ff';
        const [x0, y0] = [0, 0];
        for (const n of d.world.nodes.values()) { const [x, y] = T(n); if (x < x0 || y < y0 || x > W || y > H) continue; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillText(n.id, x + 4, y + 12); }
      }
      // scale bar: 100 game m
      ctx.fillStyle = '#fff'; ctx.fillRect(20, H - 30, 100 * sc, 6); ctx.font = '20px sans-serif'; ctx.fillText('100 game m', 20, H - 40);
    }, la0, lo0, la1, lo1, labels);
    await wait(300); await shot(`plot-${name}`);
  }
}
