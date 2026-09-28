export default async function (page) {
  const r = await page.evaluate(async () => {
    const d = window.__dublin, { project } = await import('/src/world/geo.js');
    const n = (id) => { const p = d.world.nodes.get(id); return [+p.x.toFixed(1), +p.z.toFixed(1)]; };
    const hall = project(53.34594, -6.26284);
    const way = (name) => { const w = d.world.ways.find((x) => x.name === name); return { width: w.width, pave: w.pave }; };
    return { HPS: n('HPS'), TBQ: n('TBQ'), TAS: n('TAS'), TFO: n('TFO'), hallCentre: [+hall.x.toFixed(1), +hall.z.toFixed(1)], aston: way('Aston Quay'), tb: way('Temple Bar') };
  });
  console.log(JSON.stringify(r));
}
