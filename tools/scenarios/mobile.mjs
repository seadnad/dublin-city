const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await shot('mobile-landscape');
  // press the gas button via touch
  const box = await page.$eval('[data-k="gas"]', (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.touchscreen.touchStart(box.x, box.y); await wait(2000); await page.touchscreen.touchEnd();
  console.log('after touch gas', JSON.stringify(await page.evaluate(() => window.__dublin.stats().car)));
  await shot('mobile-driving');
  await page.evaluate(() => document.querySelector('[data-a="places"]').click()); await wait(400); await shot('mobile-places');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(() => document.querySelector('[data-a="places"]').click()); await wait(800); await shot('mobile-portrait');
}
