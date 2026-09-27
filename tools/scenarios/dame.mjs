// Dame Street / College Green review shots: street-level views along the street plus an overhead.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [name, from node, to node, t] — the car is placed in the left lane looking from -> to
const GRAFTON = [
  ['cg-bend', 'CGT', 'CGC', 0.1],
  ['nassau-luas', 'CG3', 'NS1', 0.15],
  ['grafton-north', 'CG3', 'GR1', 0.25],
  ['grafton-bt', 'GR1', 'GR2', 0.05],
  ['grafton-bewleys', 'GR1', 'GR2', 0.55],
  ['grafton-top', 'GR2', 'SGNW', 0.4],
  ['sg-centre', 'SGW', 'SGNW', 0.5],
];
const DAME = [
  ['trinity-front', 'CG0', 'CGT', 0.1],
  ['college-green-west', 'CGT', 'CG0', 0.15],
  ['dame-east-end', 'DMc', 'DM1', 0.1],
  ['dame-mid', 'DM1', 'DM2', 0.3],
  ['dame-west', 'DM2', 'DM3', 0.4],
  ['city-hall', 'SQ4', 'PARL', 0.3],
  ['lord-edward', 'LE1', 'DM3', 0.2],
];
const VIEWS = process.env.SET === 'grafton' ? GRAFTON : DAME;
export default async function (page, shot) {
  await wait(4000);
  const tag = process.env.TAG || '';
  for (const [name, a, b, t] of VIEWS) {
    await page.evaluate((a, b, t) => {
      const d = window.__dublin, A = d.world.nodes.get(a), B = d.world.nodes.get(b);
      const way = d.world.ways.find((w) => { const i = w.nodeIds.indexOf(a), j = w.nodeIds.indexOf(b); return i >= 0 && j >= 0 && Math.abs(i - j) === 1; });
      const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L, off = Math.min(way.width / 4, 3);
      const x = A.x + dx * L * t + dz * off, z = A.z + dz * L * t - dx * off;
      d.car.teleport(x, z, Math.atan2(dx, dz)); d.rig.snap();
    }, a, b, t);
    await wait(1500);
    await shot(`${tag}${name}`);
  }
  if (process.env.OVERHEAD) {
    await page.evaluate((set) => { window.__set = set; }, process.env.SET || '');
    await page.evaluate(() => {
      const d = window.__dublin, a = d.world.nodes.get('DM2'), c = d.world.nodes.get('CG1');
      d.rig.update = () => {};
      d.camera.position.set((a.x + c.x) / 2 + 40, 150, (a.z + c.z) / 2 + 140); d.camera.lookAt((a.x + c.x) / 2, 0, (a.z + c.z) / 2);
    });
    await wait(900); await shot(`${tag}dame-overhead`);
  }
}
