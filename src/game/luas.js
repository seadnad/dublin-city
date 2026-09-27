// Luas Red Line tram: three carriages running back and forth along the route, pausing at stops.
import * as THREE from 'three';
import { world, v2, offsetPolyline, resample } from '../world/geo.js';
import { makeTramCar } from './vehicles.js';

const CAR_LEN = 11, GAP = 1.2, N = 3;
const TRACK = 1.8; // distance of each track from the route centreline

function arcTable(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + v2.len(v2.sub(pts[i], pts[i - 1])));
  return s;
}
function sample(pts, table, d) {
  d = Math.max(0, Math.min(table[table.length - 1], d));
  let lo = 0, hi = table.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m] <= d) lo = m; else hi = m; }
  const t = (d - table[lo]) / (table[hi] - table[lo] || 1);
  return v2.lerp(pts[lo], pts[hi], t);
}

export function createLuas(scene) {
  const centre = resample(world.luas.pts, 2);
  // outbound (along route) keeps left; inbound uses the other track, reversed
  const tracks = [offsetPolyline(centre, -TRACK), offsetPolyline(centre, TRACK).reverse()];
  const tables = tracks.map(arcTable);
  const total = tables[0][tables[0].length - 1];

  // stop positions as arc distance on the centreline
  const cTable = arcTable(centre);
  const stops = Object.entries(world.luas.stops).map(([id, name]) => {
    const n = world.nodes.get(id);
    let best = 0, bd = Infinity;
    centre.forEach((p, i) => { const d = (p.x - n.x) ** 2 + (p.z - n.z) ** 2; if (d < bd) { bd = d; best = cTable[i]; } });
    return { name, s: Math.max(N * (CAR_LEN + GAP), Math.min(total - 5, best)) };
  });

  const group = new THREE.Group();
  const cars = [];
  for (let i = 0; i < N; i++) {
    const m = makeTramCar({ cab: i === 0 || i === N - 1, len: CAR_LEN });
    if (i === N - 1) m.children.forEach((c) => c.geometry && c.geometry.rotateY(Math.PI)); // rear cab faces backwards
    group.add(m); cars.push(m);
  }
  scene.add(group);

  // stop platforms with a small shelter
  const platMat = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.9 });
  const shelterMat = new THREE.MeshStandardMaterial({ color: 0x3c3c40, roughness: 0.5, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb4bf, roughness: 0.1, transparent: true, opacity: 0.35 });
  for (const st of stops) {
    for (const side of [-1, 1]) {
      const p = sample(centre, cTable, st.s), q = sample(centre, cTable, st.s + 1);
      const d = v2.norm(v2.sub(q, p));
      const nrm = { x: -d.z, z: d.x };
      const off = side * (TRACK + 2.9);
      const g = new THREE.Group();
      const plat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 26), platMat);
      plat.position.y = 0.15; plat.receiveShadow = true; g.add(plat);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 5), shelterMat);
      roof.position.set(side * 0.3, 2.8, 0); roof.castShadow = true; g.add(roof);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.3, 5), glass);
      back.position.set(side * 1.1, 1.45, 0); g.add(back);
      g.position.set(p.x + nrm.x * off, 0, p.z + nrm.z * off);
      g.rotation.y = Math.atan2(d.x, d.z);
      scene.add(g);
    }
  }

  const tram = {
    name: world.luas.name,
    dir: 0, s: N * (CAR_LEN + GAP) + 2, speed: 0, dwell: 4, nextStop: null,
    carriages: cars.map(() => ({ x: 0, z: 0, heading: 0, hx: 1.25, hz: CAR_LEN / 2 })),
    stops, currentStop: null,
  };
  function upcomingStop() {
    // stops are measured on the centreline in outbound terms; convert for inbound
    const list = tram.dir === 0 ? stops.map((s) => s.s) : stops.map((s) => total - s.s);
    let best = null;
    for (const s of list) if (s > tram.s + 0.5 && (best === null || s < best)) best = s;
    return best === null ? total - 1 : best;
  }

  tram.update = (dt) => {
    if (tram.dwell > 0) {
      tram.dwell -= dt;
    } else {
      const stopAt = upcomingStop();
      const dist = stopAt - tram.s;
      const want = Math.min(13, Math.sqrt(Math.max(0, dist) * 2 * 1.1));
      tram.speed += Math.sign(want - tram.speed) * Math.min(Math.abs(want - tram.speed), 1.3 * dt);
      tram.s += tram.speed * dt;
      if (dist < 0.4 && tram.speed < 0.6) {
        tram.speed = 0; tram.dwell = 7;
        if (stopAt >= total - 1.5) { // end of the line: swap to the other track
          tram.dir ^= 1;
          tram.s = N * (CAR_LEN + GAP) + 2;
        }
      }
    }
    const pts = tracks[tram.dir], table = tables[tram.dir];
    for (let i = 0; i < N; i++) {
      const front = tram.s - i * (CAR_LEN + GAP);
      const a = sample(pts, table, front), b = sample(pts, table, front - CAR_LEN);
      const c = tram.carriages[i];
      c.x = (a.x + b.x) / 2; c.z = (a.z + b.z) / 2; c.heading = Math.atan2(a.x - b.x, a.z - b.z);
      cars[i].position.set(c.x, 0, c.z);
      cars[i].rotation.y = c.heading;
    }
    // stop label for the HUD
    tram.currentStop = null;
    if (tram.dwell > 0) {
      for (const st of stops) {
        const s = tram.dir === 0 ? st.s : total - st.s;
        if (Math.abs(s - tram.s) < 3) tram.currentStop = st.name;
      }
    }
  };

  // circle vs carriage boxes, for the player car
  tram.collide = (c, r) => {
    let hit = null;
    for (const k of tram.carriages) {
      const dx = c.x - k.x, dz = c.z - k.z;
      if (dx * dx + dz * dz > 100) continue;
      const cs = Math.cos(k.heading), sn = Math.sin(k.heading);
      // world -> local (inverse of rotation about y)
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const qx = Math.max(-k.hx, Math.min(k.hx, lx)), qz = Math.max(-k.hz, Math.min(k.hz, lz));
      let ex = lx - qx, ez = lz - qz;
      let d = Math.hypot(ex, ez), depth, nx, nz;
      if (d > 1e-4) {
        if (d >= r) continue;
        depth = r - d; ex /= d; ez /= d;
      } else {
        // centre inside the box: push out along the shallowest axis
        const px = k.hx - Math.abs(lx), pz = k.hz - Math.abs(lz);
        if (px < pz) { ex = Math.sign(lx) || 1; ez = 0; depth = px + r; } else { ex = 0; ez = Math.sign(lz) || 1; depth = pz + r; }
      }
      // local -> world
      nx = ex * cs + ez * sn; nz = -ex * sn + ez * cs;
      c.x += nx * depth; c.z += nz * depth;
      if (!hit || depth > hit.depth) hit = { nx, nz, depth };
    }
    return hit;
  };
  tram.update(0);
  return tram;
}
