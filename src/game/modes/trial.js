// Time Trials: checkpoint routes through the city with a countdown, split times against your best,
// bronze / silver / gold medals and a ghost car of your best run. Plus a Daily Route seeded by the date.
import * as THREE from 'three';
import { world, v2, laneOffset } from '../../world/geo.js';
import { fmt } from './pursuit.js';
import { dateKey, seedOf, makeRand, howClose, medalFor, shareText, emojiRow, runSummary, markDaily, streakText } from './runs.js';

export const ROUTES = [
  { id: 'liffey', name: 'Liffey Loop', blurb: 'Both quays and three bridges', path: ['NQ8', 'NQ9', 'NQ10', 'SQ10', 'SQ9', 'SQ8', 'TBQD', 'TBQC', 'SQ7', 'TBQB', 'TBQA', 'HPS', 'SQ6', 'TBQF', 'SQ5', 'SQ4', 'NQ4', 'NQ5', 'NQ6', 'NQ7', 'NQ8'] },
  { id: 'georgian', name: 'Georgian Sprint', blurb: 'Nassau St, Merrion Square and the Green', path: ['CG3', 'NS1', 'NS2', 'NS3', 'MSNW', 'MSNE', 'MSSE', 'MSSW', 'MR1', 'SGNE', 'SGSE', 'HC0', 'SGSW', 'SGW', 'SGNW', 'GFCH', 'GR2', 'GFJC', 'GRD', 'GR1', 'CG3'] },
  { id: 'templebar', name: 'Temple Bar & Christ Church', blurb: 'Cobbled lanes, Winetavern St, back along the quays', path: ['WM1', 'FPL', 'FAP', 'FL1', 'TAS', 'TBQ', 'TFO', 'TTL', 'TEU', 'ES1', 'PARL', 'EW1', 'FS2', 'FS1', 'LE1', 'CC4', 'CC3', 'CC2', 'CC1', 'HS1', 'WTB', 'WTC', 'SQ2', 'SQ3', 'SQ4', 'SQ5', 'TBQF', 'SQ6', 'HPS', 'TBQA', 'TBQB', 'SQ7', 'TBQC', 'TBQD', 'SQ8', 'WMS', 'WM1'] },
];

// Daily route: a seeded random drive through the graph, the same for everyone on a given day.
export function dailyRoute(date = new Date()) {
  const key = dateKey(date);
  const rand = makeRand(seedOf(key));
  const nodes = [...world.nodes.values()].filter((n) => n.edges.some((e) => e.way.type !== 'lane'));
  for (let attempt = 0; attempt < 50; attempt++) {
    let node = nodes[Math.floor(rand() * nodes.length)], prev = null, len = 0;
    const path = [node.id], seen = new Set([node.id]);
    while (len < 1500 && path.length < 20) {
      const opts = node.edges.filter((e) => e.to !== prev && !seen.has(e.to.id) && e.way.type !== 'lane');
      if (!opts.length) break;
      const e = opts[Math.floor(rand() * opts.length)];
      prev = node; node = e.to; len += e.len;
      path.push(node.id); seen.add(node.id);
    }
    if (len > 900) return { id: `daily-${key}`, name: 'Daily Route', blurb: key, path, daily: true, date: key };
  }
  return { ...ROUTES[0], id: `daily-${key}`, name: 'Daily Route', daily: true, date: key };
}

function routeGeometry(route) {
  const nodes = route.path.map((id) => world.nodes.get(id));
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const e = nodes[i].edges.find((x) => x.to === nodes[i + 1]);
    if (!e) console.warn(`route ${route.id}: no road ${nodes[i].id} -> ${nodes[i + 1].id}`);
    edges.push(e);
  }
  let length = 0;
  for (const e of edges) if (e) length += e.len;
  // checkpoints: route nodes spaced at least 55 m apart; the last node is the finish
  const cps = [];
  let acc = 0;
  for (let i = 1; i < nodes.length; i++) {
    acc += edges[i - 1] ? edges[i - 1].len : 0;
    if (acc >= 55 || i === nodes.length - 1) {
      const e = edges[i - 1];
      const width = Math.max(...nodes[i].ways.map((w) => w.width));
      cps.push({ x: nodes[i].x, z: nodes[i].z, dir: e ? v2.norm(v2.sub(e.to, e.from)) : { x: 0, z: 1 }, width });
      acc = 0;
    }
  }
  const first = edges[0];
  const d = v2.norm(v2.sub(first.to, first.from));
  const off = laneOffset(first.way);
  const startPos = v2.lerp(first.from, first.to, Math.min(0.3, 12 / first.len));
  const start = { x: startPos.x + d.z * off, z: startPos.z - d.x * off, heading: Math.atan2(d.x, d.z) };
  // medal times from the route length (seconds)
  const medals = { gold: length / 25 + 4, silver: length / 20 + 6, bronze: length / 15.5 + 8 };
  return { cps, start, length, medals };
}

function gateMesh() {
  const g = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff883e, emissiveIntensity: 1.2 });
  const banner = new THREE.MeshStandardMaterial({ color: 0xff883e, emissive: 0xff883e, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 });
  const floor = new THREE.MeshBasicMaterial({ color: 0xff883e, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5.5, 8).translate(0, 2.75, 0), post);
  const pr = pl.clone();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 0.2).translate(0, 5.3, 0), banner);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4).rotateX(-Math.PI / 2).translate(0, 0.05, 0), floor);
  g.add(pl, pr, top, strip);
  g.userData = { pl, pr, top, strip, mats: [post, banner, floor] };
  return g;
}
function placeGate(g, cp, finish) {
  const w = cp.width + 2;
  g.position.set(cp.x, 0, cp.z);
  g.rotation.y = Math.atan2(cp.dir.x, cp.dir.z);
  g.userData.pl.position.x = -w / 2; g.userData.pr.position.x = w / 2;
  g.userData.top.scale.x = w; g.userData.strip.scale.x = w;
  const col = finish ? 0xffffff : 0xff883e;
  for (const m of g.userData.mats) { m.color?.set(col); if (m.emissive) m.emissive.set(finish ? 0x9adfb8 : 0xff883e); }
}

export function createTrial({ scene, player, playerMesh, ui, audio, save, freeze, snap = () => {} }) {
  const gates = [gateMesh(), gateMesh()];
  gates.forEach((g) => { g.visible = false; scene.add(g); });
  // ghost: a translucent copy of the player's car
  const ghost = playerMesh.clone(true);
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.32, depthWrite: false });
  const lights = [];
  ghost.traverse((o) => { if (o.isLight) lights.push(o); if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
  for (const l of lights) l.parent.remove(l); // no extra lights (would recompile every shader)
  ghost.visible = false;
  scene.add(ghost);

  let route = null, geo = null, active = false, phase = 'idle', t = 0, countdown = 0, next = 0;
  let splits = [], rec = [], recT = 0, best = null, lastBeep = 4;

  function show() {
    const cur = geo.cps[next], nxt = geo.cps[next + 1];
    gates[0].visible = !!cur; gates[1].visible = !!nxt;
    if (cur) placeGate(gates[0], cur, next === geo.cps.length - 1);
    if (nxt) { placeGate(gates[1], nxt, next + 1 === geo.cps.length - 1); gates[1].userData.mats.forEach((m) => { if ('opacity' in m) m.opacity = 0.25; }); }
    gates[0].userData.mats.forEach((m) => { if (m.transparent) m.opacity = m === gates[0].userData.mats[2] ? 0.35 : 0.9; });
  }

  const api = {
    get active() { return active; },
    // opts.quick: a retry from the results card (a 1.5 s countdown)
    start(r, opts = {}) {
      route = r; geo = routeGeometry(r);
      best = save.get(`trial.${r.id}`, null);
      active = true; phase = 'countdown'; countdown = opts.quick ? 1.5 : 3.5; lastBeep = opts.quick ? 2 : 4; t = 0; next = 0; splits = []; rec = []; recT = 0;
      player.teleport(geo.start.x, geo.start.z, geo.start.heading);
      snap();
      freeze(true);
      show();
      ghost.visible = !!(best && best.ghost);
      ui.showMission('trial');
    },
    stop() {
      active = false; phase = 'idle';
      gates.forEach((g) => { g.visible = false; });
      ghost.visible = false;
      freeze(false);
      ui.hideMission();
      ui.countdown(null);
    },
    update(dt) {
      if (!active) return;
      if (phase === 'countdown') {
        countdown -= dt;
        const n = Math.ceil(countdown);
        if (n < lastBeep && n > 0) { audio.cue('beep'); lastBeep = n; }
        ui.countdown(n > 0 ? String(n) : 'GO!');
        if (countdown <= 0) { phase = 'run'; freeze(false); audio.cue('go'); setTimeout(() => ui.countdown(null), 600); }
      } else if (phase === 'run') {
        t += dt;
        recT += dt;
        if (recT >= 0.1) { recT = 0; rec.push([+player.pos.x.toFixed(2), +player.pos.z.toFixed(2), +player.heading.toFixed(3)]); }
        const cp = geo.cps[next];
        if (Math.hypot(player.pos.x - cp.x, player.pos.z - cp.z) < cp.width / 2 + 5) {
          splits.push(t);
          next++;
          if (next >= geo.cps.length) return finish();
          audio.cue('checkpoint');
          const delta = best && best.splits[next - 1] !== undefined ? t - best.splits[next - 1] : null;
          if (delta !== null) ui.toast(`${delta <= 0 ? '−' : '+'}${Math.abs(delta).toFixed(2)} s`, 1200);
          show();
        }
      }
      // ghost replay of the best run
      if (ghost.visible && phase === 'run') {
        const g = best.ghost, f = Math.min(g.length - 1, t / 0.1), i = Math.floor(f), k = f - i;
        const a = g[i], b = g[Math.min(g.length - 1, i + 1)];
        ghost.position.set(a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k);
        let dh = b[2] - a[2]; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        ghost.rotation.set(0, a[2] + dh * k, 0);
      } else if (ghost.visible) {
        ghost.position.set(best.ghost[0][0], 0, best.ghost[0][1]); ghost.rotation.set(0, best.ghost[0][2], 0);
      }
      if (active) ui.updateMission({
        title: route.name.toUpperCase(),
        big: fmt(t),
        sub: `Checkpoint ${Math.min(next + 1, geo.cps.length)}/${geo.cps.length}  ·  ${best ? `Best ${fmt(best.time)}` : `Gold ${fmt(geo.medals.gold)}`}`,
      });
    },
    blips() {
      if (!active || !geo) return [];
      const out = [];
      if (geo.cps[next]) out.push({ x: geo.cps[next].x, z: geo.cps[next].z, color: '#ff883e', pulse: true });
      if (geo.cps[next + 1]) out.push({ x: geo.cps[next + 1].x, z: geo.cps[next + 1].z, color: '#ffb27a' });
      return out;
    },
    medalFor(r, time) { const m = routeGeometry(r).medals; return time <= m.gold ? 'gold' : time <= m.silver ? 'silver' : time <= m.bronze ? 'bronze' : null; },
    info(r) { const g = routeGeometry(r); return { length: g.length, medals: g.medals, best: save.get(`trial.${r.id}`, null) }; },
  };

  function finish() {
    const time = t;
    const M = [['bronze', geo.medals.bronze], ['silver', geo.medals.silver], ['gold', geo.medals.gold]];
    const medal = medalFor(time, M, false);
    const record = !best || time < best.time;
    if (record) save.set(`trial.${route.id}`, { time, splits, medal, ghost: rec.length < 6000 ? rec : null });
    audio.cue('finish');
    const r = route;
    api.stop();
    const st = r.daily ? markDaily(save, r.date) : null;
    const close = howClose({ value: time, best: best ? best.time : null, medals: M, higher: false, gap: (d) => `${d.toFixed(2)} s`, show: fmt });
    // splits against the best run: green faster, red slower, white with nothing to compare (at most 10 squares)
    const marks = splits.map((s, i) => (!best || best.splits[i] === undefined ? '⬜' : s <= best.splits[i] ? '🟩' : '🟥'));
    const step = Math.max(1, Math.ceil(marks.length / 10));
    const row = marks.filter((_, i) => (i + 1) % step === 0 || i === marks.length - 1);
    // run summary (shape documented in runs.js); log: the checkpoint split times (s)
    const summary = runSummary({
      mode: 'trial', variant: r.daily ? 'daily' : r.id, date: r.daily ? r.date : null, seed: r.daily ? seedOf(r.date) : null,
      duration: time, score: time, scoreKind: 'time', medal,
      stats: { route: r.id, length: Math.round(geo.length), checkpoints: geo.cps.length },
      events: { checkpoints: splits.length },
      log: splits.map((s) => Math.round(s * 100) / 100),
    });
    ui.showResults({
      title: `${r.name}: ${fmt(time)}`,
      medal,
      daily: r.daily ? ['Daily Route', streakText(st)].filter(Boolean).join(' · ') : null,
      lines: [`Gold ${fmt(geo.medals.gold)}  ·  Silver ${fmt(geo.medals.silver)}  ·  Bronze ${fmt(geo.medals.bronze)}`],
      close: close.lines, target: close.target,
      share: shareText({ icon: '⏱', title: r.name, date: r.daily ? r.date : null, score: fmt(time), extra: `${(geo.length / 1000).toFixed(1)} km`, medal, row: emojiRow(row, 10) }),
      summary,
      retry: () => api.start(r, { quick: true }),
    });
  }
  return api;
}
