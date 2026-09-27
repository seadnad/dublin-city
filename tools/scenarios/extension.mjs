// Screenshots of the extended map: each new landmark from its teleport view, by day and night, plus overheads.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KEYS = ['heuston', 'guinness', 'beckett', 'convention', 'threeArena', 'grandCanal', 'grandCanalSt'];
export default async function (page, shot) {
  await wait(4000);
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const night of [false, true]) {
    if (night) { await page.keyboard.press('n'); await wait(2500); }
    for (const k of KEYS) {
      if (only && !only.includes(k)) continue;
      await page.evaluate((k) => window.__dublin.teleportTo(k), k);
      await wait(1800);
      await shot(`${night ? 'night' : 'day'}-${k}`);
    }
  }
  await page.keyboard.press('n'); await wait(2000);
  if (process.env.OVERHEAD) {
    for (const [name, key, dist] of [['west', 'heuston', 1], ['east', 'convention', 1], ['dock', 'grandCanal', 0.5]]) {
      await page.evaluate((key, dist) => {
        const d = window.__dublin, s = d.sites[key];
        d.rig.update = () => {};
        d.camera.position.set(s.x + 160 * dist, 170 * dist, s.z + 170 * dist); d.camera.lookAt(s.x, 0, s.z);
      }, key, dist);
      await wait(900); await shot(`over-${name}`);
    }
  }
}
