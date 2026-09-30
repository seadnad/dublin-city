// Verify that distant landmark preparation finishes after play without leaving loading silhouettes.
// Run: node tools/check.mjs tools/scenarios/districts.mjs --build
export default async function (page) {
  const result = await page.evaluate(async () => {
    const d = window.__dublin;
    const started = performance.now();
    const frames = [];
    let sampling = true, last = started;
    const tick = () => {
      const now = performance.now();
      frames.push(Math.round(now - last)); last = now;
      if (sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const initial = d.landmarks.pendingDistricts;
    while (d.landmarks.pendingDistricts && performance.now() - started < 45000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    sampling = false;
    const silhouettes = [];
    d.scene.traverse((o) => { if (o.name?.endsWith('loading silhouette')) silhouettes.push(o.name); });
    return {
      initial, remaining: d.landmarks.pendingDistricts, silhouettes,
      elapsedMs: Math.round(performance.now() - started),
      worstFrames: frames.sort((a, b) => b - a).slice(0, 8),
    };
  });
  console.log('DISTRICTS', JSON.stringify(result));
  if (result.initial < 1 || result.remaining || result.silhouettes.length) throw new Error('district streaming did not finish cleanly');
}
