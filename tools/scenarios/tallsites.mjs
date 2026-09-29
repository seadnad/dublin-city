// Planning aid for the tall buildings (docs/research/tallest-buildings.md): the roads round each site (node ids,
// positions, widths) and a top-down shot of what stands there now.
// Usage: node tools/check.mjs tools/scenarios/tallsites.mjs     (ONLY=name1,name2 to limit; R=radius in m)
const SITES = [
  ['libertyhall', 53.34846, -6.25534], ['collegesq', 53.34646, -6.25545], ['gqplaza', 53.34675, -6.25335],
  ['capitaldock', 53.34501, -6.23118], ['exo', 53.34765, -6.22749], ['millennium', 53.34286, -6.23688],
  ['altovetro', 53.34224, -6.23872], ['johnslane', 53.34315, -6.27752], ['stgeorges', 53.35737, -6.26278],
  ['findlaters', 53.35457, -6.26391],
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(6000);
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null, R = +(process.env.R || 70);
  for (const [name, lat, lon] of SITES) {
    if (only && !only.includes(name)) continue;
    const info = await page.evaluate(async (lat, lon, R) => {
      const { project, world } = await import('/src/world/geo.js');
      const p = project(lat, lon), out = [];
      for (const w of world.ways) {
        const ids = w.nodeIds.filter((id) => { const n = world.nodes.get(id); return Math.hypot(n.x - p.x, n.z - p.z) < R; });
        if (ids.length) out.push(`${w.name} [${w.type} w${w.width} pave${w.pave}${w.bridge ? ' bridge' : ''}] ` + ids.map((id) => { const n = world.nodes.get(id); return `${id}(${n.x.toFixed(1)},${n.z.toFixed(1)})`; }).join(' '));
      }
      const d = window.__dublin;
      d.rig.update = () => {};
      d.camera.position.set(p.x, 260, p.z + 0.01);
      d.camera.lookAt(p.x, 0, p.z);
      return { p: { x: +p.x.toFixed(1), z: +p.z.toFixed(1) }, ways: out };
    }, lat, lon, R);
    console.log('SITE', name, JSON.stringify(info.p));
    for (const w of info.ways) console.log('   ', w);
    if (!process.env.NOSHOT) { await wait(1200); await shot(`top-${name}`); }
  }
}
