const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const side = (page, dx, dy, dz) => page.evaluate(([dx, dy, dz]) => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; const f = [Math.sin(h), Math.cos(h)], r = [Math.cos(h), -Math.sin(h)]; d.camera.position.set(c.x + f[0] * dz + r[0] * dx, dy, c.z + f[1] * dz + r[1] * dx); d.camera.lookAt(c.x, 0.9, c.z); }, [dx, dy, dz]);
export default async function (page, shot) {
  await wait(4500);
  await page.keyboard.down('w'); await wait(2500); await shot('chase-at-speed'); await page.keyboard.up('w'); await wait(1500);
  await side(page, -4, 1.6, 4.5); await wait(400); await shot('i40-front');
  await side(page, 4.5, 1.8, -5); await wait(300); await shot('i40-rear');
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; });
  await page.keyboard.press('9'); await wait(2500);
  await side(page, -12, 7, -16); await wait(400); await shot('green-trees');
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; });
  await page.keyboard.press('4'); await wait(2000); await shot('quay-trees');
}
