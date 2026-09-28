// Saves the painted Garda livery atlas and the props map to tools/shots for inspection.
import fs from 'node:fs';
export default async function (page) {
  await new Promise((r) => setTimeout(r, 6000));
  const urls = await page.evaluate(() => {
    let body = null;
    window.__dublin.carMesh().traverse((o) => { if (o.isMesh && o.material.onBeforeCompile && o.material.map && o.material.clearcoat === 1 && !body) body = o.material; });
    const toUrl = (img, s) => { const c = document.createElement('canvas'); c.width = c.height = s; c.getContext('2d').drawImage(img, 0, 0, s, s); return c.toDataURL('image/png'); };
    return { atlas: toUrl(body.map.image, 1024) };
  });
  fs.writeFileSync('tools/shots/atlas.png', Buffer.from(urls.atlas.split(',')[1], 'base64'));
  console.log('saved atlas');
}
