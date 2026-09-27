const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(1500);
  const tp = (x, z, h) => page.evaluate(([x, z, h]) => { const d = window.__dublin; d.car.teleport(x, z, h); d.rig.snap(); }, [x, z, h]);
  await shot('oconnell-st');
  // Merrion Square north (Georgian)
  const n = await page.evaluate(() => { const w = window.__dublin.world; const a = w.nodes.get('MSNW'), b = w.nodes.get('MSNE'); return { a: { x: a.x, z: a.z }, b: { x: b.x, z: b.z } }; });
  const d = { x: n.b.x - n.a.x, z: n.b.z - n.a.z }; const L = Math.hypot(d.x, d.z);
  await tp(n.a.x + d.x * 0.3 + (d.z / L) * 2.5, n.a.z + d.z * 0.3 - (d.x / L) * 2.5, Math.atan2(d.x, d.z));
  await wait(800); await shot('merrion-sq');
  // bird's-eye
  await page.evaluate(() => { const d = window.__dublin; d.rig.mode = 'debug'; d.camera.position.set(-150, 260, 380); d.camera.lookAt(0, 0, 120); d.scene.fog.density = 0.0008; });
  await wait(800); await shot('aerial');
  await page.evaluate(() => { const d = window.__dublin; d.camera.position.set(120, 90, -10); d.camera.lookAt(260, 0, -70); });
  await wait(800); await shot('docklands');
}
