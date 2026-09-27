const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await shot('game-no-labels');
  await page.keyboard.press('m'); await wait(700); await shot('map-open');
  await page.click('[data-z="fit"]'); await wait(400); await shot('map-city');
  // tap the Spire icon
  const pos = await page.evaluate(() => { const d = window.__dublin; return null; });
  await page.click('[data-z="me"]'); await wait(300);
  const box = await page.$eval('canvas', (c) => ({ w: c.clientWidth, h: c.clientHeight }));
  await page.mouse.click(box.w / 2, box.h / 2 - 1); await wait(300); await shot('map-tap');
}
