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
import { dateKey, seedOf, makeRand, seededStart, howClose, medalFor, shareText, emojiRow, runSummary, markDaily, streakText } from './runs.js';

export const SHIFT = 360; // seconds (the fixed "ranked" shift)
const FLAG = 4.5, PER_KM = 12; // euro
const euro = (v) => `€${v.toFixed(2)}`;
// Casual taxi: Crazy Taxi rules. The clock starts short and every drop-off buys more time, in proportion to the
// fare's par time (so a long fare buys more), within [min, max] seconds.
export const TAXI_TUNE = { casualStart: 120, perPar: 0.6, addMin: 8, addMax: 45 };
// The shifts. casual: extend-on-success clock; shift6 / shift15: fixed length (ranked); daily: a fixed six minutes
// with the same fares in the same order for everyone that day. best: the localStorage key (dublin.<key>), kept from
// before the variants existed for the six-minute shift ('taxi.best'). medals: bronze / silver / gold in euro.
export const VARIANTS = {
  casual: { name: 'Taxi', clock: TAXI_TUNE.casualStart, extend: true, best: 'taxi.casual.best', medals: [40, 90, 160] },
  shift6: { name: '6-minute shift', clock: SHIFT, best: 'taxi.best', medals: [35, 70, 110] },
  shift15: { name: '15-minute shift', clock: 900, best: 'taxi.best15', medals: [90, 180, 270] },
  daily: { name: 'Daily Shift', clock: SHIFT, seeded: true, best: 'taxi.daily', medals: [35, 70, 110] },
};
const medalList = (v) => [['bronze', v.medals[0]], ['silver', v.medals[1]], ['gold', v.medals[2]]];

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
const pick = (a, rand = Math.random) => a[Math.floor(rand() * a.length)];

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

// A kerbside spot on a footpath 90-380 m from `from` (wider if that's out on the edge of the map). first: the shift's
// first fare stands 20-60 m ahead, so the first pickup comes within seconds. rand: Math.random, or a daily's seeded RNG.
function hailSpot(from, heading, first = false, rand = Math.random) {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const cand = world.edges.filter((e) => e.car && e.len > 24 && !['lane', 'bridge'].includes(e.way.type) && !e.way.pedestrian);
  for (const [lo, hi, fwd] of [...(first ? [[20, 60, 0.5], [10, 60, 0], [60, 120, 0]] : []), [90, 380], [60, 800], [0, 1e9]]) {
    const near = cand.filter((e) => { const mx = (e.from.x + e.to.x) / 2 - from.x, mz = (e.from.z + e.to.z) / 2 - from.z, d = Math.hypot(mx, mz); return d > lo && d < hi && (!fwd || (mx * fx + mz * fz) > fwd * d); });
    for (let i = 0; i < 40 && near.length; i++) {
      const e = pick(near, rand), s = 0.3 + rand() * 0.4;
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

// where a fare wants to go: 280-1500 m from the pickup, famous places more often, pubs mostly at night; never the
// last fare's destination
function pickDest(from, night, lastKey, rand = Math.random) {
  const all = destinations().filter((d) => d.key !== lastKey);
  for (const [lo, hi] of [[280, 1500], [150, 2600], [60, 1e9]]) {
    const ok = all.filter((d) => { const k = Math.hypot(d.x - from.x, d.z - from.z); return k > lo && k < hi; });
    if (!ok.length) continue;
    const w = ok.map((d) => d.weight * (d.pub ? (night ? 4 : 0.6) : 1));
    let r = rand() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ok.length; i++) { r -= w[i]; if (r <= 0) return ok[i]; }
    return ok[ok.length - 1];
  }
  return all[0];
}

// The Daily Shift's fares: a start spot, then each fare's pickup and destination, all from the date's seed. Each hail
// is placed from the previous drop-off (where the taxi stops), never from wherever the player happens to be, so the
// sequence is the same for everyone that day however they drive. Daytime weighting, whatever the lighting.
export function farePlan(date) {
  const seed = seedOf(`taxi:${date}`), rand = makeRand(seed);
  const start = seededStart(rand);
  let from = start, last = null, n = 0;
  return {
    seed, start,
    next() {
      const pk = hailSpot(from, from.heading, n === 0, rand);
      if (!pk) return null;
      const dest = pickDest(pk, false, last, rand);
      last = dest.key; n++;
      from = { x: dest.x, z: dest.z, heading: dest.heading };
      return { pick: pk, dest };
    },
  };
}

export function createTaxi({ scene, player, ui, audio, save, setWaypoint = () => {}, isNight = () => false, ensureCar = () => {}, snap = () => {} }) {
  const ped = passengerMesh(), beacon = beaconMesh();
  ped.visible = beacon.visible = false;
  scene.add(ped, beacon);

  let active = false, phase = 'idle', clock = 0, t = 0, earnings = 0, fares = 0, tips = 0, elapsed = 0;
  let fare = null; // { pick: {x,z}, dest, dist, t, crashes }
  let stillT = 0, lastImpact = 0, crashCool = 0, lastDest = null, best = null, lastStats = null;
  let variant = 'casual', V = VARIANTS.casual, date = null, plan = null, opts0 = {};
  let log = [], knocks = 0, quicks = 0, timeAdded = 0;
  const say = (text, ms = 4200) => ui.say(text, ms);

  function newHail(first = false) {
    let h, dest = null;
    if (plan) { const f = plan.next(); h = f && f.pick; dest = f && f.dest; } else h = hailSpot(player.pos, player.heading, first);
    if (!h) { phase = 'cruise'; return; }
    fare = { pick: h, dest: null, planned: dest, dist: 0, t: 0, crashes: 0 };
    phase = 'hail';
    ped.position.set(h.x, 0.15, h.z); ped.rotation.y = h.face; ped.visible = true;
    ped.userData.coat.color.setHSL(Math.random(), 0.45, 0.32);
    beacon.position.set(h.x, 0, h.z); beacon.visible = true; setBeacon(0xf6c615);
    setWaypoint({ x: h.x, z: h.z, name: 'Fare waving', sticky: true });
    stillT = 0;
  }
  function setBeacon(col) { for (const m of beacon.userData.mats) m.color.set(col); }

  function pickUp() {
    const dest = fare.planned || pickDest(fare.pick, isNight(), lastDest);
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
    if (quick) quicks++;
    log.push([Math.round(elapsed), f.dest.key, Math.round(total * 100) / 100, f.crashes, quick ? 1 : 0]);
    say(pick(BYE), 3000);
    const bits = [`Meter ${euro(meter)}`];
    if (bonus > 0.05) bits.push(`quick +${euro(bonus)}`);
    if (penalty) bits.push(`knocks −${euro(penalty)}`);
    if (tip > 0.05) bits.push(`tip +${euro(tip)}`);
    // casual: the fare buys time on the clock
    let add = 0;
    if (V.extend) {
      add = Math.round(Math.max(TAXI_TUNE.addMin, Math.min(TAXI_TUNE.addMax, f.par * TAXI_TUNE.perPar)));
      clock += add; timeAdded += add;
      ui.flash(`+${add} s`);
    }
    ui.toast(`${f.dest.name}: ${euro(total)}${add ? ` · +${add} s` : ''}  (${bits.join(' · ')})`, 4200);
    audio.cue('finish');
    lastStats = { dest: f.dest.name, total, add };
    fare = null; beacon.visible = false; setWaypoint(null);
    if (clock <= 0) return endShift();
    phase = 'cruise'; t = 0; // next hail shortly
  }

  // the run summary (shape in runs.js); log rows: [elapsed s, destination key, € paid, knocks, quick 0/1]
  function summary(medal) {
    return runSummary({
      mode: 'taxi', variant, date, seed: plan ? plan.seed : null, duration: elapsed, score: earnings, scoreKind: 'euro', medal,
      stats: { fares, tips: Math.round(tips * 100) / 100, avgFare: fares ? Math.round((earnings / fares) * 100) / 100 : 0, timeAdded, night: !plan && isNight() },
      events: { pickups: fares + (fare && fare.dest ? 1 : 0), dropoffs: fares, knocks, quick: quicks },
      log: log.slice(),
    });
  }

  function endShift() {
    // bests: one per variant; the daily's is per date ({ date, best, first, runs }: the first run of the day is the
    // one a ranked board would take)
    const prev = best;
    const rec = { earnings: +earnings.toFixed(2), fares, tips: +tips.toFixed(2), night: isNight() };
    const record = !prev || earnings > prev.earnings;
    if (variant === 'daily') {
      const d = save.get(V.best, null), today = d && d.date === date ? d : { date, best: null, first: null, runs: 0 };
      today.runs++;
      if (!today.first) today.first = rec;
      if (record && fares > 0) today.best = rec;
      save.set(V.best, today);
    } else if (record && fares > 0) save.set(V.best, rec);
    const M = medalList(V), medal = medalFor(earnings, M);
    audio.cue(fares ? 'finish' : 'fail');
    const st = variant === 'daily' ? markDaily(save, date) : null;
    const close = howClose({ value: +earnings.toFixed(2), best: prev ? prev.earnings : null, medals: M, gap: euro, show: euro });
    const row = log.map((l) => (l[3] ? '🟥' : l[4] ? '🟩' : '🟨'));
    const sum = summary(medal);
    api.stop();
    ui.showResults({
      title: `${V.name}: ${euro(earnings)}`,
      medal,
      daily: variant === 'daily' ? ['Daily Shift', streakText(st)].filter(Boolean).join(' · ') : null,
      lines: [
        `${fares} fare${fares === 1 ? '' : 's'} · tips ${euro(tips)}${fares ? ` · avg ${euro(earnings / fares)}` : ''}${V.extend ? ` · ${fmt(elapsed).replace(/\.\d+$/, '')} on the road` : ''}`,
        ...(fares ? [] : ['No fares this time: stop right beside the waving passenger.']),
      ],
      close: close.lines, target: close.target,
      share: shareText({ icon: '🚕', title: V.name, date: variant === 'daily' ? date : null, score: euro(earnings), extra: `${fares} fare${fares === 1 ? '' : 's'}`, medal, row: emojiRow(row) }),
      summary: sum,
      retry: () => api.start(opts0),
    });
  }

  const api = {
    get active() { return active; },
    get phase() { return phase; },
    get variant() { return variant; },
    get state() { return { phase, variant, date, clock, elapsed, earnings, fares, tips, fare: fare && { dest: fare.dest && { name: fare.dest.name, key: fare.dest.key, x: fare.dest.x, z: fare.dest.z, heading: fare.dest.heading }, pick: fare.pick, t: fare.t, crashes: fare.crashes }, last: lastStats, log: log.slice() }; },
    setClock(v) { clock = v; }, // (for the test harness)
    get target() {
      if (!fare) return null;
      return phase === 'hail' ? { x: fare.pick.stop.x, z: fare.pick.stop.z, ped: fare.pick } : phase === 'ride' ? { x: fare.dest.x, z: fare.dest.z } : null;
    },
    // opts.variant: 'casual' (default) | 'shift6' | 'shift15' | 'daily'; opts.date: the daily's date key (default today)
    start(opts = {}) {
      ensureCar();
      opts0 = opts;
      variant = VARIANTS[opts.variant] ? opts.variant : 'casual'; V = VARIANTS[variant];
      date = V.seeded ? dateKey(opts.date || new Date()) : null;
      plan = V.seeded ? farePlan(date) : null;
      if (variant === 'daily') { const d = save.get(V.best, null); best = d && d.date === date ? d.best : null; } else best = save.get(V.best, null);
      active = true; clock = V.clock; earnings = 0; fares = 0; tips = 0; fare = null; lastDest = null; lastStats = null; elapsed = 0;
      log = []; knocks = 0; quicks = 0; timeAdded = 0;
      if (plan) { player.teleport(plan.start.x, plan.start.z, plan.start.heading); snap(); }
      lastImpact = player.impact || 0; crashCool = 0;
      ui.showMission('taxi');
      say(variant === 'daily' ? "Today's Daily Shift: the same fares for everyone. Six minutes, go!"
        : V.extend ? 'Two minutes on the clock. Every fare you drop off buys more time!'
        : isNight() ? "Night shift. The pubs are busy: someone's always looking for a lift."
        : `Shift on. ${variant === 'shift15' ? 'Fifteen' : 'Six'} minutes: find a fare, stop beside them, and take them where they want to go.`, 5000);
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
      clock = Math.max(0, clock - dt); t += dt; elapsed += dt;
      const speed = Math.abs(player.speed);
      // a bang: the collision strength jumps (car.js keeps the last impact and lets it decay)
      crashCool -= dt;
      const imp = player.impact || 0;
      if (phase === 'ride' && imp - lastImpact > 2.5 && imp > 3 && crashCool <= 0) {
        fare.crashes++; knocks++; crashCool = 1;
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
      if (V.extend && phase !== 'ride') sub += '\nEach fare adds time';
      ui.updateMission({
        title: `${variant === 'daily' ? 'DAILY SHIFT' : variant === 'casual' ? 'DUBLIN TAXI' : variant === 'shift15' ? 'TAXI · 15 MIN' : 'TAXI · 6 MIN'} · ${fares} fare${fares === 1 ? '' : 's'}`,
        score: { value: earnings, kind: 'euro', label: 'earned' },
        big: clock > 0 ? fmt(clock).replace(/\.\d+$/, '') : 'LAST FARE',
        warn: clock > 0 && clock < (V.extend ? 15 : 30),
        sub, arrow,
      });
    },
    blips() {
      if (!active || !fare) return [];
      if (phase === 'hail') return [{ x: fare.pick.x, z: fare.pick.z, color: '#f6c615', pulse: true }];
      if (phase === 'ride') return [{ x: fare.dest.x, z: fare.dest.z, color: '#3aa0ff', pulse: true }];
      return [];
    },
    // the saved best for a variant (the daily's: today's best run, or null)
    best: (v = 'casual') => {
      const b = save.get(VARIANTS[v] ? VARIANTS[v].best : 'taxi.best', null);
      if (v === 'daily') return b && b.date === dateKey() ? b.best : null;
      return b;
    },
    // the first n fares of a date's Daily Shift: [{ pick: {x, z}, dest: key }] (for the tests, and any future preview)
    previewDaily(d = dateKey(), n = 5) {
      const p = farePlan(dateKey(d)), out = [];
      for (let i = 0; i < n; i++) { const f = p.next(); if (!f) break; out.push({ pick: { x: +f.pick.x.toFixed(2), z: +f.pick.z.toFixed(2) }, dest: f.dest.key }); }
      return { start: { x: +p.start.x.toFixed(2), z: +p.start.z.toFixed(2) }, fares: out };
    },
    meshes: [ped, beacon],
    destinations,
  };
  return api;
}
