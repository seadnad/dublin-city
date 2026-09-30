# Performance work (30 September 2026)

## Baseline and method

Run `node tools/check.mjs` and `node tools/check.mjs --mobile` from the repository. Set
`VERBOSE=1` to see the in-game stage timings. These are headless Chromium results on the
development machine, not measurements from the owner's Samsung tablet or old laptop.

Before changes, a cold Auto/Low desktop check took about 45 seconds to reach play. The
logged city build was 10.5 seconds, shader preparation 15.8 seconds, and the first rendered
frame 8.4 seconds. A mobile-emulated check took about 46 seconds; Auto lowered render DPR
to about 0.9 during the run. The finished scene contained 1,474 meshes, 466 materials and
146 shader programs. Times vary between runs and a headless check is not a device benchmark.

## Changes in this pass

- Add timings for each module-load stage and traffic construction, so later agents can locate
  regressions without guessing from the total loading time.
- An early shader-compilation experiment overlapped with city construction, but a desktop
  run still took 46 seconds overall (city 13.2 s, shaders 21.5 s, first frame 3.0 s).
  It was reverted because it did not improve time to play.
- Skipping Low-tier precompilation made the first frame take 44.6 seconds and increased
  total startup to 66 seconds. It was reverted; precompilation is necessary here.
- Paint Dublin Bus atlases directly at their uploaded resolution. The buses keep their
  existing silhouette, route detail and material, with much less temporary canvas work. A
  512 px Low atlas was inspected after the change; the route, livery and signage remain legible.
- Ask Canvas2D for frequent-read storage on the two car atlases that are read back pixel by
  pixel during construction.
- Keep the detailed player-car models, but on Low/Battery saver let only their body shell and
  wheels cast sun shadows. The other surfaces still render normally. An isolation run showed
  that hiding the entire player car originally removed 68 main/shadow draw calls and about
  1 ms of GPU work in one headless scene. With selective shadows, the difference fell to
  53 calls and roughly 0.2 ms in a repeat run. GPU timings are noisy, so the draw-call
  reduction is the more reliable result. The fallback procedural car is cheaper, but using
  it as the default would lose the detailed model that is prominent in the chase view.
- Limit the aerial intro to 30 fps and CSS resolution on the light profile, leaving GPU time
  for loading the main game. High and Medium keep the existing intro quality. One desktop
  check reached play in 41 seconds after this and the atlas change; the earlier baseline
  was about 45 seconds, so more runs and a real old laptop are needed to establish the gain.
- Auto now targets about 30 fps on light-profile devices before reducing resolution. Its
  DPR floor is 1 on touch devices and 0.8 on desktops. Old learned DPR values are clamped
  on next load. This prioritises clarity and may lower frame rate on weaker devices; explicit
  Low and Battery saver retain their prior resolution behaviour.
  A mobile-emulated check reached play in 39 seconds with DPR 1.1 and 36 indicative fps;
  the initial check was 46 seconds with DPR around 0.9. The GPU was the same desktop GPU
  in both runs, so this is a logic check, not a Samsung tablet result.
  A production-bundle mobile check reached play in 36.7 seconds, reported DPR 1.1 and
  38 indicative fps, and had no console errors. Its browser/server cleanup hung after
  reporting results and was interrupted; inspect that harness path if it repeats.

## Constraints and next measurements

`CLAUDE.md` requires visual speed tradeoffs to stay in Low and Battery saver, while pure
efficiency changes can apply to all tiers. The player cars are compact GLBs; the instanced
traffic fleet already shares geometry and draw calls. Keep the player car models unless
device measurements show they are a real bottleneck.

For tablet sharpness, record `window.__dublin.gfx()` after several minutes of play and the
actual frame rate at that DPR. If the Samsung tablet cannot sustain 30 fps at DPR 1, reduce
scene cost on Low before changing the sharpness floor again. Auto still has no cheaper world
detail to shed after it reaches Low; that is the next larger rendering task.

The footprint scenario returned 0 overlaps. The bridge scenario exceeded Puppeteer's
default protocol timeout while sampling the whole map, so the local check harness now allows
up to ten minutes for this scenario's browser call. The rerun returned `bad: {}` for all road
samples and no console errors.
