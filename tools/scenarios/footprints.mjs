// Every landmark / reserved footprint must stay off the carriageways: samples each box (shrunk 0.6 m) against
// the street graph and lists any that sit on a road.
// Monuments that really stand in the middle of O'Connell Street, on its islands (and Parnell's island in the mouth of
// the Parnell Street junction), and College Green's two islands (the Davis memorial, Grattan) are allowed by name.
// Nothing else is exempt.
const IN_STREET = ['spire', 'extra.oconnellMonument', 'extra.smithOBrien', 'extra.gray', 'extra.larkin', 'extra.fatherMathew', 'extra.parnell',
  'extra.davisIsland', 'extra.grattanIsland'];
export default async function (page) {
  const r = await page.evaluate(async (IN_STREET) => {
    const d = window.__dublin, { sites, extraSites, reserved } = await import('/src/world/sites.js');
    const named = new Map();
    for (const [k, s] of Object.entries(sites)) named.set(s, k);
    for (const [k, s] of Object.entries(extraSites)) named.set(s, 'extra.' + k);
    const all = new Set([...Object.values(sites), ...Object.values(extraSites), sites.grandCanal.square].filter((s) => !IN_STREET.includes(named.get(s))));
    const out = [];
    for (const s of all) {
      if (!s || !s.w || !s.d || s.bridge || s.park) continue;
      const c = Math.cos(s.rot), sn = Math.sin(s.rot);
      const hits = new Map();
      for (let lx = -s.w / 2 + 0.6; lx <= s.w / 2 - 0.6; lx += 1) for (let lz = -s.d / 2 + 0.6; lz <= s.d / 2 - 0.6; lz += 1) {
        const x = s.x + lx * c + lz * sn, z = s.z - lx * sn + lz * c;
        const road = d.world.nearestRoad(x, z);
        if (road && road.edgeDist < 0 && !road.way.pedestrian && !road.way.bridge) hits.set(road.way.name, (hits.get(road.way.name) || 0) + 1);
      }
      if (hits.size) out.push({ site: named.get(s) || `reserved@${Math.round(s.x)},${Math.round(s.z)}`, roads: Object.fromEntries(hits) });
    }
    // ...but the exempt ones must actually stand on one of the street's islands
    const { ISLANDS, islandOutline } = await import('/src/world/oconnell.js'), { pointInPolygon } = await import('/src/world/geo.js');
    const { CG_ISLANDS } = await import('/src/world/collegegreen.js');
    for (const k of IN_STREET) {
      const s = k.startsWith('extra.') ? extraSites[k.slice(6)] : sites[k];
      if (!s || !(ISLANDS.some((isl) => pointInPolygon(s, islandOutline(isl))) || CG_ISLANDS.some((isl) => pointInPolygon(s, isl.poly)))) out.push({ site: k, roads: { 'not on an island': 1 } });
    }
    return out;
  }, IN_STREET);
  console.log('FOOTPRINTS ON ROADS:', r.length);
  for (const o of r) console.log(' ', o.site.padEnd(30), JSON.stringify(o.roads));
}
