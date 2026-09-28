export default async function (page) {
  const r = await page.evaluate(async () => {
    const d = window.__dublin, { sites } = await import('/src/world/sites.js');
    const s = sites.bankOfIreland, c = Math.cos(s.rot), sn = Math.sin(s.rot), hits = {};
    for (let lx = -s.w / 2 + 0.6; lx <= s.w / 2 - 0.6; lx += 1) for (let lz = -s.d / 2 + 0.6; lz <= s.d / 2 - 0.6; lz += 1) {
      const x = s.x + lx * c + lz * sn, z = s.z - lx * sn + lz * c, r = d.world.nearestRoad(x, z);
      if (r && r.edgeDist < 0 && r.way.name === 'College Green') { const k = r.way.nodeIds.join('-') + (lx < 0 ? ' L' : ' R') + (lz < 0 ? 'back' : 'front'); hits[k] = (hits[k] || 0) + 1; }
    }
    const n = (id) => { const p = d.world.nodes.get(id); return [Math.round(p.x), Math.round(p.z)]; };
    return { hits, site: [Math.round(s.x), Math.round(s.z), +s.rot.toFixed(2), s.w, s.d], CG0: n('CG0'), CGT: n('CGT'), CGM: n('CGM'), CG1: n('CG1') };
  });
  console.log(JSON.stringify(r));
}
