// Close-ups of the Garda car's nose, tail and flank (orbit camera round the parked car).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const orbit = (page, dx, dy, dz, ly = 0.7) => page.evaluate(([dx, dy, dz, ly]) => {
  const d = window.__dublin; d.rig.mode = 'debug';
  const c = d.car.pos, h = d.car.heading, f = [Math.sin(h), Math.cos(h)], r = [Math.cos(h), -Math.sin(h)];
  d.camera.position.set(c.x + f[0] * dz + r[0] * dx, dy, c.z + f[1] * dz + r[1] * dx);
  d.camera.lookAt(c.x + f[0] * dz * 0.45, ly, c.z + f[1] * dz * 0.45);
}, [dx, dy, dz, ly]);
export default async function (page, shot) {
  await wait(6000);
  await page.evaluate(() => window.__dublin.lockQuality('high', 1));
  if (process.env.RP) { await page.evaluate(() => window.__dublin.actions.car('garda_rp')); await wait(2500); }
  await page.evaluate(() => {
    const d = window.__dublin, A = d.world.nodes.get('SQ8'), B = d.world.nodes.get('WM1');
    const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L;
    d.car.teleport(A.x + dx * L * 0.45 + dz * 3, A.z + dz * L * 0.45 - dx * 3, Math.atan2(dx, dz)); d.rig.snap();
  });
  await wait(2500);
  await orbit(page, -1.6, 1.1, 4.2); await wait(500); await shot('close-nose');
  await orbit(page, 1.4, 1.3, -4.4, 0.8); await wait(300); await shot('close-tail');
  await orbit(page, 3.2, 1.2, 0.6, 0.8); await wait(300); await shot('close-flank');
}
