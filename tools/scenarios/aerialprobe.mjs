// Where the triangles and draw calls go from the helicopter: hide each top-level scene child in turn and report the
// drop in calls / triangles (main pass + shadow pass). Usage: node tools/check.mjs tools/scenarios/aerialprobe.mjs [--mobile]
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await page.evaluate(() => { const d = window.__dublin, g = d.gfx(); d.lockQuality(g.tier, Math.min(g.maxDpr, 1)); });
  await page.evaluate(() => window.__dublin.actions.heli());
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 120000 });
  for (const alt of (process.env.ALTS || '0,250').split(',').map(Number)) {
    await page.evaluate((alt) => {
      const d = window.__dublin, s = d.sites.oconnellBridge, h = Math.PI;
      const x = s.x - Math.sin(h) * 60, z = s.z - Math.cos(h) * 60;
      d.heli.place(x, d.groundAt(x, z) + Math.max(alt, 1), z, h); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap();
    }, alt);
    await wait(2500);
    const rows = await page.evaluate(async () => {
      const d = window.__dublin, sc = d.scene;
      const nf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await nf();
      const base = { calls: d.renderer.info.render.calls, tris: d.renderer.info.render.triangles };
      const name = (o) => o.name || (o.isInstancedMesh ? `inst:${o.geometry.attributes.position.count}v x${o.count}` : o.type + (o.isMesh ? `:${o.geometry.attributes.position.count}v` : ''));
      // group children by name
      const groups = new Map();
      for (const c of sc.children) { if (!c.visible) continue; const k = name(c); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
      const out = [];
      for (const [k, list] of groups) {
        for (const c of list) c.visible = false;
        await nf();
        out.push([k, list.length, base.calls - d.renderer.info.render.calls, base.tris - d.renderer.info.render.triangles]);
        for (const c of list) c.visible = true;
      }
      out.sort((a, b) => b[3] - a[3]);
      return { base, out: out.filter((r) => r[2] || r[3]) };
    });
    console.log(`ALT ${alt}`, JSON.stringify(rows.base));
    for (const r of rows.out) console.log('  ', r[0].padEnd(40), 'x' + r[1], 'calls', r[2], 'tris', r[3]);
  }
}
