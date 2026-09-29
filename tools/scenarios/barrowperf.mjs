// Frame cost of the Barrow Street hero (src/world/barrowst.js): at a few spots, the GPU time with the hero shown and
// hidden, alternating, in one session (low tier, dpr 1 unless GFX=high). docs/research/barrow-street.md.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SPOTS = [
  ['barrow-st', 53.3386, -6.2368, 8], ['macmahon-bridge', 53.34238, -6.2385, 150], ['gcq-corner', 53.3424, -6.2389, 5],
];
export default async function (page) {
  const gfx = process.env.GFX || 'low';
  if (gfx !== 'low') {
    await page.evaluate((g) => localStorage.setItem('dublin.gfx', JSON.stringify(g)), gfx);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__dublin && window.__dublin.ready !== false, { timeout: 180000 });
  }
  await wait(8000);
  await page.evaluate((tier) => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality(tier, 1);
    d.gpuTimes = [];
    if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    let acc = 0, frame = 0;
    const tick = () => { frame++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const sums = new Map();
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([q, frame]);
      while (pending.length && gl.getQueryParameter(pending[0][0], gl.QUERY_RESULT_AVAILABLE)) {
        const [pq, f] = pending.shift(); sums.set(f, (sums.get(f) || 0) + gl.getQueryParameter(pq, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(pq);
        for (const [k, v] of sums) if (k < f) { d.gpuTimes.push(v); sums.delete(k); }
      } };
    void acc;
  }, gfx === 'saver' ? 'low' : gfx);
  const hero = () => page.evaluate(() => { let g = null; window.__dublin.scene.traverse((o) => { if (o.name === 'Barrow Street' || o.name === 'quay bollards') g = g || []; if (o.name === 'Barrow Street' || o.name === 'quay bollards') g.push(o); }); return !!g; });
  if (!(await hero())) { console.log('BARROWPERF no hero in the scene'); return; }
  for (const [slug, lat, lon, hdg] of SPOTS) {
    await page.evaluate(async ([lat, lon, hdg]) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const p = project(lat, lon), h = (hdg * Math.PI) / 180;
      d.car.teleport(p.x, p.z, Math.atan2(Math.sin(h), -Math.cos(h))); d.rig.snap();
    }, [lat, lon, hdg]);
    await wait(2500);
    const res = { on: [], off: [] };
    for (let k = 0; k < 6; k++) {
      const on = k % 2 === 0;
      await page.evaluate((on) => { window.__dublin.scene.traverse((o) => { if (o.name === 'Barrow Street' || o.name === 'quay bollards') o.visible = on; }); window.__dublin.gpuTimes = []; }, on);
      await wait(1800);
      const g = await page.evaluate(() => { const g = window.__dublin.gpuTimes.slice().sort((a, b) => a - b); return g.length ? g[Math.floor(g.length * 0.25)] : null; });
      res[on ? 'on' : 'off'].push(g);
    }
    const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(2) : null; };
    console.log('BARROWPERF', gfx, slug.padEnd(16), 'hero shown', med(res.on), 'ms', ' hidden', med(res.off), 'ms (GPU, p25 of each window, median of 3)');
  }
}
