// Frame cost of the player car alone: GPU time with the car shown vs hidden, same spot (low tier, dpr 1).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(6000);
  await page.evaluate(() => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality('low', 1);
    d.gpuTimes = []; if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpuTimes.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6); };
    const A = d.world.nodes.get('SQ8'), B = d.world.nodes.get('WM1');
    const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L;
    d.car.teleport(A.x + dx * L * 0.45 + dz * 3, A.z + dz * L * 0.45 - dx * 3, Math.atan2(dx, dz)); d.rig.snap();
  });
  const measure = async (label, show, night) => {
    await page.evaluate((show) => { window.__dublin.carMesh().visible = show; }, show);
    await wait(1200);
    await page.evaluate(() => { window.__dublin.gpuTimes = []; });
    const f = await fps(3000);
    const r = await page.evaluate(() => { const d = window.__dublin, g = d.gpuTimes.slice().sort((a, b) => a - b); return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: d.renderer.info.render.calls }; });
    console.log('PERF', label.padEnd(22), `${f} fps`, `gpu ${r.gpu} ms`, `calls ${r.calls}`);
  };
  await measure('day car', true); await measure('day no car', false);
  await page.keyboard.press('n'); await wait(1500); await page.keyboard.press('x');
  await measure('night siren car', true); await measure('night siren no car', false);
}
