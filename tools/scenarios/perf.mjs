const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(5000);
  const gpu = await page.evaluate(() => { const gl = window.__dublin.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  console.log('GPU:', gpu);
  const run = async (label) => { await wait(1500); console.log(label.padEnd(28), await fps(3000), 'fps', JSON.stringify(await page.evaluate(() => { const s = window.__dublin.stats(); return { calls: s.calls, tris: s.triangles, dpr: s.dpr }; }))); };
  await run('day, O\'Connell St');
  await page.keyboard.press('1'); await run('day, spire view');
  await page.keyboard.press('n'); await run('evening');
  await page.keyboard.press('r'); await run('evening + rain');
  await page.keyboard.press('n'); await run('rain');
  await page.keyboard.press('r');
  await page.keyboard.down('w'); await run('day, driving'); await page.keyboard.up('w');
}
