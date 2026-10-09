// Garda Pursuit dispatch calls: a crime, a real street to start on (the suspect spawns on one of `ways`), and the
// vehicle. pickCallout() chooses one whose street is a good distance from the player, so chases cross the map.
import { world } from '../../world/geo.js';
import { seedOf, makeRand, seededStart } from './runs.js';

export const CALLOUTS = [
  { text: 'Shoplifter fled Grafton Street into a waiting car on Dawson Street, heading for the Green', ways: ['Dawson Street', 'Nassau Street'], kind: 'hatch', color: '#27618c', crime: 'Shoplifting' },
  { text: 'Stolen car spotted on the North Wall Quay, going east past the Convention Centre', ways: ['North Wall Quay'], kind: 'coupe', crime: 'Stolen car' },
  { text: 'Joyrider doing laps of Merrion Square', ways: ['Merrion Square North', 'Merrion Square East', 'Merrion Square South', 'Merrion Square West'], kind: 'coupe', crime: 'Joyriding' },
  { text: 'Robbery at a bookies on Capel Street: suspects in a white van', ways: ['Capel Street'], kind: 'van', color: '#e9e9e6', crime: 'Robbery' },
  { text: 'Car taken from outside Heuston Station, heading for the Phoenix Park', ways: ["St John's Road West", 'Parkgate Street', 'Conyngham Road'], kind: 'saloon', color: '#1a1c1e', crime: 'Stolen car' },
  { text: 'Boy racer clocked at 140 on Chesterfield Avenue, Phoenix Park', ways: ['Chesterfield Avenue'], kind: 'coupe', crime: 'Dangerous driving' },
  { text: 'Drive-off from a petrol station on the North Circular Road', ways: ['North Circular Road'], kind: 'hatch', color: '#7d1d1f', crime: 'Theft' },
  { text: 'Stolen van seen on Sheriff Street', ways: ['Sheriff Street Upper', 'Sheriff Street Lower'], kind: 'van', color: '#b7babd', crime: 'Stolen van' },
  { text: 'Smash-and-grab on Thomas Street, getaway car heading for the quays', ways: ['Thomas Street', "James's Street"], kind: 'suv', color: '#23402f', crime: 'Burglary' },
  { text: 'Car doing donuts outside the Aviva on Lansdowne Road', ways: ['Lansdowne Road', 'Bath Avenue', 'Shelbourne Road'], kind: 'coupe', crime: 'Dangerous driving' },
  { text: 'Dangerous driving along the Grand Canal at Mespil Road', ways: ['Mespil Road', 'Wilton Terrace', 'Grand Parade', 'Herbert Place'], kind: 'hatch', color: '#b89535', crime: 'Dangerous driving' },
  { text: 'Hit-and-run on Pearse Street, car last seen heading for Ringsend', ways: ['Pearse Street', 'Ringsend Road'], kind: 'saloon', color: '#8d9195', crime: 'Hit-and-run' },
  { text: 'Bag snatch on Talbot Street, getaway car on Amiens Street', ways: ['Amiens Street', 'Talbot Street'], kind: 'hatch', color: '#e9e9e6', crime: 'Bag snatch' },
  { text: 'Car failed to stop at a checkpoint on Dorset Street', ways: ['Dorset Street Upper', 'Dorset Street Lower'], kind: 'saloon', color: '#23345a', crime: 'Failed to stop' },
  { text: 'Joyriders tearing round Kilmainham, near the Gaol', ways: ['Inchicore Road', 'Old Kilmainham', 'Kilmainham Lane'], kind: 'coupe', crime: 'Joyriding' },
  { text: 'Burglary on Leeson Street, suspect vehicle heading for the canal', ways: ['Leeson Street Lower', 'Baggot Street Lower'], kind: 'suv', color: '#5f6368', crime: 'Burglary' },
  { text: 'Untaxed van refused to stop on the South Circular Road', ways: ['South Circular Road'], kind: 'van', color: '#e9e9e6', crime: 'Failed to stop' },
  { text: 'Stolen car racing along the quays at Wood Quay', ways: ['Wood Quay', 'Merchants Quay', 'Essex Quay', "Usher's Quay"], kind: 'coupe', crime: 'Stolen car' },
];

// usable start edges per callout: open to traffic, not a bridge, long enough to place a car on
const startEdges = new Map();
for (const c of CALLOUTS) {
  const names = new Set(c.ways);
  startEdges.set(c, world.edges.filter((e) => names.has(e.way.name) && e.car && !e.way.bridge && e.len > 12));
}

const distTo = (e, p) => Math.hypot((e.from.x + e.to.x) / 2 - p.x, (e.from.z + e.to.z) / 2 - p.z);

// A callout and a start edge 350-1100 m from the player (not the previous call); the furthest-fitting fallback.
export function pickCallout(player, last = null, rand = Math.random) {
  const order = CALLOUTS.filter((c) => c !== last && startEdges.get(c).length);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } // (Fisher-Yates)
  let fallback = null, fd = -1;
  for (const c of order) {
    const edges = startEdges.get(c).filter((e) => { const d = distTo(e, player); return d > 350 && d < 1100; });
    if (edges.length) return { callout: c, edge: edges[Math.floor(rand() * edges.length)] };
    for (const e of startEdges.get(c)) { const d = distTo(e, player); if (d > fd) { fd = d; fallback = { callout: c, edge: e }; } }
  }
  return fallback;
}

// The first call of a shift starts hot: a car that won't stop, 110-170 m away (ahead of the player if possible) on
// whatever street that is, so the chase is on within seconds.
const HOT = [
  { kind: 'coupe', crime: 'Failed to stop', color: '#a3121a' },
  { kind: 'hatch', crime: 'Stolen car', color: '#27618c' },
  { kind: 'saloon', crime: 'Dangerous driving', color: '#1a1c1e' },
];
export function hotCallout(player, heading, rand = Math.random) {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const near = [];
  for (const e of world.edges) {
    if (!e.car || e.way.bridge || e.len <= 12 || e.way.type === 'lane' || e.way.pedestrian) continue;
    const mx = (e.from.x + e.to.x) / 2 - player.x, mz = (e.from.z + e.to.z) / 2 - player.z, d = Math.hypot(mx, mz);
    if (d > 110 && d < 170) near.push({ e, ahead: (mx * fx + mz * fz) / d });
  }
  const ahead = near.filter((c) => c.ahead > 0.3), list = ahead.length ? ahead : near;
  if (!list.length) return null;
  const pick = list[Math.floor(rand() * list.length)], h = HOT[Math.floor(rand() * HOT.length)];
  return { hot: true, edge: pick.e, callout: { ...h, text: `${pick.e.way.name}: a car has failed to stop, just ahead of you`, ways: [pick.e.way.name] } };
}

// Daily Callouts: the same calls, on the same streets, in the same order for everyone on a given day. A seeded start
// spot, a hot first call from there, then each call placed 350-1100 m from the previous call's street (never from
// wherever the player has chased the last suspect to), all drawn from the date's seed.
export function calloutPlan(date) {
  const seed = seedOf(`pursuit:${date}`), rand = makeRand(seed);
  const start = seededStart(rand);
  let from = start, last = null, n = 0;
  return {
    seed, start,
    next() {
      const p = (n === 0 && hotCallout(from, from.heading, rand)) || pickCallout(from, last, rand);
      if (!p) return null;
      n++; last = p.hot ? null : p.callout;
      from = { x: (p.edge.from.x + p.edge.to.x) / 2, z: (p.edge.from.z + p.edge.to.z) / 2 };
      return p;
    },
  };
}
