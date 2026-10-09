// Activity budget and a forced pedestrian/car contact in the running game.
export default async function (page, shot, { fps }) {
  const counts = await page.evaluate(() => {
    const d = window.__dublin;
    const near = (p) => (p.x - d.car.pos.x) ** 2 + (p.z - d.car.pos.z) ** 2 < 80 ** 2;
    return { moving: d.traffic.list.length, movingNear: d.traffic.list.filter((v) => near(v.pos)).length,
      buses: d.traffic.list.filter((v) => v.isBus).length,
      parked: d.traffic.parkedCount, walking: d.people.people.length,
      walkingNear: d.people.people.filter(near).length, gfx: d.gfx() };
  });
  console.log('city life', JSON.stringify(counts));
  await page.evaluate(() => {
    const d = window.__dublin, v = d.traffic.list[0], p = d.people.people[0];
    p.x = v.pos.x; p.z = v.pos.z; p.pause = 1;
    d.people.update(0.016, d.car.pos, d.car, d.traffic.list);
    d.people.update(0.016, d.car.pos, d.car, d.traffic.list); // far walkers alternate frames
  });
  const contact = await page.evaluate(() => {
    const d = window.__dublin, v = d.traffic.list[0], p = d.people.people[0];
    const dx = p.x - v.pos.x, dz = p.z - v.pos.z;
    const c = Math.cos(v.heading), s = Math.sin(v.heading);
    return { localX: dx * c - dz * s, localZ: dx * s + dz * c,
      halfWidth: v.h.W / 2 + 0.3, halfLength: v.length / 2 + 0.3 };
  });
  console.log('forced contact', JSON.stringify(contact));
  if (Math.abs(contact.localX) < contact.halfWidth - 0.02 && Math.abs(contact.localZ) < contact.halfLength - 0.02) throw Error('pedestrian remained inside moving car');
  console.log('scene fps', await fps(2000));
  console.log('frame profile', JSON.stringify(await page.evaluate(() => window.__dublin.profile())));
  await shot('city-life');
}
