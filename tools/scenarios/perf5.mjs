const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await wait(1500);
  console.log('baseline         ', await fps(3000), JSON.stringify(await page.evaluate(() => window.__dublin.profile())));
  await page.evaluate(() => { document.getElementById('minimap').style.display = 'none'; const c = document.getElementById('minimap'); c.getContext = () => ({ save() {}, restore() {}, clearRect() {}, beginPath() {}, arc() {}, clip() {}, fillRect() {}, translate() {}, rotate() {}, scale() {}, drawImage() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, closePath() {}, fillText() {} }); });
  await wait(1000);
  console.log('minimap hidden   ', await fps(3000));
  await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
  await wait(1000);
  console.log('hud hidden       ', await fps(3000), JSON.stringify(await page.evaluate(() => window.__dublin.profile())));
}
