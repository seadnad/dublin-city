// Kildare Street / Merrion Street layout (docs/research/kildare-street.md): the frame the Blender hero
// (tools/blender/build_kildare.py -> public/models/kildare.glb) is built in, and its footprints for the filler, the
// footprint test and collision. u runs south along Kildare Street from node KDK1, v east away from its centreline
// (game metres). The model's node is placed at KDK1 turned by KD.rot.
import { world, v2 } from './geo.js';

const A = world.nodes.get('KDK1'), B = world.nodes.get('KDK2');
const d = v2.norm(v2.sub(B, A)), e = { x: d.z, z: -d.x };
export const KD = { x: A.x, z: A.z, rot: Math.atan2(d.x, d.z), d, e };
export const kdAt = (u, v) => ({ x: A.x + d.x * u + e.x * v, z: A.z + d.z * u + e.z * v });
// a rectangle in the frame as a site box (w across the street = v, d along it = u)
export const kdBox = (u0, u1, v0, v1, extra = {}) => ({ ...kdAt((u0 + u1) / 2, (v0 + v1) / 2), rot: KD.rot, w: v1 - v0, d: u1 - u0, ...extra });

// the buildings (must match build_kildare.py)
export const KD_BOXES = {
  library: kdBox(6, 24, 9.8, 31), libRotunda: kdBox(24, 30.8, 13.7, 27.3),
  museum: kdBox(54.8, 72.8, 9.8, 31), musRotunda: kdBox(48, 54.8, 13.7, 27.3),
  leinster: kdBox(27.9, 50.9, 43, 55), leinsterFront: kdBox(34.5, 44.3, 39.8, 43),
  seanad: kdBox(50.9, 70, 40, 60), leinsterNorth: kdBox(20, 27.9, 45, 54),
  nhm: kdBox(63, 75, 64, 101), gallery: kdBox(7, 21, 72, 118), galleryPortico: kdBox(12, 16, 118, 120.4),
  milltown: kdBox(-12, 7, 70, 112),
  govNorth: kdBox(77.2, 87.8, 76, 112.4), govSouth: kdBox(109, 119.5, 76, 112.4), govCentre: kdBox(77.5, 119.3, 64, 80.6),
  govScreen: kdBox(87.5, 109, 112, 113.2),
  shelbourne: kdBox(100, 117.5, 9.8, 42),
};
// open ground kept free of filler: the forecourt (paved), Leinster Lawn (grass) and Government Buildings' courtyard
export const KD_OPEN = {
  forecourt: kdBox(24, 54.8, 9.8, 43), lawn: kdBox(21, 63, 55, 110),
  // ...out to Merrion Square West's footpath, which slants away north-east
  lawnEast: kdBox(21, 40, 110, 119.5), lawnEast2: kdBox(40, 55, 110, 113),
  govCourt: kdBox(87.8, 109, 80.6, 112),
};
// the cenotaph on the lawn
export const KD_OBELISK = kdAt(41.3, 84.4);
// the Shelbourne's torch-bearers on their pedestals either side of the canopy (u 117.5 is the front)
export const KD_TORCHES = [16.6, 17.6, 29.4, 30.4].map((v) => ({ ...kdAt(118.45, v), y: 1.2 }));
