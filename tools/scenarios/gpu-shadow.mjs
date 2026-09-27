const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await page.keyboard.press('1'); await wait(1500);
  const r = await page.evaluate(async () => {
    const d = window.__dublin, R = d.renderer, gl = R.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const timeIt = async (fn, n = 40) => {
      const qs = [];
      for (let i = 0; i < n; i++) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); fn(); gl.endQuery(ext.TIME_ELAPSED_EXT); qs.push(q); await new Promise((res) => requestAnimationFrame(res)); }
      await new Promise((res) => setTimeout(res, 300));
      const v = qs.map((q) => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)].toFixed(2);
    };
    const noSh = await timeIt(() => { R.shadowMap.needsUpdate = false; R.render(d.scene, d.camera); });
    const withSh = await timeIt(() => { R.shadowMap.needsUpdate = true; R.render(d.scene, d.camera); });
    let casters = 0, tris = 0;
    return { noShadowUpdate: noSh, withShadowUpdate: withSh, calls: R.info.render.calls };
  });
  console.log(JSON.stringify(r));
}
