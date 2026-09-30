// Driver-eye shots of each famous pub (src/world/pubsites.js), by day and (NIGHT=1) after dark.
// PUBS=key,key limits the set; DIST (max m from the front, default 11; never past the far kerb), SLIDE (m along the street, default 7), EYE (1.4).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await wait(6000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(3000); }
  const keys = await page.evaluate(async (only) => {
    const { pubSites } = await import('/src/world/pubsites.js');
    return Object.keys(pubSites).filter((k) => !only || only.split(',').includes(k));
  }, process.env.PUBS || '');
  const tag = process.env.NIGHT ? 'night' : 'day';
  for (const key of keys) {
    const info = await page.evaluate(async ([key, dist, slide, eye]) => {
      const d = window.__dublin, { pubSites } = await import('/src/world/pubsites.js');
      const s = pubSites[key], zx = Math.sin(s.rot), zz = Math.cos(s.rot), xx = Math.cos(s.rot), xz = -Math.sin(s.rot);
      // stand in the road in front, slid along the street towards the corner side (or local -x)
      const way = d.world.ways.find((w) => { const i = w.nodeIds.indexOf(s.a), j = w.nodeIds.indexOf(s.b); return i >= 0 && j >= 0 && Math.abs(i - j) === 1; });
      // the far side of the road (or DIST m out if that is nearer)
      const k = s.cornerSide ? s.cornerSide : -1, out = s.d / 2 + Math.min(dist, way.width + way.pave + 0.15 - 1.2);
      const cx = s.x + zx * out + xx * slide * k, cz = s.z + zz * out + xz * slide * k;
      d.rig.update = () => {};
      d.camera.position.set(cx, eye, cz);
      d.camera.lookAt(s.x + zx * (s.d / 2) - xx * k * 1.5, 4.2, s.z + zz * (s.d / 2) - xz * k * 1.5);
      return { x: s.x.toFixed(1), z: s.z.toFixed(1) };
    }, [key, +(process.env.DIST || 11), +(process.env.SLIDE || 7), +(process.env.EYE || 1.4)]);
    await wait(1200);
    console.log(key, JSON.stringify(info));
    await shot(`pub-${key}-${tag}`);
  }
}
