// Drives flat out south along O'Connell Street onto O'Connell Bridge in several lanes, and over every bridge
// in both directions, watching for respawn jumps.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  const runs = await page.evaluate(() => {
    const d = window.__dublin, w = d.world, runs = [];
    const node = (id) => w.nodes[id] || (w.nodeById && w.nodeById[id]);
    for (const way of w.ways.filter((x) => x.bridge)) {
      const a = way.pts[0], b = way.pts[way.pts.length - 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      for (const dir of [1, -1]) for (const o of [-0.4, -0.2, 0, 0.2, 0.4].map((f) => f * (way.width - 2.5))) {
        const s = dir > 0 ? a : b, back = 60;
        runs.push({ name: way.name + (dir > 0 ? ' N>S' : ' S>N') + ' off ' + o.toFixed(1),
          x: s.x - dx * dir * back - dz * o, z: s.z - dz * dir * back + dx * o, heading: Math.atan2(dx * dir, dz * dir), L: L + back * 2 });
      }
    }
    return runs;
  });
  let fails = 0;
  for (const r of runs) {
    await page.keyboard.down('ArrowUp');
    const res = await page.evaluate(async (r) => {
      const d = window.__dublin;
      d.car.teleport(r.x, r.z, r.heading); d.rig.snap && d.rig.snap();

      let last = { x: d.car.pos.x, z: d.car.pos.z }, maxJump = 0, travelled = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 6000 && travelled < r.L) {
        await new Promise((f) => requestAnimationFrame(f));

        const j = Math.hypot(d.car.pos.x - last.x, d.car.pos.z - last.z);
        maxJump = Math.max(maxJump, j); travelled += j; last = { x: d.car.pos.x, z: d.car.pos.z };
      }

      return { maxJump: +maxJump.toFixed(1), travelled: Math.round(travelled), speed: +d.car.speed.toFixed(1) };
    }, r);
    await page.keyboard.up('ArrowUp'); await wait(200);
    const bad = res.maxJump > 5;
    if (bad) fails++;
    console.log(bad ? 'JUMP' : 'ok  ', r.name.padEnd(44), JSON.stringify(res));
  }
  console.log('respawn jumps:', fails, 'of', runs.length);
}
