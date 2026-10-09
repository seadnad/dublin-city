const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  const before = await page.evaluate(() => {
    const d = window.__dublin;
    return { buildings: d.buildings.pendingDistricts, static: d.staticDistricts?.pendingDistricts || 0,
      colliders: d.stats().segments };
  });
  console.log('districts before', JSON.stringify(before));
  if (before.buildings < 1 || before.static < 1) throw Error('no distant districts were staged');
  await shot('starting-district');
  const gaps = await page.evaluate((ms) => new Promise((resolve) => {
    const samples = [], start = performance.now(); let prev = start;
    const tick = (now) => { samples.push(now - prev); prev = now;
      if (now - start < ms) requestAnimationFrame(tick);
      else { samples.sort((a, b) => a - b); resolve({ p95: Math.round(samples[Math.floor(samples.length * 0.95)]), worst: Math.round(samples.at(-1)), frames: samples.length }); }
    };
    requestAnimationFrame(tick);
  }), 4500);
  console.log('district frame gaps', JSON.stringify(gaps));
  const during = await page.evaluate(() => ({ buildings: window.__dublin.buildings.pendingDistricts,
    static: window.__dublin.staticDistricts.pendingDistricts }));
  console.log('districts during', JSON.stringify(during));
  if (during.buildings >= before.buildings && during.static >= before.static) throw Error('district queue did not advance');
  const destination = await page.evaluate(async () => {
    const d = window.__dublin;
    const p = d.car.pos;
    const [key] = Object.entries(d.sites).filter(([, s]) => s.view)
      .sort((a, b) => Math.hypot(b[1].view.x - p.x, b[1].view.z - p.z) - Math.hypot(a[1].view.x - p.x, a[1].view.z - p.z))[0];
    const started = performance.now();
    await d.teleportTo(key);
    return { key, prepareMs: Math.round(performance.now() - started), x: d.car.pos.x, z: d.car.pos.z,
      buildingNear: d.buildings.pendingNear(d.car.pos.x, d.car.pos.z),
      staticNear: d.staticDistricts.pendingNear(d.car.pos.x, d.car.pos.z),
      colliders: d.stats().segments };
  });
  console.log('district destination', JSON.stringify(destination));
  if (destination.buildingNear || destination.staticNear) throw Error('destination detail was not ready before teleport');
  if (destination.colliders < before.colliders) throw Error('collision world lost segments');
  await wait(500);
  console.log('district fps', await fps(2000));
  await shot('distant-district');
  const finishedAt = Date.now();
  await page.waitForFunction(() => {
    const d = window.__dublin;
    return !d.buildings.pendingDistricts && !d.staticDistricts.pendingDistricts && !d.landmarks.pendingDistricts;
  }, { timeout: 45000 });
  console.log('district queues drained after teleport', Date.now() - finishedAt, 'ms');
}
