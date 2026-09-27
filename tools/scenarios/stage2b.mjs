const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  // look at the tram from beside Abbey Street
  const t = await page.evaluate(() => { const d = window.__dublin; const c = d.tram.carriages[0]; return { x: c.x, z: c.z, h: c.heading, s: d.tram.s, dir: d.tram.dir }; });
  console.log('tram', JSON.stringify(t));
  await page.evaluate((t) => { const d = window.__dublin; d.car.teleport(t.x + Math.sin(t.h) * 25 + 6, t.z + Math.cos(t.h) * 25, t.h + Math.PI); d.rig.snap(); }, t);
  await wait(1200); await shot('tram');
  const ai = await page.evaluate(() => window.__dublin.traffic.list.map((a) => [Math.round(a.pos.x), Math.round(a.pos.z), a.speed.toFixed(1), a.edge.way.name]));
  console.log('ai', JSON.stringify(ai.slice(0, 8)));
  await wait(5000);
  const ai2 = await page.evaluate(() => window.__dublin.traffic.list.map((a) => [Math.round(a.pos.x), Math.round(a.pos.z), a.speed.toFixed(1), a.edge.way.name]));
  console.log('ai later', JSON.stringify(ai2.slice(0, 8)));
  // follow an AI car
  await page.evaluate(() => { const d = window.__dublin; const a = d.traffic.list[2]; d.car.teleport(a.pos.x - Math.sin(a.heading) * 12, a.pos.z - Math.cos(a.heading) * 12, a.heading); d.rig.snap(); });
  await wait(800); await shot('follow-ai');
  // drive into the quay wall to test collision
  await page.evaluate(() => { const d = window.__dublin; d.car.teleport(-60, 5, Math.PI); d.rig.snap(); });
  await page.keyboard.down('w'); await wait(3500); await page.keyboard.up('w');
  console.log('after wall', JSON.stringify(await page.evaluate(() => window.__dublin.stats().car)));
  await shot('wall');
}
