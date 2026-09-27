const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  const go = async (k) => { await page.evaluate((k) => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo(k); }, k); await wait(1200); };
  await go('bankOfIreland'); await shot('wet-dry-dame');
  await page.keyboard.press('r'); await wait(4500); await shot('wet-rain-dame');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 6 + Math.cos(h) * 4, 1.3, c.z + Math.cos(h) * 6 - Math.sin(h) * 4); d.camera.lookAt(c.x + Math.sin(h) * 20, 0, c.z + Math.cos(h) * 20); });
  await wait(500); await shot('wet-rain-low');
  await page.keyboard.press('n'); await go('customHouse'); await wait(2500); await shot('wet-rain-night-quays');
  await go('bankOfIreland'); await shot('wet-rain-night-dame');
}
