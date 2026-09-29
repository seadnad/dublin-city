// The DART: two stylised four-car Irish Rail EMUs (the green 8100 / 8500 look, refs 15, 18-20 in docs/research/railway.md)
// running back and forth on the city-centre line (src/world/railline.js), stopping at Connolly, Tara Street, Pearse,
// Grand Canal Dock and Lansdowne Road, and reversing at the ends. They keep left: southbound on the east track,
// northbound on the west. Lit windows after dark, white lamps at the leading end and red at the tail.
// Kept apart from the Luas (src/game/luas.js): the trains run on the viaduct, so they need no collision with cars.
// Draw calls: the cab cars, the middle cars and the lamps are one instanced mesh each, for both trains.
import * as THREE from 'three';
import * as R from '../world/railline.js';
import { LITE } from '../render/quality.js';

const CAR = 12.5, GAP = 0.8, CARS = 4, W = 2.9;
export const TRAIN_LEN = CARS * CAR + (CARS - 1) * GAP; // railline.js assumes this for its platforms
const VMAX = 16, ACC = 0.85, DEC = 1.0, CROSSING_V = 7; // m/s (game metres), m/s2
const DWELL = 14, TERMINUS = 30;

// ---------- the livery atlas (1024 x 512) ----------
// 0..256 rows: the car side (u along the car, v from the solebar at 1.0 m to the eaves at 3.25 m); below that the cab
// front (256 x 256), the roof and underframe swatches and the gangway end
const A = { side: [0, 0, 1024, 256], cab: [0, 256, 256, 256], roof: [256, 256, 128, 128], dark: [384, 256, 128, 128], end: [512, 256, 256, 256] };
const GREEN = '#57a034', DARKG = '#2f5f22', LIME = '#c8dc38', GLASS = '#1d2528', YELLOW = '#efcf1c';
function paintAtlas(g, night) {
  g.fillStyle = night ? '#000' : '#888'; g.fillRect(0, 0, 1024, 512);
  const side = A.side, py = (y) => side[1] + side[3] * (1 - (y - 1.0) / 2.25), px = (z) => side[0] + (z / CAR) * side[2]; // z from the rear end
  const band = (y0, y1, col) => { g.fillStyle = col; g.fillRect(side[0], py(y1), side[2], py(y0) - py(y1)); };
  const win = (z0, z1, y0, y1) => {
    if (night) { g.fillStyle = 'rgba(255,244,214,0.95)'; g.fillRect(px(z0), py(y1), px(z1) - px(z0), py(y0) - py(y1)); return; }
    g.fillStyle = '#10161a'; g.fillRect(px(z0) - 2, py(y1) - 2, px(z1) - px(z0) + 4, py(y0) - py(y1) + 4);
    const gr = g.createLinearGradient(0, py(y1), 0, py(y0)); gr.addColorStop(0, '#50626b'); gr.addColorStop(1, GLASS);
    g.fillStyle = gr; g.fillRect(px(z0), py(y1), px(z1) - px(z0), py(y0) - py(y1));
  };
  if (!night) {
    band(1.0, 3.25, GREEN); band(1.0, 1.32, DARKG); band(1.52, 1.78, LIME); band(3.15, 3.25, DARKG);
  }
  // two double doors a side (a quarter and three quarters along), windows between
  const doors = [CAR * 0.25, CAR * 0.75];
  for (const dz of doors) {
    if (!night) { g.fillStyle = DARKG; g.fillRect(px(dz - 0.7), py(3.0), px(dz + 0.7) - px(dz - 0.7), py(1.02) - py(3.0)); g.fillStyle = LIME; g.fillRect(px(dz) - 1, py(3.0), 2, py(1.02) - py(3.0)); }
    win(dz - 0.6, dz - 0.08, 2.1, 2.9); win(dz + 0.08, dz + 0.6, 2.1, 2.9);
  }
  for (const [z0, z1] of [[0.5, doors[0] - 0.9], [doors[0] + 0.9, doors[1] - 0.9], [doors[1] + 0.9, CAR - 0.5]]) {
    const n = Math.max(1, Math.round((z1 - z0) / 1.6));
    for (let k = 0; k < n; k++) { const a = z0 + ((z1 - z0) * k) / n + 0.08, b = z0 + ((z1 - z0) * (k + 1)) / n - 0.08; win(a, b, 2.02, 2.95); }
  }
  if (!night) { g.fillStyle = '#ffffff'; g.font = 'bold 20px Arial, sans-serif'; g.fillText('DART', px(CAR * 0.5) - 26, py(1.9)); }
  // the cab front: x -1.45..1.45 across, y 1.0..3.72 up
  { const [x, y, w, h] = A.cab, X = (u) => x + ((u + 1.45) / 2.9) * w, Y = (v) => y + h * (1 - (v - 1.0) / 2.72);
    if (!night) {
      g.fillStyle = GREEN; g.fillRect(x, y, w, h);
      g.fillStyle = YELLOW; g.fillRect(X(-1.45), Y(2.25), w, Y(1.15) - Y(2.25));
      g.fillStyle = '#c7271f'; g.fillRect(x, Y(1.15), w, Y(1.0) - Y(1.15));
      g.fillStyle = GLASS; g.fillRect(X(-1.3), Y(3.15), X(1.3) - X(-1.3), Y(2.35) - Y(3.15));
      g.fillStyle = GREEN; g.fillRect(X(-0.5) - 3, Y(3.15), 6, Y(2.35) - Y(3.15)); g.fillRect(X(0.5) - 3, Y(3.15), 6, Y(2.35) - Y(3.15));
      g.fillStyle = '#111'; g.fillRect(X(-0.9), Y(3.55), X(0.9) - X(-0.9), Y(3.25) - Y(3.55)); // the destination blind
      g.fillStyle = '#ff9b2a'; g.font = 'bold 13px Arial'; g.fillText('Howth / Bray', X(-0.7), Y(3.33));
      g.fillStyle = '#1b3a14'; g.font = 'bold 22px Arial'; g.fillText('DART', X(-0.42), Y(1.55));
      g.fillStyle = '#2a2a2a'; for (const u of [-0.95, 0.95]) g.fillRect(X(u) - 16, Y(1.9), 32, Y(1.6) - Y(1.9)); // lamp housings
    } else {
      g.fillStyle = '#000'; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,240,210,0.5)'; g.fillRect(X(-1.3), Y(3.15), X(1.3) - X(-1.3), Y(2.35) - Y(3.15));
      g.fillStyle = '#ff9b2a'; g.font = 'bold 13px Arial'; g.fillText('Howth / Bray', X(-0.7), Y(3.33));
    }
  }
  for (const [k, col] of [['roof', '#8a9095'], ['dark', '#1b1d1f']]) { const [x, y, w, h] = A[k]; g.fillStyle = night ? '#000' : col; g.fillRect(x, y, w, h); }
  { const [x, y, w, h] = A.end; g.fillStyle = night ? '#000' : DARKG; g.fillRect(x, y, w, h); if (!night) { g.fillStyle = '#15191b'; g.fillRect(x + w * 0.35, y + h * 0.2, w * 0.3, h * 0.75); } }
}

// ---------- car geometry (local: x across, y up from the rail top, z along; +z is the cab end) ----------
function carGeometry(cab) {
  const P = [], N = [], U = [];
  const uv = (r, s, t) => [(r[0] + s * r[2]) / 1024, 1 - (r[1] + t * r[3]) / 512]; // s across, t down the region
  const quad = (a, b, c, d, ua, ub, uc, ud) => {
    const e1 = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)), e2 = new THREE.Vector3().subVectors(new THREE.Vector3(...d), new THREE.Vector3(...a));
    const n = e1.cross(e2).normalize().toArray();
    P.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) N.push(...n); U.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
  };
  const H = W / 2, zb = -CAR / 2, zf = CAR / 2, rake = cab ? 0.45 : 0;
  // the body's cross-section, bottom to the roof's crown (right side; mirrored for the left)
  const prof = [[H, 1.0], [H, 3.25], [H - 0.22, 3.56], [H - 0.72, 3.71], [0, 3.76]];
  const zFront = (y) => zf - (cab ? rake * Math.max(0, Math.min(1, (y - 2.2) / 1.1)) : 0);
  // sides (a face per profile segment, the side band mapped to the livery, the roof to its swatch)
  for (const sgn of [1, -1]) {
    for (let k = 0; k + 1 < prof.length; k++) {
      const [x0, y0] = prof[k], [x1, y1] = prof[k + 1];
      const a = [sgn * x0, y0, zb], b = [sgn * x0, y0, zFront(y0)], c = [sgn * x1, y1, zFront(y1)], d = [sgn * x1, y1, zb];
      const r = k === 0 ? A.side : A.roof;
      const uz = (z) => (z - zb) / CAR; // along the car from the rear
      const t0 = k === 0 ? 1 : 0.5, t1 = k === 0 ? 0 : 0.5;
      // seen from outside, the right side (+x) has the front on its left, the left side has it on its right
      if (sgn > 0) quad(a, d, c, b, uv(r, 1 - uz(zb), t0), uv(r, 1 - uz(zb), t1), uv(r, 1 - uz(zFront(y1)), t1), uv(r, 1 - uz(zFront(y0)), t0));
      else quad(a, b, c, d, uv(r, uz(zb), t0), uv(r, uz(zFront(y0)), t0), uv(r, uz(zFront(y1)), t1), uv(r, uz(zb), t1));
    }
  }
  // ends: the cab front (raked above the windscreen sill) or a gangway end, fanned from the profile
  const end = (z, facing, region, rakeIt) => {
    const pts = [...prof.map(([x, y]) => [x, y]), ...prof.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
    pts.push(pts[0]); // close along the bottom
    const c = [0, 2.3];
    for (let i = 0; i + 1 < pts.length; i++) {
      const A0 = pts[i], B0 = pts[i + 1], zz = (y) => (rakeIt ? zFront(y) : z);
      const pa = [A0[0], A0[1], zz(A0[1])], pb = [B0[0], B0[1], zz(B0[1])], pc = [c[0], c[1], zz(c[1])];
      const m = (p) => uv(region, (p[0] + H) / W, 1 - (p[1] - 1.0) / 2.76);
      if (facing > 0) { P.push(...pa, ...pb, ...pc); U.push(...m(pa), ...m(pb), ...m(pc)); } else { P.push(...pb, ...pa, ...pc); U.push(...m(pb), ...m(pa), ...m(pc)); }
      const n = new THREE.Vector3(0, rakeIt ? 0.25 : 0, facing).normalize().toArray(); for (let k = 0; k < 3; k++) N.push(...n);
    }
  };
  end(zb, -1, A.end, false);
  end(zf, 1, cab ? A.cab : A.end, cab);
  // underframe and bogies (dark boxes), and a pantograph on the middle cars
  const box = (x0, x1, y0, y1, z0, z1, r = A.dark) => {
    const u = uv(r, 0.5, 0.5);
    const f = (a, b, c, d) => quad(a, b, c, d, u, u, u, u);
    f([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); f([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    f([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]); f([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    f([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  };
  box(-1.25, 1.25, 0.5, 1.0, zb + 0.4, zf - 0.4);
  for (const bz of [zb + 2.3, zf - 2.3]) box(-1.3, 1.3, 0.05, 0.75, bz - 1.3, bz + 1.3);
  if (!cab) {
    const pz = zb + 3.0;
    box(-0.9, 0.9, 3.76, 3.86, pz - 0.6, pz + 0.6);
    box(-0.05, 0.05, 3.86, 4.55, pz - 0.05, pz + 0.9); box(-0.05, 0.05, 4.4, 4.55, pz + 0.6, pz + 1.0);
    box(-0.8, 0.8, 4.52, 4.6, pz + 0.85, pz + 1.0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return g;
}

// ---------- the running ----------
const stops = R.stations.map((st) => st.stop);
const S_MIN = 30, S_MAX = R.stations.find((st) => st.name === 'Lansdowne Road').stop; // the train's middle at each end
const CROSS = R.LANSDOWNE.crossing;

export function createDart(scene, { trains = 2 } = {}) {
  const canvas = (night) => { const c = document.createElement('canvas'), k = LITE ? 0.5 : 1; c.width = 1024 * k * (night ? 0.5 : 1); c.height = 512 * k * (night ? 0.5 : 1); const g = c.getContext('2d'); g.scale(c.width / 1024, c.height / 512); paintAtlas(g, night); return c; };
  const map = new THREE.CanvasTexture(canvas(false)), em = new THREE.CanvasTexture(canvas(true));
  map.colorSpace = em.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0, roughness: 0.42, metalness: 0.25 });
  mat.name = 'dart';
  const cabs = new THREE.InstancedMesh(carGeometry(true), mat, 2 * trains), mids = new THREE.InstancedMesh(carGeometry(false), mat, (CARS - 2) * trains);
  // head and tail lamps: a pair of small quads on each cab, white at the leading end and red at the trailing one
  const lampGeo = (() => {
    const g = [];
    for (const x of [-0.95, 0.95]) g.push(new THREE.PlaneGeometry(0.34, 0.22).translate(x, 1.75, CAR / 2 + 0.03));
    return mergePlanes(g);
  })();
  const lamps = new THREE.InstancedMesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 2 * trains);
  for (const m of [cabs, mids, lamps]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.name = 'DART'; }
  cabs.castShadow = mids.castShadow = true; cabs.receiveShadow = mids.receiveShadow = true;
  lamps.castShadow = false;
  scene.add(cabs, mids, lamps);

  // train k starts at one end or the other, so they run in opposite directions and never share a track
  const list = Array.from({ length: trains }, (_, k) => ({ s: k % 2 ? S_MAX : S_MIN, dir: k % 2 ? -1 : 1, v: 0, dwell: 6 + k * 3 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  const white = new THREE.Color(0xfff4dc), red = new THREE.Color(0xff2a1a);
  function nextStop(t) {
    let best = t.dir > 0 ? S_MAX : S_MIN;
    for (const s of stops) if (t.dir > 0 ? s > t.s + 0.5 && s < best : s < t.s - 0.5 && s > best) best = s;
    return best;
  }
  function place(t, k) {
    const trackQ = (s) => t.dir * R.trackAt(s); // keep left: +q (east) southbound, -q northbound
    let ci = 0, mi = 0;
    for (let i = 0; i < CARS; i++) {
      // car i counted from the front; its centre along the line
      const c = t.s + t.dir * (TRAIN_LEN / 2 - CAR / 2 - i * (CAR + GAP));
      const fa = c + t.dir * CAR * 0.33, ra = c - t.dir * CAR * 0.33;
      const F = R.offsetAt(fa, trackQ(fa)), B = R.offsetAt(ra, trackQ(ra)), yF = R.railTop(fa), yB = R.railTop(ra);
      const dx = F.x - B.x, dz = F.z - B.z, L = Math.hypot(dx, dz) || 1;
      e.set(-Math.atan2(yF - yB, L), Math.atan2(dx, dz), 0);
      const rear = i === CARS - 1;
      if (rear) e.y += Math.PI, e.x = -e.x; // the rear cab faces back down the train
      pos.set((F.x + B.x) / 2, (yF + yB) / 2, (F.z + B.z) / 2);
      m4.compose(pos, q.setFromEuler(e), sc);
      if (i === 0 || rear) { cabs.setMatrixAt(k * 2 + ci, m4); lamps.setMatrixAt(k * 2 + ci, m4); lamps.setColorAt(k * 2 + ci, rear ? red : white); ci++; } else mids.setMatrixAt(k * (CARS - 2) + mi++, m4);
    }
  }
  const dart = {
    list,
    update(dt) {
      dt = Math.min(dt, 0.1);
      for (const t of list) {
        if (t.dwell > 0) {
          t.dwell -= dt;
          if (t.dwell <= 0 && (t.s <= S_MIN + 0.5 || t.s >= S_MAX - 0.5)) t.dir = t.s <= S_MIN + 0.5 ? 1 : -1;
        } else {
          const target = nextStop(t), dist = Math.abs(target - t.s);
          let want = Math.min(VMAX, Math.sqrt(2 * DEC * Math.max(0, dist - 0.3)));
          if (Math.abs(t.s - CROSS) < 90) want = Math.min(want, CROSSING_V); // over the Lansdowne Road level crossing
          t.v += Math.sign(want - t.v) * Math.min(Math.abs(want - t.v), (want > t.v ? ACC : DEC * 1.5) * dt);
          t.s += t.dir * Math.min(t.v * dt, dist);
          if (dist - t.v * dt <= 0.05 && t.v < 1.2) {
            t.s = target; t.v = 0;
            t.dwell = target <= S_MIN + 0.5 || target >= S_MAX - 0.5 ? TERMINUS : DWELL;
          }
        }
      }
      list.forEach(place);
      for (const m of [cabs, mids, lamps]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
      if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
    },
    setNight(l) { mat.emissiveIntensity = 1.2 * l; lamps.material.color.setScalar(0.75 + 0.6 * l); },
  };
  dart.update(0);
  return dart;
}

function mergePlanes(list) {
  const P = [], N = [], U = [];
  for (const g of list) {
    const ng = g.toNonIndexed();
    P.push(...ng.attributes.position.array); N.push(...ng.attributes.normal.array); U.push(...ng.attributes.uv.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return g;
}
