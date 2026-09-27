// Samples every bridge deck (and the road approaching it) against isOverWater, which triggers a respawn.
export default async function (page) {
  const r = await page.evaluate(async () => {
    const g = await import('/src/world/ground.js');
    const d = window.__dublin, out = [];
    for (const br of g.bridges) out.push({ name: br.name, width: br.width, length: +br.length.toFixed(1), pts: br.way.pts.length });
    // every bridge way, every segment, sampled across the full carriageway
    const bad = {};
    for (const w of d.world.ways) {
      // every way, full carriageway
      for (let i = 0; i + 1 < w.pts.length; i++) {
        const a = w.pts[i], b = w.pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
        for (let s = 0; s <= L; s += 0.5) for (let o = -w.width / 2; o <= w.width / 2; o += 0.5) {
          const x = a.x + dx * s - dz * o, z = a.z + dz * s + dx * o;
          if (g.isOverWater(x, z)) { const k = w.name + ' (' + w.type + ')'; bad[k] = bad[k] || { n: 0, ex: [] }; bad[k].n++; if (bad[k].ex.length < 4) bad[k].ex.push([+x.toFixed(1), +z.toFixed(1), 'seg' + i, 'off' + o]); }
        }
      }
    }
    return { out, bad, nBridgeWays: d.world.ways.filter((w) => w.bridge).length };
  });
  console.log(JSON.stringify(r, null, 1));
}
