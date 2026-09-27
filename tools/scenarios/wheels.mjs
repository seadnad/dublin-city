const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(5500);
  await page.evaluate(() => window.__dublin.teleportTo('spire')); await wait(1200);
  console.log(await page.evaluate(() => {
    const out = []; window.__dublin.scene.traverse((o) => { if (/^wheel_/.test(o.name)) out.push(`${o.type}:${o.name} parent=${o.parent.name} q=${o.quaternion.toArray().map((v) => v.toFixed(2))}`); });
    return out.join('\n');
  }));
  const cam = () => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 5 - Math.cos(h) * 3, 1.0, c.z + Math.cos(h) * 5 + Math.sin(h) * 3); d.camera.lookAt(c.x + Math.sin(h) * 1.4, 0.4, c.z + Math.cos(h) * 1.4); });
  await cam(); await wait(400); await shot('wheels-straight');
  await page.keyboard.down('a'); await wait(900); await cam(); await wait(100); await shot('wheels-left'); await page.keyboard.up('a');
  await page.keyboard.down('w'); await page.keyboard.down('d'); await wait(700); await page.keyboard.up('w'); await cam(); await wait(100); await shot('wheels-right-moving'); await page.keyboard.up('d');
}
