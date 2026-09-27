const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await page.evaluate(() => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const orig = d.renderer.render.bind(d.renderer); const pending = []; d.gpu = [];
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpu.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6); };
  });
  const measure = async (label, setup) => {
    if (setup) await page.evaluate(setup);
    await wait(1500); await page.evaluate(() => { window.__dublin.gpu = []; }); await wait(2000);
    const r = await page.evaluate(() => { const g = window.__dublin.gpu.slice().sort((a, b) => a - b); return g[Math.floor(g.length / 2)]; });
    console.log(label.padEnd(24), 'GPU ms', r.toFixed(2));
  };
  await measure('radius 4 (current)');
  await measure('radius 2', '(() => { const s = window.__dublin.atmosphere.sun; s.shadow.radius = 2; })()');
  await measure('radius 1', '(() => { const s = window.__dublin.atmosphere.sun; s.shadow.radius = 1; })()');
  await measure('shadow map 1024', '(() => { const s = window.__dublin.atmosphere.sun; s.shadow.radius = 2; s.shadow.mapSize.set(1024, 1024); s.shadow.map.dispose(); s.shadow.map = null; })()');
  await measure('evening (lights on)', "(() => { window.__dublin.actions.evening(); })()");
}
