// The player's cars: menu labels, the name shown on switching, a one-line blurb, and paint choices where a car has
// them. Handling lives in car.js (CAR_PROFILES), models in public/models (built by tools/blender).
export const CARS = {
  garda: { label: 'Garda i40 patrol', name: 'Garda Hyundai i40 patrol car', blurb: 'The standard patrol car: planted, predictable, lights and siren.' },
  garda_rp: { label: 'Roads Policing', name: 'Garda Roads Policing i40', blurb: 'The Battenburg-liveried traffic car. Same i40 underneath.' },
  hatch: { label: 'i30 N', name: 'Hyundai i30 N', blurb: 'A warm hatch in Performance Blue.' },
  gt: {
    label: 'Liffey GT', name: 'Liffey GT hot hatch',
    blurb: 'The fun one: quickest off the line, fastest flat out, sharp steering. Lift off mid-corner and the tail comes round.',
    paints: [
      { id: 'red', label: 'Tornado red', color: '#c3141d', rough: 0.34 },
      { id: 'white', label: 'Pure white', color: '#e6e6e1', rough: 0.42 },
      { id: 'grey', label: 'Dark grey', color: '#3b3e43', metal: 0.5, rough: 0.3 },
      { id: 'blue', label: 'Deep blue', color: '#1d3f8f', metal: 0.5, rough: 0.3 },
    ],
  },
};

// the saved paint for a car (the first is the default)
export function paintFor(name, id) {
  const p = CARS[name] && CARS[name].paints;
  return p ? p.find((x) => x.id === id) || p[0] : null;
}
