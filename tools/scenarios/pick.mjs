// What's there? Raycast from FROM='x,y,z' towards TO='x,y,z' and list what it hits (names up the parent chain)
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(6000);
  const out = await page.evaluate(async (from, to) => {
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null);
    const d = window.__dublin, [fx, fy, fz] = from.split(',').map(Number), res = [];
    for (const t of to.split(';')) { const [tx, ty, tz] = t.split(',').map(Number);
    const o = d.camera.position.clone().set(fx, fy, fz), dir = o.clone().set(tx - fx, ty - fy, tz - fz).normalize();
    const rc = new (THREE ? THREE.Raycaster : d.Raycaster)(o, dir, 0, 200);
    rc.camera = d.camera;
    const meshes = []; d.scene.traverse((q) => { if ((q.isMesh || q.isInstancedMesh) && q.visible) meshes.push(q); });
    const hits = rc.intersectObjects(meshes, false).slice(0, 6);
    res.push('-> ' + t, ...hits.slice(0, 2).map((h) => { const n = []; let q = h.object; while (q) { if (q.name) n.push(q.name); q = q.parent; } return `${h.distance.toFixed(1)} ${h.object.type} ${n.join(' < ')} inst ${h.instanceId ?? ''} ${h.instanceId != null && h.object.geometry.attributes.aStyle ? JSON.stringify([...h.object.geometry.attributes.aStyle.array.slice(h.instanceId * 4, h.instanceId * 4 + 4)].map((x) => +x.toFixed(2))) + ' ' + JSON.stringify([...h.object.geometry.attributes.aExtra.array.slice(h.instanceId * 4, h.instanceId * 4 + 4)]) + ' h ' + (() => { const m = new h.object.matrixWorld.constructor(); h.object.getMatrixAt(h.instanceId, m); return m.elements[5].toFixed(1) + ' w ' + Math.hypot(m.elements[0], m.elements[2]).toFixed(1) + ' d ' + Math.hypot(m.elements[8], m.elements[10]).toFixed(1); })() : ''} @ ${h.point.x.toFixed(1)},${h.point.y.toFixed(1)},${h.point.z.toFixed(1)}`; })); }
    return res;
  }, process.env.FROM, process.env.TO);
  // (TO may list several targets separated by ;)
  console.log(out.join('\n'));
}
