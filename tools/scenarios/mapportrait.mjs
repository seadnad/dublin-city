const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
  await wait(6000);
  await page.evaluate(() => window.__dublin.actions.map()); await wait(800); await shot('map-portrait');
  await page.evaluate(() => document.querySelector('.wm-legend').open = true); await wait(300); await shot('map-portrait-legend');
}
