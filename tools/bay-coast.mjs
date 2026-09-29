// Dublin Bay coastline for the far view (world/farview.js): OSM natural=coastline ways (ODbL, data/osm/dublin-bay-
// coastline.json, pulled from Overpass for 53.17..53.48 N, 6.30..5.95 W) simplified to ~12 m and written to
// src/data/bay.json as [lat, lon] polylines (5 decimals). The game floods the sea from a seed point in the bay.
// Usage: node tools/bay-coast.mjs
import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync('data/osm/dublin-bay-coastline.json', 'utf8'));
const M_LAT = 111320, M_LON = 111320 * Math.cos((53.347 * Math.PI) / 180);
const xy = ([lat, lon]) => [lon * M_LON, lat * M_LAT];
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = xy(pts[a]), [bx, by] = xy(pts[b]);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy(pts[i]);
      const d = Math.abs((px - ax) * dy - (py - ay) * dx) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const ways = src.elements.filter((e) => e.type === 'way' && e.geometry)
  .map((w) => simplify(w.geometry.map((p) => [p.lat, p.lon]), 12).map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]))
  .filter((w) => w.length > 1);
fs.writeFileSync('src/data/bay.json', JSON.stringify({ source: 'OpenStreetMap contributors (ODbL), natural=coastline, simplified to 12 m', ways }) + '\n');
console.log(ways.length, 'ways', ways.reduce((a, w) => a + w.length, 0), 'points', fs.statSync('src/data/bay.json').size, 'bytes');
