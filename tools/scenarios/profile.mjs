// Full rendering profile at the phone default (low tier, dpr 1) and desktop tiers.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(6000);
  await page.evaluate(() => {
    const d = window.__dublin, gl = d.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    d.gpuTimes = [];
    if (!ext) return;
    const orig = d.renderer.render.bind(d.renderer); const pending = [];
    d.renderer.render = (s, c) => {
      const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); orig(s, c); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q);
      while (pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) d.gpuTimes.push(gl.getQueryParameter(pending.shift(), gl.QUERY_RESULT) / 1e6);
    };
  });
  const measure = async (label) => {
    await wait(1500);
    await page.evaluate(() => { window.__dublin.gpuTimes = []; window.__dublin.profile(); });
    const f = await fps(3000);
    const r = await page.evaluate(() => {
      const d = window.__dublin, g = d.gpuTimes.slice().sort((a, b) => a - b);
      return { gpu: g.length ? +g[g.length >> 1].toFixed(2) : null, calls: d.renderer.info.render.calls, tris: d.renderer.info.render.triangles, cpu: d.profile() };
    });
    console.log(label.padEnd(26), `${f} fps`, `gpu ${r.gpu} ms`, `calls ${r.calls}`, `tris ${(r.tris / 1e6).toFixed(2)}M`, 'cpu', JSON.stringify(r.cpu));
  };
  await page.evaluate(() => window.__dublin.lockQuality('low', 1));
  await page.keyboard.press('1'); await measure('low  day  spire');
  await page.keyboard.press('6'); await measure('low  day  dame');
  await page.keyboard.press('n'); await measure('low  night dame');
  await page.keyboard.press('r'); await wait(3000); await measure('low  rain night dame');
  await page.keyboard.press('r'); await page.keyboard.press('n'); await wait(4000);
  for (const q of ['medium', 'high']) { await page.evaluate((q) => window.__dublin.lockQuality(q, 1), q); await page.keyboard.press('1'); await measure(`${q.padEnd(4)} day  spire`); }
  await page.evaluate(() => window.__dublin.lockQuality('low', 1)); await page.keyboard.press('1'); await wait(1500);

  // scene inventory
  const inv = await page.evaluate(() => {
    const d = window.__dublin, s = d.scene;
    let meshes = 0, visibleMeshes = 0, casters = 0, instanced = 0, instances = 0;
    const mats = new Set(), texs = new Set(), byGroup = {};
    const cat = (o) => {
      for (let p = o; p; p = p.parent) {
        if (p.userData && p.userData.model) return 'car:' + p.userData.model;
        if (p.name === 'streets' || p.name === 'ground') return p.name;
        if (/Cathedral|GPO|Custom|Trinity|Bank|Spire|Bridge|Campanile|Synod|Monument|Arch/.test(p.name)) return 'landmarks';
      }
      if (o.geometry && o.geometry.attributes.aExtra) return 'buildings';
      if (o.geometry && o.geometry.attributes.aPart) return 'people';
      if (o.material && o.material.isMeshPhysicalMaterial) return 'fleet';
      return o.isInstancedMesh ? 'other-instanced' : 'other';
    };
    s.traverse((o) => {
      if (!o.isMesh && !o.isLine && !o.isPoints && !o.isSprite) return;
      meshes++;
      let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
      if (vis) visibleMeshes++;
      if (o.castShadow) casters++;
      if (o.isInstancedMesh) { instanced++; instances += o.count; }
      const c = cat(o); byGroup[c] = (byGroup[c] || 0) + 1;
      for (const m of [].concat(o.material)) { mats.add(m); for (const k of Object.keys(m)) { const t = m[k]; if (t && t.isTexture) texs.add(t); } }
    });
    let texBytes = 0;
    for (const t of texs) { const im = t.image; if (!im || !im.width) continue; const bpp = t.type === 1016 ? 2 : (t.format === 1028 ? 1 : 4); texBytes += im.width * im.height * bpp * (t.generateMipmaps !== false ? 1.33 : 1); }
    let lights = 0, pointLights = 0, dirLights = 0; s.traverse((o) => { if (o.isLight) { lights++; if (o.isPointLight) pointLights++; if (o.isDirectionalLight) dirLights++; } });
    return { meshes, visibleMeshes, casters, instanced, instances, materials: mats.size, textures: texs.size, texMB: +(texBytes / 1048576).toFixed(1),
      gpuTextures: d.renderer.info.memory.textures, geometries: d.renderer.info.memory.geometries, programs: d.renderer.info.programs.length,
      lights, pointLights, dirLights, byGroup, shadowMap: d.atmosphere.sun.shadow.mapSize.x };
  });
  console.log('INVENTORY', JSON.stringify(inv, null, 1));
}
