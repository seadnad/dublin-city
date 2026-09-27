const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1500);
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos; d.camera.position.set(c.x + 2, 14, c.z + 8); d.camera.lookAt(c.x, 0, c.z); });
  await wait(700); await shot('car-top');
  console.log(await page.evaluate(() => { const d = window.__dublin; let n = 0; d.scene.traverse((o) => { if (o.castShadow && o.isMesh) n++; }); return 'casters ' + n; }));
}
