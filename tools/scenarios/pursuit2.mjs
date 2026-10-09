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
}
