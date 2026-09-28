export default async function (page) {
  await page.evaluate((ids) => { window.__ids = ids; }, process.env.IDS || '');
  const r = await page.evaluate(async () => {
    const d = window.__dublin, n = (id) => { const p = d.world.nodes.get(id); return p ? [+p.x.toFixed(1), +p.z.toFixed(1)] : null; };
    const o = {}; for (const id of (window.__ids || '').split(',')) o[id] = n(id);
    return o;
  });
  console.log('NODES', JSON.stringify(r));
}
