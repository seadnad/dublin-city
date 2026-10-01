// Luas Citadis-inspired carriages: small shared geometries, merged per material and instanced across the fleet.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2328, roughness: 0.15, metalness: 0.6 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
export const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: 0xfff2cc, emissiveIntensity: 0.3 });
const bodyMats = new Map();
function bodyMat(color) {
  if (!bodyMats.has(color)) bodyMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 }));
  return bodyMats.get(color);
}

function box(w, h, d, x, y, z, taper = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (taper) {
    // pull the top face in (front/back) to make a sloped cabin
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * (1 - taper));
    g.computeVertexNormals();
  }
  g.translate(x, y, z);
  return g;
}

function assemble(parts) {
  const group = new THREE.Group();
  for (const [mat, geos] of parts) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

// The parts of a Luas carriage as [material, geometries] (for instancing): with `cab`, only the cab end's extra parts.
const silverMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.35, metalness: 0.6 });
const purpleMat = bodyMat(0x5b2c83), yellowMat = bodyMat(0xf3d21b);
const ready = (parts) => parts.map(([mat, geos]) => [mat, geos.map((g) => g.index ? g.toNonIndexed() : g)]);

function panel(points) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    ...points[0], ...points[1], ...points[2], ...points[0], ...points[2], ...points[3],
  ], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  g.computeVertexNormals();
  return g;
}

function shell(len, w = 2.4) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0.43);
  s.lineTo(w / 2, 0.43);
  s.lineTo(w / 2, 3.20);
  s.quadraticCurveTo(w / 2, 3.47, w / 2 - 0.25, 3.47);
  s.lineTo(-w / 2 + 0.25, 3.47);
  s.quadraticCurveTo(-w / 2, 3.47, -w / 2, 3.20);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 3 });
  g.translate(0, 0, -len / 2);
  return g;
}

function cabNose(end, w = 2.4) {
  // Profile in (forward, up): full-height windscreen raked back to a shorter roof.
  const s = new THREE.Shape();
  s.moveTo(end - 0.42, 0.43);
  s.lineTo(end + 0.43, 0.43);
  s.lineTo(end + 0.54, 0.95);
  s.lineTo(end + 0.49, 1.70);
  s.lineTo(end + 0.19, 3.23);
  s.lineTo(end - 0.04, 3.43);
  s.lineTo(end - 0.42, 3.43);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true,
    bevelThickness: 0.03, bevelSize: 0.045, bevelSegments: 1 });
  g.rotateY(-Math.PI / 2);
  g.translate(w / 2, 0, 0);
  return g;
}

export function tramCarParts({ len = 11, cab = false } = {}) {
  const W = 2.4, end = len / 2;
  if (cab) {
    return ready([
      [yellowMat, [cabNose(end, W), box(2.12, 0.12, 0.07, 0, 3.16, end + 0.20)]],
      [glassMat, [panel([[-1.08, 1.72, end + 0.60], [1.08, 1.72, end + 0.60],
        [0.99, 3.07, end + 0.33], [-0.99, 3.07, end + 0.33]]),
        box(1.25, 0.18, 0.04, 0, 3.15, end + 0.25)]],
      [silverMat, [box(2.24, 0.055, 0.08, 0, 0.48, end + 0.52)]],
      [headMat, [box(0.32, 0.12, 0.07, -0.86, 0.94, end + 0.58),
        box(0.32, 0.12, 0.07, 0.86, 0.94, end + 0.58)]],
    ]);
  }
  const glazing = [], framing = [], doors = [], yellow = [];
  for (const side of [-1, 1]) {
    const x = side * (W / 2 + 0.012);
    for (const z of [-4.18, -1.15, 1.15, 4.18]) {
      glazing.push(box(0.032, 1.12, 1.6, x, 2.25, z));
      framing.push(box(0.05, 1.22, 0.048, x + side * 0.012, 2.25, z - 0.82));
    }
    for (const z of [-2.64, 2.64]) {
      doors.push(box(0.035, 2.44, 1.10, x, 1.71, z));
      glazing.push(box(0.043, 1.37, 0.94, x + side * 0.024, 2.24, z));
      framing.push(box(0.052, 1.38, 0.035, x + side * 0.04, 2.24, z));
    }
    yellow.push(box(0.04, 0.075, len - 0.35, x, 1.29, 0));
  }
  return ready([
    [silverMat, [shell(len, W), ...framing]],
    [purpleMat, [box(W + 0.035, 0.39, len - 0.12, 0, 0.66, 0), ...doors]],
    [yellowMat, yellow],
    [glassMat, glazing],
    [trimMat, [box(W - 0.12, 2.30, 0.16, 0, 1.8, -end + 0.05),
      box(W - 0.12, 2.30, 0.16, 0, 1.8, end - 0.05),
      box(1.10, 0.16, 1.5, 0, 3.56, 0), box(0.12, 0.38, 0.12, 0, 3.82, 0)]],
    [tyreMat, [box(W - 0.28, 0.33, len - 0.5, 0, 0.27, 0)]],
  ]);
}

// One carriage for previews or standalone use. The moving fleet uses the same parts as instanced meshes.
export function makeTramCar({ cab = false, len = 11 } = {}) {
  const g = assemble([...tramCarParts({ len }), ...(cab ? tramCarParts({ len, cab: true }) : [])]);
  g.userData = { length: len, width: 2.4 };
  return g;
}
