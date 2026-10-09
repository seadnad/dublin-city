# Game design review: retention, onboarding, leaderboards

Status: research only (no `src/` changes). Written 2026-10-09 against `main` @ 160db95.
Files read: `src/ui/gameui.js`, `src/ui/hud.js`, `src/main.js` (startup), `src/game/modes/{pursuit,callouts,pursuitkit,taxi,trial}.js`, `src/game/carlist.js`.

The audience: Dublin locals and Irish Reddit following a shared link, mostly on phones, some on a laptop at lunch. No install and no accounts. They come for "I can drive down my street". Whether they stay depends on whether, within about a minute, the game hands them something to *do* there and a number they want to beat.

---

## 1. Diagnosis: why sessions end early

### First 30 seconds

| What happens | Evidence | Effect |
|---|---|---|
| The intro lands you in free roam with no goal | `main.js` ends the aerial intro in the chase cam with `frozen = false`, and the only prompt is a toast: `'Tap ? for help'` / `'Press H for controls, T for landmarks'` (main.js:760) | The first thing on offer is the help sheet, not play. The game modes stay hidden until the player spots the Play button in a toolbar of nine icons. |
| "Play" is one icon among nine | `hud.js` toolbar: Play, Rain, Night, Camera, Photo, Map, Places, Sound, Help, all given the same weight | Rain and Night are toys. Play is the actual game, but nothing marks it out. |
| The Play sheet asks for setup first | `gameui.js renderPlay()`: **Your car** row (5 or 6 buttons), then **Colour** swatches, then the **Graphics** row, and only then the mode cards | On a phone the first screenful is configuration. The player has to choose a car before they know what they're choosing it for. This is the "pick a car, then a game" confusion. |
| The car and the mode don't fit together | Taxi forces the taxi (`ensureCar` in main.js:347). Pursuit doesn't force the Garda car, so you can run a "Garda Pursuit" in a taxi. The default car is `garda` | The car choice either gets overridden (Taxi) or produces something odd (Pursuit in a hatch). The two steps feel unrelated because they mostly are. |
| The help text is out of date | `hud.js` help row: "G: Play: Garda Pursuit, Time Trials" (Taxi isn't listed) | A small thing, but it shows the modes were never treated as the front door. |
| Mode cards are walls of text | The Pursuit card has a 40-word rules paragraph (PIT, ram, box-in, radio) | Mobile readers skim. The rules should come up during play, at the moment they apply. |

### First 3 minutes

| What happens | Evidence | Effect |
|---|---|---|
| Free roam has no small goals | No collectibles, no discoveries, no "drive to X" prompts outside the modes | Once you've found your street (60 to 90 s) there's no reason to keep driving. |
| Pursuit starts by driving to the call | `pickCallout` puts the suspect 350–1100 m away, in the `unaware` stage | The first 30–60 s of the "action" mode is commuting. That's fine for a veteran, but it kills the first try. |
| Pursuit difficulty ramps but the stakes are hidden | `TUNE.shiftTime 210`, +60 s per arrest, −15 s per lost suspect, level++ each arrest | The extend-on-success clock is a good arcade design (Crazy Taxi), but the HUD never says "catch them for +60 s", so new players read it as a flat 3.5-minute timer. |
| Taxi's first fare comes with a lesson | Hail spot 90–380 m away; you must stop within 10 m below 1.5 m/s for 0.5 s; the hint only appears once you pass within 30 m too fast | Overshooting is common and the fix is only explained after you've failed. The first pickup takes about 40–60 s. |
| Results screens end the moment | `showResults`: title, two lines, then Try again / Play menu / Free roam | There's no share button, no "next goal", no unlock progress and no comparison with other people. A personal best is the only hook, and on a first run there isn't one ("No record yet"). |
| Scores mean nothing to anyone else | Everything goes to `localStorage` (`dublin.pursuit.best`, `dublin.taxi.best`, `dublin.trial.<id>`) | The Daily Route is seeded "the same for everyone on a given day" (trial.js), but nobody can see anyone else's time. Its best social feature is invisible. |
| Nothing carries over between modes or sessions | No currency, unlocks, achievements or streaks | Cars and paints are all unlocked from the start, so there's nothing to earn and no reason to come back tomorrow. |

**In short:** the game has three good arcade loops but presents itself as a sandbox with a settings menu. Fixes, in order: (a) a single obvious way into a mode within 5 s of landing, (b) action within 15 s of choosing a mode, (c) a reason for another run (a target, a share, an unlock), and (d) a reason to come back tomorrow (a daily challenge that other people are playing too).

---

## 2. Techniques from comparable games

Effort: **S** is under a day for one agent, **M** is 1–3 days, **L** is more than that or needs a backend.

| Technique (source) | What it is / why it works | How it maps onto Dublin Drive | Effort |
|---|---|---|---|
| **Extend-on-success clock** (Crazy Taxi) | Each fare adds seconds, so good play buys more play. "One more fare" tension, and a run can last a long time if you're good. | Pursuit already does this (+60 s). **Taxi doesn't**: it's a flat 360 s. Add +8–15 s per fare scaled by distance, start at 90 s, and make the clock the loudest thing on the HUD ("+12 s!"). Keep a fixed-length "Ranked shift" variant for leaderboards (see §4). | S |
| **Instant skill feedback / near-miss chains** (Burnout, Forza Horizon skill chains) | Constant small rewards for driving in style: drift, near miss, air, slipstream. A chain multiplier that a crash wipes out adds risk. | Track near misses against `traffic`/Luas/DART (pass within 1.5 m at more than 12 m/s), drift time (handbrake slip angle), Luas-track dodges, "wrong side" seconds. In Taxi, show them as a "Thrill" tip multiplier (Crazy Taxi's "crazy through"), set against the "smooth ride" tip. Give each fare a passenger type: *Late for the train* wants thrills, *Granny from Cabra* wants smooth. That makes the trade-off a choice. | M |
| **Events everywhere** (Burnout Paradise: stop at any light and spin the wheels to start an event) | No menu. The world is the menu, and you're always five seconds from a challenge. | Put **street starts** at landmarks: drive into a glowing ring at the Spire or College Green and a time trial, or "Get to Croker in 60 s", begins. The Taxi hail beacon and the trial gates already exist as meshes, so reuse them. Free roam becomes the hub. | M |
| **Side missions with local flavour** (GTA odd jobs: taxi, vigilante, ambulance) | Short, repeatable jobs that use the vehicle you're in. | It's already there: Garda car means Pursuit, taxi means Taxi. Make it **contextual**: in a Garda car, a radio call pops up in free roam ("Control: any unit near Capel Street?") with a one-key accept. In the taxi, waving passengers appear. Cuts the menu out. Later: a **Dublin Bus**-style "deliveries" job (Deliveroo bike on the GT), and a **Luas driver** schedule run. | S (contextual prompts), M (new jobs) |
| **Heat levels** (Need for Speed: Most Wanted) | Escalation you can see: heat 1–5 with named tiers, each bringing tougher pursuers and roadblocks. | Pursuit already escalates (`level`, backups `[0,1,1,2]`, roadblocks from round 1, `topPerLevel`) but never says so. Show named tiers: *Joyrider → Getaway → Gang → Most Wanted*, with a banner on each step. And the reverse mode: **you're the getaway car** (Driver's undercover idea flipped, NFS heat): survive N minutes with the Gardaí's existing `Driver`/backup AI chasing you. Probably the most shareable mode for r/ireland ("evaded the Guards down Sheriff Street"). | S (tiers), L (reverse mode) |
| **Undercover tension** (Driver) | Missions where *not* drawing attention is the skill. | **Night-shift taxi with a nervous passenger**: lights off, no siren, keep under 50 km/h past the Garda checkpoint on Dorset Street. Or an "unmarked car" stakeout callout: tail the suspect without being spotted (`spotQuiet` 65 m already exists) to find the stash, then arrest. Uses `stage === 'unaware'`. | M |
| **Daily seeded challenge** (GeoGuessr daily, Wordle) | Everyone plays the same puzzle today, so results can be compared. One attempt for ranking means scarcity and conversation. | The **Daily Route** exists and is seeded by date. Add: a **daily Taxi shift** (seed the hail/dest RNG with the date, so everyone gets the same fares) and a **daily callout set**. One *ranked* attempt per day, unlimited practice. | S (seed RNG), M with leaderboard |
| **Share card** (Wordle grid) | A spoiler-free, compact, bragging result you can paste anywhere. It *is* the marketing. | On results: `Dublin Drive · Daily Route 9 Oct · 1:42.3 🥇 · beat 71% · ▓▓▓▓▓░ splits · <link>`. Copy text via `navigator.clipboard`/`navigator.share`, plus an optional image: a canvas render of the route on the minimap (the `worldmap.js` drawing already exists) with the time over it. Reddit loves a map. | S (text), M (image) |
| **Ghosts and medals** (Trackmania) | Medals give targets beyond a personal best. Ghosts make solo play feel like racing. An **author medal** is the elite target. | Medals and a personal-best ghost already exist. Add: an **author/"Dub" medal** (set from a real expert run); **challenge links** (`?ghost=<id>` loads someone else's ghost from the leaderboard, so you race your mate); **ghosts of the daily top 3**. Ghost data is already small (`rec` at 10 Hz, under 6000 frames). | M (needs storage) |
| **"One more go" loop** (Snake, Flappy Bird, Vampire Survivors) | Restart in under 2 s, visible improvement, and a near-miss of your record shown at death ("0.8 s off your best!"). | Results already offer "Try again", but Trial replays a 3.5 s countdown and Pursuit restarts the commute. Make **retry instant** (Enter/A, or tapping anywhere), show **how close** ("€6 off your best", "2nd best ever"), and put **next target** text ("Silver at 1:55, you need 3.1 s"). | S |
| **Collectibles in the real world** (Pokémon Go, GTA hidden packages, Forza's boards) | You explore to find them, they reward knowing the place, and they make completionists. | **"Dublin 50"**: famous spots (each pub sign, each bridge, the Molly Malone statue, Ha'penny Bridge, the Spire base, Kavanagh's bench on the canal, Luas stops) that register when you drive past slowly. A **Places** list with ticks ("23/50 found"), stamp-card art. The `sites`/`pubSites` data already exists, as does the Places panel. Plus **Bridge run** (cross all 15 Liffey bridges) and **Pub crawl** (visit 12 pubs in one night shift). | M |
| **Idle/meta progression** (idle games, Forza's XP and wheelspins) | A number that only goes up across sessions. Unlocks give runs a purpose beyond the score. | **Career totals**: total fares, € earned, arrests, km driven, all kept locally. **Unlock ladder**: liveries and cars earned by totals (e.g. the GT unlocked at €250 lifetime taxi earnings *or* 5 arrests; Roads Policing livery at 25 arrests; gold paint at 10 trial golds; Dublin Bus livery for the hatch at 50 fares). Keep the Garda car and the taxi free so every mode is playable on day one. **Don't** add idle income: it doesn't suit a skill game and it invites cheating. | M |
| **Streaks** (Duolingo, Wordle) | A "don't break the chain" daily habit. | "Daily streak: 4 days 🔥" on the Play sheet when today's Daily hasn't been played yet. Local only, no account needed. | S |
| **Named rivals / leaderboards around you** (Forza rivals, Trackmania) | "Beat the person just above you" is more motivating than seeing that you're #4,812 in the world. | Leaderboard view centred on your rank, ±3 above and below, plus the hall of fame (§4). | M |
| **Achievements** | Cheap and varied goals that teach mechanics ("Do a PIT", "Box-in arrest", "Fare to Croke Park on match day"). | 20–30 local achievements, each teaching a mechanic or a bit of Dublin trivia. They show as toasts and on a small profile panel. They double as the tutorial: "First PIT!" is how a player learns PIT exists. | S–M |

---

## 3. Retention plan, ranked by impact/effort

Impact: ★★★ big, ★★ solid, ★ polish. Ranked within each group; groups ordered by when they matter.

### A. First-minute experience

1. **★★★ / S: a "Play" landing card when the intro finishes.** When the drive-in ends, show a slim bottom sheet (dismissable, doesn't pause the game) with three big buttons: **🚓 Chase** (Garda Pursuit) · **🚕 Taxi** · **⏱ Daily Route**, and a small "Just drive" link. One tap starts the mode, with the car chosen for you. On later visits, put one big **"Today's Daily: 1 attempt left"** button on top. Never show this before the city has loaded.
2. **★★★ / S: modes choose the car; cars are cosmetic after that.** Pursuit uses the Garda car (i40 or Roads Policing livery), Taxi uses the taxi, Trials uses your selected *sports* car (i30 N / Liffey GT). Move car, paint and graphics into a separate **Garage** (a "🚗 Garage" button on the Play sheet, with Graphics under Settings). The Play sheet then becomes: Daily (featured), three mode tiles, Free roam. **This is the onboarding answer: choose a game, and the game hands you the right car.** A small "Car: Liffey GT ▸" chip on the Trials tile lets enthusiasts swap.
3. **★★★ / S: rewrite the Toolbar Play button and the first toast.** Make Play larger and coloured (it's the game), and change the first toast from "Tap ? for help" to "Tap **Play** to start a chase or a taxi shift". Add Taxi to the help sheet.
4. **★★ / S: start each mode hot.** Pursuit's *first* call of a shift spawns the suspect 120–200 m ahead and already fleeing, with the siren on (later calls keep the 350–1100 m dispatch). Taxi's first fare stands within 60 m, in front of the car. Trial retries skip to a 1.5 s countdown.
5. **★★ / S: teach rules as prompts, not paragraphs.** Cut every mode card to one line ("Catch suspects. Ram, PIT or box them in." / "Pick up fares, drive them to Dublin landmarks."). Show contextual prompts the first time each situation comes up: "Nudge their back corner to PIT", "Slow down! Stop beside them", "Box them in from the front to arrest faster". Track "seen" flags in `save`.
6. **★ / S: an "Explore" mini-goal in free roam.** If the player hasn't opened Play after 45 s, show a gentle "Drive to the Spire" waypoint with a reward toast on arrival, which then offers a mode.

### B. Core loop per mode

**Garda Pursuit**
- **★★★ / S: show the stakes.** On the HUD: "+60 s per arrest" before the first catch, then a running chain ("Arrest streak ×3: +25% pts"). Name the heat tiers (*Joyrider → Getaway → Gang → Most Wanted*) and bring in the tier banner on level-up.
- **★★ / S: a streak multiplier** for back-to-back arrests without losing a suspect: ×1.0, ×1.25, ×1.5, ×2. A lost suspect resets it. Makes the 4th call tense.
- **★★ / M: callout variety.** Add stakeout/tail calls (the `unaware` stage, no siren) and "convoy" calls (two cars split up: catch one, radio for the other). 18 callouts is fine; tag them by tier so later calls feel bigger (vans and saloons early, coupés and SUVs late).
- **★ / S: Pursuit medals** like Trials (e.g. bronze 2 arrests, silver 4, gold 6), so the first run has a target.

**Dublin Taxi**
- **★★★ / S: extend-on-success clock** for the casual "Day/Night shift": start at 120 s, +time per fare in proportion to distance (`par × 0.6`), and show a "+14 s" pop-up. The run length then reflects skill. Keep the **fixed 6-min (and 15-min) "Ranked shift"** as its own mode for leaderboards.
- **★★ / S: fare combos.** Back-to-back fares picked up within 10 s of the last drop-off build a "Rank" (Crazy Taxi's Awesome/Great/Good). Show the combo on the HUD. A crash during a fare breaks the smooth-tip chain.
- **★★ / M: passenger types** with different wants (Rushing / Nervous / Tourist who wants the scenic route past 3 landmarks / Drunk who changes destination at night). The CHAT lines already have the tone.
- **★ / S: event fares.** "Match day at Croke Park: fares pay ×2 for the next 60 s", "Last DART's gone: Connolly fares surge". Flags timed inside the shift.

**Time Trials**
- **★★★ / S: next-target framing** on results, and instant retry (see "one more go").
- **★★ / S: the "Dub" (author) medal**, shown only after you win gold.
- **★★ / M: more routes from real Dublin** (the Canal Run, the Phoenix Park Chesterfield sprint, the North Circular, Croker to the Aviva) plus **reverse** variants for free.

### C. Meta progression across sessions

1. **★★★ / M: unlocks.** Garda car and taxi are free; the GT, the i30 N, liveries and paints are unlocked by lifetime totals and medals (table in §2). The Garage shows locked items with "€180 / €250 lifetime fares" progress bars. Every run then moves something forward, even a bad one.
2. **★★★ / S: daily streak and Daily hub.** Daily Route, Daily Shift and Daily Callouts (seeded), with one ranked attempt each, a 🔥 streak counter and a countdown to tomorrow's.
3. **★★ / M: "Dublin 50" collectibles** (landmarks, bridges, pubs, Luas stops), shown in the Places panel and on the map; "found" stamps, and a share card when completed.
4. **★★ / S–M: achievements** (about 25), using the existing toast. Examples: *Garda Síochána Medal of Honour* (10 arrests in a shift), *The Long Way Round* (a tourist fare past 3 landmarks), *Up the Dubs* (a fare to Croke Park), *Ha'penny for your thoughts* (cross the Ha'penny Bridge in the car… it's a footbridge, so an Easter egg), *Four seasons in one day* (drive in rain and sun within 60 s).
5. **★ / S: career stats panel**: km driven, fares, € earned, arrests, PITs, golds. Pure local storage, but people screenshot these.

### D. Social

1. **★★★ / S: a share card on every results screen.** Text version first (works everywhere, `navigator.share` on mobile, clipboard on desktop), e.g.
   `🚕 Dublin Drive: Daily Shift 9 Oct · €143.20 · 9 fares · 🥇 · #12 today · dublindrive.example/?d=2026-10-09`.
   Then an image version: a 1080×1080 canvas with the route drawn on the minimap tiles, the score and a landmark name. (No personal data in the card or the link.)
2. **★★★ / M: leaderboards** (spec in §4). Daily boards first, because a daily seed makes scores comparable and naturally caps cheating impact.
3. **★★ / M: challenge links.** `?ghost=<runId>` on a trial result loads that ghost; `?seed=<n>&mode=taxi` replays the exact fare sequence. "Beat my time on the Liffey Loop" is a natural Reddit post.
4. **★ / S: photo mode share.** Photo mode exists. Add a "Share" button that stamps a small "Dublin Drive" watermark and the location name ("Ha'penny Bridge, 21:40, rain").

### E. Dublin flavour (cheap and high-affinity)

- **Radio voice**: Control lines and taxi chat are already good; more of them, plus **street-name callouts** in the Taxi HUD ("Left onto Dame St"). Locals love hearing their street.
- **Event days**: on real fixture dates (Dubs at Croker, Six Nations at the Aviva), extra pedestrians, match fares and pursuit callouts nearby, plus a "St Patrick's Day" parade route on 17 Mar. Seeded by date, client-side, no backend needed.
- **Local results text**: "You'd have made the 7:15 from Heuston", "Faster than the 46A" (a light jab at Dublin Bus). Make sure the jokes punch at situations, not people.
- **Leaderboard regions**: an optional "Northside / Southside" tag on scores (one picker, not location data). Tribal, harmless and very r/Dublin.

---

## 4. Leaderboards spec

### 4.1 What to rank

To be comparable, every ranked run must be **fixed length** and ideally **seeded** (same fares/route/calls for everyone on a board).

| Board | Metric (tie-break) | Fixed by | Seeded? | Periods |
|---|---|---|---|---|
| **Daily Route** | time ↑ (earliest submit) | route from `dailyRoute(date)` | yes (date) | daily, plus an all-time "fastest ever Daily" (per route length class) |
| **Fixed trials** (Liffey Loop, Georgian Sprint, Temple Bar…) | time ↑ | route id | yes (static) | weekly, all-time |
| **Taxi Ranked Shift 6 min** | € earned ↓ (fewer crashes) | 360 s | **daily seed** for the ranked daily; unseeded for weekly | daily (seeded), weekly, all-time |
| **Taxi 15-min "Full shift"** | € earned ↓ | 900 s | weekly seed | weekly, all-time |
| **Garda Pursuit shift** | score ↓ (arrests ↓) | starts at 210 s (+60 s per arrest is skill-based; cap total at e.g. 600 s for the ranked variant) | daily seed of callout order | daily, weekly, all-time |

**"How much can you earn in 15 minutes?"** Estimated from the taxi.js formulas: fare = €4.50 flag + €12/km (straight-line, game scale; destinations are picked 280–1500 m away) + a quick bonus up to €6 + a tip of 12–20 %. A typical fare is ~800 m, so about €14 meter, €17–20 paid. A good cycle (find the hail, then ride) takes 60–80 s, which gives ~€85–110 per 6 min (the current medals are €35/€70/€110, consistent with this). **A strong 15-minute shift is about €220–280, and an expert maybe about €320.** Physical ceiling: the longest fare is ~2.6 km, about €62 with every bonus, and it needs at least ~70 s at the GT's 52 m/s top speed with real roads. So **€60/min is a hard plausibility ceiling** and **€30/min is a "flag for review" level**. Check these against real play logs once the boards are live.

### 4.2 Hall of fame ("all-time record holders")

- A `records` table holds **one row per board key** (e.g. `trial:liffey`, `taxi:6min`, `taxi:15min`, `pursuit:shift`, `daily-route:best-ever`), holding the current champion's nickname, value, date and run id.
- When a validated run beats the record, the edge function (below) **appends** to `record_history` and updates `records`. The Hall of Fame page lists the current holders, plus a timeline of "who held the Liffey Loop record and for how long". People will fight over this.
- **Daily champions**: a nightly cron (Supabase `pg_cron`) copies each day's #1 into `daily_winners` ("Daily Route 9 Oct: *SpireRunner* 1:38.2"). It's cheap and gives every day a story.

### 4.3 Name entry and privacy

- **Nickname only**: 3–16 characters, `[A-Za-z0-9 _-]` plus Irish fadas (áéíóú). Entered once on the first ranked submit and stored in `localStorage`. Optional region tag (Northside/Southside/Elsewhere). **No email, no account, no IP stored in tables, no location, no device fingerprint.**
- **Player token**: a random UUID made on the client (`crypto.randomUUID()`) and kept in localStorage. It only lets a browser "own" its nickname and rows. Store **only a SHA-256 hash** of it server-side. It's not personal data, but treat it as pseudonymous and never show it.
- **Profanity filter**: server-side in the edge function. Normalise (lowercase, leetspeak map `0→o 1→i 3→e 4→a 5→s 7→t @→a $→s`, collapse repeated letters, strip separators), then match against a small English blocklist + Irish slang additions + slurs, as both substring and whole word. Rejected names get "Pick another name". Plus a `hidden` flag on rows so the owner can bury a name by hand from the Supabase dashboard. Don't try to be clever: a short blocklist and manual hiding are enough at this scale.
- **Data retention**: keep daily rows for 30 days (cron delete); keep weekly/all-time top 100 per board, plus record history, indefinitely. Say this in one line in the Help sheet ("Leaderboards store your nickname and scores only").
- The Supabase anon key ships in the client (it's public by design). **No service-role key in the repo** (CLAUDE.md: everything in the repo is public). The edge function reads the service key from Supabase secrets.

### 4.4 Anti-cheat: what's possible, and what isn't

**Honest limit:** this is a client-side JavaScript game. Anyone can open DevTools and call the submit endpoint with any number, or change `TUNE`. Signing run summaries is **not** meaningful: any signing key in the client can be extracted. A determined cheater can't be prevented; the goal is to make cheating **pointless, visible and cheap to clean up**.

What does work:
1. **Server-side plausibility bounds per board** (edge function):
   - duration must match the board (6-min taxi: `elapsed_ms` between 355 and 420 s of wall clock between `run_start` and `submit`);
   - Taxi: `earnings ≤ 60 €/min × minutes`, `fares ≤ duration / 25 s`, `avg fare ≤ €62`, `tips ≤ 0.2 × earnings`;
   - Pursuit: `arrests ≤ duration / 30 s`, `score ≤ arrests × (150 + 25·level + 120 + 100 + 50) + ε`;
   - Trials: `time ≥ route_length / 52 m/s × 1.15` (top speed of the fastest car plus cornering), plus the seeded route length computed server-side from the same `dailyRoute` code (export it as a shared module).
2. **Server-issued run tickets**: the client asks `start_run(board)`, and the server returns `{run_id, seed, issued_at}` and keeps it. Submit must quote an unused `run_id`; the server checks the elapsed wall clock. This stops instant replays of submits and fixes the seed so everyone plays the same daily. It also limits "one ranked attempt per day per token".
3. **Run evidence for the top of the board**: the trial ghost (`rec`, 10 Hz positions, already recorded) or a compact taxi event log (`[t, event, x, z]`: pickup/drop/crash) is uploaded with the run (gzip, under 30 KB). The server re-checks it cheaply: no teleports (successive points ≤ 52 m/s × Δt + slack), checkpoints/destinations visited in order, and the totals recomputed from the log match the claim. Only needed for runs that would enter the top 20 or set a record; store the evidence only for those.
4. **Rate limits**: per token hash, at most 30 `start_run` per hour and 1 ranked daily submission per board per day. Per IP, enforced in the edge function from the request header **in memory/short-lived only, never written to a table**, at most 120 requests per hour.
5. **Flag, don't argue**: runs between "suspicious" and "impossible" go in with `status = 'review'` and are hidden from public boards until approved (or auto-approved after 24 h if not top 3). The owner can hide rows from the dashboard.
6. **Version pinning**: submissions carry `game_version`. A tuning change opens new board keys (or a season), so old records aren't compared to different physics. This is honest and also reduces griefing.

### 4.5 Minimal Supabase design (spec only, nothing created)

**Tables** (Postgres):

```sql
-- one per browser; nickname ownership, no personal data
players (
  id          uuid primary key default gen_random_uuid(),
  token_hash  text unique not null,           -- sha256(client token)
  nickname    text not null check (char_length(nickname) between 3 and 16),
  region      text check (region in ('north','south','elsewhere')),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index on players (lower(nickname));

-- issued by the edge function; one-shot
run_tickets (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid references players on delete cascade,
  board       text not null,                  -- 'taxi:6min:daily', 'trial:liffey', ...
  period_key  text not null,                  -- '2026-10-09' | '2026-W41' | 'all'
  seed        bigint,
  issued_at   timestamptz not null default now(),
  used        boolean not null default false
);

runs (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid unique references run_tickets,
  player_id    uuid references players on delete cascade,
  board        text not null,
  period_key   text not null,
  value        numeric not null,              -- € earned, score, or ms
  detail       jsonb not null default '{}',   -- fares, tips, arrests, splits, car
  game_version text not null,
  status       text not null default 'ok' check (status in ('ok','review','rejected')),
  created_at   timestamptz not null default now()
);
create index on runs (board, period_key, value);

run_evidence (run_id uuid primary key references runs on delete cascade, blob bytea);  -- ghost / event log, top runs only

records        (board text primary key, run_id uuid references runs, nickname text, value numeric, set_at timestamptz);
record_history (id bigserial primary key, board text, run_id uuid, nickname text, value numeric, set_at timestamptz);
daily_winners  (board text, day date, nickname text, value numeric, primary key (board, day));

-- public read model: best per player per board+period, visible rows only
create view leaderboard as
  select distinct on (r.board, r.period_key, r.player_id)
         r.board, r.period_key, p.nickname, p.region, r.value, r.detail, r.created_at
  from runs r join players p on p.id = r.player_id
  where r.status = 'ok' and not p.hidden
  order by r.board, r.period_key, r.player_id, r.value desc;   -- (asc for time boards: two views, or sign-flip times)
```

**Row-level security**
- RLS **on for every table**.
- `anon` role: **SELECT only** on `leaderboard`, `records`, `record_history`, `daily_winners` (views or tables with `using (true)` select policies). **No select** on `players.token_hash`, `run_tickets`, `run_evidence`.
- `anon`: **no INSERT/UPDATE/DELETE at all.** Every write goes through the edge function using the service role. This is simpler and safer than insert-with-check policies, because the plausibility checks need logic (and the ticket lookup) that a `with check` expression can't express cleanly. *(If you want to avoid an edge function at first: an `insert`-only policy on `runs` with `with check (value between 0 and <board max> and board in (...))` plus a `security definer` RPC is the fallback. Weaker, but it works.)*

**Edge function `submit` (Deno)**, with two routes:
- `POST /start {board, token, nickname?, region?}`: upsert the player by `token_hash` (filter the nickname), rate-limit, create a `run_tickets` row, return `{run_id, seed}`.
- `POST /finish {run_id, token, value, detail, evidence?, game_version}`: load the ticket, check ownership, `used = false` and the elapsed time; apply the board bounds (§4.4); recompute from the evidence if the run would make the top 20 or a record; insert into `runs` with a status; update `records`/`record_history` if beaten; return `{rank, of, percentile, record: bool}` for the results card ("#12 of 340 today, beat 96%").
- CORS limited to the game's GitHub Pages origin. The anon key is sent as normal; no other headers or identifiers.

**Cron (pg_cron)**: nightly: copy the daily #1s into `daily_winners`, delete daily `runs` older than 30 days, delete unused `run_tickets` older than 2 days.

**Client**: around 120 lines, `fetch` only (no supabase-js needed), and **only when the player chooses a "Ranked" run**. Casual play makes no network calls. If the request fails, the game still works and shows "Leaderboard offline".

**Cost on the free tier** (Supabase free plan as of 2026: 500 MB database, 5 GB egress, 500k edge function invocations/month; the project pauses after 1 week without activity): one ranked run is 2 invocations and about 1 KB of row data (+≤30 KB evidence for top runs only). **10,000 ranked runs/day is about 600k invocations/month**, right at the limit. A Reddit spike day of 2–3k players doing about 3 ranked runs is about 18k invocations, which is fine. Storage stays under 50 MB with the 30-day purge. Leaderboard reads: cache the public `GET` responses for 30–60 s (edge function or PostgREST with a `Cache-Control` header) so read traffic doesn't eat egress. The real risk is **auto-pause after inactivity**: the client must degrade gracefully, or the owner upgrades to Pro (~$25/month) if the game takes off.

---

## 5. Next 3 builds (one agent each)

### Build 1: "Play first" onboarding and mode-chooses-car (S/M)
- After the intro drive-in, a non-blocking **Play sheet** offers three big tiles (Chase / Taxi / Daily Route) and "Just drive". One tap starts the mode.
- Pursuit auto-selects the Garda car (keeping the Roads Policing livery if chosen); Taxi the taxi; Trials the chosen sports car (default Liffey GT).
- The Play sheet reorders to: Daily (featured, with streak counter) → modes → Free roam. Car, paint and graphics move to a **Garage** sub-sheet.
- The Play toolbar button is visually primary; the first toast says "Tap Play to start"; Help lists Taxi.
- **First call / first fare start hot** (suspect ≤200 m ahead and fleeing; fare ≤60 m ahead).
- **Acceptance:** with the harness (`node tools/check.mjs` + a new `tools/scenarios/onboarding.mjs`, also with `--mobile`), the Play sheet is visible within 1 s of `__dublin.ready`; a single click on each tile starts that mode with the right car; time from tap to first pickup or first suspect sighting is under 20 s with the bot driving; no mode card is taller than 3 lines on a 390 px screen; `footprints.mjs` and `bridges.mjs` stay clean.

### Build 2: "One more go" results, daily seeds and the share card (S/M)
- Results card: **instant retry** (Enter / A / tap), "how close" lines (gap to PB, gap to next medal), a **next target**, and a **Share** button (`navigator.share` or clipboard) with a text card (mode, date, score, medal, link with `?d=` for the daily). No personal data.
- Seed the Taxi RNG (`hailSpot`/`pickDest` via an injected `rand`) and the Pursuit callout order (`pickCallout` already takes `rand`) by date for a **Daily Shift** and **Daily Callouts**. Add a local **daily streak**.
- Pursuit medals (2/4/6 arrests) and named heat tiers on the HUD; Taxi casual mode gets an extend-on-success clock (start 120 s, + `par × 0.6` per fare); the fixed 6-min shift remains as "Ranked".
- **Acceptance:** two harness runs with the same date produce the same first 5 taxi destinations and the same first 3 callouts; the share text is under 200 characters and contains no nickname/email/location; retry restarts within 1.5 s; existing `localStorage` bests still load (key compatibility).

### Build 3: Leaderboards v1 on Supabase (M), **after the owner approves creating the project**
- Implement the §4.5 schema, RLS, `submit` edge function (start/finish, nickname filter, plausibility bounds, rate limits), and a nightly cron, all as **migration files in the repo** (no secrets; anon URL/key in a config file, service key only in Supabase secrets).
- Client: nickname prompt on first ranked submit; "Ranked" toggle on the Daily tiles; results show "#rank of N today"; a Leaderboard sheet (Today / This week / All-time / Hall of Fame, centred on your rank).
- **Acceptance:** anon cannot insert or update any table directly (test with the anon key: expect a 401/403); a submission with impossible values (e.g. €2,000 in 6 min, a trial faster than length/52 m/s) is rejected; a replayed `run_id` is rejected; the game is fully playable with the network blocked; a load test of 1,000 simulated submits stays inside free-tier limits; no personal data in any table (only nickname, optional region, token hash).
- *Needs the owner's explicit go-ahead before creating the Supabase project or deploying anything (CLAUDE.md: no accounts or services without say-so).*
