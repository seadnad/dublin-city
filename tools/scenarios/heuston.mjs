// Heuston Station review shots (docs/research/heuston-v2.md): the driver at the Frank Sherwin / Victoria Quay
// junction, the front from the Luas platform, the north-east corner, across the river from Wolfe Tone Quay, and a
// close look at the order. NIGHT=1 for the night set. ONLY=name,name to limit. Camera spots are given in the head
// building's own frame (u east out of the front, v north along it, game metres) or as street nodes.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// [name, from, to, eye, lookY]; from/to: 'u,v' in the station frame or a node id (optionally 'NODE:dx:dz')
const SHOTS = [
  ['junction', 'VQ2:0:4', '4,1', 1.2, 7],
  ['platform', '17,0', '0,0', 1.6, 7.5],
  ['ne-corner', '26,30', '-4,4', 1.6, 7],
  ['river', '37,62', '0,3', 1.8, 6],
  ['bridge', '47,33', '0,2', 1.3, 7],
  ['hbridge', '42,36', '18,46', 2.6, -0.5],
  ['close', '9,-2', '0,-3', 1.6, 9.5],
  ['sjrw', 'SJ1:-4:4', '-10,-10', 1.3, 6],
  ['plan', '12,-1', '11.9,-0.9', 75, 0],
  ['roofline', '5,6', '0,10', 14, 13],
  ['bellcote', '4,20', '-5,12.4', 9, 10],
];
export default async function (page, shot) {
  await wait(7000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(3000); }
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const tag = process.env.NIGHT ? 'night' : 'day';
  for (const [name, from, to, eye, lookY] of SHOTS) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(async ([from, to, eye, lookY]) => {
      const d = window.__dublin, { sites } = await import('/src/world/sites.js');
      const st = sites.heuston.parts.station, c = Math.cos(st.rot), s = Math.sin(st.rot);
      const P = (k) => {
        if (/^-?[\d.]+,-?[\d.]+$/.test(k)) { const [u, v] = k.split(',').map(Number); return { x: st.x + u * c - v * s, z: st.z - u * s - v * c }; }
        const [base, dx = 0, dz = 0] = k.split(':'); const q = d.world.nodes.get(base);
        return { x: q.x + Number(dx), z: q.z + Number(dz) };
      };
      const A = P(from), B = P(to);
      d.rig.update = () => {};
      d.camera.position.set(A.x, eye, A.z);
      d.camera.lookAt(B.x, lookY, B.z);
    }, [from, to, eye, lookY]);
    await wait(1200); await shot(`heuston-${tag}-${name}`);
  }
}
