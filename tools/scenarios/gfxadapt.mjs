// Graphics settings check: throttle the CPU (a loaded laptop), watch Auto step down, then switch modes via the menu.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot, { fps }) {
  await wait(3000);
  const client = await page.target().createCDPSession();
  const rate = Number(process.env.THROTTLE || 6);
  await client.send('Emulation.setCPUThrottlingRate', { rate });
  for (let i = 0; i < 6; i++) {
    const f = await fps(2000);
    console.log('ADAPT', `t+${(i + 1) * 2}s`, `${f} fps`, JSON.stringify(await page.evaluate(() => window.__dublin.gfx())));
  }
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  // the menu: open Play, pick each mode
  await page.keyboard.press('g'); await wait(400);
  await shot('play-menu-gfx');
  for (const m of ['high', 'saver', 'auto']) {
    await page.evaluate((m) => document.querySelector(`[data-gfx="${m}"]`).click(), m);
    await wait(1500);
    const f = await fps(1500);
    console.log('MODE', m.padEnd(6), `${f} fps`, JSON.stringify(await page.evaluate(() => window.__dublin.gfx())), 'saved:', await page.evaluate(() => localStorage.getItem('dublin.gfx')));
  }
}
