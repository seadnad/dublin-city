// montage: node montage.mjs out.png cols width img1 img2 ...
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [out, cols, w, ...imgs] = process.argv.slice(2);
const W = +w;
const url = (p) => `data:image/${p.endsWith('.jpg') ? 'jpeg' : 'png'};base64,${fs.readFileSync(p).toString('base64')}`;
const html = `<!doctype html><html><body style="margin:0;background:#111;color:#ddd;font:12px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${W}px);gap:4px">${imgs.map((p) => `<div><img src="${url(p)}" style="width:${W}px;display:block"><div>${path.basename(p)}</div></div>`).join('')}</div></body></html>`;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const pg = await b.newPage();
await pg.setViewport({ width: cols * (W + 4), height: 400 });
await pg.setContent(html, { waitUntil: 'load' });
await pg.screenshot({ path: out, fullPage: true });
await b.close();

