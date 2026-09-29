// Review shots of the DART line (docs/research/railway.md): free camera views, each with the first train parked at a
// chainage (or left running). NIGHT=1 for after dark. VIEWS narrows the list (comma-separated names).
// Usage: node tools/check.mjs tools/scenarios/railway.mjs [--mobile]
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [name, eye [x, y, z], target [x, y, z], train s (null: leave it), second train s]
const SHOTS = [
  ['customhouse', [58, 2.2, -22], [200, 12, -112], 945, null],
  ['loopline-dart', [118, 3.2, -46], [152, 7, -72], 938, null],
  ['connolly-front', [268, 1.7, -262], [322, 11, -272], null, null],
  ['tara-st', [206, 2.0, -44], [172, 7, -6], 1005, null],
  ['beresford-under', [178, 1.7, -156], [140, 5.5, -136], null, null],
  ['pearse-westland', [283, 1.8, 238], [279, 7, 165], 1276, null],
  ['amiens-bridge', [296, 1.7, -246], [318, 6.5, -318], 620, null],
  ['connolly-dart', [372, 12, -300], [405, 7, -362], 529, null],
  ['aerial', [60, 150, 60], [260, 0, -160], 945, 1276],
];
export default async function (page, shot) {
  await wait(8000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  const only = process.env.VIEWS ? process.env.VIEWS.split(',') : null;
  for (const [name, eye, target, s0, s1] of SHOTS) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(([eye, target, s0, s1]) => {
      const d = window.__dublin;
      d.rig.update = () => {};
      for (const [k, s] of [[0, s0], [1, s1]]) if (s !== null && d.dart.list[k]) Object.assign(d.dart.list[k], { s, v: 0, dwell: 1e9 });
      d.dart.update(0);
      d.camera.position.set(...eye);
      d.camera.lookAt(...target);
    }, [eye, target, s0, s1]);
    await wait(1200); await shot(name);
  }
}
