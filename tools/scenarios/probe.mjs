export default async function (page) {
  await new Promise((r) => setTimeout(r, 6000));
  const r = await page.evaluate(() => {
    const m = window.__dublin.carMesh(), out = {};
    m.traverse((o) => { if (o.isMesh) { const mt = o.material; out[mt.name || mt.type + ':' + mt.color.getHexString()] = { tris: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, vis: o.visible, transparent: mt.transparent }; } });
    return { model: m.userData.model, parts: out };
  });
  console.log(JSON.stringify(r, null, 0));
}
