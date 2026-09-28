// Startup cost breakdown: navigation timing, module-level world generation (from the page's own logs), the
// first frames (shader compilation), long main-thread tasks, and memory. Run against dev, --build or --url=.
export default async function (page) {
  const r = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const kb = (n) => Math.round(n / 1024);
    const big = res.map((e) => ({ name: e.name.split('/').pop().split('?')[0], kb: kb(e.transferSize || e.encodedBodySize), ms: Math.round(e.duration) }))
      .sort((a, b) => b.kb - a.kb).slice(0, 8);
    // time the next frames: the first renders compile every shader program
    const frames = [];
    let last = performance.now();
    await new Promise((done) => { let n = 0; const step = () => { const t = performance.now(); frames.push(Math.round(t - last)); last = t; if (++n < 90) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); });
    const d = window.__dublin;
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd), loadEvent: Math.round(nav.loadEventEnd),
      downloadedKB: kb(res.reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0)), biggest: big,
      programs: d.renderer.info.programs.length, textures: d.renderer.info.memory.textures, geometries: d.renderer.info.memory.geometries,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      worstFrames: frames.slice().sort((a, b) => b - a).slice(0, 5), medianFrame: frames.slice().sort((a, b) => a - b)[45],
    };
  });
  console.log('STARTUP', JSON.stringify(r, null, 1));
}
