// Before / after comparison sheet: a titled grid of labelled image pairs, drawn in headless Chrome.
// Usage: node tools/sheet.mjs spec.json out.png
//   spec: { "title": "...", "note": "...", "width": 640, "rows": [["label", "before.png", "after.png"], ...] }
//   or any number of image columns: "cols": ["Photo", "Day", "Night"] with rows [["label", a, b, c], ...] (null = gap)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [specPath, out] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const W = spec.width || 560;
const COLS = spec.cols || [spec.left || 'Before', spec.right || 'After'];
const mime = (p) => (/\.jpe?g$/i.test(p) ? 'image/jpeg' : 'image/png');
const url = (p) => `data:${mime(p)};base64,${fs.readFileSync(path.resolve(path.dirname(specPath), p)).toString('base64')}`;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 18px 20px 24px; background: #15171a; color: #e8e6e1; font: 14px/1.35 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; font-weight: 650; } p.note { margin: 0 0 14px; color: #a9aab0; }
  .grid { display: grid; grid-template-columns: 150px repeat(${COLS.length}, ${W}px); gap: 8px 10px; align-items: center; }
  .hd { font-weight: 650; color: #cfd2d8; } .lab { color: #d8d4cb; font-size: 13px; }
  img { width: ${W}px; max-height: ${Math.round(W * 0.75)}px; object-fit: cover; display: block; border-radius: 3px; }
</style></head><body><h1>${esc(spec.title)}</h1>${spec.note ? `<p class="note">${esc(spec.note)}</p>` : ''}
<div class="grid"><div></div>${COLS.map((c) => `<div class="hd">${esc(c)}</div>`).join('')}
${spec.rows.map(([l, ...imgs]) => `<div class="lab">${esc(l)}</div>${imgs.map((p) => (p ? `<img src="${url(p)}">` : '<div></div>')).join('')}`).join('\n')}
</div></body></html>`;
const CHROME = process.env.BROWSER || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1200,800', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 150 + COLS.length * (W + 10) + 50, height: 800 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('sheet', out);
