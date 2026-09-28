// Which objects generate the draw calls: counts main-pass renders per category over one frame at busy spots.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(5000);
  for (const key of (process.env.SPOTS || 'hapenny,spire,christChurch').split(',')) {
    await page.evaluate((k) => window.__dublin.teleportTo(k), key);
    await wait(1500);
    const r = await page.evaluate(() => new Promise((done) => {
      const d = window.__dublin, counts = {};
      const cat = (o) => {
        const names = [];
        for (let p = o; p && p !== d.scene; p = p.parent) if (p.name) names.push(p.name);
        const top = names[names.length - 1] || '';
        const mat = o.material && (o.material.name || o.material.type);
        if (o.isInstancedMesh) {
          const g = o.geometry, n = g.attributes.position.count;
          g.computeBoundingBox(); const b = g.boundingBox;
          return `inst:${top || '-'}:${mat}:${o.material.color ? o.material.color.getHexString() : ''}:${n}v:${(b.max.x - b.min.x).toFixed(1)}x${(b.max.y - b.min.y).toFixed(1)}`;
        }
        if (top) return `mesh:${top}`;
        o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox;
        return `mesh:-:${mat}:${o.material.color ? o.material.color.getHexString() : ''}:${(b.max.x - b.min.x).toFixed(0)}x${(b.max.y - b.min.y).toFixed(0)}x${(b.max.z - b.min.z).toFixed(0)}`;
      };
      const hooked = [];
      d.scene.traverse((o) => {
        if (!o.isMesh && !o.isPoints && !o.isLine) return;
        const prev = o.onBeforeRender;
        o.onBeforeRender = function (...a) { const k = cat(o); counts[k] = (counts[k] || 0) + 1; if (prev) prev.apply(this, a); };
        hooked.push([o, prev]);
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const [o, prev] of hooked) o.onBeforeRender = prev;
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        done({ total, calls: d.renderer.info.render.calls, top: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 28) });
      }));
    }));
    console.log('SPOT', key, 'counted', r.total, 'info.calls', r.calls);
    for (const [k, n] of r.top) console.log('   ', String(n).padStart(4), k);
  }
}
