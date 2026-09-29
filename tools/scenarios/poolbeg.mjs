// The Poolbeg chimneys on the skyline: street-level views down the Liffey from O'Connell Bridge and the quays toward
// them, by day and night. Usage: node tools/check.mjs tools/scenarios/poolbeg.mjs [--mobile]
//   DEBUG=1: extra shots with the city hidden and with no fog
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await page.evaluate(() => { const d = window.__dublin, g = d.gfx(); d.lockQuality(g.tier, Math.min(g.maxDpr, 1)); });
  // eye: height; from: [node or site key, dx, dz]; look toward the western chimney at height lookY
  const look = (x, z, eye, lookY = 90, fov = 62) => page.evaluate((x, z, eye, lookY, fov) => {
    const d = window.__dublin, p = d.far ? d.far.chimneys[0] : { x: (-6.18994 + 6.25915) * 111320 * Math.cos(53.34727 * Math.PI / 180) * 0.5, z: -(53.34023 - 53.34727) * 111320 * 0.5 };
    d.rig.update = () => {};
    d.camera.fov = fov; d.camera.updateProjectionMatrix();
    d.camera.position.set(x, eye, z);
    d.camera.lookAt(p.x, lookY, p.z);
  }, x, z, eye, lookY, fov);
  const spots = await page.evaluate(() => {
    const d = window.__dublin, s = d.sites.oconnellBridge;
    // the river's banks at x (linear along the bank polylines); `k` 0 = north bank, 1 = south bank
    const bankZ = (bank, x) => { for (let i = 0; i + 1 < bank.length; i++) { const a = bank[i], b = bank[i + 1]; if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) return a.z + ((x - a.x) / (b.x - a.x)) * (b.z - a.z); } return null; };
    const river = (x, k) => [x, bankZ(d.world.northBank, x) * (1 - k) + bankZ(d.world.southBank, x) * k];
    return {
      bridge: [s.x, s.z - 4],
      'custom-house-quay': river(s.x + 330, 0.12), // on the north quay wall's edge
      'river-talbot': river(s.x + 520, 0.5),
      'north-wall-quay': river(s.x + 950, 0.1),
      'rogersons-quay': river(s.x + 1150, 0.9),
    };
  });
  if (process.env.CLOSE) {
    // close to the stacks from the South Wall side (as refs/poolbeg/poolbeg-3.jpg), once the far view is built
    await page.evaluate(() => { const d = window.__dublin, p = d.far.chimneys[0]; d.rig.update = () => {}; d.camera.position.set(p.x + 700, 40, p.z + 90); d.camera.lookAt(p.x, 95, p.z); });
    await page.waitForFunction(() => window.__dublin.far.state.built, { timeout: 120000 });
    await wait(1500); await shot('poolbeg-close');
    await page.evaluate(() => { const d = window.__dublin, p = d.far.chimneys[0]; d.camera.fov = 40; d.camera.updateProjectionMatrix(); d.camera.position.set(p.x + 260, 30, p.z + 40); d.camera.lookAt(p.x, 110, p.z); });
    await wait(1200); await shot('poolbeg-close-tele');
    await page.evaluate(() => { const d = window.__dublin; d.camera.fov = 62; d.camera.updateProjectionMatrix(); });
    return;
  }
  for (const night of [false, true]) {
    if (night) { await page.keyboard.press('n'); await wait(2500); }
    for (const [name, [x, z]] of Object.entries(spots)) {
      await look(x, z, 3.2); await wait(1200); await shot(`${night ? 'night-' : ''}poolbeg-${name}`);
    }
    await look(spots.bridge[0], spots.bridge[1], 3.2, 90, 30); await wait(1200); await shot(`${night ? 'night-' : ''}poolbeg-bridge-zoom`);
    if (process.env.DEBUG) {
      await page.evaluate(() => { const d = window.__dublin; d._hid = d.scene.children.filter((c) => c.visible); d._hid.forEach((c) => { c.visible = false; }); });
      await wait(800); await shot('debug-city-hidden');
      await page.evaluate(() => { const d = window.__dublin; d._fd = d.scene.fog.density; d.scene.fog.density = 0; });
      await wait(800); await shot('debug-no-fog');
      await page.evaluate(() => { const d = window.__dublin; d.scene.fog.density = d._fd; d._hid.forEach((c) => { c.visible = true; }); });
    }
  }
}
