const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await wait(1500);
  const r = await page.evaluate(() => {
    const d = window.__dublin; let objs = 0, meshes = 0, inst = 0, lights = 0, sprites = 0, shadowCasters = 0;
    const big = [];
    d.scene.traverse((o) => { objs++; if (o.isMesh) meshes++; if (o.isInstancedMesh) { inst++; big.push([o.count, o.geometry.attributes.position.count, o.castShadow, o.material.type || 'multi']); } if (o.isLight) lights++; if (o.isSprite) sprites++; if (o.castShadow) shadowCasters++; });
    big.sort((a, b) => b[0] * b[1] - a[0] * a[1]);
    return { objs, meshes, inst, lights, sprites, shadowCasters, info: d.renderer.info.render, programs: d.renderer.info.programs.length, top: big.slice(0, 12) };
  });
  console.log(JSON.stringify(r, null, 0));
  const t = await page.evaluate(async () => {
    const d = window.__dublin; const R = d.renderer;
    const time = (fn, n = 30) => { const s = performance.now(); for (let i = 0; i < n; i++) fn(); R.getContext().finish(); return ((performance.now() - s) / n).toFixed(2); };
    R.shadowMap.needsUpdate = false;
    const noShadow = time(() => R.render(d.scene, d.camera));
    const withShadow = time(() => { R.shadowMap.needsUpdate = true; R.render(d.scene, d.camera); });
    return { noShadow, withShadow };
  });
  console.log('ms per render (incl. finish):', JSON.stringify(t));
}
