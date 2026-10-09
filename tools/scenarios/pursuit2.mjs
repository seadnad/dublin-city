// Garda Pursuit (callouts, PIT, arrest, backup, roadblock, foot chase). Run: node tools/check.mjs tools/scenarios/pursuit2.mjs [--mobile]
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  const dbg = () => page.evaluate(() => window.__dublin.pursuit.debug());
  const log = async (tag) => { const d = await dbg(); console.log(tag, JSON.stringify({ stage: d.stage, level: d.level, caught: d.caught, score: d.score, dmg: +d.damage.toFixed(2), arrest: +d.arrestT.toFixed(2), pits: d.pits, spd: d.suspect && +d.suspect.speed.toFixed(1), backups: d.backups.length, roadblock: !!d.roadblock })); return d; };
  // put the player relative to the suspect: `ahead` metres along its heading, `left` to its left, facing the same way
  const near = (ahead, left, opts = {}) => page.evaluate(({ ahead, left, opts }) => {
    const d = window.__dublin, s = d.pursuit.debug().suspect, fx = Math.sin(s.heading), fz = Math.cos(s.heading);
    d.car.teleport(s.x + fx * ahead + fz * left, s.z + fz * ahead - fx * left, s.heading);
    if (opts.vel) { d.car.vel.x = fx * opts.vel[0] + fz * opts.vel[1]; d.car.vel.z = fz * opts.vel[0] - fx * opts.vel[1]; d.car.speed = opts.vel[0]; }
    d.rig.snap();
  }, { ahead, left, opts });

  await page.keyboard.press('g'); await wait(400);
  await page.click('[data-mode="pursuit"]'); await wait(1200);
  const c = await log('callout');
  console.log('CALLOUT', c.callout, c.kind);
  await shot('pursuit2-callout');

  // respond: arrive behind them (the siren makes them run)
  await near(-14, 0); await wait(600);
  await log('spotted');
  // a scripted PIT: alongside the rear quarter on their left, moving with them and edging in
  let pits = 0;
  for (let i = 0; i < 6 && !pits; i++) {
    const d = await dbg();
    const v = Math.max(9, d.suspect.speed);
    await near(-2.2, 1.95, { vel: [v + 1, -4] });
    await wait(250);
    pits = (await log(`pit try ${i}`)).pits;
    if (!pits) await wait(500);
  }
  console.log('PIT', pits ? 'ok' : 'FAILED');
  await wait(300); await shot('pursuit2-pit');
  // box them in: stop just in front of the stalled car until the arrest completes
  let done = false;
  for (let i = 0; i < 40 && !done; i++) {
    const d = await dbg();
    if (d.stage === 'beat' || d.caught > 0) { done = true; break; }
    await near(4.6, 0.6); await wait(250);
    if (i === 6) await shot('pursuit2-boxin');
  }
  await wait(400);
  const a = await log('arrest');
  await shot('pursuit2-arrest');
  console.log('ROUND', a.caught === 1 ? 'COMPLETE' : 'NOT COMPLETE');
  await wait(3500);
  await log('next call');

  // escalation: round 4 with backup and a roadblock
  await page.evaluate(() => { const p = window.__dublin.pursuit; p.stop(); p.start({ level: 3 }); });
  await wait(500);
  await near(-16, 0); await wait(500);
  for (let i = 0; i < 24; i++) { await near(-18, 0); await wait(700); const d = await dbg(); if (d.backups.some((u) => Math.hypot(u.x - d.suspect.x, u.z - d.suspect.z) < 45)) break; }
  const b = await log('backup');
  const bd = await page.evaluate(() => { const d = window.__dublin.pursuit.debug(); return d.backups.map((u) => Math.round(Math.hypot(u.x - d.suspect.x, u.z - d.suspect.z))); });
  console.log('BACKUP distances to suspect', JSON.stringify(bd));
  await near(-20, 0); await wait(200);
  await shot('pursuit2-backup');
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log('FPS with backup', fps, 'backups', b.backups.length);

  await page.evaluate(() => window.__dublin.pursuit._force.roadblock());
  const rb = (await dbg()).roadblock;
  if (rb) {
    await page.evaluate((rb) => { const d = window.__dublin, s = d.pursuit.debug().suspect; const h = Math.atan2(rb.x - s.x, rb.z - s.z); d.car.teleport(rb.x - Math.sin(h) * 13, rb.z - Math.cos(h) * 13, h); d.rig.snap(); }, rb);
    await wait(500); await shot('pursuit2-roadblock');
  } else console.log('ROADBLOCK not placed');

  // foot chase: they ditch the car; stop beside them
  await page.evaluate(() => window.__dublin.pursuit._force.bail());
  await near(-9, 0); await wait(1500); await shot('pursuit2-onfoot');
  for (let i = 0; i < 30; i++) {
    const d = await dbg();
    if (d.stage !== 'foot') break;
    await page.evaluate(() => { const d = window.__dublin, r = d.pursuit.debug().runner; d.car.teleport(r.x + 2.5, r.z, d.car.heading); });
    await wait(200);
  }
  const f = await log('foot arrest');
  console.log('FOOT', f.caught === 1 ? 'ARRESTED' : 'NOT ARRESTED');
  await wait(300); await shot('pursuit2-foot-arrest');

  // ---- Build 2: heat HUD, arrest streak, medals, results, share, retry, Daily Callouts ----
  const fail = (m) => { console.log(`PURSUIT2 FAIL: ${m}`); process.exitCode = 1; };
  await wait(3200); // (the arrest beat, then the next call at a higher heat)
  const heat = await page.$eval('#mission .m-heat', (e) => e.innerText.replace(/\n/g, ' '));
  console.log('heat HUD:', heat);
  if (!/HEAT \d · [A-Z]/.test(heat) || !/\+60 s/.test(heat)) fail('heat row missing from the HUD');
  await shot('pursuit2-heat-hud');
  await page.evaluate(() => { const p = window.__dublin.pursuit; p.stop(); p.start(); });
  await wait(500);
  const pts = [];
  for (let i = 0; i < 2; i++) {
    const s0 = (await dbg()).score;
    await page.evaluate(() => window.__dublin.pursuit._force.arrest()); await wait(100);
    const s1 = await dbg();
    pts.push(s1.score - s0);
    if (i === 1) console.log('arrest banner:', await page.$eval('#p-banner', (e) => e.innerText.replace(/\n/g, ' ')), '| chain', s1.chain);
    await wait(3000);
  }
  console.log('arrest points:', JSON.stringify(pts), 'heat now', (await dbg()).heat);
  if ((await dbg()).chain !== 2) fail('arrest streak not counted');
  await page.evaluate(() => window.__dublin.pursuit._force.clock(0)); await wait(300);
  await page.waitForFunction(() => !document.getElementById('results').hidden, { timeout: 5000 }).catch(() => {});
  const res = await page.$eval('#results', (e) => (e.hidden ? '' : e.innerText.replace(/\n+/g, ' | ')));
  const sum = await page.evaluate(() => window.__dublin.gameUI.lastRun), share = await page.evaluate(() => window.__dublin.gameUI.lastShare);
  console.log('results:', res); console.log('summary:', JSON.stringify(sum)); console.log(`share (${share.length}):`, JSON.stringify(share));
  if (!/🥉/.test(res) || !/off silver/.test(res) || !/Next target/.test(res)) fail('results: bronze medal / how-close lines');
  if (!sum || sum.mode !== 'pursuit' || sum.stats.arrests !== 2 || sum.events.stopped !== 2 || sum.log.length !== 2) fail('run summary');
  if (!share || share.length >= 200 || !/2 arrests/.test(share) || !/🚔🚔/.test(share)) fail('share text');
  await shot('pursuit2-results');
  const t0 = Date.now();
  await page.click('#results [data-r="retry"]');
  await page.waitForFunction(() => window.__dublin.pursuit.active, { timeout: 1500 }).catch(() => {});
  console.log('retry (ms):', Date.now() - t0);
  if (!(await page.evaluate(() => window.__dublin.pursuit.active))) fail('retry did not restart within 1.5 s');

  // Daily Callouts: the same calls on the same streets, twice
  const DATE = '2026-10-09';
  const [p1, p2] = await page.evaluate((D) => [window.__dublin.pursuit.previewDaily(D, 3), window.__dublin.pursuit.previewDaily(D, 3)], DATE);
  console.log('daily plan:', JSON.stringify(p1.calls.map((c) => `${c.crime} @ ${c.way}`)));
  if (JSON.stringify(p1) !== JSON.stringify(p2)) fail('daily callout plan is not deterministic');
  const runs = [];
  for (let r = 0; r < 2; r++) {
    await page.evaluate((D) => { const p = window.__dublin.pursuit; p.stop(); p.start({ variant: 'daily', date: D }); }, DATE);
    await wait(300);
    if (r === 0) await shot('pursuit2-daily-start');
    for (let i = 0; i < 2; i++) { await page.evaluate(() => window.__dublin.pursuit._force.arrest()); await wait(3000); }
    runs.push(await page.evaluate(() => window.__dublin.pursuit.callPlanLog));
  }
  console.log('daily played:', JSON.stringify(runs[0].map((c) => `${c.crime} @ ${c.way}`)));
  if (JSON.stringify(runs[0]) !== JSON.stringify(runs[1]) || JSON.stringify(runs[0]) !== JSON.stringify(p1.calls)) fail('daily callouts differ between runs or from the plan');
  await page.evaluate(() => window.__dublin.pursuit._force.clock(0)); await wait(300);
  await page.waitForFunction(() => !document.getElementById('results').hidden, { timeout: 5000 }).catch(() => {});
  const dsum = await page.evaluate(() => window.__dublin.gameUI.lastRun);
  console.log('daily results:', await page.$eval('#results', (e) => e.innerText.replace(/\n+/g, ' | ')), '| share', JSON.stringify(await page.evaluate(() => window.__dublin.gameUI.lastShare)));
  if (!dsum || dsum.variant !== 'daily' || dsum.date !== DATE) fail('daily summary');
  await shot('pursuit2-daily-results');
  console.log(process.exitCode ? 'PURSUIT2: FAILED' : 'PURSUIT2: OK');
}
