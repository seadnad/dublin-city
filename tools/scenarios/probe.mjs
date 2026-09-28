export default async function (page) {
  const r = await page.evaluate(async () => {
    const d = window.__dublin, n = (id) => { const p = d.world.nodes.get(id); return [Math.round(p.x), Math.round(p.z)]; };
    const s = d.sites.heuston;
    return { heuston: [Math.round(s.x), Math.round(s.z), s.w, s.d, s.rot], VQ1: n('VQ1'), VQ2: n('VQ2'), SJ1: n('SJ1'), SJ2: n('SJ2'), SJ3: n('SJ3'), JS3: n('JS3'), WT2: n('WT2') };
  });
  console.log(JSON.stringify(r));
}
