// Cheap 2D pedestrian/vehicle contact. Vehicle headings follow the game's +z-forward convention.
const CELL = 12;
const EMPTY = [];
const key = (x, z) => `${x},${z}`;

export function parkedVehicleGrid(vehicles) {
  const cells = new Map();
  for (const v of vehicles) {
    const reach = Math.max(v.length, v.width) / 2 + 0.4;
    const x0 = Math.floor((v.x - reach) / CELL), x1 = Math.floor((v.x + reach) / CELL);
    const z0 = Math.floor((v.z - reach) / CELL), z1 = Math.floor((v.z + reach) / CELL);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = key(x, z);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(v);
    }
  }
  return { near(x, z) { return cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || EMPTY; } };
}

// Push a pedestrian disc outside an oriented vehicle box. Returns true only on contact.
export function separatePedestrian(p, v, radius = 0.3) {
  const vx = v.pos ? v.pos.x : v.x, vz = v.pos ? v.pos.z : v.z;
  const width = v.width ?? v.h.W, length = v.length;
  const dx = p.x - vx, dz = p.z - vz;
  const reach = Math.max(length, width) / 2 + radius;
  if (Math.abs(dx) > reach || Math.abs(dz) > reach) return false;
  const c = Math.cos(v.heading), s = Math.sin(v.heading);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const hx = width / 2 + radius, hz = length / 2 + radius;
  if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) return false;
  const side = hx - Math.abs(lx), end = hz - Math.abs(lz);
  if (side < end) {
    const push = (lx >= 0 ? side : -side) + (lx >= 0 ? 0.01 : -0.01);
    p.x += push * c; p.z -= push * s;
  } else {
    const push = (lz >= 0 ? end : -end) + (lz >= 0 ? 0.01 : -0.01);
    p.x += push * s; p.z += push * c;
  }
  return true;
}
