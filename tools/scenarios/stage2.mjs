const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(1000);
  await shot('start');
  await page.keyboard.down('w'); await wait(3000);
  console.log('after 3s throttle', JSON.stringify(await page.evaluate(() => window.__dublin.stats().car)));
  await shot('driving');
  await page.keyboard.down('d'); await wait(900); await page.keyboard.up('d');
  await wait(1500);
  await page.keyboard.down(' '); await page.keyboard.down('a'); await wait(1200); await page.keyboard.up(' '); await page.keyboard.up('a');
  await shot('drift');
  await wait(3000);
  console.log('later', JSON.stringify(await page.evaluate(() => window.__dublin.stats().car)));
  await page.keyboard.up('w');
  await shot('later');
  await page.keyboard.press('c'); await wait(500); await shot('bonnet');
}
