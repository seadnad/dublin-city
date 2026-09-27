const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(3000);
  await page.keyboard.press('g'); await wait(500); await shot('play-menu');
  await page.click('[data-mode="pursuit"]'); await wait(1500); await shot('pursuit-start');
  // cheat for the test: drive toward the suspect by teleporting behind it, then hold throttle
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { const d = window.__dublin; const s = d.pursuit.blips()[0]; if (!s) return; const dx = s.x - d.car.pos.x, dz = s.z - d.car.pos.z, L = Math.hypot(dx, dz); if (L > 30) { d.car.teleport(s.x - dx / L * 12, s.z - dz / L * 12, Math.atan2(dx, dz)); d.rig.snap(); } });
    await page.keyboard.down('w'); await wait(700); await page.keyboard.up('w');
  }
  await shot('pursuit-close');
  const m = await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | '));
  console.log('mission panel:', m);
  await page.evaluate(() => window.__dublin.gameUI.togglePlay(true)); await wait(300);
  await page.click('[data-route="liffey"]'); await wait(1200); await shot('trial-countdown');
  await wait(3000); await page.keyboard.down('w'); await wait(2500); await page.keyboard.up('w');
  await shot('trial-running');
  console.log('trial panel:', await page.$eval('#mission', (e) => e.innerText.replace(/\n/g, ' | ')));
}
