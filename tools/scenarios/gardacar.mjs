// Garda car review: chase cam (day, night, night with lights flashing), orbit views, and the car's triangle /
// texture budget. TAG=before|after prefixes the shot names so before/after sets sit side by side.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.env.TAG ? `${process.env.TAG}-` : '';
const orbit = (page, dx, dy, dz, ly = 0.8) => page.evaluate(([dx, dy, dz, ly]) => {
  const d = window.__dublin; d.rig.mode = 'debug';
  const c = d.car.pos, h = d.car.heading, f = [Math.sin(h), Math.cos(h)], r = [Math.cos(h), -Math.sin(h)];
  d.camera.position.set(c.x + f[0] * dz + r[0] * dx, dy, c.z + f[1] * dz + r[1] * dx); d.camera.lookAt(c.x, ly, c.z);
}, [dx, dy, dz, ly]);
const chase = (page) => page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'chase'; d.rig.snap(); });

export default async function (page, shot) {
  await wait(6000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  // a fixed spot: Westmoreland Street looking south, car stopped in the left lane
  const place = () => page.evaluate(() => {
    const d = window.__dublin, A = d.world.nodes.get('SQ8'), B = d.world.nodes.get('WM1');
    const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L;
    d.car.teleport(A.x + dx * L * 0.45 + dz * 3, A.z + dz * L * 0.45 - dx * 3, Math.atan2(dx, dz)); d.rig.snap();
  });
  await place(); await wait(2500);
  const info = await page.evaluate(() => {
    const d = window.__dublin, m = d.carMesh();
    let tris = 0, meshes = 0; const mats = new Set(), texs = new Map();
    m.traverse((o) => {
      if (!o.isMesh) return; meshes++;
      const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      for (const mt of [].concat(o.material)) { mats.add(mt); for (const k of Object.keys(mt)) { const t = mt[k]; if (t && t.isTexture && t.image) texs.set(t.uuid, `${k} ${t.image.width}x${t.image.height}`); } }
    });
    return { model: m.userData.model, tris: Math.round(tris), meshes, materials: mats.size, textures: [...texs.values()] };
  });
  console.log('CAR', JSON.stringify(info));
  await chase(page); await wait(800); await shot(`${tag}chase-day`);
  await orbit(page, -3.8, 1.5, 4.5); await wait(400); await shot(`${tag}front34`);
  await orbit(page, 4.2, 1.7, -4.8); await wait(300); await shot(`${tag}rear34`);
  await orbit(page, 5.5, 1.0, 0.3); await wait(300); await shot(`${tag}side`);
  await orbit(page, -2.2, 3.2, -3.4, 1.2); await wait(300); await shot(`${tag}roof`);
  await page.keyboard.press('n'); await wait(2000);
  await chase(page); await wait(800); await shot(`${tag}chase-night`);
  await page.keyboard.press('x'); await wait(330);
  await shot(`${tag}chase-night-siren`);
  await orbit(page, -3.8, 1.5, 4.5); await wait(250); await shot(`${tag}front34-night-siren`);
  await page.keyboard.press('x');
}
