// Player car: recorded diesel engine loops crossfaded by rpm, a simple 5-speed gearbox, tyre squeal and impact thuds.
import { FILES } from './assets.js';
import { gain, filter, loopSource, ramp, clamp01 } from './nodes.js';

// rpm per m/s in each gear. The car accelerates hard (arcade), so gears are long enough that shifts come
// every second or two rather than whining up forever; each upshift drops the revs by about a third.
const RATIO = [0, 367, 194, 132, 100, 82];
const REVERSE = 300;
const IDLE = 820, UP_EASY = 2300, UP_HARD = 3300, DOWN = 1250, MAX_RPM = 3900;
const LAYERS = ['engine_idle', 'engine_low', 'engine_mid']; // recorded at 840 / 1470 / 2040 rpm

export function createEngine(ctx, out) {
  // engine -> lowpass (opens with load: bright on throttle, dull on the overrun) -> bus
  const bus = gain(ctx, 0, out);
  const tone = filter(ctx, 'lowpass', 1200, 0.5, bus);
  const layers = LAYERS.map((name) => ({ name, rpm: FILES[name].rpm, g: gain(ctx, 0, tone), src: null }));
  const skidG = gain(ctx, 0, out);
  let skidSrc = null, noise = null;
  const st = { gear: 1, rpm: IDLE, load: 0, shift: 0, ready: false };

  return {
    state: st,
    attach(name, buffer) {
      const l = layers.find((x) => x.name === name);
      if (l && !l.src) l.src = loopSource(ctx, name, buffer, l.g, Math.random() * 2);
      if (name === 'skid' && !skidSrc) skidSrc = loopSource(ctx, name, buffer, skidG);
      st.ready = layers.every((x) => x.src);
    },
    update(car, input, dt, muffled) {
      const t = ctx.currentTime;
      const v = Math.abs(car.speed), throttle = input.throttle || 0;
      // gearbox
      let ratio;
      if (car.speed < -0.5) { ratio = REVERSE; st.gear = 1; } else {
        const upAt = UP_EASY + (UP_HARD - UP_EASY) * throttle;
        if (st.gear < RATIO.length - 1 && v * RATIO[st.gear] > upAt && st.shift <= 0) { st.gear++; st.shift = 0.3; }
        else if (st.gear > 1 && v * RATIO[st.gear] < DOWN) st.gear--;
        ratio = RATIO[st.gear];
      }
      let target = Math.max(IDLE, v * ratio);
      // clutch slipping at a launch (or revving on the spot): revs float up with the throttle
      if (st.gear === 1 && v < 5) target = Math.max(target, IDLE + throttle * 1700 * (1 - v / 7));
      target = Math.min(MAX_RPM, target);
      if (st.shift > 0) st.shift -= dt;
      // revs fall fast into the next gear, rise a little slower (flywheel)
      st.rpm += (target - st.rpm) * Math.min(1, dt * (target < st.rpm ? 9 : 6));
      const loadTarget = st.shift > 0 ? 0 : throttle;
      st.load += (loadTarget - st.load) * Math.min(1, dt * (st.shift > 0 ? 20 : 7));

      // crossfade neighbouring layers (equal power) and pitch each to the current rpm
      const r = st.rpm;
      const w = r <= layers[1].rpm
        ? [1 - clamp01((r - layers[0].rpm) / (layers[1].rpm - layers[0].rpm)), clamp01((r - layers[0].rpm) / (layers[1].rpm - layers[0].rpm)), 0]
        : [0, 1 - clamp01((r - layers[1].rpm) / (layers[2].rpm - layers[1].rpm)), clamp01((r - layers[1].rpm) / (layers[2].rpm - layers[1].rpm))];
      layers.forEach((l, i) => {
        ramp(l.g.gain, Math.sin(w[i] * Math.PI / 2), t, 0.04);
        if (l.src) ramp(l.src.playbackRate, Math.max(0.5, Math.min(2, r / l.rpm)), t, 0.03);
      });
      const rev = clamp01((r - IDLE) / (MAX_RPM - IDLE));
      ramp(tone.frequency, (700 + st.load * 2400 + rev * 1400) * (muffled ? 0.7 : 1), t, 0.06);
      ramp(bus.gain, st.ready && !st.mute ? 0.2 + st.load * 0.14 + rev * 0.12 : 0, t, st.mute ? 0.3 : 0.08);

      // tyre squeal: sliding sideways at speed, harder on the handbrake
      const slide = clamp01((Math.abs(car.slip) - 2.5) / 6) * clamp01((v - 3) / 3);
      if (skidSrc) {
        ramp(skidG.gain, slide * 0.3, t, 0.05);
        ramp(skidSrc.playbackRate, 0.88 + slide * 0.18 + Math.min(v, 30) * 0.002, t, 0.1);
      }

      // a dull thud for each fresh impact
      if (car.impact > 3 && !st.thud) {
        st.thud = true;
        if (!noise) {
          noise = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
          const d = noise.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        }
        const src = ctx.createBufferSource(); src.buffer = noise;
        const f = filter(ctx, 'lowpass', 220, 0.7);
        const g = gain(ctx, 0, out);
        g.gain.setValueAtTime(Math.min(0.7, car.impact * 0.06), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        src.connect(f).connect(g); src.start(t); src.stop(t + 0.4);
      }
      if (car.impact < 1) st.thud = false;
    },
  };
}
