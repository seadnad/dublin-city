const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1200);
  await page.keyboard.press('x');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 3.5 - Math.cos(h) * 2.5, 2.8, c.z + Math.cos(h) * 3.5 + Math.sin(h) * 2.5); d.camera.lookAt(c.x, 1.3, c.z); });
  for (let i = 0; i < 4; i++) { await wait(110); await shot(`flash-${i}`); }
  const n = await page.evaluate(() => { let k = 0; window.__dublin.scene.traverse((o) => { if (o.material && /^lightbar_\d/.test(o.material.name || '') && o.material.emissiveIntensity > 1) k++; }); return k; });
  console.log('lenses lit at last frame:', n);
  await page.keyboard.press('n'); await wait(1500);
  await page.evaluate(() => { const d = window.__dublin; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 6 - Math.cos(h) * 4, 2.2, c.z + Math.cos(h) * 6 + Math.sin(h) * 4); d.camera.lookAt(c.x, 0.8, c.z); });
  for (let i = 0; i < 3; i++) { await wait(130); await shot(`night-flash-${i}`); }
}
