// Dublin Taxi: start a shift from the Play menu, then script one fare: teleport behind the waving passenger (hail),
// stop beside them (pickup), drive a little (en route), teleport to the destination's kerb and stop (drop-off), then
// end the shift (summary). Asserts the fare completes and the HUD updates. node tools/check.mjs tools/scenarios/taxi.mjs [--mobile]
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  const fail = (m) => { console.log(`TAXI FAIL: ${m}`); process.exitCode = 1; };
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready, { timeout: 120000 });
  await wait(1500);
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(400);
  await shot('taxi-menu');
  await page.click('[data-mode="taxi"]');
  const swapped = await page.waitForFunction(() => window.__dublin.carMesh().userData.model === 'taxi', { timeout: 90000 }).then(() => true, () => false);
  if (!swapped) return fail(`car not swapped to the taxi (${await page.evaluate(() => window.__dublin.carMesh().userData.model)})`);
  await wait(800);
  const st0 = await page.evaluate(() => window.__dublin.taxi.state);
  console.log(`destinations: ${await page.evaluate(() => window.__dublin.taxi.destinations().length)}`);
  if (st0.phase !== 'hail' || !st0.fare) return fail(`no hail at the start (${st0.phase})`);
  // hail: 22 m back along the kerb, facing the passenger's stop spot
  await page.evaluate(() => {
    const d = window.__dublin, f = d.taxi.state.fare.pick, s = f.stop;
    const L = Math.hypot(f.x - s.x, f.z - s.z), left = { x: (f.x - s.x) / L, z: (f.z - s.z) / L }, dir = { x: -left.z, z: left.x };
    d.car.teleport(s.x - dir.x * 22, s.z - dir.z * 22, Math.atan2(dir.x, dir.z)); d.rig.snap();
  });
  await wait(1200);
  await shot('taxi-hail');
  // pickup: stop right beside them
  await page.evaluate(() => {
    const d = window.__dublin, f = d.taxi.state.fare.pick, s = f.stop;
    const L = Math.hypot(f.x - s.x, f.z - s.z), left = { x: (f.x - s.x) / L, z: (f.z - s.z) / L }, dir = { x: -left.z, z: left.x };
    d.car.teleport(s.x, s.z, Math.atan2(dir.x, dir.z)); d.rig.snap();
  });
  await page.waitForFunction(() => window.__dublin.taxi.phase === 'ride', { timeout: 8000 }).catch(() => {});
  const st1 = await page.evaluate(() => window.__dublin.taxi.state);
  if (st1.phase !== 'ride') return fail(`no pickup (${st1.phase})`);
  await wait(300);
  const bubble = await page.$eval('#say', (e) => (e.hidden ? '' : e.textContent));
  console.log(`pickup: ${st1.fare.dest.name} | "${bubble}"`);
  if (!bubble) fail('no speech bubble on pickup');
  await shot('taxi-pickup');
  // en route: a few seconds of driving
  await page.keyboard.down('w'); await wait(2500); await page.keyboard.up('w');
  const panel = await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | '));
  console.log('en route panel:', panel);
  if (!panel.includes(st1.fare.dest.name) && !/Stop at the kerb/.test(panel)) fail('panel does not name the destination');
  const arrow = await page.$eval('.m-arrow', (e) => !e.hidden);
  if (!arrow) fail('no direction arrow');
  await shot('taxi-enroute');
  // drop-off: at the destination's kerb spot, stopped
  await page.evaluate(() => {
    const d = window.__dublin, t = d.taxi.state.fare.dest;
    d.car.teleport(t.x - Math.sin(t.heading) * 3, t.z - Math.cos(t.heading) * 3, t.heading); d.rig.snap();
  });
  await page.waitForFunction(() => window.__dublin.taxi.state.fares === 1, { timeout: 8000 }).catch(() => {});
  const st2 = await page.evaluate(() => window.__dublin.taxi.state);
  if (st2.fares !== 1 || !(st2.earnings > 0)) return fail(`fare did not complete (${JSON.stringify(st2)})`);
  await wait(300);
  const panel2 = await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | '));
  const bye = await page.$eval('#say', (e) => (e.hidden ? '' : e.textContent));
  console.log(`drop-off: €${st2.earnings.toFixed(2)} | "${bye}" | panel: ${panel2}`);
  if (!/1 fare\b/.test(panel2) || !panel2.includes(`€${st2.earnings.toFixed(2)}`)) fail('HUD did not update after the drop-off');
  await shot('taxi-dropoff');
  // world map with the next fare's marker
  await page.waitForFunction(() => window.__dublin.taxi.phase === 'hail', { timeout: 8000 }).catch(() => {});
  await page.keyboard.press('m'); await wait(800);
  await shot('taxi-worldmap');
  await page.keyboard.press('m'); await wait(400);
  // shift summary
  await page.evaluate(() => window.__dublin.taxi.setClock(0));
  await page.waitForFunction(() => !document.getElementById('results').hidden, { timeout: 5000 }).catch(() => {});
  const res = await page.$eval('#results', (e) => (e.hidden ? '' : e.innerText.replace(/\n+/g, ' | ')));
  console.log('summary:', res);
  if (!/Shift over/.test(res)) fail('no shift summary');
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('dublin.taxi.best') || 'null'));
  if (!best || best.fares !== 1) fail('best shift not saved');
  await shot('taxi-summary');
  console.log(process.exitCode ? 'TAXI: FAILED' : 'TAXI: OK');
}
