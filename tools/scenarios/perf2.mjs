const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(5000);
  for (const view of ['start', '1']) {
    if (view !== 'start') await page.keyboard.press(view);
    for (const q of ['low', 'medium', 'high']) {
      await page.evaluate((q) => window.__dublin.lockQuality(q, 1), q);
      await wait(1200);
      console.log(`${view === 'start' ? "O'Connell St" : 'Spire view'}  ${q.padEnd(7)} dpr1 @1280x720: ${await fps(2500)} fps`);
    }
  }
}
