// Traces the DART's city-centre line out of the OpenStreetMap pull (data/osm/railway.json, docs/research/railway.md)
// and writes its centreline to src/data/railway.json: the shortest path over the mainline rail ways from the Great
// Northern line north of the Royal Canal, through Connolly (the Loop Line platforms), over the Loopline Bridge, Tara
// Street and Pearse, past Grand Canal Dock to Lansdowne Road, simplified to about half a metre in game metres.
// Usage: node tools/railway-line.mjs   (then run the Blender build: tools/blender/build_loopline.py)
import fs from 'node:fs';

const osm = JSON.parse(fs.readFileSync('data/osm/railway.json', 'utf8'));
const out = 'src/data/railway.json';
const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};

const M = 111320, ML = 111320 * Math.cos((53.347 * Math.PI) / 180);
const key = (p) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
const dist = (p, q) => Math.hypot((p.lat - q.lat) * M, (p.lon - q.lon) * ML);
const adj = new Map(), pos = new Map();
for (const e of osm.elements) {
  const t = e.tags || {};
  if (e.type !== 'way' || t.railway !== 'rail' || t.service || !e.geometry || (t.usage && t.usage !== 'main')) continue;
  // the branches to the North Wall (the Loop Line's curve north of Connolly, the GSWR and MGWR lines) are not the DART's
  if (/North Wall|Newcomen|East Wall/.test(t.name || '') || (t.name === 'Dublin Loop Line' && e.geometry.every((p) => p.lat > 53.3545))) continue;
  const g = e.geometry;
  for (let i = 0; i + 1 < g.length; i++) {
    const a = key(g[i]), b = key(g[i + 1]), w = dist(g[i], g[i + 1]);
    pos.set(a, g[i]); pos.set(b, g[i + 1]);
    for (const [u, v] of [[a, b], [b, a]]) { if (!adj.has(u)) adj.set(u, []); adj.get(u).push({ v, w }); }
  }
}
const nearest = (lat, lon) => { let best, bd = Infinity; for (const [k, p] of pos) { const d = dist(p, { lat, lon }); if (d < bd) { bd = d; best = k; } } return best; };
function shortest(s, t) {
  const D = new Map([[s, 0]]), P = new Map(), done = new Set(), q = [s];
  while (q.length) {
    q.sort((a, b) => D.get(a) - D.get(b));
    const u = q.shift();
    if (done.has(u)) continue;
    done.add(u);
    if (u === t) break;
    for (const { v, w } of adj.get(u) || []) if (D.get(u) + w < (D.get(v) ?? Infinity)) { D.set(v, D.get(u) + w); P.set(v, u); q.push(v); }
  }
  const path = [];
  for (let c = t; c; c = P.get(c)) path.unshift(pos.get(c));
  return path;
}
// from the Great Northern main line north of the Royal Canal to Lansdowne Road
const VIA = [[53.3590, -6.2348], [53.33377, -6.22871]];
let path = [];
for (let i = 0; i + 1 < VIA.length; i++) {
  const seg = shortest(nearest(...VIA[i]), nearest(...VIA[i + 1]));
  path.push(...(path.length ? seg.slice(1) : seg));
}
// simplify (Ramer-Douglas-Peucker) in local metres, halved like the game map
const xy = (p) => ({ x: (p.lon + 6.25915) * ML * 0.5, y: -(p.lat - 53.34727) * M * 0.5 });
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const a = xy(pts[0]), b = xy(pts[pts.length - 1]);
  let worst = 0, wi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = xy(pts[i]), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const d = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L;
    if (d > worst) { worst = d; wi = i; }
  }
  if (worst <= tol) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, wi + 1), tol).slice(0, -1), ...rdp(pts.slice(wi), tol)];
}
const line = rdp(path, 0.35).map((p) => [+p.lat.toFixed(6), +p.lon.toFixed(6)]);
let L = 0;
for (let i = 1; i < path.length; i++) L += dist(path[i - 1], path[i]);
const data = {
  about: prev.about || 'The DART line through the city centre (docs/research/railway.md): centreline [lat, lon] from OSM (tools/railway-line.mjs), north to south. Stations are anchored at [lat, lon] and measured along the line at load (src/world/railline.js).',
  source: `OpenStreetMap (ODbL), data/osm/railway.json, ${osm.osm3s?.timestamp_osm_base || ''}`,
  line,
  ...Object.fromEntries(Object.entries(prev).filter(([k]) => !['about', 'source', 'line'].includes(k))),
};
fs.writeFileSync(out, JSON.stringify(data, null, 1).replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2]') + '\n');
console.log(`${path.length} OSM points, ${line.length} kept, ${L.toFixed(0)} m real -> ${out}`);
