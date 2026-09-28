// Photo mode on a phone: the toolbar fits with the Photo button, and the photo bar fits in portrait.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 120000 });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await wait(1500); await shot('phone-toolbar');
  await page.evaluate(() => document.querySelector('[data-a="photo"]').click()); await wait(800);
  await shot('phone-photo');
  const r = await page.evaluate(() => { const t = document.querySelector('.toolbar').getBoundingClientRect(), m = document.querySelector('.minimap').getBoundingClientRect(), b = document.querySelector('.photo-bar').getBoundingClientRect(); return { toolbarLeft: t.left, minimapRight: m.right, bar: [b.left, b.right, b.height] }; });
  console.log('LAYOUT', JSON.stringify(r));
}
