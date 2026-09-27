const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.keyboard.press('9'); await wait(4000); await shot('grafton-people');
  await page.keyboard.press('r'); await wait(2500); await shot('grafton-rain');
  await page.evaluate(() => { const d = window.__dublin; const p = d.people.people.slice().sort((a, b) => Math.hypot(a.x - d.car.pos.x, a.z - d.car.pos.z) - Math.hypot(b.x - d.car.pos.x, b.z - d.car.pos.z))[0]; d.rig.mode = 'debug'; d.camera.position.set(p.x + 3, 1.8, p.z + 3); d.camera.lookAt(p.x, 1.1, p.z); });
  await wait(500); await shot('person-close');
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'chase'; });
  await page.keyboard.press('r'); await page.keyboard.press('1'); await wait(3500); await shot('oconnell-people');
}
