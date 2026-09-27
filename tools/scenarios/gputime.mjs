const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(5000);
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await wait(1000);
  const has = await page.evaluate(() => !!window.__dublin.renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2'));
  console.log('timer query available:', has);
  if (!has) return;
  // wrap renderer.render with a GPU timer
  await page.evaluate(() => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const orig = d.renderer.render.bind(d.renderer);
    const pending = []; d.gpu = [];
    d.renderer.render = (s, c) => {
      const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) { d.gpu.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6); }
    };
  });
  const measure = async (label, setup, undo) => {
    if (setup) await page.evaluate(setup);
    await wait(1200);
    await page.evaluate(() => { window.__dublin.gpu = []; });
    await wait(2000);
    const r = await page.evaluate(() => { const g = window.__dublin.gpu.slice().sort((a, b) => a - b); return { n: g.length, median: g[Math.floor(g.length / 2)] }; });
    console.log(label.padEnd(26), 'GPU ms median', r.median && r.median.toFixed(2), `(${r.n} frames)`);
    if (undo) await page.evaluate(undo);
  };
  await page.keyboard.press('6'); await wait(1500);
  await measure('baseline');
  const hide = (test) => `(() => { const d = window.__dublin; d.scene.traverse((o) => { if (${test}) { o.userData.h = true; o.visible = false; } }); })()`;
  const show = `(() => { window.__dublin.scene.traverse((o) => { if (o.userData.h) { o.visible = true; delete o.userData.h; } }); })()`;
  const cats = {
    buildings: 'o.isInstancedMesh && !!o.geometry.attributes.aExtra',
    streets: "o.name === 'streets'",
    'ground+water': "o.name === 'ground'",
    fleet: 'o.isInstancedMesh && o.material && o.material.isMeshPhysicalMaterial',
    buses: 'o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.parameters === undefined && o.material && o.material.map && o.material.map.image && o.material.map.image.width === 2048',
    people: 'o.isInstancedMesh && !!o.geometry.attributes.aPart',
    trees: 'o.isInstancedMesh && o.material && o.material.vertexColors',
    'car:garda': '(() => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.model) return true; return false; })()',
    'all instanced props': 'o.isInstancedMesh && !o.geometry.attributes.aExtra && !o.geometry.attributes.aPart && !(o.material && o.material.isMeshPhysicalMaterial)',
  };
  for (const [k, t] of Object.entries(cats)) await measure(`without ${k}`, hide(t), show);
  await measure('shadows off', `(() => { const d = window.__dublin; d.renderer.shadowMap.enabled = false; d.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); }); })()`);
}
