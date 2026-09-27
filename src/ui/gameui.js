// Game-mode UI: the Play menu, the mission panel (timer, meter), the countdown and the results card.
import { ROUTES, dailyRoute } from '../game/modes/trial.js';
import { fmt } from '../game/modes/pursuit.js';

export const save = {
  get(k, d) { try { const v = localStorage.getItem(`dublin.${k}`); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`dublin.${k}`, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export function createGameUI({ onPursuit, onTrial, onFree, onCar, trialInfo, toast }) {
  const root = document.getElementById('hud');
  root.insertAdjacentHTML('beforeend', `
    <div class="mission" id="mission" hidden>
      <div class="m-title"></div><div class="m-big"></div><div class="m-sub"></div>
      <div class="m-meter" hidden><i></i><span>BUST</span></div>
      <button class="m-quit" aria-label="Quit mode">Quit</button>
    </div>
    <div class="countdown" id="countdown"></div>
    <div class="panel sheet play" id="play" hidden></div>
    <div class="results" id="results" hidden></div>`);
  const $ = (id) => document.getElementById(id);
  const mission = $('mission'), cd = $('countdown'), play = $('play'), results = $('results');
  const q = (el, s) => el.querySelector(s);
  q(mission, '.m-quit').addEventListener('click', () => onFree());

  function renderPlay() {
    const pb = save.get('pursuit.best', null);
    const daily = dailyRoute();
    const routes = [...ROUTES, daily];
    const car = save.get('car', 'garda');
    play.innerHTML = `
      <header><h2>Play</h2><button class="close" aria-label="Close">&times;</button></header>
      <div class="cars">Your car:
        <button data-car="garda" class="${car === 'garda' ? 'on' : ''}">Garda i40 patrol</button>
        <button data-car="garda_rp" class="${car === 'garda_rp' ? 'on' : ''}">Roads Policing</button>
        <button data-car="hatch" class="${car === 'hatch' ? 'on' : ''}">i30 N</button>
      </div>`;
    play.innerHTML += `
      <button class="card pursuit" data-mode="pursuit">
        <b>Garda Pursuit</b>
        <small>A suspect is on the run: catch the red blip before the clock runs out. Stay close or ram them to fill the bust meter.</small>
        <em>${pb ? `Best: ${pb.caught} caught · ${pb.score} pts` : 'No record yet'}</em>
      </button>
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
    play.querySelectorAll('[data-car]').forEach((b) => b.addEventListener('click', () => { onCar(b.dataset.car); save.set('car', b.dataset.car); renderPlay(); }));
    play.querySelectorAll('[data-mode], [data-route]').forEach((b) => b.addEventListener('click', () => {
      play.hidden = true;
      if (b.dataset.mode === "pursuit") onPursuit();
      else if (b.dataset.mode === "free") onFree();
      else onTrial(routes.find((r) => r.id === b.dataset.route));
    }));
  }

  return {
    togglePlay(force) { const show = force ?? play.hidden; if (show) renderPlay(); play.hidden = !show; results.hidden = true; },
    get playOpen() { return !play.hidden; },
    showMission(kind) { mission.hidden = false; mission.className = `mission ${kind}`; q(mission, '.m-meter').hidden = kind !== 'pursuit'; results.hidden = true; },
    hideMission() { mission.hidden = true; },
    updateMission({ title, big, sub, meter, warn }) {
      q(mission, '.m-title').textContent = title;
      q(mission, '.m-big').textContent = big;
      q(mission, '.m-big').classList.toggle('warn', !!warn);
      q(mission, '.m-sub').textContent = sub;
      if (meter !== undefined) q(mission, '.m-meter i').style.width = `${Math.min(100, meter * 100)}%`;
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
