// Instanced vehicle fleet: cars (hatchback, saloon, SUV, van, taxi) and Dublin Bus double-deckers.
// Car bodies are bevelled extrusions of a side profile with wheel arches; a painted atlas supplies windows,
// pillars, lights, grilles and Irish number plates. The instance colour tints only painted areas (atlas alpha).
import * as THREE from 'three';
import { IS_MOBILE } from '../world/textures.js';
import { LITE } from '../render/quality.js';
import { createContactShadows } from '../render/contact.js';
import { addReflections } from '../render/reflect.js';

// Atlases are painted at a comfortable working size (fixed pixel fonts / strokes) and uploaded downscaled:
// the bus atlases alone were 12 x 2048^2 (~270 MB of GPU memory).
function shrink(canvas, size) {
  if (canvas.width <= size) return canvas;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, size, size);
  return c;
}

// ---------------- vehicle types ----------------
// top: outline in (z, y) from the rear bumper over the roof to the front; wheels: [zRear, zFront]; r: wheel radius
export const TYPES = {
  hatch: {
    L: 4.05, W: 1.78, H: 1.47, belt: 0.97, r: 0.31, wheels: [-1.28, 1.27],
    top: [[-2.02, 0.36], [-2.05, 0.62], [-2.0, 0.96], [-1.93, 1.36], [-1.62, 1.46], [0.05, 1.47], [0.56, 1.36], [1.16, 0.99], [1.86, 0.86], [2.02, 0.72], [2.05, 0.44], [1.97, 0.3]],
    screens: { front: [1.16, 0.56], rear: [-2.0, -1.93] },
    pillars: [[-1.95, -1.55], [-0.35, -0.2], [0.45, 1.1]],
  },
  saloon: {
    L: 4.65, W: 1.82, H: 1.46, belt: 1.0, r: 0.32, wheels: [-1.34, 1.42],
    top: [[-2.3, 0.4], [-2.34, 0.7], [-2.28, 0.99], [-1.78, 1.03], [-1.3, 1.42], [0.12, 1.46], [0.68, 1.34], [1.28, 0.99], [2.2, 0.83], [2.32, 0.64], [2.34, 0.42], [2.24, 0.3]],
    screens: { front: [1.28, 0.68], rear: [-1.78, -1.3] },
    pillars: [[-1.6, -1.25], [-0.2, -0.05], [0.6, 1.2]],
  },
  suv: {
    L: 4.5, W: 1.86, H: 1.7, belt: 1.15, r: 0.36, wheels: [-1.36, 1.36],
    top: [[-2.23, 0.5], [-2.27, 0.82], [-2.24, 1.12], [-2.15, 1.62], [-1.9, 1.7], [0.28, 1.7], [0.82, 1.54], [1.32, 1.16], [2.14, 1.04], [2.25, 0.86], [2.27, 0.52], [2.16, 0.4]],
    screens: { front: [1.32, 0.82], rear: [-2.24, -2.15] },
    pillars: [[-2.15, -1.8], [-0.35, -0.2], [0.7, 1.25]],
  },
  van: {
    L: 5.3, W: 2.0, H: 2.26, belt: 1.25, r: 0.35, wheels: [-1.62, 1.75],
    top: [[-2.64, 0.42], [-2.66, 2.18], [-2.52, 2.26], [1.42, 2.26], [1.78, 2.1], [2.28, 1.26], [2.6, 1.06], [2.66, 0.72], [2.66, 0.46], [2.56, 0.32]],
    screens: { front: [2.28, 1.78], rear: null },
    pillars: [[-2.7, 1.0], [1.5, 2.3]],
    cabOnly: true,
  },
};
TYPES.taxi = { ...TYPES.saloon };

const PLATE_TEXT = ['191-D-2847', '12-D-40318', '221-D-9954', '08-KE-1127', '162-D-4410', '232-D-1789', '10-WW-3321', '201-D-6620'];

// ---------------- atlas painting ----------------
// Layout (1024 x 1024, v up): side view v in [0.5,1], plan (top) view v in [0.25,0.5],
// front (u<0.5) and back (u>0.5) views in v [0,0.25]. Alpha = paint mask (1 = body colour, tinted per instance).
export function paintAtlas(t) {
  const S = 1024;
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = S; return cv; };
  const colC = mk(), mskC = mk(), emiC = mk();
  const C = colC.getContext('2d'), M = mskC.getContext('2d'), E = emiC.getContext('2d');
  C.fillStyle = '#ffffff'; C.fillRect(0, 0, S, S);
  M.fillStyle = '#ffffff'; M.fillRect(0, 0, S, S);
  E.fillStyle = '#000000'; E.fillRect(0, 0, S, S);
  const part = (fill, path) => { C.fillStyle = fill; C.beginPath(); path(C); C.fill(); M.fillStyle = '#000'; M.beginPath(); path(M); M.fill(); };
  const lamp = (fill, glow, path) => { part(fill, path); E.fillStyle = glow; E.beginPath(); path(E); E.fill(); };
  const shade = (alpha, path) => { C.fillStyle = `rgba(0,0,0,${alpha})`; C.beginPath(); path(C); C.fill(); };
  const rect = (x0, y0, x1, y1) => (g) => g.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));

  // side (canvas y 0..S/2)
  const sx = (z) => ((z + t.L / 2) / t.L) * S, sy = (y) => S * 0.5 * (1 - y / t.H);
  const roofY = Math.max(...t.top.map((p) => p[1]));
  const house = t.top.filter((p) => p[1] > t.belt - 0.01);
  const [zg0, zg1] = t.cabOnly ? [t.pillars[1][0], t.screens.front[0] - 0.12] : [t.pillars[0][1], t.pillars[2][1]];
  const glassPath = (g) => {
    g.moveTo(sx(zg0), sy(t.belt + 0.04));
    for (const p of house) g.lineTo(sx(Math.max(zg0, Math.min(zg1, p[0]))), sy(Math.min(p[1] - 0.08, roofY - 0.08)));
    g.lineTo(sx(zg1), sy(t.belt + 0.04));
    g.closePath();
  };
  part('#1b2127', glassPath);
  C.save(); C.beginPath(); glassPath(C); C.clip();
  const gr = C.createLinearGradient(0, sy(roofY), 0, sy(t.belt));
  gr.addColorStop(0, '#3b454f'); gr.addColorStop(0.5, '#20272e'); gr.addColorStop(1, '#12161a');
  C.fillStyle = gr; C.fillRect(0, 0, S, S / 2); C.restore();
  if (!t.cabOnly) part('#121315', rect(sx(t.pillars[1][0]), sy(roofY), sx(t.pillars[1][1]), sy(t.belt))); // B-pillar
  part('#151617', rect(0, sy(0.44), S, sy(0.2)));                                                        // sills / lower cladding
  const seams = t.cabOnly ? [t.pillars[1][0] - 0.02, 1.4, -0.5] : [t.pillars[1][0] - 0.01, t.pillars[1][1] + 0.01, t.pillars[2][1] - 0.02, t.pillars[0][1] + 0.12];
  for (const z of seams) shade(0.55, rect(sx(z) - 1.2, sy(t.belt + 0.25), sx(z) + 1.2, sy(0.44)));
  shade(0.35, rect(0, sy(t.belt - 0.02), S, sy(t.belt - 0.045)));                                         // shoulder crease
  if (!t.cabOnly) for (const z of [t.pillars[1][0] - 0.38, t.pillars[2][0] - 0.25]) shade(0.6, rect(sx(z), sy(t.belt - 0.1), sx(z + 0.18), sy(t.belt - 0.15)));
  lamp('#8f1612', '#ff2a1a', rect(sx(-t.L / 2), sy(t.belt + 0.02), sx(-t.L / 2 + 0.12), sy(t.belt - 0.18)));
  lamp('#d9832a', '#ff9a2a', rect(sx(t.L / 2 - 0.14), sy(0.78), sx(t.L / 2), sy(0.7)));

  // plan (canvas y S/2..3S/4): x = along the length, y = across the width
  const py = (x) => S * (0.75 - 0.25 * ((x + t.W / 2) / t.W));
  const screen = (za, zb) => part('#1d242b', rect(sx(za), py(-t.W / 2 + 0.1), sx(zb), py(t.W / 2 - 0.1)));
  if (t.screens.front) screen(t.screens.front[1] + 0.03, t.screens.front[0] - 0.02);
  if (t.screens.rear) screen(t.screens.rear[0] + 0.02, t.screens.rear[1] - 0.02);

  // front (u < 0.5) and back (u > 0.5), canvas y 3S/4..S
  const fy = (y) => S * (1 - 0.25 * (y / t.H));
  const fx = (x, back) => (back ? S * 0.5 + ((t.W / 2 - x) / t.W) * S * 0.5 : ((x + t.W / 2) / t.W) * S * 0.5);
  const plate = PLATE_TEXT[Math.floor(Math.random() * PLATE_TEXT.length)];
  for (const back of [false, true]) {
    part('#1a2027', rect(fx(-t.W / 2 + 0.1, back), fy(roofY - 0.06), fx(t.W / 2 - 0.1, back), fy(t.belt + 0.05)));
    part('#141516', rect(fx(-t.W / 2, back), fy(0.5), fx(t.W / 2, back), fy(0.26)));
    if (!back) part('#1b1c1e', rect(fx(-0.4, false), fy(0.74), fx(0.4, false), fy(0.56)));
    for (const s of [-1, 1]) {
      const x0 = s * (t.W / 2 - 0.08), x1 = s * (t.W / 2 - 0.42);
      if (back) lamp('#8a1410', '#ff2a1a', rect(fx(x0, true), fy(0.98), fx(x1, true), fy(0.8)));
      else lamp('#dfe3e6', '#fff1d6', rect(fx(x0, false), fy(0.8), fx(x1, false), fy(0.68)));
    }
    // Irish plate: white with a blue EU band on the left
    const px0 = Math.min(fx(-0.26, back), fx(0.26, back)), px1 = Math.max(fx(-0.26, back), fx(0.26, back));
    const pyA = fy(0.52), pyB = fy(0.4);
    part('#f3f3ef', rect(px0, pyA, px1, pyB));
    part('#2a4aa8', rect(px0, pyA, px0 + (px1 - px0) * 0.12, pyB));
    C.fillStyle = '#111'; C.font = 'bold 26px Arial'; C.textAlign = 'center'; C.textBaseline = 'middle';
    C.save(); C.translate((px0 + px1) / 2 + 5, (pyA + pyB) / 2 + 1); C.scale(0.85, 0.75); C.fillText(plate, 0, 0); C.restore();
  }

  // combine colour + mask into a straight-alpha DataTexture (a canvas would premultiply and lose colour under alpha 0)
  const col = C.getImageData(0, 0, S, S).data, msk = M.getImageData(0, 0, S, S).data;
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) {
    const src = y * S * 4, dst = (S - 1 - y) * S * 4; // flip rows so v runs up, like the canvas textures
    for (let x = 0; x < S * 4; x += 4) {
      data[dst + x] = col[src + x]; data[dst + x + 1] = col[src + x + 1]; data[dst + x + 2] = col[src + x + 2]; data[dst + x + 3] = msk[src + x];
    }
  }
  const map = new THREE.DataTexture(data, S, S);
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.needsUpdate = true;
  const emissiveMap = new THREE.CanvasTexture(shrink(emiC, 256)); // lamp masks only need coarse detail
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

// ---------------- body geometry ----------------
function bodyGeometry(t) {
  const shape = new THREE.Shape();
  const pts = t.top;
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) shape.lineTo(p[0], p[1]);
  // underside from the front to the rear, with wheel arches
  const [zr, zf] = t.wheels, ar = t.r + 0.06, bottom = Math.min(pts[0][1], pts[pts.length - 1][1]);
  const arch = (zc) => {
    shape.lineTo(zc + ar, bottom);
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI;
      shape.lineTo(zc + Math.cos(a) * ar, Math.max(bottom, t.r + Math.sin(a) * (ar + 0.02)));
    }
  };
  shape.lineTo(pts[pts.length - 1][0], bottom);
  arch(zf);
  arch(zr);
  shape.lineTo(pts[0][0], bottom);
  shape.closePath();
  const bev = 0.05;
  const g = new THREE.ExtrudeGeometry(shape, { depth: t.W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 1, curveSegments: 3 });
  g.translate(0, 0, -(t.W - 2 * bev) / 2);
  g.rotateY(-Math.PI / 2); // shape x (length) -> +z, extrusion (width) -> x
  const pos = g.attributes.position, uv = g.attributes.uv;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), n = new THREE.Vector3(), tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); cc.fromBufferAttribute(pos, i + 2);
    n.subVectors(cc, b).cross(tmp.subVectors(a, b)).normalize();
    const zc = (a.z + b.z + cc.z) / 3;
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k), y = pos.getY(i + k), z = pos.getZ(i + k);
      let u, v;
      if (Math.abs(n.x) > 0.7) { u = (z + t.L / 2) / t.L; v = 0.5 + 0.5 * (y / t.H); }
      else if (Math.abs(n.z) > Math.max(Math.abs(n.y), 0.55)) {
        const back = zc < 0;
        u = back ? 0.5 + 0.5 * ((t.W / 2 - x) / t.W) : 0.5 * ((x + t.W / 2) / t.W);
        v = 0.25 * (y / t.H);
      } else { u = (z + t.L / 2) / t.L; v = 0.25 + 0.25 * ((x + t.W / 2) / t.W); }
      uv.setXY(i + k, Math.min(0.999, Math.max(0.001, u)), Math.min(0.999, Math.max(0.001, v)));
    }
  }
  g.computeVertexNormals();
  return g;
}

function carMaterial(atlas) {
  const m = new THREE.MeshPhysicalMaterial({
    map: atlas.map, emissiveMap: atlas.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.15,
    roughness: 0.32, metalness: 0.35, clearcoat: LITE ? 0 : 0.8, clearcoatRoughness: 0.2,
  });
  m.onBeforeCompile = (sh) => {
    // tint painted panels only (atlas alpha = paint mask); glass, trim and lights keep their colour
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
      #if defined( USE_INSTANCING_COLOR ) || defined( USE_COLOR )
        diffuseColor.rgb *= mix(vec3(1.0), vColor.rgb, sampledDiffuseColor.a);
      #endif
      diffuseColor.a = 1.0;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(0.08, roughnessFactor, sampledDiffuseColor.a);`);
  };
  return addReflections(m, 1);
}

// ---------------- wheels ----------------
function wheelGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
  g.rotateZ(Math.PI / 2);
  const pos = g.attributes.position, uv = g.attributes.uv, nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(nor.getX(i)) > 0.9) uv.setXY(i, pos.getZ(i) * 0.5 + 0.5, pos.getY(i) * 0.5 + 0.5);
    else uv.setXY(i, 0.02, 0.02); // tread samples the black tyre
  }
  return g;
}
function rimTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#9da1a6'; g.beginPath(); g.arc(64, 64, 42, 0, 7); g.fill();
  g.fillStyle = '#2a2c2e';
  for (let k = 0; k < 5; k++) { g.save(); g.translate(64, 64); g.rotate((k / 5) * Math.PI * 2); g.beginPath(); g.moveTo(-7, 12); g.lineTo(7, 12); g.lineTo(12, 38); g.lineTo(-12, 38); g.fill(); g.restore(); }
  g.fillStyle = '#c4c8cc'; g.beginPath(); g.arc(64, 64, 10, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- Dublin Bus (Enviro400-style double-decker) ----------------
const BUS = { L: 10.8, W: 2.55, H: 4.35, r: 0.5, wheels: [-2.6, 3.1] };
const ROUTES = [['16', 'Airport'], ['46A', 'Dún Laoghaire'], ['39A', 'UCD Belfield'], ['145', 'Heuston Stn'], ['C1', 'Adamstown'], ['G2', 'Spencer Dock']];
// Canvas regions (y down): nearside [0, 0.3), offside [0.3, 0.6), front / back / roof [0.6, 1.0]
function busAtlas(route) {
  const S = 2048, c = document.createElement('canvas');
  c.width = c.height = S;
  const e = document.createElement('canvas');
  e.width = e.height = S;
  const g = c.getContext('2d'), eg = e.getContext('2d');
  eg.fillStyle = '#000'; eg.fillRect(0, 0, S, S);
  const { L, H } = BUS;
  const YEL = '#f2c416', NAVY = '#1c2c66', BLUE = '#3f79c2', GLASS = '#151b21';
  const side = (y0, near) => {
    const h = S * 0.3, X = (z) => ((z + L / 2) / L) * S, Y = (y) => y0 + h * (1 - y / H);
    // texture u runs toward the viewer's right: rear-to-front on the offside, front-to-rear on the nearside
    const f = near ? -1 : 1, Xw = (z) => X(f * z);
    const glass = (za, zb, ya, yb) => {
      const x0 = Math.min(Xw(za), Xw(zb)), x1 = Math.max(Xw(za), Xw(zb));
      const gr = g.createLinearGradient(0, Y(yb), 0, Y(ya));
      gr.addColorStop(0, '#46525e'); gr.addColorStop(0.35, '#232b33'); gr.addColorStop(1, '#10151a');
      g.fillStyle = gr; g.fillRect(x0, Y(yb), x1 - x0, Y(ya) - Y(yb));
    };
    g.fillStyle = YEL; g.fillRect(0, y0, S, h);
    g.fillStyle = NAVY; g.fillRect(0, Y(1.15), S, Y(0.3) - Y(1.15));
    g.fillStyle = BLUE; g.fillRect(0, Y(1.24), S, Y(1.15) - Y(1.24));
    g.fillStyle = '#e8e6e0'; g.fillRect(0, Y(H), S, Y(H - 0.12) - Y(H));
    const lower = near ? [-4.9, 3.6] : [-4.9, 4.9];
    glass(lower[0], lower[1], 1.4, 2.25);
    glass(-5.1, 5.1, 2.8, 3.85);
    g.fillStyle = YEL;
    for (let z = -4.9 + 1.15; z < 5.1; z += 1.15) {
      g.fillRect(Xw(z) - 6, Y(3.85), 12, Y(2.8) - Y(3.85));
      if (z > lower[0] && z < lower[1]) g.fillRect(Xw(z) - 6, Y(2.25), 12, Y(1.4) - Y(2.25));
    }
    if (near) {
      // passenger doors on the kerb side: ahead of the front axle and in the middle
      for (const [za, zb] of [[3.75, 5.05], [-0.65, 0.65]]) {
        const z0 = Math.min(Xw(za), Xw(zb)), z1 = Math.max(Xw(za), Xw(zb));
        g.fillStyle = '#2b2f33'; g.fillRect(z0, Y(2.45), z1 - z0, Y(0.32) - Y(2.45));
        g.fillStyle = GLASS; g.fillRect(z0 + 8, Y(2.35), z1 - z0 - 16, Y(0.6) - Y(2.35));
        g.fillStyle = '#9a9ea3'; g.fillRect((z0 + z1) / 2 - 2, Y(2.35), 4, Y(0.6) - Y(2.35));
      }
    }
    g.fillStyle = '#111';
    for (const z of BUS.wheels) { g.beginPath(); g.arc(Xw(z), Y(0.3), S * 0.058, Math.PI, 0); g.fill(); }
    g.fillStyle = '#35a649'; g.beginPath(); g.arc(Xw(3.0), Y(2.55), 40, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TFI', Xw(3.0), Y(2.55));
    g.font = 'bold 46px Arial'; g.textAlign = 'left';
    g.fillText('Dublin Bus', Xw(near ? -1.0 : -3.6), Y(0.78));
    g.font = '32px Arial'; g.fillText('Bus Átha Cliath', Xw(near ? -1.0 : -3.6), Y(0.52));
    if (!near) {
      g.fillStyle = '#ede7da'; g.fillRect(Xw(-3.8), Y(2.72), Xw(1.6) - Xw(-3.8), Y(2.3) - Y(2.72));
      g.fillStyle = '#b3261e'; g.font = 'bold 40px Georgia'; g.textAlign = 'center'; g.fillText('THE LIFFEY CAFÉ  ·  OPEN LATE', Xw(-1.1), Y(2.51));
    }
  };
  side(0, true);
  side(S * 0.3, false);
  const fw = S * 0.33, fy0 = S * 0.6, fh = S * 0.4, W = BUS.W;
  const FX = (x, o) => o + ((x + W / 2) / W) * fw, FY = (y) => fy0 + fh * (1 - y / H);
  for (const back of [false, true]) {
    const o = back ? fw : 0;
    g.fillStyle = YEL; g.fillRect(o, fy0, fw, fh);
    g.fillStyle = NAVY; g.fillRect(o, FY(0.75), fw, FY(0.3) - FY(0.75));
    g.fillStyle = BLUE; g.fillRect(o, FY(0.84), fw, FY(0.75) - FY(0.84));
    g.fillStyle = '#e8e6e0'; g.fillRect(o, FY(H), fw, FY(H - 0.12) - FY(H));
    if (!back) {
      g.fillStyle = GLASS;
      g.fillRect(FX(-1.18, o), FY(2.3), FX(1.18, o) - FX(-1.18, o), FY(1.0) - FY(2.3));
      g.fillRect(FX(-1.18, o), FY(3.9), FX(1.18, o) - FX(-1.18, o), FY(2.85) - FY(3.9));
      g.fillStyle = '#0b0b0b'; g.fillRect(FX(-1.1, o), FY(2.74), FX(1.1, o) - FX(-1.1, o), FY(2.36) - FY(2.74));
      for (const ctx of [g, eg]) {
        ctx.fillStyle = '#ff9a1a'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 60px "Courier New", monospace'; ctx.textAlign = 'left'; ctx.fillText(route[0], FX(-1.02, o), FY(2.55));
        ctx.font = 'bold 40px "Courier New", monospace'; ctx.textAlign = 'right'; ctx.fillText(route[1], FX(1.04, o), FY(2.55));
      }
      for (const s of [-1, 1]) {
        const x0 = FX(s * 0.95 - 0.2, o), wv = FX(0.4, 0) - FX(0, 0);
        g.fillStyle = '#e8e6de'; g.fillRect(x0, FY(0.72), wv, FY(0.55) - FY(0.72));
        eg.fillStyle = '#fff2d8'; eg.fillRect(x0, FY(0.72), wv, FY(0.55) - FY(0.72));
      }
      g.fillStyle = '#f2f2ee'; g.fillRect(FX(-0.3, o), FY(0.5), FX(0.3, o) - FX(-0.3, o), FY(0.38) - FY(0.5));
      g.fillStyle = '#111'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('07-D-30038', FX(0, o), FY(0.44));
      g.fillStyle = '#fff'; g.font = 'bold 30px Arial'; g.fillText('Dublin Bus', FX(0, o), FY(0.95));
    } else {
      g.fillStyle = GLASS; g.fillRect(FX(-0.9, o), FY(3.85), FX(0.9, o) - FX(-0.9, o), FY(3.2) - FY(3.85));
      g.fillStyle = '#2a2d31'; g.fillRect(FX(-1.1, o), FY(1.5), FX(1.1, o) - FX(-1.1, o), FY(0.9) - FY(1.5));
      for (const s of [-1, 1]) {
        const x0 = FX(s * 1.1 - 0.1, o);
        g.fillStyle = '#8a1510'; g.fillRect(x0, FY(1.6), 26, FY(0.9) - FY(1.6));
        eg.fillStyle = '#ff2a1a'; eg.fillRect(x0, FY(1.6), 26, FY(0.9) - FY(1.6));
      }
      g.fillStyle = '#ede7da'; g.fillRect(FX(-1.1, o), FY(2.8), FX(1.1, o) - FX(-1.1, o), FY(1.8) - FY(2.8));
      g.fillStyle = '#1d5a3a'; g.font = 'bold 36px Georgia'; g.textAlign = 'center'; g.fillText('VISIT', FX(0, o), FY(2.45)); g.fillText('DUBLIN', FX(0, o), FY(2.15));
    }
  }
  g.fillStyle = '#e4e3de'; g.fillRect(S * 0.66, S * 0.6, S * 0.34, S * 0.4);
  const map = new THREE.CanvasTexture(shrink(c, LITE ? 512 : 1024)); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const emissiveMap = new THREE.CanvasTexture(shrink(e, 512)); emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

function busGeometry() {
  const { L, W, H } = BUS, r = 0.28;
  // cross-section with rounded roof edges, extruded along the length (+z = front)
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0.3); s.lineTo(W / 2, 0.3); s.lineTo(W / 2, H - r);
  s.quadraticCurveTo(W / 2, H, W / 2 - r, H); s.lineTo(-W / 2 + r, H); s.quadraticCurveTo(-W / 2, H, -W / 2, H - r); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2, curveSegments: 5 });
  g.translate(0, 0, -L / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(t.subVectors(a, b)).normalize();
    const zc = (a.z + b.z + c.z) / 3;
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k), y = pos.getY(i + k), z = pos.getZ(i + k);
      const yy = Math.max(0, Math.min(1, y / H));
      let u, v;
      if (Math.abs(n.z) > 0.6) {
        const back = zc < 0;
        u = (back ? 0.33 : 0) + 0.33 * (back ? (W / 2 - x) / W : (x + W / 2) / W);
        v = 0.4 * yy;
      } else if (Math.abs(n.y) > 0.8 && y > H * 0.5) { u = 0.8; v = 0.2; }
      else {
        const near = x > 0; // local +x is the bus's left (kerb side) when it faces +z
        const zz = (z + L / 2) / L;
        u = near ? 1 - zz : zz;
        v = near ? 0.7 + 0.3 * yy : 0.4 + 0.3 * yy;
      }
      uv.setXY(i + k, Math.min(0.999, Math.max(0.001, u)), Math.min(0.999, Math.max(0.001, v)));
    }
  }
  g.computeVertexNormals();
  return g;
}

// ---------------- fleet ----------------
// counts: vehicles per kind, moving and parked (addParked places the parked ones).
export function createFleet(scene, counts) {
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const contact = createContactShadows(scene, total, { opacity: 0.6 });
  // headlight light on the road ahead of moving vehicles (additive, only at night)
  const beams = createContactShadows(scene, total, { opacity: 0, round: true, color: 0xfff0d0, additive: true });
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  const kinds = {};
  for (const [kind, n] of Object.entries(counts)) {
    if (!n || kind === 'bus') continue;
    const t = TYPES[kind];
    const mesh = new THREE.InstancedMesh(bodyGeometry(t), carMaterial(paintAtlas(t)), n);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    scene.add(mesh);
    kinds[kind] = { t, mesh, used: 0, n };
  }
  const busMeshes = [];
  if (counts.bus) {
    const geo = busGeometry();
    for (let k = 0; k < counts.bus; k++) {
      const atlas = busAtlas(ROUTES[k % ROUTES.length]);
      const mat = addReflections(new THREE.MeshStandardMaterial({ map: atlas.map, emissiveMap: atlas.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.38, metalness: 0.15 }), 0.8);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      busMeshes.push(m);
    }
  }
  let taxiSigns = null;
  if (counts.taxi) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const g = c.getContext('2d');
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#1b3f94' : '#f6c615'; g.fillRect(i * 8, 0, 8, 7); g.fillStyle = i % 2 ? '#f6c615' : '#1b3f94'; g.fillRect(i * 8, 25, 8, 7); }
    g.fillStyle = '#f6c615'; g.fillRect(0, 7, 128, 18); g.fillStyle = '#1b3f94'; g.font = 'bold 16px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAXI', 64, 16.5);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    taxiSigns = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.2, 0.22).translate(0, 0.1, 0), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3 }), counts.taxi);
    taxiSigns.frustumCulled = false;
    taxiSigns.count = 0;
    scene.add(taxiSigns);
  }
  const totalWheels = Object.values(kinds).reduce((s, k) => s + k.n * 4, 0) + (counts.bus || 0) * 4;
  const wheels = new THREE.InstancedMesh(wheelGeometry(), new THREE.MeshStandardMaterial({ map: rimTexture(), roughness: 0.6, metalness: 0.3 }), totalWheels);
  wheels.castShadow = false; wheels.frustumCulled = false; wheels.count = 0;
  scene.add(wheels);
  let wheelCursor = 0, busUsed = 0;

  // Parked cars share the moving cars' meshes (no extra draw calls) but only take a slot while they can be seen:
  // cull() packs the ones in the camera's view, or near enough to the player to cast into the shadow map, in after
  // the moving vehicles. Drawing every parked car in the city on every frame (twice, with the shadow pass) cost
  // vertex work that grows with the map.
  const parked = [];
  // list: [{ kind, color, x, z, heading }]
  function addParked(list) {
    const m = new THREE.Matrix4(), pq = new THREE.Quaternion(), pl = new THREE.Vector3(), ps = new THREE.Vector3();
    for (const p of list) {
      const t = TYPES[p.kind];
      pq.setFromAxisAngle(up, p.heading);
      const car = { k: kinds[p.kind], x: p.x, z: p.z, m: new Float32Array(16), col: [p.color.r, p.color.g, p.color.b], wheels: new Float32Array(64) };
      m.compose(P.set(p.x, 0, p.z), pq, one).toArray(car.m);
      let w = 0;
      for (const zc of t.wheels) for (const sd of [-1, 1]) {
        pl.set(sd * (t.W / 2 - 0.13), t.r, zc).applyQuaternion(pq);
        m.compose(P.set(p.x + pl.x, pl.y, p.z + pl.z), pq, ps.set(0.23, t.r, t.r)).toArray(car.wheels, 16 * w++);
      }
      contact.set(contact.alloc(), p.x, 0, p.z, p.heading, t.W + 0.7, t.L + 0.6);
      parked.push(car);
    }
  }
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 4);
  // camera: the view camera (after this frame's camera update); focus: the player
  function cull(camera, focus) {
    if (!parked.length) return;
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const k of Object.values(kinds)) k.slot = k.used;
    let w = wheelCursor;
    for (const c of parked) {
      const dx = c.x - focus.x, dz = c.z - focus.z;
      // the shadow map covers ~100 m around (and ahead of) the player
      if (dx * dx + dz * dz > 90 * 90) { sphere.center.set(c.x, 1, c.z); if (!frustum.intersectsSphere(sphere)) continue; }
      const k = c.k;
      k.mesh.instanceMatrix.array.set(c.m, k.slot * 16);
      k.mesh.instanceColor.array.set(c.col, k.slot * 3);
      k.slot++;
      wheels.instanceMatrix.array.set(c.wheels, w * 16); w += 4;
    }
    for (const k of Object.values(kinds)) { k.mesh.count = k.slot; k.mesh.instanceMatrix.needsUpdate = true; k.mesh.instanceColor.needsUpdate = true; }
    wheels.count = w; wheels.instanceMatrix.needsUpdate = true;
  }

  const vehicles = [];
  function add(kind, color) {
    let h;
    if (kind === 'bus') {
      h = { kind, mesh: busMeshes[busUsed++], L: BUS.L, W: BUS.W, r: BUS.r, wheelBase: BUS.wheels };
    } else {
      const k = kinds[kind];
      const idx = k.used++;
      if (color) { k.mesh.instanceColor.setXYZ(idx, color.r, color.g, color.b); k.mesh.instanceColor.needsUpdate = true; }
      h = { kind, k, idx, L: k.t.L, W: k.t.W, r: k.t.r, H: k.t.H, wheelBase: k.t.wheels, taxiIdx: kind === 'taxi' ? taxiSigns.count++ : -1 };
      k.mesh.count = k.used;
    }
    h.wheel0 = wheelCursor; wheelCursor += 4; wheels.count = wheelCursor;
    h.blob = contact.alloc();
    h.beam = beams.alloc();
    h.spin = 0;
    vehicles.push(h);
    return h;
  }
  const wq = new THREE.Quaternion(), wr = new THREE.Quaternion(), axis = new THREE.Vector3(1, 0, 0), steerQ = new THREE.Quaternion();
  const local = new THREE.Vector3(), wscale = new THREE.Vector3(), off = new THREE.Vector3();
  function set(h, x, z, heading, speed = 0, dt = 0, steer = 0, y = 0) {
    contact.set(h.blob, x, y, z, heading, h.W + 0.7, h.L + 0.6);
    if (h.lit) { const f = h.L / 2 + 5.5; beams.set(h.beam, x + Math.sin(heading) * f, y, z + Math.cos(heading) * f, heading, h.W * 1.9, 10); }
    q.setFromAxisAngle(up, heading);
    if (h.kind === 'bus') { h.mesh.position.set(x, y, z); h.mesh.quaternion.copy(q); }
    else {
      h.k.mesh.setMatrixAt(h.idx, tmpM.compose(P.set(x, y, z), q, one));
      if (h.taxiIdx >= 0) {
        off.set(0, h.H - 0.02, -0.25).applyQuaternion(q);
        taxiSigns.setMatrixAt(h.taxiIdx, tmpM.compose(P.set(x + off.x, y + off.y, z + off.z), q, one));
      }
    }
    h.spin += (speed * dt) / h.r;
    wr.setFromAxisAngle(axis, h.spin);
    wscale.set(h.kind === 'bus' ? 0.32 : 0.23, h.r, h.r);
    let w = h.wheel0;
    for (const zc of h.wheelBase) for (const s of [-1, 1]) {
      local.set(s * (h.W / 2 - 0.13), h.r, zc).applyQuaternion(q);
      wq.copy(q);
      if (zc > 0 && steer) wq.multiply(steerQ.setFromAxisAngle(up, steer));
      wq.multiply(wr);
      wheels.setMatrixAt(w++, tmpM.compose(P.set(x + local.x, y + local.y, z + local.z), wq, wscale));
    }
  }
  function commit() {
    contact.commit(); beams.commit();
    for (const k of Object.values(kinds)) k.mesh.instanceMatrix.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;
    if (taxiSigns) taxiSigns.instanceMatrix.needsUpdate = true;
  }
  function setLights(level) {
    beams.setOpacity(level * 0.28);
    for (const k of Object.values(kinds)) k.mesh.material.emissiveIntensity = 0.15 + level * 2.2;
    for (const m of busMeshes) m.material.emissiveIntensity = 1 + level * 1.2;
    if (taxiSigns) taxiSigns.material.emissiveIntensity = 0.3 + level * 1.5;
  }
  return { add, addParked, cull, set, commit, setLights, vehicles };
}

// The player's car: same body and atlas as the fleet, as its own group so it can pitch and roll.
export function makePlayerCar(kind, color) {
  const t = TYPES[kind];
  const group = new THREE.Group();
  const body = new THREE.InstancedMesh(bodyGeometry(t), carMaterial(paintAtlas(t)), 1);
  body.setMatrixAt(0, new THREE.Matrix4());
  body.setColorAt(0, new THREE.Color(color));
  body.castShadow = body.receiveShadow = true;
  body.frustumCulled = false;
  group.add(body);
  const wheels = new THREE.InstancedMesh(wheelGeometry(), new THREE.MeshStandardMaterial({ map: rimTexture(), roughness: 0.6, metalness: 0.3 }), 4);
  wheels.castShadow = true; wheels.frustumCulled = false;
  group.add(wheels);
  let spin = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Quaternion(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3(1, 0, 0), sc = new THREE.Vector3(0.23, t.r, t.r);
  group.userData = {
    t, body,
    update(speed, dt, steer) {
      spin += (speed * dt) / t.r;
      let i = 0;
      for (const zc of t.wheels) for (const sd of [-1, 1]) {
        q.identity();
        if (zc > 0) q.multiply(s.setFromAxisAngle(up, steer));
        q.multiply(s.setFromAxisAngle(ax, spin));
        wheels.setMatrixAt(i++, m.compose(P.set(sd * (t.W / 2 - 0.13), t.r, zc), q, sc));
      }
      wheels.instanceMatrix.needsUpdate = true;
    },
    setLights(level) { body.material.emissiveIntensity = 0.15 + level * 2.2; },
  };
  group.userData.update(0, 0, 0);
  return group;
}
