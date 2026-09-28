// Controller and start-state checks: after the intro the car must be still (it used to creep into reverse), then a
// simulated standard gamepad drives (RT / LT / stick), toggles the siren (Y) and navigates the Play menu.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  // 1. the intro hand-off leaves the car stationary
  const url = page.url().replace(/[?#].*$/, '') + '?intro';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 120000 });
  await wait(1500);
  console.log('START speed after intro', await page.evaluate(() => window.__dublin.car.speed.toFixed(3)));

  // 2. a fake standard-mapping gamepad
  await page.evaluate(() => {
    const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
    const e = new Event('gamepadconnected'); Object.defineProperty(e, 'gamepad', { value: pad }); window.dispatchEvent(e);
    window.__press = (i, v = 1) => { pad.buttons[i] = { pressed: v > 0.5, value: v }; };
  });
  const setBtn = (i, v) => page.evaluate(([i, v]) => window.__press(i, v), [i, v]);
  const speed = () => page.evaluate(() => +window.__dublin.car.speed.toFixed(2));
  await setBtn(7, 1); await wait(1500); console.log('RT held 1.5 s -> speed', await speed());
  await setBtn(7, 0); await page.evaluate(() => { window.__pad.axes[0] = -0.8; }); await wait(600);
  console.log('stick left -> steer', await page.evaluate(() => +window.__dublin.input.steer.toFixed(2)));
  await page.evaluate(() => { window.__pad.axes[0] = 0; });
  await setBtn(6, 1); await wait(3000); console.log('LT held 3 s -> speed (negative = reversing)', await speed());
  await setBtn(6, 0);
  await setBtn(3, 1); await wait(200); await setBtn(3, 0); await wait(200);
  console.log('Y -> siren', await page.evaluate(() => window.__dublin.car.siren));
  // 3. menu: Menu button opens Play, D-pad down moves focus, A presses (picks the focused button)
  await setBtn(9, 1); await wait(200); await setBtn(9, 0); await wait(300);
  console.log('Menu -> play open', await page.evaluate(() => !document.getElementById('play').hidden));
  for (let k = 0; k < 4; k++) { await setBtn(13, 1); await wait(120); await setBtn(13, 0); await wait(120); }
  console.log('D-pad x4 -> focused', await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim().slice(0, 30)));
  await shot('gamepad-menu');
  await setBtn(1, 1); await wait(200); await setBtn(1, 0); await wait(300);
  console.log('B -> play closed', await page.evaluate(() => document.getElementById('play').hidden));
}
