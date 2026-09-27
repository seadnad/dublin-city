// Static collision: every obstacle is reduced to line segments in a spatial hash.
// Moving things (car vs. building walls, quay parapets, railings) are resolved as circles.

const CELL = 16;
const hash = new Map();
const key = (i, j) => (i * 73856093) ^ (j * 19349663);
let segCount = 0;

export function addSegment(ax, az, bx, bz) {
  const s = { ax, az, bx, bz, stamp: 0 };
  const i0 = Math.floor(Math.min(ax, bx) / CELL), i1 = Math.floor(Math.max(ax, bx) / CELL);
  const j0 = Math.floor(Math.min(az, bz) / CELL), j1 = Math.floor(Math.max(az, bz) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = key(i, j);
    let arr = hash.get(k);
    if (!arr) hash.set(k, (arr = []));
    arr.push(s);
  }
  segCount++;
}

export function addPolyline(pts, closed = false) {
  for (let i = 0; i < pts.length - 1; i++) addSegment(pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z);
  if (closed && pts.length > 2) addSegment(pts[pts.length - 1].x, pts[pts.length - 1].z, pts[0].x, pts[0].z);
}

// Oriented box: centre, half extents, rotation (radians about +y, same convention as mesh.rotation.y).
export function addBox(x, z, hx, hz, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  // local (lx, lz) -> world: x + lx*c + lz*s, z - lx*s + lz*c   (matches THREE rotation about y)
  const corner = (lx, lz) => ({ x: x + lx * c + lz * s, z: z - lx * s + lz * c });
  const p = [corner(-hx, -hz), corner(hx, -hz), corner(hx, hz), corner(-hx, hz)];
  addPolyline(p, true);
}

export function segmentCount() { return segCount; }

let stamp = 1;
// Push a circle out of all nearby segments. Returns contact info or null.
export function resolveCircle(pos, r) {
  stamp++;
  let hit = null;
  const i0 = Math.floor((pos.x - r) / CELL), i1 = Math.floor((pos.x + r) / CELL);
  const j0 = Math.floor((pos.z - r) / CELL), j1 = Math.floor((pos.z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const arr = hash.get(key(i, j));
    if (!arr) continue;
    for (const s of arr) {
      if (s.stamp === stamp) continue;
      s.stamp = stamp;
      const abx = s.bx - s.ax, abz = s.bz - s.az;
      const l2 = abx * abx + abz * abz || 1e-9;
      let t = ((pos.x - s.ax) * abx + (pos.z - s.az) * abz) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = s.ax + abx * t, cz = s.az + abz * t;
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-6) { dx = -abz; dz = abx; d = Math.hypot(dx, dz); }
      const nx = dx / d, nz = dz / d, depth = r - Math.sqrt(d2);
      pos.x += nx * depth; pos.z += nz * depth;
      if (!hit || depth > hit.depth) hit = { nx, nz, depth };
    }
  }
  return hit;
}

// Segment-vs-walls test used for the camera (returns fraction 0..1 of first hit).
export function raycast(ax, az, bx, bz) {
  stamp++;
  let best = 1;
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / CELL) + 1;
  for (let k = 0; k <= steps; k++) {
    const px = ax + ((bx - ax) * k) / steps, pz = az + ((bz - az) * k) / steps;
    const i = Math.floor(px / CELL), j = Math.floor(pz / CELL);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const arr = hash.get(key(i + di, j + dj));
      if (!arr) continue;
      for (const s of arr) {
        if (s.stamp === stamp) continue;
        s.stamp = stamp;
        const t = segIntersect(ax, az, bx, bz, s.ax, s.az, s.bx, s.bz);
        if (t !== null && t < best) best = t;
      }
    }
  }
  return best;
}

function segIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = cx - ax, qz = cz - az;
  const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}
