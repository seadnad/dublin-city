const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  const garda = () => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 4.5 - Math.cos(h) * 3.8, 1.5, c.z + Math.cos(h) * 4.5 + Math.sin(h) * 3.8); d.camera.lookAt(c.x, 0.8, c.z); });
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1500);
  await garda(); await wait(800); await shot('refl-day-garda');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo('merrion' in d.sites ? 'merrion' : 'bankOfIreland'); }); await wait(1500); await shot('refl-day-street');
  await page.evaluate(() => { const d = window.__dublin; d.teleportTo('hapenny'); }); await wait(1500); await shot('refl-day-river');
  await page.keyboard.press('r'); await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1500); await garda(); await wait(800); await shot('refl-rain-garda');
  await page.keyboard.press('r'); await page.keyboard.press('n'); await wait(1500); await garda(); await wait(800); await shot('refl-evening-garda');
}
