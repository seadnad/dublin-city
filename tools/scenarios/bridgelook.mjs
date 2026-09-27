// Top-down look at O'Connell Bridge's corners (deck vs quay walls) and a chase view onto it.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(4000);
  await page.evaluate(() => {
    const d = window.__dublin, b = d.world.ways.find((w) => w.name === "O'Connell Bridge");
    const a = b.pts[0], c = b.pts[b.pts.length - 1];
    d.rig.update = () => {}; d.frozenCam = true;
    d.camera.position.set((a.x + c.x) / 2 + 30, 55, (a.z + c.z) / 2 + 20); d.camera.lookAt((a.x + c.x) / 2, 0, (a.z + c.z) / 2);
  });
  await wait(800); await shot('bridge-top');
}
