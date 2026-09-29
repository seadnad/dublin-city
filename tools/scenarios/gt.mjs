// The GT hot hatch: pick it in the Play menu (with a colour), then look at it from the side, front and rear, and
// drive it up O'Connell Street by day and at night. Also checks the model, the handling profile and the engine voice.
// Usage: node tools/check.mjs tools/scenarios/gt.mjs [--mobile]
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (page, fwd, side, y, look = 0.7) => page.evaluate(([fwd, side, y, look]) => {
  const d = window.__dublin; d.rig.mode = 'debug';
  const c = d.car.pos, h = d.car.heading, fx = Math.sin(h), fz = Math.cos(h), sx = Math.cos(h), sz = -Math.sin(h);
  d.camera.position.set(c.x + fx * fwd + sx * side, y, c.z + fz * fwd + sz * side);
  d.camera.lookAt(c.x, look, c.z);
}, [fwd, side, y, look]);
// O'Connell Street, heading north from the bridge (as in handling.mjs)
const start = (page, along = 10) => page.evaluate((along) => { const d = window.__dublin, w = d.world; const a = w.nodes.get('NQ8'), b = w.nodes.get('OC4'); const h = Math.atan2(b.x - a.x, b.z - a.z); d.car.teleport(a.x + Math.cos(h) * 7 + Math.sin(h) * along, a.z - Math.sin(h) * 7 + Math.cos(h) * along, h); d.rig.snap(); }, along);

export default async function (page, shot) {
  await wait(3500);
  await page.evaluate(() => { try { localStorage.removeItem('dublin.paint.gt'); } catch { /* */ } });
  await page.keyboard.press('g'); await wait(400);
  await page.click('[data-car="gt"]'); await wait(2500);
  await shot('gt-menu');
  const info = await page.evaluate(() => {
    const d = window.__dublin, m = d.carMesh();
    let tris = 0, draws = 0; m.traverse((o) => { if (o.isMesh) { draws++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    return { model: m.userData.model, profile: d.car.profile, maxSpeed: d.car.p.maxSpeed, tris: Math.round(tris), meshes: draws, blurb: !!document.querySelector('.car-blurb'), swatches: document.querySelectorAll('[data-paint]').length };
  });
  console.log('gt:', JSON.stringify(info));
  await page.click('[data-paint="red"]'); await wait(300);
  await page.keyboard.press('Escape'); await wait(300);
  await start(page, 30); await wait(800);
  // bodywork close up
  await view(page, 0, 6.2, 1.0); await wait(600); await shot('gt-side');
  await view(page, 5.2, 3.4, 1.5); await wait(600); await shot('gt-front34');
  await view(page, -5.4, -3.2, 1.7); await wait(600); await shot('gt-rear34');
  // brake lamps: hold the brake while stationary shows nothing (speed 0), so read the material instead
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; });
  // driving up O'Connell Street
  await start(page, 5); await wait(300);
  await page.keyboard.down('w'); await wait(2600); await shot('gt-oconnell-day');
  console.log('engine flat out:', JSON.stringify(await page.evaluate(() => { const d = window.__dublin; return { ...(d.audio.debug().engine || {}), kmh: Math.round(d.car.speed * 3.6) }; })));
  await page.keyboard.up('w');
  await page.keyboard.down('s'); await wait(250); await shot('gt-braking'); await page.keyboard.up('s');
  await page.keyboard.press('n'); await wait(1500);
  await start(page, 5); await wait(300);
  await page.keyboard.down('w'); await wait(2200); await page.keyboard.up('w'); await shot('gt-oconnell-night');
  await start(page, 30); await wait(500);
  await view(page, 6, 2.2, 1.2); await wait(600); await shot('gt-night-front');
  await view(page, -6, -1.8, 1.3); await wait(400);
  await page.keyboard.down('s'); await wait(100); await shot('gt-night-rear'); await page.keyboard.up('s');
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; });
  await page.keyboard.press('n'); await wait(800);
  // colours
  for (const c of ['white', 'grey', 'blue']) {
    await page.keyboard.press('g'); await wait(300); await page.click(`[data-paint="${c}"]`); await wait(200); await page.keyboard.press('Escape');
    await start(page, 30); await view(page, 4.6, 3.8, 1.6); await wait(500); await shot(`gt-paint-${c}`);
  }
  await page.evaluate(() => { window.__dublin.rig.mode = 'chase'; });
  console.log('audio voice:', JSON.stringify(await page.evaluate(() => window.__dublin.audio.debug().engine || null)));
  // back to the Garda car so the profile goes back to standard
  await page.keyboard.press('g'); await wait(300); await page.click('[data-car="garda"]'); await wait(2500); await page.keyboard.press('Escape');
  console.log('after switching back:', await page.evaluate(() => window.__dublin.car.profile + ' ' + window.__dublin.carMesh().userData.model));
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
}
