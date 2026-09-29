// Trailer capture: the game is stepped one frame at a time on a virtual clock (30 fps), and every frame is saved,
// so the video is perfectly smooth however slow the machine is. Shots mix photo-mode camera moves and an autopilot
// drive. Frames go to tools/video/frames; tools/video.sh turns them into an MP4.
// Run: node tools/check.mjs tools/scenarios/video.mjs     (SHOTS=drive,gpo to render a subset while tuning)
import fs from 'node:fs';
import path from 'node:path';

const FPS = 30;
const K = +(process.env.PREVIEW || 1); // PREVIEW=0.05: a few frames per shot, to check framing quickly
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export default async function (page) {
  const out = path.resolve('tools/video/frames');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  await page.waitForFunction(() => window.__dublin && window.__dublin.ready === true, { timeout: 120000 });
  await wait(2500);

  // virtual clock + manual frame stepping, an autopilot hook, a fade layer and title cards
  await page.evaluate(async () => {
    const d = window.__dublin;
    d.lockQuality('high', 1.5);
    let vt = performance.now();
    const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame;
    performance.now = () => vt;
    let cbs = [];
    window.requestAnimationFrame = (f) => { cbs.push(f); return cbs.length; };
    // hand the loop back to the real clock afterwards (the harness measures fps at the end)
    window.__release = () => { const off = realNow() - vt; performance.now = () => realNow() - off; window.requestAnimationFrame = realRaf; const c = cbs; cbs = []; for (const f of c) realRaf(f); };
    window.__step = (ms) => { vt += ms; const c = cbs; cbs = []; for (const f of c) f(vt); };
    const st = document.createElement('style');
    st.textContent = `.toolbar, .touch, #toast, .toast { display: none !important; }
      #fade { position: fixed; inset: 0; background: #000; z-index: 90; pointer-events: none; opacity: 0; }
      #card { position: fixed; inset: 0; z-index: 91; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; text-align: center; text-shadow: 0 2px 16px rgba(0,0,0,0.55); pointer-events: none; opacity: 0; font-family: system-ui, sans-serif; }
      #card h1 { margin: 0 0 14px; font: 800 84px/1 system-ui, sans-serif; letter-spacing: 0.32em; padding-left: 0.32em; }
      #card p { margin: 4px 0; font: 500 24px/1.3 system-ui, sans-serif; opacity: 0.92; }
      #card p.small { font-size: 18px; opacity: 0.8; }
      #cap { position: fixed; left: 40px; bottom: 36px; z-index: 91; color: #fff; font: 700 26px/1.2 system-ui, sans-serif; text-shadow: 0 2px 10px rgba(0,0,0,0.6); opacity: 0; pointer-events: none; }`;
    document.head.appendChild(st);
    document.body.insertAdjacentHTML('beforeend', '<div id="fade"></div><div id="card"></div><div id="cap"></div>');
    // autopilot: pure pursuit along the left lane of a node route, easing off for bends and traffic ahead
    const { laneOffset } = await import('/src/world/geo.js');
    const lerp = (a, b, t) => a + (b - a) * t;
    const car = d.car, orig = car.update.bind(car);
    window.__auto = null;
    car.update = (dt, inp) => orig(dt, window.__auto ? window.__auto(dt) : inp);
    window.__drive = (ids, speed) => {
      const N = (id) => d.world.nodes.get(id);
      const pts = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const A = N(ids[i]), B = N(ids[i + 1]);
        const way = A.ways.find((w) => w.nodeIds.includes(ids[i + 1])) || A.ways[0];
        const L = Math.hypot(B.x - A.x, B.z - A.z), dx = (B.x - A.x) / L, dz = (B.z - A.z) / L, off = laneOffset(way);
        pts.push({ x: A.x + dz * off, z: A.z - dx * off }, { x: B.x + dz * off, z: B.z - dx * off });
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
      const at = (s) => {
        s = Math.min(s, cum[cum.length - 1]);
        let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
        const t = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
        return { x: lerp(pts[i - 1].x, pts[i].x, t), z: lerp(pts[i - 1].z, pts[i].z, t) };
      };
      let s = 0;
      const h0 = Math.atan2(pts[1].x - pts[0].x, pts[1].z - pts[0].z);
      car.teleport(pts[0].x, pts[0].z, h0); d.rig.snap();
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      window.__auto = () => {
        // progress: nearest point within the next 30 m
        let best = s, bd = Infinity;
        for (let k = s; k < s + 30; k += 0.5) { const p = at(k); const dd = (p.x - car.pos.x) ** 2 + (p.z - car.pos.z) ** 2; if (dd < bd) { bd = dd; best = k; } }
        s = best;
        const v = car.speed, look = at(s + 7 + v * 0.45);
        const diff = wrap(Math.atan2(look.x - car.pos.x, look.z - car.pos.z) - car.heading);
        const far = at(s + 20 + v * 1.2);
        const bend = Math.abs(wrap(Math.atan2(far.x - car.pos.x, far.z - car.pos.z) - car.heading));
        let target = bend > 0.45 ? Math.min(speed, 9) : speed;
        const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
        for (const a of d.traffic.list) {
          const rx = a.pos.x - car.pos.x, rz = a.pos.z - car.pos.z, along = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx);
          if (along > 0 && along < 10 + v * 1.1 && lat < 2.2) target = Math.min(target, along < 8 ? 0 : 4);
        }
        if (s >= cum[cum.length - 1] - 3) target = 0;
        return { throttle: v < target - 0.5 ? 1 : 0, brake: v > target + 1.5 ? 1 : 0, steer: Math.max(-1, Math.min(1, -diff * 2.4)), handbrake: false };
      };
    };
  });

  let frame = 0;
  const step = async (n = 1) => { for (let i = 0; i < n; i++) await page.evaluate((ms) => window.__step(ms), 1000 / FPS); };
  const grab = async () => { await page.screenshot({ path: path.join(out, `f${String(frame++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 }); };
  const set = (fn, ...a) => page.evaluate(fn, ...a);
  const fade = (o) => set((o) => { document.getElementById('fade').style.opacity = o; }, o);
  const card = (html, o) => set(([h, o]) => { const c = document.getElementById('card'); if (h != null) c.innerHTML = h; c.style.opacity = o; }, [html, o]);
  const cap = (text, o) => set(([t, o]) => { const c = document.getElementById('cap'); if (t != null) c.textContent = t; c.style.opacity = o; }, [text, o]);
  // fade in over the first 12 frames and out over the last 12 of a shot
  const edge = (i, n) => (K < 1 ? 0 : Math.max(0, 1 - Math.min(i, n - 1 - i) / 12));

  // photo-mode camera move: from pose a to pose b over `secs`, eased; `prep` runs first (teleports, night...)
  async function orbit(name, secs, a, b, { live = true, hideCar = false, caption = null, settle = 20, extra } = {}) {
    await set(({ live, hideCar }) => {
      const d = window.__dublin, p = d.photo;
      if (!p.active) p.enter(d.car.pos);
      const btn = (k) => document.querySelector(`[data-p="${k}"]`);
      if (btn('live').classList.contains('on') !== live) btn('live').click();
      if (btn('car').classList.contains('on') !== hideCar) btn('car').click();
      document.getElementById('photo').style.display = 'none';
    }, { live, hideCar });
    const n = Math.max(3, Math.round(secs * FPS * K));
    const pose = (t) => ({ target: a.target.map((v, k) => lerp(v, b.target[k], t)), yaw: lerp(a.yaw, b.yaw, t), pitch: lerp(a.pitch, b.pitch, t), dist: lerp(a.dist, b.dist, t), fov: lerp(a.fov, b.fov, t) });
    await set((p) => window.__dublin.photo.pose(p), pose(0));
    await step(settle); // let traffic, lights and shadows settle at the new spot
    if (caption) await cap(caption, 0);
    for (let i = 0; i < n; i++) {
      await set((p) => window.__dublin.photo.pose(p), pose(ease(i / (n - 1))));
      await fade(edge(i, n));
      if (caption) await cap(null, Math.min(1, Math.max(0, (i - 10) / 12)) * (1 - Math.max(0, (i - (n - 16)) / 14)));
      if (extra) await extra(i, n);
      await step(); await grab();
    }
    if (caption) await cap(null, 0);
    console.log('shot', name, n, 'frames');
  }
  async function drive(name, secs, route, speed, { caption = null, settle = 30 } = {}) {
    await set(() => { const d = window.__dublin; if (d.photo.active) d.photo.exit(); });
    await set(([r, s]) => window.__drive(r, s), [route, speed]);
    await step(settle);
    const n = Math.max(3, Math.round(secs * FPS * K));
    if (caption) await cap(caption, 0);
    for (let i = 0; i < n; i++) {
      await fade(edge(i, n));
      if (caption) await cap(null, Math.min(1, Math.max(0, (i - 10) / 12)) * (1 - Math.max(0, (i - (n - 16)) / 14)));
      await step(); await grab();
    }
    if (caption) await cap(null, 0);
    await set(() => { window.__auto = null; });
    console.log('shot', name, n, 'frames', 'end speed', await set(() => window.__dublin.car.speed.toFixed(1)));
  }
  // the direction from a landmark to its roadside viewpoint: cameras placed along it sit over the street
  const viewYaw = (k) => set((k) => { const s = window.__dublin.sites[k], v = s.view; return Math.atan2(v.x - s.x, v.z - s.z); }, k);
  const site = (k) => set((k) => { const s = window.__dublin.sites[k]; return [s.x, s.z]; }, k);
  const node = (k) => set((k) => { const n = window.__dublin.world.nodes.get(k); return [n.x, n.z]; }, k);
  const only = process.env.SHOTS ? process.env.SHOTS.split(',') : null;
  const want = (k) => !only || only.includes(k);
  const night = (on) => set(async (on) => { const d = window.__dublin; if (d.mode.evening !== on) d.actions.evening(); }, on);
  const rain = (on) => set((on) => { const d = window.__dublin; if (d.mode.rain !== on) d.actions.rain(); }, on);
  const siren = (on) => set((on) => { const d = window.__dublin; if (d.car.siren !== on) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x' })); }, on);

  // 1. title: high over the Liffey and the Spire
  if (want('title')) {
    const [sx, sz] = await site('spire');
    const n = Math.max(3, Math.round(5 * FPS * K));
    await orbit('title', 5, { target: [sx + 20, 0, sz + 150], yaw: 0.15, pitch: 0.62, dist: 260, fov: 45 }, { target: [sx + 10, 0, sz + 120], yaw: 0.45, pitch: 0.5, dist: 190, fov: 45 }, {
      extra: async (i) => {
        if (i === 0) await card('<h1>DUBLIN</h1><p>A driving game of the city centre</p>', 0);
        await card(null, Math.min(1, Math.max(0, (i - 15) / 20)) * (1 - Math.max(0, (i - (n - 30)) / 20)));
      },
    });
    await card(null, 0);
  }
  // 2. Garda car down O'Connell Street, over the bridge, blues on
  if (want('drive')) {
    await siren(true);
    await drive('drive', 9, ['OC3', 'OC2', 'OC1', 'NQ8', 'SQ8', 'WMS', 'WM1', 'CG1'], 15);
    await siren(false);
  }
  // 3. the GPO, low along the street
  if (want('gpo')) {
    const [x, z] = await site('gpo'), y = await viewYaw('gpo');
    await orbit('gpo', 4.5, { target: [x, 9, z], yaw: y - 0.35, pitch: 0.1, dist: 48, fov: 55 }, { target: [x, 9, z], yaw: y + 0.2, pitch: 0.14, dist: 44, fov: 55 }, { caption: 'The GPO' });
  }
  // 4. the Ha'penny Bridge
  if (want('hapenny')) {
    const [x, z] = await site('hapenny');
    await orbit('hapenny', 4.5, { target: [x, 3, z], yaw: 1.3, pitch: 0.12, dist: 34, fov: 50 }, { target: [x, 3, z], yaw: 1.8, pitch: 0.16, dist: 30, fov: 50 }, { caption: "Ha'penny Bridge" });
  }
  // 5. Christ Church
  if (want('christchurch')) {
    const [x, z] = await site('christChurch');
    await orbit('christchurch', 4.5, { target: [x, 14, z], yaw: 2.4, pitch: 0.22, dist: 95, fov: 48 }, { target: [x, 14, z], yaw: 3.0, pitch: 0.28, dist: 85, fov: 48 }, { caption: 'Christ Church Cathedral' });
  }
  // 6. night at the docks: the Convention Centre and the Samuel Beckett Bridge
  if (want('docks')) {
    await night(true);
    const [x, z] = await site('beckett');
    await set(() => window.__dublin.photo.active || window.__dublin.photo.enter(window.__dublin.car.pos));
    await step(90); // lights come up
    await orbit('docks', 5.5, { target: [x, 10, z], yaw: Math.PI / 2 + 0.3, pitch: 0.1, dist: 120, fov: 48 }, { target: [x, 10, z], yaw: Math.PI / 2 - 0.2, pitch: 0.14, dist: 100, fov: 48 }, { caption: 'Samuel Beckett Bridge', settle: 30 });
  }
  // 7. rain at night along the north quays
  if (want('rain')) {
    await night(true); await rain(true);
    await step(120); // the streets get wet
    await siren(true);
    await drive('rain', 7, ['NQ10', 'NQ11', 'NQ12', 'NQ13', 'NQ14', 'NQ15', 'NQ16'], 17);
    await siren(false);
  }
  // 8. end card over the night city
  if (want('end')) {
    await night(false); await rain(false);
    await step(60);
    const [x, z] = await site('oconnellBridge');
    const n = Math.max(3, Math.round(5 * FPS * K));
    await orbit('end', 5, { target: [x, 0, z], yaw: 1.3, pitch: 0.22, dist: 90, fov: 48 }, { target: [x, 0, z], yaw: 1.6, pitch: 0.5, dist: 230, fov: 48 }, {
      extra: async (i) => {
        if (i === 0) await card('<h1>DUBLIN</h1><p>Free to play in your browser, on phone or laptop</p><p class="small">seadnad.github.io/dublin-city</p>', 0);
        await card(null, Math.min(1, Math.max(0, (i - 20) / 20)));
        if (i > n - 13) await fade(0); // keep the card up to the last frame
      },
    });
  }
  await set(() => window.__release());
  console.log('FRAMES', frame);
}
