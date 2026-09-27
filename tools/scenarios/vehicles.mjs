const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await shot('start');
  // Merrion Square: parked cars
  await page.evaluate(() => { const d = window.__dublin; const a = d.world.nodes.get('MSNW'), b = d.world.nodes.get('MSNE'); const h = Math.atan2(b.x - a.x, b.z - a.z); d.car.teleport(a.x + (b.x - a.x) * 0.25 + Math.cos(h) * 2.6, a.z + (b.z - a.z) * 0.25 - Math.sin(h) * 2.6, h); d.rig.snap(); });
  await wait(1200); await shot('merrion-parked');
  // close look at a bus and at cars
  const bus = await page.evaluate(() => { const d = window.__dublin; const b = d.traffic.list.find((a) => a.isBus); return { x: b.pos.x, z: b.pos.z, h: b.heading }; });
  await page.evaluate((b) => { const d = window.__dublin; d.rig.mode = 'debug'; d.camera.position.set(b.x + Math.sin(b.h) * 12 + Math.cos(b.h) * 7, 3.2, b.z + Math.cos(b.h) * 12 - Math.sin(b.h) * 7); d.camera.lookAt(b.x, 2, b.z); }, bus);
  await wait(600); await shot('bus-front');
  await page.evaluate((b) => { const d = window.__dublin; d.camera.position.set(b.x + Math.cos(b.h) * 10, 2.5, b.z - Math.sin(b.h) * 10); d.camera.lookAt(b.x, 2, b.z); }, bus);
  await wait(300); await shot('bus-side');
  await page.evaluate(() => { const d = window.__dublin; const c = d.car.pos; d.camera.position.set(c.x + 6, 2.2, c.z + 5); d.camera.lookAt(c.x, 0.8, c.z); });
  await wait(300); await shot('player-car');
  await page.evaluate(() => { const d = window.__dublin; const c = d.car.pos; d.camera.position.set(c.x - 2, 2.4, c.z - 9); d.camera.lookAt(c.x + 3, 0.6, c.z + 8); });
  await wait(300); await shot('parked-row');
}
