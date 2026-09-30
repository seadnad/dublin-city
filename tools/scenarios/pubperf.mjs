// Frame cost of the pubs (src/world/pubs.js): GPU time and draw calls with and without the pub meshes, standing at
// the Temple Bar (and the Long Hall with NIGHT=1). Also reports the kit's build time and atlas size.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await wait(5000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  const info = await page.evaluate(() => { const p = window.__dublin.landmarks.pubs; return { ms: p.ms, paint: p.paintMs, atlas: p.atlas }; });
  console.log('pub kit build', info.ms, 'ms (painting', info.paint, 'ms), atlas', info.atlas);
  const has = await page.evaluate(() => !!window.__dublin.renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2'));
  await page.evaluate((has) => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = has && gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const orig = d.renderer.render.bind(d.renderer);
    const pending = []; d.gpu = []; d.calls = [];
    d.renderer.info.autoReset = false;
    d.renderer.render = (s, c) => {
      let q = null;
      if (ext) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
      orig(s, c);
      if (ext) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); }
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpu.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6);
    };
    const tick = () => { d.calls.push(d.renderer.info.render.calls); d.renderer.info.reset(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, has);
  const measure = async (label) => {
    await wait(1200);
    await page.evaluate(() => { window.__dublin.gpu = []; window.__dublin.calls = []; });
    await wait(2500);
    const r = await page.evaluate(() => {
      const d = window.__dublin, g = d.gpu.slice().sort((a, b) => a - b), c = d.calls.slice().sort((a, b) => a - b);
      return { n: g.length, gpu: g[Math.floor(g.length / 2)], calls: c[Math.floor(c.length / 2)] };
    });
    console.log(label.padEnd(30), 'GPU ms median', r.gpu ? r.gpu.toFixed(2) : 'n/a', ' draw calls', r.calls, `(${r.n} frames)`);
  };
  const setPubs = (on) => page.evaluate((on) => { window.__dublin.scene.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'pubs') o.visible = on; }); }, on);
  for (const key of ['templeBar', 'longHall', 'bleedingHorse']) {
    await page.evaluate((k) => window.__dublin.teleportTo(k), key);
    await measure(`${key}: pubs on`);
    await setPubs(false); await measure(`${key}: pubs hidden`); await setPubs(true);
  }
  const n = await page.evaluate(() => { let n = 0, tris = 0; window.__dublin.scene.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'pubs') { n++; tris += o.geometry.attributes.position.count / 3; } }); return { n, tris }; });
  console.log('pub meshes after batching', n.n, 'triangles', n.tris);
}
