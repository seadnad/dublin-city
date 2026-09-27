const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const car = (page) => page.evaluate(() => { const c = window.__dublin.car; return { kmh: Math.round(c.speed * 3.6), slip: +c.slip.toFixed(2), head: +c.heading.toFixed(2), boost: +c.boost.toFixed(2) }; });
// O'Connell Street, left lane heading north from the bridge: ~450 m dead straight
const start = (page, dh = 0, v = 0) => page.evaluate(([dh, v]) => { const d = window.__dublin, w = d.world; const a = w.nodes.get('NQ8'), b = w.nodes.get('OC4'); const h = Math.atan2(b.x - a.x, b.z - a.z); d.car.teleport(a.x + Math.cos(h) * 7 + Math.sin(h) * 10, a.z - Math.sin(h) * 7 + Math.cos(h) * 10, h + dh); d.car.vel.x = Math.sin(h + dh) * v; d.car.vel.z = Math.cos(h + dh) * v; d.rig.snap(); }, [dh, v]);
export default async function (page, shot) {
  await wait(3000);
  await start(page);
  const t0 = Date.now(); let at100 = null;
  await page.keyboard.down('w');
  for (let i = 0; i < 60; i++) { await wait(100); const c = await car(page); if (!at100 && c.kmh >= 100) { at100 = ((Date.now() - t0) / 1000).toFixed(1); break; } }
  console.log('0-100 km/h in', at100, 's');
  await start(page, 0, 20); await wait(600);
  await page.keyboard.down('a'); await wait(300); await page.keyboard.up('a'); await wait(300);
  await page.keyboard.down('d'); await wait(300); await page.keyboard.up('d'); await wait(400);
  console.log('lane change at ~75 km/h', JSON.stringify(await car(page)));
  await start(page, 0, 16); await wait(300);
  await page.keyboard.down(' '); await page.keyboard.down('d'); await wait(650);
  console.log('handbrake drift', JSON.stringify(await car(page)));
  await page.keyboard.up(' '); await page.keyboard.up('d'); await wait(150);
  console.log('released', JSON.stringify(await car(page)));
  await page.keyboard.up('w');
  await start(page, -0.3, 22); // angled toward the buildings on the left
  await page.keyboard.down('w'); await wait(1800); await page.keyboard.up('w');
  console.log('after glancing a facade at 80 km/h', JSON.stringify(await car(page)));
}
