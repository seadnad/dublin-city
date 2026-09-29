// Where can you see the Gravity Bar from? Samples the drivable streets round the brewery every ~12 m at a driver's
// chase-camera height, casts a ray to the glass drum on the Storehouse roof and lists the stretches of road where
// nothing is in the way (docs/research/guinness.md 6). SIGHT_Y overrides the eye height (default 3).
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page) {
  await wait(9000); // the hero loads after the city is up
  const r = await page.evaluate((eye) => {
    const d = window.__dublin, { THREE, scene, camera, world, sites } = d;
    const bar = sites.guinness.bar, target = new THREE.Vector3(bar.x, bar.y + 1.5, bar.z);
    const ray = new THREE.Raycaster(); ray.camera = camera;
    const visibleChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const inStorehouse = (o) => { for (let p = o; p; p = p.parent) if (p.name === 'Guinness Storehouse') return true; return false; };
    const names = /Quay|Island|James's Street|Thomas Street|St John's Road|Steevens|Market Street|Echlin|Watling|Bridgefoot|Crane|Bridge|Parkgate|Benburb|Arran|Ellis|Wolfe Tone|Queen Street|Blackhall|Military/;
    const out = {};
    for (const way of world.ways) {
      if (!names.test(way.name)) continue;
      for (let i = 0; i < way.pts.length - 1; i++) {
        const a = way.pts[i], b = way.pts[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
        for (let s = 0; s <= L; s += 12) {
          const x = a.x + ((b.x - a.x) * s) / L, z = a.z + ((b.z - a.z) * s) / L;
          const from = new THREE.Vector3(x, eye, z), dir = target.clone().sub(from), dist = dir.length();
          if (dist > 1600) continue;
          ray.set(from, dir.normalize()); ray.far = dist + 2;
          const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.isMesh && visibleChain(h.object) && !h.object.material.transparent);
          const seen = hit && inStorehouse(hit.object) && hit.distance > dist - 12;
          const k = way.name; out[k] = out[k] || { n: 0, seen: 0, where: [] };
          out[k].n++;
          if (seen) { out[k].seen++; if (out[k].where.length < 6) out[k].where.push([Math.round(x), Math.round(z), Math.round(dist)]); }
        }
      }
    }
    return out;
  }, Number(process.env.SIGHT_Y || 3));
  for (const [k, v] of Object.entries(r).sort((a, b) => b[1].seen - a[1].seen)) console.log(k.padEnd(28), `${v.seen}/${v.n}`, JSON.stringify(v.where));
}
