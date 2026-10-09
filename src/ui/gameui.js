import { HELI_ENABLED } from '../game/heli.js';
// Game-mode UI: the Play menu, the mission panel (timer, meter), the countdown and the results card.
import { ROUTES, dailyRoute } from '../game/modes/trial.js';
import { fmt } from '../game/modes/pursuit.js';
import { CARS, paintFor } from '../game/carlist.js';
import { MEDAL, dateKey, shortDate, streak } from '../game/modes/runs.js';

export const save = {
  get(k, d) { try { const v = localStorage.getItem(`dublin.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`dublin.${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

export function createGameUI({ onPursuit, onTrial, onTaxi = () => {}, taxiBest = () => null, onFree, onCar, onPaint = () => {}, trialInfo, toast, gfx, flying = () => false }) {
  const root = document.getElementById('hud');
  root.insertAdjacentHTML('beforeend', `
    <div class="mission" id="mission" hidden>
      <div class="m-title"></div>
      <div class="m-score" hidden><i></i><b></b><span></span><em class="m-gain"></em></div>
      <div class="m-big"></div><div class="m-sub"></div>
      <div class="m-meter" hidden><i></i><span>BUST</span></div>
      <div class="m-arrow" hidden aria-hidden="true"></div>
      <button class="m-quit" aria-label="Quit mode">Quit</button>
    </div>
    <div class="countdown" id="countdown"></div>
    <div class="say" id="say" hidden></div>
    <div class="panel sheet play" id="play" hidden></div>
    <div class="results" id="results" hidden></div>
    <div class="welcome" id="welcome" hidden></div>`);
  const $ = (id) => document.getElementById(id);
  const mission = $('mission'), cd = $('countdown'), play = $('play'), results = $('results'), sayEl = $('say'), welcome = $('welcome');
  let sayTimer = 0;
  const q = (el, s) => el.querySelector(s);
  q(mission, '.m-quit').addEventListener('click', () => onFree());

  // Garda Pursuit extras: the takedown prompt, the distance chip, the radio call-in button (touch), the Control
  // radio banner, the big result banner and quick impact flashes
  mission.insertAdjacentHTML('beforeend', `
    <div class="m-pursuit" hidden>
      <div class="m-status"><i></i><span></span></div>
      <div class="m-prompt"></div>
      <button class="m-radio" aria-label="Radio Control for the suspect's location">📻 Radio <kbd>E</kbd> <b></b></button>
    </div>`);
  root.insertAdjacentHTML('beforeend', `
    <div class="p-radio" id="p-radio" hidden><b>CONTROL</b><span></span></div>
    <div class="p-banner" id="p-banner" hidden><h2></h2><p></p></div>
    <div class="p-flash" id="p-flash"></div>`);
  // the heat row (Garda Pursuit): tier pips and name, what an arrest buys, the arrest streak multiplier
  q(mission, '.m-pursuit').insertAdjacentHTML('afterbegin', '<div class="m-heat"><span class="h-pips"></span><b></b><em></em></div>');
  const pursuitEl = q(mission, '.m-pursuit'), radioEl = $('p-radio'), bannerEl = $('p-banner'), flashEl = $('p-flash');
  let onRadio = () => {}, radioTimer = 0, bannerTimer = 0, flashTimer = 0;
  q(mission, '.m-radio').addEventListener('click', (e) => { e.currentTarget.blur(); onRadio(); });
  const STATUS = { close: 'On them', tail: 'Following', far: 'Far behind', losing: 'Losing them!' };

  // the three game cards: what it is, one line on how to play, the record, and a big Start button. Starting a mode
  // puts the player in the right vehicle (main.js); the garage car is for free roam and the trials.
  function gameCards() {
    const pb = save.get('pursuit.best', null);
    const tb = taxiBest('casual'), t6 = taxiBest('shift6');
    const daily = dailyRoute();
    const di = trialInfo(daily), db = di.best;
    return `<div class="games">
      <div class="game pursuit">
        <div class="g-head"><span class="g-icon" aria-hidden="true">🚓</span><b>Garda Pursuit</b></div>
        <small>Catch the suspect: ram them, PIT them into a spin, or box them in to arrest.</small>
        <em>${pb && pb.caught ? `Best: ${pb.caught} caught · ${pb.score} pts` : 'Medals at 2, 4 and 6 arrests'}</em>
        <div class="g-buttons"><button class="g-start" data-mode="pursuit">Start</button></div>
      </div>
      <div class="game taxi">
        <div class="g-head"><span class="g-icon" aria-hidden="true">🚕</span><b>Dublin Taxi</b></div>
        <small>Stop beside a waving fare, drive them where they ask. Each fare buys time.</small>
        <em>${tb ? `Best: €${tb.earnings.toFixed(2)} · ${tb.fares} fares` : t6 ? `Best 6-min shift: €${t6.earnings.toFixed(2)}` : 'You drive the taxi'}</em>
        <div class="g-buttons"><button class="g-start" data-mode="taxi">Start</button><button class="g-alt" data-mode="taxi-night" title="Night shift: busy pubs">🌙 Night</button></div>
        <div class="g-more">Fixed shift: <button data-mode="taxi6" title="Six minutes: how much can you earn?">6 min</button><button data-mode="taxi15" title="Fifteen minutes: how much can you earn?">15 min</button></div>
      </div>
      <div class="game trial">
        <div class="g-head"><span class="g-icon" aria-hidden="true">⏱</span><b>Time Trials</b></div>
        <small>Drive through the checkpoints against the clock. Today's Daily Route: ${(di.length / 1000).toFixed(1)} km.</small>
        <em>${db ? `Daily best ${fmt(db.time)}${db.medal ? ` ${MEDAL[db.medal]}` : ''}` : `Gold ${fmt(di.medals.gold)} · your own car`}</em>
        <div class="g-buttons"><button class="g-start" data-route="${daily.id}">Start</button></div>
      </div>
    </div>`;
  }
  // today's dailies: the same fares, callouts and route for everyone today, and the streak
  function dailies(compact = false) {
    const today = dateKey(), st = streak(save, today);
    const td = save.get('taxi.daily', null), pd = save.get('pursuit.daily', null);
    const tdb = td && td.date === today && td.best, pdb = pd && pd.date === today && pd.best;
    const route = dailyRoute(), rb = trialInfo(route).best;
    const head = st.n ? `🔥 ${st.n}-day streak${st.today ? '' : ': play a daily to keep it'}` : 'Play one each day to build a streak 🔥';
    return `<div class="dailies${compact ? ' compact' : ''}">
      <div class="d-head"><b>Today's dailies</b><span>${shortDate(today)} · same for everyone</span><span class="d-streak${st.n ? ' on' : ''}">${head}</span></div>
      <div class="d-buttons">
        <button data-daily="taxi">🚕 Daily Shift<small>${tdb ? `✓ €${tdb.earnings.toFixed(2)}` : '6 min · same fares'}</small></button>
        <button data-daily="pursuit">🚓 Daily Callouts<small>${pdb ? `✓ ${pdb.caught} caught` : 'same calls'}</small></button>
        <button data-route="${route.id}">⏱ Daily Route<small>${rb ? `✓ ${fmt(rb.time)}` : `${(trialInfo(route).length / 1000).toFixed(1)} km`}</small></button>
      </div>
    </div>`;
  }
  function startMode(d) {
    save.set('played', true);
    document.querySelector('.toolbar .play-btn')?.classList.remove('first');
    if (d.mode === 'pursuit') onPursuit();
    else if (d.mode === 'free') onFree();
    else if (d.mode === 'taxi' || d.mode === 'taxi-night') onTaxi({ night: d.mode === 'taxi-night', variant: 'casual' });
    else if (d.mode === 'taxi6' || d.mode === 'taxi15') onTaxi({ variant: d.mode === 'taxi6' ? 'shift6' : 'shift15' });
    else if (d.daily === 'taxi') onTaxi({ variant: 'daily' });
    else if (d.daily === 'pursuit') onPursuit({ variant: 'daily' });
    else if (d.route) { const daily = dailyRoute(); onTrial(d.route === daily.id ? daily : ROUTES.find((r) => r.id === d.route)); }
  }
  function focusFirst(el) { if (document.documentElement.classList.contains('pad')) q(el, '.g-start')?.focus(); }

  function renderPlay() {
    const car = flying() ? 'heli' : save.get('car', 'garda');
    play.innerHTML = `
      <header><h2>Play</h2><button class="close" aria-label="Close">&times;</button></header>
      ${dailies()}
      ${gameCards()}
      <h3>More time trials</h3>
      <div class="routes">
        ${ROUTES.map((r) => {
          const b = trialInfo(r).best;
          return `<button class="route" data-route="${r.id}" title="${r.blurb}">${r.name}${b && b.medal ? ` ${MEDAL[b.medal]}` : ''}<small>${b ? fmt(b.time) : r.blurb}</small></button>`;
        }).join('')}
      </div>
      <h3>Garage · free roam car</h3>
      <div class="cars">
        ${Object.entries(CARS).map(([k, c]) => `<button data-car="${k}" class="${car === k ? 'on' : ''}" title="${c.name}">${c.label}</button>`).join('')}
        ${HELI_ENABLED ? `<button data-car="heli" class="${car === 'heli' ? 'on' : ''}" title="Garda Air Support Unit helicopter (L)">🚁 Helicopter</button>` : ''}
      </div>
      ${CARS[car] ? `<p class="car-blurb">${CARS[car].blurb}</p>` : ''}
      ${CARS[car] && CARS[car].paints ? (() => {
        const cur = paintFor(car, save.get(`paint.${car}`, null));
        return `<div class="cars paints">Colour:
          ${CARS[car].paints.map((pt) => `<button data-paint="${pt.id}" class="swatch ${pt.id === cur.id ? 'on' : ''}" title="${pt.label}" aria-label="${pt.label}" style="--sw:${pt.color}"></button>`).join('')}
          <span class="paint-name">${cur.label}</span>
        </div>`;
      })() : ''}
      <button class="free" data-mode="free">Just drive (free roam)</button>
      ${gfx ? `<div class="cars gfx">Graphics:
        ${gfx.modes.map((m) => `<button data-gfx="${m}" class="${gfx.get() === m ? 'on' : ''}">${gfx.names[m]}</button>`).join('')}
      </div>` : ''}`;
    q(play, '.close').onclick = () => { play.hidden = true; };
    play.querySelectorAll('[data-gfx]').forEach((b) => b.addEventListener('click', () => { gfx.set(b.dataset.gfx); renderPlay(); }));
    play.querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => { onPaint(car, b.dataset.paint); renderPlay(); }));
    play.querySelectorAll('[data-car]').forEach((b) => b.addEventListener('click', () => { onCar(b.dataset.car); if (b.dataset.car !== 'heli') save.set('car', b.dataset.car); renderPlay(); }));
    play.querySelectorAll('[data-mode], [data-route], [data-daily]').forEach((b) => b.addEventListener('click', () => { play.hidden = true; startMode(b.dataset); }));
  }

  // first visit: a short, skippable welcome once the city has loaded
  function showWelcome() {
    welcome.innerHTML = `
      <div class="w-card" role="dialog" aria-label="Welcome">
        <h2>Welcome to Dublin Drive</h2>
        <p>Drive around Dublin — or pick a game:</p>
        ${gameCards()}
        ${dailies(true)}
        <div class="w-foot"><button class="w-skip" data-w="skip">Just drive</button><span>Games are always under <b>▶ Play</b>${matchMedia('(pointer: coarse)').matches ? '' : ' (<kbd>G</kbd>)'}.</span></div>
      </div>`;
    welcome.hidden = false;
    welcome.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      hideWelcome();
      if (b.dataset.w !== 'skip') startMode(b.dataset);
    }));
    focusFirst(welcome);
  }
  function hideWelcome() {
    if (welcome.hidden) return;
    save.set('welcomed', true);
    welcome.hidden = true; welcome.innerHTML = '';
  }

  // the big shift counter (taxi takings, suspects caught): counts up and pops when it goes up
  const scoreEl = q(mission, '.m-score'), gainEl = q(scoreEl, '.m-gain');
  const sc = { shown: 0, target: 0, kind: 'count', raf: 0, from: 0, t0: 0 };
  const fmtScore = (v) => (sc.kind === 'euro' ? `€${v.toFixed(2)}` : `${Math.round(v)}`);
  function tickScore() {
    const k = Math.min(1, (performance.now() - sc.t0) / 700), e = 1 - (1 - k) ** 3;
    sc.shown = sc.from + (sc.target - sc.from) * e;
    q(scoreEl, 'b').textContent = fmtScore(sc.shown);
    sc.raf = k < 1 ? requestAnimationFrame(tickScore) : 0;
  }
  function setScore(s) {
    if (!s) { scoreEl.hidden = true; return; }
    scoreEl.hidden = false;
    sc.kind = s.kind || 'count';
    q(scoreEl, 'i').textContent = s.icon || '';
    q(scoreEl, 'span').textContent = s.label || '';
    if (s.value > sc.target + 1e-6) {
      gainEl.textContent = `+${fmtScore(s.value - sc.target)}`;
      clearTimeout(sc.gainT); sc.gainT = setTimeout(() => { gainEl.textContent = ''; }, 1400);
      sc.from = sc.shown; sc.target = s.value; sc.t0 = performance.now();
      cancelAnimationFrame(sc.raf); sc.raf = requestAnimationFrame(tickScore);
      scoreEl.classList.remove('pop'); void scoreEl.offsetWidth; scoreEl.classList.add('pop');
    } else if (s.value !== sc.target) { sc.shown = sc.target = s.value; }
    if (!sc.raf) q(scoreEl, 'b').textContent = fmtScore(sc.shown);
  }
  // results state, the Enter key for retry, and sharing (the Web Share sheet on phones, the clipboard elsewhere,
  // and the text shown to copy by hand if neither works)
  let lastRun = null, lastShare = '', retryFn = null;
  const coarse = matchMedia('(pointer: coarse)').matches;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.repeat || results.hidden || !retryFn) return;
    const f = document.activeElement;
    if (f && f.tagName === 'BUTTON' && results.contains(f) && f.dataset.r !== 'retry') return; // (Enter on another button presses that one)
    e.preventDefault(); retryFn();
  });
  async function shareRun(text, box) {
    const showText = (msg) => { box.value = text; box.hidden = false; box.select(); if (msg) toast(msg, 2500); };
    if (coarse && navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast('Result copied: paste it anywhere', 2200); showText(); return; } catch { /* no clipboard access */ }
    showText('Copy the text below to share');
  }
  return {
    togglePlay(force) {
      hideWelcome();
      const show = force ?? play.hidden;
      if (show) { renderPlay(); save.set('played', true); document.querySelector('.toolbar .play-btn')?.classList.remove('first'); }
      play.hidden = !show; results.hidden = true;
      if (show) focusFirst(play);
    },
    get playOpen() { return !play.hidden || !welcome.hidden; },
    // first visit only (or forced, for the tests): the welcome card; the Play button pulses until a game is opened
    welcome(force = false) {
      if (!save.get('played', false)) document.querySelector('.toolbar .play-btn')?.classList.add('first');
      if (force || !save.get('welcomed', false)) showWelcome();
    },
    get welcomeOpen() { return !welcome.hidden; },
    showMission(kind) {
      mission.hidden = false; mission.className = `mission ${kind}`; q(mission, '.m-meter').hidden = kind !== 'pursuit'; pursuitEl.hidden = kind !== 'pursuit'; results.hidden = true;
      cancelAnimationFrame(sc.raf); sc.raf = 0; sc.shown = sc.target = 0; scoreEl.hidden = true; gainEl.textContent = ''; scoreEl.classList.remove('pop');
    },
    hideMission() { mission.hidden = true; radioEl.hidden = true; },
    // Garda Pursuit
    onRadio(fn) { onRadio = fn; },
    updatePursuit({ meterLabel, prompt, status, urgent, radio, lost }) {
      q(mission, '.m-meter span').textContent = meterLabel;
      const p = q(pursuitEl, '.m-prompt');
      p.textContent = prompt; p.classList.toggle('urgent', !!urgent);
      const st = q(pursuitEl, '.m-status');
      st.className = `m-status ${status}`;
      q(st, 'span').textContent = STATUS[status] || '';
      q(st, 'i').style.width = `${status === 'losing' ? Math.round((1 - lost) * 100) : { close: 100, tail: 66, far: 33 }[status]}%`;
      const rb = q(pursuitEl, '.m-radio');
      q(rb, 'b').textContent = `×${radio}`; rb.disabled = radio <= 0;
    },
    radio(text, ms = 3500) {
      q(radioEl, 'span').textContent = text; radioEl.hidden = false;
      radioEl.classList.remove('in'); void radioEl.offsetWidth; radioEl.classList.add('in');
      clearTimeout(radioTimer); radioTimer = setTimeout(() => { radioEl.hidden = true; }, ms);
    },
    banner(title, sub, ms = 3000) {
      q(bannerEl, 'h2').textContent = title; q(bannerEl, 'p').textContent = sub; bannerEl.hidden = false;
      clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { bannerEl.hidden = true; }, ms);
    },
    flash(text) {
      flashEl.textContent = text; flashEl.classList.remove('show'); void flashEl.offsetWidth; flashEl.classList.add('show');
      clearTimeout(flashTimer); flashTimer = setTimeout(() => flashEl.classList.remove('show'), 900);
    },
    score: setScore,
    updateMission({ title, big, sub, meter, warn, arrow, score, heat }) {
      setScore(score);
      if (heat) {
        const h = q(pursuitEl, '.m-heat');
        h.dataset.heat = heat.n;
        q(h, '.h-pips').innerHTML = Array.from({ length: heat.of }, (_, i) => `<i class="${i < heat.n ? 'on' : ''}"></i>`).join('');
        q(h, 'b').textContent = `HEAT ${heat.n} · ${heat.name.toUpperCase()}`;
        q(h, 'em').textContent = `Arrest +${heat.bonus} s${heat.mult > 1 ? ` · streak ×${heat.mult}` : ''}`;
      }
      const ar = q(mission, '.m-arrow');
      ar.hidden = arrow == null;
      if (arrow != null) ar.style.transform = `rotate(${(-arrow * 180) / Math.PI}deg)`;
      q(mission, '.m-title').textContent = title;
      q(mission, '.m-big').textContent = big;
      q(mission, '.m-big').classList.toggle('warn', !!warn);
      q(mission, '.m-sub').textContent = sub;
      if (meter !== undefined) q(mission, '.m-meter i').style.width = `${Math.min(100, meter * 100)}%`;
    },
    // a passenger's speech bubble (null hides it)
    say(text, ms = 4000) {
      clearTimeout(sayTimer);
      sayEl.hidden = !text;
      if (!text) return;
      sayEl.textContent = text;
      sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop');
      sayTimer = setTimeout(() => { sayEl.hidden = true; }, ms);
    },
    countdown(text) { cd.textContent = text || ''; cd.classList.toggle('show', !!text); },
    // the results card: title, medal, lines, the how-close lines and next target, and one-tap retry (Enter / A),
    // share, the Play menu and free roam. summary: the run summary (runs.js), kept for the leaderboard build and
    // announced as a 'dublin:run' window event (nothing is sent anywhere)
    showResults({ title, lines = [], medal, retry, close = [], target = '', share = '', daily = null, summary = null }) {
      lastRun = summary; lastShare = share;
      clearTimeout(bannerTimer); bannerEl.hidden = true; // (a heat banner from the last call would sit over the card)
      if (summary) try { window.dispatchEvent(new CustomEvent('dublin:run', { detail: summary })); } catch { /* old browsers */ }
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      results.innerHTML = `
        <div class="r-card">
          ${medal ? `<div class="r-medal">${MEDAL[medal]}</div>` : ''}
          <h2>${esc(title)}</h2>
          ${daily ? `<p class="r-daily">${esc(daily)}</p>` : ''}
          ${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
          ${close.length ? `<div class="r-close">${close.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
          ${target ? `<p class="r-target">${esc(target)}</p>` : ''}
          <div class="r-buttons"><button data-r="retry">↻ Try again${coarse ? '' : ' <kbd>Enter</kbd>'}</button>${share ? '<button data-r="share">Share</button>' : ''}<button data-r="menu">Play menu</button><button data-r="free">Free roam</button></div>
          <textarea class="r-sharetext" readonly hidden rows="3"></textarea>
        </div>`;
      results.hidden = false;
      retryFn = () => { if (results.hidden) return; results.hidden = true; retry(); };
      results.querySelector('[data-r="retry"]').onclick = retryFn;
      results.querySelector('[data-r="menu"]').onclick = () => { results.hidden = true; renderPlay(); play.hidden = false; focusFirst(play); };
      results.querySelector('[data-r="free"]').onclick = () => { results.hidden = true; onFree(); };
      const sb = results.querySelector('[data-r="share"]');
      if (sb) sb.onclick = () => shareRun(share, results.querySelector('.r-sharetext'));
      if (document.documentElement.classList.contains('pad')) results.querySelector('[data-r="retry"]').focus();
    },
    get lastRun() { return lastRun; },
    get lastShare() { return lastShare; },
    get resultsOpen() { return !results.hidden; },
    toast,
  };
}
