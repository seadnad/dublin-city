// Per-area performance: place the car at a fixed spot in each target area (by lat/lon, facing a bearing) and
// measure fps, GPU time, draw calls and triangles at the phone default (low tier, dpr 1). TAG labels the run.
// GFX=high loads with the High profile (full counts, 950 m view) and locks the high tier at dpr 1; EVENING=1 measures
// at night. GPU time, calls and triangles are summed over every render() in a frame (the high tier has several passes).
// gpu is the median frame, p10 the 10th percentile (less affected when something else shares the GPU).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [slug, lat, lon, heading in degrees clockwise from north]
export const AREAS = [
  ['hapenny-bridge', 53.34620, -6.26380, 250], // Wellington Quay looking west along the river to the bridge
  ['temple-bar', 53.34545, -6.26420, 270],     // Temple Bar street looking west
  ['christ-church', 53.34320, -6.26880, 250],  // Lord Edward St towards the cathedral
  ['st-patricks', 53.34060, -6.27100, 180],    // Patrick St, south past the park
  ['heuston', 53.34700, -6.28900, 250],        // Victoria Quay towards the station
];
export default async function (page, shot, { fps }) {
  const gfx = process.env.GFX || 'low';
  if (gfx !== 'low') {
    await page.evaluate((g) => localStorage.setItem('dublin.gfx', JSON.stringify(g)), gfx);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__dublin && window.__dublin.ready !== false, { timeout: 180000 });
  }
  await wait(6000);
  await page.evaluate((tier, evening) => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality(tier, 1);
    if (evening) d.actions.evening();
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
        // a frame is complete once a later frame's query has resolved
        for (const [k, v] of sums) if (k < f) { d.gpuTimes.push(v); sums.delete(k); }
      } };
  }, gfx === 'saver' ? 'low' : gfx, !!process.env.EVENING);
  const tag = process.env.TAG || 'run';
  for (const [slug, lat, lon, hdg] of AREAS) {
    await page.evaluate(async ([lat, lon, hdg]) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const p = project(lat, lon), h = (hdg * Math.PI) / 180;
      // world +x east, +z south; the car's heading is atan2(dx, dz)
      d.car.teleport(p.x, p.z, Math.atan2(Math.sin(h), -Math.cos(h))); d.rig.snap();
    }, [lat, lon, hdg]);
    await wait(2500);
    await page.evaluate(() => { window.__dublin.gpuTimes = []; });
    const f = await fps(3000);
    const r = await page.evaluate(() => {
      const d = window.__dublin, g = d.gpuTimes.slice().sort((a, b) => a - b);
      return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, gpu10: g.length ? +g[Math.floor(g.length * 0.1)].toFixed(2) : null, calls: d.frameInfo.calls, tris: d.frameInfo.tris, street: d.car.street && d.car.street.name };
    });
    console.log('AREA', tag, slug.padEnd(16), `${f} fps`, `gpu ${r.gpu} ms`, `p10 ${r.gpu10} ms`, `calls ${r.calls}`, `tris ${(r.tris / 1e6).toFixed(2)}M`, `street "${r.street}"`);
    if (process.env.SHOTS) await shot(`${tag}-${slug}`);
  }
}
