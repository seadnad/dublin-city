// Screenshots of Places (the teleport views) by day and night: PLACES=aras,zoo (site keys; default: all sites).
// NIGHT=0 skips the night pass, NIGHT=only skips the day pass.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(6000);
  const keys = process.env.PLACES ? process.env.PLACES.split(',') : await page.evaluate(() => Object.keys(window.__dublin.sites));
  const passes = process.env.NIGHT === '0' ? [false] : process.env.NIGHT === 'only' ? [true] : [false, true];
  for (const night of passes) {
    if (night) { await page.keyboard.press('n'); await wait(2500); }
    for (const k of keys) {
      await page.evaluate((k) => window.__dublin.teleportTo(k), k);
      await wait(2500);
      await shot(`${night ? 'night' : 'day'}-${k}`);
    }
  }
}
