// O'Connell Street review shots in street coordinates (docs/research/oconnell-street.md): each view is
// [chainage, offset, eye, targetChainage, targetOffset, targetY, name], chainage in game m from the quay (NQ8) north,
// offset + to the WEST (left of northward travel). A view may instead be [[x, z], eye, [x, z], y, name] (world).
// VIEWS='[...]' overrides the default set; NIGHT=1 switches to night first; FPS=1 measures each view.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT = [
  [4, 9, 1.3, 60, 9, 6, 'up-from-bridge-west'],
  [60, 9, 1.3, 140, 6, 7, 'up-lower-west'],
  [150, 9, 1.3, 240, 7, 7, 'up-upper-west'],
  [268, -9, 1.3, 180, -9, 7, 'down-from-parnell-east'],
  [180, -9, 1.3, 110, -9, 7, 'down-upper-east'],
  [100, -9, 1.3, 20, -9, 6, 'down-lower-east'],
  [88, 17.5, 1.7, 86, -20, 11, 'gpo-at-clerys'],
  [70, 4, 1.4, 86, -24, 10, 'clerys-oblique'],
  [196, 10, 1.4, 216, -24, 10, 'gresham'],
  [175, 9, 1.4, 195, -24, 9, 'savoy'],
  [62, -9, 1.4, 50, 26, 9, 'easons'],
  [178, -10, 1.4, 186, 24, 9, 'carlton'],
];
export default async function (page, shot, { fps } = {}) {
  await wait(8000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(3000); }
  const views = process.env.VIEWS ? JSON.parse(process.env.VIEWS) : DEFAULT;
  for (const v of views) {
    const name = v[v.length - 1];
    await page.evaluate(async (v) => {
      const d = window.__dublin, oc = await import('/src/world/oconnell.js');
      let A, B, eye, ty;
      if (typeof v[0] === 'string') { // ['buildingId', distance out from its front, sideways along it, eye, lookY, name]
        const { OCS } = await import('/src/world/sites.js'), b = OCS.buildings.find((q) => q.id === v[0]), f = b.frame;
        A = { x: f.x - f.n.x * v[1] + f.d.x * v[2], z: f.z - f.n.z * v[1] + f.d.z * v[2] }; B = { x: f.x, z: f.z }; eye = v[3]; ty = v[4];
      } else if (Array.isArray(v[0])) { A = { x: v[0][0], z: v[0][1] }; eye = v[1]; B = { x: v[2][0], z: v[2][1] }; ty = v[3]; }
      else { A = oc.along(v[0], v[1]); eye = v[2]; B = oc.along(v[3], v[4]); ty = v[5]; }
      d.rig.update = () => {};
      d.camera.position.set(A.x, eye, A.z);
      d.camera.lookAt(B.x, ty, B.z);
    }, v);
    await wait(1400);
    await shot(name);
    if (process.env.FPS && fps) console.log('fps', name, await fps(2500));
  }
}
