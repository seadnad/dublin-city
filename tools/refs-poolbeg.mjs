// One-off: fetch CC-licensed Poolbeg chimney references from Wikimedia Commons into refs/poolbeg (with sources.json).
// Generic User-Agent only (see CLAUDE.md). Usage: node tools/refs-poolbeg.mjs
import fs from 'node:fs';
const UA = { 'User-Agent': 'DublinDriveResearch/1.0 (hobby game research)' };
const titles = [
  'File:Poolbeg chimneys - geograph.org.uk - 1537589.jpg',
  'File:Pigeon House Chimneys, aerial 2015 - geograph.org.uk - 4690184.jpg',
  'File:Poolbeg Generating Station (48485989116).jpg',
  'File:Poolbeg Chimneys, Dublin Bay, viewed from Booterstown, 19 July 2022 1630 (1649c).jpg',
  'File:Clontarrf view towards Poolbeg.jpg',
];
const dir = 'refs/poolbeg';
fs.mkdirSync(dir, { recursive: true });
const out = [];
for (const t of titles) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280', titles: t }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u, { headers: UA })).json();
  const p = Object.values(j.query.pages)[0], i = p.imageinfo[0], m = i.extmetadata;
  const rec = { file: p.title.replace('File:', ''), page: i.descriptionurl, author: (m.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), licence: m.LicenseShortName?.value };
  if (/^(CC0|CC BY|Public domain)/i.test(rec.licence || '')) {
    const name = `poolbeg-${out.length + 1}.jpg`;
    fs.writeFileSync(`${dir}/${name}`, Buffer.from(await (await fetch(i.thumburl, { headers: UA })).arrayBuffer()));
    rec.local = name;
  }
  out.push(rec); console.log(JSON.stringify(rec));
  await new Promise((r) => setTimeout(r, 800));
}
fs.writeFileSync(`${dir}/sources.json`, JSON.stringify(out, null, 2) + '\n');
