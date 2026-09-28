// Write src/data/streets.json in its house style: 2-space indent, one node / way / point per line.
import fs from 'node:fs';

const inline = (v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`
  : Array.isArray(v) ? `[${v.map(inline).join(', ')}]` : JSON.stringify(v));
function fmt(v, ind = '') {
  const next = ind + '  ';
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== 'object')) return inline(v);
    return `[\n${v.map((x) => next + (Array.isArray(x) || isFlatObj(x) ? inline(x) : fmt(x, next))).join(',\n')}\n${ind}]`;
  }
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (!ks.length) return '{}';
    return `{\n${ks.map((k) => `${next}${JSON.stringify(k)}: ${fmt(v[k], next)}`).join(',\n')}\n${ind}}`;
  }
  return JSON.stringify(v);
}
// ways are flat objects written on one line
const isFlatObj = (x) => x && typeof x === 'object' && !Array.isArray(x) && Object.values(x).every((y) => y === null || typeof y !== 'object' || (Array.isArray(y) && y.every((z) => typeof z !== 'object')));

export function writeStreets(data, file = 'src/data/streets.json') { fs.writeFileSync(file, fmt(data) + '\n'); }
if (process.argv[1] && process.argv[1].endsWith('streets-fmt.mjs')) {
  const f = process.argv[2] || 'src/data/streets.json';
  writeStreets(JSON.parse(fs.readFileSync(f, 'utf8')), f);
}
