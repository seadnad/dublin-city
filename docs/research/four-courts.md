# The Four Courts (`fourCourts`): Phase 1 research

Scope: the Four Courts on Inns Quay (James Gandon, 1786-1802), its river front between Church Street and Chancery Place, Inns Quay itself, the two bridges that frame it (Father Mathew Bridge to the west, O'Donovan Rossa Bridge to the east), and the Luas Red Line's Four Courts stop.

- Raw OSM: `data/osm/four-courts.json`. Overpass `out geom`, bbox **S 53.3450, W -6.2780, N 53.3482, E -6.2690** (about 600 m E-W by 355 m N-S). Snapshot `timestamp_osm_base` 2026-09-29T13:48:31Z. It holds buildings and building:parts, highways, railway (tram, platforms), public_transport, bridges, water, barriers, amenities and historic features. The historic/administrative boundary relations that the bbox query drags in (1840s wards, 1920s constituencies; ~6 MB of outline) were stripped: 1,171 elements remain.
- References: `refs/four-courts/` holds 14 images from Wikimedia Commons (credits in §2 and `refs/four-courts/sources.json`).
- Game coordinates come from re-implementing `project()` in `src/world/geo.js` (origin 53.34727/-6.25915, SCALE 0.5, the 1.6x east-west stretch band, the 1.4x north-south band between 53.3442 and 53.3462). The Four Courts lies west of the east-west band, so its x carries the constant west shift, and its southern half lies inside the north-south band. "Real (E, N)" below is metres east/north of the dome centre; "frame (u, v)" is metres along/into the river front (see 1.2).
- All web requests used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 What the game has now (VERIFIED)

- Nothing. `sites.js` and `landmarks.js` have no Four Courts: the block between Inns Quay, Church Street and Chancery Place is ordinary filler (grey and brick terraces, see the "before" shots). Only the name survives, as the Luas stop `"NQ1": "Four Courts"` and a Dublin Bus stop name.
- **The game's Luas runs along Inns Quay** (`luas.route` … `MA1, CH1, NQ2, NQ1, NQ0, AQ1, AQ2, BB0` …) with the Four Courts stop at NQ1 on the quay and Smithfield at AQ1 on Arran Quay. **That is not where the Red Line runs** (1.3).
- The game's north quay here is **~35 m (real) north of the real Inns Quay** (NQ1 is at 53.34598; OSM's Inns Quay centreline at the same longitude is 53.34566). The streets.json header says the quay nodes were nudged away from the river to keep the compressed Liffey readable. Result: in raw projection the real Four Courts footprint would overlap the game's quay road and river edge. **The building must be placed off the game's quay line, not from its absolute OSM position.**

### 1.2 The building in OSM (VERIFIED)

Relation `4264774` (type=building, "Four Courts", amenity=courthouse) has two outline members:

| OSM | Tags | Extent |
|---|---|---|
| way `13871512` "The Four Courts", note "Main Building" | building=public, building:part, **height 20**, building:colour grey, building:material stone, heritage 4, wikidata Q1439960 | lat 53.34563-53.34662, lon -6.27452 to -6.27245: the whole Gandon complex (central block, both courtyard wings and the back ranges), 74 nodes |
| way `316667283` "Dome" | building:part, **height 40, min_height 20**, roof:shape dome, **roof:height 10**, roof:colour #99ff99, building:colour darkgrey | a circle of radius **10.6-11.6 m** centred at **53.345901, -6.273496** (game **(-602.3, 38.3)** in raw projection) |

Other parts inside the outline (`1513206128-139`) are untagged service wings. Neighbours: **Áras Uí Dhálaigh** (`52301667`, 5 levels, 1990s courts building) west of the west wing up to Church Street; **Chancery Place Courthouse** (`314537003`, 3 levels, granite, ref 14) behind the east wing; **Public Records Building** (`182856015`) and the Four Courts Repository / Court of Appeal (`1558900087/8`) at the back; **Chancery Park** (`153254211`) east of Chancery Place.

**The river front is not square to the compass.** It runs from the west pavilion corner (real E -68, N -13) to the east pavilion corner (E +64, N -30): a bearing of **97.3°** (the east end 7.3° south of due east), parallel to Inns Quay (road centreline bearing 97.5°). In a frame rotated with it (u along the front towards the east, v into the building):

| Element | Frame (u, v), real m | Notes |
|---|---|---|
| River front of the screens and pavilions | v = -21.5 | one straight line, u = -65.8 to +67.3: **133 m** (Wikipedia/Archiseek give "440 ft" = 134 m) |
| Central block face | v ≈ -20 | u = -21.1 to +22.6: **43.7 m** ("a square of 140 ft", 42.7 m) |
| Portico (with its steps) | v = -24 | u = -9.1 to +10.4: **19.5 m** wide, projecting ~3.5 m |
| Dome centre | (0, 0) | ~20 m behind the block face, i.e. the middle of the 140 ft square |
| Courtyards | u = ±22 … ±49, v = -21.5 … +14 | two, **~27 m wide x 35 m deep**, open to the river through the arcaded screens |
| Pavilions (front of the L-plan wings) | u = ±49 … ±66 | **~17 m** wide each; the wings run back ~50 m |
| Inns Quay road centreline | v ≈ -31 | 2 lanes (1 bus lane), one-way **eastbound**, R148; footpaths both sides |
| Cycle track with planters, river wall | v ≈ -41 / -47 | the Liffey balustrade on a granite quay wall |
| Chancery Street (the Luas) | v ≈ +100 … +110 | behind the back ranges and railings |

So from the portico steps to the river wall is only ~23 m: a footpath, the two-lane quay, a cycle track and the riverside footpath. The building stands right on the street.

### 1.3 The Luas: the Red Line runs **behind** the Four Courts (VERIFIED)

OSM tram ways `338055464` / `352511043` (Luas Red Line, two single-direction tracks) and the stop nodes `3451159931` / `3451318438` ("Four Courts", ref 998019, name:ga Na Ceithre Cúirteanna), platforms `278927968/9`:

- The line comes west along Mary's Abbey, crosses Chancery Place at **53.34689, -6.27155**, and runs west along **Chancery Street** (`1117934546`, sett, `service=emergency_access, access=no`: trams, pedestrians and emergency vehicles only) **behind** the Four Courts.
- **The Four Courts stop** is on Chancery Street at **53.34689, -6.27367**, directly north of the dome: two side platforms, lat 53.34677-53.34694, lon -6.27385 to -6.27306 (≈ **53 m** long, 3-4 m wide), shelters, benches, ticket machines; a railing (`1460525827/5`) and the Chancery Place courthouse behind the north platform (ref 14).
- It crosses **Church Street at 53.34705, -6.2749**, runs on at about lat 53.3471 (crossover at -6.2761) to **Smithfield** stop (**53.34715, -6.27778**, platforms `278927972/3`), and then west to Queen Street / Benburb Street (the game's BB0, 53.34717, -6.28016).
- **Neither Inns Quay nor Arran Quay carries the Luas.** No trams on the quays here.

In game coordinates the real alignment is close to a straight line from CH1 (-532.6, -49.0) to BB0 (-823.7, -39.0): the real Smithfield stop projects to (-744.6, -38.0) and the Chancery Street track to z ≈ -20 … -35 (the north-side streets are not nudged like the quay, so the gap between quay and tram is squeezed in the game). Proposed nodes (on the CH1-BB0 line so the corridor stays straight and leaves ~64 game m of depth behind the quay for the building):

| Node | Game (x, z) | Role |
|---|---|---|
| CH1 (existing) | -532.6, -49.0 | Chancery Place / Chancery Street |
| FC1 | -570, -47.7 | Chancery Street, behind the east wing |
| FCS | -606, -46.5 | **Four Courts stop** (the real stop is due north of the dome) |
| FC2 | -642, -45.3 | Chancery Street, behind the west wing |
| CSX | -664.2, -44.5 | crossing of Church Street (inserted into Church Street NQ0-CHS1) |
| SMF | -744.6, -41.8 | **Smithfield stop** (real position -744.6, -38.0) |
| BB0 (existing) | -823.7, -39.0 | Queen Street / Benburb Street |

### 1.4 How the half-scale map compresses the plot

- Along the quay: Church Street (NQ0, x = -662.2) to Chancery Place (NQ2, x = -549.2) is 113 game m. Their kerbs leave **x = -654 … -555** at the front (Chancery Place slants east as it goes north, so there is more room behind). The real front is 133 m; at the map's 0.5 it would be 66.5 m, which makes the portico and dome toy-like next to the half-scale-plan, full-height filler. **Recommendation: build the central block and dome at 0.8 in plan, heights at 0.85, and take the compression out of the courtyards and wings** (screens ~14.5 m, pavilions ~10 m each side): an 84 m front, centred on the dome's real x (-602).
- Depth: from the quay front to the tram corridor's kerb is ~64 game m at the dome. The central block (43.7 m real) at 0.8 is 35 m; the back ranges get ~15 m; a yard and the railings on Chancery Street the rest.
- Heights at 0.85 put the dome top at ~33 m: well clear of the 4-6 storey quay terraces (~15-20 m), so it reads from Merchants Quay, both bridges and down the quays, which is the point.

---

## 2. Reference images (`refs/four-courts/`)

All from Wikimedia Commons at 1280 px thumbnails (or the original if smaller). None from Google. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-front-elevation-winter.jpg | [Four Courts, Dublin (front view).jpg](https://commons.wikimedia.org/wiki/File:Four_Courts,_Dublin_(front_view).jpg) | Danielclauzier | CC BY 3.0 | 2008 | **Key elevation**, trees bare: portico, pediment and all five statues, balustrade, drum, dome, screens, the Liffey balustrade |
| 02-portico-and-drum-straight-on.jpg | [Dublin Four Courts 07.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Four_Courts_07.jpg) | Zairon | CC BY 4.0 | 2022-05-28 | Portico and drum straight on, sunlit |
| 03-portico-three-quarter.jpg | [Dublin Four Courts 10.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Four_Courts_10.jpg) | Zairon | CC BY 4.0 | 2022-05-28 | Portico depth and return, statues, the east screen arches |
| 04-west-flank-screen-and-drum.jpg | [Dublin Four Courts 12.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Four_Courts_12.jpg) | Zairon | CC BY 4.0 | 2022-05-28 | Drum over the west side; rusticated arcaded screen, balustrade, gateway pier; corner columns |
| 05-east-screen-and-pavilion.jpg | [Four Courts, Dublin 2014-09-13.jpg](https://commons.wikimedia.org/wiki/File:Four_Courts,_Dublin_2014-09-13.jpg) | August Schwerdfeger | CC BY 4.0 | 2014-09-13 | **East screen and pavilion**: open arches with railings, balustrade, the triumphal-arch gate with its carved trophy, the three-storey granite pavilion |
| 06-driver-view-from-odonovan-rossa-bridge.jpg | [The Four Courts from O'Donovan Rossa Bridge - geograph 2196097](https://commons.wikimedia.org/wiki/File:The_Four_Courts_from_O%27Donovan_Rossa_Bridge_-_geograph.org.uk_-_2196097.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-12-13 | Driver's eye off the bridge: the east pavilion on the Chancery Place corner |
| 07-rossa-bridge-and-four-courts-from-essex-quay.jpg | [The O'Donovan Rossa Bridge and the Four Courts from Essex Quay - geograph 2199893](https://commons.wikimedia.org/wiki/File:The_O%27Donovan_Rossa_Bridge_and_the_Four_Courts_from_Essex_Quay_-_geograph.org.uk_-_2199893.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-12-13 | Up the river from Essex Quay: the bridge, the dome over the terraces |
| 08-dome-on-skyline-looking-west.jpg | [Four Courts and Father Mathew Bridge Dublin.JPG](https://commons.wikimedia.org/wiki/File:Four_Courts_and_Father_Mathew_Bridge_Dublin.JPG) | YvonneM | CC BY-SA 3.0 | 2011-04-10 | Sunset up the river: the drum and dome on the north-quay skyline |
| 09-river-view-with-bus.jpg | [Dublin Four Courts 11.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Four_Courts_11.jpg) | Zairon | CC BY 4.0 | 2022-05-28 | The whole river front, the east pavilion, a Dublin Bus on Inns Quay |
| 10-quay-trees-and-drum.jpg | [Dublin Four Courts 01.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Four_Courts_01.jpg) | Zairon | CC BY 4.0 | 2022-05-28 | The Inns Quay tree line with the drum over it |
| 11-twilight-floodlit.jpg | [Four courts Inns Quay Dublin.jpg](https://commons.wikimedia.org/wiki/File:Four_courts_Inns_Quay_Dublin.jpg) | Paddyjunki | CC BY-SA 3.0 | 2009-05-08 | **Night look**: floodlit stone, lit arches and windows, lamps in the river |
| 12-night-portico.jpg | [The Four Courts, Dublin captured at night..jpg](https://commons.wikimedia.org/wiki/File:The_Four_Courts,_Dublin_captured_at_night..jpg) | John Flanagan | CC BY 2.0 | 2016-01-17 | Floodlit portico columns at night |
| 13-moses-statue.jpg | [Four Courts Moses.jpg](https://commons.wikimedia.org/wiki/File:Four_Courts_Moses.jpg) | FrankFlanagan | CC BY 4.0 | 2026-03-14 | Edward Smyth's Moses with the tablets (pediment apex), Portland stone |
| 14-luas-four-courts-stop-chancery-street.jpg | [Tram Lines-1180699, Four Courts, Dublin, Ireland.jpg](https://commons.wikimedia.org/wiki/File:Tram_Lines-1180699,_Four_Courts,_Dublin,_Ireland.jpg) | Leimanbhradain | CC BY 4.0 | 2024-07-15 | **The Luas stop on Chancery Street**: platform, shelter, ticket machine, span wires, "EXCEPT TRAMS", the granite Chancery Place courthouse |

Useful Commons candidates not downloaded: `Four Courts Justice.jpg`, `Four Courts Mercy.jpg`, `FourCourts Wisdom.jpg`, `Four Courts Authority.jpg` (the other four Smyth figures, FrankFlanagan, CC BY 4.0); `Dublin, the Four Courts from Merchant's Quay - geograph 3302618/9` (1993); `Four Courts - geograph 6422953/6422963` (N Chadwick, 2018; rate-limited during download); `Na Ceithre Cúirteanna.jpg` (the stop's bilingual sign, CC BY-SA 3.0).

---

## 3. Landmark profile

### 3.1 Facts (verified)

- **Architects:** Thomas Cooley (1776-84: the west wing, the Public Offices) and **James Gandon** (1785-1802: the central block, the dome, the east wing, the screens). Built 1786-96, the arcades and wings finished 1802 (Wikipedia; NIAH 50070269).
- **1922:** shelled by the National Army at the start of the Civil War (28 June) and gutted; the Public Record Office behind it was blown up. **Rebuilt 1924-31** by the OPW (T. J. Byrne), reopened 1932. The exterior was restored closely; the dome's inner shell and Gandon's interior decoration were lost (NIAH; Wikipedia).
- **NIAH 50070269:** "freestanding courthouse … **five-bay two-storey centre block** with **pedimented hexastyle Corinthian portico** to front (south) elevation, **colonnaded drum and dome** over, flanked by **three-storey L-plan wings** with **arcaded screens enclosing courtyards**"; "Portland stone balustraded parapet to central block, having **statues of Authority and Wisdom**"; "**copper stepped saucer dome**" on a "cylindrical **granite drum**" surrounded by "**Portland stone Corinthian columns**"; courtyards with "round-headed openings … forming open arcade", "cast-iron railings on granite plinths", "Portland stone balustrades" and a "carved granite central **triumphal arch**"; hipped slate roofs.
- **Statues** (Edward Smyth): **Moses** on the pediment apex, **Justice** and **Mercy** at its ends, and seated **Wisdom** and **Authority** "at each extremity of the front, over the coupled pilasters" (Archiseek, after the 1830s descriptions; refs 01, 03, 13). Trophies of arms stand over the triumphal arches in the screens (the east gate carries the Irish harp with Justice, Security and Law; the west, a royal shield in oak leaves).
- **Dome / lantern:** "a circular lantern of the same diameter as the hall, **64 feet** [19.5 m], ornamented by **24 pillars**, and lighted by **twelve windows**" (Archiseek). The OSM dome part has an outer radius of 10.6-11.6 m (the column ring), consistent.
- **Central pile:** "a square of 140 feet"; the Round Hall inside is 64 ft across.

### 3.2 Dimensions and heights (estimated, from refs 01, 02, 04 and OSM)

No surveyed elevation was found. Scaling ref 01 (a near-square-on shot across the river) by the central block's 43.7 m width, with a perspective correction for the set-back drum and dome (they stand 14-25 m further from the camera than the front):

| Level | Real (m above street) | Game (x0.85) |
|---|---|---|
| Portico platform / steps | ~1.0 | 0.85 |
| Portico column (base to capital top), ~1.2 m diameter | 1.0 → 12.6 | 0.85 → 10.7 |
| Entablature top | ~14.6 | 12.4 |
| Balustrade top | ~16.6 | 14.1 |
| Pediment apex (Moses stands on it) | ~18.4 | 15.6 |
| Drum podium top / colonnade base | ~23 | 19.5 |
| Drum entablature top | ~31 | 26.5 |
| Attic ring / dome springing | ~33 | 28 |
| Dome crown | ~39-41 (OSM: 40) | 33-35 |

- Portico: six columns, ~3.1 m centre to centre (15.5 m between the outer centres), one return column each side; pediment pitch ~13°.
- Drum: colonnade ring radius ~11 m, drum wall radius ~9.5 m; 24 columns, windows in alternate bays (12), blind panels between.
- Screens: an open arcade of round-headed arches on a rusticated granite base with a Portland balustrade, height ~8.5 m; a taller triumphal arch in the middle of each.
- Pavilions: three storeys (~15 m to the eaves), 3 bays to the river, rusticated ground floor, hipped slate roofs.

### 3.3 Colours (hex estimates, sampled from the refs)

| Surface | Hex | Note |
|---|---|---|
| Portland stone, lit (columns, portico, balustrades, statues) | `#d7d5d3` (sun) / `#cfcdcf` (overcast) | refs 04, 01 |
| Granite ashlar, lit (drum, block, screens) | `#a59c90` (sun) / `#857f7f` (overcast) | a warm mid grey, darker than the Portland |
| Granite, pavilions (weathered, darker) | `#8a857c` lit, `#605e5a` shade | ref 05 |
| Copper dome (verdigris) | `#90a49b` (sun) … `#7e9f8f` | pale, grey-green, not saturated |
| Slate roofs | `#64686a` | ref 05 |
| Quay wall | `#6d686a` | the Liffey balustrade is cream-white balusters on a dark granite coping |
| Openings / arches (shadow) | `#2a2b2c` | cast-iron railings `#1b1c1d` |

### 3.4 Five recognisable cues

1. **The drum and saucer dome**: a tall colonnaded granite drum with white columns, a pale green copper saucer on top, visible up and down the river (refs 07, 08, 10, 11).
2. **The six-column Corinthian portico** with its pediment, **Moses on the apex** and figures on the corners (refs 01, 02, 03).
3. **The two arcaded screens** with their balustrades and central triumphal arches, the courtyards seen through the arches (refs 04, 05).
4. **The squat three-storey granite pavilions** at both ends, hipped slate roofs (refs 05, 06, 09).
5. **Its place on the river**: a 440 ft front set straight along Inns Quay behind the Liffey balustrade and a row of trees, between Father Mathew and O'Donovan Rossa bridges.

### 3.5 Context

- **Inns Quay** is one-way **eastbound** (R148), two lanes with a bus lane, a segregated cycle track on the river side, a tree line on the building side. Dublin Bus stop 1478/7856 "Four Courts" in front.
- **Father Mathew Bridge** (1818, three granite arches) at Church Street, **O'Donovan Rossa Bridge** (1816, three granite arches) at Chancery Place / Winetavern Street. Both already exist in the game as generic bridges.
- **Night:** the whole front is floodlit warm white from below, the drum and dome too; windows and the screen arches glow (refs 11, 12).

---

## 4. Build brief (prioritised)

### P0: the hero, placed off the game's quay

1. Site frame: the front runs parallel to the chord NQ0→NQ2 of the game's quay (bearing ~97.9°, local rotation -0.137), the front line 9.3 m north of the chord (quay half-width 5.5 + footpath 3.5 + 0.3), plus the portico's depth; the dome axis at x ≈ -602 (its real x).
2. Blender hero (`tools/blender/build_fourcourts.py`, kit pipeline, built directly in game metres, heights at 0.85): central block with the hexastyle portico and pediment, the Portland balustrade, the colonnaded drum (24 columns, 12 windows) and stepped copper saucer dome; two screens with open round arches (railings in them), balustrades and triumphal arches; two three-storey pavilions and wings; back ranges. **Budget ~12-16k triangles.**
3. Statues from the statue kit (`addStatue`, Portland finish): Moses (apex), Justice and Mercy (pediment ends), Wisdom and Authority (block corners, seated in reality; standing kit bodies are an acceptable proxy).
4. Night: a floodlit material set (full-height wash including the drum), windows glowing.
5. `sites.fourCourts` (Places entry, view from Merchants Quay), `reserved` footprint, collision boxes.

### P1: move the Luas off the quays (1.3)

6. Route `… MA1, CH1, FC1, FCS, FC2, CSX, SMF, BB0 …`; stops `FCS: "Four Courts"`, `SMF: "Smithfield"`. Add **Chancery Street** (CH1-FC1-FCS-FC2-CSX) as a tram and pedestrian lane (like Benburb Street); insert CSX into Church Street.
7. The Four Courts stop with the full stop kit (luasStop.js): two side platforms (~26-30 m in the compressed map), a shelter run each side, ticket machines, poles and wires.

### P2

8. The tree line on the Inns Quay footpath in front of the building (the game currently has its quay trees on the river side only).
9. Áras Uí Dhálaigh and the Chancery Place courthouse as simple granite blocks (filler covers them for now).

---

## 4b. Phase 2: what was built

- **Hero:** `tools/blender/build_fourcourts.py` → `public/models/fourcourts.glb` (**8.4k triangles**, 115 KB, Draco, AO baked in vertex colours). Central block at 0.8 plan with the hexastyle portico (6 + 2 return columns, coffered soffit, pediment, railings between the columns), rusticated/ashlar walls, Portland entablature and balustrade, coupled corner columns; the drum (podium, 24 columns, 12 windows, entablature, attic) and stepped copper saucer (crown ~36.5 m); two arcaded screens (4 open arches with railings each, balustrade, triumphal-arch gateway with the arms and a trophy); pavilions and wings, back ranges, chimneys. Heights are 0.85 of real stretched 1.1 on build (0.94 of real).
- **Placement:** `sites.js` `FC` / `fcAt()` (front parallel to the NQ0-NQ2 chord, portico steps at the back of the north footpath, dome axis at its real x); `sites.fourCourts` (Places entry, view off O'Donovan Rossa Bridge, matching ref 06), `extraSites.fcPortico`, both in `reserved`; collision boxes and the five statue-kit figures (Portland finish) in `landmarks.js fourCourts()`.
- **Materials / night:** `heroes.js` `fportland`, `fgranite`, `frustic`, `fcopper` (a painted standing-seam copper tile), `fcut` with a `floodlit()` shader: a full-height warm wash including the drum and dome (the Parliament House `uplit` fades out above 11 m); windows glow through the shared decal atlas; three warm reflections in the Liffey.
- **Quay trees:** a gap in the Inns Quay tree row in front of the portico (`furniture.js`).
- **Luas:** rerouted `… CH1, FC1, FCS, FC2, CSX, SMF, BB0 …` (1.3): the tram no longer runs on Inns Quay / Arran Quay / Queen Street; **Chancery Street** added as a tram and pedestrian lane (CH1-CSX, setts), CSX inserted into Church Street; stops `FCS: Four Courts` (full stop kit: 28 m side platforms, shelter runs, poles and wires) and `SMF: Smithfield` (simple platforms). The stop kit's sign atlas now gives every kitted stop its own row (it used to overwrite one row, so a second kitted stop showed the last name), and the totem carries the Red Line band and the Irish name (Na Ceithre Cúirteanna).
- **Checks:** `footprints.mjs` 0 hits, `bridges.mjs` clean, `dupcheck` ok, no console errors (desktop and `--mobile`). Headless frame sample at the Places view: 24 fps facing the building vs 27 fps facing away (same spot; noisy headless numbers), ~+68k scene triangles in view including the statue kit. Comparison sheet: `docs/research/four-courts-compare.png` (refs 01, 05, 06, 11, 14 against the game).

## 5. Open questions

1. **Luas alignment.** The owner's brief (and the game) put the Red Line on Inns Quay. It really runs along Chancery Street behind the building (1.3). This pass follows reality; if the tram passing the front is wanted for the look, the old route can be restored in `luas.route`.
2. **Heights.** No surveyed elevation. The dome crown at ~40 m matches OSM's `height=40`; the drum levels are photogrammetric (±1.5 m).
3. **Plan compression.** The courtyards and pavilions are squeezed to ~0.55 of real so the central block and dome can stay at 0.8. A wider site (moving Church Street's quay node west) would let them breathe.
4. **Seated statues.** Wisdom and Authority are seated; the statue kit has no seated body.
5. **Quay tree line** is on the building side in reality; the game's quay trees are on the river side (a whole-quay furniture question, not this landmark's).

## Sources

- OSM via Overpass (ODbL): `data/osm/four-courts.json`
- [Four Courts, Wikipedia](https://en.wikipedia.org/wiki/Four_Courts)
- [NIAH 50070269, Four Courts, Inns Quay](https://www.buildingsofireland.ie/buildings-search/building/50070269/four-courts-inns-quay-dublin-7-dublin)
- [Archiseek, Architecture of the Four Courts (after the 1830s descriptions)](https://www.archiseek.com/architecture-of-the-four-courts-dublin/)
- [Archiseek, 1802 The Four Courts, Inns Quay](https://www.archiseek.com/1802-the-four-courts-inns-quay-dublin/)
- [Luas: Four Courts stop](https://www.luas.ie/stops/four-courts/) (via the OSM `website` tag)
- Wikimedia Commons images as listed in §2
