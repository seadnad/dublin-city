// The far view: what the camera sees beyond its own far plane, drawn first as a separate scene with its own camera
// (same pose, near plane just inside the main far plane), then the city is drawn over it with the depth cleared.
// The main view distance (and its cost) stays tuned for the street; from the air the whole city, the rest of Dublin,
// the bay and the mountains still show beyond it, cheaply:
//   - the ground: a top-down capture of the city itself (roads, parks, water, roofs, pitches, baked sun shadows),
//     drawn once from above into a texture and refreshed when the weather or time of day changes
//   - the filler buildings as plain boxes (frontage: five faces; block interiors: the roof alone), lit per vertex
//   - the landmarks and heroes as blocky columns from a top-down height capture, coloured from the ground capture
//   - trees and the Phoenix Park woods as blobs
//   - beyond the map: suburbs (a painted ground and low boxes), Dublin Bay flooded from the OSM coastline, the Dublin
//     and Wicklow mountains, Howth Head, and the Poolbeg chimneys, which show from the street as well
// Everything here uses one cheap shader: albedo x (hemisphere + sun + fill + sky) computed per vertex, the game's fog,
// and a warm window glow after dark. The sky dome lives here too, so it is drawn once behind both passes.
import * as THREE from 'three';
import { world, project } from './geo.js';
import { captureHeightmap } from '../game/heightmap.js';
import { packedItems, packedMeshes } from './chunks.js';
import bay from '../data/bay.json';
import { sites } from './sites.js';

const B = world.bounds;
const OUT = { minX: -7000, maxX: 10000, minZ: -7000, maxZ: 9000 }; // the painted region round the map (~17 x 16 km)
OUT.w = OUT.maxX - OUT.minX; OUT.h = OUT.maxZ - OUT.minZ;
const AIR_Y = 25; // camera height above which the far city, the suburbs and the mountains are drawn

// Poolbeg Generating Station chimneys (OSM ways 231691395 / 231691394: 207.48 m, 1971; 207.8 m, 1984)
export const POOLBEG = [
  { ...project(53.34023, -6.18994), h: 207.5 },
  { ...project(53.34024, -6.18873), h: 207.8 },
];

// ------------------------------------------------------------------ shared uniforms and the far material
const U = {
  uSunD: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color() },
  uFillD: { value: new THREE.Vector3(0, 1, 0) }, uFillC: { value: new THREE.Color() },
  uHemiS: { value: new THREE.Color() }, uHemiG: { value: new THREE.Color() }, uEnvC: { value: new THREE.Color() },
  uCap: { value: null }, uCapOn: { value: 0 }, uCapRect: { value: new THREE.Vector4(B.minX, B.minZ, B.w, B.h) },
  uOuter: { value: null }, uOuterOn: { value: 0 }, uOutRect: { value: new THREE.Vector4(OUT.minX, OUT.minZ, OUT.w, OUT.h) },
  uNight: { value: 0 }, uWet: { value: 0 }, uTreeCut: { value: 0 }, uLights: { value: 0 }, uCapFallback: { value: new THREE.Color(0x3a3b3d) },
  // the capture: 0 = scene-linear (half float, drawn like the post-processed tiers); 1 = what the screen shows (tone mapped,
  // sRGB bytes: drawn with the same shaders as the Low tier's direct-to-screen pass, so it needs no new ones), undone here
  uCapMode: { value: 0 }, uCapExp: { value: 1 }, uAcesInInv: { value: new THREE.Matrix3() }, uAcesOutInv: { value: new THREE.Matrix3() },
};
// three's ACES filmic matrices (rows here; its GLSL lists the columns), inverted for undoing the tone map
U.uAcesInInv.value.set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777).invert();
U.uAcesOutInv.value.set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602).invert();
const CAP_GLSL = /* glsl */ `
  uniform float uCapMode; uniform float uCapExp; uniform mat3 uAcesInInv; uniform mat3 uAcesOutInv;
  vec3 capSample(vec2 uv, float bias) {
    vec3 c = texture2D(uCap, uv, bias).rgb;
    if (uCapMode > 0.5) {
      c = mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); // sRGB bytes to display-linear
      c = clamp(uAcesOutInv * c, 0.0, 0.999);
      // RRTAndODTFit backwards, per channel: (1 - 0.983729 y) v^2 + (0.0245786 - 0.432951 y) v - (0.000090537 + 0.238081 y) = 0
      vec3 qa = 1.0 - 0.983729 * c, qb = 0.0245786 - 0.432951 * c, qc = -(0.000090537 + 0.238081 * c);
      vec3 v = (-qb + sqrt(max(qb * qb - 4.0 * qa * qc, 0.0))) / (2.0 * qa);
      c = max(uAcesInInv * v, 0.0) * 0.6 / uCapExp;
    }
    return c;
  }`;
const LIGHT_GLSL = /* glsl */ `
  uniform vec3 uSunD; uniform vec3 uSunC; uniform vec3 uFillD; uniform vec3 uFillC;
  uniform vec3 uHemiS; uniform vec3 uHemiG; uniform vec3 uEnvC;
  vec3 farLight(vec3 n) {
    return (mix(uHemiG, uHemiS, 0.5 * n.y + 0.5) + uSunC * max(dot(n, uSunD), 0.0) + uFillC * max(dot(n, uFillD), 0.0)) * 0.3183099
      + uEnvC * (0.55 + 0.45 * n.y);
  }`;
const VERT = /* glsl */ `
  ${LIGHT_GLSL}
  uniform vec4 uCapRect; uniform float uCapOn; uniform float uWet;
  #ifdef GROUND
    varying vec2 vUv;
    uniform vec4 uOutRect;
  #else
    attribute vec4 aAlb; attribute float aGlow;
    #ifdef TREECUT
      attribute vec3 aCentre; uniform float uTreeCut; // blobs only for trees at least this far off
    #endif
    varying vec3 vCol; varying vec2 vCapUv; varying float vCapMix; varying vec3 vRatio; varying float vGlow;
  #endif
  #include <fog_pars_vertex>
  void main() {
    #ifdef TREECUT
      if (distance(cameraPosition, aCentre) < uTreeCut) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
    #endif
    vec4 wp = modelMatrix * vec4(position, 1.0);
    #ifdef GROUND
      #ifdef OUTER
        vUv = vec2((wp.x - uOutRect.x) / uOutRect.z, 1.0 - (wp.z - uOutRect.y) / uOutRect.w);
      #else
        vUv = vec2((wp.x - uCapRect.x) / uCapRect.z, 1.0 - (wp.z - uCapRect.y) / uCapRect.w);
      #endif
    #else
      vec3 n = normalize(mat3(modelMatrix) * normal);
      vec3 L = farLight(n);
      vCol = aAlb.rgb * L * (1.0 - 0.14 * uWet);
      // walls take the colour of the roof they belong to: sample the capture a little inside the wall
      vec2 sp = wp.xz - n.xz * 1.2;
      vCapUv = vec2((sp.x - uCapRect.x) / uCapRect.z, 1.0 - (sp.y - uCapRect.y) / uCapRect.w);
      float inside = step(0.0, vCapUv.x) * step(vCapUv.x, 1.0) * step(0.0, vCapUv.y) * step(vCapUv.y, 1.0);
      vCapMix = aAlb.a * inside * uCapOn;
      vRatio = L / farLight(vec3(0.0, 1.0, 0.0));
      vGlow = aGlow;
    #endif
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const FRAG = /* glsl */ `
  uniform sampler2D uCap; uniform float uCapOn; uniform float uNight; uniform vec3 uCapFallback;
  ${CAP_GLSL}
  #ifdef GROUND
    varying vec2 vUv;
    #ifdef OUTER
      uniform sampler2D uOuter; uniform float uLights; uniform float uOuterOn;
      ${LIGHT_GLSL}
    #endif
  #else
    varying vec3 vCol; varying vec2 vCapUv; varying float vCapMix; varying vec3 vRatio; varying float vGlow;
  #endif
  #include <fog_pars_fragment>
  void main() {
    #ifdef GROUND
      #ifdef OUTER
        vec4 t = uOuterOn > 0.5 ? texture2D(uOuter, vUv) : vec4(0.11, 0.105, 0.1, 0.0);
        vec3 col = t.rgb * farLight(vec3(0.0, 1.0, 0.0)) + vec3(1.0, 0.62, 0.3) * t.a * t.a * uLights;
      #else
        vec3 col = uCapOn > 0.5 ? capSample(vUv, 0.0) : uCapFallback;
      #endif
    #else
      vec3 col = vCol;
      if (vCapMix > 0.0) col = mix(col, capSample(vCapUv, -1.0) * vRatio, vCapMix);
      col += vec3(1.0, 0.72, 0.42) * vGlow * uNight;
    #endif
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function farMaterial(defines = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader: VERT, fragmentShader: FRAG, fog: true, defines,
  });
  Object.assign(m.uniforms, U); // shared (not copies): one update reaches every far material
  return m;
}

// ------------------------------------------------------------------ geometry helpers
// a growing mesh: position, normal, aAlb (albedo + capture flag), aGlow, index
class Mesher {
  constructor() { this.p = []; this.n = []; this.a = []; this.g = []; this.i = []; this.c = []; }
  get count() { return this.p.length / 3; }
  quad(v, nrm, alb, cap, glow) {
    const k = this.count;
    for (const q of v) { this.p.push(q[0], q[1], q[2]); this.n.push(nrm[0], nrm[1], nrm[2]); this.a.push(alb.r, alb.g, alb.b, cap); this.g.push(glow); }
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  // box footprint corners c (4 x [x, z], counter-clockwise seen from above), height y0..y1
  // wallFrom(a, b, nx, nz): where a wall starts (above a neighbour that hides its lower part); >= y1 skips it
  box(c, y0, y1, wall, roof, { walls = true, capRoof = 1, capWall = 0, glow = 0, wallFrom = null } = {}) {
    this.quad([[c[0][0], y1, c[0][1]], [c[1][0], y1, c[1][1]], [c[2][0], y1, c[2][1]], [c[3][0], y1, c[3][1]]], [0, 1, 0], roof, capRoof, 0);
    if (!walls) return;
    for (let s = 0; s < 4; s++) {
      const a = c[s], b = c[(s + 1) % 4];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l, w0 = wallFrom ? Math.max(y0, wallFrom(a, b, nx, nz)) : y0;
      if (w0 >= y1 - 0.3) continue;
      this.quad([[a[0], w0, a[1]], [b[0], w0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], [nx, 0, nz], wall, capWall, glow);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aAlb', new THREE.Float32BufferAttribute(this.a, 4));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.g, 1));
    if (this.c.length) g.setAttribute('aCentre', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    return g;
  }
}
// meshes by map tile, so the far camera culls whole tiles (its near plane drops the tiles the main view covers)
class Tiles {
  constructor(size) { this.size = size; this.map = new Map(); }
  at(x, z) {
    const k = `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`;
    let list = this.map.get(k);
    if (!list) this.map.set(k, (list = [new Mesher()]));
    if (list[list.length - 1].count > 60000) list.push(new Mesher()); // keep each mesh on 16-bit indices
    return list[list.length - 1];
  }
  meshes(mat, name) {
    const group = new THREE.Group(); group.name = name;
    let tris = 0;
    for (const m of [...this.map.values()].flat()) {
      if (!m.count) continue;
      const mesh = new THREE.Mesh(m.geometry(), mat);
      mesh.matrixAutoUpdate = false;
      tris += m.i.length / 3;
      group.add(mesh);
    }
    group.userData.tris = tris;
    return group;
  }
}
const col = (hex) => new THREE.Color(hex);
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ the painted ground beyond the map
// RGB: albedo (sRGB) of suburbs, parks, strand and sea; A: street lights after dark. The sea is flooded from a point
// in the bay across the OSM coastline (src/data/bay.json).
async function paintOuter(S, slice) {
  const W = S, H = S;
  const px = (x) => ((x - OUT.minX) / OUT.w) * W, py = (z) => ((z - OUT.minZ) / OUT.h) * H; // canvas: row 0 = north
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); // a CPU canvas: reading it back doesn't wait on the GPU
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#000'; g.lineWidth = Math.max(1.5, S / 1024); g.lineJoin = 'round';
  for (const way of bay.ways) {
    g.beginPath();
    way.forEach(([lat, lon], i) => { const p = project(lat, lon); if (i) g.lineTo(px(p.x), py(p.z)); else g.moveTo(px(p.x), py(p.z)); });
    g.stroke();
  }
  await slice('coast');
  const img = g.getImageData(0, 0, W, H).data;
  const sea = new Uint8Array(W * H); // 0 land, 1 sea, 2 shore line
  for (let i = 0; i < W * H; i++) if (img[i * 4] < 128) sea[i] = 2;
  // scanline flood fill from the middle of the bay
  const seed = project(53.325, -6.05);
  const stack = [[Math.floor(px(seed.x)), Math.floor(py(seed.z))]];
  let pops = 0;
  while (stack.length) {
    if ((++pops & 4095) === 0) await slice('flood');
    const [x0, y] = stack.pop();
    let x = x0;
    if (y < 0 || y >= H || sea[y * W + x] !== 0) continue;
    while (x > 0 && sea[y * W + x - 1] === 0) x--;
    let up = false, dn = false;
    for (; x < W && sea[y * W + x] === 0; x++) {
      sea[y * W + x] = 1;
      if (y > 0) { const f = sea[(y - 1) * W + x] === 0; if (f && !up) stack.push([x, y - 1]); up = f; }
      if (y < H - 1) { const f = sea[(y + 1) * W + x] === 0; if (f && !dn) stack.push([x, y + 1]); dn = f; }
    }
  }
  // distance to land (a few pixels) for the shallows and the strand
  const near = new Uint8Array(W * H);
  const R = Math.max(2, Math.round(S / 512));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x === 0 && (y & 31) === 0) await slice('near');
    if (sea[y * W + x] !== 1) continue;
    let land = false;
    for (let d = -R; d <= R && !land; d += R) for (let e = -R; e <= R; e += R) { const xx = x + d, yy = y + e; if (xx >= 0 && yy >= 0 && xx < W && yy < H && sea[yy * W + xx] !== 1) { land = true; break; } }
    near[y * W + x] = land ? 1 : 0;
  }
  const data = new Uint8Array(W * H * 4);
  const r = rng(91);
  const noise = new Float32Array(64 * 64); for (let i = 0; i < noise.length; i++) noise[i] = r();
  const vnoise = (x, y) => { // smooth value noise on a 64-cell lattice
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const n = (i, j) => noise[((j & 63) * 64) + (i & 63)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (n(xi, yi) * (1 - sx) + n(xi + 1, yi) * sx) * (1 - sy) + (n(xi, yi + 1) * (1 - sx) + n(xi + 1, yi + 1) * sx) * sy;
  };
  // the main roads out of town: radial routes from the centre (the N-roads) and an orbital ring (the M50), wiggled
  const rc = document.createElement('canvas'); rc.width = W; rc.height = H;
  const rg = rc.getContext('2d', { willReadFrequently: true });
  rg.fillStyle = '#000'; rg.fillRect(0, 0, W, H);
  rg.strokeStyle = '#fff'; rg.lineWidth = Math.max(1, 14 / (OUT.w / W)); rg.lineJoin = rg.lineCap = 'round';
  const cx0 = B.minX + B.w * 0.55, cz0 = B.minZ + B.h * 0.5;
  for (let k = 0; k < 14; k++) {
    let a = (k / 14) * Math.PI * 2 + 0.2, x = cx0, z = cz0;
    rg.beginPath(); rg.moveTo(px(x), py(z));
    for (let s = 0; s < 60; s++) { a += (vnoise(k * 7.1, s * 0.25) - 0.5) * 0.18; x += Math.cos(a) * 160; z += Math.sin(a) * 160; rg.lineTo(px(x), py(z)); }
    rg.stroke();
  }
  rg.beginPath();
  for (let s = 0; s <= 96; s++) { const a = (s / 96) * Math.PI * 2, rr = 4300 + 500 * vnoise(s * 0.2, 3.3); const x = cx0 + Math.cos(a) * rr * 1.1, z = cz0 + Math.sin(a) * rr * 0.9; if (s) rg.lineTo(px(x), py(z)); else rg.moveTo(px(x), py(z)); }
  rg.stroke();
  const road = rg.getImageData(0, 0, W, H).data;
  const mpp = OUT.w / W; // metres per pixel
  const mid2 = (x, y) => 0.5 * (vnoise(x, y) + vnoise(y * 0.8 + 17.3, -x * 0.8 + 5.1)); // two rotated lattices: no grid
  // the smooth fields at a quarter of the resolution, sampled bilinearly (they vary over hundreds of metres)
  const Q = 4, FW = Math.ceil(W / Q) + 2, FH = Math.ceil(H / Q) + 2;
  const fBig = new Float32Array(FW * FH), fMid = new Float32Array(FW * FH), fHill = new Float32Array(FW * FH);
  for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
    if (i === 0 && (j & 15) === 0) await slice('fields');
    const wx = OUT.minX + i * Q * mpp, wz = OUT.minZ + j * Q * mpp, k = j * FW + i;
    fBig[k] = mid2(wx / 1500 + 11, wz / 1500 + 3); fMid[k] = mid2(wx / 330, wz / 330); fHill[k] = mid2(wx / 2000, wz / 2000 + 9);
  }
  const field = (f, x, y) => {
    const fx = x / Q, fy = y / Q, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, k = j * FW + i;
    return (f[k] * (1 - tx) + f[k + 1] * tx) * (1 - ty) + (f[k + FW] * (1 - tx) + f[k + FW + 1] * tx) * ty;
  };
  for (let y = 0; y < H; y++) {
    if ((y & 7) === 0) await slice('paint');
    const z = OUT.minZ + (y + 0.5) * mpp;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, o = ((H - 1 - y) * W + x) * 4; // texture row 0 = south
      const wx = OUT.minX + (x + 0.5) * mpp;
      let R0, G0, B0, A = 0;
      if (sea[i] === 1) {
        const deep = near[i] ? 0 : 1;
        const n = vnoise(wx / 900, z / 900);
        R0 = 58 + 6 * n - 8 * deep; G0 = 70 + 6 * n - 6 * deep; B0 = 78 + 5 * n - 2 * deep;
        if (!deep) { R0 += 26; G0 += 22; B0 += 12; } // shallows and the strand at the tide line
      } else {
        // suburbs: mostly roofs and roads with gardens between, parks here and there, fields toward the hills
        const big = field(fBig, x, y), mid = field(fMid, x, y), fine = r();
        const hills = smooth(3200, 6500, z) * (0.6 + 0.4 * field(fHill, x, y));
        const park = smooth(0.6, 0.72, big * 0.65 + mid * 0.35);
        const roof = fine < 0.45 ? [116, 106, 98] : fine < 0.75 ? [132, 126, 118] : fine < 0.9 ? [94, 90, 86] : [138, 104, 88];
        const garden = [84 + 18 * mid, 100 + 16 * mid, 66];
        const k = Math.min(1, 0.3 + 0.7 * park + hills);
        R0 = roof[0] * (1 - k) + garden[0] * k; G0 = roof[1] * (1 - k) + garden[1] * k; B0 = roof[2] * (1 - k) + garden[2] * k;
        if (hills > 0.3) { // a patchwork of fields
          const f = Math.floor(wx / 230 + 0.3 * Math.sin(z / 400)) * 73 + Math.floor(z / 170) * 31, h = Math.abs(Math.sin(f * 12.9898) * 43758.5453) % 1;
          const fc = h < 0.3 ? [96, 116, 64] : h < 0.6 ? [110, 126, 72] : h < 0.8 ? [84, 102, 60] : [128, 124, 82];
          const t = smooth(0.3, 0.6, hills);
          R0 += (fc[0] - R0) * t; G0 += (fc[1] - G0) * t; B0 += (fc[2] - B0) * t;
        }
        const onRoad = road[i * 4] > 100 && hills < 0.8;
        if (onRoad) { R0 = 92; G0 = 92; B0 = 94; }
        if (sea[i] === 2) { R0 = 150; G0 = 142; B0 = 120; }
        // street lights: dense speckle in town, thinning into the hills and parks; the main roads in lines
        const dens = (1 - Math.min(1, park + hills)) * 0.9;
        if (onRoad ? r() < 0.8 : r() < dens * 0.32) A = onRoad ? 255 : 110 + Math.floor(r() * 145);
      }
      data[o] = R0; data[o + 1] = G0; data[o + 2] = B0; data[o + 3] = A;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  const isSea = (x, z) => {
    const cx = Math.floor(px(x)), cy = Math.floor(py(z));
    return cx >= 0 && cy >= 0 && cx < W && cy < H && sea[cy * W + cx] === 1;
  };
  return { tex, isSea };
}

// ------------------------------------------------------------------ mountains (and Howth Head)
// Summits (lat, lon, metres) of the Dublin Mountains and north Wicklow; heights are scaled by 0.6 (the game's plan is
// at half scale, so real heights would double their angle above the horizon; 0.6 keeps them a touch prouder).
const PEAKS = [
  [53.2481, -6.2385, 444], [53.2356, -6.2419, 536], [53.2365, -6.283, 467], [53.2455, -6.2921, 408], [53.2541, -6.3302, 383],
  [53.2275, -6.3083, 586], [53.2162, -6.3741, 648], [53.1776, -6.3319, 757], [53.2025, -6.2401, 555], [53.2090, -6.4025, 617],
  [53.2419, -6.4128, 395], [53.1447, -6.1519, 501], [53.1725, -6.1379, 342], [53.1868, -6.0856, 241], [53.2667, -6.1134, 153],
  [53.2728, -6.1085, 150], [53.2150, -6.1950, 380], [53.1900, -6.2600, 600], [53.1600, -6.2200, 520],
  [53.3753, -6.0676, 171], [53.3800, -6.0900, 120],
].map(([lat, lon, h]) => ({ ...project(lat, lon), h: h * 0.6 }));
async function buildMountains(isSea, step, slice) {
  const x0 = -7000, x1 = 10000, z0 = 1500, z1 = 9000;
  const nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
  const r = rng(7);
  const lat = new Float32Array(97 * 97); for (let i = 0; i < lat.length; i++) lat[i] = r();
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, n = (i, j) => lat[((j % 97 + 97) % 97) * 97 + ((i % 97 + 97) % 97)]; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (n(xi, yi) * (1 - sx) + n(xi + 1, yi) * sx) * (1 - sy) + (n(xi, yi + 1) * (1 - sx) + n(xi + 1, yi + 1) * sx) * sy; };
  const height = (x, z) => {
    let h = 0;
    for (const p of PEAKS) { const d2 = ((x - p.x) ** 2 + (z - p.z) ** 2) / (1500 * 1500) * (p.h < 200 ? 2.6 : 1); h = Math.max(h, p.h * Math.exp(-d2)); }
    // the range as a whole rises south of the suburbs; ridged noise breaks the outline
    h = Math.max(h, 200 * smooth(4200, 7500, z) * (0.7 + 0.3 * vn(x / 1300, z / 1300)));
    const rid = 1 - Math.abs(vn(x / 700 + 5, z / 700) * 2 - 1);
    h *= 0.82 + 0.3 * rid;
    return isSea(x, z) ? -3 : h;
  };
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), alb = new Float32Array((nx + 1) * (nz + 1) * 4);
  const cLow = col(0x5d7446), cHigh = col(0x6e5e4c), cForest = col(0x2f4a2c), c = new THREE.Color();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    if (i === 0 && (j & 7) === 0) await slice('mtn');
    const x = x0 + i * step, z = z0 + j * step, h = height(x, z), k = j * (nx + 1) + i;
    pos.set([x, h, z], k * 3);
    c.copy(cLow).lerp(cHigh, smooth(120, 330, h));
    if (vn(x / 500 + 30, z / 500) > 0.62 && h > 40 && h < 300) c.lerp(cForest, 0.7); // conifer plantations
    alb.set([c.r, c.g, c.b, 0], k * 4);
  }
  const idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
    if (pos[a * 3 + 1] < 1 && pos[b * 3 + 1] < 1 && pos[d * 3 + 1] < 1 && pos[e * 3 + 1] < 1) continue; // flat or sea
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aAlb', new THREE.BufferAttribute(alb, 4));
  g.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array((nx + 1) * (nz + 1)), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------------ the Poolbeg chimneys
// Slender tapering concrete stacks: the lower half weathered red-orange, the upper half in alternating white and red
// bands, a dark rim at the top and gallery rings; red aviation lights at three levels.
function buildPoolbeg(mat) {
  const group = new THREE.Group(); group.name = 'Poolbeg chimneys';
  const m = new Mesher();
  const red = col(0xcc4a32), rust = col(0xb8663f), white = col(0xefece6), dark = col(0x2b2a29), grey = col(0x8c8a86);
  const lights = [];
  for (const st of POOLBEG) {
    const H = st.h, r0 = 7.6, r1 = 3.7, rad = (y) => r0 + (r1 - r0) * (y / H);
    // bands: [from, to, colour] in fractions of the height
    const bands = [[0, 0.5, rust]];
    const n = 13, lo = 0.5;
    for (let k = 0; k < n; k++) bands.push([lo + ((1 - lo) * k) / n, lo + ((1 - lo) * (k + 1)) / n, k % 2 ? red : white]);
    bands[bands.length - 1][2] = red;
    bands.push([0.992, 1, dark]);
    const SEG = 16;
    for (const [f0, f1, c] of bands) {
      const y0 = f0 * H, y1 = f1 * H, ra = rad(y0), rb = rad(y1);
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2, am = (a0 + a1) / 2;
        const k = m.count, slope = (r0 - r1) / H;
        for (const [a, y, rr] of [[a0, y0, ra], [a1, y0, ra], [a1, y1, rb], [a0, y1, rb]]) {
          m.p.push(st.x + Math.cos(a) * rr, y, st.z + Math.sin(a) * rr);
          const l = Math.hypot(1, slope); m.n.push(Math.cos(a) / l, slope / l, Math.sin(a) / l);
          m.a.push(c.r, c.g, c.b, 0); m.g.push(0);
        }
        void am;
        m.i.push(k, k + 2, k + 1, k, k + 3, k + 2);
      }
    }
    // gallery rings (a flat top and an outer face each)
    for (const f of [0.5, 0.75, 0.97]) {
      const y = f * H, rr = rad(y) + 1.1;
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2;
        const p0 = [st.x + Math.cos(a0) * rr, st.z + Math.sin(a0) * rr], p1 = [st.x + Math.cos(a1) * rr, st.z + Math.sin(a1) * rr];
        const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
        m.quad([[p0[0], y - 1.2, p0[1]], [p0[0], y, p0[1]], [p1[0], y, p1[1]], [p1[0], y - 1.2, p1[1]]], [nx, 0, nz], grey, 0, 0);
      }
      for (let s = 0; s < 4; s++) { const a = (s / 4) * Math.PI * 2 + 0.4; lights.push(st.x + Math.cos(a) * (rad(y) + 0.8), y + 0.6, st.z + Math.sin(a) * (rad(y) + 0.8)); }
    }
    // the station below: turbine hall and boiler house blocks
    const box = (cx, cz, w, d, h, c) => m.box([[cx - w / 2, cz + d / 2], [cx + w / 2, cz + d / 2], [cx + w / 2, cz - d / 2], [cx - w / 2, cz - d / 2]], 0, h, c, c, { capRoof: 0 });
    if (st === POOLBEG[0]) {
      box(st.x + 20, st.z + 22, 70, 26, 34, col(0xb9b7b0));
      box(st.x + 12, st.z - 4, 30, 22, 48, col(0xa9a7a0));
      box(st.x + 58, st.z + 10, 36, 30, 22, col(0xc4c2bb));
    }
  }
  const mesh = new THREE.Mesh(m.geometry(), mat);
  mesh.matrixAutoUpdate = false;
  group.add(mesh);
  // aviation lights: fixed-size red points (visible from anywhere across the city after dark)
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const dg = dot.getContext('2d'), gr = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  dg.fillStyle = gr; dg.fillRect(0, 0, 32, 32);
  const lm = new THREE.PointsMaterial({ color: 0xff2a14, size: 7, sizeAttenuation: false, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 });
  const pts = new THREE.Points(lg, lm);
  pts.frustumCulled = false; pts.renderOrder = 5; pts.visible = false;
  group.add(pts);
  return { group, lights: pts };
}

// ------------------------------------------------------------------ the far view
export function createFarView({ renderer, atmosphere, buildings, landmarks, lite }) {
  const scene = new THREE.Scene();
  scene.name = 'far view';
  scene.fog = null; // set to the main scene's fog object below (shared: the same density and colour)
  const camera = new THREE.PerspectiveCamera(60, 1, 500, 16000);
  scene.add(atmosphere.sky); // the sky dome moves here: drawn once, behind both passes
  // copies of the sun, fill and sky light for the hero models' far levels (the far shader takes uniforms instead)
  const lights = new THREE.Group(); // always there: the far shaders' programs don't change when the heroes arrive
  const fHemi = new THREE.HemisphereLight(), fSun = new THREE.DirectionalLight(), fFill = new THREE.DirectionalLight();
  lights.add(fHemi, fSun, fFill);
  scene.add(lights);
  const mat = farMaterial();
  const poolbeg = buildPoolbeg(farMaterial({ FOG_SCALE: '0.25', FOG_MAX: '0.42' }));
  scene.add(poolbeg.group);
  const aerial = new THREE.Group(); aerial.name = 'far view (aerial)'; aerial.visible = false;
  scene.add(aerial);
  const state = { built: false, building: false, capture: 0, dirty: true, tris: 0, air: false, ms: {} };
  let capRT = null, captureCam = null, mainScene = null, skipRoots = null, nearTrees = null, getTarget = null;

  // The build runs in slices of a few milliseconds between frames (it starts as soon as the helicopter or photo
  // mode is entered, and is ready by the time the camera is up in the air); state.longest is the longest slice.
  let sliceAt = 0;
  state.longest = 0;
  const chan = new MessageChannel(), waiting = [];
  chan.port1.onmessage = () => { const r = waiting.shift(); if (r) r(); };
  const yieldNow = () => new Promise((r) => { waiting.push(r); chan.port2.postMessage(0); }); // a task, no 4 ms clamp
  const slice = async (label) => {
    const now = performance.now();
    if (now - sliceAt < 10) return;
    if (now - sliceAt > state.longest) { state.longest = now - sliceAt; state.longestAt = label; }
    await yieldNow();
    sliceAt = performance.now();
  };
  const resume = () => { sliceAt = performance.now(); }; // after awaiting something else (a GPU read-back)
  // everything that is only worth building once someone is up in the air
  async function buildStatic() {
    const t0 = performance.now();
    const outer = await paintOuter(lite ? 1024 : 2048, slice);
    U.uOuter.value = outer.tex; U.uOuterOn.value = 1;
    const og = new THREE.PlaneGeometry(OUT.w, OUT.h).rotateX(-Math.PI / 2).translate(OUT.minX + OUT.w / 2, -0.4, OUT.minZ + OUT.h / 2);
    const oMesh = new THREE.Mesh(og, farMaterial({ GROUND: '', OUTER: '' }));
    const mg = new THREE.PlaneGeometry(B.w, B.h).rotateX(-Math.PI / 2).translate(B.minX + B.w / 2, -0.05, B.minZ + B.h / 2);
    const mMesh = new THREE.Mesh(mg, farMaterial({ GROUND: '' }));
    oMesh.renderOrder = mMesh.renderOrder = -1; // the ground first: cheap, and it fills the depth under the rest
    aerial.add(oMesh, mMesh);
    state.ms.outer = Math.round(performance.now() - t0);
    const mtn = new THREE.Mesh(await buildMountains(outer.isSea, lite ? 170 : 110, slice),farMaterial({ FOG_SCALE: '0.42' }));
    mtn.name = 'mountains';
    aerial.add(mtn);
    state.tris += mtn.geometry.index.count / 3;

    // the filler: frontage lots as boxes, block interiors as roofs (their walls hide behind the frontage from afar)
    const tiles = new Tiles(700), subTiles = new Tiles(1600); // the suburbs in big tiles: few draws for a sparse ring
    const dark = col(0x0d0f12), c = new THREE.Color(), roof = col(0x333436), rc = new THREE.Color();
    const rA = new THREE.Color().setRGB(0.21, 0.22, 0.23), rB = new THREE.Color().setRGB(0.3, 0.29, 0.27); // the facade shader's roofs
    // the tallest lot over each 2 m cell: a wall hidden by its neighbour (party walls, the insides of the blocks) is
    // left out, or starts at the neighbour's roof
    const G = 2, GW = Math.ceil(B.w / G), GH = Math.ceil(B.h / G), occ = new Float32Array(GW * GH);
    const corners = (L) => { const cs = Math.cos(L.rot), sn = Math.sin(L.rot), hw = L.w / 2, hd = L.d / 2, P = (lx, lz) => [L.x + lx * cs + lz * sn, L.z - lx * sn + lz * cs]; return [P(-hw, hd), P(hw, hd), P(hw, -hd), P(-hw, -hd)]; };
    for (const [n, L] of buildings.lots.entries()) {
      if ((n & 1023) === 0) await slice('occ');
      const cs = Math.cos(L.rot), sn = Math.sin(L.rot), R = Math.hypot(L.w, L.d) / 2;
      for (let j = Math.max(0, Math.floor((L.z - R - B.minZ) / G)); j <= Math.min(GH - 1, Math.floor((L.z + R - B.minZ) / G)); j++) {
        for (let i = Math.max(0, Math.floor((L.x - R - B.minX) / G)); i <= Math.min(GW - 1, Math.floor((L.x + R - B.minX) / G)); i++) {
          const dx = B.minX + (i + 0.5) * G - L.x, dz = B.minZ + (j + 0.5) * G - L.z;
          const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; // into the lot's frame
          if (Math.abs(lx) <= L.w / 2 + 0.6 && Math.abs(lz) <= L.d / 2 + 0.6) occ[j * GW + i] = Math.max(occ[j * GW + i], L.h);
        }
      }
    }
    const occAt = (x, z) => { const i = Math.floor((x - B.minX) / G), j = Math.floor((z - B.minZ) / G); return i < 0 || j < 0 || i >= GW || j >= GH ? 0 : occ[j * GW + i]; };
    const wallFrom = (a, b, nx, nz) => {
      let m = Infinity;
      for (const t of [0.15, 0.5, 0.85]) m = Math.min(m, occAt(a[0] + (b[0] - a[0]) * t + nx * 1.6, a[1] + (b[1] - a[1]) * t + nz * 1.6));
      return m;
    };
    let walls = 0;
    for (const [n, L] of buildings.lots.entries()) {
      if ((n & 1023) === 0) await slice('lots');
      c.copy(L.base).multiplyScalar(0.9).lerp(dark, L.style === 4 ? 0.62 : 0.26);
      rc.copy(rA).lerp(rB, (L.seed * 13.7) % 1);
      const glow = (L.style === 4 ? 0.045 : 0.03) * (0.4 + (L.seed * 7.31 % 1) * 1.2);
      const m = tiles.at(L.x, L.z), n0 = m.count;
      m.box(corners(L), 0, L.h, c, rc, { capRoof: 0, glow, wallFrom });
      walls += (m.count - n0) / 4 - 1;
    }
    state.lotWalls = walls;
    // outlying suburbs: low terraces and a few taller blocks in a ring round the map, thinning with distance
    // Estates of terraces in rows, each 400 m block laid out on its own heading; denser near the map
    const r = rng(4242), ring = lite ? 1300 : 2100, BL = 400, rowGap = 42, slot = 46;
    const tones = [0x7e4a3a, 0x8a5a44, 0x9c8f7c, 0xb8ad98, 0x6f6660, 0xa49a88].map(col);
    for (let bz = B.minZ - ring; bz < B.maxZ + ring; bz += BL) {
      await slice('subs');
      for (let bx = B.minX - ring; bx < B.maxX + ring; bx += BL) {
        const rot = Math.sin(bx * 0.0013 + bz * 0.0009) * 1.4 + (r() < 0.35 ? Math.PI / 2 : 0);
        const cs = Math.cos(rot), sn = Math.sin(rot), ox = bx + BL / 2, oz = bz + BL / 2;
        const tone = tones[Math.floor(r() * tones.length)];
        for (let v = -BL * 0.72; v < BL * 0.72; v += rowGap) {
          for (let u = -BL * 0.72; u < BL * 0.72; u += slot) {
            const px = ox + u * cs + v * sn, pz = oz - u * sn + v * cs;
            if (px < bx || px >= bx + BL || pz < bz || pz >= bz + BL) continue; // each block keeps to its own square
            const dx = Math.max(B.minX - px, 0, px - B.maxX), dz = Math.max(B.minZ - pz, 0, pz - B.maxZ), d = Math.hypot(dx, dz);
            if (d < 25 || d > ring || pz > 3800) continue;
            if (r() > 0.78 * (1 - d / ring) ** 0.7) continue;
            if (outer.isSea(px, pz) || outer.isSea(px + 20, pz) || outer.isSea(px - 20, pz)) continue;
            const tall = r() < 0.04, w = tall ? 20 + r() * 14 : 30 + r() * 12, dd = tall ? 16 + r() * 10 : 8.5 + r() * 2;
            const h = tall ? 14 + r() * 22 : 6.5 + r() * 3;
            const P = (lx, lz) => [px + lx * cs + lz * sn, pz - lx * sn + lz * cs];
            c.copy(r() < 0.7 ? tone : tones[Math.floor(r() * tones.length)]).lerp(dark, 0.22);
            rc.copy(rA).lerp(rB, r());
            subTiles.at(px, pz).box([P(-w / 2, dd / 2), P(w / 2, dd / 2), P(w / 2, -dd / 2), P(-w / 2, -dd / 2)], 0, h, c, rc, { capRoof: 0, glow: 0.03 * (0.4 + r()) });
          }
        }
      }
    }
    // the Spire (a needle thinner than a height-capture cell)
    const sp = sites.spire;
    if (sp) {
      const m = tiles.at(sp.x, sp.z), steel = col(0x9aa0a4), SEG = 8;
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2, nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
        m.quad([[sp.x + Math.cos(a1) * 1.5, 0, sp.z + Math.sin(a1) * 1.5], [sp.x + Math.cos(a0) * 1.5, 0, sp.z + Math.sin(a0) * 1.5], [sp.x + Math.cos(a0) * 0.1, 121, sp.z + Math.sin(a0) * 0.1], [sp.x + Math.cos(a1) * 0.1, 121, sp.z + Math.sin(a1) * 0.1]], [nx, 0.01, nz], steel, 0, 0);
      }
    }
    const city = tiles.meshes(mat, 'far city');
    state.tris += city.userData.tris;
    const subs = subTiles.meshes(mat, 'far suburbs');
    state.tris += subs.userData.tris;
    aerial.add(subs);
    aerial.add(city);

    // trees: every packed tree (city streets, parks) and the Phoenix Park wood clumps, as octahedral blobs
    const tg = new Tiles(900), cg = new Tiles(1000), leaf = col(0x557f36), tc = new THREE.Color(), tr = rng(99);
    const blob = (x, y, z, rx, ry, cc, tl = tg) => {
      const m = tl.at(x, z), k = m.count;
      const V = [[rx, 0, 0], [-rx, 0, 0], [0, ry, 0], [0, -ry * 0.7, 0], [0, 0, rx], [0, 0, -rx]];
      for (const v of V) {
        const l = Math.hypot(v[0] / rx, v[1] / ry, v[2] / rx) || 1;
        m.p.push(x + v[0], y + v[1], z + v[2]);
        const nn = new THREE.Vector3(v[0] / rx / l, v[1] / ry / l + 0.15, v[2] / rx / l).normalize();
        m.n.push(nn.x, nn.y, nn.z); m.a.push(cc.r, cc.g, cc.b, 0); m.g.push(0); m.c.push(x, y, z);
      }
      for (const [a, b, d] of [[2, 4, 0], [2, 0, 5], [2, 5, 1], [2, 1, 4], [3, 0, 4], [3, 5, 0], [3, 1, 5], [3, 4, 1]]) m.i.push(k + a, k + b, k + d);
    };
    for (const p of packedItems()) {
      await slice('trees');
      p.spheres.forEach((s, i) => {
        tc.copy(leaf).multiplyScalar(0.55 + tr() * 0.25); // the modelled crowns read darker than their leaf colour (self-shade)
        if (p.cols) tc.multiply(new THREE.Color(p.cols[i * 3], p.cols[i * 3 + 1], p.cols[i * 3 + 2]));
        blob(s.x, s.y + s.r * 0.05, s.z, s.r * 0.66, s.r * 0.4, tc);
      });
    }
    const clumps = landmarks && landmarks.park ? landmarks.park.clumpItems : [];
    for (const k of clumps || []) blob(k.x, 6.4 * k.s, k.z, 5.6 * k.s, 4.6 * k.s, tc.copy(k.c).multiplyScalar(0.9), cg);
    const woods = cg.meshes(mat, 'far woods'); // (the main view draws the woods itself: these stay far)
    state.tris += woods.userData.tris;
    aerial.add(woods);
    const trees = tg.meshes(mat, 'far trees');
    state.tris += trees.userData.tris;
    aerial.add(trees);
    state.treeGroup = trees;
    // Low / Battery saver from the air: the same blobs in the main view stand in for the modelled trees beyond the
    // cut distance (chunks.js setViewCut drops those from the tree packs)
    const cutMat = farMaterial({ TREECUT: '' });
    nearTrees = new THREE.Group(); nearTrees.name = 'tree blobs (near)'; nearTrees.visible = false;
    for (const m of trees.children) { const n = new THREE.Mesh(m.geometry, cutMat); n.matrixAutoUpdate = false; nearTrees.add(n); }
    if (mainScene) { mainScene.add(nearTrees); skipRoots.add(nearTrees); }
    state.ms.static = Math.round(performance.now() - t0);
  }

  // the landmarks as columns, from a top-down height capture of everything but the filler, trees and props
  // the stadiums' own far models (Croke Park and the Aviva have skyline LODs of ~1.5k triangles): clones sharing
  // their geometry and materials, lit by copies of the main lights (the far scene's only standard materials)
  const heroLods = new Set();
  function buildHeroes() {
    const additions = [];
    mainScene.traverse((o) => {
      if (o.isLOD && o.levels.length > 1 && !heroLods.has(o)) { heroLods.add(o); additions.push(o); }
    });
    for (const lod of additions) {
      lod.updateMatrixWorld(true);
      const g = new THREE.Group();
      g.name = `${lod.name} (far)`;
      g.matrixAutoUpdate = false; g.matrix.copy(lod.matrixWorld);
      const lvl = lod.levels[lod.levels.length - 1].object.clone();
      lvl.visible = true;
      lvl.traverse((m) => { m.castShadow = false; m.receiveShadow = false; });
      g.add(lvl);
      aerial.add(g);
      lvl.traverse((m) => { if (m.isMesh) state.tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
    }
  }
  async function buildColumns() {
    const t0 = performance.now();
    const hideSet = new Set([buildings.mesh]);
    const hm = await captureHeightmap(renderer, mainScene, B, {
      skip: skipRoots, size: lite ? 1024 : 2048, quiet: true, readAsync: true,
      hide: (o) => o.isInstancedMesh || hideSet.has(o) || heroLods.has(o) || o.isPoints,
    });
    resume();
    if (!hm) return;
    const k = lite ? 2 : 3, W = Math.ceil(hm.W / k), H = Math.ceil(hm.H / k), cell = hm.cell * k;
    const q = new Int16Array(W * H);
    const sp = sites.spire;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (c === 0 && (r & 31) === 0) await slice('cols');
      let m = -3000;
      for (let j = r * k; j < Math.min(hm.H, r * k + k); j++) for (let i = c * k; i < Math.min(hm.W, c * k + k); i++) m = Math.max(m, hm.heights[j * hm.W + i]);
      const h = m * 0.01;
      const x = B.minX + (c + 0.5) * cell, z = B.minZ + (r + 0.5) * cell;
      if (sp && Math.hypot(x - sp.x, z - sp.z) < cell * 1.5) continue;
      q[r * W + c] = h > 3 ? Math.round(h / 1.5) : 0; // 1.5 m steps
    }
    const m = new Mesher(), white = col(0xffffff);
    const X = (c) => B.minX + c * cell, Z = (r) => B.minZ + r * cell, Y = (v) => v * 1.5;
    // tops: runs along rows, merged down the rows while they match
    let open = new Map();
    const emitTop = (t, r1) => m.quad([[X(t.c0), Y(t.q), Z(r1 + 1)], [X(t.c1 + 1), Y(t.q), Z(r1 + 1)], [X(t.c1 + 1), Y(t.q), Z(t.r0)], [X(t.c0), Y(t.q), Z(t.r0)]], [0, 1, 0], white, 1, 0);
    for (let r = 0; r <= H; r++) {
      const next = new Map();
      if (r < H) {
        for (let c = 0; c < W;) {
          const v = q[r * W + c];
          if (!v) { c++; continue; }
          let e = c; while (e + 1 < W && q[r * W + e + 1] === v) e++;
          const key = `${c},${e},${v}`;
          next.set(key, open.get(key) || { c0: c, c1: e, r0: r, q: v });
          open.delete(key);
          c = e + 1;
        }
      }
      for (const t of open.values()) emitTop(t, r - 1);
      open = next;
    }
    // walls where a cell stands above its neighbour, merged along the edge
    const at = (c, r) => (c < 0 || r < 0 || c >= W || r >= H ? 0 : q[r * W + c]);
    for (let c = -1; c < W; c++) { // edges between column c and c + 1 (x = X(c + 1))
      let run = null;
      const flush = (rEnd) => {
        if (!run) return;
        const x = X(c + 1), [hi, lo, east] = run.k; // east: the high side is c + 1 (the wall faces west)
        const za = Z(run.r0), zb = Z(rEnd);
        if (east) m.quad([[x, Y(lo), za], [x, Y(lo), zb], [x, Y(hi), zb], [x, Y(hi), za]], [-1, 0, 0], white, 1, 0);
        else m.quad([[x, Y(lo), zb], [x, Y(lo), za], [x, Y(hi), za], [x, Y(hi), zb]], [1, 0, 0], white, 1, 0);
        run = null;
      };
      for (let r = 0; r <= H; r++) {
        const a = r < H ? at(c, r) : 0, b = r < H ? at(c + 1, r) : 0;
        const key = a === b ? null : a > b ? [a, b, 0] : [b, a, 1];
        if (!key) { flush(r); continue; }
        if (run && run.k[0] === key[0] && run.k[1] === key[1] && run.k[2] === key[2]) continue;
        flush(r); run = { r0: r, k: key };
      }
    }
    for (let r = -1; r < H; r++) { // edges between row r and r + 1 (z = Z(r + 1))
      let run = null;
      const flush = (cEnd) => {
        if (!run) return;
        const z = Z(r + 1), [hi, lo, south] = run.k;
        const xa = X(run.c0), xb = X(cEnd);
        if (south) m.quad([[xb, Y(lo), z], [xa, Y(lo), z], [xa, Y(hi), z], [xb, Y(hi), z]], [0, 0, -1], white, 1, 0);
        else m.quad([[xa, Y(lo), z], [xb, Y(lo), z], [xb, Y(hi), z], [xa, Y(hi), z]], [0, 0, 1], white, 1, 0);
        run = null;
      };
      for (let c = 0; c <= W; c++) {
        const a = c < W ? at(c, r) : 0, b = c < W ? at(c, r + 1) : 0;
        const key = a === b ? null : a > b ? [a, b, 0] : [b, a, 1];
        if (!key) { flush(c); continue; }
        if (run && run.k[0] === key[0] && run.k[1] === key[1] && run.k[2] === key[2]) continue;
        flush(c); run = { c0: c, k: key };
      }
    }
    const mesh = new THREE.Mesh(m.geometry(), mat);
    mesh.name = 'far landmarks'; mesh.matrixAutoUpdate = false;
    aerial.add(mesh);
    state.tris += m.i.length / 3;
    state.ms.columns = Math.round(performance.now() - t0);
    state.columns = m.i.length / 3;
  }

  // ---- the top-down colour capture of the city (lit as it is now, with sun shadows over the whole map)
  // The capture is drawn with the shaders the city already has for where it is drawn now: into the post-processing
  // target (medium / high: scene-linear half float) or straight to the screen (low: tone mapped sRGB, which a target
  // flagged as an XR one reproduces, bytes stored as they are and decoded in the far shader). No new shaders either way.
  let capLinear = null, capScreen = null;
  function captureTarget() {
    const S = lite ? 1024 : 2048, cell = Math.max(B.w, B.h) / S;
    const W = Math.ceil(B.w / cell), H = Math.ceil(B.h / cell);
    const opts = { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, anisotropy: lite ? 4 : 8 };
    const post = getTarget && getTarget();
    if (post) {
      if (!capLinear) capLinear = new THREE.WebGLRenderTarget(W, H, { ...opts, type: post.texture.type });
      U.uCapMode.value = 0;
      return capLinear;
    }
    if (!capScreen) {
      capScreen = new THREE.WebGLRenderTarget(W, H, { ...opts, type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, internalFormat: 'RGBA8' });
      capScreen.texture.colorSpace = THREE.SRGBColorSpace; capScreen.texture.internalFormat = 'RGBA8';
      capScreen.isXRRenderTarget = true; // tone mapping and sRGB output as for the screen (see three's WebGLPrograms)
    }
    U.uCapMode.value = 1; U.uCapExp.value = renderer.toneMappingExposure;
    return capScreen;
  }
  function makeCapture() {
    captureCam = new THREE.OrthographicCamera(-B.w / 2, B.w / 2, B.h / 2, -B.h / 2, 1, 460);
    captureCam.position.set(B.minX + B.w / 2, 400, B.minZ + B.h / 2);
    captureCam.up.set(0, 0, -1);
    captureCam.lookAt(B.minX + B.w / 2, 0, B.minZ + B.h / 2);
    captureCam.updateMatrixWorld(true);
  }
  // what the capture leaves out: moving things, per-frame tree packs (their blobs stand in), the far view itself
  function hideForCapture() {
    const hidden = [];
    const hide = (o) => { if (o.visible) { o.visible = false; hidden.push(o); } };
    // (their drawables only: a light inside one, the car's headlight say, stays, or every shader's light count
    // would change and the capture would need a new set of programs)
    for (const c of mainScene.children) {
      if (!skipRoots.has(c) || !c.visible) continue;
      if (c.isLight) continue;
      c.traverseVisible((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) hide(o); });
    }
    mainScene.traverseVisible((o) => { if (o.isLine || o.isPoints || o.isSprite) hide(o); }); // rain, glows
    const counts = packedMeshes().map((m) => [m, m.count]);
    for (const [m] of counts) { m.count = 0; hide(m); }
    mainScene.add(state.treeGroup);
    return () => { for (const o of hidden) o.visible = true; for (const [m, n] of counts) m.count = n; aerial.add(state.treeGroup); };
  }
  function capture() {
    const t0 = performance.now();
    const sun = atmosphere.sun, sc = sun.shadow.camera;
    const saved = { l: sc.left, r: sc.right, t: sc.top, b: sc.bottom, n: sc.near, f: sc.far, nb: sun.shadow.normalBias, pos: sun.position.clone(), tgt: sun.target.position.clone() };
    const R = Math.hypot(B.w, B.h) / 2 + 20, cx = B.minX + B.w / 2, cz = B.minZ + B.h / 2;
    Object.assign(sc, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 2 * R + 900 });
    sc.updateProjectionMatrix();
    sun.shadow.normalBias = ((2 * R) / sun.shadow.mapSize.x) * 1.2;
    sun.target.position.set(cx, 0, cz);
    sun.position.set(cx, 0, cz).addScaledVector(atmosphere.sunDir, R + 450);
    sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
    const fog = mainScene.fog, density = fog.density;
    fog.density = 0;
    const restore = hideForCapture();
    const prevTarget = renderer.getRenderTarget(), prevAuto = renderer.autoClear;
    const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
    renderer.shadowMap.needsUpdate = true;
    capRT = captureTarget();
    renderer.setRenderTarget(capRT);
    renderer.setClearColor(0x3a3b3d, 1);
    renderer.autoClear = true;
    renderer.render(mainScene, captureCam);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(clear, alpha);
    renderer.autoClear = prevAuto;
    restore();
    fog.density = density;
    Object.assign(sc, { left: saved.l, right: saved.r, top: saved.t, bottom: saved.b, near: saved.n, far: saved.f });
    sc.updateProjectionMatrix();
    sun.shadow.normalBias = saved.nb; sun.position.copy(saved.pos); sun.target.position.copy(saved.tgt);
    renderer.shadowMap.needsUpdate = true;
    U.uCap.value = capRT.texture; U.uCapOn.value = 1;
    state.capture++; state.dirty = false;
    state.ms.capture = Math.round(performance.now() - t0);
  }

  async function build() {
    if (state.built || state.building) return;
    state.building = true;
    const t0 = performance.now();
    sliceAt = performance.now();
    await buildStatic(); state.ms.at1 = Math.round(performance.now() - t0);
    buildHeroes();
    await buildColumns(); state.ms.at2 = Math.round(performance.now() - t0);
    makeCapture();
    // the few new shaders, off the main thread where the driver allows: the tree blobs under the city's lights (they
    // join the capture), and the far scene's (the far city, the hero models' far levels) for the target it draws into
    const tc = performance.now(), progs0 = renderer.info.programs ? renderer.info.programs.length : 0;
    const ps = [];
    const compile = (obj, cam, into) => { try { if (renderer.compileAsync) ps.push(renderer.compileAsync(obj, cam, into).catch(() => {})); } catch { /* compiles on first draw */ } };
    // (the whole map at once: the parts never seen yet from the car, and the models that loaded after the start)
    renderer.setRenderTarget(captureTarget());
    const restore = hideForCapture();
    const lodVis = [];
    for (const lod of heroLods) for (const l of lod.levels) { lodVis.push([l.object, l.object.visible]); l.object.visible = true; } // both levels
    compile(mainScene, captureCam, mainScene);
    for (const [o, v] of lodVis) o.visible = v;
    restore();
    renderer.setRenderTarget(getTarget ? getTarget() : null);
    aerial.visible = true;
    compile(scene, camera, scene);
    aerial.visible = false;
    if (nearTrees && lite) { nearTrees.visible = true; compile(nearTrees, camera, mainScene); nearTrees.visible = false; }
    renderer.setRenderTarget(null);
    await Promise.all(ps); state.ms.at3 = Math.round(performance.now() - t0);
    resume();
    state.ms.compile = Math.round(performance.now() - tc); state.programs = (renderer.info.programs ? renderer.info.programs.length : 0) - progs0;
    // the first capture draws the whole map at once: much of it never drawn before (its buffers and textures go up to
    // the GPU then). Draw it first a tile at a time (into the capture's own target), one tile per task: no one hitch.
    {
      const scrap = captureTarget(), n = 8, m = 4, prevAuto = renderer.shadowMap.autoUpdate; // (the same kind of target: the same shaders)
      const wasNeeds = renderer.shadowMap.needsUpdate;
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
        const tw = performance.now(), restore = hideForCapture();
        captureCam.setViewOffset(n * 64, m * 64, i * 64, j * 64, 64, 64);
        renderer.shadowMap.needsUpdate = false;
        renderer.setRenderTarget(scrap); renderer.render(mainScene, captureCam); renderer.setRenderTarget(null);
        restore(); (state.warm = state.warm || []).push(Math.round(performance.now() - tw));
        await slice('warm');
      }
      captureCam.clearViewOffset();
      renderer.shadowMap.autoUpdate = prevAuto; renderer.shadowMap.needsUpdate = wasNeeds || true;

    }
    const pc = renderer.info.programs ? renderer.info.programs.length : 0;
    capture(); state.ms.capture0 = state.ms.capture; state.capPrograms = (renderer.info.programs ? renderer.info.programs.length : 0) - pc;
    state.built = true; state.building = false;
    state.ms.total = Math.round(performance.now() - t0); state.ms.longest = Math.round(state.longest); state.ms.longestAt = state.longestAt;
    console.log('far view', JSON.stringify({ tris: state.tris, columns: state.columns, ms: state.ms }));
  }

  // the apron: the painted ground beyond the map edge in the main scene (to the main far plane), round a hole for
  // the map; plain until the painting exists (it is made the first time anyone flies)
  const shape = new THREE.Shape([[OUT.minX, -OUT.minZ], [OUT.maxX, -OUT.minZ], [OUT.maxX, -OUT.maxZ], [OUT.minX, -OUT.maxZ]].map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes.push(new THREE.Path([[B.minX, -B.minZ], [B.minX, -B.maxZ], [B.maxX, -B.maxZ], [B.maxX, -B.minZ]].map(([x, y]) => new THREE.Vector2(x, y))));
  const apron = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, -0.05, 0), farMaterial({ GROUND: '', OUTER: '' }));
  apron.name = 'apron'; apron.matrixAutoUpdate = false;

  const lp = new THREE.Vector3();
  return {
    scene, camera, state, poolbeg, apron, chimneys: POOLBEG,
    // the main scene and the roots the captures leave out (vehicles, people, the helicopter)
    attach(main, skip, target) { mainScene = main; skipRoots = skip; getTarget = target; scene.fog = main.fog; },
    // after a weather / time-of-day change: lighting, and a fresh capture when next in the air
    sync() {
      const p = atmosphere.state.values, sd = atmosphere.sunDir;
      U.uSunD.value.copy(sd); U.uSunC.value.set(p.sun).multiplyScalar(p.sunI);
      U.uFillD.value.copy(atmosphere.fillDir); U.uFillC.value.set(p.fill).multiplyScalar(p.fillI);
      U.uHemiS.value.set(p.hemiSky).multiplyScalar(p.hemi); U.uHemiG.value.set(p.hemiGround).multiplyScalar(p.hemi);
      U.uEnvC.value.set(p.horizon).lerp(new THREE.Color(p.top), 0.4).multiplyScalar(p.env * 0.9);
      U.uNight.value = p.windows; U.uLights.value = p.lamps * 0.9;
      poolbeg.lights.visible = p.lamps > 0.5;
      poolbeg.lights.material.opacity = p.lamps > 0.5 ? 1 : 0;
      fHemi.color.copy(atmosphere.hemi.color); fHemi.groundColor.copy(atmosphere.hemi.groundColor); fHemi.intensity = atmosphere.hemi.intensity;
      fSun.color.copy(atmosphere.sun.color); fSun.intensity = atmosphere.sun.intensity; fSun.position.copy(sd).multiplyScalar(100);
      fFill.color.copy(atmosphere.fill.color); fFill.intensity = atmosphere.fill.intensity; fFill.position.copy(atmosphere.fillDir).multiplyScalar(100);
      if (mainScene) { scene.environment = mainScene.environment; scene.environmentIntensity = mainScene.environmentIntensity; }
      state.dirty = true;
    },
    setWet(w) { U.uWet.value = w; },
    // start building (in the background) before it is needed: on entering the helicopter or photo mode
    prepare() { if (!state.built && !state.building && mainScene) build(); },
    // A deferred stadium may arrive after photo mode has already prepared the aerial view.
    refreshHeroes() { if (mainScene) buildHeroes(); state.dirty = true; },
    recapture() { if (state.built) capture(); return state.ms.capture; },
    get captureTexture() { return capRT ? capRT.texture : null; },
    get outerTexture() { return U.uOuter.value; },
    // blobs for the trees beyond d metres in the main view (0: none); returns whether they are there to stand in
    setTreeCut(d) { U.uTreeCut.value = d; const on = !!nearTrees && d > 0 && state.air; if (nearTrees) nearTrees.visible = on; return on; },
    wetSettled() { state.dirty = true; },
    // once a frame, just before drawing: follow the view camera; far plane of the main view = mainFar
    update(cam, mainFar) {
      camera.position.copy(cam.position); camera.quaternion.copy(cam.quaternion);
      const near = Math.max(50, mainFar * 0.85);
      if (camera.fov !== cam.fov || camera.aspect !== cam.aspect || camera.near !== near || camera.zoom !== cam.zoom) {
        camera.fov = cam.fov; camera.aspect = cam.aspect; camera.zoom = cam.zoom; camera.near = near; camera.far = 16000;
        camera.updateProjectionMatrix();
      }
      const air = cam.position.y > AIR_Y;
      state.air = air;
      if (air && !state.built && !state.building && mainScene) build();
      aerial.visible = air && state.built;
      if (aerial.visible && state.dirty && !state.building) capture();
      // the chimneys' lights keep a steady size; dimmer the further off the camera is
      lp.set(POOLBEG[0].x, 100, POOLBEG[0].z);
      const dist = Math.hypot(cam.position.x - lp.x, cam.position.z - lp.z);
      poolbeg.lights.material.size = THREE.MathUtils.clamp(9 - dist / 900, 4, 8);
      // a free camera that wanders out near the stacks (inside the far camera's near plane): draw them with the city
      const close = mainScene && dist < near + 40;
      if (close && poolbeg.group.parent !== mainScene) mainScene.add(poolbeg.group);
      else if (!close && poolbeg.group.parent !== scene) scene.add(poolbeg.group);
    },
  };
}
