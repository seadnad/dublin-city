export default async function (page, shot) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1500);
  await page.evaluate(() => { const d = window.__dublin; d.camera.position.set(0, 900, 150); d.controls.target.set(0, 0, 140); });
  await wait(800); await shot('overview');
  await page.evaluate(() => { const d = window.__dublin; d.camera.position.set(-60, 45, 60); d.controls.target.set(0, 0, 0); });
  await wait(800); await shot('oconnell-bridge');
  await page.evaluate(() => { const d = window.__dublin; d.camera.position.set(-40, 25, 170); d.controls.target.set(0, 0, 90); });
  await wait(800); await shot('college-green');
}
