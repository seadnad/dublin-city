const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(2000);
  await shot('ui-default');
  await page.keyboard.press('t'); await wait(400); await shot('places-panel');
  await page.keyboard.press('3'); await wait(900); await shot('teleported-bridge');
  await page.keyboard.press('h'); await wait(400); await shot('help');
  await page.keyboard.press('Escape');
  await page.keyboard.press('r'); await wait(1200); await shot('rain');
  await page.keyboard.press('n'); await wait(1200); await shot('rain-evening');
  await page.keyboard.press('r'); await wait(1200); await shot('evening');
  await page.keyboard.press('2'); await wait(1200); await shot('evening-gpo');
  await page.keyboard.press('8'); await wait(1200); await shot('evening-customhouse');
  await page.keyboard.press('n');
  await page.keyboard.down('w'); await wait(2500); await page.keyboard.up('w'); await shot('day-driving');
}
