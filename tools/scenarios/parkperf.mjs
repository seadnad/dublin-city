// Phoenix Park frame cost: park the car at a few spots in the park (by lat/lon, facing a bearing) and measure fps,
// GPU time, draw calls and triangles. Q=low|medium|high (default low, the phone default), DPR (default 1), NIGHT=1
// for the lamps-on case, TAG labels the run, SHOTS=1 saves a frame per spot.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [slug, lat, lon, heading in degrees clockwise from north]
const SPOTS = [
  ['parkgate', 53.34850, -6.29720, 305],       // just inside the Parkgate piers, up Chesterfield Avenue
  ['chesterfield-mid', 53.35440, -6.31215, 305], // the long straight
  ['phoenix-mon', 53.35915, -6.32350, 305],     // approaching the Phoenix Monument
  ['wellington', 53.34830, -6.30500, 20],       // Conyngham Road at the Wellington lawn
  ['city-heuston', 53.34700, -6.28900, 250],    // control: Victoria Quay (outside the park)
];
export default async function (page, shot, { fps }) {
  await wait(6000);
  const q = process.env.Q || 'low', dpr = Number(process.env.DPR || 1);
  await page.evaluate(([q, dpr]) => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality(q, dpr);
    // GPU time per frame: every render call of a frame (scene pass, post passes) summed
    d.gpuTimes = []; d.gpuFrames = new Map(); let frameId = 0;
    const tick = () => { frameId++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    d.renderer.render = (s, c) => { const qq = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, qq); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([qq, frameId]);
      while (pending.length && gl.getQueryParameter(pending[0][0], gl.QUERY_RESULT_AVAILABLE)) { const [q0, fid] = pending.shift(); d.gpuFrames.set(fid, (d.gpuFrames.get(fid) || 0) + gl.getQueryParameter(q0, gl.QUERY_RESULT) / 1e6); } };
    // draw calls and triangles over a whole frame (all passes)
    d.frameInfo = () => new Promise((res) => { const info = d.renderer.info; info.autoReset = false; info.reset(); requestAnimationFrame(() => { const r = { calls: info.render.calls, tris: info.render.triangles }; info.autoReset = true; res(r); }); });
  }, [q, dpr]);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  const tag = process.env.TAG || 'run';
  for (const [slug, lat, lon, hdg] of SPOTS) {
    await page.evaluate(async ([lat, lon, hdg]) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const p = project(lat, lon), h = (hdg * Math.PI) / 180;
      d.car.teleport(p.x, p.z, Math.atan2(Math.sin(h), -Math.cos(h))); d.rig.snap();
    }, [lat, lon, hdg]);
    await wait(2500);
    await page.evaluate(() => { window.__dublin.gpuFrames.clear(); window.__dublin.profile(); });
    const f = await fps(3000);
    const r = await page.evaluate(async () => {
      const d = window.__dublin, g = [...d.gpuFrames.values()].sort((a, b) => a - b), fi = await d.frameInfo();
      return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: fi.calls, tris: fi.tris, cpu: d.profile() };
    });
    console.log('PARK', tag, q, slug.padEnd(17), `${f} fps`, `gpu ${r.gpu} ms`, `calls ${r.calls}`, `tris ${(r.tris / 1e6).toFixed(2)}M`, `cpu ${JSON.stringify(r.cpu)}`);
    if (process.env.SHOTS) await shot(`${tag}-${slug}`);
  }
}
