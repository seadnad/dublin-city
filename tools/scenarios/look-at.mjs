// Free camera shot: LOOK="x,y,z,tx,tz" or LOOKSITE=<extraSites/sites key> with an offset in front of it.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  const keys = (process.env.LOOKSITE || '').split(',').filter(Boolean);
  for (const key of keys) {
    await page.evaluate(async (key) => {
      const d = window.__dublin, s = d.sites[key] || (await import('/src/world/sites.js')).extraSites[key];
      const fx = Math.sin(s.rot), fz = Math.cos(s.rot), dist = Math.max(s.w, 20) * 1.1;
      d.rig.update = () => {};
      d.camera.position.set(s.x + fx * dist - fz * dist * 0.35, 9, s.z + fz * dist + fx * dist * 0.35);
      d.camera.lookAt(s.x, 8, s.z);
    }, key);
    await wait(1200); await shot(`look-${key}`);
  }
}
