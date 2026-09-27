const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  console.log('player model:', await page.evaluate(() => { let m = null; window.__dublin.scene.traverse((o) => { if (o.userData && o.userData.model) m = (m ? m + ',' : '') + o.userData.model; }); return m; }));
  await shot('garda-chase');
  await page.keyboard.press('x'); await page.keyboard.down('w'); await wait(1800); await page.keyboard.up('w'); await shot('garda-siren');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 6 + Math.cos(h) * 3.5, 1.6, c.z + Math.cos(h) * 6 - Math.sin(h) * 3.5); d.camera.lookAt(c.x, 0.8, c.z); });
  await wait(400); await shot('garda-front');
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; });
  await page.keyboard.press('x');
  await page.keyboard.press('g'); await wait(300); await page.click('[data-mode="pursuit"]'); await wait(1500);
  await page.evaluate(() => { const d = window.__dublin; const s = d.pursuit.blips()[0]; const dx = s.x - d.car.pos.x, dz = s.z - d.car.pos.z, L = Math.hypot(dx, dz); d.car.teleport(s.x - dx / L * 14, s.z - dz / L * 14, Math.atan2(dx, dz)); d.rig.snap(); });
  await wait(700); await shot('suspect');
}
