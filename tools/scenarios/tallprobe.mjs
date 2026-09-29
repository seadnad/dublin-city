// Probe for docs/research/tallest-buildings.md: for each tall building on Wikipedia's list (OSM centre), where it
// lands in the game, whether it is inside the map, what landmark or filler stands there now, and the nearest road.
// Usage: node tools/check.mjs tools/scenarios/tallprobe.mjs
const POINTS = [
  ['College Square (tower)', 53.34665, -6.25545], ['Capital Dock', 53.34501, -6.23118], ['Exo Building', 53.34765, -6.22749],
  ['Google Docks (Montevetro)', 53.33972, -6.23718], ['Castleforbes C2 / Marshall Yards', 53.3505, -6.2310],
  ['Liberty Hall', 53.34846, -6.25534], ["George's Quay Plaza", 53.34671, -6.25341], ['Convention Centre', 53.34777, -6.23960],
  ["Boland's Quay 1", 53.33940, -6.23540], ['Moxy Docklands (East Wharf)', 53.35782, -6.23361], ['Alto Vetro', 53.34224, -6.23872],
  ['Millennium Tower', 53.34286, -6.23688], ["John's Lane Church", 53.34314, -6.27750], ["St George's Church", 53.35736, -6.26280],
  ['Abbey Presbyterian (Findlater)', 53.35457, -6.26391], ["St Audoen's", 53.34375, -6.27353], ["St Paul's Arran Quay", 53.34639, -6.27744],
  ['One HSQ', 53.34542, -6.29718], ['Clarion Quay', 53.34815, -6.24396], ['Spencer Dock', 53.34931, -6.23866],
  ['The Gasworks', 53.33800, -6.23750], ['Central Plaza', 53.34469, -6.26292], ['Jameson Chimney', 53.34849, -6.27784],
  ["St Patrick's Tower", 53.34405, -6.28407], ['Tara House site', 53.34640, -6.25480], ['26 Parkgate St', 53.34800, -6.29250],
  ['Rathmines (Mary Immaculate)', 53.32796, -6.26389], ['Shipwright Building', 53.34158, -6.28865], ['12-storey Bow St', 53.34868, -6.27916],
  ['Poolbeg chimney', 53.34023, -6.18994],
];
export default async function (page) {
  const out = await page.evaluate(async (POINTS) => {
    const { project, world } = await import('/src/world/geo.js');
    const { sites, extraSites } = await import('/src/world/sites.js');
    const d = window.__dublin, lots = d.buildings.lots || [];
    const all = [...Object.entries(sites), ...Object.entries(extraSites)].filter(([, s]) => s && typeof s.x === 'number');
    const B = world.bounds;
    return POINTS.map(([name, lat, lon]) => {
      const p = project(lat, lon);
      const inB = p.x > B.minX && p.x < B.maxX && p.z > B.minZ && p.z < B.maxZ;
      let near = null, nd = 1e9;
      for (const [k, s] of all) { const dd = Math.hypot(s.x - p.x, s.z - p.z); if (dd < nd) { nd = dd; near = k; } }
      const lotsHere = lots.filter((l) => Math.hypot(l.x - p.x, l.z - p.z) < 18);
      const road = world.nearestRoad(p.x, p.z);
      let nn = 1e9; for (const n of world.nodes.values()) nn = Math.min(nn, Math.hypot(n.x - p.x, n.z - p.z));
      return { name, x: +p.x.toFixed(1), z: +p.z.toFixed(1), inBounds: inB, nearestNode: Math.round(nn), road: road ? `${road.way.name} ${road.dist != null ? Math.round(road.dist) : ''}` : null,
        site: nd < 60 ? `${near} ${Math.round(nd)} m` : null, filler: lotsHere.length ? `${lotsHere.length} lots, max ${Math.round(Math.max(...lotsHere.map((l) => l.h)))} m` : 'none' };
    });
  }, POINTS);
  for (const r of out) console.log('PROBE', JSON.stringify(r));
}
