const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (page, dx, dy, dz, ly = 0.8) => page.evaluate(([dx, dy, dz, ly]) => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; const f = [Math.sin(h), Math.cos(h)], r = [Math.cos(h), -Math.sin(h)]; d.camera.position.set(c.x + f[0] * dz + r[0] * dx, dy, c.z + f[1] * dz + r[1] * dx); d.camera.lookAt(c.x, ly, c.z); }, [dx, dy, dz, ly]);
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1500);
  await view(page, -3.8, 1.5, 4.5); await wait(700); await shot(`${process.env.TAG || ''}garda-front34`);
  await view(page, 4.2, 1.7, -4.8); await wait(300); await shot(`${process.env.TAG || ''}garda-rear34`);
  await view(page, 5.5, 1.0, 0.3); await wait(300); await shot(`${process.env.TAG || ''}garda-side`);
  await page.keyboard.press('x'); await wait(250);
  await view(page, -2.5, 2.6, 3.5, 1.3); await wait(200); await shot(`${process.env.TAG || ''}garda-siren`);
  await page.keyboard.press('x');
  await page.keyboard.press('n'); await wait(1500); await page.keyboard.press('x'); await wait(300);
  await view(page, -3.8, 1.5, 4.5); await wait(200); await shot(`${process.env.TAG || ''}garda-night-siren`);
}
