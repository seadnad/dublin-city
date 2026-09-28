// Draw calls, triangles and frame rate against camera far distance, at a few busy spots.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(4000);
  for (const key of ['spire', 'hapenny', 'christChurch']) {
    await page.evaluate((k) => window.__dublin.teleportTo(k), key);
    for (const far of [950, 650, 450]) {
      await page.evaluate((f) => { const c = window.__dublin.camera; c.far = f; c.updateProjectionMatrix(); }, far);
      await wait(700);
      const f = await fps(1500);
      const r = await page.evaluate(() => window.__dublin.renderer.info.render);
      console.log('FAR', key.padEnd(13), String(far).padEnd(4), `${f} fps`, `calls ${r.calls}`, `tris ${(r.triangles / 1e6).toFixed(2)}M`);
    }
  }
}
