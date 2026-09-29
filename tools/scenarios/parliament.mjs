// Parliament House / Bank of Ireland review: driver-eye views round College Green from fixed lat/lon spots (so
// before/after shots line up whatever the street graph does), an overhead, and optionally per-view frame cost.
// env: TAG (file prefix), NIGHT=1, ONLY=name,name, PERF=1 (fps, GPU ms, draw calls, triangles at each view),
// QUALITY=low (lock a graphics tier for PERF)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [name, lat, lon, heading in degrees clockwise from north, camera: 'car' | [eyeY, lookY, lookDist]]
// lat may instead be a game position 'x,z' (lon unused) for spots that only make sense in the new layout
const VIEWS = [
  ['dame-approach', 53.34426, -6.26250, 84, 'car'],   // Dame Street, east of Anglesea St: Trinity closing the view
  ['dame-cg', 53.34433, -6.26140, 78, 'car'],         // entering College Green: the west quadrant on the left
  ['cg-front', '-26,167', 0, 343, [1.6, 8, 40]],      // on the south footpath opposite the piazza (ref 14)
  ['cg-east', 53.34436, -6.25955, 292, [1.6, 7, 40]],   // from the Trinity side: east quadrant, piazza (ref 01)
  ['cg-quadrant', '-8,146', 0, 300, [1.6, 7, 30]],    // the east quadrant from the Trinity junction (ref 05)
  ['westmoreland', 53.34560, -6.25907, 186, 'car'],   // down Westmoreland St towards College Green: Lords portico
  ['westmoreland-up', '-4,128', 0, 355, [1.6, 7, 30]], // leaving College Green northbound: portico on the left (ref 09)
  ['college-st', '16,112', 0, 296, 'car'],           // west along College St into the junction: Lords portico (ref 15)
  ['foster-in', 53.34436, -6.26098, 345, [1.6, 5, 40]], // from College Green up Foster Place: west portico (ref 11)
  ['foster-portico', '-71.7,126.1', 0, 73, [1.6, 6, 30]], // across Foster Place, facing the west portico (ref 11)
];
export default async function (page, shot, { fps }) {
  await wait(7000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  const tag = process.env.TAG || '';
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  if (process.env.PERF) {
    await page.evaluate((q) => {
      // every render call of a frame (scene, shadows, post) summed: GPU time per frame, draw calls, triangles
      const d = window.__dublin, r = d.renderer, gl = r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (q) d.lockQuality(q, 1);
      d.gpuTimes = []; d.frameStats = [];
      r.info.autoReset = false;
      let frame = 0; const sums = new Map(), pending = [];
      const tick = () => { d.frameStats.push({ calls: r.info.render.calls, tris: r.info.render.triangles }); r.info.reset(); frame++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const orig = r.render.bind(r);
      r.render = (s, c) => {
        if (!ext) return orig(s, c);
        const qq = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, qq); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([qq, frame]);
        while (pending.length && gl.getQueryParameter(pending[0][0], gl.QUERY_RESULT_AVAILABLE)) {
          const [p, f] = pending.shift(); sums.set(f, (sums.get(f) || 0) + gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6);
          for (const [k, v] of sums) if (k < f) { d.gpuTimes.push(v); sums.delete(k); }
        }
      };
    }, process.env.QUALITY || null);
  }
  for (const [name, lat, lon, hdg, cam] of VIEWS) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(async ([lat, lon, hdg, cam]) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const p = typeof lat === 'string' ? (([x, z]) => ({ x, z }))(lat.split(',').map(Number)) : project(lat, lon);
      const h = (hdg * Math.PI) / 180, dx = Math.sin(h), dz = -Math.cos(h);
      if (!d.__rigUpdate) d.__rigUpdate = d.rig.update;
      if (cam === 'car') { d.rig.update = d.__rigUpdate; d.car.teleport(p.x, p.z, Math.atan2(dx, dz)); d.rig.snap(); return; }
      const [eye, lookY, dist] = cam;
      d.car.teleport(p.x - dx * 30, p.z - dz * 30, Math.atan2(dx, dz)); // the car out of the way, behind the camera
      d.rig.update = () => {};
      d.camera.position.set(p.x, eye, p.z); d.camera.lookAt(p.x + dx * dist, lookY, p.z + dz * dist);
    }, [lat, lon, hdg, cam]);
    await wait(1600);
    if (process.env.PERF) {
      await page.evaluate(() => { window.__dublin.gpuTimes = []; window.__dublin.frameStats = []; });
      const f = await fps(2500);
      const r = await page.evaluate(() => {
        const d = window.__dublin, g = (d.gpuTimes || []).slice().sort((a, b) => a - b), s = d.frameStats.filter((x) => x.calls > 0);
        const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : null);
        return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: med(s.map((x) => x.calls)), tris: med(s.map((x) => x.tris)) || 0 };
      });
      console.log('PERF', tag, name.padEnd(14), `${f} fps`, `gpu ${r.gpu} ms`, `calls ${r.calls}`, `tris ${(r.tris / 1e6).toFixed(3)}M`);
    }
    await shot(`${tag}${name}`);
  }
  if (process.env.OVERHEAD !== '0' && !only) {
    await page.evaluate(async () => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const c = project(53.34470, -6.26010);
      d.rig.update = () => {};
      d.camera.position.set(c.x - 10, 120, c.z + 95); d.camera.lookAt(c.x, 0, c.z);
    });
    await wait(1200); await shot(`${tag}overhead`);
  }
}
