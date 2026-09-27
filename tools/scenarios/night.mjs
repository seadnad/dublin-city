const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  const go = async (k) => { await page.evaluate((k) => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo(k); }, k); await wait(1500); };
  await page.keyboard.press('n'); await wait(500);
  await go('bankOfIreland'); await shot('night-dame');
  await go('spire'); await shot('night-oconnell');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos; d.camera.position.set(c.x - 60, 60, c.z + 90); d.camera.lookAt(c.x + 120, 10, c.z - 160); }); await wait(700); await shot('night-aerial');
  await go('stephensGreen'); await page.keyboard.press('x'); await wait(900); await shot('night-green-siren'); await page.keyboard.press('x');
  await page.keyboard.press('r'); await go('bankOfIreland'); await wait(3500); await shot('night-rain-dame');
}
