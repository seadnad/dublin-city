# Change log

## 2026-10-01 - More active streets and pedestrian vehicle contact

- Raised light-profile activity (Low, Battery saver, and Auto on weaker devices) from 12 to 18 moving cars, 3 to 4 buses, 120 to 150 parked cars, and 110 to 160 walkers. Full-profile devices now use 36 cars, 8 buses, 360 parked cars, and 400 walkers (previously 26, 6, 320, and 300).
- Spawned and recycled moving traffic closer to the player, and kept pedestrians in a tighter nearby area. This gives the player more visible activity without creating agents across the whole map. Initial traffic placement now avoids cars overlapping one another.
- Broadened the civilian car paint palette with restrained blue, red, green, gold, and purple shades. Additional buses share the existing six route textures and materials, keeping bus texture count fixed.
- Added lightweight 2D body boundaries for walking pedestrians against the player car, moving cars and buses, and parked cars. A fixed spatial grid makes parked-car checks local. Contact stops a walker briefly; it does not add a full rigid-body physics engine.
- Added `tools/scenarios/city-life.mjs` to record nearby activity and force a pedestrian/car contact in the running game. The Low mobile-emulated production check reached play in 29 seconds, had no console errors, and reported about 28–30 indicative fps at adaptive DPR 0.9. Forced High reached play in 41 seconds and was substantially slower on this laptop; its frame rate is not representative of a high-end device.

To revert this pass, revert its commit. Density settings are in `src/main.js`; the contact helper is `src/game/pedestrian-vehicles.js`.

## 2026-10-01 - Luas and Dublin Bus design refresh

- Reworked the Luas carriages around a Citadis-style silhouette: rounded roof, distinct windows and passenger doors, purple skirt and yellow accent, articulation ends, and a raked yellow cab with a visible windscreen and lights.
- Updated the yellow-and-blue Dublin Bus toward the SG-class Wright Gemini 3: a front that leans back above the driver, one nearside passenger entrance, modeled mirrors, and wheels moved to the edge of the body where their shared wheel mesh is visible.
- Kept the bus route atlases at their existing resolutions and retained the fleet's shared geometry. The Luas uses two more instanced material groups than before when visible; no external 3D model or downloaded image is added. The Luas's gameplay length is unchanged.
- Recorded reference images, licences, design choices and the real-length compromise in [docs/research/transit-vehicles.md](docs/research/transit-vehicles.md).

Production browser close views reached play with no console errors on desktop and a mobile-emulated viewport. The headless frame-rate readings vary with camera placement and are not evidence of a speed gain. Revert this change to restore the earlier vehicle geometry and atlas painting.

## 2026-09-30 - Garda car model refresh

- Rebuilt the Garda estate from its Blender source using the supplied side, front and rear photos as shape guides. The headlight outlines are more swept, the reflectors are lighter, and each alloy wheel now has five broad tapered spokes.
- Kept the white estate body, roof lightbar, Garda markings, wheel pivots, brake and reverse lamps, and flashing controls. The livery still paints onto the same UV atlas in the game.
- Replaced the grille, headlight, tail light and plate Boolean cuts with shallow surface details. Those cuts were pulling long triangles across the bonnet and tailgate; the uninterrupted shell now shades more cleanly. Wheel arches remain cut into the body.
- Regenerated `models/garda.blend`, `public/models/garda.glb` and its ambient-occlusion image. The compressed car asset is 153,632 bytes, down from 165,596 bytes (about 7%). The current mesh is 12,300 triangles. These figures alone do not establish a frame-rate improvement.

Blender front, side and rear previews and close views in the running game were inspected. The production browser build reached play with no console errors. The source script is `tools/blender/build_garda.py`, so the mesh and game asset can be regenerated. Reverting this change restores the previous car assets and material settings.

## 2026-09-30 - First-visit loading screen

- Replaced the plain Low/Auto loading card with a lightweight Dublin illustration, a clear welcome, honest first-visit timing guidance, and stage text tied to the actual loading sequence. The illustration uses CSS and adds no image download or second rendering context.
- Gave the High aerial intro the same expectation-setting copy. The plain card now stays visible until the aerial renderer reports ready. Tapping before the game is ready can still skip the flyover, but no longer hides the loading message early.
- Kept the performance log labels separate from the player-facing stage wording so later measurements remain comparable.

The page was visually checked at desktop, tablet landscape and phone portrait sizes. Production browser checks reached play on Auto/Low and High with no console errors. These checks do not establish smooth driving on real low-end hardware or reduce the existing load time.

## 2026-09-30 - Shared vehicle assets

- Procedural traffic and the temporary player car now share each design's atlas and body geometry, plus the wheel geometry and rim texture. Their appearance and the detailed Blender car remain the same.
- The ground-layout canvas now requests a readback-friendly context because landmark lawns repeatedly inspect its pixels.

On the local production browser check, traffic construction went from 203 to 167 ms and the initial texture inventory from 160 to 157. Time to play was essentially unchanged (32.4 versus 32.3 seconds), and frame rate varied between runs. This is a small memory and construction improvement, not a fix for the public startup target. The city and shader stages remain the main work; see [docs/performance-work.md](docs/performance-work.md).

## 2026-09-30 - Prioritised distant landmarks

- On Auto/Low, distant 3Arena, Guinness Storehouse and Aviva models now load after the first playable frame. Their collisions remain available; a cheap silhouette stays visible until each finished model and its shaders are ready. The next model is chosen from the player's current position and heading, so a turn or teleport changes priority. High keeps loading the full set before play.
- Shader preparation for those models is spread across frames. An initial whole-model compilation produced half-second pauses after play; the revised version submits one drawable after each frame and removes the silhouette only when the model is ready.
- Low's normal ground view reaches 500 m instead of 600 m. The starting O'Connell Street mobile screenshot was inspected after the change; High keeps its 950 m view.
- Added a browser check that waits for all deferred landmarks and detects any stranded loading silhouettes.

In local production browser checks, Auto/Low reached play in roughly 30-35 seconds (previous single run: 38.5 seconds). The mobile-emulated run prepared all three distant models within 9.8 seconds of play, with no console errors, and reported about 42 indicative fps after streaming. These are variable headless results on the same Vega 8 computer. The full procedural city still builds before play, so the public first-visit target remains unmet; see [docs/performance-work.md](docs/performance-work.md).

## 2026-09-30 - Public device startup follow-up

- Auto now starts masked GPUs and newer integrated graphics on the light scene. Recognisable desktop GPUs can start on Medium, and Auto can still raise render quality when frame times allow it.
- Low/Auto light devices use the existing static loading card with stage text. The aerial intro and its second WebGL context load only for the richer profile.
- The local browser check accepts `GFX=high` (or another graphics mode) to verify a profile without changing saved browser settings manually.
- Production browser checks reached play with no console errors: Auto/Low 38.5 s, mobile viewport 39.4 s, explicit High 41.9 s on this machine. This does **not** meet a good public first-visit target. The next architecture steps and tradeoffs are recorded in [docs/performance-work.md](docs/performance-work.md).

## 2026-09-30 - Performance and visual clarity

- Auto graphics on light-profile devices now favours a sharper image at about 30 fps. It keeps at least 1 render pixel per CSS pixel on touch devices and 0.8 on desktops, including when an older lower setting was saved.
- The aerial loading scene uses fewer pixels and runs at 30 fps on the light profile, leaving more GPU time for the main game to load. High and Medium keep their existing intro quality.
- Dublin Bus textures are painted directly at the size uploaded to the GPU, and car atlas readback uses a Canvas2D context suited to frequent reads.
- Detailed player cars remain in place. On Low and Battery saver, small decorative parts no longer cast separate sun shadows; the body and wheels still do.
- Startup stage and traffic construction timings are logged for future profiling. The full investigation and measurements are in [docs/performance-work.md](docs/performance-work.md).
- The bridge browser check has a longer timeout for its full-map scan.

Local mobile emulation reached play in about 37–39 seconds versus about 46 seconds before, with an Auto render ratio around 1.1 versus 0.9. This used a desktop GPU with a mobile viewport; the Samsung tablet and old laptop still need direct measurement. The production bundle loaded without console errors, the footprint check found 0 overlaps, and the bridge check found no road-over-water samples. Shader preparation remains the largest startup cost.
