import fs from 'node:fs';
export default async function (page) {
  const url = await page.evaluate(async () => {
    const m = await import('/src/game/fleet.js');
    const a = m.paintAtlas(m.TYPES.hatch);
    const img = a.map.image, S = img.width;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d'), id = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S * 4; x += 4) {
      const src = (S - 1 - y) * S * 4 + x, dst = y * S * 4 + x;
      const al = img.data[src + 3] / 255;
      id.data[dst] = img.data[src] * (0.4 + 0.6 * al); id.data[dst + 1] = img.data[src + 1] * (1 - 0.6 * al) ; id.data[dst + 2] = img.data[src + 2]; id.data[dst + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync('tools/shots/atlas-hatch.png', Buffer.from(url.split(',')[1], 'base64'));
}
