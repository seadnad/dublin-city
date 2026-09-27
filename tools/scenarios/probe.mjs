export default async function (page) {
  const r = await page.evaluate(async () => {
    const d = window.__dublin, { extraSites } = await import('/src/world/sites.js');
    const n = (id) => { const p = d.world.nodes.get(id); return [Math.round(p.x), Math.round(p.z)]; };
    const g = d.scene.getObjectByName("St Stephen's Green Shopping Centre");
    return { site: extraSites.sgCentre, SGNW: n('SGNW'), KSS1: n('KSS1'), GR2: n('GR2'), SGW: n('SGW'), obj: g ? [g.position.x, g.position.z, g.children.length] : null };
  });
  console.log(JSON.stringify(r));
}
