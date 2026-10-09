const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.keyboard.press('g'); await wait(500); await shot('play-menu');
  await page.click('[data-mode="pursuit"]'); await wait(1500); await shot('pursuit-start');
  // cheat for the test: drive toward the suspect by teleporting behind it, then hold throttle
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { const d = window.__dublin; const s = d.pursuit.blips()[0]; if (!s) return; const dx = s.x - d.car.pos.x, dz = s.z - d.car.pos.z, L = Math.hypot(dx, dz); if (L > 30) { d.car.teleport(s.x - dx / L * 12, s.z - dz / L * 12, Math.atan2(dx, dz)); d.rig.snap(); } });
    await page.keyboard.down('w'); await wait(700); await page.keyboard.up('w');
  }
  await shot('pursuit-close');
  const m = await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | '));
  console.log('mission panel:', m);
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(300);
  await page.click('[data-route="liffey"]'); await wait(1200); await shot('trial-countdown');
  await wait(3000); await page.keyboard.down('w'); await wait(2500); await page.keyboard.up('w');
  await shot('trial-running');
  console.log('trial panel:', await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | ')));

  // Build 2: finish the trial (hop through the checkpoints), how-close lines and the share card, then a quick retry
  const fail = (m) => { console.log(`MODES FAIL: ${m}`); process.exitCode = 1; };
  const finishTrial = async () => {
    for (let i = 0; i < 200; i++) {
      const done = await page.evaluate(() => { const d = window.__dublin; if (!d.trial.active) return true; const b = d.trial.blips()[0]; if (b) d.car.teleport(b.x, b.z, d.car.heading); return false; });
      if (done) break;
      await wait(120);
    }
    await page.waitForFunction(() => !document.getElementById('results').hidden, { timeout: 5000 }).catch(() => {});
    return page.$eval('#results', (e) => (e.hidden ? '' : e.innerText.replace(/\n+/g, ' | ')));
  };
  const r1 = await finishTrial();
  console.log('trial results 1:', r1);
  // retry: the 1.5 s countdown, running again well inside 1.5 s of the tap
  const t0 = Date.now();
  await page.click('#results [data-r="retry"]');
  await page.waitForFunction(() => window.__dublin.trial.active, { timeout: 1500 }).catch(() => {});
  const ms = Date.now() - t0;
  console.log('trial retry (ms):', ms);
  if (!(await page.evaluate(() => window.__dublin.trial.active))) fail('trial retry');
  await wait(1700);
  const r2 = await finishTrial();
  const share = await page.evaluate(() => window.__dublin.gameUI.lastShare), sum = await page.evaluate(() => window.__dublin.gameUI.lastRun);
  console.log('trial results 2:', r2); console.log(`share (${share.length}):`, JSON.stringify(share)); console.log('summary:', JSON.stringify(sum));
  if (!/New best|off your best|Level with your best/.test(r2) || !/Next target|Gold medal/.test(r2)) fail('trial how-close lines');
  if (!share || share.length >= 200 || !/Liffey Loop/.test(share)) fail('trial share');
  if (!sum || sum.mode !== 'trial' || sum.variant !== 'liffey' || sum.scoreKind !== 'time' || !sum.log.length) fail('trial summary');
  await page.click('#results [data-r="share"]'); await wait(400);
  await shot('trial-results-share');
  console.log(process.exitCode ? 'MODES: FAILED' : 'MODES: OK');
}
