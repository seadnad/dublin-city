const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(1500);
  for (const k of ['spire', 'gpo', 'oconnellBridge', 'hapenny', 'trinity', 'bankOfIreland', 'christChurch', 'customHouse', 'stephensGreen']) {
    await page.evaluate((k) => window.__dublin.teleportTo(k), k);
    await wait(900);
    await shot(k);
  }
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; d.camera.position.set(-120, 160, 60); d.camera.lookAt(0, 0, -60); d.scene.fog.density = 0.0008; });
  await wait(800); await shot('aerial-north');
  await page.evaluate(() => { const d = window.__dublin; d.camera.position.set(-60, 90, 230); d.camera.lookAt(0, 0, 130); });
  await wait(800); await shot('aerial-college-green');
}
