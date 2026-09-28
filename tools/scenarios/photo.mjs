// Photo mode: P enters (HUD hidden, world frozen), mouse drag orbits, wheel zooms, Space snaps a PNG, P exits.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 120000 });
  await page.evaluate(() => { const d = window.__dublin; d.teleportTo('spire'); });
  await wait(1500);
  await page.evaluate(() => { window.__snaps = []; const o = URL.createObjectURL; URL.createObjectURL = (b) => { window.__snaps.push(b.size); return o(b); }; HTMLAnchorElement.prototype.click = function () {}; });
  await page.keyboard.press('p'); await wait(500);
  const s0 = await page.evaluate(() => ({ active: window.__dublin.photo.active, hud: document.getElementById('hud').classList.contains('photo-hidden'), ...window.__dublin.photo.state }));
  console.log('ENTER', JSON.stringify(s0));
  await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(420, 300, { steps: 12 }); await page.mouse.up();
  for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 250 }); await wait(40); }
  await wait(400);
  console.log('AFTER DRAG+ZOOM', JSON.stringify(await page.evaluate(() => window.__dublin.photo.state)));
  await shot('photo-orbit');
  await page.click('[data-p="car"]'); await page.click('[data-p="live"]'); await wait(800);
  await shot('photo-nocar-live');
  await page.keyboard.press(' '); await wait(1500);
  console.log('SNAP bytes', JSON.stringify(await page.evaluate(() => window.__snaps)), 'label', await page.$eval('.snap', (b) => b.textContent));
  await page.keyboard.press('p'); await wait(600);
  console.log('EXIT', JSON.stringify(await page.evaluate(() => ({ active: window.__dublin.photo.active, hud: document.getElementById('hud').classList.contains('photo-hidden'), carVisible: window.__dublin.carMesh().visible }))));
  await shot('photo-exit');
}
