// Audio smoke test: nothing loads before a gesture; after a click the context runs, every file in public/audio
// downloads and decodes, and the siren / rain / night / mute toggles move the right gains.
// Usage: node tools/check.mjs tools/scenarios/audio.mjs [--mobile] [--build]
import { LOAD_ORDER } from '../../src/game/audio/assets.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  const fails = [];
  const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };
  const responses = new Map();
  page.on('response', (r) => { const m = r.url().match(/\/audio\/([\w-]+)\.mp3/); if (m) responses.set(m[1], r.status()); });
  const dbg = () => page.evaluate(() => window.__dublin.audio.debug());

  await wait(1500);
  // the dev server can reload the page once while it optimises dependencies: wait for the fresh page's hooks
  await page.waitForFunction(() => window.__dublin && window.__dublin.audio, { timeout: 120000 }).catch(async () => {
    console.log('no audio hook; __dublin keys:', await page.evaluate(() => Object.keys(window.__dublin || {}).join(',')));
  });
  let d = await dbg();
  check(!d.created && responses.size === 0, 'no AudioContext or downloads before a gesture');

  // a real click (touch on --mobile) on the scene
  const vp = page.viewport();
  if (vp && vp.hasTouch) await page.touchscreen.tap(vp.width / 2, vp.height / 3);
  else await page.mouse.click(640, 250);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    d = await dbg();
    if (d.created && d.loaded.length + d.failed.length >= LOAD_ORDER.length) break;
    await wait(250);
  }
  console.log(`audio loaded in ${Date.now() - t0} ms, context ${d.state} @ ${d.sampleRate} Hz`);
  check(d.created, 'AudioContext created after the gesture');
  check(d.state === 'running', `context running (${d.state})`);
  check(d.failed.length === 0, `no failed files ${d.failed.join(', ')}`);
  const missing = LOAD_ORDER.filter((n) => !d.loaded.includes(n));
  check(missing.length === 0, `all ${LOAD_ORDER.length} files decoded${missing.length ? ' (missing ' + missing.join(', ') + ')' : ''}`);
  const bad = [...responses].filter(([, s]) => s !== 200 && s !== 304);
  check(responses.size === LOAD_ORDER.length && !bad.length, `HTTP ${responses.size} files, bad: ${JSON.stringify(bad)}`);

  // engine: revs and gears follow the car
  await wait(500);
  const idle = (await dbg()).engine;
  await page.keyboard.down('w'); await wait(2500);
  const moving = (await dbg()).engine;
  await page.keyboard.up('w');
  console.log('engine idle', JSON.stringify(idle), 'accelerating', JSON.stringify(moving));
  check(idle.rpm < 1000 && moving.rpm > idle.rpm + 300 && moving.gear >= 2, 'engine revs rise and it changes up');

  // siren on / tone cycle / off
  await page.keyboard.press('x'); await wait(600);
  d = await dbg();
  console.log('siren on', JSON.stringify(d.siren));
  check(d.siren.on && d.siren.tone && d.siren.gains[d.siren.tone] > 0.9, 'siren on: its tone is audible');
  const seen = new Set([d.siren.tone]);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('z'); await wait(300); d = await dbg(); seen.add(d.siren.tone); check(d.siren.gains[d.siren.tone] > 0.9, `siren mode ${d.siren.mode}: tone ${d.siren.tone} audible`); }
  check(seen.has('wail') && seen.has('yelp') && seen.has('hilo'), `wail, yelp and hi-lo all played (${[...seen].join(', ')})`);
  await page.keyboard.press('z'); // back to auto
  await page.keyboard.press('x'); await wait(400);
  d = await dbg();
  check(!d.siren.on && Object.values(d.siren.gains).every((g) => g < 0.05), 'siren off: all tones silent');

  // weather and time of day
  const dry = (await dbg()).gains;
  await page.keyboard.press('r'); await wait(4500);
  const wet = (await dbg()).gains;
  console.log('dry', JSON.stringify(dry), '\nrain', JSON.stringify(wet));
  check(dry.rain < 0.05 && wet.rain > 0.3, 'rain loop fades in');
  check(wet.people < dry.people * 0.6, 'people quieter in the rain');
  await page.keyboard.press('r'); await page.keyboard.press('n'); await wait(4500);
  const night = (await dbg()).gains;
  console.log('night', JSON.stringify(night));
  check(night.traffic < dry.traffic * 0.8 && night.people < dry.people * 0.5 && night.nightTone < 5000, 'night bed is sparser and duller');
  await page.keyboard.press('n'); await wait(300);

  // one-shots all play through the pool
  const played = await page.evaluate(() => { const a = window.__dublin.audio; return [['horns', 'single'], ['horns', 'beepbeep'], ['bus', 'hiss'], ['luas', 'gong'], ['crossing', 'go'], ['horns', 'blare'], ['horns', 'double']].map(([f, p]) => a.testPlay(f, p)); });
  check(played.every(Boolean), `one-shots start (${played.join(',')})`);

  // mute toggle
  await page.keyboard.press('v'); await wait(400);
  d = await dbg();
  check(d.master < 0.05, `muted (master ${d.master.toFixed(3)}, ${d.state})`);
  await page.keyboard.press('v'); await wait(500);
  d = await dbg();
  check(d.master > 0.6 && d.state === 'running', `unmuted (master ${d.master.toFixed(3)}, ${d.state})`);

  // let the city run for a while and report what it did on its own
  await wait(8000);
  console.log('events so far', JSON.stringify((await dbg()).events));
  console.log(fails.length ? `\nAUDIO: ${fails.length} checks failed` : '\nAUDIO: all checks passed');
}
