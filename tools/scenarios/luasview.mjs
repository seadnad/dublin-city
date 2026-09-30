// Luas camera views: VIEWS="name:T,height,dist,bearing[,wait];..." aims at T (a node id or @lat/lon) from `dist`
// metres away horizontally, looking along compass `bearing`, `height` up. Trams are left running.
// Default: the set used for docs/research/luas.md.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULT = [
  'oconnell-bridge-south:@53.34640/-6.25915,7,26,355', // the owner's view: the south end of O'Connell Bridge
  'oconnell-bridge-air:SQ8,55,70,5',
  'oconnell-st:@53.34990/-6.26020,45,70,340',
  'gpo-stop:@53.34884/-6.25975,14,34,330',
  'rosie-hackett:@53.34745/-6.25745,40,45,160',
  'hawkins-trinity:@53.34560/-6.25760,70,25,250',
  'parnell:@53.35300/-6.26060,55,70,300',
  'connolly:@53.35200/-6.24960,60,40,20',
  'the-point:PT,40,70,95',
  'heuston:HS,55,70,190',
  'harcourt:GXSHCS,35,45,160',
  'college-green:CGT,50,60,20',
  'rialto:@53.33794/-6.29722,45,70,260',
  'phibsborough:@53.36042/-6.27893,45,70,330',
  'broadstone:@53.35390/-6.27400,50,70,290',
].join(';');
export default async function (page, shot) {
  await wait(4000);
  const views = (process.env.VIEWS || DEFAULT).split(';').filter(Boolean);
  await page.evaluate(() => { const d = window.__dublin; d.rig.update = () => {}; });
  for (const v of views) {
    const [name, rest] = v.split(':');
    const [T, h, dist, bearing, ms = 2500] = rest.split(',');
    await page.evaluate(async (T, h, dist, bearing) => {
      const d = window.__dublin, { project } = await import('/src/world/geo.js');
      const p = T[0] === '@' ? project(...T.slice(1).split('/').map(Number)) : d.world.nodes.get(T);
      const br = (+bearing * Math.PI) / 180, fx = Math.sin(br), fz = -Math.cos(br);
      d.car.teleport(p.x - fx * (+dist + 25), p.z - fz * (+dist + 25), Math.atan2(fx, fz));
      d.camera.position.set(p.x - fx * +dist, +h, p.z - fz * +dist);
      d.camera.lookAt(p.x, 0, p.z);
    }, T, h, dist, bearing);
    await wait(+ms); await shot(`luas-${name}`);
  }
}
