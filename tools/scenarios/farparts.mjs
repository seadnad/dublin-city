// Far view debugging: from 250 m, no haze, shots with each far-view part hidden in turn.
// Usage: node tools/check.mjs tools/scenarios/farparts.mjs     (HEADING=radians, ALT=metres, FOV=degrees)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await page.evaluate(() => { const d = window.__dublin, g = d.gfx(); d.lockQuality(g.tier, Math.min(g.maxDpr, 1)); d.heliTune.haze = +(localStorage.haze || 1e7); });
  if (process.env.HAZE) await page.evaluate((h) => { window.__dublin.heliTune.haze = h; }, +process.env.HAZE);
  if (process.env.FARK) await page.evaluate((k) => { window.__dublin.heliTune.far = k; }, +process.env.FARK); // main far plane: BASE_FAR * (1 + FARK * alt / 250)
  await page.evaluate(() => window.__dublin.actions.heli());
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 120000 });
  const h = +(process.env.HEADING || Math.PI), alt = +(process.env.ALT || 250);
  await page.evaluate((h, alt) => { const d = window.__dublin, s = d.sites.oconnellBridge; d.heli.place(s.x, d.groundAt(s.x, s.z) + alt, s.z, h); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap(); }, h, alt);
  await page.waitForFunction(() => window.__dublin.far.state.built, { timeout: 120000 });
  if (process.env.FOV) {
    await page.keyboard.press('p'); await wait(500);
    await page.evaluate((fov, h) => { const d = window.__dublin, c = d.camera; d.photo.pose({ fov, yaw: h + Math.PI, pitch: 0.12 }); }, +process.env.FOV, h);
  }
  await wait(2500);
  await shot('all');
  const names = await page.evaluate(() => window.__dublin.far.scene.children.find((c) => c.name === 'far view (aerial)').children.map((c) => c.name || c.type));
  for (const n of names) {
    await page.evaluate((n) => { const a = window.__dublin.far.scene.children.find((c) => c.name === 'far view (aerial)'); a.children.forEach((c) => { c.visible = (c.name || c.type) !== n; }); }, n);
    await wait(700); await shot(`without-${n.replace(/\W+/g, '-')}`);
  }
}
