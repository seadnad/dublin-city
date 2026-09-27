const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.click('#minimap'); await wait(700); await shot('map-city');
  // zoom into College Green with the wheel
  await page.mouse.move(640, 420); for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: -300 }); await wait(80); }
  await wait(400); await shot('map-zoomed');
  // click a street to set a waypoint
  await page.mouse.click(700, 470); await wait(400); await shot('map-waypoint');
  await page.keyboard.press('m'); await wait(600); await shot('hud-waypoint');
  console.log('waypoint text:', await page.$eval('#waypoint', (e) => e.textContent));
}
