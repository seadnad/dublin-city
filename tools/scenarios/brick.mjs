const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5000);
  // Merrion Square North, camera low and looking along the Georgian terrace (glancing angle, like the phone shots)
  await page.evaluate(() => { const d = window.__dublin; const a = d.world.nodes.get('MSNW'), b = d.world.nodes.get('MSNE'); const h = Math.atan2(b.x - a.x, b.z - a.z); d.car.teleport(a.x + (b.x - a.x) * 0.3 + Math.cos(h) * 2.6, a.z + (b.z - a.z) * 0.3 - Math.sin(h) * 2.6, h + 0.25); d.rig.snap(); });
  await wait(2000); await shot(`${process.env.TAG || ''}brick-glancing`);
  await page.evaluate(() => window.__dublin.teleportTo('trinity')); await wait(2000); await shot(`${process.env.TAG || ''}brick-dame`);
}
