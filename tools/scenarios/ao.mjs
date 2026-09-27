const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  const place = async (k) => { await page.evaluate((k) => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo(k); }, k); await wait(1500); };
  for (const q of (process.env.QS || 'low,high').split(',')) {
    await page.evaluate((q) => window.__dublin.lockQuality(q, 1), q);
    await place('bankOfIreland'); await shot(`${process.env.TAG || ''}ao-dame-${q}`);
    await place('trinity'); await shot(`${process.env.TAG || ''}ao-cg-${q}`);
  }
}
