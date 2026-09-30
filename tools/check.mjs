// Headless smoke test: serve the app, open it in Chrome, report errors/fps, and screenshot.
// Usage: node tools/check.mjs [scenario.mjs] [--build] [--mobile] [--url=https://...]   (scenario default-exports async (page, shot) => {})
import { createServer, preview, build } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const useBuild = args.includes('--build');
const mobile = args.includes('--mobile');
const scenarioPath = args.find((a) => a.endsWith('.mjs'));
const outDir = path.resolve('tools/shots');
fs.mkdirSync(outDir, { recursive: true });

const CHROME = process.env.BROWSER || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

const remote = args.find((a) => a.startsWith('--url='));
let server, url;
if (remote) {
  url = remote.slice(6);
  server = { close: async () => {} };
} else if (useBuild) {
  await build({ logLevel: 'warn' });
  server = await preview({ preview: { port: 4174 } });
  // Vite moves to the next free port if this one is taken (e.g. another checkout's test): use the one it got
  url = (server.resolvedUrls && server.resolvedUrls.local[0]) || 'http://localhost:4174/';
} else {
  server = await createServer({ server: { port: 5199 }, logLevel: 'warn' });
  await server.listen();
  url = (server.resolvedUrls && server.resolvedUrls.local[0]) || 'http://localhost:5199/';
}

// Chrome profile: a named temp dir we delete on exit, and sweep stale ones (runs cut off by a timeout used to leave
// ~115 MB each behind, which filled the disk). PROFILE_DIR reuses a profile instead (warm shader / HTTP caches).
const TMP = os.tmpdir();
for (const d of fs.readdirSync(TMP)) {
  if (!/^(dublin-check-|puppeteer_dev_chrome_profile-)/.test(d)) continue;
  try { const f = path.join(TMP, d); if (Date.now() - fs.statSync(f).mtimeMs > 30 * 60e3) fs.rmSync(f, { recursive: true, force: true }); } catch {}
}
const profile = process.env.PROFILE_DIR || fs.mkdtempSync(path.join(TMP, 'dublin-check-'));
const dropProfile = () => { if (!process.env.PROFILE_DIR) try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', dropProfile);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(1));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: scenarioPath && path.basename(scenarioPath) === 'bridges.mjs' ? 600000 : 180000,
  userDataDir: profile,
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--window-size=1280,720', ...(process.env.PERF ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [])],
});
const page = await browser.newPage();
if (mobile) await page.emulate({ viewport: { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' });
else await page.setViewport({ width: 1280, height: 720 });

const problems = [];
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning') problems.push(`[${t}] ${m.text()}`);
  else if (process.env.VERBOSE) console.log(`[${t}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}\n${e.stack || ''}`));

const t0 = Date.now();
await page.goto(url, { waitUntil: 'load', timeout: 180000 });
try {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready !== false, { timeout: 180000 });
} catch (e) {
  problems.push('Timed out waiting for window.__dublin');
}
console.log(`loaded in ${Date.now() - t0} ms`);

let n = 0;
const shot = async (name) => {
  const file = path.join(outDir, `${String(++n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file });
  console.log('shot', file);
};
const fps = async (ms = 2000) => page.evaluate((ms) => new Promise((res) => {
  let f = 0; const s = performance.now();
  const tick = () => { f++; if (performance.now() - s < ms) requestAnimationFrame(tick); else res(Math.round((f * 1000) / (performance.now() - s))); };
  requestAnimationFrame(tick);
}), ms);

if (scenarioPath) {
  const mod = await import(pathToFileURL(path.resolve(scenarioPath)).href);
  await mod.default(page, shot, { fps });
} else {
  await new Promise((r) => setTimeout(r, 2000));
  await shot('default');
}
console.log('fps (headless, indicative):', await fps());
const stats = await page.evaluate(() => (window.__dublin && window.__dublin.stats ? window.__dublin.stats() : null)).catch(() => null);
console.log('stats', JSON.stringify(stats));

console.log(problems.length ? `\n${problems.length} console problems:\n${problems.slice(0, 30).join('\n')}` : '\nno console errors');
await browser.close();
await (server.close ? server.close() : server.httpServer.close());
process.exit(0);
