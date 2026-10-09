import { HELI_ENABLED } from '../game/heli.js';
// Game-mode UI: the Play menu, the mission panel (timer, meter), the countdown and the results card.
import { ROUTES, dailyRoute } from '../game/modes/trial.js';
import { fmt } from '../game/modes/pursuit.js';
import { CARS, paintFor } from '../game/carlist.js';

export const save = {
  get(k, d) { try { const v = localStorage.getItem(`dublin.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`dublin.${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export function createGameUI({ onPursuit, onTrial, onTaxi = () => {}, taxiBest = () => null, onFree, onCar, onPaint = () => {}, trialInfo, toast, gfx, flying = () => false }) {
  const root = document.getElementById('hud');
  root.insertAdjacentHTML('beforeend', `
    <div class="mission" id="mission" hidden>
      <div class="m-title"></div><div class="m-big"></div><div class="m-sub"></div>
      <div class="m-meter" hidden><i></i><span>BUST</span></div>
      <div class="m-arrow" hidden aria-hidden="true"></div>
      <button class="m-quit" aria-label="Quit mode">Quit</button>
    </div>
    <div class="countdown" id="countdown"></div>
    <div class="say" id="say" hidden></div>
    <div class="panel sheet play" id="play" hidden></div>
    <div class="results" id="results" hidden></div>`);
  const $ = (id) => document.getElementById(id);
  const mission = $('mission'), cd = $('countdown'), play = $('play'), results = $('results'), sayEl = $('say');
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
  const pursuitEl = q(mission, '.m-pursuit'), radioEl = $('p-radio'), bannerEl = $('p-banner'), flashEl = $('p-flash');
  let onRadio = () => {}, radioTimer = 0, bannerTimer = 0, flashTimer = 0;
  q(mission, '.m-radio').addEventListener('click', (e) => { e.currentTarget.blur(); onRadio(); });
  const STATUS = { close: 'On them', tail: 'Following', far: 'Far behind', losing: 'Losing them!' };

  function renderPlay() {
    const pb = save.get('pursuit.best', null);
    const daily = dailyRoute();
    const routes = [...ROUTES, daily];
    const car = flying() ? 'heli' : save.get('car', 'garda');
    play.innerHTML = `
      <header><h2>Play</h2><button class="close" aria-label="Close">&times;</button></header>
      <div class="cars">Your car:
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
      ${gfx ? `<div class="cars gfx">Graphics:
        ${gfx.modes.map((m) => `<button data-gfx="${m}" class="${gfx.get() === m ? 'on' : ''}">${gfx.names[m]}</button>`).join('')}
      </div>` : ''}`;
    play.innerHTML += `
      <button class="card pursuit" data-mode="pursuit">
        <b>Garda Pursuit</b>
        <small>A shift of callouts across the city. Respond, then take the suspect down: PIT them into a spin, ram them till the car is wrecked, box them in and hold them for the arrest. <kbd>E</kbd> radios Control for their location.</small>
        <em>${pb ? `Best: ${pb.caught} caught · ${pb.score} pts` : 'No record yet'}</em>
      </button>
      <h3>Dublin Taxi</h3>
      ${(() => { const tb = taxiBest(); return `
      <button class="card taxi" data-mode="taxi">
        <b>🚕 Day shift</b>
        <small>Six minutes behind the wheel of a Dublin taxi: pick up the waving fares and get them to the landmark or pub they ask for, quick and smooth.</small>
        <em>${tb ? `Best shift: €${tb.earnings.toFixed(2)} · ${tb.fares} fares` : 'No shift on the books yet'}</em>
      </button>
      <button class="card taxi" data-mode="taxi-night">
        <b>🌙 Night shift</b>
        <small>Same again after dark, when half the city wants a lift to the pub.</small>
      </button>`; })()}
      <h3>Time Trials</h3>
      ${routes.map((r) => {
        const info = trialInfo(r);
        const b = info.best;
        return `<button class="card trial" data-route="${r.id}">
          <b>${r.daily ? '📅 ' : ''}${r.name}${b && b.medal ? ` ${MEDAL[b.medal]}` : ''}</b>
          <small>${r.blurb} · ${(info.length / 1000).toFixed(1)} km (game scale)</small>
          <em>${b ? `Best ${fmt(b.time)}` : `Gold ${fmt(info.medals.gold)}`}</em>
        </button>`;
      }).join('')}
      <button class="card free" data-mode="free"><b>Free roam</b><small>Just drive.</small></button>`;
    q(play, '.close').onclick = () => { play.hidden = true; };
    play.querySelectorAll('[data-gfx]').forEach((b) => b.addEventListener('click', () => { gfx.set(b.dataset.gfx); renderPlay(); }));
    play.querySelectorAll('[data-paint]').forEach((b) => b.addEventListener('click', () => { onPaint(car, b.dataset.paint); renderPlay(); }));
    play.querySelectorAll('[data-car]').forEach((b) => b.addEventListener('click', () => { onCar(b.dataset.car); if (b.dataset.car !== 'heli') save.set('car', b.dataset.car); renderPlay(); }));
    play.querySelectorAll('[data-mode], [data-route]').forEach((b) => b.addEventListener('click', () => {
      play.hidden = true;
      if (b.dataset.mode === "pursuit") onPursuit();
      else if (b.dataset.mode === "free") onFree();
      else if (b.dataset.mode === 'taxi' || b.dataset.mode === 'taxi-night') onTaxi({ night: b.dataset.mode === 'taxi-night' });
      else onTrial(routes.find((r) => r.id === b.dataset.route));
    }));
  }

  return {
    togglePlay(force) { const show = force ?? play.hidden; if (show) renderPlay(); play.hidden = !show; results.hidden = true; },
    get playOpen() { return !play.hidden; },
    showMission(kind) { mission.hidden = false; mission.className = `mission ${kind}`; q(mission, '.m-meter').hidden = kind !== 'pursuit'; pursuitEl.hidden = kind !== 'pursuit'; results.hidden = true; },
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
    updateMission({ title, big, sub, meter, warn, arrow }) {
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
    showResults({ title, lines, medal, retry }) {
      results.innerHTML = `
        <div class="r-card">
          ${medal ? `<div class="r-medal">${MEDAL[medal]}</div>` : ''}
          <h2>${title}</h2>
          ${lines.map((l) => `<p>${l}</p>`).join('')}
          <div class="r-buttons"><button data-r="retry">Try again</button><button data-r="menu">Play menu</button><button data-r="free">Free roam</button></div>
        </div>`;
      results.hidden = false;
      results.querySelector('[data-r="retry"]').onclick = () => { results.hidden = true; retry(); };
      results.querySelector('[data-r="menu"]').onclick = () => { results.hidden = true; renderPlay(); play.hidden = false; };
      results.querySelector('[data-r="free"]').onclick = () => { results.hidden = true; onFree(); };
    },
    get resultsOpen() { return !results.hidden; },
    toast,
  };
}
