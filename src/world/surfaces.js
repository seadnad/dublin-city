// High-resolution procedural surface textures (colour + normal + roughness) for streets:
// asphalt, concrete paving slabs, granite kerbs, granite setts (cobbles) and grass.
// Generated once on canvas; tiled with world-space UVs.
import * as THREE from 'three';
import { IS_MOBILE, rng, fbmFast as fbm } from './textures.js';

const SIZE = IS_MOBILE ? 512 : 1024;

function mkCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// Build colour + normal textures from per-pixel colour (Float32 rgb 0..255) and height (0..1) arrays.
function finish(size, col, height, normalStrength, { srgb = true } = {}) {
  const cc = mkCanvas(size), ctx = cc.getContext('2d'), img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    img.data[i * 4] = col[i * 3]; img.data[i * 4 + 1] = col[i * 3 + 1]; img.data[i * 4 + 2] = col[i * 3 + 2]; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const nc = mkCanvas(size), nctx = nc.getContext('2d'), nimg = nctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const up = ((y + size - 1) % size) * size, dn = ((y + 1) % size) * size, row = y * size;
    for (let x = 0; x < size; x++) {
    const xl = (x + size - 1) % size, xr = (x + 1) % size;
    const dx = (height[row + xr] - height[row + xl]) * normalStrength, dy = (height[dn + x] - height[up + x]) * normalStrength;
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    nimg.data[i] = (-dx / l * 0.5 + 0.5) * 255; nimg.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nimg.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(cc), normalMap = new THREE.CanvasTexture(nc);
  for (const t of [map, normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  if (srgb) map.colorSpace = THREE.SRGBColorSpace;
  return { map, normalMap, canvas: cc };
}

// Stamp a round-ish blob into colour/height with wrap-around (tileable).
function blob(size, col, height, cx, cy, r, rgb, hgt, soft = 0.4) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const d2 = (x - cx) ** 2 + (y - cy) ** 2;
    if (d2 > r2) continue;
    const q = d2 / r2, k = 1 - q * q * soft;
    const i = ((y + size) % size) * size + ((x + size) % size);
    col[i * 3] = col[i * 3] * (1 - k) + rgb[0] * k; col[i * 3 + 1] = col[i * 3 + 1] * (1 - k) + rgb[1] * k; col[i * 3 + 2] = col[i * 3 + 2] * (1 - k) + rgb[2] * k;
    height[i] = Math.max(height[i], hgt * k);
  }
}

// ---------------- asphalt: dense aggregate in a grey bitumen matrix. Tile = 4 m ----------------
export function asphalt() {
  const s = SIZE, rand = rng(4001), n = fbm(s, 5, 71), fine = fbm(s, 3, 72);
  const col = new Float32Array(s * s * 3), height = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) {
    const v = 92 + (n[i] - 0.5) * 14 + (rand() - 0.5) * 10;
    col[i * 3] = v; col[i * 3 + 1] = v + 2; col[i * 3 + 2] = v + 6;
    height[i] = fine[i] * 0.25;
  }
  const px = s / 4; // px per metre
  // aggregate: mostly close to the matrix tone, a few pale chips; contrast kept low like worn Dublin tarmac
  const stones = Math.round(s * s * 0.032);
  for (let k = 0; k < stones; k++) {
    const r = (0.004 + Math.pow(rand(), 2.2) * 0.011) * px;
    const t = rand();
    const base = t < 0.6 ? 100 + rand() * 22 : t < 0.9 ? 74 + rand() * 14 : 128 + rand() * 26;
    const warm = rand() * 5;
    blob(s, col, height, rand() * s, rand() * s, Math.max(0.8, r), [base + warm, base + warm * 0.6 + 1, base + 4], 0.6 + rand() * 0.4, 0.2);
  }
  return finish(s, col, height, 2.2);
}

// ---------------- concrete paving slabs, 600 mm, with joints, stains and gum spots. Tile = 3.6 m ----------------
export function paving() {
  const s = SIZE, rand = rng(4002), n = fbm(s, 4, 81), speck = fbm(s, 2, 82);
  const col = new Float32Array(s * s * 3), height = new Float32Array(s * s);
  const slab = s / 6, joint = Math.max(1.5, s / 512 * 2.2);
  const tones = [];
  for (let i = 0; i < 36; i++) tones.push({ v: 150 + (rand() - 0.5) * 26, w: (rand() - 0.5) * 8, stain: rand() < 0.25 ? rand() * 0.18 : 0 });
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = y * s + x;
    const sx = Math.floor(x / slab), sy = Math.floor(y / slab), t = tones[sy * 6 + sx];
    const fx = x - sx * slab, fy = y - sy * slab;
    const edge = Math.min(fx, fy, slab - fx, slab - fy);
    let v = t.v + (n[i] - 0.5) * 22 + (rand() - 0.5) * 14 - t.stain * 100 * n[i];
    let h = 0.8 + speck[i] * 0.1;
    if (edge < joint) { v *= 0.55; h = 0.1; } else if (edge < joint + 2) { h = 0.6; v *= 0.93; }
    col[i * 3] = v + t.w * 0.3; col[i * 3 + 1] = v; col[i * 3 + 2] = v - 3 + t.w * 0.2;
    height[i] = h;
  }
  // chewing gum spots and small dark stains
  for (let k = 0; k < (IS_MOBILE ? 60 : 220); k++) {
    const g = rand() < 0.6 ? 95 + rand() * 30 : 175 + rand() * 25;
    blob(s, col, height, rand() * s, rand() * s, s / 1024 * (2 + rand() * 4), [g, g, g - 4], 0.85, 0.2);
  }
  return finish(s, col, height, 3.0);
}

// ---------------- granite: speckled grey (kerbs, plinths). Tile = 1 m ----------------
export function granite() {
  const s = SIZE / 2, rand = rng(4003), n = fbm(s, 4, 91);
  const col = new Float32Array(s * s * 3), height = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) {
    const v = 150 + (n[i] - 0.5) * 30 + (rand() - 0.5) * 30;
    col[i * 3] = v; col[i * 3 + 1] = v - 1; col[i * 3 + 2] = v - 4;
    height[i] = n[i] * 0.3;
  }
  for (let k = 0; k < s * s * 0.03; k++) {
    const t = rand(), v = t < 0.5 ? 60 + rand() * 30 : 200 + rand() * 40;
    blob(s, col, height, rand() * s, rand() * s, 0.8 + rand() * 1.4, [v, v, v], 0.5, 0.1);
  }
  // kerbstone joints every 1 m (vertical line at the tile edge)
  for (let y = 0; y < s; y++) for (let x = 0; x < 2; x++) { const i = y * s + x; col[i * 3] *= 0.5; col[i * 3 + 1] *= 0.5; col[i * 3 + 2] *= 0.5; height[i] = 0; }
  return finish(s, col, height, 1.5);
}

// ---------------- granite setts (Temple Bar cobbles). Tile = 3 m ----------------
export function setts() {
  const s = SIZE, rand = rng(4004), n = fbm(s, 4, 101);
  const col = new Float32Array(s * s * 3).fill(40), height = new Float32Array(s * s);
  const px = s / 3, rowH = 0.11 * px, rows = Math.round(s / rowH), rh = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = rand() * 0.2 * px;
    const start = x;
    while (x < s + start - 0.05 * px) {
      let w = (0.14 + rand() * 0.1) * px;
      if (x + w > s + start) w = s + start - x;
      const tone = 70 + rand() * 45, tint = (rand() - 0.5) * 10;
      const gap = 0.012 * px;
      for (let y = Math.floor(r * rh + gap); y < (r + 1) * rh - gap; y++) for (let xx = Math.floor(x + gap); xx < x + w - gap; xx++) {
        const u = (xx - x) / w, v = (y - r * rh) / rh;
        const dome = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * Math.sin(Math.PI * Math.min(1, Math.max(0, v)));
        const i = ((y + s) % s) * s + ((xx + s) % s);
        const c = tone * (0.8 + dome * 0.3) + (n[i] - 0.5) * 20;
        col[i * 3] = c + tint; col[i * 3 + 1] = c; col[i * 3 + 2] = c + 4 - tint * 0.5;
        height[i] = 0.3 + dome * 0.7;
      }
      x += w;
    }
  }
  return finish(s, col, height, 4.0);
}

// ---------------- grass. Tile = 2 m ----------------
export function grass() {
  const s = SIZE / 2, rand = rng(4005), n = fbm(s, 5, 111);
  const col = new Float32Array(s * s * 3), height = new Float32Array(s * s);
  for (let i = 0; i < s * s; i++) {
    const v = n[i], r = rand();
    col[i * 3] = 52 + v * 40 + r * 18; col[i * 3 + 1] = 88 + v * 50 + r * 26; col[i * 3 + 2] = 38 + v * 22 + r * 10;
    height[i] = r * 0.6 + v * 0.4;
  }
  return finish(s, col, height, 2.0);
}
