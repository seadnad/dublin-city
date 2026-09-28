// GPO review: from across O'Connell Street, close under the portico, and a three-quarter view.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  for (const [name, dist, side, h, ty] of [['front', 40, 0, 4, 9], ['portico', 16, 0.15, 2, 8], ['three-quarter', 45, 0.9, 6, 9]]) {
    await page.evaluate((dist, side, h, ty) => {
      const d = window.__dublin, s = d.sites.gpo, fx = Math.sin(s.rot), fz = Math.cos(s.rot);
      const cx = s.x + fx * s.d / 2, cz = s.z + fz * s.d / 2; // centre of the portico front
      d.rig.update = () => {};
      d.camera.position.set(cx + fx * dist + fz * dist * side, h, cz + fz * dist - fx * dist * side);
      d.camera.lookAt(cx, ty, cz);
    }, dist, side, h, ty);
    await wait(1200); await shot(`gpo-${name}`);
  }
}
