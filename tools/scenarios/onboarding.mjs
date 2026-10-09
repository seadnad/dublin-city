// Onboarding and the game menus: the first-visit welcome, the Play menu's three game cards (each puts you in the right
// car and starts hot), the decluttered radar, the world map's landmark toggle and the big shift counters.
// Run: WELCOME=1 node tools/check.mjs tools/scenarios/onboarding.mjs [--mobile [--portrait]]
// (without WELCOME=1 the welcome is forced on after load instead of checked for appearing by itself)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  const fail = (m) => { console.log(`ONBOARDING FAIL: ${m}`); process.exitCode = 1; };
  const model = () => page.evaluate(() => window.__dublin.carMesh().userData.model);
  const tap = (sel) => page.$eval(sel, (e) => e.click()); // (DOM click: works the same for touch and mouse emulation)
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  if (process.env.WELCOME) {
    const ok = await page.waitForFunction(() => window.__dublin.gameUI.welcomeOpen, { timeout: 1000 }).then(() => true, () => false);
    if (!ok) fail('welcome not shown within 1 s of ready');
  } else await page.evaluate(() => window.__dublin.gameUI.welcome(true));
  await wait(600);
  await shot('welcome');
  const cards = await page.$$eval('#welcome .game', (els) => els.map((e) => ({ h: Math.round(e.getBoundingClientRect().height), b: e.querySelector('b').textContent })));
  console.log('welcome cards:', JSON.stringify(cards), 'viewport', JSON.stringify(await page.evaluate(() => [innerWidth, innerHeight])));
  if (cards.length !== 3) fail('welcome needs three game cards');
  const fits = await page.$eval('#welcome .w-card', (e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  if (!fits) console.log('note: welcome card scrolls on this screen');
  await tap('[data-w="skip"]'); await wait(300);
  if (await page.evaluate(() => window.__dublin.gameUI.welcomeOpen)) fail('Just drive did not close the welcome');
  const pulsing = await page.$eval('.toolbar .play-btn', (e) => e.classList.contains('first'));
  console.log('play button pulsing:', pulsing);
  await shot('play-button');

  // the Play menu, with bests saved before Build 2 (same keys) and a streak from yesterday
  await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('dublin.daily.streak', JSON.stringify({ last: y, n: 3, best: 3 }));
    localStorage.setItem('dublin.pursuit.best', JSON.stringify({ caught: 3, score: 812 }));
    localStorage.setItem('dublin.taxi.best', JSON.stringify({ earnings: 64.5, fares: 4, tips: 6.1, night: false }));
  });
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(500);
  const menu = await page.$eval('#play', (e) => e.innerText.replace(/\n+/g, ' | '));
  console.log('menu:', menu.slice(0, 400));
  if (!/3-day streak/.test(menu)) fail('streak not on the Play menu');
  if (!/3 caught · 812 pts/.test(menu) || !/€64\.50/.test(menu)) fail('old saved bests not shown');
  if ((await page.$$('#play .dailies [data-daily], #play .dailies [data-route]')).length !== 3) fail('dailies strip needs three buttons');
  await shot('play-menu');
  await page.$eval('#play', (e) => { e.scrollTop = e.scrollHeight; }); await wait(200);
  await shot('play-menu-garage');
  const garage = await model();

  // Taxi: the taxi, a fare close by, the radar, a fare's takings counting up
  await tap('#play [data-mode="taxi"]');
  if (!(await page.waitForFunction(() => window.__dublin.carMesh().userData.model === 'taxi', { timeout: 60000 }).then(() => true, () => false))) fail('taxi start did not swap to the taxi');
  const hail = await page.evaluate(() => { const d = window.__dublin, f = d.taxi.state.fare; return f && Math.round(Math.hypot(f.pick.x - d.car.pos.x, f.pick.z - d.car.pos.z)); });
  console.log('first fare distance (m):', hail);
  if (!(hail < 90)) fail(`first fare too far (${hail} m)`);
  await wait(1500);
  await shot('taxi-radar');
  await page.evaluate(() => { const d = window.__dublin, s = d.taxi.state.fare.pick.stop; d.car.teleport(s.x, s.z, d.car.heading); d.rig.snap(); });
  await page.waitForFunction(() => window.__dublin.taxi.phase === 'ride', { timeout: 8000 }).catch(() => {});
  await wait(1200);
  await shot('taxi-ride-radar');
  await page.evaluate(() => { const d = window.__dublin, t = d.taxi.state.fare.dest; d.car.teleport(t.x - Math.sin(t.heading) * 3, t.z - Math.cos(t.heading) * 3, t.heading); d.rig.snap(); });
  await page.waitForFunction(() => window.__dublin.taxi.state.fares === 1, { timeout: 8000 }).catch(() => {});
  await wait(250);
  await shot('taxi-counter-pop');
  await wait(1000);
  const counter = await page.$eval('.m-score', (e) => (e.hidden ? '' : e.innerText.replace(/\n/g, ' ')));
  const earned = await page.evaluate(() => window.__dublin.taxi.state.earnings.toFixed(2));
  console.log('taxi counter:', counter, '| bye:', await page.$eval('#say', (e) => (e.hidden ? '' : e.textContent)));
  if (!counter.includes(`€${earned}`)) fail(`counter shows "${counter}", earnings €${earned}`);
  await shot('taxi-counter');

  // world map: landmark icons on, then off (remembered), then back on
  await page.keyboard.press('m'); await wait(800);
  await tap('[data-z="fit"]'); await tap('[data-z="in"]'); await wait(400);
  await shot('worldmap-pins-on');
  await tap('.wm-pins'); await wait(400);
  const saved = await page.evaluate(() => localStorage.getItem('dublin.mapPins'));
  if (saved !== 'false') fail('map pin choice not saved');
  await shot('worldmap-pins-off');
  await tap('.wm-pins'); await wait(200);
  await page.keyboard.press('m'); await wait(400);

  // Pursuit: the Garda car, the suspect close and already running
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(400);
  await tap('#play [data-mode="pursuit"]');
  if (!(await page.waitForFunction(() => /^garda/.test(window.__dublin.carMesh().userData.model), { timeout: 60000 }).then(() => true, () => false))) fail('pursuit start did not swap to the Garda car');
  await wait(1500);
  const p = await page.evaluate(() => { const d = window.__dublin, s = d.pursuit.debug(); return { stage: s.stage, dist: Math.round(Math.hypot(s.suspect.x - d.car.pos.x, s.suspect.z - d.car.pos.z)), callout: s.callout }; });
  console.log('first suspect:', JSON.stringify(p));
  if (p.stage !== 'flee' || p.dist > 260) fail('first suspect is not a hot start');
  await shot('pursuit-radar');
  console.log('pursuit panel:', await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | ')));

  // Time trial: back in the garage car
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(400);
  await tap('#play .game.trial [data-route]');
  await wait(2500);
  const m = await model();
  console.log('trial car:', m, '(garage:', garage, ')');
  if (m !== garage) fail(`trial should use the garage car (${garage}), got ${m}`);
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(false));
  console.log(process.exitCode ? 'ONBOARDING: FAILED' : 'ONBOARDING: OK');
}
