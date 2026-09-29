// Frame cost of the tall buildings (src/world/towers.js): calls / triangles / fps with the merged tower meshes shown
// and hidden, from the street (O'Connell Bridge looking east, the quays) and from the helicopter over the centre.
// Usage: PERF=1 node tools/check.mjs tools/scenarios/towersperf.mjs [--mobile]
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  console.log('quality', JSON.stringify(await page.evaluate(() => { const d = window.__dublin, g = d.gfx(); d.lockQuality(g.tier, Math.min(g.maxDpr, 1)); return d.gfx(); })));
  const stats = () => page.evaluate(() => new Promise((res) => {
    const d = window.__dublin; let n = 0, c = 0, t = 0;
    const tick = () => { const s = d.stats(); c += s.calls; t += s.triangles; if (++n < 30) requestAnimationFrame(tick); else res({ calls: Math.round(c / n), tris: Math.round(t / n) }); };
    requestAnimationFrame(tick);
  }));
  const show = (on) => page.evaluate((on) => { window.__dublin.landmarks.towers.group.visible = on; }, on);
  const both = async (label) => {
    const out = {};
    for (const on of [false, true]) {
      await show(on); await wait(1500);
      out[on ? 'with' : 'without'] = { fps: await fps(2500), ...(await stats()) };
    }
    console.log('PERF', label.padEnd(22), JSON.stringify(out));
  };
  console.log('towers tris', await page.evaluate(() => window.__dublin.landmarks.towers.group.userData.tris), 'meshes', await page.evaluate(() => window.__dublin.landmarks.towers.group.children.length));
  const look = (ex, ey, ez, tx, ty, tz) => page.evaluate(([ex, ey, ez, tx, ty, tz]) => {
    const d = window.__dublin; d.rig.update = () => {}; d.camera.position.set(ex, ey, ez); d.camera.lookAt(tx, ty, tz);
  }, [ex, ey, ez, tx, ty, tz]);
  const s = await page.evaluate(() => { const d = window.__dublin.sites; return { b: d.oconnellBridge, lh: d.libertyHall, cd: d.capitalDock }; });
  await look(s.b.x, 2.5, s.b.z, s.lh.x + 200, 20, s.lh.z + 60); await both('street OCB east');
  await look(s.b.x + 300, 3, s.b.z + 20, s.cd.x, 30, s.cd.z); await both('street quay east');
  await page.evaluate(() => { const d = window.__dublin; delete d.rig.update; d.rig.snap(); });
  await page.evaluate(() => window.__dublin.actions.heli());
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 120000 });
  for (const alt of [60, 200]) {
    await page.evaluate((alt) => {
      const d = window.__dublin, b = d.sites.oconnellBridge, x = b.x - 60, z = b.z;
      d.heli.place(x, d.groundAt(x, z) + alt, z, Math.PI / 2); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap();
    }, alt);
    await both(`heli ${alt} m E`);
  }
  await show(true);
}
