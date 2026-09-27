const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await wait(1500);
  await page.evaluate(() => window.__dublin.profile());
  console.log('baseline', await fps(2500), 'fps', JSON.stringify(await page.evaluate(() => window.__dublin.profile())));
  // hide categories of meshes and see what the GPU gains
  const groups = {
    buildings: (o) => o.isInstancedMesh && o.geometry.attributes.aExtra,
    fleet: (o) => o.isInstancedMesh && o.material && o.material.isMeshPhysicalMaterial,
    people: (o) => o.isInstancedMesh && o.geometry.attributes.aPart,
    streets: (o) => o.parent && o.parent.name === 'streets',
  };
  for (const [name] of Object.entries(groups)) {
    await page.evaluate((name) => {
      const d = window.__dublin;
      const tests = {
        buildings: (o) => o.isInstancedMesh && o.geometry.attributes.aExtra,
        fleet: (o) => o.isInstancedMesh && o.material && o.material.isMeshPhysicalMaterial,
        people: (o) => o.isInstancedMesh && o.geometry.attributes.aPart,
        streets: (o) => o.parent && o.parent.name === 'streets',
      };
      d.scene.traverse((o) => { if (tests[name](o)) o.visible = false; });
    }, name);
    await wait(800);
    console.log(`without ${name.padEnd(10)}`, await fps(2500), 'fps');
    await page.evaluate(() => window.__dublin.scene.traverse((o) => { o.visible = true; }));
    await page.evaluate(() => { window.__dublin.landmarks.setLabels(true); });
  }
  await page.evaluate(() => { window.__dublin.renderer.shadowMap.enabled = false; window.__dublin.scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } }); });
  await wait(1500);
  console.log('without shadows', await fps(2500), 'fps');
}
