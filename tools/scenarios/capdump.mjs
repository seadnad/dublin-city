// Dump the far view's textures to tools/shots: the top-down ground capture (day and night, tone mapped) and the
// painted outer ground. Usage: node tools/check.mjs tools/scenarios/capdump.mjs
import fs from 'node:fs';
import path from 'node:path';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await page.evaluate(() => window.__dublin.actions.heli());
  await page.waitForFunction(() => window.__dublin.heliState().flying, { timeout: 120000 });
  await page.evaluate(() => { const d = window.__dublin, s = d.sites.oconnellBridge; d.heli.place(s.x, 200, s.z, 0); d.heli.rpm = 1; d.heli.landed = false; d.rig.snap(); });
  await page.waitForFunction(() => window.__dublin.far.state.built, { timeout: 120000 });
  const dump = async (name, which) => {
    await wait(1500);
    const url = await page.evaluate((which) => {
      const d = window.__dublin, THREE = d.THREE, r = d.renderer;
      const tex = which === 'outer' ? d.far.outerTexture : d.far.captureTexture;
      const W = which === 'outer' ? 1024 : 1600, H = which === 'outer' ? 1024 : Math.round(1600 * tex.image.height / tex.image.width);
      const rt = new THREE.WebGLRenderTarget(W, H);
      const m = new THREE.ShaderMaterial({
        uniforms: { t: { value: tex }, lin: { value: which === 'outer' ? 0 : 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D t; uniform float lin; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; if (lin > 0.5) c = c / (1.0 + c) * 1.6; gl_FragColor = vec4(pow(max(c, 0.0), vec3(1.0 / 2.2)), 1.0); }',
        toneMapped: false,
      });
      const sc = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
      r.setRenderTarget(rt); r.render(sc, new THREE.Camera()); r.setRenderTarget(null);
      const px = new Uint8Array(W * H * 4); r.readRenderTargetPixels(rt, 0, 0, W, H, px);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'), img = g.createImageData(W, H);
      for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      g.putImageData(img, 0, 0);
      rt.dispose();
      return c.toDataURL('image/png');
    }, which);
    const file = path.resolve('tools/shots', `${name}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('shot', file);
  };
  await dump('capture-day', 'cap');
  await dump('outer', 'outer');
  await page.keyboard.press('n'); await wait(2500);
  await dump('capture-night', 'cap');
}
