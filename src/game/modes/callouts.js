// Garda Pursuit dispatch calls: a crime, a real street to start on (the suspect spawns on one of `ways`), and the
// vehicle. pickCallout() chooses one whose street is a good distance from the player, so chases cross the map.
import { world } from '../../world/geo.js';

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
  const order = CALLOUTS.filter((c) => c !== last && startEdges.get(c).length).sort(() => rand() - 0.5);
  let fallback = null, fd = -1;
  for (const c of order) {
    const edges = startEdges.get(c).filter((e) => { const d = distTo(e, player); return d > 350 && d < 1100; });
    if (edges.length) return { callout: c, edge: edges[Math.floor(rand() * edges.length)] };
    for (const e of startEdges.get(c)) { const d = distTo(e, player); if (d > fd) { fd = d; fallback = { callout: c, edge: e }; } }
  }
  return fallback;
}
