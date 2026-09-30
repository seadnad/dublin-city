# St Stephen's Green: the interior (work package "Green interior", G1-G5 + G9 in part)

Builds on `docs/research/hotspots-green-templebar-dame.md` §2.1 and §4.1. No new downloads: the OSM pulls
(`data/osm/stephens-green-audit.json`, `stephens-green-water-audit.json`, ODbL) and the CC reference photos in
`refs/stephens-green-audit/` (credits in the audit doc §7) were already in the repo. No web requests were made.

## Files

- `tools/green-layout.mjs`: OSM -> `src/data/stephens-green.json` (22 KB): 78 paths, 4 paved areas, 6 steps, the lake
  (80-point outline, 2 islands), the O'Connell Bridge, fountains, bandstand, 3 shelters, the lodge, 7 gates, 11
  memorials, 313 surveyed trees, 57 benches, 9 hedges.
- `src/world/greenmap.js`: the fit (below), the lake outline, the gate positions.
- `src/world/greenpark.js`: everything inside the railings, plus the tree/shrub planting (`greenPlanting`).
- `src/world/landmarks.js`: the old pond ellipse and the random scatter/shrub blobs are gone; calls `buildGreen`
  (before `buildStatues`, so its statue-kit figures are queued) and `greenPlanting`.
- `src/world/ground.js`: the lake is cut out of the Green's lawn; the railings open at the gates (the collider stays
  continuous; granite posts stand in each opening). `roads.js grassPolygon` takes optional holes.
- `src/game/people.js`: `addFootLanes()` so pedestrians also stroll the park paths (off-graph lanes; junction lookup
  guarded for ids that aren't street nodes).
- `tools/scenarios/greenperf.mjs`: frame cost on the four sides of the Green, an aerial, and a control spot.

## The fit

The game keeps its corners (coordinator's decision). Real layout points are stored as (u, v) in the real railing quad
(the road-centre corners inset by 19.2 m, the mean gate distance; sides 348 / 264 / 355 / 258 m), then mapped onto the
game's railing polygon with a Coons patch whose sides are the game's railing polylines, so the perimeter walk follows
the game's railings. The game Green is ~31% larger in area than the real one at half scale (k = 0.57 game m per real m
against 0.5), and turned ~10° instead of ~22°. So the lake is 150 x 48 m, 2,790 m² in game (real 252 m E-W, 8,952 m²,
i.e. 2,238 m² at half scale): the same share of the park, not the absolute half-scale size. Round things (fountains,
bandstand, the Tone ring, the Three Fates pool) are placed by the map but built as true circles at near-real size;
paths keep near-real widths (main walks 3.2 m, footways 1.7-2.6 m) because people and furniture are full size.

## What was built

Paths (tarmac, world-UV texture) and setted areas; hedges; the L-shaped lake at lawn level with a stone kerb, mossy
rockwork and two planted islands; the humped rubble-granite O'Connell Bridge with parapets, newels and ramps; ducks
(26, LITE 12; drakes and hens, drifting and bobbing, updated only within 260 m); the two central fountains (granite
basins, bowls, translucent jets that glow after dark) with bedding and phormium; the white octagonal bandstand with a
shingle roof; three Victorian shelters; the red-brick Superintendent's Lodge; the Three Fates (3 statue-kit figures on
a rock in a round pool, jets); Wolfe Tone before a 240° arc of 13 rough granite pillars on a setted circle, Delaney's
Famine group behind; Lord Ardilaun and Robert Emmet on plinths facing SG West; the Yeats "Knife Edge" (two twisted
bronze blades) on its setted platform with low walls; busts of Mangan, Markievicz, Kettle and Joyce; the O'Donovan
Rossa boulder; 7 gates (granite piers with lanterns, open iron leaves, granite posts, setts); 46 benches facing their
paths; 25 park lamps (lanterns glow via `M.lampGlow`, additive light pools on the ground at night); 36 seated figures
on benches and in groups on the lawns; strollers from people.js on the paths; a jaunting car (horse with a moving
head, black car, red wheels, driver) at the park-side kerb of SG North between Dawson St and Kildare St (solid).
Planting: 92 surveyed trees (belt spacing 5.8 m, lawns 8.5 m; holly as dark-tinted lime) and 166 shrubs (the
understorey band, open at gates, plus lake shrubberies and islands). Before: ~260 trees and ~300 shrub blobs.

Substitutes: Ardilaun is standing (`frock_chest`), the real statue is seated; Tone uses `folded`; the Fates use
`allegory`/`justice`; the Famine group reuses the Gillespie famine bodies at 1.9 m.

## Checks and cost

`footprints.mjs`: 0 on roads. `bridges.mjs`: clean. No console errors. `greenperf.mjs` (High, DPR 1, headless;
GPU ms is noisy with other agents running, triangles and calls are the stable numbers):

| Spot | Tris before -> after | Calls before -> after |
|---|---|---|
| SG North | 1.70M -> 1.56M | 396 -> 461 |
| SG West | 1.32M -> 1.31M | 321 -> 365 |
| SG South | 1.41M -> 1.40M | 397 -> 449 |
| SG East | 1.72M -> 1.67M | 551 -> 589 |
| Aerial over the Green | 1.98M -> 1.74M | 546 -> 598 |

(The "before" run was on the pre-merge base; the "after" includes main's Luas rebuild, so calls are not a clean
comparison. The Green's own additions are about a dozen materials: paths, flags, bedding, lake, rocks, 2 duck meshes,
pools, sitters, carriage parts and the batched Builder materials.)

## Status (paused)

Done: everything above, verified in day and night screenshots (aerial, top-down, Grafton St / arch, lake and bridge,
bandstand, Tone ring, Three Fates, fountains, Ardilaun, Yeats, carriage); footprints and bridges clean; main (Luas
stop at the NW corner) merged in.

Left: `--mobile` run not done; `docs/research/stephens-green-interior-compare.png` not made; the night lamp pools
were raised to 0.85 opacity after the last night shot and not re-checked; the last tweaks (darker rocks, duller lake)
were not re-shot; the draw-call increase (+40-60 near the Green) could be trimmed by merging the rocks/ducks/pools
materials; no sound hooks (G12); the Lady Grattan fountain and the two small west-gate shelters were not built.

Known breakage: none known. The lake water reflects the env map a little brown at grazing angles.
