// GPU cost of named groups at one spot: median GPU ms with everything, then with each group hidden.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(7000);
  await page.evaluate(async () => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality('low', 1);
    d.gpuTimes = [];
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpuTimes.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6); };
    const { project } = await import('/src/world/geo.js');
    const p = project(53.34545, -6.2642), h = (270 * Math.PI) / 180;
    d.car.teleport(p.x, p.z, Math.atan2(Math.sin(h), -Math.cos(h))); d.rig.snap();
  });
  const groups = {
    'all': () => false,
    'dressing (festoons/baskets)': (o) => o.name === 'Temple Bar dressing',
    'hero landmarks (stone GLBs)': (o) => /Christ Church|St Patrick's Cathedral|Heuston Station/.test(o.name),
    'shadows off': null,
    'instanced (lamps, trees, props)': (o) => o.isInstancedMesh && !(o.geometry.attributes.aExtra),
    'buildings': (o) => o.name === 'buildings',
    'landmarks (Builder)': (o) => o.isGroup && o.children.length && o.children.every((c) => c.isMesh && !c.isInstancedMesh) && o.name && !/buildings|streets|ground/.test(o.name),
  };
  for (const [label, test] of Object.entries(groups)) {
    await page.evaluate((label, src) => {
      const d = window.__dublin;
      d.scene.traverse((o) => { if (o.userData.__hid) { o.visible = true; delete o.userData.__hid; } });
      d.renderer.shadowMap.enabled = label !== 'shadows off';
      if (src) { const f = eval(src); d.scene.traverse((o) => { if (o.visible && f(o)) { o.visible = false; o.userData.__hid = true; } }); }
    }, label, test ? test.toString() : null);
    await wait(1200);
    await page.evaluate(() => { window.__dublin.gpuTimes = []; });
    await fps(2500);
    const r = await page.evaluate(() => { const d = window.__dublin, g = d.gpuTimes.slice().sort((a, b) => a - b); return { gpu: +g[g.length >> 1].toFixed(2), calls: d.renderer.info.render.calls }; });
    console.log('SPLIT', label.padEnd(34), `gpu ${r.gpu} ms`, `calls ${r.calls}`);
  }
}
