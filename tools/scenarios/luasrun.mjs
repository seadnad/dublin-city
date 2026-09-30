// Luas end-to-end check: steps the tram fleet on its own (SIM seconds, default two hours) and reports, per tram, the
// runs it finished, the stops it served and the longest it stood still away from a stop or a terminus (stuck > 90 s
// fails). Also times fleet.update() and checks no two trams ever overlap. Usage: node tools/check.mjs tools/scenarios/luasrun.mjs
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(3000);
  const res = await page.evaluate((SIM) => {
    const d = window.__dublin, fleet = d.tram, dt = 0.1;
    const st = fleet.trams.map((t) => ({ line: t.line.name, svc: t.svc.name, cycle: t.svc.cycle, runs: 0, stops: new Set(), still: 0, maxStill: 0, lastRi: t.ri, maxSpeed: 0 }));
    let overlaps = 0, worst = null;
    const t0 = performance.now();
    for (let k = 0; k < SIM / dt; k++) {
      fleet.update(dt, null);
      fleet.trams.forEach((t, i) => {
        const s = st[i];
        if (t.ri !== s.lastRi) { s.runs++; s.lastRi = t.ri; }
        if (t.currentStop) s.stops.add(t.currentStop);
        s.maxSpeed = Math.max(s.maxSpeed, t.speed);
        if (t.speed < 0.05 && t.dwell <= 0 && !t.atEnd) { s.still += dt; if (s.still > s.maxStill) { s.maxStill = s.still; s.where = `${t.runs[t.ri].run.key} s=${t.s.toFixed(0)} blockedBy=${t.blockedBy ? fleet.trams.indexOf(t.blockedBy) : '-'}`; } } else s.still = 0;
      });
      if (k % 10 === 0) { // carriage overlaps between different trams
        const T = fleet.trams;
        for (let a = 0; a < T.length; a++) for (let b = a + 1; b < T.length; b++) for (const p of T[a].carriages) for (const q of T[b].carriages) {
          const dx = p.x - q.x, dz = p.z - q.z;
          if (dx * dx + dz * dz < 2.0 * 2.0) { overlaps++; worst = worst || `${a}/${b} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`; }
        }
      }
    }
    const ms = performance.now() - t0;
    // cost of one real update (focus on the player)
    const t1 = performance.now();
    for (let k = 0; k < 500; k++) fleet.update(1 / 60, d.car.pos);
    const per = (performance.now() - t1) / 500;
    return { ms, per, overlaps, worst, trams: st.map((s) => ({ ...s, stops: s.stops.size, names: [...s.stops].join(', ') })) };
  }, +(process.env.SIM || 7200));
  console.log(`simulated in ${res.ms.toFixed(0)} ms; fleet.update ${res.per.toFixed(3)} ms per frame; overlaps ${res.overlaps} ${res.worst || ''}`);
  let bad = 0;
  res.trams.forEach((t, i) => {
    const stuck = t.maxStill > 90;
    if (stuck || t.runs < 2) bad++;
    console.log(`${String(i).padStart(2)} ${t.line} / ${t.svc}: cycle ${t.cycle}s, runs ${t.runs}, stops ${t.stops}, vmax ${t.maxSpeed.toFixed(1)}, longest hold ${t.maxStill.toFixed(0)}s${t.maxStill > 20 ? ` (${t.where})` : ''}${stuck ? '  STUCK' : ''}`);
  });
  console.log(bad ? `${bad} trams FAILED` : 'all trams ran end to end');
  console.log('stops seen:', [...new Set(res.trams.flatMap((t) => t.names.split(', ')))].sort().join(' | '));
}
