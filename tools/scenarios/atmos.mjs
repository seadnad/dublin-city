const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  const T = process.env.TAG || '';
  const go = async (k) => { await page.evaluate((k) => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo(k); }, k); await wait(1500); };
  const aerial = () => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos; d.camera.position.set(c.x - 60, 55, c.z + 90); d.camera.lookAt(c.x + 150, 0, c.z - 150); });
  await go('spire'); await shot(`${T}atm-day-oconnell`);
  await go('customHouse'); await shot(`${T}atm-day-quays`);
  await aerial(); await wait(700); await shot(`${T}atm-day-aerial`);
  await page.keyboard.press('r'); await go('customHouse'); await shot(`${T}atm-rain-quays`);
  await page.keyboard.press('r'); await page.keyboard.press('n'); await go('customHouse'); await shot(`${T}atm-evening-quays`);
}
