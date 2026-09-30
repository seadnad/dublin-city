// Frame cost of the DART line: meshes, triangles and the frames' draw calls with the railway shown and hidden, at a
// few viewpoints (the Custom House view, Tara Street, Connolly). Usage: PERF=1 node tools/check.mjs tools/scenarios/railperf.mjs
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = [['customhouse', [58, 2.2, -22], [200, 12, -112]], ['tara', [206, 2.0, -44], [172, 7, -6]], ['connolly', [268, 1.7, -262], [322, 11, -272]]];
export default async function (page, shot, { fps }) {
  await wait(9000);
  const inv = await page.evaluate(() => {
    const d = window.__dublin, out = {};
    d.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material && o.material.name) || '';
      const k = /^rail_/.test(n) ? 'railway' : /^ll_/.test(n) ? 'loopline' : /^cn_|connolly/i.test(n) || o.parent?.name === 'connolly' ? 'connolly' : n === 'dart' ? 'dart' : null;
      if (!k) return;
      const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      out[k] = out[k] || { meshes: 0, tris: 0 }; out[k].meshes++; out[k].tris += Math.round(t);
    });
    return out;
  });
  console.log('RAIL INVENTORY', JSON.stringify(inv));
  for (const [name, eye, target] of VIEWS) {
    const res = {};
    for (const hide of [false, true]) {
      await page.evaluate(([eye, target, hide]) => {
        const d = window.__dublin;
        d.rig.update = () => {};
        d.camera.position.set(...eye); d.camera.lookAt(...target);
        d.scene.traverse((o) => { if (o.isMesh && /^(rail_|ll_|dart)/.test((o.material && o.material.name) || '')) o.visible = !hide; });
      }, [eye, target, hide]);
      await wait(800);
      const f = await fps(3000);
      const info = await page.evaluate(() => { const r = window.__dublin.renderer.info.render; return { calls: r.calls, tris: r.triangles }; });
      res[hide ? 'hidden' : 'shown'] = { fps: f, ...info };
    }
    console.log('RAIL PERF', name, JSON.stringify(res));
  }
}
