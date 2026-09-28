// Area review shots: an overhead of the area and chase-cam views from named nodes.
// AREA=temple-bar|hapenny|christ-church|st-patricks|heuston ; TAG prefixes the file names.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const AREAS = {
  hapenny: { centre: 'HPS', height: 110, views: [['ormond-quay-east', 'NQ5', 'NQ6', 0.35], ['wellington-quay-east', 'SQ5', 'SQ6', 0.55], ['crampton-west', 'SQ7', 'HPS', 0.35], ['liffey-st-south', 'AB2', 'NQ6', 0.75], ['merchants-arch-north', 'TBQ', 'HPS', 0.2]] },
  'temple-bar': { centre: 'TBQ', height: 170, views: [['tb-west-from-asdills', 'TAS', 'TBQ', 0.1], ['tb-east-from-templelane', 'TTL', 'TFO', 0.05], ['crown-alley-north', 'CCA', 'TBQ', 0.1], ['eustace-north', 'DEU', 'TEU', 0.2], ['fleet-west', 'FPL', 'FAP', 0.3], ['essex-east', 'ES1', 'TEU', 0.1]] },
};
export default async function (page, shot) {
  await wait(4000);
  const area = AREAS[process.env.AREA || 'temple-bar'];
  const tag = process.env.TAG ? `${process.env.TAG}-` : '';
  for (const [name, a, b, t] of area.views) {
    const ok = await page.evaluate((a, b, t) => {
      const d = window.__dublin, A = d.world.nodes.get(a), B = d.world.nodes.get(b);
      if (!A || !B) return false;
      const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L;
      d.car.teleport(A.x + dx * L * t, A.z + dz * L * t, Math.atan2(dx, dz)); d.rig.snap();
      return true;
    }, a, b, t);
    if (!ok) { console.log('missing node', a, b); continue; }
    await wait(1500);
    const street = await page.evaluate(() => window.__dublin.car.street && window.__dublin.car.street.name);
    console.log('VIEW', name, 'street:', street);
    await shot(`${tag}${name}`);
  }
  await page.evaluate((c, h) => {
    const d = window.__dublin, n = d.world.nodes.get(c);
    d.rig.update = () => {};
    d.camera.position.set(n.x + h * 0.25, h, n.z + h * 0.6); d.camera.lookAt(n.x, 0, n.z);
  }, area.centre, area.height);
  await wait(900); await shot(`${tag}overhead`);
}
