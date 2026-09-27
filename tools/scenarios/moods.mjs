const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  const garda = () => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 5 - Math.cos(h) * 3.5, 1.7, c.z + Math.cos(h) * 5 + Math.sin(h) * 3.5); d.camera.lookAt(c.x, 0.8, c.z); });
  await page.evaluate(() => window.__dublin.teleportTo('spire'));
  await wait(1500); await garda(); await wait(800); await shot('day-garda');
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; window.__dublin.teleportTo('bankOfIreland'); }); await wait(1500); await shot('day-dame');
  await page.keyboard.press('r'); await wait(2000); await shot('rain-dame');
  await page.keyboard.press('r'); await page.keyboard.press('n'); await wait(2000); await shot('evening-dame');
}
