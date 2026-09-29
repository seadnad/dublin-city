// The world map zoomed all the way out: checks the whole playable area fits and reads.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.click('#minimap'); await wait(700);
  await page.mouse.move(640, 360); for (let i = 0; i < 12; i++) { await page.mouse.wheel({ deltaY: 400 }); await wait(80); }
  await wait(500); await shot('map-full');
}
