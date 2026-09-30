// Frame cost of Áras an Uachtaráin and Dublin Zoo (src/world/aras-zoo.js, docs/research/aras-zoo.md): at the two Places
// views and a spot on Chesterfield Avenue, the GPU time, draw calls and triangles with the additions shown and hidden,
// alternating, in one session (low tier, dpr 1 unless GFX=high). The tree clearing for the vista can't be toggled.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMES = ['Áras and zoo (batched)', 'Áras an Uachtaráin and Dublin Zoo', 'Dublin Zoo ground', 'Dublin Zoo animals'];
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
    d.gpuTimes = []; d.frameInfo = { calls: 0, tris: 0 };
    const info = d.renderer.info; info.autoReset = false;
    let frame = 0;
    const tick = () => { d.frameInfo = { calls: info.render.calls, tris: info.render.triangles }; info.reset(); frame++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [], sums = new Map();
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([q, frame]);
      while (pending.length && gl.getQueryParameter(pending[0][0], gl.QUERY_RESULT_AVAILABLE)) {
        const [pq, f] = pending.shift(); sums.set(f, (sums.get(f) || 0) + gl.getQueryParameter(pq, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(pq);
        for (const [k, v] of sums) if (k < f) { d.gpuTimes.push(v); sums.delete(k); }
      } };
  }, gfx === 'saver' ? 'low' : gfx);
  const found = await page.evaluate((names) => { let n = 0; window.__dublin.scene.traverse((o) => { if (names.includes(o.name)) n++; }); return n; }, NAMES);
  console.log('ARASPERF objects found', found);
  const spots = [['view-aras', 'aras'], ['view-zoo', 'zoo'], ['chesterfield', null]];
  for (const [slug, key] of spots) {
    await page.evaluate(async (key) => {
      const d = window.__dublin;
      if (key) { d.teleportTo(key); return; }
      const { project } = await import('/src/world/geo.js');
      const p = project(53.35586, -6.3156), h = (300 * Math.PI) / 180; // Chesterfield Avenue at the zoo's west corner, outbound
      d.car.teleport(p.x, p.z, Math.atan2(Math.sin(h), -Math.cos(h))); d.rig.snap();
    }, key);
    await wait(2500);
    const res = { on: [], off: [], con: [], coff: [], ton: [], toff: [] };
    for (let k = 0; k < 6; k++) {
      const on = k % 2 === 0;
      await page.evaluate(([on, names]) => { window.__dublin.scene.traverse((o) => { if (names.includes(o.name)) o.visible = on; }); window.__dublin.gpuTimes = []; }, [on, NAMES]);
      await wait(1800);
      const g = await page.evaluate(() => { const d = window.__dublin, g = d.gpuTimes.slice().sort((a, b) => a - b); return { t: g.length ? g[Math.floor(g.length * 0.25)] : null, c: d.frameInfo.calls, tr: d.frameInfo.tris }; });
      res[on ? 'on' : 'off'].push(g.t); res[on ? 'con' : 'coff'].push(g.c); res[on ? 'ton' : 'toff'].push(g.tr);
    }
    const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(2) : null; };
    console.log('ARASPERF', gfx, slug.padEnd(14), 'shown', med(res.on), 'ms', med(res.con), 'calls', (med(res.ton) / 1e6).toFixed(3), 'Mtris |', 'hidden', med(res.off), 'ms', med(res.coff), 'calls', (med(res.toff) / 1e6).toFixed(3), 'Mtris (GPU p25, median of 3)');
  }
}
