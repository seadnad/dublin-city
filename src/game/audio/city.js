// City soundscape: looping beds (traffic, people, rain) plus positional one-shots driven by what the city is doing:
// car horns, bus air brakes, the Luas gong and pedestrian-crossing ticks. Events are read from observable state
// (vehicle speeds and positions, signal phases), so traffic.js / luas.js need no audio hooks.
import { FILES } from './assets.js';
import { gain, filter, panner, loopSource, ramp, clamp01 } from './nodes.js';

const VOICES = 6;        // simultaneous one-shots; the oldest is reused when all are busy
const REF = 12;          // metres at which a one-shot plays at its nominal level
const SCAN = 0.25;       // seconds between event scans (cheap, and events don't need frame accuracy)
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createCity(ctx, out, echoSend) {
  // ---- beds: each played twice, half a loop apart and panned apart, for stereo width from mono files ----
  const bedBus = gain(ctx, 1, out);
  const nightTone = filter(ctx, 'lowpass', 16000, 0.5, bedBus); // after dark the distant city sounds duller
  const beds = {
    city_traffic: gain(ctx, 0, nightTone),
    city_people: gain(ctx, 0, nightTone),
    rain: gain(ctx, 0, bedBus),
  };
  const levels = {};
  const buffers = {};

  // ---- one-shot voices: persistent gain -> lowpass (air absorption) -> pan -> out, plus an echo send ----
  const voices = Array.from({ length: VOICES }, () => {
    const pan = panner(ctx, out);
    const lp = filter(ctx, 'lowpass', 18000, 0.5, pan);
    const g = gain(ctx, 0, lp);
    const send = gain(ctx, 0, echoSend); g.connect(send);
    return { g, lp, pan, send, src: null, until: 0 };
  });
  const L = { x: 0, z: 0, h: 0 }; // listener: the player car (the camera sits behind it)

  function play(file, part, x, z, { vol = 0.5, rate = 1, echo = 0.25, delay = 0 } = {}) {
    const buf = buffers[file];
    if (!buf) return false;
    const [off, dur] = FILES[file].sprite[part];
    const t = ctx.currentTime + delay;
    let v = voices.find((q) => q.until <= ctx.currentTime);
    if (!v) { v = voices.reduce((a, b) => (a.until < b.until ? a : b)); if (v.src) try { v.src.stop(); } catch { /* already stopped */ } }
    const dx = x - L.x, dz = z - L.z, d = Math.hypot(dx, dz);
    // screen-right of a camera looking along heading h is (-cos h, sin h) in world x/z
    const side = d > 0.5 ? (-dx * Math.cos(L.h) + dz * Math.sin(L.h)) / d : 0;
    const att = Math.min(1, REF / Math.max(d, 1));
    v.g.gain.setValueAtTime(vol * att, t);
    v.send.gain.setValueAtTime(echo, t);
    v.lp.frequency.setValueAtTime(18000 / (1 + d / 35), t);
    if (v.pan.pan) v.pan.pan.setValueAtTime(side * 0.8, t);
    const s = ctx.createBufferSource();
    s.buffer = buf; s.playbackRate.value = rate; s.connect(v.g);
    // start a touch early and run a touch long: sprite parts sit in silence, so decoder offset can't clip them
    s.start(t, Math.max(0, off - 0.02), dur + 0.05);
    v.src = s; v.until = t + (dur + 0.05) / rate;
    stats[file] = (stats[file] || 0) + 1;
    return true;
  }
  const stats = {};

  // ---- event state ----
  let scan = 0, hornCd = rnd(4, 10), gongCd = 0, crossCd = rnd(5, 15);
  const per = new WeakMap(); // per-vehicle memory: last speed, cooldowns
  const mem = (o) => { let m = per.get(o); if (!m) per.set(o, (m = { v: o.speed || 0, cd: 0, block: 0, stopT: 0 })); return m; };
  let env = { rain: false, night: false };
  let junctions = null, signals = null, nearJ = null, tramPrev = null, tramSpeed = 0, impactHorned = false;

  function horn(ai, style, vol = 0.4) {
    const part = style || pick(['single', 'single', 'double', 'tap', 'beepbeep', 'long']);
    // every car sounds a bit different; buses are deeper
    const rate = ai.isBus ? rnd(0.72, 0.8) : rnd(0.9, 1.12);
    return play('horns', part, ai.pos.x, ai.pos.z, { vol, rate, echo: 0.35, delay: rnd(0, 0.2) });
  }
  function gong(x, z, vol = 0.55) {
    // the Luas warns with a double strike of its gong
    const rate = rnd(0.98, 1.02);
    play('luas', 'gong', x, z, { vol, rate, echo: 0.3 });
    play('luas', 'gong', x, z, { vol: vol * 0.9, rate, echo: 0.3, delay: 0.36 });
  }

  function scanEvents(dt, car, traffic, tram, sirenOn) {
    hornCd -= dt; gongCd -= dt; crossCd -= dt;
    const px = car.pos.x, pz = car.pos.z;
    const quiet = env.night ? 0.45 : 1; // fewer events after dark

    // ---- traffic: horns and bus brakes ----
    if (traffic && traffic.length) {
      const near = [];
      for (const ai of traffic) {
        const dx = ai.pos.x - px, dz = ai.pos.z - pz, d2 = dx * dx + dz * dz;
        const m = mem(ai);
        m.cd -= dt;
        if (d2 < 90 * 90) {
          near.push(ai);
          // somebody's stopped nose-to-tail behind the player for a few seconds: a pointed honk
          const fx = Math.sin(ai.heading), fz = Math.cos(ai.heading);
          const along = -(dx * fx + dz * fz), lat = Math.abs(-dx * fz + dz * fx);
          if (along > 2 && along < 11 && lat < 2.4 && Math.abs(ai.speed) < 0.8 && Math.abs(car.speed) < 1.5) m.block += dt;
          else m.block = 0;
          if (m.block > 3 && m.cd <= 0 && hornCd < 4) {
            if (!sirenOn || Math.random() < 0.2) horn(ai, pick(['long', 'double', 'blare']), 0.5);
            m.block = -4; m.cd = rnd(8, 14); hornCd = Math.max(hornCd, rnd(3, 6));
          }
          // buses: air-brake hiss once they've come to a stand, and another as they release to pull away
          if (ai.isBus) {
            const stopped = ai.speed < 0.3;
            if (stopped && m.v > 1.5 && m.cd <= 0 && Math.random() < 0.85) {
              play('bus', 'hiss', ai.pos.x, ai.pos.z, { vol: 0.5, rate: rnd(0.92, 1.06), echo: 0.15, delay: rnd(0.2, 0.9) });
              m.cd = rnd(12, 20);
            } else if (!stopped && m.stopT > 3 && Math.random() < 0.5) {
              play('bus', 'hiss2', ai.pos.x, ai.pos.z, { vol: 0.35, rate: rnd(0.95, 1.08), echo: 0.15 });
            }
            m.stopT = stopped ? m.stopT + dt : 0;
          }
        }
        m.v = ai.speed;
      }
      // a crash: whoever the player hit leans on the horn
      if (car.impact > 5 && !impactHorned) {
        impactHorned = true;
        let best = null, bd = 49;
        for (const ai of near) { const d2 = (ai.pos.x - px) ** 2 + (ai.pos.z - pz) ** 2; if (d2 < bd) { bd = d2; best = ai; } }
        if (best && mem(best).cd <= 0) { horn(best, 'blare', 0.55); mem(best).cd = 6; }
      }
      if (car.impact < 1) impactHorned = false;
      // background honking somewhere in the city: random, not too close, more often from stuck traffic
      const rate = (env.rain ? 1 / 14 : 1 / 18) * quiet * (sirenOn ? 0.35 : 1);
      if (hornCd <= 0 && Math.random() < rate * dt) {
        const cands = near.filter((ai) => { const d2 = (ai.pos.x - px) ** 2 + (ai.pos.z - pz) ** 2; return d2 > 15 * 15 && mem(ai).cd <= 0; });
        const slow = cands.filter((ai) => ai.speed < 3);
        const ai = pick(slow.length && Math.random() < 0.7 ? slow : cands.length ? cands : [null]);
        if (ai && horn(ai)) { mem(ai).cd = rnd(10, 20); hornCd = rnd(6, 14) / quiet; }
      }
    }

    // ---- Luas gong ----
    if (tram && tram.carriages && tram.carriages.length) {
      let best = null, bd = Infinity;
      for (const k of tram.carriages) { const d2 = (k.x - px) ** 2 + (k.z - pz) ** 2; if (d2 < bd) { bd = d2; best = k; } }
      const d = Math.sqrt(bd), c0 = tram.carriages[0];
      const speed = Math.abs(tram.speed || 0);
      if (d < 120) {
        // moving direction from how the first carriage moved since the last scan
        let mx = 0, mz = 0;
        if (tramPrev) { mx = c0.x - tramPrev.x; mz = c0.z - tramPrev.z; const n = Math.hypot(mx, mz); if (n > 1e-3) { mx /= n; mz /= n; } }
        const rx = px - best.x, rz = pz - best.z;
        const ahead = mx * rx + mz * rz, lat = Math.abs(mx * rz - mz * rx);
        const departing = tramSpeed < 0.05 && speed > 0.15;
        const inPath = speed > 1.5 && ahead > 4 && ahead < 40 && lat < 3.5;
        if (gongCd <= 0 && (inPath || (departing && Math.random() < 0.8) || (speed > 2 && d < 70 && Math.random() < dt / 40))) {
          // ring from the carriage nearest the player (the sound reaches you from the tram, not the cab)
          gong(best.x, best.z, inPath ? 0.7 : 0.5);
          gongCd = inPath ? 5 : rnd(14, 24);
        }
      }
      tramPrev = { x: c0.x, z: c0.z }; tramSpeed = speed;
    }

    // ---- pedestrian crossing: the rapid "go" ticking when a nearby junction's lights change ----
    if (junctions && signals) {
      let best = null, bd = 45 * 45;
      for (const j of junctions) { const d2 = (j.x - px) ** 2 + (j.z - pz) ** 2; if (d2 < bd) { bd = d2; best = j; } }
      if (best) {
        const s = signals.stateFor(best.edge);
        const st = s && s.state;
        // traffic on one axis has just stopped: people get the green man
        // (only while it stays the nearest junction, so a reading from long ago can't fire on arrival)
        if (best === nearJ && best.last && best.last !== 'red' && st === 'red' && crossCd <= 0 && Math.random() < 0.6 * (env.night ? 0.6 : 1)) {
          play('crossing', 'go', best.x + rnd(-6, 6), best.z + rnd(-6, 6), { vol: 0.3, echo: 0.1, delay: 0.8 });
          crossCd = rnd(16, 30);
        }
        best.last = st;
      }
      nearJ = best;
    }
  }

  return {
    stats,
    levels,
    attach(name, buffer) {
      buffers[name] = buffer;
      const g = beds[name];
      if (g) {
        const len = FILES[name].loop[1] - FILES[name].loop[0];
        for (const [side, off] of [[-0.65, 0], [0.65, len / 2]]) {
          const p = panner(ctx, g);
          if (p.pan) p.pan.value = side;
          loopSource(ctx, name, buffer, p, off);
        }
        ramp(g.gain, levels[name] || 0, ctx.currentTime, 1.5); // fade in as it arrives
      }
    },
    // world + signals, for the crossing sounds (signalised junctions only)
    setWorld(world, sig) {
      if (!world || !sig || !sig.stateFor) return;
      signals = sig;
      junctions = [];
      for (const node of world.nodes.values()) {
        if (node.edges.length < 3) continue;
        const out = node.edges[0], back = out.to.edges.find((e) => e.to === node);
        if (back && sig.stateFor(back)) junctions.push({ x: node.x, z: node.z, edge: back, last: null });
      }
    },
    setEnv(e) {
      env = { rain: !!e.rain, night: !!e.night };
      const t = ctx.currentTime;
      levels.city_traffic = (env.night ? 0.3 : 0.55) * (env.rain ? 0.9 : 1);
      levels.city_people = env.night ? (env.rain ? 0.04 : 0.1) : env.rain ? 0.12 : 0.4;
      levels.rain = env.rain ? 0.5 : 0;
      levels.nightTone = env.night ? 2200 : 16000;
      for (const k of Object.keys(beds)) if (buffers[k]) ramp(beds[k].gain, levels[k], t, 1.2);
      ramp(nightTone.frequency, levels.nightTone, t, 1.2);
    },
    get env() { return env; },
    gains: () => ({ traffic: beds.city_traffic.gain.value, people: beds.city_people.gain.value, rain: beds.rain.gain.value, nightTone: nightTone.frequency.value }),
    update(dt, car, traffic, tram, sirenOn) {
      L.x = car.pos.x; L.z = car.pos.z; L.h = car.heading;
      if (dt <= 0) return;
      scan += dt;
      if (scan >= SCAN) { scanEvents(scan, car, traffic, tram, sirenOn); scan = 0; }
    },
    play,
  };
}
