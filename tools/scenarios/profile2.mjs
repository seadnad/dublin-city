export default async function (page) {
  await new Promise((r) => setTimeout(r, 6000));
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  console.log(await page.evaluate(() => {
    const d = window.__dublin, texs = new Map(), tris = {};
    d.scene.traverse((o) => {
      if (!o.material) return;
      for (const m of [].concat(o.material)) for (const k of Object.keys(m)) { const t = m[k]; if (t && t.isTexture && t.image && t.image.width) texs.set(t, `${t.image.width}x${t.image.height} ${k} ${m.name || m.type}`); }
      if (o.geometry && o.isMesh) {
        const idx = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
        const n = (idx / 3) * (o.isInstancedMesh ? o.count : 1);
        const key = o.geometry.attributes.aPart ? 'people' : o.geometry.attributes.aExtra ? 'buildings' : o.isInstancedMesh ? `inst:${o.material.type}:${idx / 3 | 0}` : (o.parent && o.parent.name) || o.name || 'mesh';
        tris[key] = (tris[key] || 0) + n;
      }
    });
    const big = [...texs.entries()].map(([t, s]) => [t.image.width * t.image.height, s]).sort((a, b) => b[0] - a[0]).slice(0, 14).map(([, s]) => s);
    const topTris = Object.entries(tris).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}: ${(v / 1000).toFixed(0)}k`);
    return 'TEX ' + big.join(' | ') + '\nTRIS ' + topTris.join(' | ');
  }));
}
