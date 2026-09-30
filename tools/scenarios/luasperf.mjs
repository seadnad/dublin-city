// Frame cost along the Luas: draw calls, triangles and fps (headless, indicative) with the car parked at spots on the
// lines, the chase camera looking along the street. SPOTS="A>B,..." (node ids: parked at A facing B).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(5000);
  const spots = (process.env.SPOTS || 'NQ8>OC2,WM1>SQ8,AB0>OC1,MB2>NQ9,HB1>HS,ST1>AM,SL2>JS3,GXSHC2>GXSHCS,MY2>MY1').split(',');
  const rows = [];
  for (const sp of spots) {
    const [a, b] = sp.split('>');
    await page.evaluate((a, b) => {
      const d = window.__dublin, A = d.world.nodes.get(a), B = d.world.nodes.get(b);
      const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz);
      d.car.teleport(A.x + dx / L * 6, A.z + dz / L * 6, Math.atan2(dx, dz)); d.rig.snap();
    }, a, b);
    await wait(1500);
    const f = await fps(2500);
    const s = await page.evaluate(() => window.__dublin.stats());
    rows.push([sp, f, s.calls, s.triangles]);
    console.log(`${sp.padEnd(16)} ${String(f).padStart(3)} fps  ${String(s.calls).padStart(4)} calls  ${String(s.triangles).padStart(8)} tris`);
  }
  const avg = (k) => Math.round(rows.reduce((t, r) => t + r[k], 0) / rows.length);
  console.log(`mean             ${String(avg(1)).padStart(3)} fps  ${String(avg(2)).padStart(4)} calls  ${String(avg(3)).padStart(8)} tris`);
}
