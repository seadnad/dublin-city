// Helicopter perf A/B: street-level car baseline, then hovering over the centre at 50 / 150 / 250 m with the
// altitude adjustments on and with each one pinned to its street-level value. Quality is locked (the profile's
// tier, dpr <= 1) so the adaptive loop doesn't move under the measurement. Two rounds, interleaved.
// Usage: PERF=1 node tools/check.mjs tools/scenarios/heliperf.mjs [--mobile]    (TIER=high|medium|low to force a tier)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  const tier = process.env.TIER || null;
  console.log('quality', JSON.stringify(await page.evaluate((t) => { const d = window.__dublin, g = d.gfx(); d.lockQuality(t || g.tier, Math.min(g.maxDpr, 1)); return d.gfx(); }, tier)));
  await page.evaluate(() => window.__dublin.teleportTo('oconnellBridge'));
  const measure = async (label) => {
    await wait(2500);
    await page.evaluate(() => window.__dublin.profile());
    const f = await fps(3000);
    const r = await page.evaluate(() => { const d = window.__dublin, s = d.stats(); return { calls: s.calls, tris: s.triangles, prof: d.profile(), shadowExt: d.heliState().shadowExt, far: d.heliState().far }; });
    console.log(label.padEnd(34), String(f).padStart(3), 'fps', JSON.stringify(r));
    return { label, fps: f, ...r };
  };
  const rows = [];
  rows.push(await measure('street, car'));
  await page.evaluate(() => window.__dublin.actions.heli());
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 120000 });
  const hover = (alt) => page.evaluate((alt) => {
    const d = window.__dublin, s = d.sites.oconnellBridge, sp = d.sites.spire;
    const h = Math.atan2(sp.x - s.x, sp.z - s.z), x = s.x - Math.sin(h) * 60, z = s.z - Math.cos(h) * 60;
    d.heli.place(x, d.groundAt(x, z) + alt, z, h); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap();
  }, alt);
  const base = await page.evaluate(() => ({ ...window.__dublin.heliTune }));
  const variants = [['adjusted', base], ['shadow pinned', { ...base, shadow: 0 }], ['far pinned', { ...base, far: 0 }]];
  for (let round = 0; round < (+process.env.ROUNDS || 2); round++) {
    for (const alt of [50, 150, 250]) {
      for (const [name, tune] of variants) {
        await page.evaluate((t) => Object.assign(window.__dublin.heliTune, t), tune);
        await hover(alt);
        rows.push({ alt, variant: name, ...(await measure(`${alt} m ${name} (r${round + 1})`)) });
      }
    }
  }
  await page.evaluate((t) => Object.assign(window.__dublin.heliTune, t), base);
  console.log('SUMMARY', JSON.stringify(rows.map((r) => [r.label, r.fps, r.calls, r.tris])));
}
