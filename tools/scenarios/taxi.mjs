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
  await wait(1000); // (the takings counter counts up for 0.7 s)
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
  if (!/Taxi: €/.test(res)) fail('no shift summary');
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('dublin.taxi.casual.best') || 'null'));
  if (!best || best.fares !== 1) fail('best shift not saved');
  if (!/off your best|First run|New best/.test(res) || !/off (bronze|silver|gold)|Gold medal/.test(res) || !/Next target/.test(res)) fail('no how-close lines / next target on the results');
  await shot('taxi-summary');

  // ---- Build 2: run summary, share card, instant retry, the fixed shifts, the Daily Shift ----
  const sum = await page.evaluate(() => window.__dublin.gameUI.lastRun);
  console.log('run summary:', JSON.stringify(sum));
  for (const k of ['v', 'mode', 'variant', 'board', 'date', 'seed', 'duration', 'score', 'scoreKind', 'medal', 'stats', 'events', 'log', 'endedAt']) if (!(k in (sum || {}))) fail(`run summary lacks ${k}`);
  if (sum && (sum.mode !== 'taxi' || sum.variant !== 'casual' || sum.stats.fares !== 1 || sum.log.length !== 1)) fail('run summary content');
  if (sum && !(sum.stats.timeAdded >= 8)) fail('casual taxi: no time added for the fare');
  await page.click('#results [data-r="share"]'); await wait(500);
  const share = await page.evaluate(() => window.__dublin.gameUI.lastShare);
  const shown = await page.$eval('#results .r-sharetext', (e) => (e.hidden ? '' : e.value));
  console.log(`share (${share.length} chars): ${JSON.stringify(share)} | shown: ${!!shown}`);
  if (!share || share.length >= 200) fail('share text missing or too long');
  if (!/Dublin Drive/.test(share) || !/€\d/.test(share) || !share.includes(await page.evaluate(() => location.origin))) fail('share text lacks the name / score / link');
  if (/@|seadn|user|localStorage/i.test(share)) fail('share text has something personal-looking in it');
  await shot('taxi-share');
  // retry: Enter, and the shift is running again within 1.5 s
  const t0 = Date.now();
  // (desktop: the Enter key; phones: a tap on Try again, as the share sheet may still be up)
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) await page.$eval('#results [data-r="retry"]', (e) => e.click()); else await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__dublin.taxi.active && document.getElementById('results').hidden, { timeout: 1500 }).catch(() => {});
  const retryMs = Date.now() - t0;
  console.log('retry (ms):', retryMs, 'variant', await page.evaluate(() => window.__dublin.taxi.variant));
  if (!(await page.evaluate(() => window.__dublin.taxi.active)) || retryMs > 1500) fail('retry did not restart the shift within 1.5 s');
  // the fixed shifts
  for (const [sel, clk] of [['taxi6', 360], ['taxi15', 900]]) {
    await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(300);
    await page.click(`#play [data-mode="${sel}"]`); await wait(300);
    const s = await page.evaluate(() => window.__dublin.taxi.state);
    console.log(sel, s.variant, Math.round(s.clock));
    if (Math.round(s.clock) < clk - 2) fail(`${sel}: clock ${s.clock}`);
  }
  // Daily Shift determinism: the plan for one date twice, then two real runs on that date follow it
  const DATE = '2026-10-09';
  const [p1, p2, p3] = await page.evaluate((D) => [window.__dublin.taxi.previewDaily(D, 5), window.__dublin.taxi.previewDaily(D, 5), window.__dublin.taxi.previewDaily('2026-10-10', 5)], DATE);
  console.log('daily plan:', JSON.stringify(p1.fares.map((f) => f.dest)), '| next day:', JSON.stringify(p3.fares.map((f) => f.dest)));
  if (JSON.stringify(p1) !== JSON.stringify(p2) || p1.fares.length !== 5) fail('daily fare plan is not deterministic');
  if (JSON.stringify(p1) === JSON.stringify(p3)) fail('two dates gave the same daily');
  const played = [];
  for (let run = 0; run < 2; run++) {
    await page.evaluate((D) => { const d = window.__dublin; d.taxi.stop(); d.taxi.start({ variant: 'daily', date: D }); }, DATE);
    const seq = [];
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => window.__dublin.taxi.phase === 'hail', { timeout: 8000 }).catch(() => {});
      const pk = await page.evaluate(() => { const d = window.__dublin, f = d.taxi.state.fare.pick, s = f.stop; d.car.teleport(s.x, s.z, d.car.heading); return { x: +f.x.toFixed(2), z: +f.z.toFixed(2) }; });
      await page.waitForFunction(() => window.__dublin.taxi.phase === 'ride', { timeout: 8000 }).catch(() => {});
      const dest = await page.evaluate(() => { const d = window.__dublin, t = d.taxi.state.fare.dest; d.car.teleport(t.x - Math.sin(t.heading) * 3, t.z - Math.cos(t.heading) * 3, t.heading); return t.key; });
      await page.waitForFunction((n) => window.__dublin.taxi.state.fares === n, { timeout: 8000 }, i + 1).catch(() => {});
      seq.push({ pick: pk, dest });
    }
    played.push(seq);
    if (run === 0) { await page.evaluate(() => window.__dublin.rig.snap()); await wait(300); await shot('taxi-daily-hud'); }
  }
  console.log('daily played:', JSON.stringify(played.map((s) => s.map((f) => f.dest))));
  const planned = p1.fares.slice(0, 3);
  if (JSON.stringify(played[0]) !== JSON.stringify(played[1]) || JSON.stringify(played[0]) !== JSON.stringify(planned)) fail('daily shift runs differ from each other or from the plan');
  // end the daily: the streak, the per-date best, a dated share card
  await page.evaluate(() => window.__dublin.taxi.setClock(0));
  await page.waitForFunction(() => !document.getElementById('results').hidden, { timeout: 8000 }).catch(() => {});
  const dres = await page.$eval('#results', (e) => e.innerText.replace(/\n+/g, ' | '));
  const dsum = await page.evaluate(() => window.__dublin.gameUI.lastRun);
  const dshare = await page.evaluate(() => window.__dublin.gameUI.lastShare);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('dublin.daily.streak') || 'null'));
  console.log('daily results:', dres, '| streak', JSON.stringify(st), '| share', JSON.stringify(dshare));
  if (!dsum || dsum.variant !== 'daily' || dsum.date !== DATE || typeof dsum.seed !== 'number') fail('daily run summary');
  if (!st || st.last !== DATE || !(st.n >= 1)) fail('daily streak not recorded');
  if (!/9 Oct/.test(dshare) || dshare.length >= 200) fail('daily share text');
  await shot('taxi-daily-results');
  console.log(process.exitCode ? 'TAXI: FAILED' : 'TAXI: OK');
}
