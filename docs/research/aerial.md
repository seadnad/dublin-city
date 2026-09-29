# The view from the air (and the Poolbeg chimneys)

The owner asked for more of the city to be visible from the helicopter, and for the Poolbeg chimneys in the
distance. Comparison sheet: `docs/research/aerial-compare.png` (before on the left, after on the right).

## What was wrong

- The view distance and fog were tuned for the street: 600 m on Low (950 m on Medium and High), and exp2 fog dense
  enough to hide the far plane. From the air the helicopter pushed the far plane out by up to 50 % and made the
  fog *thicker* to hide the new edge, so at 150-250 m the city melted into a milky wall about 800 m away.
- Beyond the map there was a flat dark apron and nothing else: no bay, no hills, no Poolbeg.
- Most of the triangles from the air were trees (1-2.5k triangles each, drawn up to the far plane) and the shadow
  pass; buildings were already cheap instanced boxes.

## What changed

### A far view drawn behind the city (`src/world/farview.js`, `src/render/pipeline.js`)

The scene is drawn in two passes: first a separate far scene with its own camera (same pose, near plane at 85 % of
the main far plane, far plane 16 km), then the city over it with only the depth cleared. The main view distance and
its culling are untouched, so the street costs the same; everything beyond it is cheap:

- **Ground**: a top-down capture of the city itself (roads, parks, water, pitches, roofs, with the sun's shadows
  over the whole map from a one-off full-map shadow map), redrawn when the weather or time of day changes (about
  20-50 ms). It is drawn with the shaders the city already has for where it is drawn now: into the post-processing
  target on Medium / High, and on Low into a target flagged as an XR one, which gives the screen's tone mapping and
  sRGB output (so no new shaders); the far shader undoes the ACES tone map. Lights inside the moving objects are left
  in during the capture so the shaders' light counts don't change either.
- **Filler buildings**: all 44k lots as boxes with vertex colours: the facade shader's far colour for walls, its
  lead / felt for roofs, and a warm window glow after dark. A 2 m occupancy grid drops walls hidden by a neighbour
  (party walls, the insides of blocks) or starts them at the neighbour's roof: 104k walls instead of 177k.
- **Landmarks and heroes**: blocky columns from a top-down height capture of everything but the filler, trees and
  props (1.5 m height steps, greedy-merged), coloured from the ground capture; the Spire as a needle; Croke Park
  and the Aviva as clones of their own far LODs (lit by copies of the sun, fill and sky lights).
- **Trees**: every tree as an octahedral blob, plus the Phoenix Park woods' clumps.
- **Beyond the map**: a painted ground 17 x 16 km (suburbs of roofs and gardens, radial main roads and an orbital
  ring, fields toward the hills, street lights after dark), Dublin Bay flooded from the OSM coastline
  (`src/data/bay.json`, from `data/osm/dublin-bay-coastline.json` via `tools/bay-coast.mjs`), estates of terraces in
  a ring round the map, the Dublin and north Wicklow mountains and Howth Head as a terrain mesh from real summits
  (heights x 0.6), and the Poolbeg chimneys.
- The old dark apron is now the painted ground (plain until someone first flies).

Everything uses one shader: albedo x (hemisphere + sun + fill + sky) per vertex, the game's fog, night glow. It is
built in the background in slices of ~10 ms from the moment the helicopter or photo mode is entered (about 4-6 s on
the Vega 8), so it is normally ready by the time the camera is 25 m up. Memory: the capture (1024 x 662 on Low,
2048 x 1325 elsewhere) and the painted ground (1024² / 2048²).

### Haze from the air (`src/world/atmosphere.js`, `src/main.js` updateView)

The fog curve turns from exp2 (a wall at the view distance, right for the street) to plain exponential between
30 and 160 m of camera height, and from the air its density is set so the ground is half hazed at ~4.5 km (less in
the rain, from the preset's own haze). At street level the fog is exactly as before. This applies to the helicopter
and to the photo mode's free camera alike.

### Shadows

The shadowed square round the player now fades out over its outer 18 % instead of ending in a hard line (visible
from the air; a small improvement at street level too). Coverage with height is unchanged (60 m + 0.8-1.2 x height).

### Low / Battery saver only

From the air, modelled trees are drawn only within 400 m; the far view's blobs stand in beyond (in the main view
too, so there is no gap). This is the only looks-for-speed trade. High and Medium keep every tree to the far plane.

## Numbers

Headless Chrome on the owner-class AMD Vega 8 (Auto picks Low), PERF=1 (uncapped), dpr 1, other agents running
at the same time (fps is indicative; calls and triangles are averaged over 30 frames). Calls now count every pass
(the far view's ~35-60 included).

| view | before calls / tris | after calls / tris | fps before / after |
|---|---|---|---|
| street, car on O'Connell Bridge | 417 / 1.37M | 417 / 1.37M | 34 / 35 |
| street, looking down the river | 371 / 1.35M | 372 / 1.35M | 38 / 41 |
| 50 m, north | 317 / 1.32M | 344 / 1.32M | 31 / 33 |
| 150 m, south | 506 / 1.93M | 545 / 1.45M | 29 / 32 |
| 150 m, west | 445 / 1.37M | 490 / 1.56M | 28 / 27 |
| 250 m, north | 390 / 1.70M | 413 / 1.53M | 27 / 29 |
| 250 m, east | 414 / 1.74M | 447 / 1.42M | 30 / 31 |
| 250 m, south | 518 / 2.07M | 550 / 1.52M | 29 / 30 |
| 250 m, west | 472 / 1.46M | 515 / 1.60M | 29 / 27 |
| night, 250 m north | 397 / 1.69M | 423 / 1.52M | 40 / 40 |

Phone emulation (844 x 390 @2x, Low): street 430 / 1.43M both before and after; 250 m S 575 / 2.24M before,
613 / 1.67M after; 250 m E 428 / 1.82M before, 461 / 1.44M after; fps the same within noise (40-45).

The far view itself: 387k triangles in all (drawn: 120-220k from 250 m), 35-60 draw calls. Ground recapture on a
weather change: 45-55 ms including the GPU. Build: 4-6 s of background slices; the longest single slice is the
first draw of parts of the map never seen from the car (buffers and textures going up to the GPU), 200-300 ms,
three or four times.

## The Poolbeg chimneys

- Two reinforced concrete stacks of the ESB Poolbeg Generating Station: 207.48 m (1971, the western one) and
  207.8 m (the eastern), about 80 m apart east-west (OSM ways 231691395 and 231691394, heights tagged; pulled to
  `data/osm/poolbeg-chimneys.json`). Protected structures since 2014, disused since 2010.
- Slender tapering cylinders (modelled 15 m across at the foot, 7.4 m at the top). The lower half is plain weathered
  red-orange concrete; the upper half has alternating white and red bands (the game uses 13, white first) with a red
  band at the top, a dark rim, and gallery rings at mid height, three quarters and the top. Red obstruction lights
  on the galleries after dark.
- Placed with the map's projection at full height (the game keeps real heights on a half-scale plan), outside the
  playable area. They are drawn in the far view with a thinned fog capped at 42 %, so they show from the quays: from
  North Wall Quay and the river by the Sean O'Casey / Beckett bridges; from O'Connell Bridge itself the south quay's
  buildings hide them, as they would in the half-scale plan. A camera that wanders within ~550 m of them draws them
  with the city instead. The turbine hall and boiler house are three plain blocks.

### Sources (CC-licensed, local copies in `refs/poolbeg/`, listed in `refs/poolbeg/sources.json`)

| File | Author | Licence |
|---|---|---|
| [Poolbeg chimneys - geograph.org.uk - 1537589.jpg](https://commons.wikimedia.org/wiki/File:Poolbeg_chimneys_-_geograph.org.uk_-_1537589.jpg) | Eirian Evans | CC BY-SA 2.0 |
| [Pigeon House Chimneys, aerial 2015 - geograph.org.uk - 4690184.jpg](https://commons.wikimedia.org/wiki/File:Pigeon_House_Chimneys,_aerial_2015_-_geograph.org.uk_-_4690184.jpg) | Chris | CC BY-SA 2.0 |
| [Poolbeg Generating Station (48485989116).jpg](https://commons.wikimedia.org/wiki/File:Poolbeg_Generating_Station_(48485989116).jpg) | Maciej Brencz | CC BY 2.0 |
| [Poolbeg Chimneys, Dublin Bay, viewed from Booterstown, 19 July 2022](https://commons.wikimedia.org/wiki/File:Poolbeg_Chimneys,_Dublin_Bay,_viewed_from_Booterstown,_19_July_2022_1630_(1649c).jpg) | Djm-leighpark | CC BY-SA 4.0 |
| [Clontarrf view towards Poolbeg.jpg](https://commons.wikimedia.org/wiki/File:Clontarrf_view_towards_Poolbeg.jpg) | Metro Centric | CC BY 2.0 |

Heights and positions: OpenStreetMap contributors (ODbL); heights also on Wikipedia's Poolbeg Generating Station
article. Coastline: OpenStreetMap `natural=coastline` (ODbL). Mountain summits from general knowledge of the
Dublin / Wicklow hills (approximate).

## Tools

- `tools/scenarios/aerial.mjs`: street, 50 / 150 / 250 m in four headings, photo mode, night; numbers and shots
  (`PERF_ONLY`, `SHOTS_ONLY`, `ONLY=150,250`, `HAZE=`, `RAIN=1`, `NIGHT=0`). Runs on the old build too.
- `tools/scenarios/poolbeg.mjs`: the chimneys from the bridge and the quays, day and night (`CLOSE=1` for close ups).
- `tools/scenarios/farparts.mjs` (hide each far-view part in turn), `capdump.mjs` (dump the captures),
  `aerialprobe.mjs` / `evalprobe.mjs` (where the calls and triangles go), `tools/sheet.mjs` (comparison sheets).

## Trade-offs and not done

- From the air the far city is plain boxes: no windows by day, no facade detail, blocky landmark columns (domes and
  pitched roofs are stepped). From 150-250 m they are a few pixels across; up close in photo mode the seam at the
  main far plane is visible as a change in detail.
- The ground capture is a snapshot: traffic, people and the Luas aren't in it; puddles, lamp pools and shadows are
  as they were when it was taken.
- Low: trees beyond 400 m from the air are blobs (dark octahedra), noticeable on a close look at College Park.
- The first build hitches 200-300 ms a few times while buffers upload. The painted ground beyond the map is only
  made on first flight, so until then the apron at the map edge stays plain.
- Park tree LOD (park.js) swaps to 2D-distance proxies and draws proxies on top of the packed trees for far cells;
  a 3D-distance version was tried and reverted (it doubled the drawing from the air). Worth fixing separately.
- Not done: port cranes, Poolbeg lighthouse / the Great South Wall as geometry (the wall is in the coastline
  painting only), the Guinness Storehouse (another agent), separate far LODs for the other heroes.
