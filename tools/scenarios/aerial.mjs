// Aerial view review: numbers and shots from the helicopter over the centre, street-level baselines, and the
// eastward skyline (Poolbeg) from the quays. Quality is locked to the profile's tier (dpr <= 1) so runs compare.
// Usage: node tools/check.mjs tools/scenarios/aerial.mjs [--mobile]
//   PERF_ONLY=1   numbers only (no shots)        SHOTS_ONLY=1  shots only
//   NIGHT=0       skip the night set             TIER=high|medium|low to force a tier
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  const tier = process.env.TIER || null;
  console.log('quality', JSON.stringify(await page.evaluate((t) => { const d = window.__dublin, g = d.gfx(); d.lockQuality(t || g.tier, Math.min(g.maxDpr, 1)); return d.gfx(); }, tier)));
  const perf = !process.env.SHOTS_ONLY, shots = !process.env.PERF_ONLY;
  // HAZE=metres: the aerial haze's half-way distance (main.js heliTune.haze); ONLY=150,250 limits the heights shot
  if (process.env.HAZE) await page.evaluate((h) => { window.__dublin.heliTune.haze = h; }, +process.env.HAZE);
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
  if (process.env.RAIN) { await page.keyboard.press('r'); await wait(6000); } // RAIN=1: the whole run in the rain
  // calls / triangles averaged over 30 frames (Low renders the shadow map every other frame from the air)
  const stats = () => page.evaluate(() => new Promise((res) => {
    const d = window.__dublin; let n = 0, c = 0, t = 0;
    const tick = () => { const s = d.stats(); c += s.calls; t += s.triangles; if (++n < 30) requestAnimationFrame(tick); else res({ calls: Math.round(c / n), tris: Math.round(t / n), far: Math.round(d.camera.far), fog: +d.scene.fog.density.toFixed(5) }); };
    requestAnimationFrame(tick);
  }));
  const measure = async (label) => {
    await wait(2000);
    const f = await fps(2500);
    const r = await stats();
    console.log('PERF', label.padEnd(26), String(f).padStart(3), 'fps', JSON.stringify(r));
    return r;
  };
  // street level: the car on O'Connell Bridge, and a free camera on the bridge looking down the river to the east
  await page.evaluate(() => window.__dublin.teleportTo('oconnellBridge'));
  await wait(1500);
  if (perf) await measure('street car (bridge)');
  if (shots) await shot('street-car-bridge');
  // looking down the river toward the Poolbeg chimneys (the far view's POOLBEG positions)
  const eastLook = (eye, dx) => page.evaluate((eye, dx) => {
    const d = window.__dublin, s = d.sites.oconnellBridge, POOLBEG = d.far ? d.far.chimneys : [{ x: (-6.18994 + 6.25915) * 111320 * Math.cos(53.34727 * Math.PI / 180) * 0.5, z: -(53.34023 - 53.34727) * 111320 * 0.5 }]; // (older builds: the same projection)
    const p = POOLBEG[0];
    d.rig.update = () => {};
    d.camera.position.set(s.x + dx, eye, s.z - 6);
    d.camera.lookAt(p.x, eye + 60, p.z);
  }, eye, dx);
  const views = [['bridge-east', 3.5, 0], ['quay-east', 3.5, 420]];
  for (const [name, eye, dx] of views) {
    await eastLook(eye, dx);
    if (perf) await measure(`street ${name}`);
    if (shots) await shot(`street-${name}`);
  }
  // the rig takes over again
  await page.evaluate(() => { const d = window.__dublin; delete d.rig.update; d.rig.snap(); });

  // helicopter: hover over the centre at 50 / 150 / 250 m, four headings
  await page.evaluate(() => window.__dublin.actions.heli());
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 120000 });
  const hover = (alt, heading) => page.evaluate((alt, h) => {
    const d = window.__dublin, s = d.sites.oconnellBridge;
    const x = s.x - Math.sin(h) * 60, z = s.z - Math.cos(h) * 60;
    d.heli.place(x, d.groundAt(x, z) + alt, z, h); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap();
  }, alt, heading);
  // heading 0 = +z = south; PI = north
  const dirs = [['N', Math.PI], ['E', Math.PI / 2], ['S', 0], ['W', -Math.PI / 2]];
  for (const alt of only || [50, 150, 250]) {
    for (const [dn, h] of dirs) {
      await hover(alt, h);
      if (perf && (dn === 'N' || dn === 'E' || alt !== 50)) await measure(`heli ${alt} m ${dn}`);
      else await wait(1800);
      if (shots && alt !== 50) await shot(`heli-${alt}-${dn}`);
    }
  }
  if (perf && await page.evaluate(() => !!window.__dublin.far)) {
    // the far view's ground capture (on a weather / time-of-day change): wall time including the GPU (a 1-pixel
    // read-back waits for it)
    const t = await page.evaluate(() => {
      const d = window.__dublin, gl = d.renderer.getContext(), px = new Uint8Array(4), out = [];
      for (let i = 0; i < 3; i++) { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); d.far.recapture(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); out.push(Math.round(performance.now() - t0)); }
      return { wall: out, far: d.far.state.ms, tris: d.far.state.tris, walls: d.far.state.lotWalls, columns: d.far.state.columns, programs: d.far.state.programs, capPrograms: d.far.state.capPrograms, warm: d.far.state.warm };
    });
    console.log('RECAPTURE', JSON.stringify(t));
  }
  if (shots) {
    // photo mode free camera: high over the city looking west up the Liffey, and a wide orbit shot
    await hover(200, Math.PI / 2); await wait(1200);
    await page.keyboard.press('p'); await wait(500);
    await page.evaluate(() => { const d = window.__dublin, s = d.sites.oconnellBridge; d.photo.pose({ target: [s.x - 200, 0, s.z], yaw: Math.PI / 2 + 0.25, pitch: 0.45, dist: 520, fov: 55 }); });
    await wait(1500); await shot('photo-west-high');
    await page.evaluate(() => { const d = window.__dublin, s = d.sites.oconnellBridge; d.photo.pose({ target: [s.x + 300, 0, s.z], yaw: -Math.PI / 2 + 0.3, pitch: 0.3, dist: 560, fov: 55 }); });
    await wait(1500); await shot('photo-east-high');
    await page.keyboard.press('p'); await wait(500);
    if (process.env.NIGHT !== '0') {
      await page.keyboard.press('n'); await wait(2500);
      for (const alt of [150, 250]) for (const [dn, h] of dirs.slice(0, 2)) { await hover(alt, h); await wait(1800); await shot(`night-heli-${alt}-${dn}`); }
      if (perf) { await hover(250, Math.PI); await measure('night heli 250 m N'); }
      await page.evaluate(() => window.__dublin.actions.heli());
      await page.evaluate(() => window.__dublin.teleportTo('oconnellBridge'));
      await wait(1000);
      await eastLook(3.5, 0); await wait(1500); await shot('night-street-bridge-east');
      await eastLook(3.5, 420); await wait(1500); await shot('night-street-quay-east');
      await page.evaluate(() => { const d = window.__dublin; delete d.rig.update; d.rig.snap(); });
      await page.keyboard.press('n'); await wait(1500);
    }
  }
}
