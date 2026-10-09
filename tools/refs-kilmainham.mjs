// One-off: fetch CC-licensed Kilmainham Gaol / Royal Hospital Kilmainham / Richmond Tower references from Wikimedia
// Commons into refs/kilmainham (with sources.json). Generic User-Agent only (see CLAUDE.md).
// Usage: node tools/refs-kilmainham.mjs
import fs from 'node:fs';
const UA = { 'User-Agent': 'DublinDriveResearch/1.0 (hobby game research)' };
// [local name, Commons title]
const list = [
  ['01-gaol-front-entrance.jpg', 'File:Dublin-Kilmainham-Main-Entrance-1.jpg'],
  ['03-gaol-entrance-door.jpg', 'File:Entrance to Kilmainham.jpg'],
  ['04-gaol-facade-through-trees.jpg', 'File:Facade of Kilmainham Gaol through Trees - Kilmainham - Dublin - Ireland (42609849305).jpg'],
  ['07-gaol-east-wing-and-wall.jpg', 'File:Dublin-Kilmainham-Jail-2.jpg'],
  ['08-gaol-from-south.jpg', 'File:Dublin-Kilmainham-Jail-3.jpg'],
  ['09-kilmainham-courthouse.jpg', 'File:Dublin-Kilmainham-Courthouse.jpg'],
  ['10-gaol-inchicore-road.jpg', 'File:Kilmainham - Kilmainham Gaol - 20190913124840.jpg'],
  ['12-gaol-stonebreakers-yard.jpg', 'File:Courtyard behind Kilmainham Gaol.jpg'],
  ['14-gaol-east-wing-interior.jpg', 'File:County Dublin - Kilmainham Gaol - 20221129160314.jpg'],
  ['15-gaol-proclamation-and-entrance.jpg', 'File:Dublin-Proclamation-Kilmainham.jpg'],
  ['20-rhk-north-side.jpg', 'File:Royal-hospital-kilmainham-01.JPG'],
  ['21-rhk-tower.jpg', "File:Royal Kilmainham Hospital's Tower 01.jpg"],
  ['23-rhk-murphy.jpg', 'File:RHKilmainhan.jpg'],
  ['24-rhk-courtyard.jpg', 'File:Courtyard of Irish Museum of Modern Art.jpg'],
  ['25-rhk-panorama-7.jpg', 'File:Museum Of Modern Art At Royal Hospital Kilmainham - Dublin (Ireland) - panoramio (7).jpg'],
  ['27-rhk-grounds-autumn.jpg', 'File:Kilmainham Hospital Grounds.jpg'],
  ['29-rhk-geograph-5199265.jpg', 'File:Royal Hospital Kilmainham, Irish Museum of Modern Art - geograph.org.uk - 5199265.jpg'],
  ['30-rhk-imma-front.jpg', 'File:Irish-Museum-Modern-Art-Dublin.jpg'],
  ['31-rhk-garden-house.jpg', 'File:Dublin - Kilmainham - Royal Hospital Park - Gartenhaus.jpg'],
  ['32-rhk-panorama.jpg', 'File:Museum Of Modern Art At Royal Hospital Kilmainham - Dublin (Ireland) - panoramio.jpg'],
  ['33-rhk-malton.jpg', 'File:Royal Hospital Kilmainham by Malton.jpg'],
  ['40-richmond-tower-autumn.jpg', 'File:Richmond Tower.jpg'],
  ['41-richmond-tower-inchicore-road.jpg', 'File:Richmond Tower from Inchicore Road.jpg'],
  ['45-richmond-tower-from-road.jpg', 'File:Richmond Tower from the road.jpg'],
];
const dir = 'refs/kilmainham';
fs.mkdirSync(dir, { recursive: true });
const prev = fs.existsSync(`${dir}/sources.json`) ? JSON.parse(fs.readFileSync(`${dir}/sources.json`, 'utf8')) : [];
const out = [];
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
for (const [name, t] of list) {
  const old = prev.find((r) => r.local === name && r.title === t);
  if (old && fs.existsSync(`${dir}/${name}`)) { out.push(old); continue; }
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1000', titles: t }).forEach(([k, v]) => u.searchParams.set(k, v));
  let rec;
  for (let tries = 0; tries < 3 && !rec; tries++) {
    try {
      const j = await (await fetch(u, { headers: UA })).json();
      const p = Object.values(j.query.pages)[0], i = p.imageinfo[0], m = i.extmetadata;
      rec = { local: name, title: p.title, page: i.descriptionurl, author: strip(m.Artist?.value), licence: strip(m.LicenseShortName?.value), date: strip(m.DateTimeOriginal?.value).slice(0, 10) };
      if (!/^(CC0|CC BY|Public domain|No restrictions)/i.test(rec.licence || '')) { console.warn('skip licence', rec.licence, t); rec.skipped = true; break; }
      const url = i.thumburl || i.url;
      fs.writeFileSync(`${dir}/${name}`, Buffer.from(await (await fetch(url, { headers: UA })).arrayBuffer()));
    } catch (e) { console.warn('retry', t, e.message); rec = null; await new Promise((r) => setTimeout(r, 15000)); }
  }
  if (rec && !rec.skipped) { out.push(rec); console.log(JSON.stringify(rec)); }
  await new Promise((r) => setTimeout(r, 4000));
}
fs.writeFileSync(`${dir}/sources.json`, JSON.stringify(out, null, 2) + '\n');
