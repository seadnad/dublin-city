// O'Connell Street probe: prints the frontage layout (src/world/ocstreet.js): each building's side, chainages and width;
// DEBUG=1 also lists what blocks the west frontage between Abbey Street and the GPO
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(4000);
  const out = await page.evaluate(async (dbg) => {
    const { OCS, sites } = await import('/src/world/sites.js');
    const oc = await import('/src/world/oconnell.js'), { world, v2 } = await import('/src/world/geo.js'), { SETBACK } = await import('/src/world/ocstreet.js');
    const r = { problems: OCS.problems, b: OCS.buildings.map((b) => `${b.side} ${b.runIndex} ${b.id.padEnd(8)} ${b.s0.toFixed(1)}-${b.s1.toFixed(1)} w ${b.frame.w.toFixed(1)} (r ${b.r})`), dbg: [] };
    if (dbg) for (let s = 40; s <= 70; s += 2) for (const dv of [0.3, 7.5, 14.5]) {
      const p = oc.along(s, SETBACK + dv), hits = [];
      for (const sg of world.segs) {
        const ab = v2.sub(sg.b, sg.a), L2 = v2.dot(ab, ab), t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, sg.a), ab) / L2)), q = v2.add(sg.a, v2.scale(ab, t));
        const dd = v2.len(v2.sub(p, q)) - (sg.way.width / 2 + sg.way.pave + 0.3);
        if (dd < 0 && sg.way.type !== 'boulevard') hits.push(`${sg.way.name}(${sg.way.width},${sg.way.pave})`);
      }
      r.dbg.push(`${s} ${dv} ${hits.join(',')}`);
    }
    return r;
  }, !!process.env.DEBUG);
  console.log(out.problems.join('\n'));
  console.log(out.b.join('\n'));
  console.log(out.dbg.join('\n'));
}
