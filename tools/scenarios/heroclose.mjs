// Close views of a hero landmark: SITE=<sites key>; shots from its side, three-quarter and deck level.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(7000);
  await page.evaluate(() => window.__dublin.lockQuality('high', 1));
  const key = process.env.SITE || 'hapenny';
  const views = JSON.parse(process.env.VIEWS || '[["side",26,0,3,0],["three-quarter",16,14,4,0],["deck",0,-14,2.4,3],["under",12,6,-1.5,0]]');
  for (const [name, side, along, h, lookY] of views) {
    await page.evaluate(async ([key, side, along, h, lookY]) => {
      const d = window.__dublin, s = d.sites[key];
      const fx = Math.sin(s.rot), fz = Math.cos(s.rot), rx = Math.cos(s.rot), rz = -Math.sin(s.rot);
      d.rig.update = () => {};
      d.camera.position.set(s.x + rx * side + fx * along, h, s.z + rz * side + fz * along);
      d.camera.lookAt(s.x, lookY || 1.5, s.z);
    }, [key, side, along, h, lookY]);
    await wait(900); await shot(`${key}-${name}`);
  }
}
