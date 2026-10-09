// The "one more go" loop shared by the game modes: date keys and a seeded RNG for the dailies (the same fares,
// callouts and route for everyone on a given day), a seeded start spot, the local daily streak, "how close" lines
// for the results card, the share card text and the run summary.
//
// RUN SUMMARY (one small JSON object per finished run; the leaderboard build will submit it, nothing here sends it):
// {
//   v: 1,                       // summary schema version
//   mode: 'taxi' | 'pursuit' | 'trial',
//   variant: string,            // taxi: 'casual' | 'shift6' | 'shift15' | 'daily'; pursuit: 'free' | 'daily';
//                               // trial: 'daily' or the route id ('liffey', 'georgian', 'templebar')
//   board: string,              // `${mode}:${variant}`: the leaderboard a ranked run would go on
//   date: 'YYYY-MM-DD' | null,  // the daily's date (local time), null for unseeded runs
//   seed: number | null,        // the daily's RNG seed (uint32), null for unseeded runs
//   duration: number,           // seconds of play (1 dp)
//   score: number,              // taxi: euro earned (2 dp); pursuit: points; trial: time in seconds (3 dp, lower is better)
//   scoreKind: 'euro' | 'points' | 'time',
//   medal: 'gold' | 'silver' | 'bronze' | null,
//   stats: { ... },             // the mode's key numbers (see each mode's summary())
//   events: { ... },            // event counts (pickups, knocks, PITs, rams, ...)
//   log: [ ... ],               // compact per-fare / per-call / per-checkpoint rows (see each mode)
//   endedAt: ISO 8601 string    // when the run ended (client clock)
// }
// No nickname, location or device data: the leaderboard build adds a nickname only when the player enters one.
import { world, v2, laneOffset } from '../../world/geo.js';

export const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };

// local calendar date as 'YYYY-MM-DD' (a Date, or a key passed through)
export function dateKey(date = new Date()) {
  if (typeof date === 'string') return date;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const keyToDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
export function addDays(key, n) { const d = keyToDate(key); d.setDate(d.getDate() + n); return dateKey(d); }
export function shortDate(key) { return keyToDate(key).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }); }

// string -> uint32 seed, and a xorshift32 generator in [0, 1) (no Math.random anywhere in a seeded path)
export function seedOf(str) {
  let seed = 0;
  for (const ch of str) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return seed || 0x9e3779b9;
}
export function makeRand(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// a seeded start spot for a daily: on a main road within ~1.1 km of the Spire, in the left lane, facing along it
let starts = null;
export function seededStart(rand) {
  if (!starts) {
    const c = world.nodes.get('OC2') || { x: 0, z: 0 };
    starts = world.edges.filter((e) => e.car && e.len > 40 && !e.way.bridge && !e.way.pedestrian && ['primary', 'secondary', 'quay', 'boulevard', 'tertiary'].includes(e.way.type)
      && Math.hypot((e.from.x + e.to.x) / 2 - c.x, (e.from.z + e.to.z) / 2 - c.z) < 1100);
    if (!starts.length) starts = world.edges.filter((e) => e.car && e.len > 40 && !e.way.bridge);
  }
  const e = starts[Math.floor(rand() * starts.length)];
  const d = v2.norm(v2.sub(e.to, e.from)), off = laneOffset(e.way), p = v2.lerp(e.from, e.to, 0.35);
  return { x: p.x + d.z * off, z: p.z - d.x * off, heading: Math.atan2(d.x, d.z) };
}

// ---- daily streak: consecutive days with at least one daily run finished (local only) ----
export function streak(save, today = dateKey()) {
  const s = save.get('daily.streak', null);
  if (!s || !s.last) return { n: 0, today: false, best: 0 };
  if (s.last === today) return { n: s.n, today: true, best: s.best || s.n };
  if (s.last === addDays(today, -1)) return { n: s.n, today: false, best: s.best || s.n };
  return { n: 0, today: false, best: s.best || 0 };
}
// a daily was finished on `day` (the daily's own date: a run that started before midnight still counts for it)
export function markDaily(save, day = dateKey()) {
  const s = save.get('daily.streak', null) || { last: null, n: 0, best: 0 };
  if (s.last === day) return streak(save, day);
  const n = s.last === addDays(day, -1) ? s.n + 1 : 1;
  save.set('daily.streak', { last: day, n, best: Math.max(n, s.best || 0) });
  return streak(save, day);
}
export const streakText = (st) => (st.n > 0 ? `🔥 ${st.n}-day streak` : '');

// ---- how close: the gap to your best and to the next medal, and a next target ----
// medals: [['bronze', v], ['silver', v], ['gold', v]]; gap(d): '€6.40' / '0.84 s' / '2 arrests'; show(v): the value
export function howClose({ value, best, medals, higher = true, gap, show }) {
  const reached = (t) => (higher ? value >= t : value <= t);
  const beat = (a, b) => (higher ? a > b : a < b);
  const lines = [];
  if (best == null) lines.push('First run on the books!');
  else if (beat(value, best)) lines.push(`New best! ${gap(Math.abs(value - best))} better than ${show(best)}`);
  else if (value === best) lines.push(`Level with your best (${show(best)})`);
  else lines.push(`${gap(Math.abs(best - value))} off your best (${show(best)})`);
  const next = medals.find(([, t]) => !reached(t));
  if (next) lines.push(`${gap(Math.abs(next[1] - value))} off ${next[0]} (${show(next[1])})`);
  else lines.push('Gold medal!');
  // next target: the nearest goal still ahead (your best, or the next medal)
  const goals = [];
  if (best != null && !beat(value, best) && value !== best) goals.push({ v: best, label: 'your best' });
  if (next) goals.push({ v: next[1], label: `${MEDAL[next[0]]} ${next[0]}` });
  goals.sort((a, b) => Math.abs(a.v - value) - Math.abs(b.v - value));
  const g = goals[0];
  const target = g ? `Next target: ${show(g.v)} for ${g.label}` : `Next target: beat ${show(higher ? Math.max(value, best ?? value) : Math.min(value, best ?? value))}`;
  return { lines, target };
}
export function medalFor(value, medals, higher = true) {
  let m = null;
  for (const [name, t] of medals) if (higher ? value >= t : value <= t) m = name;
  return m;
}

// ---- share card: short text, no personal data, the game's own link ----
export function gameLink() {
  try { return `${location.origin}${location.pathname.replace(/index\.html$/, '')}`; } catch { return ''; }
}
// row: an emoji string (one per fare / call / checkpoint group)
export function shareText({ icon, title, date, score, extra, medal, row }) {
  const head = `${icon} Dublin Drive: ${title}${date ? ` ${shortDate(date)}` : ''}`;
  const body = [score, extra, medal ? MEDAL[medal] : ''].filter(Boolean).join(' · ');
  const link = gameLink();
  let r = row || '';
  const build = () => [`${head} · ${body}`, r, link].filter(Boolean).join('\n');
  while (build().length >= 200 && r) r = [...r].slice(0, -2).join(''); // trim the emoji row first
  return build().slice(0, 199);
}
export const emojiRow = (items, max = 12) => (items.length > max ? `${items.slice(0, max).join('')}+${items.length - max}` : items.join(''));

export function runSummary({ mode, variant, date = null, seed = null, duration, score, scoreKind, medal = null, stats = {}, events = {}, log = [] }) {
  return {
    v: 1, mode, variant, board: `${mode}:${variant}`, date, seed,
    duration: Math.round(duration * 10) / 10,
    score: scoreKind === 'time' ? Math.round(score * 1000) / 1000 : Math.round(score * 100) / 100,
    scoreKind, medal: medal || null, stats, events, log,
    endedAt: new Date().toISOString(),
  };
}
