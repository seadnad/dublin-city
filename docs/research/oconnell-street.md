# O'Connell Street: the frontages, the Gresham, trees, lamps, stops, Busáras (`oconnell-street`)

Scope: give O'Connell Street (Lower and Upper) specific buildings on both sides instead of generic filler; build the
Gresham; fix the trees that hid Clerys; the street's lamp standards and bus stops; improve Busáras and clear the filler
that hid it. Existing heroes left as they were: the GPO, the Spire, the monuments and islands (`oconnell.js`,
`statues.js`), Clerys and the Parnell Square block (`northcity.js`), O'Connell Bridge House, the Luas (main's routing).

Data: `data/osm/oconnell-street.json` (Overpass `out geom`, bbox S 53.3474 W -6.2632 N 53.3532 E -6.2578: buildings,
parts, shops/amenities, lamps, stops, trees, highways; `timestamp_osm_base` 2026-05-31T22:37:44Z, served by
overpass.kumi.systems; 1,743 elements; ODbL). Generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`.

## 1. Survey (OSM, real chainage from the quay north along the street's axis, bearing ≈ 345°)

Real street ≈ 560 m quay to Parnell St; the game's is 273 m (NQ8 → OC4), so ≈ 0.49 along. Levels are OSM `building:levels`.

**East side.** 1 Lower (corner of Eden Quay, red brick, big advertisement) · 2-4 (bank, stone) · 5 (pharmacy) · 6-7 (bank) ·
8 (amusements) · 9 (café) · 10-11 (the Grand Central bar, an old bank front) · *Abbey St Lower* · 12-13 (savings bank,
stone) · 14-15 (5 lv) · 16-17 (fast food / restaurant) · **18-27 Clerys** (6 lv) · 28 (4 lv) · 29 (Ionic columns, oval
windows; ref 15) · 30-31 (4 lv) · 32-34 (shops, gifts, tours) · *North Earl St* · 1-2 Upper (6 lv) · **3 Upper, the Happy
Ring House** (red brick, the neon bells, lettering and couple; refs 12-13) · 4-6 (5 lv) · 7-8 (fish and chips,
convenience) · *Cathedral St* · **Hammam Buildings 11-13** (6-7 lv, 1920s stone) · 14-15 (4 lv) · **the Savoy 16-17**
(1929, remade; ref 04) · 18-19 · **the Gresham 20-23** (5 lv + attic; refs 01-03) · *Cathal Brugha St* · 28-32 (6 lv, the
1970s block on the Findlater's site) · 33-36 (pubs, shops) · Parnell St.

**West side.** 55-56 Lower (corner of Bachelors Walk) · 53-54, 52, 50-51 (the fast-food fronts) · **49, the Confectioner's
Hall** lettering (ref 19) · 47-48, 45-46 · *Abbey St Middle* · 43-44 Manfield Chambers · **40 Eason's** (1919; the clock,
refs 08-11) · 39 Penneys · *Prince's St* · **the GPO** · *Henry St* · 69 Upper · **67-68, Funland** (the historic sign) ·
65-66, 63-64 · 62 · 60-61 · **59, Dublin Bus head office** (ref 18) · 57-58, 55-56 · **the Carlton 52-54** (1938 art deco,
derelict; refs 05-07) · vacant site 52 · 47-51 (1970s offices, ref 16) · 43-46 · **42, the last Georgian house** (Cassels,
1752; ref 17) · 40-41, the Royal Dublin Hotel site (vacant, a mural hoarding) · 37-38 (bank) · 33-36 · Parnell St.

**Trees (OSM).** Big trees (7 m) at the kerbs every ~12 m (real) south of Abbey St and through the Upper street; small
3 m trees in front of Clerys and the GPO; the islands carry groups of small trees (the 2006 plan's rowans). **Lamps:**
kerb standards every ~20-25 m (real) both sides, plus lamps on the islands. **Stops:** 14 Dublin Bus stops (OSM
`shelter=no` for nearly all; ref 23 shows one shelter by the Dublin Bus office).

## 2. References (`refs/oconnell-street/`, credits in `sources.json`)

All from Wikimedia Commons (CC0 / CC BY / CC BY-SA), ≤ 1280 px: 01 Gresham 2010 (Ardfern, CC BY-SA 3.0) · 02 Gresham 2022
(Yair Haklai, CC BY-SA 4.0) · 03 Gresham 2009 (Sir James, CC BY-SA 3.0) · 04 Savoy 2024 (Ridiculopathy, CC0) · 05 Carlton 2010
(Ardfern) · 06 Carlton 2011 (Eric Jones, CC BY-SA 2.0) · 07 vacant site by the Carlton 2023 (Conoronmaps, CC BY-SA 4.0) ·
08 and 11 Eason's (Eric Jones) · 09 Eason's clock (johnmacward, CC BY-SA 3.0) · 10 Eason (psyberartist, CC BY 2.0) · 12 Happy
Ring House (Ardfern) · 13 Happy Ring House (psyberartist) · 14 the street (William Murphy, CC BY-SA 2.0) · 15 29 Lower (Yair
Haklai) · 16 47-51 Upper and 18 Dublin Bus head office (Conoronmaps) · 17 42 Upper (Smirkybec, CC0) · 19 Confectioner's
Hall (psyberartist) · 20 Penneys (Suzanne Mischyshyn, CC BY-SA 2.0) · 21 night (Voytazz86, CC BY-SA 3.0) · 22 the street
2020 (Jonjobaker, CC BY-SA 4.0) · 23 bus stop 2025 (4300streetcar, CC BY 4.0) · 24 the Lower street 2017 (Gerd Eichmann,
CC BY-SA 4.0) · 25 columns (psyberartist). Busáras refs are `refs/north-city/08-16`.

## 3. What was built

- **Layout** (`src/world/ocstreet.js`, data `src/data/oconnellst.json`): the free frontage runs on each side (between
  side streets and the GPO / Clerys) are found from the street graph, and each run's buildings (real order, real
  widths) are shared out along it (notables weighted up, a minimum width each). Each building is reserved in
  `sites.js` (`extraSites.oc_*`), so the filler leaves the frontage to it. The Gresham joins Places.
- **Facade kit** (`src/world/ocfacades.js`): procedural fronts with real recessed openings, shopfronts (pilasters,
  fascia with the sign, display, stall riser), string courses, cornices, parapets / balustrades, pilasters, columns,
  quoins, corner returns; one 2048 atlas (Low: 1024) of windows (4 lit variants each), shop displays, fascias and
  signs, with a night twin. Hero recipes: **the Gresham** (arcade of round-headed windows, the name frieze, the glass
  canopy, balustraded balcony with three flags, end pavilions, cornice, central attic with urns, mansards with
  dormers), **the Savoy** (film banner, poster foyer, vertical SAVOY sign, black bay), **the Carlton** (giant
  pilasters, blue deco windows with CARLTON letter panels, torch finials), **Eason's** (corner building with the
  clock), the Happy Ring House neon, Funland, the Confectioner's Hall, No. 42 (Georgian door, fanlight, railings),
  vacant sites behind mural hoardings. Shop names are invented except the historic ones. Two meshes per material
  (Lower / Upper street): ~14 draw calls for the whole street.
- **Trees** (`oconnellTrees` in `ocfacades.js`, used by `landmarks.js`): planted from the OSM trees: small rowans in
  groups on the islands, big planes only where OSM has 7 m trees, young trees in front of Clerys and the GPO. Clerys
  now reads from the GPO and the west carriageway.
- **Lamps** (`props.js`): an O'Connell Street standard (slim silver pole, long high arm over the road and a short low
  one over the footpath, dish heads), both kerbs every 13 game m.
- **Bus stops** (`furniture.js`): at the OSM stop positions (the random boulevard stops dropped, rand draws kept),
  shelters at the Dublin Bus / Gresham / Cathal Brugha stops.
- **Busáras** (`build_northcity.py`, `northcity.glb` 164 KB): the wavy canopy rebuilt as a white folded plate (deeper
  waves, thick lip), bigger penthouse "hats", the tall stone chimney on the west end. The Busáras yard now runs through
  to Amiens Street (no filler side-on in front of it from the east); Docklands-style glass filler within 95 m of
  Busáras becomes 3-5 storey brick (post-placement, no rand() draw changes).
- Jim Larkin checked: arms read (right arm up, left out) outside Clerys. Not changed.

## 4. Eason's (not where it should be)

In the game the GPO (54 m long from the Spire south) reaches to within ~3 m of Abbey Street Middle, so Eason's,
Penneys and Manfield Chambers have no frontage on O'Connell Street. Eason's is built as the corner building: its
narrow end on O'Connell Street with the clock, its long front along Abbey Street Middle in front of the GPO's flank.
Penneys and Manfield Chambers are not built.

## Status (paused)

Paused by the coordinator (usage limit). The branch is committed and was working at the last run:
`footprints.mjs` 0 footprints on roads, `bridges.mjs` clean (`bad: {}`), no console errors, main merged in (the rebuilt
Luas on the west lane of O'Connell St shows with the new frontages; lamps and stops stand at the kerbs, clear of the
track and platforms).

Done: research survey and refs (sections 1-2); layout, facade kit and heroes (the Gresham, the Savoy, the Carlton,
Eason's corner, the signs); OSM trees (Clerys visible); lamp standards; OSM bus stops; Busáras canopy / penthouse /
chimney and its surroundings; Places entry for the Gresham.

Left:
- The last stone-texture / shop-display tone-down (paler Portland, calmer displays) and the enlarged Busáras yard are
  committed but **not re-screenshotted**.
- Night review (lit shop windows, signs, the Gresham canopy) not checked in shots; the atlas night twin is built and
  `setNight` wired, but untested visually.
- `--mobile` run, frame-cost measurement (the street adds ~14 draw calls, ≈ 20-25k triangles, one 2048 atlas + half-size
  night atlas; Low / Battery saver paint them at half size), and `docs/research/oconnell-street-compare.png`.
- Not built: Penneys and Manfield Chambers (no room, section 4); the Clerys detail lift (visibility fixed by the
  trees only); median hedges; more pedestrians on the street (people.js already weights the boulevard 4x).
- Research doc detail (dates, architects per building) is thin; heights come from OSM levels.
