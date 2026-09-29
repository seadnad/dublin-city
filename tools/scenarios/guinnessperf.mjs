// Guinness Storehouse frame cost (the hero group: the Storehouse LOD, Power House, stacks, St Patrick's Tower and the
// fermenters): park the car at a few spots with it in view and measure GPU time and draw calls with it shown and hidden.
// TIER (low|medium|high, default low) and DPR (default 1) set the pipeline; NIGHT=1 switches to night first.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [slug, from node, to node, t along from->to]: the car sits in the lane and faces along the road
const SPOTS = [
  ['market-st', 'BV1', 'MK1', 0.45], // Market Street South, the Storehouse front on the right, the bar overhead
  ['victoria-quay', 'VQ2', 'VQ1', 0.2], // Victoria Quay eastbound, the brewery wall, fermenters and stacks on the right
  ['frank-sherwin', 'WT2', 'VQ2', 0.3], // over Frank Sherwin Bridge towards the brewery (the Storehouse far LOD)
];
export default async function (page, shot, { fps }) {
  await wait(6000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  await page.evaluate(([tier, dpr]) => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality(tier, dpr);
    d.gpuTimes = []; if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpuTimes.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6); };
  }, [process.env.TIER || 'low', Number(process.env.DPR || 1)]);
  for (const [slug, a, b, t] of SPOTS) {
    await page.evaluate(async ([a, b, t]) => {
      const d = window.__dublin, A = d.world.nodes.get(a), B = d.world.nodes.get(b);
      const x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t;
      d.car.teleport(x, z, Math.atan2(B.x - A.x, B.z - A.z)); d.rig.snap(); // along the road, the way a driver sees it
    }, [a, b, t]);
    await wait(2500);
    const out = [];
    for (const show of [true, false, true]) {
      await page.evaluate((show) => { const d = window.__dublin, s = d.scene.getObjectByName('Guinness Storehouse'); if (s) s.visible = show; d.gpuTimes = []; }, show);
      await wait(600);
      const f = await fps(2500);
      const r = await page.evaluate(() => {
        const d = window.__dublin, g = d.gpuTimes.slice().sort((p, q) => p - q), s = d.scene.getObjectByName('Guinness Storehouse');
        const lod = s && s.children.find((o) => o.isLOD), lvl = lod ? lod.levels.findIndex((l) => l.object.visible) : -1;
        const dist = lod ? Math.round(d.camera.position.distanceTo(lod.position)) : null;
        return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: d.renderer.info.render.calls, tris: d.renderer.info.render.triangles, lvl, dist };
      });
      out.push({ show, f, ...r });
    }
    const on = out[0], off = out[1];
    console.log('GUINNESS', slug.padEnd(20), `dist ${on.dist} m, level ${on.lvl}`, `| shown: ${on.f} fps gpu ${on.gpu} ms calls ${on.calls} tris ${on.tris}`,
      `| hidden: ${off.f} fps gpu ${off.gpu} ms calls ${off.calls} tris ${off.tris}`, `| again: gpu ${out[2].gpu} ms`);
    if (process.env.SHOTS) await shot(`perf-${slug}`);
  }
}
