# Performance work (30 September 2026)

## Distant landmark loading: 30 September follow-up

On the light profile, `buildLandmarks(scene, { start })` still establishes the road/collision
world and loads nearby scenery. Three remote Blender landmarks at this spawn (3Arena, Guinness
Storehouse, Aviva Stadium) get cheap silhouettes and enter a deferred queue. Croke Park uses
the same distance rule but falls inside the 850 m starting radius here. High follows the old
full-detail startup path. The queue starts 2.5 s after the first playable frame and picks the
next site by current distance plus a heading/speed look-ahead, recalculated after every model.
It loads one model at a time and submits its drawable shaders one per frame. The finished
model replaces its silhouette only after compilation; a failed model keeps the silhouette.
Colliders for these three sites are registered outside their async model loaders.
The far-view LOD list is refreshed when a model arrives, including if photo mode prepared the
aerial scene earlier. Helicopter entry waits for the queue before capturing roof heights.

The `tools/scenarios/districts.mjs` check waits for the queue, checks that no silhouettes
remain on a successful load, and records frame gaps. In a production-bundle desktop run,
first play took 29.9 s and the test's worst post-start frame was 147 ms. A separate production
mobile-emulated run took 33.4 s to first play; all three models finished 9.8 s later, its
worst frame gap during that period was 164 ms, and it reported about 42 indicative fps once
done. Other runs varied: 35.4 s to play in a desktop completion check. The new 500 m Low view
removed about 25 draw calls in the tested mobile spawn (451 before, 425 after), while preserving
the inspected street scene. These measurements are headless Chrome on Vega 8, not real device
acceptance tests. The footprint scenario still found zero road overlaps. The High path reached
play with no console errors, though that smoke run's browser cleanup hung after reporting its
results.

Two failed approaches are worth avoiding:

- Dividing the 41,839 filler buildings into 225 m chunks while constructing the rest of the
  world up front raised shader preparation to 22 s and drove FPS to 14 during the background
  additions. It was reverted. Chunking must also budget geometry upload and compilation.
- Deferring a whole landmark's shader compilation in a single call shortened first play but
  produced several 300-700 ms frames immediately afterwards. Submitting one drawable per
  frame removed those large spikes in the measured completion check. Waiting for a long
  `requestIdleCallback` timeout between every drawable took 42 s to finish the three landmarks;
  scheduling just after each frame finished within about 10 s instead.

The 850 m start radius and 2.5 s pause are current heuristics, not a proof of the requested
15-25 s travel guarantee. On a slow network or device, the silhouette and collision remain
usable if the full model has not arrived. The rest of the map's procedural buildings, most
landmarks, and ~238,000 collision segments are still prepared before play. Reaching the
under-15 s public target requires spatially staged world generation, with a worker producing
small immutable chunk data, budgeted GPU uploads, and prewarmed shaders before visibility.
Keep a playable proxy and collision barrier for every not-yet-detailed chunk, and test fast
driving, turns, teleporting, helicopter flight and offline/slow-network visits before extending
the stream beyond the three independent landmark models.

## Public-device follow-up: 30 September

The goal is a usable first visit on an ordinary WebGL2 phone or laptop, followed by a noticeably
better experience on capable hardware. A sensible acceptance gate is **playable in under 15 s on
the reference average laptop and phone**, sustained **30 fps at DPR >= 1** on the light profile,
and **60 fps at higher DPR with richer scene density** on a reference high-end device. These are
proposed targets, not results. Test a cold visit with the browser cache cleared, then a warm visit;
record time to first controllable frame, p95 frame time while driving, DPR, draw calls, GPU model,
memory, and visible quality. Include an actual Android tablet, an average integrated-GPU laptop,
and a modern phone/laptop before claiming broad support.

This follow-up makes Auto's initial light choice more conservative: masked desktop GPU names and
the newer Intel Xe / Radeon 6xxM-8xxM integrated names use the light scene. Recognised desktop
GPUs use Medium initially and Auto can raise the rendering tier if the game stays fast. Device
names are only a guess; saved measured quality and the explicit Graphics choice remain available.
The light scene now displays the static loading card and updates its stage text. It no longer
creates the aerial preview's second WebGL context while the main scene builds. High/Medium still
load the aerial intro. `src/boot.js` imports the intro code only on the richer path.

Cold production-bundle browser runs on this development machine:

| Profile | Time to play | City build | Shader preparation | First frame | Indicative FPS | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Auto/Low, light loading card | 38.5 s | 8.6 s | 15.1 s | 7.2 s | 37 | 4.2 MB reported resource transfer; 119 shader programs; no console errors |
| Explicit High, aerial intro | 41.9 s | — | — | — | 29 | Integrated Vega 8 GPU; adaptive DPR reached 0.6; no console errors |

These single headless runs are a regression check, not a reliable before/after speedup claim.
The dev-server Low run with the same loading change took 37.3 s. The roughly 40 s first play is
still unacceptable for a public trial. The full city is generated before play (41,839 building
instances and ~238,000 collision segments), then ~120 shader programs compile. Serving compressed
files or caching a second visit cannot remove those first-visit CPU/GPU costs.

An experiment compiling only objects within 700 m of the spawn reduced the program count at
first play to 103 but moved work into the first frame (7.6 s) and increased total load from
37.3 to 39.0 s. It was reverted. Deferring shaders safely requires actual district streaming
and a background warm-up before those districts become visible.

### Next build sequence and tradeoffs

1. **Playable district first.** Split the static world into spatial chunks. Build collision,
   roads, buildings, and relevant landmarks near the starting point first; add the rest as the
   player approaches. Keep a cheap skyline beyond the loaded district and load the next ring
   ahead of driving. This is the only likely way to remove much of the current city-build and
   shader work from first play. Cost: substantial refactor of global lots, collisions, far-view
   capture, teleporting, and helicopter height sampling. Prevent holes and collision gaps during
   chunk transitions. Keep High's full distant detail as chunks arrive.
2. **Consolidate material variants and warm chunks.** Inventory the ~120 first-frame shader
   programs; share materials/atlases and eliminate variants that have no visible effect on Low.
   Compile an approaching chunk before making it visible. This should reduce shader startup and
   driving hitches. Cost: custom building and landmark shaders need careful visual comparison;
   compiling only nearby objects without streaming was measured to be worse.
3. **Auto adjusts scene work as well as pixels.** Use rolling frame time and a small memory
   budget to adjust shadow detail, view distance, decoration density, crowd/traffic, and then DPR.
   Keep DPR >= 1 as a clarity target for touch devices where possible. Offer a clearly labelled
   Battery saver for devices that need lower resolution. Cost: more tier combinations to test;
   counts currently follow the load-time `LITE` constant, so several changes require a reload
   unless the systems gain live density controls.
4. **Vehicle work follows measured cost.** The detailed player car's selective shadows already
   lowered its extra shadow calls; isolated GPU timing was ~0.2 ms in the earlier run. A procedural
   lookalike should be built only if real low-device measurements show the model matters, while
   High retains the detailed cars. Cost: maintaining two visual assets and their lighting/liveries.
5. **Release gate.** Use the local production test (`node tools/check.mjs --build`, optionally
   `GFX=high`) and real-device cold/warm visits. Retain the footprint and bridge checks after
   world streaming changes. Ship a public performance claim only after reference devices meet
   the measured time-to-play and driving targets.

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
## Shared vehicle assets, 2026-09-30

The procedural fleet and placeholder player car used to paint identical 1024 px hatchback atlases and create a second wheel geometry and rim texture. `src/game/fleet.js` now caches immutable atlas, body, and wheel assets. The procedural car retains its look; the Blender car still replaces the placeholder when ready. Materials remain separate because their light levels can differ. Do not dispose the shared textures or geometry when swapping the placeholder out.

One local production-browser comparison: traffic construction 203 -> 167 ms, texture inventory at quality setup 160 -> 157, time to play 32.4 -> 32.3 s. The total timing is within run variance. Report no FPS gain from this change. A Canvas2D readback hint was also added to the ground layout; it does not change the painted map.

The larger remaining cost is still ~7.5 s of eager city construction plus ~16 s of shader preparation on this machine. A real district build must prepare the reachable ring and its collision before allowing play, warm approaching content without frame spikes, and retain cheap safe silhouettes during transition. Keep High full fidelity and verify a cold first visit on representative hardware.
