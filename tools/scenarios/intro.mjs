// Films the aerial intro: reloads with ?intro (so automation doesn't skip it) and screenshots through the load,
// the pan to the start and the descent into the chase view.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  const url = page.url().replace(/[?#].*$/, '') + '?intro';
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const log = [];
  let n = 0, readyAt = null;
  while (Date.now() - t0 < 60000) {
    const s = await page.evaluate(() => ({ step: document.querySelector('#intro-ui .step')?.textContent, ready: !!(window.__dublin && window.__dublin.ready), intro: !!window.__intro }));
    log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s.intro ? s.step : '(intro gone)'}${s.ready ? ' READY' : ''}`);
    if (n < 12 && (n < 3 || !s.intro || s.step === 'Ready')) { await shot(`intro-${String(n).padStart(2, '0')}`); n++; }
    else if (n < 12 && Date.now() - t0 > n * 2500) { await shot(`intro-${String(n).padStart(2, '0')}`); n++; }
    if (s.ready && readyAt === null) readyAt = Date.now();
    if (readyAt && Date.now() - readyAt > 1500) break;
    await wait(n < 12 && s.step === 'Ready' ? 350 : 700);
  }
  console.log('INTRO LOG\n' + log.join('\n'));
}
