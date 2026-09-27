const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  const closeUp = () => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x - Math.sin(h) * 3 + Math.cos(h) * 5.5, 2.2, c.z - Math.cos(h) * 3 - Math.sin(h) * 5.5); d.camera.lookAt(c.x, 0.4, c.z); });
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1500);
  await closeUp(); await wait(600); await shot('car-contact-sun');
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; window.__dublin.teleportTo('bankOfIreland'); }); await wait(1500); await shot('dame-chase');
  await page.evaluate(() => { window.__dublin.teleportTo('trinity'); }); await wait(1500); await shot('college-green');
  await page.keyboard.press('r'); await wait(1500); await closeUp(); await wait(500); await shot('car-contact-rain');
}
