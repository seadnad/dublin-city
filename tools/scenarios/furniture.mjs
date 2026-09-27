const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.keyboard.press('6'); await wait(2500); await shot('dame-furniture');
  await page.keyboard.press('3'); await wait(2500); await shot('bridge-furniture');
  await page.keyboard.press('4'); await wait(2500); await shot('quay-trees');
  await page.keyboard.press('n'); await page.keyboard.press('9'); await wait(3000); await shot('grafton-evening');
  await page.keyboard.press('r'); await page.keyboard.press('1'); await wait(3000); await shot('oconnell-rain-evening');
  const stopped = await page.evaluate(() => window.__dublin.traffic.list.filter((a) => a.speed < 0.3).length);
  console.log('AI stopped (lights/queues):', stopped, 'of', await page.evaluate(() => window.__dublin.traffic.list.length));
}
