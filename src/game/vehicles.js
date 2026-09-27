// Luas tram carriages built from boxes, merged per material. (Cars and buses live in fleet.js.)
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

// One Luas carriage: silver/grey body, yellow front, pantograph. Faces +z.
export function makeTramCar({ cab = false, len = 11 } = {}) {
  const W = 2.4;
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.35, metalness: 0.6 });
  const purple = bodyMat(0x5b2c83), yellow = bodyMat(0xf3d21b);
  const parts = [
    [silver, [box(W, 2.6, len, 0, 1.75, 0)]],
    [purple, [box(W + 0.02, 0.35, len, 0, 0.6, 0)]],
    [glassMat, [box(W + 0.03, 1.1, len - 1.2, 0, 2.15, 0)]],
    [trimMat, [box(0.2, 0.9, 0.6, 0, 3.5, 0), box(1.6, 0.05, 0.3, 0, 4.0, 0)]],
    [tyreMat, [box(W - 0.3, 0.4, len - 1, 0, 0.3, 0)]],
  ];
  if (cab) {
    parts.push([yellow, [box(W, 2.3, 0.3, 0, 1.6, len / 2 + 0.1)]]);
    parts.push([glassMat, [box(W - 0.2, 1.1, 0.1, 0, 2.3, len / 2 + 0.28)]]);
    parts.push([headMat, [box(0.3, 0.15, 0.05, -0.8, 0.9, len / 2 + 0.28), box(0.3, 0.15, 0.05, 0.8, 0.9, len / 2 + 0.28)]]);
  }
  const g = assemble(parts);
  g.userData = { length: len, width: W };
  return g;
}
