// Dublin Taxi: a timed shift of fares. A passenger waves at the kerb; stop beside them, they name a landmark or a pub,
// drive there and stop at the kerb. Fare = flag fall + distance, a bonus for a quick run, a tip for a smooth one and
// a knock off for every bang. Fares chain until the shift clock runs out; the best shift is kept.
import * as THREE from 'three';
import { world, v2, laneOffset } from '../../world/geo.js';
import { isOverWater } from '../../world/ground.js';
import { resolveCircle, raycast } from '../collision.js';
import { sites } from '../../world/sites.js';
import { pubSites } from '../../world/pubsites.js';
import { fmt } from './pursuit.js';

export const SHIFT = 360; // seconds
const FLAG = 4.5, PER_KM = 12; // euro
const euro = (v) => `€${v.toFixed(2)}`;

// well-known places get picked more often; what passengers say when they name them
const FAMOUS = {
  spire: ["The Spire, please. I'm meeting someone under it, like everyone else.", 'Drop me at the Spire, would you?'],
  gpo: ['The GPO, please. Posting a parcel home.', "GPO on O'Connell Street, thanks."],
  trinity: ['Trinity College, please. I want to see the Book of Kells.', "Front gate of Trinity, I've a lecture."],
  heuston: ["Heuston, I've a train to catch!", 'Heuston Station, the Cork train, if we can make it.'],
  connolly: ['Connolly Station, please, the Belfast train.', "Connolly, I've a DART to catch."],
  crokePark: ['Croke Park for the match!', "Croker, please. Up the Dubs!"],
  aviva: ["The Aviva, I've tickets for the rugby.", 'Lansdowne Road, the Aviva, please.'],
  stephensGreen: ["Stephen's Green, please. I'll feed the ducks.", "Top of Grafton Street, by the Green."],
  guinness: ['The Guinness Storehouse, please. Gravity Bar, here I come.', 'St James\'s Gate, the Storehouse.'],
  customHouse: ['Custom House Quay, please.', 'The Custom House, thanks.'],
  dublinCastle: ['Dublin Castle, please. Bit of history today.'],
  christChurch: ['Christ Church Cathedral, please.'],
  kilmainhamGaol: ['Kilmainham Gaol, please. The tour starts soon.'],
  zoo: ['Dublin Zoo, please! The kids want the elephants.'],
  aras: ["Áras an Uachtaráin. No, I'm not expected."],
  threeArena: ["The 3Arena, please, there's a gig tonight."],
  convention: ['The Convention Centre, I\'m speaking at a conference.'],
  hapenny: ["The Ha'penny Bridge, please."],
  templeBar: ['Temple Bar, please. The pub, not the area.', 'The Temple Bar for a quick one.'],
  longHall: ['The Long Hall, please.', "The Long Hall on George's Street, there's a pint with my name on it."],
  stagsHead: ["The Stag's Head, please, Dame Court."],
  odonoghues: ["O'Donoghue's on Merrion Row. There's a session on."],
  copperFaceJacks: ["Coppers, please. Don't judge me."],
  bleedingHorse: ['The Bleeding Horse, by the canal, thanks.'],
  mulligans: ["Mulligan's on Poolbeg Street. Best pint in Dublin, they say."],
  kehoes: ["Kehoe's on South Anne Street, please."],
  grogans: ["Grogan's, please. I'll have a toastie."],
  davyByrnes: ['Davy Byrnes, please. A gorgonzola sandwich, like in Ulysses.'],
  flannerys: ["Flannery's on Camden Street, please."],
  molly: ['Molly Malone, please. I promised a photo.'],
  mollyMalone: ['Molly Malone, please. I promised a photo.'],
  busaras: ['Busáras, please, the bus to the airport.'],
};
const GENERIC = ['{n}, please.', '{n}, if you would.', 'Could you take me to {n}?', '{n}, thanks very much.', "{n}. No rush. Well, a bit of a rush."];
// small talk on the way, and on the way out
const CHAT = [
  "Grand day for it, isn't it? Won't last.",
  'Go on, take the Liffey, it\'s quicker.',
  "The quays are a car park this time of day.",
  "I'd say it'll rain. It always rains.",
  'Mind the Luas there.',
  "You're a better driver than my brother-in-law.",
  'Is it yourself? I think you drove me last week.',
  "Four seasons in one day, that's Dublin.",
  'Don\'t go near College Green, it\'s mental.',
  "I'm only up from Cork, be gentle.",
  'Turn it up, I love this song.',
  'Busy night for you so?',
  'They\'re digging up that road again.',
  "Sure we'll get there when we get there.",
  'Lovely car. Very clean.',
  'First time in Dublin? Me neither. Ha.',
  'Left here. No, the other left.',
  "The seagulls are huge this year, aren't they?",
  "I'd walk, but the shoes are new.",
  'Thanks a million for stopping.',
];
// on the way out: short and plain (no jokes for now)
const BYE = ['Thanks, cheers!', 'Lovely, thanks.', "That's me, thanks."];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// a road point good for kerbside driving: on a road, not over water, not a lane or a bridge
function drivable(p) {
  const r = world.nearestRoad(p.x, p.z);
  return r && r.edgeDist < 0 && r.way.type !== 'bridge' && !isOverWater(p.x, p.z);
}

// every place a fare can ask for: a named landmark or a pub, at its view spot (a lane spot beside it)
let DESTS = null;
function destinations() {
  if (DESTS) return DESTS;
  const all = new Map();
  for (const [key, s] of Object.entries(sites)) if (s.view && s.name) all.set(key, { key, name: s.name, view: s.view, pub: false });
  for (const [key, p] of Object.entries(pubSites)) if (p.view) all.set(key, { key, name: p.name, view: p.view, pub: true });
  DESTS = [];
  for (const d of all.values()) {
    let v = d.view;
    if (!drivable(v)) {
      // snap to the nearest point on a proper road
      const r = world.nearestRoad(v.x, v.z, (w) => w.type !== 'bridge' && w.type !== 'lane');
      if (!r) continue;
      v = { x: r.cx, z: r.cz, heading: v.heading };
      if (!drivable(v)) continue;
    }
    DESTS.push({ ...d, x: v.x, z: v.z, heading: v.heading ?? 0, weight: FAMOUS[d.key] ? 3 : 1 });
  }
  return DESTS;
}

// a waving passenger: coat, legs, head, one arm up (procedural, a handful of draw calls; one is reused all shift)
function passengerMesh() {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x2a5d8f, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b394, roughness: 0.7 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 0.2).translate(0, 0.4, 0), dark);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.72, 10).translate(0, 1.16, 0), coat);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10).translate(0, 1.66, 0), skin);
  const armDown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 6).translate(0, -0.31, 0), coat);
  armDown.position.set(-0.26, 1.48, 0); armDown.rotation.z = -0.08;
  const arm = new THREE.Group();
  arm.position.set(0.26, 1.48, 0);
  arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 6).translate(0, 0.31, 0), coat));
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0.66, 0), skin);
  arm.add(hand);
  for (const m of [legs, body, head, armDown]) { m.castShadow = true; g.add(m); }
  g.add(arm);
  g.userData = { arm, coat };
  return g;
}
// a tall light column (seen over the rooftops) and a ring on the road
function beaconMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf6c615, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 10, 1, true).translate(0, 30, 0), mat);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf6c615, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.8, 32).rotateX(-Math.PI / 2).translate(0, 0.08, 0), ringMat);
  g.add(col, ring);
  g.userData = { mats: [mat, ringMat], ring };
  return g;
}

export function createTaxi({ scene, player, ui, audio, save, setWaypoint = () => {}, isNight = () => false, ensureCar = () => {} }) {
  const ped = passengerMesh(), beacon = beaconMesh();
  ped.visible = beacon.visible = false;
  scene.add(ped, beacon);

  let active = false, phase = 'idle', clock = 0, t = 0, earnings = 0, fares = 0, tips = 0;
  let fare = null; // { pick: {x,z}, dest, dist, t, crashes }
  let stillT = 0, lastImpact = 0, crashCool = 0, lastDest = null, best = null, lastStats = null;
  const say = (text, ms = 4200) => ui.say(text, ms);

  // a kerbside spot on a footpath 90-380 m from the car (wider if the car is out on the edge of the map)
  // (first: the shift's first fare stands 20-60 m ahead, so the first pickup comes within seconds)
  function hailSpot(first = false) {
    const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
    const cand = world.edges.filter((e) => e.car && e.len > 24 && !['lane', 'bridge'].includes(e.way.type) && !e.way.pedestrian);
    for (const [lo, hi, fwd] of [...(first ? [[20, 60, 0.5], [10, 60, 0], [60, 120, 0]] : []), [90, 380], [60, 800], [0, 1e9]]) {
      const near = cand.filter((e) => { const mx = (e.from.x + e.to.x) / 2 - player.pos.x, mz = (e.from.z + e.to.z) / 2 - player.pos.z, d = Math.hypot(mx, mz); return d > lo && d < hi && (!fwd || (mx * fx + mz * fz) > fwd * d); });
      for (let i = 0; i < 40 && near.length; i++) {
        const e = pick(near), s = 0.3 + Math.random() * 0.4;
        const dir = v2.norm(v2.sub(e.to, e.from)), left = { x: dir.z, z: -dir.x }, c = v2.lerp(e.from, e.to, s);
        const out = e.way.width / 2 + Math.min(e.way.pave, 4) * 0.45;
        const p = { x: c.x + left.x * out, z: c.z + left.z * out };
        const lane = laneOffset(e.way), stop = { x: c.x + left.x * lane, z: c.z + left.z * lane };
        // on the footpath (off every carriageway), clear of walls, dry; the stopping spot on a road
        const r = world.nearestRoad(p.x, p.z);
        if (!r || r.edgeDist < 0.3 || r.edgeDist > 4.5) continue;
        if (resolveCircle({ x: p.x, z: p.z }, 0.45) || raycast(stop.x, stop.z, p.x, p.z) < 1 || isOverWater(p.x, p.z) || !drivable(stop)) continue;
        if (world.luasNear && (world.luasNear(p.x, p.z, 4) || world.luasNear(stop.x, stop.z, 3))) continue; // not on the tram's path
        return { x: p.x, z: p.z, face: Math.atan2(-left.x, -left.z), stop };
      }
    }
    return null;
  }

  function pickDest(from) {
    const night = isNight();
    const all = destinations().filter((d) => d.key !== lastDest);
    for (const [lo, hi] of [[280, 1500], [150, 2600], [60, 1e9]]) {
      const ok = all.filter((d) => { const k = Math.hypot(d.x - from.x, d.z - from.z); return k > lo && k < hi; });
      if (!ok.length) continue;
      const w = ok.map((d) => d.weight * (d.pub ? (night ? 4 : 0.6) : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return ok[i]; }
      return ok[ok.length - 1];
    }
    return all[0];
  }

  function newHail(first = false) {
    const h = hailSpot(first);
    if (!h) { phase = 'cruise'; return; }
    fare = { pick: h, dest: null, dist: 0, t: 0, crashes: 0 };
    phase = 'hail';
    ped.position.set(h.x, 0.15, h.z); ped.rotation.y = h.face; ped.visible = true;
    ped.userData.coat.color.setHSL(Math.random(), 0.45, 0.32);
    beacon.position.set(h.x, 0, h.z); beacon.visible = true; setBeacon(0xf6c615);
    setWaypoint({ x: h.x, z: h.z, name: 'Fare waving', sticky: true });
    stillT = 0;
  }
  function setBeacon(col) { for (const m of beacon.userData.mats) m.color.set(col); }

  function pickUp() {
    const dest = pickDest(fare.pick);
    fare.dest = dest; lastDest = dest.key;
    fare.dist = Math.hypot(dest.x - fare.pick.x, dest.z - fare.pick.z);
    fare.par = 10 + (fare.dist * 1.4) / 12; // ~12 m/s along roads that wander 1.4x the straight line
    fare.t = 0; fare.crashes = 0;
    ped.visible = false;
    beacon.position.set(dest.x, 0, dest.z); setBeacon(0x3aa0ff);
    setWaypoint({ x: dest.x, z: dest.z, name: dest.name, sticky: true });
    const line = FAMOUS[dest.key] ? pick(FAMOUS[dest.key]) : pick(GENERIC).replace('{n}', dest.name);
    say(line, 4500);
    // and a bit of chat once under way
    fare.chatAt = 9 + Math.random() * 8;
    audio.cue('checkpoint');
    phase = 'ride'; stillT = 0;
  }

  function dropOff() {
    const f = fare;
    const meter = FLAG + (f.dist / 1000) * PER_KM;
    const quick = f.t < f.par;
    const bonus = quick ? Math.min(6, (f.par - f.t) * 0.12) : 0;
    const penalty = f.crashes * 1.5;
    const tip = f.crashes === 0 ? meter * (quick ? 0.2 : 0.12) : f.crashes === 1 ? meter * 0.04 : 0;
    const total = Math.max(FLAG, meter + bonus - penalty) + tip;
    earnings += total; tips += tip; fares++;
    say(pick(BYE), 3000);
    const bits = [`Meter ${euro(meter)}`];
    if (bonus > 0.05) bits.push(`quick +${euro(bonus)}`);
    if (penalty) bits.push(`knocks −${euro(penalty)}`);
    if (tip > 0.05) bits.push(`tip +${euro(tip)}`);
    ui.toast(`${f.dest.name}: ${euro(total)}  (${bits.join(' · ')})`, 4200);
    audio.cue('finish');
    lastStats = { dest: f.dest.name, total };
    fare = null; beacon.visible = false; setWaypoint(null);
    if (clock <= 0) return endShift();
    phase = 'cruise'; t = 0; // next hail shortly
  }

  function endShift() {
    const prev = best;
    const rec = { earnings: +earnings.toFixed(2), fares, tips: +tips.toFixed(2), night: isNight() };
    const record = !prev || earnings > prev.earnings;
    if (record && fares > 0) save.set('taxi.best', rec);
    audio.cue(fares ? 'finish' : 'fail');
    api.stop();
    ui.showResults({
      title: `Shift over: ${euro(earnings)}`,
      medal: earnings >= 110 ? 'gold' : earnings >= 70 ? 'silver' : earnings >= 35 ? 'bronze' : null,
      lines: [
        `${fares} fare${fares === 1 ? '' : 's'} · tips ${euro(tips)}${fares ? ` · avg ${euro(earnings / fares)}` : ''}`,
        record && fares ? (prev ? `Best shift! Up ${euro(earnings - prev.earnings)} on your old record` : 'First shift on the books!') : prev ? `Best shift: ${euro(prev.earnings)} (${prev.fares} fares)` : 'No fares this time: stop right beside the waving passenger.',
      ],
      retry: () => api.start(),
    });
  }

  const api = {
    get active() { return active; },
    get phase() { return phase; },
    get state() { return { phase, clock, earnings, fares, tips, fare: fare && { dest: fare.dest && { name: fare.dest.name, key: fare.dest.key, x: fare.dest.x, z: fare.dest.z, heading: fare.dest.heading }, pick: fare.pick, t: fare.t, crashes: fare.crashes }, last: lastStats }; },
    setClock(v) { clock = v; }, // (for the test harness)
    get target() {
      if (!fare) return null;
      return phase === 'hail' ? { x: fare.pick.stop.x, z: fare.pick.stop.z, ped: fare.pick } : phase === 'ride' ? { x: fare.dest.x, z: fare.dest.z } : null;
    },
    start() {
      ensureCar();
      best = save.get('taxi.best', null);
      active = true; clock = SHIFT; earnings = 0; fares = 0; tips = 0; fare = null; lastDest = null; lastStats = null;
      lastImpact = player.impact || 0; crashCool = 0;
      ui.showMission('taxi');
      say(isNight() ? "Night shift. The pubs are busy: someone's always looking for a lift." : 'Shift on. Six minutes: find a fare, stop beside them, and take them where they want to go.', 5000);
      newHail(true);
      api.update(0);
    },
    stop() {
      active = false; phase = 'idle'; fare = null;
      ped.visible = beacon.visible = false;
      setWaypoint(null);
      ui.hideMission(); ui.say(null);
    },
    update(dt) {
      if (!active) return;
      clock = Math.max(0, clock - dt); t += dt;
      const speed = Math.abs(player.speed);
      // a bang: the collision strength jumps (car.js keeps the last impact and lets it decay)
      crashCool -= dt;
      const imp = player.impact || 0;
      if (phase === 'ride' && imp - lastImpact > 2.5 && imp > 3 && crashCool <= 0) {
        fare.crashes++; crashCool = 1;
        say(pick(['Ah here! Mind the car!', 'Easy! I bruise like a peach.', "Whoa, steady on!", 'That was a bang. That\'ll be off your tip.']), 2500);
      }
      lastImpact = imp;
      if (phase === 'cruise') {
        if (clock <= 0) return endShift();
        if (t > 2.5) newHail();
      } else if (phase === 'hail') {
        if (clock <= 0) return endShift();
        // wave
        ped.userData.arm.rotation.z = 0.35 + Math.sin(performance.now() / 160) * 0.35;
        const d = Math.hypot(player.pos.x - fare.pick.x, player.pos.z - fare.pick.z);
        if (d < 10 && speed < 1.5) { stillT += dt; if (stillT > 0.5) pickUp(); } else stillT = 0;
        if (d < 30 && speed >= 1.5 && stillT === 0 && !fare.told) { fare.told = true; ui.toast('Stop beside the passenger', 1800); }
      } else if (phase === 'ride') {
        fare.t += dt;
        if (fare.chatAt && fare.t > fare.chatAt) { fare.chatAt = 0; say(pick(CHAT), 4000); }
        const d = Math.hypot(player.pos.x - fare.dest.x, player.pos.z - fare.dest.z);
        if (d < 14 && speed < 1.5) { stillT += dt; if (stillT > 0.5) dropOff(); } else stillT = 0;
      }
      if (!active) return;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
      beacon.userData.ring.scale.setScalar(0.9 + pulse * 0.2);
      // the panel: meter, shift clock, where to, and an arrow toward the target
      const tg = api.target;
      let arrow = null, sub;
      if (tg) {
        const dx = tg.x - player.pos.x, dz = tg.z - player.pos.z, d = Math.hypot(dx, dz);
        arrow = Math.atan2(dx, dz) - player.heading;
        const far = d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`;
        if (phase === 'hail') sub = d < 14 ? 'Stop to pick up' : `Fare waving · ${far}`;
        else {
          const meter = FLAG + (fare.dist / 1000) * PER_KM;
          sub = `${d < 16 ? 'Stop at the kerb' : `To ${fare.dest.name} · ${far}`}\nMeter ${euro(meter)}${fare.t < fare.par ? ` · quick bonus ${Math.ceil(fare.par - fare.t)} s` : ''}${fare.crashes ? ` · ${fare.crashes} knock${fare.crashes > 1 ? 's' : ''}` : ''}`;
        }
      } else sub = clock > 0 ? 'Looking for a fare…' : 'Shift over';
      ui.updateMission({
        title: `DUBLIN TAXI · ${fares} fare${fares === 1 ? '' : 's'}`,
        score: { value: earnings, kind: 'euro', label: 'earned' },
        big: clock > 0 ? fmt(clock).replace(/\.\d+$/, '') : 'LAST FARE',
        warn: clock > 0 && clock < 30,
        sub, arrow,
      });
    },
    blips() {
      if (!active || !fare) return [];
      if (phase === 'hail') return [{ x: fare.pick.x, z: fare.pick.z, color: '#f6c615', pulse: true }];
      if (phase === 'ride') return [{ x: fare.dest.x, z: fare.dest.z, color: '#3aa0ff', pulse: true }];
      return [];
    },
    best: () => save.get('taxi.best', null),
    meshes: [ped, beacon],
    destinations,
  };
  return api;
}
