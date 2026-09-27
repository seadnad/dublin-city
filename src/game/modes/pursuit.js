// Garda Pursuit: a suspect (the red blip) flees through the street graph. Stay close or ram them to fill the
// bust meter before the clock runs out. Each catch adds time and the next suspect is quicker.
import { world, v2, laneOffset } from '../../world/geo.js';

const leftOf = (d) => ({ x: d.z, z: -d.x });
const drivable = world.edges.filter((e) => e.len > 20 && e.way.type !== 'lane' && !e.way.bridge);

class Suspect {
  constructor(mesh, level) {
    this.mesh = mesh;
    this.level = level;
    this.pos = { x: 0, z: 0 };
    this.heading = 0;
    this.speed = 0;
    this.offset = 0;      // lateral lane offset (swerves into the other lane to overtake)
    this.stunned = 0;
    this.length = 4.2;
  }

  place(edge, player) {
    this.edge = edge;
    const d = v2.norm(v2.sub(edge.to, edge.from));
    this.offset = laneOffset(edge.way);
    const p = v2.lerp(edge.from, edge.to, 0.35);
    this.pos = { x: p.x + leftOf(d).x * this.offset, z: p.z + leftOf(d).z * this.offset };
    this.heading = Math.atan2(d.x, d.z);
    this.speed = 8;
    this.next = this.pickNext(player);
  }

  // Flee: prefer the exit that takes us furthest from the Garda car (with some randomness), avoid U-turns.
  pickNext(player) {
    const options = this.edge.to.edges.filter((e) => e.to !== this.edge.from);
    if (!options.length) return this.edge.to.edges[0];
    let best = options[0], bs = -Infinity;
    for (const e of options) {
      const away = Math.hypot(e.to.x - player.pos.x, e.to.z - player.pos.z);
      const score = away + Math.random() * 60 - (e.way.type === 'lane' ? 60 : 0) + e.len * 0.1;
      if (score > bs) { bs = score; best = e; }
    }
    return best;
  }

  update(dt, player, traffic) {
    const d1 = v2.norm(v2.sub(this.edge.to, this.edge.from));
    const along = v2.dot(v2.sub(this.pos, this.edge.from), d1);
    const remaining = this.edge.len - along;
    if (remaining < 1.5) {
      this.edge = this.next;
      this.next = this.pickNext(player);
    }
    const e = this.edge, d = v2.norm(v2.sub(e.to, e.from)), l = leftOf(d);
    // overtake: if a car sits in our lane ahead, swing into the other lane
    let blocked = false;
    for (const ai of traffic.list) {
      const rx = ai.pos.x - this.pos.x, rz = ai.pos.z - this.pos.z;
      const ahead = rx * d.x + rz * d.z, lat = rx * l.x + rz * l.z;
      if (ahead > 0 && ahead < 22 && Math.abs(lat - this.offset) < 2.2) { blocked = true; break; }
    }
    const baseOff = laneOffset(e.way);
    const wantOff = blocked ? -baseOff * 0.9 : baseOff;
    this.offset += (wantOff - this.offset) * Math.min(1, dt * 2.5);

    // speed: fast on the straights, braking for corners; faster at higher levels
    const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    const top = (19 + this.level * 1.6) * (dist > 260 ? 0.75 : 1) * (e.way.type === 'lane' ? 0.6 : 1);
    const dn = v2.norm(v2.sub(this.next.to, this.next.from));
    const turn = 1 - v2.dot(d, dn);
    let want = top;
    if (turn > 0.2 && remaining < 35) want = Math.min(want, 7 + (1 - Math.min(1, turn)) * 8 + remaining * 0.35);
    if (this.stunned > 0) { this.stunned -= dt; want = Math.min(want, 4); }
    this.speed += Math.sign(want - this.speed) * Math.min(Math.abs(want - this.speed), (want > this.speed ? 7 : 16) * dt);

    // pure pursuit on the (offset) lane line, blending into the next edge near the junction
    const look = 6 + this.speed * 0.45;
    let target;
    const s = along + look;
    if (s < e.len) target = v2.add(v2.add(e.from, v2.scale(d, s)), v2.scale(l, this.offset));
    else {
      const ln = leftOf(dn);
      target = v2.add(v2.add(this.next.from, v2.scale(dn, Math.min(s - e.len, this.next.len))), v2.scale(ln, laneOffset(this.next.way)));
    }
    const to = v2.sub(target, this.pos);
    const wantH = Math.atan2(to.x, to.z);
    const dh = Math.atan2(Math.sin(wantH - this.heading), Math.cos(wantH - this.heading));
    const maxYaw = 0.6 + this.speed * 0.12;
    this.heading += Math.max(-maxYaw * dt, Math.min(maxYaw * dt, dh * Math.min(1, dt * 6)));
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.set(0, this.heading, Math.max(-0.06, Math.min(0.06, -dh * 0.15)));
    this.mesh.userData.update(this.speed, dt, Math.max(-0.5, Math.min(0.5, dh)));
  }

  circles() {
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    return [1.2, -1.2].map((k) => ({ x: this.pos.x + fx * k, z: this.pos.z + fz * k, r: 1.0 }));
  }
}

export function createPursuit({ scene, makeSuspectMesh, player, traffic, ui, audio, save }) {
  let suspect = null, mesh = null, active = false;
  let timeLeft = 0, level = 0, caught = 0, bust = 0, score = 0, flash = 0;

  function spawn() {
    if (!mesh) { mesh = makeSuspectMesh(); scene.add(mesh); }
    mesh.visible = true;
    suspect = new Suspect(mesh, level);
    // somewhere 140-260 m away along a proper road
    let pick = null;
    for (let i = 0; i < 200; i++) {
      const e = drivable[Math.floor(Math.random() * drivable.length)];
      const m = v2.lerp(e.from, e.to, 0.5);
      const dd = Math.hypot(m.x - player.pos.x, m.z - player.pos.z);
      if (dd > 140 && dd < 260) { pick = e; break; }
    }
    suspect.place(pick || drivable[0], player);
    bust = 0;
  }

  const api = {
    get active() { return active; },
    start() {
      active = true; level = 0; caught = 0; score = 0;
      timeLeft = 90;
      spawn();
      player.siren = true;
      audio.setSiren(true);
      ui.showMission('pursuit');
      ui.toast('Suspect sighted: catch the red blip!', 2500);
    },
    stop() {
      active = false;
      if (mesh) mesh.visible = false;
      suspect = null;
      player.siren = false;
      audio.setSiren(false);
      ui.hideMission();
    },
    update(dt) {
      if (!active || !suspect) return;
      timeLeft -= dt;
      suspect.update(dt, player, traffic);
      const dist = Math.hypot(suspect.pos.x - player.pos.x, suspect.pos.z - player.pos.z);
      // bust meter: fills while you're close, faster if they're slowed; decays when they get away
      if (dist < 9) bust += dt * (suspect.speed < 6 ? 0.7 : 0.35);
      else if (dist > 18) bust = Math.max(0, bust - dt * 0.12);
      flash = Math.max(0, flash - dt);
      if (bust >= 1) {
        caught++; level++;
        const bonus = Math.round(100 + timeLeft * 5);
        score += bonus;
        timeLeft += 40;
        audio.cue('bust');
        ui.toast(`Suspect apprehended! +${bonus}  ·  +40 s`, 2600);
        spawn();
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        const best = save.get('pursuit.best', { caught: 0, score: 0 });
        const record = caught > best.caught || (caught === best.caught && score > best.score);
        if (record) save.set('pursuit.best', { caught, score });
        audio.cue(caught ? 'finish' : 'fail');
        const s = { caught, score, record, best: record ? { caught, score } : best };
        api.stop();
        ui.showResults({
          title: caught ? `${caught} suspect${caught > 1 ? 's' : ''} caught` : 'They got away',
          lines: [`Score ${s.score}`, record ? 'New personal best!' : `Best: ${s.best.caught} caught · ${s.best.score}`],
          retry: () => api.start(),
        });
        return;
      }
      ui.updateMission({
        title: 'GARDA PURSUIT',
        big: fmt(timeLeft),
        sub: `Suspect ${Math.round(dist)} m  ·  Caught ${caught}  ·  ${score} pts`,
        meter: bust,
        warn: timeLeft < 15,
      });
    },
    // the player's car collides with the suspect; a hard hit slows them and fills the meter
    collide(c, r) {
      if (!active || !suspect) return null;
      let hit = null;
      for (const k of suspect.circles()) {
        let dx = c.x - k.x, dz = c.z - k.z;
        const d = Math.hypot(dx, dz), R = r + k.r;
        if (d >= R || d < 1e-4) continue;
        dx /= d; dz /= d;
        const depth = R - d;
        c.x += dx * depth; c.z += dz * depth;
        hit = { nx: dx, nz: dz, depth };
        if (flash <= 0 && Math.abs(player.speed - suspect.speed) > 2) {
          suspect.stunned = 1.4; suspect.speed *= 0.55; bust = Math.min(1, bust + 0.22); flash = 0.6;
        }
      }
      return hit;
    },
    blips() { return active && suspect ? [{ x: suspect.pos.x, z: suspect.pos.z, color: '#ff2d2d', pulse: true }] : []; },
  };
  return api;
}

export function fmt(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
