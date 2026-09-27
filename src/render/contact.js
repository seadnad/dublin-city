// Soft contact shadows: a dark, blurred rounded-rectangle under each vehicle and a round one under each person.
// They ground objects where the sun shadow can't: in the shade of buildings, beyond the shadow map's range,
// and in overcast rain / at night. One instanced mesh per system; each instance is a flat quad.
// (alphaMap reads the green channel, so the shapes are drawn white on transparent.)
import * as THREE from 'three';

function blobTexture() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  // rounded-rectangle core with a wide soft falloff (drawn as stacked blurred rects)
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(255,255,255,1)';
  g.beginPath(); g.roundRect(30, 22, S - 60, S - 44, 26); g.fill();
  g.filter = 'blur(5px)';
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.roundRect(38, 30, S - 76, S - 60, 18); g.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function createContactShadows(scene, max, { opacity = 0.55, round = false } = {}) {
  let tex;
  if (round) {
    const S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    tex = new THREE.CanvasTexture(c);
  } else tex = blobTexture();
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000, alphaMap: tex, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let dirty = false;
  return {
    mesh,
    alloc() { return mesh.count++; },
    // footprint w (across) x l (along), slightly larger than the object so the falloff shows round it
    set(i, x, y, z, heading, w, l) {
      q.setFromAxisAngle(up, heading);
      mesh.setMatrixAt(i, m.compose(p.set(x, y + 0.02, z), q, s.set(w, 1, l)));
      dirty = true;
    },
    hide(i) { mesh.setMatrixAt(i, m.makeScale(0, 0, 0)); dirty = true; },
    commit() { if (dirty) { mesh.instanceMatrix.needsUpdate = true; dirty = false; } },
    setOpacity(o) { mat.opacity = o; },
  };
}
