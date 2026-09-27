const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
  await wait(6000);
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1500);
  const box = await page.$eval('[data-k="left"]', (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width * 0.8, y: r.y + r.height / 2, w: r.width, h: r.height }; });
  console.log('left zone size', box.w, 'x', box.h);
  await page.touchscreen.touchStart(box.x, box.y); await wait(300);
  console.log('steer while touching left zone:', await page.evaluate(() => window.__dublin.input.steer.toFixed(2)));
  await shot('portrait-steer');
  await page.touchscreen.touchEnd();
}
