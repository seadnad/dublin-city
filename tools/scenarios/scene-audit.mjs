export default async function (page) {
  const data = await page.evaluate(() => {
    const d = window.__dublin, b = new d.THREE.Box3(), c = new d.THREE.Vector3(), s = new d.THREE.Vector3();
    const mats = new Map(); let near = 0, far = 0, huge = 0;
    d.scene.updateMatrixWorld(true);
    d.scene.traverse((o) => {
      if (!o.isMesh || !o.material || !o.geometry) return;
      b.setFromObject(o); if (b.isEmpty()) return;
      b.getCenter(c); b.getSize(s);
      const radius = s.length() / 2, distance = Math.hypot(c.x - d.car.pos.x, c.z - d.car.pos.z);
      const zone = radius > 300 ? 'huge' : distance > 750 ? 'far' : 'near';
      if (zone === 'far') far++; else if (zone === 'huge') huge++; else near++;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        const a = mats.get(m.uuid) || { near: 0, far: 0, huge: 0, name: m.type, example: o.name || o.parent?.name || '' };
        a[zone]++; mats.set(m.uuid, a);
      }
    });
    return { near, far, huge, mats: mats.size, farOnlyMats: [...mats.values()].filter((m) => m.far && !m.near && !m.huge).length,
      farTypes: [...mats.values()].filter((m) => m.far && !m.near && !m.huge).reduce((a, m) => (a[m.name] = (a[m.name] || 0) + 1, a), {}),
      examples: [...mats.values()].filter((m) => m.far && !m.near && !m.huge).slice(0, 30).map((m) => m.example) };
  });
  console.log('scene audit', JSON.stringify(data));
}
