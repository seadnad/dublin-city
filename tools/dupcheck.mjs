// Duplicate node IDs in src/data/streets.json: JSON.parse silently keeps the last one, which moves the first node.
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2] || 'src/data/streets.json', 'utf8');
const block = text.slice(text.indexOf('"nodes"'), text.indexOf('"ways"'));
const seen = new Map(), dups = [];
for (const m of block.matchAll(/"([^"]+)":\s*\[/g)) { if (seen.has(m[1])) dups.push(m[1]); seen.set(m[1], true); }
const data = JSON.parse(text);
const missing = [];
for (const w of data.ways) for (const id of w.nodes) if (!data.nodes[id]) missing.push(`${w.name}: ${id}`);
console.log(`${seen.size} nodes, ${data.ways.length} ways`);
if (dups.length) console.log('DUPLICATE node ids:', dups.join(', '));
if (missing.length) console.log('MISSING nodes:', missing.join('; '));
if (!dups.length && !missing.length) console.log('ok');
process.exit(dups.length || missing.length ? 1 : 0);
