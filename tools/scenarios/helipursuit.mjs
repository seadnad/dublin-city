// Garda Pursuit from the air at night: the searchlight should find and follow the suspect.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await page.keyboard.press('n');
  await page.evaluate(() => { const d = window.__dublin; d.pursuit.start(); d.actions.heli(); });
  await page.waitForFunction(() => window.__dublin.heliState().flying && window.__dublin.pursuit.blips().length, { timeout: 120000 });
  await wait(4500); // countdown
  for (let i = 0; i < 3; i++) {
    const r = await page.evaluate(() => {
      const d = window.__dublin, b = d.pursuit.blips()[0], h = d.heli;
      // hover 35 m up, 30 m behind the suspect
      d.heli.place(b.x + 30, d.groundAt(b.x + 30, b.z) + 35, b.z, -Math.PI / 2); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap();
      return b;
    });
    await wait(1500);
    const s = await page.evaluate(() => { const d = window.__dublin, b = d.pursuit.blips()[0], t = d.scene.getObjectByName('helicopter').parent.children.find((o) => o.isMesh && o.material.uniforms && o.material.uniforms.uLevel); const p = new d.THREE.Vector3(0, 0, 1).applyQuaternion(t.quaternion).multiplyScalar(t.scale.z).add(t.position); return { beamEnd: [p.x.toFixed(1), p.z.toFixed(1)], suspect: [b.x.toFixed(1), b.z.toFixed(1)], miss: Math.hypot(p.x - b.x, p.z - b.z).toFixed(1), siren: d.car.siren }; });
    console.log('BEAM', JSON.stringify(s));
  }
  await shot('heli-pursuit-night');
}
