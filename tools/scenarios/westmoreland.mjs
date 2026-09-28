const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  await page.evaluate(() => {
    const d = window.__dublin, A = d.world.nodes.get('WM1'), B = d.world.nodes.get('CG1');
    const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L;
    d.car.teleport(A.x + dx * L * 0.35 + dz * 3, A.z + dz * L * 0.35 - dx * 3, Math.atan2(dx, dz)); d.rig.snap();
  });
  await wait(1500); await shot('westmoreland-south');
}
