// St Stephen's Green frame cost: park the car on the four sides of the Green (by lat/lon, facing a bearing), plus one
// aerial camera over the park, and measure fps, GPU time, draw calls and triangles (the parkperf.mjs recipe).
// Q=low|medium|high (default high), DPR (default 1), NIGHT=1 for the lamps-on case, TAG labels the run, SHOTS=1 saves
// a frame per spot.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [slug, lat, lon, heading in degrees clockwise from north]; 'air' spots put the camera 120 m over the park instead
const SPOTS = [
  ['sg-north', 53.33950, -6.25980, 105],
  ['sg-west', 53.33900, -6.26150, 195],
  ['sg-south', 53.33690, -6.25950, 285],
  ['sg-east', 53.33700, -6.25610, 15],
  ['air', 53.33800, -6.25900, 0],
  ['city-dame', 53.34420, -6.26600, 90], // control: Dame Street (away from the Green)
];
export default async function (page, shot, { fps }) {
  await wait(6000);
  const q = process.env.Q || 'high', dpr = Number(process.env.DPR || 1);
  await page.evaluate(([q, dpr]) => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality(q, dpr);
    d.gpuTimes = []; d.gpuFrames = new Map(); let frameId = 0;
    const tick = () => { frameId++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    d.renderer.render = (s, c) => { const qq = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, qq); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([qq, frameId]);
      while (pending.length && gl.getQueryParameter(pending[0][0], gl.QUERY_RESULT_AVAILABLE)) { const [q0, fid] = pending.shift(); d.gpuFrames.set(fid, (d.gpuFrames.get(fid) || 0) + gl.getQueryParameter(q0, gl.QUERY_RESULT) / 1e6); } };
    d.frameInfo = () => new Promise((res) => { const info = d.renderer.info; info.autoReset = false; info.reset(); requestAnimationFrame(() => { const r = { calls: info.render.calls, tris: info.render.triangles }; info.autoReset = true; res(r); }); });
  }, [q, dpr]);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  const tag = process.env.TAG || 'run';
  for (const [slug, lat, lon, hdg] of SPOTS) {
    await page.evaluate(async ([slug, lat, lon, hdg]) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const p = project(lat, lon), h = (hdg * Math.PI) / 180;
      if (slug === 'air') {
        d.rig.update = () => {};
        d.camera.position.set(p.x - 60, 120, p.z + 90); d.camera.lookAt(p.x, 0, p.z);
        return;
      }
      if (d.rig.__upd) d.rig.update = d.rig.__upd; else d.rig.__upd = d.rig.update;
      d.car.teleport(p.x, p.z, Math.atan2(Math.sin(h), -Math.cos(h))); d.rig.snap();
    }, [slug, lat, lon, hdg]);
    await wait(2500);
    await page.evaluate(() => { window.__dublin.gpuFrames.clear(); window.__dublin.profile(); });
    const f = await fps(3000);
    const r = await page.evaluate(async () => {
      const d = window.__dublin, g = [...d.gpuFrames.values()].sort((a, b) => a - b), fi = await d.frameInfo();
      return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: fi.calls, tris: fi.tris, cpu: d.profile() };
    });
    console.log('GREEN', tag, q, slug.padEnd(10), `${f} fps`, `gpu ${r.gpu} ms`, `calls ${r.calls}`, `tris ${(r.tris / 1e6).toFixed(2)}M`, `cpu ${JSON.stringify(r.cpu)}`);
    if (process.env.SHOTS) await shot(`${tag}-${slug}`);
  }
}
