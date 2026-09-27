const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.teleportTo('bankOfIreland')); await wait(1200);
  const top = () => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos; d.camera.position.set(c.x + 10, 40, c.z + 25); d.camera.lookAt(c.x, 0, c.z - 10); });
  for (const s of [0, 0.55, 1.0]) { await page.evaluate((s) => { window.__dublin.groundAOUniforms.uAOStrength.value = s; }, s); await top(); await wait(500); await shot(`ao-top-${s}`); }
}
