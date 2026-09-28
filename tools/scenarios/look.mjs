// Free camera between two nodes: FROM / TO node ids (or "x,z"), EYE height, T (0..1 along from->to to stand at),
// LOOKY height of the target. SHOT names the file. Several shots: LOOKS='[[from,to,t,eye,lookY,name],...]'
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export default async function (page, shot) {
  await wait(7000);
  if (process.env.NIGHT) { await page.keyboard.press('n'); await wait(2500); }
  const looks = JSON.parse(process.env.LOOKS);
  for (const [from, to, t, eye, lookY, name] of looks) {
    await page.evaluate(async ([from, to, t, eye, lookY]) => {
      const d = window.__dublin, { sites, extraSites } = await import('/src/world/sites.js');
      // 'x,z' | '@site' | 'NODE' | any of those + ':dx:dz' offsets in metres
      const P = (k) => {
        const [base, dx = 0, dz = 0] = k.split(':');
        let q;
        if (base.startsWith('@')) q = sites[base.slice(1)] || extraSites[base.slice(1)];
        else if (base.includes(',')) { const [x, z] = base.split(',').map(Number); q = { x, z }; }
        else q = d.world.nodes.get(base);
        return { x: q.x + Number(dx), z: q.z + Number(dz) };
      };
      const A = P(from), B = P(to);
      d.rig.update = () => {};
      d.camera.position.set(A.x + (B.x - A.x) * t, eye, A.z + (B.z - A.z) * t);
      d.camera.lookAt(B.x, lookY, B.z);
    }, [from, to, t, eye, lookY]);
    await wait(900); await shot(name);
  }
}
