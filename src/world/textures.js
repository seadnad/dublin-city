// Canvas-generated textures. Nothing is loaded from disk.
import * as THREE from 'three';

export const IS_MOBILE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Tileable value noise, a few octaves.
function tileNoise(size, cells, rand) {
  const grid = [];
  for (let i = 0; i < cells * cells; i++) grid.push(rand());
  const g = (i, j) => grid[((j + cells) % cells) * cells + ((i + cells) % cells)];
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / size) * cells, fy = (y / size) * cells;
    const i = Math.floor(fx), j = Math.floor(fy);
    let tx = fx - i, ty = fy - j;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = g(i, j), b = g(i + 1, j), c = g(i, j + 1), d = g(i + 1, j + 1);
    out[y * size + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  return out;
}

export function fbm(size, octaves = 4, seed = 7) {
  const rand = rng(seed);
  const acc = new Float32Array(size * size);
  let amp = 0.5, cells = 4, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = tileNoise(size, cells, rand);
    for (let i = 0; i < acc.length; i++) acc[i] += n[i] * amp;
    total += amp; amp *= 0.5; cells *= 2;
  }
  for (let i = 0; i < acc.length; i++) acc[i] /= total;
  return acc;
}

function toTexture(c, { repeat = true, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Grey noise used for asphalt grain (bump) and puddle patches (roughness).
export function makeGrainTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const n = fbm(size, 5, 11);
  const rand = rng(3);
  for (let i = 0; i < n.length; i++) {
    const v = Math.max(0, Math.min(255, (n[i] * 0.7 + rand() * 0.3) * 255));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

// Large soft blotches: bright = rough, dark = smooth (puddles when wet).
export function makePuddleTexture(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const n = fbm(size, 3, 29);
  for (let i = 0; i < n.length; i++) {
    const v = Math.max(0, Math.min(1, (n[i] - 0.38) * 3.2));
    const b = 90 + v * 165;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

// Granite ashlar blocks for quay walls and bridges.
export function makeStoneTexture(size = 256, base = [150, 146, 136]) {
  const c = canvas(size), ctx = c.getContext('2d');
  const rand = rng(21);
  const rows = 8, bh = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -bh : 0;
    while (x < size) {
      const w = bh * (1.6 + rand() * 1.4);
      const k = 0.85 + rand() * 0.25;
      ctx.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
      ctx.fillRect(x, r * bh, w, bh);
      ctx.fillStyle = 'rgba(40,38,35,0.55)';
      ctx.fillRect(x, r * bh, 2, bh);
      x += w;
    }
    ctx.fillStyle = 'rgba(40,38,35,0.55)';
    ctx.fillRect(0, r * bh, size, 2);
  }
  // weathering
  const n = fbm(size, 4, 5);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < n.length; i++) {
    const k = 0.8 + n[i] * 0.35;
    img.data[i * 4] *= k; img.data[i * 4 + 1] *= k; img.data[i * 4 + 2] *= k;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true });
}

// Tileable normal map from noise, for the river surface.
export function makeWaterNormal(size = 256) {
  const c = canvas(size), ctx = c.getContext('2d');
  const n = fbm(size, 4, 42);
  const img = ctx.createImageData(size, size);
  const h = (x, y) => n[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 6, dy = (h(x, y + 1) - h(x, y - 1)) * 6;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

// Text label sprite texture.
export function makeLabelTexture(text, { font = 'bold 44px system-ui, sans-serif', bg = 'rgba(20,32,28,0.82)', fg = '#fff', accent = '#3fb37f' } = {}) {
  const c = canvas(8, 8);
  let ctx = c.getContext('2d');
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 56, h = 76;
  c.width = w; c.height = h + 22;
  ctx = c.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, w, h, 18); ctx.fill();
  ctx.fillStyle = accent; ctx.fillRect(0, h - 6, w, 6);
  ctx.beginPath(); ctx.moveTo(w / 2 - 14, h); ctx.lineTo(w / 2 + 14, h); ctx.lineTo(w / 2, h + 20); ctx.closePath();
  ctx.fillStyle = accent; ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, aspect: c.width / c.height };
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
