const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.keyboard.press('6'); await wait(500);
  for (const q of ['medium', 'high']) { await page.evaluate((q) => window.__dublin.lockQuality(q, 1), q); await wait(1500); await shot(`dame-${q}`); }
  await page.keyboard.press('n'); await wait(1500); await shot('dame-evening-high');
}
