const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(2500);
  await shot('start');
  await page.keyboard.press('6'); await wait(1000); await shot('dame-st');
  await page.keyboard.press('3'); await wait(1000); await shot('westmoreland');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos; d.camera.position.set(c.x + 6, 3, c.z - 12); d.camera.lookAt(c.x - 4, 0, c.z - 30); });
  await wait(800); await shot('kerb-close');
  await page.evaluate(() => { const d = window.__dublin; const c = d.car.pos; d.camera.position.set(c.x + 30, 40, c.z + 20); d.camera.lookAt(c.x, 0, c.z - 20); });
  await wait(800); await shot('junction-aerial');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo('hapenny'); });
  await page.evaluate(() => { const d = window.__dublin; const n = d.world.nodes.get('TBQ'); d.car.teleport(n.x + 20, n.z + 3, -Math.PI / 2 - 0.1); d.rig.snap(); });
  await wait(1000); await shot('temple-bar');
}
