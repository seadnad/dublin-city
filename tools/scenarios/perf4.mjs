const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await wait(1500);
  console.log('baseline', await fps(3000));
  const swap = (test) => page.evaluate((test) => {
    const d = window.__dublin, T = d.THREE;
    const f = new Function('o', 'return ' + test);
    d.scene.traverse((o) => { if (o.isMesh && f(o)) { o.userData.m = o.material; o.material = Array.isArray(o.material) ? o.material.map(() => new T.MeshLambertMaterial({ color: 0x888888 })) : new T.MeshLambertMaterial({ color: 0x888888 }); } });
  }, test);
  const restore = () => page.evaluate(() => window.__dublin.scene.traverse((o) => { if (o.userData.m) { o.material = o.userData.m; delete o.userData.m; } }));
  const tests = {
    'building shader': 'o.isInstancedMesh && !!o.geometry.attributes.aExtra',
    'street shaders': 'o.parent && (o.parent.name === "streets" || o.parent.name === "ground")',
    'car materials': 'o.material && o.material.isMeshPhysicalMaterial',
    'everything': 'true',
  };
  for (const [k, t] of Object.entries(tests)) {
    await swap(t); await wait(1500);
    console.log(`simple ${k.padEnd(16)}`, await fps(3000));
    await restore(); await wait(800);
  }
  await page.evaluate(() => { const d = window.__dublin; d.camera.far = 400; d.camera.updateProjectionMatrix(); });
  await wait(1000); console.log('far plane 400      ', await fps(3000));
}
