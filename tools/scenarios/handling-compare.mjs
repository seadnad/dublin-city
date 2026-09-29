// Handling numbers for each car profile (car.js CAR_PROFILES), measured on the real physics at a fixed 60 Hz step.
// The car runs on a "treadmill": after every step it is put back on the same spot in the middle of O'Connell Street
// (heading and velocity carry on), so long runs and circles never meet a wall. One page.evaluate per profile, so
// the game loop can't interleave.
// Usage: node tools/check.mjs tools/scenarios/handling-compare.mjs
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function (page) {
  await wait(2500);
  const rows = [];
  for (const profile of ['standard', 'gt']) {
    rows.push(await page.evaluate((profile) => {
      const d = window.__dublin, car = d.car, w = d.world;
      const a = w.nodes.get('NQ8'), b = w.nodes.get('OC4');
      const h0 = Math.atan2(b.x - a.x, b.z - a.z);
      const X = a.x + Math.cos(h0) * 3 + Math.sin(h0) * 60, Z = a.z - Math.sin(h0) * 3 + Math.cos(h0) * 60;
      const saved = car.profile;
      car.setProfile(profile === 'standard' ? null : profile);
      const DT = 1 / 60;
      const inp = { throttle: 0, brake: 0, steer: 0, handbrake: false };
      const reset = (v = 0, h = h0) => { car.teleport(X, Z, h); car.vel.x = Math.sin(h) * v; car.vel.z = Math.cos(h) * v; car.speed = v; car.steer = 0; car.lift = 0; car.boost = 0; car.drift = 0; };
      const step = () => { car.update(DT, inp); car.pos.x = X; car.pos.z = Z; };
      const set = (t, b, s, hb) => { inp.throttle = t; inp.brake = b; inp.steer = s; inp.handbrake = hb; };
      const kmh = (v) => v * 3.6;
      const out = { profile };

      // 0-100 km/h and top speed
      reset(); set(1, 0, 0, false);
      let t = 0, t100 = null, t60 = null, top = 0;
      for (; t < 90; t += DT) { step(); if (!t60 && kmh(car.speed) >= 60) t60 = t; if (!t100 && kmh(car.speed) >= 100) t100 = t; top = Math.max(top, car.speed); }
      out['0-60 s'] = +t60.toFixed(2); out['0-100 s'] = t100 ? +t100.toFixed(2) : null; out['top km/h'] = Math.round(kmh(top));

      // braking 100-0
      reset(100 / 3.6); set(0, 1, 0, false);
      let dist = 0; t = 0;
      while (car.speed > 0.3 && t < 10) { step(); dist += Math.abs(car.speed) * DT; t += DT; }
      out['100-0 m'] = +dist.toFixed(1); out['100-0 s'] = +t.toFixed(2);

      // steady full-lock turn at 50 and 90 km/h: yaw rate, radius, lateral acceleration (throttle holds the speed)
      for (const target of [50, 90]) {
        reset(target / 3.6);
        for (t = 0; t < 4; t += DT) { set(car.speed < target / 3.6 ? 1 : 0.35, 0, 1, false); step(); }
        const v = Math.hypot(car.vel.x, car.vel.z), yaw = Math.abs(car.yawRate);
        out[`turn@${target} lat g`] = +(v * yaw / 9.81).toFixed(2);
        out[`turn@${target} radius m`] = +(v / Math.max(1e-3, yaw)).toFixed(1);
      }
      // steering response: time to 90 % of the final yaw rate after a step of half lock at 75 km/h
      reset(75 / 3.6); set(0.4, 0, 0.5, false);
      const yaws = [];
      for (t = 0; t < 2; t += DT) { step(); yaws.push(Math.abs(car.yawRate)); }
      const fin = yaws[yaws.length - 1];
      out['steer resp s'] = +(yaws.findIndex((y) => y >= fin * 0.9) * DT).toFixed(2);

      // handbrake flick at 60 km/h: 0.65 s of handbrake and full lock, then release with the power on
      reset(60 / 3.6); set(0.5, 0, 1, true);
      const hs = car.heading;
      let peak = 0;
      for (t = 0; t < 0.65; t += DT) { step(); peak = Math.max(peak, Math.abs(car.slip)); }
      out['handbrake rot deg'] = Math.round(Math.abs(car.heading - hs) * 180 / Math.PI);
      out['handbrake slip m/s'] = +peak.toFixed(1);
      set(1, 0, 0, false);
      for (t = 0; t < 4 && Math.abs(car.slip) > 1; t += DT) step();
      out['drift recover s'] = +t.toFixed(2);

      // lift-off: settle into a half-lock turn at 80 km/h on the power, then lift for 0.8 s, then power back on
      reset(80 / 3.6);
      for (t = 0; t < 2.5; t += DT) { set(car.speed < 80 / 3.6 ? 1 : 0.5, 0, 0.6, false); step(); }
      const yawOn = Math.abs(car.yawRate), hl = car.heading;
      let slipLift = 0;
      set(0, 0, 0.6, false);
      for (t = 0; t < 0.8; t += DT) { step(); slipLift = Math.max(slipLift, Math.abs(car.slip)); }
      out['lift yaw on->off'] = `${yawOn.toFixed(2)}->${Math.abs(car.yawRate).toFixed(2)} rad/s`;
      out['lift slip m/s'] = +slipLift.toFixed(2);
      out['lift rot deg (0.8s)'] = Math.round(Math.abs(car.heading - hl) * 180 / Math.PI);
      set(1, 0, 0.6, false);
      for (t = 0; t < 3 && Math.abs(car.slip) > 0.3; t += DT) step();
      out['lift recover s'] = +t.toFixed(2);

      set(0, 0, 0, false); reset(); car.setProfile(saved === 'standard' ? null : saved); d.rig.snap();
      return out;
    }, profile));
  }
  const keys = Object.keys(rows[0]);
  console.log('\n' + ['metric', ...rows.map((r) => r.profile)].map((s) => String(s).padEnd(22)).join(''));
  for (const k of keys.slice(1)) console.log([k, ...rows.map((r) => r[k])].map((s) => String(s).padEnd(22)).join(''));
}
