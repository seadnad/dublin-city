import { gzipSync } from 'node:zlib';
export default async function (page) {
  const data = await page.evaluate(() => {
    const lots = window.__dublin.buildings.lots;
    return lots.map((l) => [l.x, l.z, l.rot, l.w, l.d, l.h, l.style, l.fh, l.bay,
      l.base.r, l.base.g, l.base.b, l.trim.r, l.trim.g, l.trim.b,
      l.seed, l.nb, l.doorBay, l.sign, l.weather, l.frontage ? 1 : 0]);
  });
  const text = JSON.stringify(data);
  console.log('building layout bytes', JSON.stringify({ count: data.length, json: text.length, gzip: gzipSync(text).length }));
}
