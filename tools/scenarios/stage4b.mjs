const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(1500);
  for (const k of ['hapenny', 'christChurch']) {
    await page.evaluate((k) => window.__dublin.teleportTo(k), k);
    await wait(900);
    await shot(k);
  }
  await page.evaluate(() => { const d = window.__dublin; const s = d.sites.christChurch; d.rig.mode = 'debug'; d.camera.position.set(s.x + 60, 60, s.z + 70); d.camera.lookAt(s.x, 5, s.z); d.scene.fog.density = 0.0008; });
  await wait(800); await shot('cc-aerial');
  await page.evaluate(() => { const d = window.__dublin; const s = d.sites.hapenny; d.camera.position.set(s.x + 40, 12, s.z + 10); d.camera.lookAt(s.x, 0, s.z); });
  await wait(800); await shot('hapenny-close');
  await page.evaluate(() => { const d = window.__dublin; const s = d.sites.customHouse; d.camera.position.set(s.x - 30, 50, s.z + 110); d.camera.lookAt(s.x, 5, s.z); });
  await wait(800); await shot('ch-aerial');
}
