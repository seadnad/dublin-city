// Luas geometry checks: every rendered track (sampled each metre across its bed) must not run over water except on a
// bridge deck, nor through a landmark / reserved footprint, nor over O'Connell Street's islands; the bridges.mjs test
// for the ways the Luas work added (Rosie Hackett Bridge, Hawkins Street).
export default async function (page) {
  const r = await page.evaluate(async () => {
    const g = await import('/src/world/ground.js'), { sites, extraSites, reserved } = await import('/src/world/sites.js');
    const { ISLANDS, islandOutline } = await import('/src/world/oconnell.js'), { pointInPolygon } = await import('/src/world/geo.js');
    const d = window.__dublin, W = d.world;
    const onBridge = (x, z) => W.ways.some((w) => w.bridge && w.pts.some((p, i) => {
      const q = w.pts[i + 1]; if (!q) return false;
      const dx = q.x - p.x, dz = q.z - p.z, l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / l2));
      return (x - p.x - dx * t) ** 2 + (z - p.z - dz * t) ** 2 < (w.width / 2 + 0.5) ** 2;
    }));
    const boxes = [];
    const named = new Map();
    for (const [k, s] of Object.entries(sites)) named.set(s, k);
    for (const [k, s] of Object.entries(extraSites)) named.set(s, 'extra.' + k);
    for (const s of new Set([...Object.values(sites), ...Object.values(extraSites)])) if (s && s.w && s.d && !s.bridge && !s.park) boxes.push({ s, name: named.get(s) });
    const inBox = (s, x, z, m = 0.3) => { const c = Math.cos(s.rot), sn = Math.sin(s.rot), dx = x - s.x, dz = z - s.z, lx = dx * c - dz * sn, lz = dx * sn + dz * c; return Math.abs(lx) < s.w / 2 - m && Math.abs(lz) < s.d / 2 - m; };
    const islands = ISLANDS.map((isl) => ({ name: isl.name, poly: islandOutline(isl) }));
    const water = {}, hits = {}, isl = {};
    let n = 0;
    for (const line of W.luasLines) for (const t of line.tracks) for (let i = 1; i < t.length; i++) {
      const a = t[i - 1], b = t[i], L = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / L, nz = (b.x - a.x) / L;
      for (let u = 0; u < L; u += 1) for (const o of [-1.7, 0, 1.7]) {
        const x = a.x + (b.x - a.x) * (u / L) + nx * o, z = a.z + (b.z - a.z) * (u / L) + nz * o; n++;
        if (g.isOverWater(x, z) && !onBridge(x, z)) { const k = line.name; water[k] = water[k] || []; if (water[k].length < 6) water[k].push([Math.round(x), Math.round(z)]); }
        for (const bx of boxes) if (inBox(bx.s, x, z)) { const k = bx.name || `@${Math.round(bx.s.x)},${Math.round(bx.s.z)}`; hits[k] = hits[k] || { n: 0, at: [Math.round(x), Math.round(z)] }; hits[k].n++; }
        for (const p of islands) if (pointInPolygon({ x, z }, p.poly)) { isl[p.name] = (isl[p.name] || 0) + 1; }
      }
    }
    // the new ways, bridges.mjs style
    const wayWater = {};
    for (const w of W.ways) {
      if (!['Rosie Hackett Bridge', 'Hawkins Street'].includes(w.name)) continue;
      for (let i = 0; i + 1 < w.pts.length; i++) {
        const a = w.pts[i], b = w.pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
        for (let s = 0; s <= L; s += 0.5) for (let o = -w.width / 2; o <= w.width / 2; o += 0.5) if (g.isOverWater(a.x + dx * s - dz * o, a.z + dz * s + dx * o)) wayWater[w.name] = (wayWater[w.name] || 0) + 1;
      }
    }
    return { samples: n, water, hits, islands: isl, wayWater, bridges: g.bridges.filter((b) => /Rosie/.test(b.name)).map((b) => ({ name: b.name, width: b.width, length: +b.length.toFixed(1) })) };
  });
  console.log(JSON.stringify(r, null, 1));
}
