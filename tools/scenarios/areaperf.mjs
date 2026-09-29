// Per-area performance: place the car at a fixed spot in each target area (by lat/lon, facing a bearing) and
// measure fps, GPU time, draw calls and triangles at the phone default (low tier, dpr 1). TAG labels the run.
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
  await wait(6000);
  await page.evaluate(() => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.lockQuality('low', 1);
    d.gpuTimes = []; if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer), pending = [];
    d.renderer.render = (s, c) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpuTimes.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6); };
  });
  const tag = process.env.TAG || 'run';
  // AREAS='[[slug,lat,lon,hdg],...]' overrides the list
  for (const [slug, lat, lon, hdg] of (process.env.AREAS ? JSON.parse(process.env.AREAS) : AREAS)) {
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
      return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: d.renderer.info.render.calls, tris: d.renderer.info.render.triangles, street: d.car.street && d.car.street.name };
    });
    console.log('AREA', tag, slug.padEnd(16), `${f} fps`, `gpu ${r.gpu} ms`, `calls ${r.calls}`, `tris ${(r.tris / 1e6).toFixed(2)}M`, `street "${r.street}"`);
    if (process.env.SHOTS) await shot(`${tag}-${slug}`);
  }
}
