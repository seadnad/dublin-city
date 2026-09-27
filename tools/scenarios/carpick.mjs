const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  await page.keyboard.press('g'); await wait(300);
  await page.click('[data-car="hatch"]'); await wait(1500);
  await page.keyboard.press('Escape');
  await page.keyboard.down('w'); await wait(1500); await page.keyboard.up('w');
  await shot('hatch-player');
  console.log('models:', await page.evaluate(() => { const a = []; window.__dublin.scene.traverse((o) => { if (o.userData && o.userData.model && o.parent === window.__dublin.scene) a.push(o.userData.model); }); return a.join(','); }));
  await page.evaluate(() => localStorage.clear());
}
