// Fixed set of comparison views. Usage: node tools/check.mjs tools/scenarios/look.mjs  (QUALITY env: low|medium|high)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  const q = process.env.QUALITY || 'low';
  await wait(5000);
  await page.evaluate((q) => window.__dublin.lockQuality(q, 1), q);
  const cam = (fn) => page.evaluate(fn);
  const views = [
    ['oconnell', () => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo('spire'); }],
    ['garda-close', () => { const d = window.__dublin; d.rig.mode = 'debug'; const c = d.car.pos, h = d.car.heading; d.camera.position.set(c.x + Math.sin(h) * 5 - Math.cos(h) * 3.5, 1.7, c.z + Math.cos(h) * 5 + Math.sin(h) * 3.5); d.camera.lookAt(c.x, 0.8, c.z); }],
    ['dame-st', () => { const d = window.__dublin; d.rig.mode = 'chase'; d.teleportTo('bankOfIreland'); }],
    ['merrion', () => { const d = window.__dublin; d.rig.mode = 'chase'; const a = d.world.nodes.get('MSNW'), b = d.world.nodes.get('MSNE'); const h = Math.atan2(b.x - a.x, b.z - a.z); d.car.teleport(a.x + (b.x - a.x) * 0.3 + Math.cos(h) * 2.6, a.z + (b.z - a.z) * 0.3 - Math.sin(h) * 2.6, h); d.rig.snap(); }],
  ];
  for (const [name, fn] of views) { await cam(fn); await wait(1800); await shot(`${process.env.TAG || ''}${name}-${q}`); }
}
