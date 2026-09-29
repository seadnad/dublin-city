// Run a probe function in the page once the city is ready: PROBE=file.js holding `d => ({ ... })` (d = window.__dublin)
import fs from 'node:fs';
export default async function (page) {
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 180000 });
  await new Promise((r) => setTimeout(r, +(process.env.WAIT || 1500)));
  const src = fs.readFileSync(process.env.PROBE, 'utf8');
  const out = await page.evaluate(`(async () => { const d = window.__dublin; return JSON.stringify(await (${src})(d)); })()`);
  console.log('PROBE', out);
}
