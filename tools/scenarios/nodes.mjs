// Print game coordinates of street-graph nodes: IDS='A,B,C'
export default async function (page) {
  const r = await page.evaluate((ids) => ids.map((id) => { const n = window.__dublin.world.nodes.get(id); return n ? `${id} ${n.x.toFixed(1)} ${n.z.toFixed(1)} edges=${n.edges.length}` : `${id} missing`; }), (process.env.IDS || '').split(','));
  console.log(r.join('\n'));
}
