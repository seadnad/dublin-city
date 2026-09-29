// Garda helicopter: switch from the car (L), take off, fly with the keys, hover over the city at 50 / 150 / 250 m
// for frame-rate numbers, the searchlight at night, photo mode in the air, landing, and back to the car.
// Usage: node tools/check.mjs tools/scenarios/heli.mjs [--mobile]      (HELI_PERF=1: only the perf hovers)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  const st = () => page.evaluate(() => window.__dublin.heliState());
  const log = async (label) => console.log(label.padEnd(26), JSON.stringify(await st()));
  const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };
  // over the Liffey at O'Connell Bridge, looking up O'Connell Street
  const hover = (alt, headingOffset = 0) => page.evaluate((alt, ho) => {
    const d = window.__dublin, s = d.sites.oconnellBridge, sp = d.sites.spire;
    const h = Math.atan2(sp.x - s.x, sp.z - s.z) + ho;
    const x = s.x - Math.sin(h) * 60, z = s.z - Math.cos(h) * 60;
    d.heli.place(x, d.groundAt(x, z) + alt, z, h); d.heli.rpm = 1; d.heli.landed = false;
    d.rig.snap();
  }, alt, headingOffset);

  await page.evaluate(() => window.__dublin.teleportTo('oconnellBridge'));
  // fixed quality for comparable numbers: the profile's own tier and resolution, no adaptive steps
  const q = await page.evaluate(() => { const d = window.__dublin, g = d.gfx(); const tier = g.tier; d.lockQuality(tier, Math.min(g.maxDpr, 1)); return d.gfx(); }).catch(() => null);
  console.log('quality', JSON.stringify(q), await page.evaluate(() => { const gl = window.__dublin.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; }));
  await wait(2500);
  { const f = await fps(3000); const r = await page.evaluate(() => { const d = window.__dublin, s = d.stats(); d.profile(); return { calls: s.calls, tris: s.triangles }; }); console.log('PERF street (car)'.padEnd(20), f, 'fps', JSON.stringify(r)); }
  await page.keyboard.press('l');
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 30000 });
  await wait(1500);
  await log('switched');
  if (!process.env.HELI_PERF) {
    await shot('heli-ground');
    // the livery from the side, in photo mode
    await page.keyboard.press('p'); await wait(400);
    await page.evaluate(() => { const d = window.__dublin, h = d.heli; d.photo.pose({ target: [h.pos.x, h.pos.y + 1.8, h.pos.z], yaw: h.heading + Math.PI / 2 + 0.35, pitch: 0.12, dist: 15, fov: 50 }); });
    await wait(700); await shot('heli-ground-livery');
    await page.evaluate(() => { const d = window.__dublin, h = d.heli; d.photo.pose({ yaw: h.heading - Math.PI / 2 - 0.5, pitch: 0.18 }); });
    await wait(700); await shot('heli-ground-livery-left');
    await page.keyboard.press('p'); await wait(400);
    // spool up then climb
    await wait(1500);
    await page.keyboard.down(' '); await wait(1800); await shot('heli-takeoff'); await wait(1500); await page.keyboard.up(' ');
    await log('after climb (Space)');
    await hold('w', 2500); await log('after W 2.5 s');
    await hold('d', 1200); await log('after D 1.2 s (yaw)');
    await hold('ArrowLeft', 1200); await log('after <- 1.2 s (bank)');
    await wait(3000); await log('hands off 3 s');
  }

  // perf: hover over the centre at three heights (city moving, helicopter still)
  const rows = [];
  for (const alt of [50, 150, 250]) {
    await hover(alt); await wait(2500);
    page.evaluate(() => window.__dublin.profile());
    const f = await fps(3000);
    const r = await page.evaluate(() => { const d = window.__dublin, s = d.stats(); return { calls: s.calls, tris: s.triangles, dpr: s.dpr, gfx: d.gfx().tier, prof: d.profile(), ...d.heliState() }; });
    rows.push({ alt, fps: f, ...r });
    console.log(`PERF ${alt} m`.padEnd(14), f, 'fps', JSON.stringify({ calls: r.calls, tris: r.tris, dpr: r.dpr, tier: r.gfx, shadowExt: r.shadowExt, far: r.far, prof: r.prof }));
    if (!process.env.HELI_PERF) await shot(`heli-${alt}m`);
  }
  if (process.env.HELI_PERF) return;

  await hover(100); await wait(2500); await shot('heli-100m-oconnell');
  await hover(100, Math.PI / 2); await wait(2500); await shot('heli-100m-liffey');
  // night with the searchlight
  await page.keyboard.press('n'); await hover(45, 0.4); await wait(3500); await shot('heli-night-45m');
  await hover(20, 0.2); await wait(2500); await shot('heli-night-20m');
  await page.keyboard.press('n');
  // photo mode while flying
  await hover(60); await wait(1500);
  await page.keyboard.press('p'); await wait(600);
  await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(470, 330, { steps: 10 }); await page.mouse.up();
  await wait(500); await shot('heli-photo');
  console.log('PHOTO', JSON.stringify(await page.evaluate(() => ({ active: window.__dublin.photo.active, ...window.__dublin.photo.state }))));
  await page.keyboard.press('p'); await wait(500);
  // collision: fly at the Spire at 30 m
  await page.evaluate(() => {
    const d = window.__dublin, sp = d.sites.spire;
    d.heli.place(sp.x, d.groundAt(sp.x, sp.z + 60) + 30, sp.z + 60, Math.PI); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap();
  });
  // fixed-step simulation (the headless frame rate is too uneven to judge distances by wall-clock key holds)
  const sim = (inp, steps) => page.evaluate((inp, steps) => { const d = window.__dublin, s = d.sites.spire; let min = 1e9; for (let i = 0; i < steps; i++) { d.heli.update(1 / 60, inp, d.heliEnv); min = Math.min(min, Math.hypot(d.heli.pos.x - s.x, d.heli.pos.z - s.z)); } return { min: +min.toFixed(1), ...d.heliState() }; }, inp, steps);
  console.log('SPIRE sim (min distance to the Spire axis, 8 s full forward at 30 m)', JSON.stringify(await sim({ pitch: 1, roll: 0, yaw: 0, lift: 0 }, 480)));
  await wait(500);
  const sp = await page.evaluate(() => { const d = window.__dublin, s = d.sites.spire, h = d.heli; return { dist: Math.hypot(h.pos.x - s.x, h.pos.z - s.z), z: h.pos.z - s.z, y: h.pos.y }; });
  console.log('SPIRE test (should stay > ~4 m away)', JSON.stringify(sp));
  await shot('heli-spire');
  // land: descend over the street
  await hover(15); await wait(500);
  console.log('LAND sim (8 s full descend from 15 m)', JSON.stringify(await sim({ pitch: 0, roll: 0, yaw: 0, lift: -1 }, 480)));
  console.log('TAKEOFF sim (3 s climb)', JSON.stringify(await sim({ pitch: 0, roll: 0, yaw: 0, lift: 1 }, 180)));
  await page.keyboard.down('Shift'); await wait(6000); await page.keyboard.up('Shift');
  await log('after Shift 6 s (landed?)');
  await shot('heli-landed');
  // land on the GPO roof
  await page.evaluate(() => { const d = window.__dublin, g = d.sites.gpo; d.heli.place(g.x, d.groundAt(g.x, g.z) + 12, g.z, 0); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap(); });
  console.log('ROOF sim (GPO, 8 s descend)', JSON.stringify(await sim({ pitch: 0, roll: 0, yaw: 0, lift: -1 }, 480)));
  await wait(1200); await shot('heli-gpo-roof');
  // back to the car
  await page.keyboard.press('l'); await wait(1500);
  console.log('BACK', JSON.stringify(await page.evaluate(() => { const d = window.__dublin, s = d.stats(); return { flying: d.heliState().flying, car: s.car, carVisible: d.carMesh().children.map((c) => c.visible) }; })));
  await shot('heli-back-to-car');
  console.log('PERF SUMMARY', JSON.stringify(rows.map((r) => ({ alt: r.alt, fps: r.fps, calls: r.calls, tris: r.tris }))));
}
