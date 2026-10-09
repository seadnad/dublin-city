// Link-preview image (public/og.jpg, 1200 x 630), HUD hidden: from the air over Burgh Quay, looking north-west over the
// Liffey to O'Connell Bridge, the Spire and Liberty Hall. Run: node tools/check.mjs tools/scenarios/og.mjs, then
// ffmpeg -i tools/shots/og.png -q:v 3 public/og.jpg
import fs from 'node:fs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await page.setViewport({ width: 1200, height: 630 });
  await wait(9000);
  await page.addStyleTag({ content: '#hud, .toolbar, .minimap, #minimap, .toast { display: none !important; }' });
  await page.evaluate(() => { const d = window.__dublin; d.rig.update = () => {}; d.camera.position.set(-60, 120, 160); d.camera.lookAt(40, 0, -120); });
  await wait(2500);
  fs.writeFileSync('tools/shots/og.png', await page.screenshot({ type: 'png' }));
  console.log('shot og');
}
