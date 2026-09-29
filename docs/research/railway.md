# The city-centre railway (`railway`): the Loop Line, Connolly, Tara Street, Pearse and the DART

Scope: the DART line from the Great Northern main line just north of the Royal Canal, through Connolly (the Loop Line platforms 5-7), over Amiens Street, Talbot/Store Street and Beresford Place, across the Liffey on the **Loopline Bridge**, through **Tara Street**, over Townsend Street and Pearse Street/Westland Row into **Pearse** station, then on the Dublin & Kingstown viaduct past **Grand Canal Dock** (already built in `src/world/barrowst.js`) down to the **Lansdowne Road** level crossing (already built in `landmarks.js lansdowneCrossing`). Also the Tara Street fire station's hose tower, a skyline item left "not done" in `tallest-buildings.md`. Busáras, the Custom House Quay dressing and the Luas (including any Red Line spur to Connolly) belong to other briefs.

- Raw OSM: `data/osm/railway.json` (query in `data/osm/railway-query.txt`). Overpass `out geom tags`, bbox **S 53.3300, W -6.2560, N 53.3620, E -6.2150**: every `railway=rail|platform|station|light_rail` way, station/halt/stop/level-crossing nodes, train platforms, `building=train_station`, bridges between the Custom House and Pearse, and the fire station. Snapshot `timestamp_osm_base` 2026-09-29T21:03:20Z, 614 elements.
- References: `refs/railway/`, 18 images from Wikimedia Commons (credits in §2 and `refs/railway/sources.json`). Several more geograph mirrors (Butt/Loopline, Shaw Street bridge, Tara Street from the south, the Pearse front, the fire tower close-up) were refused by Wikimedia's rate limiter (HTTP 429) after repeated slow retries and are not included.
- Text sources: Wikipedia (CC BY-SA), "Loopline Bridge", "Connolly station", "Tara Street railway station", "Dublin Pearse railway station", "IÉ 8500, 8510 and 8520 Classes", "Grand Canal Dock railway station", fetched through the MediaWiki API 2026-09-29.
- Game coordinates come from `project()` in `src/world/geo.js`. This whole line is east of the College Green stretch band, so x is a plain 50%; z is 50% except that latitudes 53.3442-53.3462 (Pearse Street to the south quays) are stretched 1.4x, so the Tara Street / Townsend Street / Pearse Street stretch is a little longer than half.

---

## 1. The line

### 1.1 Route (VERIFIED from OSM)

`tools/railway-line.mjs` finds the shortest path over the mainline rail ways (no `service=*`, no North Wall / Newcomen / East Wall branches, no Loop Line curve north of 53.3545) from 53.3590 -6.2348 to Lansdowne Road station, simplifies it (0.35 m tolerance, half-scale metres) and writes `src/data/railway.json` `line` (55 points, 4.2 km real). `src/world/railline.js` then:

- splices in **barrowst's own embankment polyline** (`src/data/barrowst.json rail.line`, squeezed clear of the uncompressed roads) between the Grand Canal Quay bridge and the Barrow Street bridge, so the trains run on the rails that build already lays;
- ends on **the Lansdowne Road crossing's track** (bearing 322 through node AVLX, `sites.js lansdowneXing`), straight from 90 m NW of the road to 66 m SE of it;
- resamples every 2 m and smooths twice (5-point average) to take the corners off.

Result: **2,209 game metres** of line, chainage s from the north end.

| s (m) | Where | Game x, z | OSM ways |
|---|---|---|---|
| 0 | GNR main line NE of the Royal Canal | 808, -699 | 4937314 |
| 323-336 | over the Royal Canal (plate girders) | 562, -489 → 553, -480 | 4937401 (viaduct) |
| 448-467 | over Seville Place | 468, -406 | 1203975436 |
| **529** | **Connolly, Loop Line platforms** | 402, -360 | platform 5 `253534952` |
| 590-654 | over Amiens Street (Sheriff St junction) | 349, -330 → 295, -297 | 4934569, 1425917002 |
| 686-793 | over Talbot Street and Store Street | 270, -276 → 192, -205 | 354357188-195 |
| 844-878 | **over Beresford Place (lattice)** | 164, -162 → 154, -130 | 340514364/367 |
| 901-988 | **Loopline Bridge: Custom House Quay, the Liffey, George's Quay** | 151, -106 → 168, -22 | 340514375/377, 1278547067, 255439488 |
| **1005** | **Tara Street** | 177, -7 | platforms `161492104/5` |
| 1030-1059 | over Townsend Street | 190, 14 → 205, 38 | 370197358 |
| 1143-1231 | over Pearse Street and Westland Row | 242, 114 → 290, 187 | 246064394/5, 370197363/4 |
| **1277** | **Pearse** (Westland Row) | 330, 208 | platforms `50127569/70` |
| 1359-1389 | over Holles Street | 407, 237 | 4934555 |
| 1557-1585 | over Macken Street | 582, 329 | 34886350 |
| 1624-1794 | barrowst's embankment: Grand Canal Quay, the canal mouth (Victoria Bridge), **Grand Canal Dock** (s 1718), Barrow Street | | 4934595, 10497826/7 |
| 1880-1934 | over South Lotts Road and Bath Avenue | 834, 531 → 870, 570 | 290564417, 4934496/8 |
| 2081 | foot of the ramp; the covered way under the Aviva's west podium | | 311960796 (layer -1) |
| 2143 | Lansdowne Road level crossing (XR001) | 998, 735 | node 3177396832 |
| **2181** | **Lansdowne Road** station | 1022, 765 | platforms `50773648/9` |

The street bridges are **found, not listed**: every 0.5 m the viaduct's cross-section (five points across its width) is tested against every road corridor (carriageway + footpaths + 0.4 m) and the water; blocked stretches become spans, and spans with under 5 m of viaduct between them merge (`railline.js findSpans`).

### 1.2 Heights

| Stretch | Deck (ballast top) | Source |
|---|---|---|
| Loop Line, Connolly to Pearse | **6.5 m** | "approximately six metres above street level" (Wikipedia, Loopline Bridge); refs 05, 08 (the Amiens Street bridge's height sign reads **4.69 m** clearance under the girders); Pearse's Westland Row bridge sign reads **4.93 m** (ref 16) |
| Pearse to Grand Canal Dock | 6.5 → 6.0 (eased) | the D&KR viaduct; barrowst.json `rail.deck` = 6.0 |
| Grand Canal Dock to Bath Avenue | 6.0 | barrowst; the Barrow Street bridge's 3.67 m bar is a lower, older bridge |
| Bath Avenue to Lansdowne Road | 6.0 → kerb + 0.1, ramped | OSM: the line comes off its embankment (311960795) into the covered way (layer -1) and crosses Lansdowne Road on the level |

With plate girders 1.3 m deep below the ballast the clearance over the streets is **5.2 m** (game roads are real width and the vehicles real size, so heights are kept real). Rails 0.16 m over the ballast, tracks 2.25 m either side of the centre (as barrowst), 1.9 m at the crossing (as lansdowneCrossing).

### 1.3 The half-scale map

- Tara Street's real platforms are ~165 m long between George's Quay and Townsend Street. In the game George's Quay (z -35) and Townsend Street (z 27) are 62 m apart, so the station is **54 m** of platform on the viaduct between the two street spans, and the DART is shortened to **4 cars of 12.5 m** (52 m; a real 8100/8500 four-car set is ~81 m).
- Pearse's platforms start right off the Westland Row bridge (`after: "Westland Row"` in railway.json) and run 88 m east under the shed; Connolly's 60 m.
- Connolly's front is ~85 m in reality; the site is **40 m** along Amiens Street, 17 m deep, set 14 m south of the Amiens Street / Talbot Street junction node so it stays clear of **Sheriff Street Lower**, which in the game leaves Amiens Street at RN30 (in reality it runs under the station's tracks).
- The Loopline Bridge: the game Liffey here is 44 m of water between quay walls (the real river is ~90 m), so its five spans (two quay spans, three over the river) are ~14 m each.

---

## 2. Reference images (`refs/railway/`)

All Wikimedia Commons, 1000 px thumbnails. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-loopline-from-downstream.jpg | [Loopline Bridge - Dublin.JPG](https://commons.wikimedia.org/wiki/File:Loopline_Bridge_-_Dublin.JPG) | Etiennekd | CC BY-SA 3.0 | 2013-05-05 | **Key elevation**: the X-lattice through girders, two river piers of paired black cylinders with gold bands and shields, Butt Bridge behind |
| 03-loopline-span-detail.jpg | [Loopline Bridge - geograph 6053770](https://commons.wikimedia.org/wiki/File:Loopline_Bridge_-_geograph.org.uk_-_6053770.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | Under the bridge: the cylinder pier (horizontal banding, a moulded gold collar), the arched cross-frame between the pair, the lattice from below, the Custom House beyond |
| 04-liffey-butt-loopline-2025.jpg | [River Liffey, Butt Bridge and Loopline Bridge.jpg](https://commons.wikimedia.org/wiki/File:River_Liffey,_Butt_Bridge_and_Loopline_Bridge.jpg) | Christian David | CC BY-SA 4.0 | 2025-01-01 | **The view the owner wants**: from upstream, the Loopline straight across the front of the Custom House's dome |
| 05-beresford-place-bridge.jpg | [Railway Bridge At Beresford Place - panoramio](https://commons.wikimedia.org/wiki/File:Railway_Bridge_At_Beresford_Place_-_Dublin_-_panoramio.jpg) | William Murphy | CC BY-SA 3.0 | 2012-05-11 | The lattice span over Beresford Place, riveted, grey, with an InterCity set |
| 06-viaduct-over-abbey-st.jpg | [The Loop Line Viaduct spanning the eastern end of Abbey Street - geograph 3521437](https://commons.wikimedia.org/wiki/File:The_Loop_Line_Viaduct_spanning_the_eastern_end_of_Abbey_Street_-_geograph.org.uk_-_3521437.jpg) | Eric Jones | CC BY-SA 2.0 | 2013-06-19 | The lattice span and, beyond it, the **calp masonry arches** of the viaduct; Luas rails in the street |
| 07-liberty-hall-and-loopline.jpg | [Liberty Hall and the Loop Line Railway Bridge - geograph 1743222](https://commons.wikimedia.org/wiki/File:Liberty_Hall_and_the_Loop_Line_Railway_Bridge_-_geograph.org.uk_-_1743222.jpg) | Eric Jones | CC BY-SA 2.0 | 2010 | The bridge's darker green-grey paint of 2010, a DART crossing, Liberty Hall |
| 08-dart-crosses-amiens-st.jpg | [DART train crosses Amiens Street - geograph 1972251](https://commons.wikimedia.org/wiki/File:DART_train_crosses_Amiens_Street_-_geograph.org.uk_-_1972251.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-07-02 | **Plate-girder street bridge** on cast-iron columns at the kerbs, the 4.69 m sign, advertising panels, the red-brick GNR offices |
| 10-connolly-front-2006.jpg | [Dublin Connolly railway station 2006.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Connolly_railway_station_2006.jpg) | Kaihsu Tai | CC BY-SA 3.0 | 2006 | The front: colonnade, balcony, campanile, end tower |
| 11-connolly-front-2019.jpg | [Dublin Connolly railway station in 2019.jpg](https://commons.wikimedia.org/wiki/File:Dublin_Connolly_railway_station_in_2019.jpg) | Metro Centric | CC BY 2.0 | 2019-06-11 | The south side: the Luas stop's tent canopy, the escalators, the IFSC entrance |
| 12-connolly-amiens-st.jpg | [CONNOLLY RAILWAY STATION (AMIENS STREET)-111215](https://commons.wikimedia.org/wiki/File:CONNOLLY_RAILWAY_STATION_(AMIENS_STREET)-111215.jpg) | William Murphy | CC BY-SA 2.0 | | **Key elevation** of the whole front from across Amiens Street |
| 14-tara-st-platforms-2024.jpg | [Tara Street station in Dublin - geograph 7878171](https://commons.wikimedia.org/wiki/File:Tara_Street_station_in_Dublin_-_geograph.org.uk_-_7878171.jpg) | Marathon | CC BY-SA 2.0 | 2024-08-04 | Platforms on the steel deck, the corrugated back walls and sloping canopies, the portal masts |
| 15-dart-at-tara-st.jpg | [DART train at Tara Street station.jpg](https://commons.wikimedia.org/wiki/File:DART_train_at_Tara_Street_station.jpg) | Billy Hicks | CC BY-SA 3.0 | 2006-05-30 | An 8600-series DART cab: yellow front, red buffer beam, green body |
| 16-pearse-westland-row.jpg | [Westland Row, Dublin.jpg](https://commons.wikimedia.org/wiki/File:Westland_Row,_Dublin.jpg) | User:O'Dea | CC BY-SA 4.0 | 2009-04-18 | **The Westland Row bridge** (maroon, gilt roundels, balustrade, 4.93 m bar) and Pearse's red-brick front and shed roof |
| 18-pearse-shed-dart.jpg | [Dublin Pearse Platform 2 with DART Train (2022-05-30)](https://commons.wikimedia.org/wiki/File:Dublin_Pearse_Platform_2_with_DART_Train_(2022-05-30).jpg) | Schobbish | CC BY-SA 4.0 | 2022-05-30 | Inside the 1880s iron-and-glass vault; an 8500-class set |
| 19-dart-8123-connolly.jpg | [Dart Train 8123 at Connolly Station platform 5](https://commons.wikimedia.org/wiki/File:Dart_Train_8123_at_Connolly_Station_platform_5.jpg) | Ben Vickers | CC BY-SA 4.0 | 2022-05-01 | **The 8100 look**: lime-yellow front, three windscreens, destination blind, red band; Connolly platform 5's curve |
| 20-dart-2023.jpg | [DART Dublin train 2023 (1)](https://commons.wikimedia.org/wiki/File:DART_Dublin_train_2023_(1).jpg) | MOs810 | CC BY 4.0 | 2023-04-21 | Current livery on the side |
| 21-dart-east-wall-viaduct.jpg | [A DART Commuter train crosses the East Wall Road Railway Viaduct - geograph 2222090](https://commons.wikimedia.org/wiki/File:A_DART_Commuter_train_crosses_the_East_Wall_Road_Railway_Viaduct_-_geograph.org.uk_-_2222090.jpg) | Eric Jones | CC BY-SA 2.0 | 2011-01-01 | North of the map: the viaduct continues to East Wall |
| 24-former-central-fire-station.jpg | [Trinity City Hotel, Former Central Fire Station](https://commons.wikimedia.org/wiki/File:Trinity_City_Hotel,_Former_Central_Fire_Station,_Dublin,_Ireland.jpg) | Kenneth C. Zirkel | CC BY 4.0 | | **The Tara Street hose tower**: red brick, corbelled band, clock stage, arcaded top, bracketed cornice |

---

## 3. Landmark profiles

### 3.1 The Loopline Bridge (1889-91)

- **Engineer** John Chaloner Smith (Dublin, Wicklow & Wexford Railway) for the City of Dublin Junction Railway; opened 1 May 1891 with Tara Street. "Wrought iron lattice girders on a double row of piers with five spans"; two tracks; ~6 m above street level (Wikipedia). It was controversial from the start because it blocks the view downriver to the Custom House, and it still is ("one of the city's true eyesores", Richard Killeen). Joyce puts it in *Ulysses* ("rode lightly down the Liffey, under Loopline bridge").
- **Form** (refs 01, 03, 04, 05): through girders, the deck carried between them; each girder a riveted **double-intersection lattice** (large X diamonds with a finer lattice between) between a top and a bottom boom, roughly **3 m** deep. **Piers**: in the river, **pairs of cast-iron cylinders**, one under each girder, rising through the girder to a capped drum above the top boom; horizontally banded, painted black with **gold** collars and a gold **shield** on the upper drum; each pair joined under the deck by an **arched cross-frame**.
- **Colour**: the lattice is a mid grey-green in 2013-2025 photos (refs 01, 04, 05; 2010 photos show a darker green, ref 07). The game uses `#5f6a66`. Advertising on the girders was scaled back from 2006 and none is modelled.
- **Beresford Place** has its own lattice span on columns at the kerbs (ref 05, 06); Butt Bridge (concrete arch, 1932) lies alongside upstream.

### 3.2 Connolly Station (1844-46)

- Opened 29 November 1844 as Dublin Station of the Dublin & Drogheda Railway; renamed **Amiens Street** in 1854 and **Connolly** in 1966. Head building by **William Deane Butler**, **Wicklow granite**, £7,000, opened 1846; "the ornate facade has a distinctive **Italianate tower** at its centre" (Wikipedia). Platforms 1-4 (Belfast, Sligo) are the DDR's; **5-7 are the City of Dublin Junction's through platforms of 1891, used by the DART**; the Luas Red Line's two-platform Connolly stop replaced the old ramp on the south side in 2004 (ref 11).
- **Front** (refs 10, 12): a two-storey granite range; ground floor a **colonnade** of Tuscan columns (a loggia) with round-headed doors and windows behind, carrying a **balustraded balcony**; first floor of pedimented sash windows; balustraded parapet. The **campanile** rises from the centre-left: an arched entrance, a great round-headed window, a **clock**, a round-headed window, then an **open belfry** of paired arches under a bracketed cornice. Smaller **end towers** carry triplets of round-headed windows.
- The platforms are at first-floor level (the 6.7 m flight of steps from the street, Wikipedia).

### 3.3 Tara Street (1891) and Pearse (1834 / 1891)

- **Tara Street**: two through platforms on the viaduct between George's Quay and Townsend Street, a ticket office at street level, canopies and panelled back walls upgraded in the 1970s-80s (Wikipedia; ref 14: corrugated grey back walls, sloping canopies, portal masts).
- **Pearse** (Westland Row): the Dublin & Kingstown Railway's 1834 terminus, the tracks on the first floor of the building; made a through station in 1891; two through platforms under a large **iron-and-glass shed** of the 1880s (ref 18). The **Westland Row bridge** is maroon cast iron with gilt roundels and a balustrade, 4.93 m clearance (ref 16); the station's red-brick front with round-headed windows stands on the east side of Westland Row.

### 3.4 The DART (8100 / 8500 classes)

- **8100** (1984, Linke-Hofmann-Busch): two-car units run as four- and six-car trains; a flat front with three windscreens, a lime-yellow lower front, red buffer beam, green body with a yellow band (refs 15, 19). **8500/8510/8520** (2000-04, Tokyu): four-car sets, the same colours on a squarer body (refs 18, 20). The game's train is a stylised mix: green body, lime band, dark lower band, two double doors a side, the yellow cab front with the red band and "DART", a pantograph on the middle cars.

### 3.5 The Tara Street fire station tower (1906)

- OSM way 1534687394: `man_made=tower`, `tower:type=hose`, brick, **40 m**, 1906, 53.34549 -6.25500. The Central Fire Station (now the Trinity City Hotel) on Pearse Street / Tara Street; the tower (ref 24) is a plain red-brick shaft with a corbelled band, a clock stage, an arcaded top stage and a bracketed cornice.

---

## 4. What was built

- **`src/data/railway.json`**: the centreline and the station anchors (`tools/railway-line.mjs` regenerates the line from the OSM pull).
- **`src/world/railline.js`** (no three.js): the line in game metres, chainage, deck height, track offset, the spans (found against the street graph), the Loop Line's lattice spans, the columns under the long plate-girder spans (per girder, only where they stand clear of every carriageway and off the water), the Loopline Bridge's river piers, the stations, the footprints of the solid viaduct for `reserved`, `underSpan()` (props.js keeps street lamps out from under the bridges), Pearse's front and the fire tower's position (moved east off Tara Street's footpath).
- **`src/world/railway.js`**: everything procedural, built per material in 150 m pieces and batched with the landmarks: the calp viaduct with blind brick-voussoir arches, string course and ashlar parapet (solid for the car); ballast with sleepers and four rails the whole way; the plate-girder bridges (grey; the Westland Row one maroon with gilt roundels and a balustrade) with black-and-yellow height bars, stiffeners, the steel floor and **cast-iron columns** (collide); the overhead line (portal masts every 30 m, cross-girders, contact and catenary wires); platforms at **Connolly, Tara Street and Pearse** with canopies, lamp strips and the blue Irish Rail name boards (Irish over English); **Pearse's shed** (a segmental iron-and-glass vault on red-brick walls, maroon ribs) and its **red-brick front on Westland Row**; the dark mouth of the covered way under the Aviva podium; the **fire station hose tower** (40 m, clock faces). Night: boards, lamp strips, the shed glazing and the brick windows are lit. Textures are canvases, half size on Low / Battery saver.
- **Loopline Bridge hero**: `tools/blender/build_loopline.py` → `public/models/loopline.glb` (**10,288 triangles**, 128 KB; AO baked), built in world coordinates from `models/railway-layout.json` (written by `tools/railway-layout.mjs`, which loads railline.js through Vite): the double-lattice girders with booms and end posts over the river span and the Beresford Place span, and four pier rows of paired cylinders (banded black, gold collars, shields, capped drums) with arched cross-frames. `placeLoopline` (railway.js) paints its atlas and batches it.
- **Connolly hero**: `tools/blender/build_connolly.py` → `public/models/connolly.glb` (**3,476 triangles**, 49 KB; AO baked), placed by `placeParts` with the shared stone materials (granite, slate, the decal atlas: its windows light up after dark). The site (`sites.connolly`) is solid and in `reserved`.
- **`src/game/dart.js`**: two four-car trains, one from each end, keeping left, stopping 14 s at every station and 30 s at the ends, easing to 7 m/s over the Lansdowne Road crossing. One instanced mesh for the cabs, one for the middle cars, one for the head/tail lamps (white leading, red trailing). Windows lit at night. No collision (the trains are overhead everywhere but the crossing). Exposed as `window.__dublin.dart`.
- **Places**: *Connolly Station* (view from Talbot Street) and *Loopline Bridge* (view from Burgh Quay, eastbound, the Custom House behind); HUD blurbs.
- **Checks**: `footprints.mjs` 0, `bridges.mjs` clean (the piers stand in the river just off the quay walls; the spans are bridges, not footprints). Review shots: `tools/scenarios/railway.mjs` (NIGHT=1, VIEWS=..., --mobile). Comparison: `docs/research/railway-compare.png` (left the photo, right the game).

### 4.1 Cost

`tools/scenarios/railperf.mjs` (headless, railway shown vs hidden at the same camera): **+32 draw calls** and **+50k triangles** at the Custom House view, +19 / +35k at Tara Street, +23 / +37k at Connolly. The whole procedural line is 41 meshes / 55k triangles over 2.2 km; the DART 672 triangles in 3 instanced draws; Connolly 3.5k; the Loopline 10k. Headless fps is too noisy to quote. The additions are pure geometry on the static batch; nothing trades looks for speed, so there is no Low-only cut beyond the half-size canvases.

---

## 5. Not done / open

1. **Connolly's train shed** over platforms 1-4 and the platforms 5-7 canopies beyond the modelled platform; the red-brick CDJR building and the GNR offices (ref 08); the Luas stop's tent canopy (left open for the Luas agent: the south side of the front, between it and the Loop Line, is free).
2. **The Lansdowne Road crossing's barriers** stay raised while the train passes (they are static props); AI traffic does not stop for the train there.
3. Tara Street's street-level entrance on George's Quay, the lift towers, the signal gantries and signals.
4. Advertising panels on the street bridges (ref 08) and the black-and-yellow bars' height roundels.
5. North of the Royal Canal the line simply ends (s = 0) in the unbuilt East Wall; the trains reverse there out of sight of the streets.
6. Busáras (another agent) stands beside the Loop Line on Store Street; its footprint and the viaduct's `rail*` footprints should be checked together after merging.
7. The Loopline's paint colour: 2010 photos show a darker green than today's grey-green; the game follows the recent photos.
