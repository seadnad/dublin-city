const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(2500);
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.cos(h) * 6, 1.3, c.z - Math.sin(h) * 6); d.camera.lookAt(c.x, 0.8, c.z); });
  await wait(500); await shot('car-left');
  await page.evaluate(() => { const d = window.__dublin; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x - Math.cos(h) * 6 + Math.sin(h) * 3, 1.6, c.z + Math.sin(h) * 6 + Math.cos(h) * 3); d.camera.lookAt(c.x, 0.8, c.z); });
  await wait(500); await shot('car-right-front');
}
