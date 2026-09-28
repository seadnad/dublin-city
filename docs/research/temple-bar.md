# Temple Bar — research profile (`temple-bar`)

Phase 1 research only. No game code changed. Sources: OpenStreetMap (Overpass, fetched 2026-09-28), 25 Wikimedia Commons photos (all free licences), Wikipedia. Mapillary was not used because its API needs a token (`graph.mapillary.com` returns an error without one). Google Street View and Google Maps were not used.

- Raw OSM: `data/osm/temple-bar.json` (1.2 MB, `out geom`). **bbox (S,W,N,E) = 53.3435, -6.2685, 53.3475, -6.2585**, which runs from Parliament St to beyond Westmoreland St and from Dame St to the north quays. It contains 580 building ways, about 350 highway ways, 357 street lamps, 108 trees, 17 bollards, 26 gates, and pub, bar, restaurant and artwork nodes.
- Photos: `refs/temple-bar/*.jpg`. The per-image record (URL, author, licence, date, description) is in `refs/temple-bar/sources.json`.

All real-world distances below are from OSM and have **not been compressed**. Remember that the game draws Temple Bar at SCALE 0.5, and that lon -6.2675 to -6.2612 (Parliament St to about Anglesea St) is also stretched 1.6x east-west. In game metres, **east-west distances in the core are 0.8x real and north-south distances are 0.5x real**. Road widths in `streets.json` are not compressed, so they should be set to the real values.

---

## a) Map data: OSM compared with `streets.json`

### A1. The real street network (OSM)

Junction coordinates are taken from shared OSM nodes.

| Street | OSM way(s) | Real length | Class / access | One-way direction | Surface | Facade-to-facade (median, from OSM footprints) |
|---|---|---|---|---|---|---|
| **Temple Bar**, Temple Lane S to Temple Bar Sq | 43984173, 43984169 | 57 + 38 m | `pedestrian` | (tagged oneway, E) | asphalt / paving_stones in OSM, **setts in the photos** | 6.3–8.3 m |
| Temple Bar, Temple Bar Sq to Asdill's Row | 25582902 | 25 m | `pedestrian` | – | unhewn_cobblestone | ~7 m |
| Temple Bar, Asdill's Row to Anglesea/Bedford Row | 4401566 | 44 m | `residential` (cars) | **eastbound** | sett | ~8 m |
| **Fleet Street**, Westmoreland to Anglesea | 10590795, 1312930426 | 96 + 81 m | residential, `vehicle=destination` | **westbound** | unhewn_cobblestone | 11.7–12.4 m |
| **Essex Street East**, Parliament St to Eustace | 1058104073/4, 4401603 | 183 m | unclassified (cars) | **eastbound** | sett (width=6.6 tagged) | 10–12 m |
| Essex Street East, Eustace to Temple Lane S | 43538582 | 46 m | `pedestrian` | – | sett | ~10 m |
| **Eustace Street**, Dame St to the quay | 4401661, 1541269493 | 140 + 33 m | unclassified (cars) | **northbound** | sett | 7.6–8.6 m |
| **Sycamore Street**, Dame St to Essex St E | 129212233 | 114 m | unclassified | **northbound** | sett | **4.9–5.4 m** |
| **Anglesea Street**, Dame St to Cope St | 129212225 | 70 m | residential | **northbound** | unhewn_cobblestone | 8.2–9.1 m |
| Anglesea Street, Cope St to Temple Bar | 706407857 | 83 m | `pedestrian` | – | sett | 8.6 m |
| **Cope Street** (missing in game) | 129212229 | 103 m | residential | **westbound** | sett | 8.0 m |
| **Fownes Street Upper** (missing), Cope St to Dame St | 43538584 | 75 m | unclassified | **southbound** | sett | 7–9 m |
| Fownes St Upper, north part (missing) | 129774675, 43538583 | 63 + 16 m | `pedestrian` | – | sett | ~8 m |
| **Fownes Street Lower** (missing) | 25631112 | 42 m | `pedestrian` | – | sett | 6 m |
| **Crown Alley** | 27806044 | 80 m, Temple Bar Sq to **Cope St only** | `pedestrian` | – | sett | 8.4–9.3 m |
| **Temple Lane South** (missing) | 129212234 | 150 m | `pedestrian` | – | sett | **5.4–6.2 m** |
| Crow Street (missing) | 8404761 | 91 m | pedestrian | – | sett | 6.7 m |
| Cecilia Street (missing) | 129212228 | 59 m | pedestrian | – | sett | 8.4 m |
| Curved Street (missing) | 25631208 | 40 m | pedestrian | – | paving | 6.3 m |
| **Asdill's Row** (missing) | 25631021 | 58 m | residential | **southbound** (quay into Temple Bar) | sett | 5.5–5.8 m |
| **Bedford Row** (missing) | 25631097 | 71 m | residential | **northbound** (to the quay) | unhewn_cobblestone | 9 m |
| **Aston Place** (missing) | 129212226 | 93 m | unclassified | **southbound** (quay to Fleet St) | unhewn_cobblestone | 7 m |
| Price's Lane (missing) | 129212232 | 106 m | unclassified, destination | **northbound** (Fleet St to quay) | unhewn_cobblestone | 7 m |
| Bedford Lane (missing) | 129212227 | 80 m | service alley | – | cobblestone | 4.5–4.9 m |
| **Merchant's Arch** lane (missing) | 4401567 (28 m) + 43984172 (15 m, `tunnel=building_passage`) + steps 43984171 | 43 m | pedestrian | – | paving_stones (granite flags) | **2.5–2.6 m** in the passage |
| **Temple Bar Square** (area, missing) | 25631085 | 41 m E-W x 21 m N-S | pedestrian area | – | paving_stones | – |
| **Meeting House Square** (missing) | 1329937075 (area), 25631150/188, 25677213, 316377241, steps/passage 44765175 | ~25 x 30 m | pedestrian, gated at night | – | paving_stones | – |
| Essex Gate (missing) | 25631272 | 49 m | unclassified | NE-bound | sett | 10–11 m |
| Crampton Court (missing) | 37264795 and others | – | service alley / footway, `building_passage` | – | – | – |
| **Parliament Street** | 37865098, 913681361 | 95 + 44 m | **`pedestrian`**, `motor_vehicle:conditional=destination @ (06:00-11:00)` | – | asphalt | 15.2 m |
| Wellington Quay | 556390402, 1288829638 and others | – | secondary, 2–3 lanes | **westbound** | asphalt | – |
| Aston Quay | 372838330, 1313723589, 800772121 | – | secondary, **`motor_vehicle=no` 07:00–19:00, bus/psv only** | westbound | asphalt | – |
| Dame Street | 3791745, 1032401626 and others | – | secondary, 3–4 lanes | two-way | asphalt | 19.7–23.5 m |

Real junction nodes for re-tracing:

| Junction | lat, lon |
|---|---|
| Temple Bar / Fleet St / Anglesea St / Bedford Row | 53.34565, -6.26182 |
| Temple Bar / Asdill's Row | 53.34563, -6.26247 |
| Temple Bar / Crown Alley / Merchant's Arch (Temple Bar Sq NE) | 53.34561, -6.26284 |
| Temple Bar / Fownes St Lower & Upper | 53.34559, -6.26342 |
| Temple Bar / Temple Lane S (becomes Essex St E) | 53.34553, -6.26427 |
| Essex St E / Eustace St | 53.34543, -6.26494 |
| Essex St E / Sycamore St | 53.34519, -6.26571 |
| Essex St E / Parliament St | 53.34495, -6.26751 |
| Eustace St / Wellington Quay | 53.34571, -6.26506 |
| Eustace St / Dame St | 53.34417, -6.26485 |
| Sycamore St / Dame St | 53.34418, -6.26590 |
| Temple Lane S / Dame St | 53.34418, -6.26425 |
| Fownes Upper / Dame St | 53.34421, -6.26334 |
| Anglesea St / Dame St | 53.34428, -6.26181 |
| Cope St / Anglesea | 53.34491, -6.26182 |
| Cope St / Crown Alley | 53.34490, -6.26272 |
| Cope St / Fownes Upper | 53.34488, -6.26336 |
| Fleet St / Aston Place | 53.34573, -6.26060 |
| Fleet St / Price's Lane | 53.34577, -6.25992 |
| Fleet St / Westmoreland | 53.34584, -6.25905 |
| Merchant's Arch passage, south mouth | 53.34586, -6.26289 |
| Merchant's Arch passage, north mouth / quay | 53.34599, -6.26291 |
| Ha'penny Bridge, south landing | 53.34611, -6.26299 |

Street geometry in one line: **Temple Bar, Fleet St and Essex St E form one continuous east-west spine** at bearing about 84–86° (east end) and about 69–79° (the west end bends south-west towards Parliament St). The north-south streets (Eustace, Sycamore, Temple Lane S, Fownes, Crown Alley, Anglesea) all run almost exactly north-south (bearings 354–6°). The grid is close to orthogonal.

### A2. How the game currently compares

The game has eight Temple Bar ways built on eight shared nodes. Each node below was measured against the same-named OSM way.

| Game node / way | Error | Notes |
|---|---|---|
| `FL1` (Fleet/Temple Bar/Anglesea) 53.34575,-6.26125 | 7 m from Fleet St, but **38 m east** of the real junction (-6.26182) | Move to 53.34565,-6.26182 |
| `TBQ` (Temple Bar/Crown Alley) 53.34535,-6.2633 | **27 m south** of Temple Bar and 33 m west of the real Crown Alley | Real: 53.34561,-6.26284 |
| `TBE` (Temple Bar/Essex/Eustace) 53.34515,-6.2645 | **42 m south** of Temple Bar and 24 m east of Eustace St | The spine and Eustace do not meet at one point. They meet at 53.34543,-6.26494 |
| `ES1` (Essex/Sycamore) 53.345,-6.2658 | 18 m south | Real: 53.34519,-6.26571 |
| `PARL` 53.34478,-6.26718 | 17 m east of Parliament St | Real: 53.34495,-6.26751 |
| "Eustace Street" `SQ5–TBE–DM1` | Zig-zags; `DM1` (-6.2642) is **41 m east** of Eustace and lies on Temple Lane South's line | Real Eustace is straight at lon -6.2649/-6.2650 |
| "Sycamore Street" `ES1–DM2` | `DM2` is shared with S. Great George's St and is **47 m east** of the real Sycamore/Dame junction | In reality Sycamore is about 45 m west of George's St, not in line with it |
| "Crown Alley" `TBQ–DMc` | Runs to Dame St through the Central Bank plaza. **The real alley stops at Cope St**; `DMc` is 59 m off | South of Cope St is the Central Bank plaza (pedestrian) |
| "Anglesea Street" `FL1–CG0` | **40 m east** of the real street, and ends at College Green instead of Dame St at -6.26181 | |
| "Fleet Street" `WM1–FL1` | Good (within 2–7 m) | |
| "Temple Bar" spine | The whole spine is drawn 20–45 m too far south, which squeezes the Temple Bar–Dame St blocks and inflates the quay-side block | |

**Missing streets that matter for the look and for driving:** Cope Street, Temple Lane South, Fownes St Upper and Lower, Asdill's Row, Bedford Row, Aston Place, Price's Lane, the Merchant's Arch lane and passage, Temple Bar Square (area), Meeting House Square (area), Crow St, Cecilia St, Curved St and Essex Gate. Bedford Lane, Crampton Court and Parliament Row are minor.

**Widths.** The game's `lane` default is a 6 m carriageway plus 3.5 m of pavement each side (`PAVEMENT`), which is 13 m wall to wall. Only Fleet Street (about 12 m) is that wide. Real facade-to-facade widths are 8–9 m for most streets, 5–6 m for Sycamore, Temple Lane S, Asdill's Row and Fownes Lower, and about 2.6 m for the Merchant's Arch passage. Real footpaths on the access streets are 1.2–2.0 m of granite flag with a granite kerb (photos: Eustace St, Anglesea St, Temple Bar). The fully pedestrian streets (Crown Alley, Temple Lane S, Merchant's Arch, Temple Bar Square) have no footpath step, or only a token one.

**One-way / access.** `geo.js` makes every way two-way, and AI traffic can use every lane. In reality:
- **Pedestrian (no through cars):** Temple Bar west of Asdill's Row, Temple Bar Square, Crown Alley, Merchant's Arch, Temple Lane S, Fownes Lower, Fownes Upper north of Cope, Anglesea north of Cope, Essex St E between Eustace and Temple Lane, Cecilia, Crow, Curved, Meeting House Sq, and now **Parliament Street** (loading 06:00–11:00).
- **Car-accessible one-way loops**, which are good player routes:
  1. Dame St → **Anglesea N** → **Cope W** → **Fownes Upper S** → Dame St.
  2. Dame St → **Eustace N** → Wellington Quay.
  3. Dame St → **Sycamore N** → **Essex St E** (east) → **Eustace N** → quay.
  4. Parliament St / Essex Gate → **Essex St E eastbound** → Eustace N.
  5. Quay → **Asdill's Row S** → **Temple Bar E** → **Bedford Row N** → quay.
  6. Quay → **Aston Place S** → **Fleet St W** → Bedford Row N → quay. Also Westmoreland → **Fleet St W** (destination only), and Fleet St → **Price's Lane N** → quay.
- **Quays:** Wellington Quay is westbound only, 2–3 lanes. **Aston Quay is buses and taxis only 07:00–19:00.** Dame St carries four lanes of buses and general traffic.

**Surfaces.** OSM tags nearly every Temple Bar street `sett` or `unhewn_cobblestone`. The exceptions are the flagged pedestrian pieces (Temple Bar Sq, Merchant's Arch, Meeting House Sq, Curved St) and asphalt on the quays, Dame St and Parliament St. OSM tags the Temple Bar segment 43984173 as asphalt, but the photos show setts (see `temple-bar-in-dublin-2016.jpg` and `the-temple-bar-pub-dublin-14353941505.jpg`); the tag looks out of date or wrong.

**Code gotcha:** `roads.js` skips setts when `way.pedestrian` is true. Flagging Temple Bar as `pedestrian` in the Grafton St style would therefore **remove its cobbles**. Surface and access need separate flags (see the build brief).

### A3. Buildings (OSM footprints)

- 580 building ways in the bbox; about 220 have their centroid in the core.
- `building:levels` is tagged on 27% of the core. Tagged values: **4 levels = 21, 5 = 18, 3 = 9, 2 = 2**. Across the whole bbox, 4 (90) and 5 (66) dominate. Typical height is **ground + 2–4 storeys**. The pub frontages on Temple Bar itself are often lower (The Auld Dubliner 2 levels, Ha'penny Bridge Inn 3), while the quays and Dame St run to 5.
- Only one building has a `height` tag. `roof:shape` is tagged 18 times (mostly flat). `building:colour` is tagged 3 times, so colour has to come from the photos.
- **Plot frontage** (building edges parallel to and within 9 m of the street): Eustace median **6.5 m** (p25 5.8), Anglesea 7.8 m (p25 5.8), Essex St E 12 m (p25 6.3), Temple Bar 14 m (pubs take double plots), Wellington Quay 9 m. Footprint areas in the core: p25 76 m², median 106 m², p75 236 m². Plots are small and shallow.
- The game's TEMPLEBAR lot (2–3 bays x 2.5 m = 5.3–7.8 m wide, 3–4 floors at 3.2 m) is the right scale. It needs a taller ground floor, and double or triple plots for pubs.

Hero footprints (OSM):

| Building | OSM way | Footprint | Centroid | Tags |
|---|---|---|---|---|
| **Merchants' Hall / "Merchant's Arch"** (1821) | 281683058 | 14.0 x 14.7 m | 53.34594, -6.26284 | pub, heritage=4; the passage runs through its west half |
| **"The Temple Bar" pub**, SE corner of Temple Bar x Temple Lane S | 294962764 | 20 x 16 m | 53.34546, -6.26406 | 4 levels, heritage=4 |
| The Auld Dubliner | 517592734 | 15 x 14 m | 53.34558, -6.26200 | 2 levels |
| Oliver St John Gogarty, SE corner of Fleet x Anglesea | 273993937 | 10.4 x 8.2 m | 53.34559, -6.26168 | |
| The Quays Bar, corner of Temple Bar x Fownes Lower | node | – | 53.34564, -6.26336 | |
| The Palace Bar, 21 Fleet St | 271055200 | 6.8 x 9.9 m | 53.34590, -6.25961 | |
| Irish Film Institute / Gallery of Photography / National Photographic Archive | 316377252 / 316377240 / 316377242 | – | around Meeting House Sq | O'Donnell + Tuomey |
| Friends Meeting House / The Ark | 281488874 / 281492036 | – | Eustace St | |

### A4. Street furniture (OSM)

- **Street lamps: 163 in the core, and about 70% are wall-mounted.** Tallying `support=wall` against `support=pole` gives about 115 wall and 49 pole. Anglesea St has 12 wall, Essex St E 12, Temple Bar 9 and Temple Lane S 9. Poles are concentrated on the quays, Eustace St and Cope St. **The lanes are lit by lanterns on wall brackets, not by kerbside columns.** The game's `props.js` currently puts pole lamps on every lane.
- Bollards: 8 tagged (fixed and removable), plus 2 sally ports and 7 gates (Meeting House Square gates, and Crampton Ct).
- Trees: 36 in the core, mostly on the quays and at Temple Bar Square (one young street tree). There are almost none in the lanes.
- Artwork nodes include the Dice Man mural and the Love Wall.

---

## b) Reference images (`refs/temple-bar/`)

All images are about 1000 px Commons thumbnails. Full metadata is in `sources.json`.

| File | Licence | Author | Shows |
|---|---|---|---|
| the-temple-bar-pub-dublin-14353941505.jpg | CC BY 2.0 | Sean MacEntee | **Hero corner in daylight**: the red pub wrapping onto Temple Lane S, dark brick above, hanging baskets, lanterns, looking west along the Temple Bar setts |
| 2008-05-23-the-temple-bar-dublin-ireland.jpg | CC BY-SA 4.0 | Gordon Leggett | Close shopfront detail: red pilasters, black fascia, gilt letters, painted poster panel, granite kerb, setts; blue Italian cafe fascia across the lane |
| the-temple-bar-48-temple-bar-dublin-geograph-org-uk-6402302.jpg | CC BY-SA 2.0 | Jo and Steve Turner | Same pub, 2006 |
| temple-bar-dublin-at-night.jpg | Public domain | Trevah | Night: the pub plus Temple Lane S, neon projecting sign, lanterns, wet-look setts, cycle stands |
| temple-bar-in-dublin-2016.jpg | CC BY 2.0 | Mike O'Sullivan | **Eye-level view down Temple Bar looking east**: sett carriageway with drainage channels, 1.5 m flagged footpaths, festoon lights, projecting signs; a Dublin Bus on Westmoreland St closes the view |
| the-quay-s-bar-in-dublin-panoramio.jpg | CC BY-SA 3.0 | Lobster1 | Victorian **glazed-faience** pub front (oxblood and green tile, gilt letters) at Temple Bar x Fownes Lower; black scroll-bracket wall lanterns; sett close-up |
| corner-of-fleet-and-bedford-st-dublin-panoramio.jpg | CC BY-SA 3.0 | Lobster1 | Fleet St junction: the yellow Gogarty with flags; blue lamp columns with flower baskets on Fleet St; brick arcaded Temple Bar Hotel; sett junction with flag footpaths |
| the-oliver-st-john-gogarty-pub-on-temple-bar-at-night.jpg | CC BY-SA 3.0 | WolfgangSailer | Gogarty at night: painted wall lettering, quoins, oriel bays, flags; cobbles; a taxi |
| oliver-st-john-gogarty-fleet-street-dublin-geograph-org-uk-1.jpg | CC BY-SA 2.0 | Chris Whippet | Gogarty front in daylight (colour reference) |
| temple-bar-panoramio.jpg | CC BY 3.0 | Ralf Houven | Access street (probably Anglesea St) with a row of flag poles, yellow painted fronts, sett road with narrow footpaths; exact location not confirmed |
| merchant-s-arch-geograph-org-uk-6215202.jpg | CC BY-SA 2.0 | Thomas Nugent | **Merchants' Hall seen from the quay**: granite ashlar, rusticated ground floor, the arch, flower troughs, railings, steps, pelican crossing |
| merchant-s-arch-temple-bar-dublin-d2.jpg | CC BY-SA 4.0 | BaronNethercross | **Looking south through the arch towards Temple Bar Square**: brick arch, rubble walls, granite flags, lantern |
| merchants-arch-dublin-september-2012.jpg | CC BY 2.0 | psyberartist | Inside the arch: yellow-brick arch rings, calp rubble, red-brick vault, lantern on a scroll bracket, a round hanging sign |
| dublin-merchants-arch-20141216112826.jpg | CC BY-SA 4.0 | Dieglop | Arch interior in B&W (masonry texture, barrels, projecting signs) |
| rainy-day-at-merchant-s-arch-temple-bar-dublin.jpg | CC BY 4.0 | David Kernan | **The Merchant's Arch lane looking north** in the rain: dense projecting and neon signs, festoon bulbs, lanterns |
| temple-bar-square.jpg | CC BY-SA 4.0 | GilPe | **Temple Bar Square in 2024**: flagged square, benches, young tree, modern black lamp column, Victorian red-brick gabled block (south side), pub fronts with baskets |
| dublin-street-band-temple-bar-square-geograph-org-uk-4327746.jpg | CC BY-SA 2.0 | Jonathan Hutchins | The south-side building at the square: red brick over a granite plinth; "PEDESTRIAN ZONE / NO ENTRY" sign; brown tourist fingerposts |
| 2020-10-17-crown-alley-1736.jpg | CC BY-SA 4.0 | Superbass | Crown Alley x Cope St corner (1993 slide): mural, blue bilingual street plates, **black cast-iron post-top lantern column**, wall lantern, granite flags |
| view-across-cope-street-into-crown-alley-geograph-org-uk-226.jpg | CC BY-SA 2.0 | Eric Jones | Crown Alley's colourful painted-render fronts (teal, grey, red, yellow, green, royal blue), bollards, bins |
| the-cobbled-cope-street-in-temple-bar-geograph-org-uk-226678.jpg | CC BY-SA 2.0 | Eric Jones | **Driver's-eye view** along Cope St: setts, black bollards at the Crown Alley mouth, 1990s hotel block |
| eustace-st-geograph-org-uk-6027015.jpg | CC BY-SA 2.0 | N Chadwick | **Cars queuing north on Eustace St**: one-lane sett street with narrow flag footpaths, brick raised crossing, 4–5 storey brick |
| anglesea-st-geograph-org-uk-6027018.jpg | CC BY-SA 2.0 | N Chadwick | Taxis heading north on Anglesea St: setts, 2.5 m flag footpaths, mixed modern and old frontages |
| farrington-s-29-essex-street-east-temple-bar-dublin-geograph.jpg | CC BY-SA 2.0 | Jo and Steve Turner | Essex St E x Eustace corner pub (2006; OSM now lists The Norseman at 28–29): cream render, oxblood quoins and surrounds, deep red timber shopfront |
| the-palace-bar-a-bar-at-21-fleet-st-temple-bar-dublin-2-d02-.jpg | CC0 | Ridiculopathy | Sign detail: a copper lantern sign on a bracket, a painted hanging board on a wrought-iron bracket, gilt letters on a blue fascia, flower baskets, curtain fairy lights |
| covid-dublin-017.jpg | CC BY 2.0 | Cityswift | Empty sett street in B&W: 1990s brick infill, a black cast-iron bollard, granite flags |

---

## c) Landmark profile

### C1. Architecture and materials (hex values are sRGB estimates from daylight photos)

| Element | Description | Hex |
|---|---|---|
| Dublin brick, upper floors (Temple Bar pub, many lanes) | dark brown-purple, often sooty | `#5E3A2E`, `#6B4436` |
| Victorian red brick (square's south block, Quays Bar upper floors) | brighter orange-red, with granite string courses | `#B0553A`, `#C0603F` |
| Yellow/buff stock brick (Merchants' Arch rear, many side walls) | | `#9C8466`, `#B39F7E` |
| Painted render, pub colours | Gogarty yellow `#E6C84A`, cream `#EDE3C4`, pale grey `#BFC3C6`, royal blue `#1E3FA0`, teal `#3FA6A0`, white `#EEEBE3` | |
| Pub red (Temple Bar pub shopfront) | glossy pillar-box red | `#B3121B` |
| Oxblood / deep red joinery (Farrington's-type) | | `#7E1E1E`, `#8A2323` |
| Bottle / racing green shopfronts | | `#1E4D34`, `#255E3D` |
| Navy fascia | | `#1B2745` |
| Black fascia (most common) | | `#141414` |
| Gilt lettering | raised, serif | `#D4A63A` (highlight `#F0CD6A`) |
| Painted wall lettering | white serif on brick, or oxblood on yellow render | `#EDE6D6` / `#7A2320` |
| Glazed faience (Quays Bar) | oxblood-brown tile, green tile, gilt | `#6E2A1E`, `#1E5A3A`, `#C9A24A` |
| Merchants' Hall granite ashlar | warm grey-buff | `#B7AE9C` |
| Rubble calp (limestone) in the passage | cold grey | `#6E6C66` |
| Window joinery | white-painted sashes, 6-over-6 or 2-over-2 | `#F2F0EA` |

- **Storey heights:** ground floor 4.0–4.5 m (shopfront plus fascia), upper floors 3.0–3.3 m. Pub buildings are usually ground + 2 or 3; the neighbours reach ground + 4.
- **Bays:** 2–3 windows per plot, each about 1.1 x 1.9 m, with stone sills. There are oriel or canted bays on the Gogarty and on the Quays Bar upper floor.
- **Shopfront structure** (classic Irish pub front): stall riser 0.6–0.8 m, a timber panel often painted darker. Fluted or panelled **pilasters** (0.35–0.5 m wide) with console brackets at each end hold a **deep fascia** (0.7–1.0 m) with raised gilt serif letters. Above that sits a projecting cornice, often with a **flower trough**. Doors are recessed and half-glazed. Painted poster panels ("... Est. 1840", brewery adverts) are set between pilasters.
- **Signs:** there are hanging boards on wrought-iron scroll brackets (painted, often gold on black, oval or heart-shaped), round illuminated brewery discs on brackets, lantern-shaped signs, vertical neon blade signs (red and green), painted wall lettering across the upper floors, and national flags on angled poles (a row of 4–10 on the Gogarty and on Fleet and Anglesea St fronts).
- **Setts:** grey granite, roughly 10 x 15–20 cm, laid in courses across the street and domed by wear. Colour is dry `#6F6E6A` with some buff and ochre stones (`#8C8270`), wet `#4A4A48` with strong specular highlights. There are linear drainage channels of setts laid lengthways, and square cast-iron covers. The existing `setts()` texture already matches this well.
- **Footpaths:** large granite flags (about 0.6 x 0.9 m) `#9E9C97` with a 0.15 m granite kerb. On the pedestrian streets the kerb is rounded or flush.
- **Lamps:**
  - Lanes: black cast-iron square-tapered **lanterns on scroll wall brackets** at first-floor level (about 4.5 m).
  - Crown Alley and Cope St: a few slim fluted **black post-top lantern columns** (about 4 m).
  - Fleet St: taller **blue-painted** heritage columns with flower baskets.
  - Quays: silver-grey heritage columns.
  - Temple Bar Square (2024): a plain modern black column.
- **Bollards:** slim black cast-iron with collar rings, about 0.9 m, at the mouths of the pedestrian lanes (Crown Alley x Cope St, Temple Lane).
- **Overhead:** **festoon bulbs strung across the street** (Temple Bar and the Merchant's Arch lane), **hanging flower baskets** on nearly every pub (often 3–6 per facade), pub-front curtain fairy lights, and street-name plates (blue with white text, Irish in italics above English caps, and the district number "2").

### C2. What makes it instantly recognisable (checked against the photos)

1. **The red pub corner.** A glossy red ground-floor front with a black and gilt fascia under dark brick, hanging baskets and lanterns, on a cobbled corner (Temple Bar x Temple Lane South). Every photo set leads with this image.
2. **Cobbled lanes with tight walls and narrow granite footpaths**, 6–9 m wall to wall, 3–5 storeys, dense projecting signs and flags.
3. **Colour variety along the frontage.** Red, yellow, green, blue, cream and faience fronts sit side by side; this runs through every photo from the 2000s to 2024.
4. **Merchant's Arch.** A granite classical hall on the quay with a dark round-arched passage leading south into a sign-choked lane, directly in line with the Ha'penny Bridge.
5. **Night:** warm wall lanterns, neon blade signs, festoon bulbs, wet-looking setts, crowds.

### C3. Trademarks and names: invent, do not copy

- **"The Temple Bar" pub** (name, the "EST 1840" artwork and its logo) is a commercial brand that the owners enforce. Use the red-corner **style** with an invented name, for example "The Liffey Rest", "Crampton's", "The Essex Tavern", "Fleet House".
- **Guinness**: the harp, the "Arthur Guinness" signature, and the round and toucan signs are all trademarks. Replace them with an invented stout brand ("Liffey Stout", a generic round disc sign).
- Also do not copy: Oliver St John Gogarty, The Quays Bar, The Auld Dubliner, The Porterhouse, The Palace Bar, Merchant's Arch (the pub), Bad Ass Cafe, Hard Rock, Club M / Blooms, Apache Pizza, Supermac's, and the Dice Man and Love Wall murals.
- **Public place names are fine**: street names, "Merchants' Hall" as a building, and "Temple Bar Square".

### C4. Context and traffic reality

- **Crowds** are the defining condition: dense pedestrians day and night in the pedestrian core, spilling onto the access streets. Traffic is taxis, delivery vans and cars queuing north on Eustace St and Anglesea St (photos). Cars rarely travel fast. There is a de facto 10–20 km/h limit and OSM maxspeed is 30.
- **Buses:** Dame St (a bus corridor), Westmoreland St, and Aston Quay (buses and taxis only by day). The quays are one-way westbound on the south side.
- **Parliament Street** has been pedestrianised (OSM `highway=pedestrian`, loading 06:00–11:00). The game still has it as a two-way `secondary`.
- **Merchant's Arch → Ha'penny Bridge:**
  - From Temple Bar Square the Merchant's Arch lane runs 28 m north (about 3 m wide, lined with shops), then passes through the arch.
  - The arch passage is 15 m long and 2.5–3 m wide, with a step up at the north end. Its arch is about 3.2 m wide and about 5 m high to the crown (estimated from the Nugent photo against the 14 m frontage).
  - At the quay there is a pelican crossing over Wellington Quay (2 lanes) to the Ha'penny Bridge, whose south landing is at 53.34611, -6.26299.
  - The square, the arch and the bridge line up almost due north-south (lon about -6.2628 to -6.2630), which gives a strong sightline.

---

## d) Build brief (prioritised)

### P1: Road layout (`streets.json`, and small support in `geo.js`/`roads.js`)

1. **Re-trace the spine.** Move `FL1` to 53.34565,-6.26182 and `TBQ` to 53.34561,-6.26284. Replace `TBE` with two nodes: Temple Lane at 53.34553,-6.26427 and Eustace at 53.34543,-6.26494. Move `ES1` to 53.34519,-6.26571 and `PARL` to 53.34495,-6.26751. Add nodes at Asdill's Row (53.34563,-6.26247) and Fownes (53.34559,-6.26342).
2. **Straighten the north-south streets.** Eustace becomes SQ5 → (53.34543,-6.26494) → Dame (53.34417,-6.26485). Sycamore gets its own Dame node at 53.34418,-6.26590 and stops sharing `DM2`. Anglesea runs straight at lon -6.26181 from Dame (53.34428) to FL1. Crown Alley ends at Cope St (53.34490,-6.26272).
3. **Add streets:** Cope St, Fownes St Upper (car part and pedestrian part), Temple Lane S, Asdill's Row, Bedford Row, Aston Place, Price's Lane and Essex Gate. Add Crow St, Cecilia St and Fownes Lower as pedestrian. Add the Merchant's Arch lane and passage as a pedestrian-only 3 m way.
4. **Separate surface from access.** Add `surface: "sett"` (drawn as setts whether or not the way is pedestrian), `oneway: 1|-1`, and `access: "pedestrian"|"destination"|"bus"`. Then:
   - pedestrian lanes keep the cobbles;
   - AI traffic only uses the one-way car loops;
   - the player can still drive the pedestrian lanes slowly, as on Grafton St.
5. **Widths (real, uncompressed):**

   | Street | `width` | `pave` |
   |---|---|---|
   | Fleet St | 7 | 2.2 |
   | Essex St E | 6.5 | 2 |
   | Eustace, Anglesea, Cope, Bedford Row | 5 | 1.6–1.8 |
   | Temple Bar | 5 | 1.3 |
   | Aston Pl, Price's Lane | 4.5 | 1.2 |
   | Sycamore, Asdill's Row | 3.8 | 0.7 |
   | Pedestrian lanes (flush) | full width: Crown Alley 9, Temple Lane S 6 | 0.3 |

6. **Squares:** Temple Bar Square becomes a flagged pedestrian polygon (41 x 21 m real). Use the 25631085 outline, projected. Meeting House Square becomes a flagged, gated enclosed square that is not drivable.
7. **Parliament Street:** change to pedestrian or restricted (it is out of scope for this area, but it bounds it).
8. **Speed:** lanes are currently at speed 6; keep that, or drop the pedestrian core to 3–4.

### P2: Hero models (8k–20k tris each, one shared 2048 atlas)

1. **Merchants' Hall + arch** (14 x 14.7 m, 2 storeys over a raised ground floor, about 13 m to the parapet), on the quay at 53.34594,-6.26284. It is a real open passage the camera can look through; the player cannot drive it.
   - Rusticated granite ground floor with three round-headed openings: the west one is the passage, the centre one is a door with a fanlight, the east one is a window.
   - Pedimented first-floor sashes, a cornice parapet with flower troughs, railings and steps.
   - Interior: rubble walls and a brick barrel vault.
2. **The red pub corner**, Temple Bar x Temple Lane S (the 20 x 16 m footprint).
   - Ground floor + 3 storeys of dark brick, with the red shopfront wrapping the corner and white painted wall lettering using an **invented name**.
   - 6–8 hanging baskets, 3 scroll lanterns, one neon blade sign, barrels.
3. **Temple Bar Square set dressing:** the flagged square, 4 benches, 1 tree, a modern lamp column, and the red-brick gabled south block (about 5 storeys with Dutch gables). Optional: a faience pub front (Quays-style) at the NW corner with Fownes Lower.
4. Optional fourth piece: a yellow "Gogarty-style" rendered corner at Fleet x Anglesea (flags, oriels, painted lettering, invented name).

### P3: Textures

- **One shared pub-front facade atlas (2048²)**, about 8 shopfront variants: red, oxblood, green, navy, black, cream, faience and yellow render. Each has a fascia with invented gilt names, pilasters, stall risers and doors. Add upper-floor strips of dark brick, red brick, buff brick and painted render with white sashes. Include decals: hanging board signs, a round stout disc (invented brand), neon blades, flags, baskets, blue street plates.
- Reuse the existing `setts()` for all car and pedestrian lanes, and add a **granite flag** material for Temple Bar Sq, Merchant's Arch and the footpaths. Drainage-channel and cover decals are optional.
- For `buildings.js` TEMPLEBAR lots:
  - raise the ground floor to 4.2 m;
  - allow 3–5 floors (weight 4);
  - use the fascia colours above;
  - give roughly 1 lot in 5 a double-width pub front;
  - add wall lanterns plus basket instances.

### P4: Props (instanced)

- **Wall-bracket lanterns** on the lanes (about 1 per 12 m, alternating sides, 4.5 m up) instead of the kerb poles `props.js` currently places.
- Black cast-iron bollards at the pedestrian lane mouths.
- Festoon bulb strings across Temple Bar and the Merchant's Arch lane (a simple emissive line mesh).
- Hanging baskets, flag poles, barrels, A-boards.
- A crowd density boost in the pedestrian core.

### P5: What stays generic

Surrounding blocks are built from **OSM footprints** (580 in `data/osm/temple-bar.json`), with levels where tagged and 4 otherwise. This includes Dame St frontages, the 1990s infill (IFI, Gallery of Photography, Blooms Hotel) and the quay buildings. Rear walls and roofs stay simple and flat.

### Triangle / texture budget

- Merchants' Hall: 12–20k tris.
- Red pub corner: 8–12k tris.
- Temple Bar Square dressing: under 5k tris.
- One shared 2048 atlas for all three, plus the shared pub-front atlas for filler.
- Filler buildings stay procedural boxes with atlas UVs.

---

## Open questions

1. **Compression squeeze.** At 0.5 north-south scale, Temple Bar to the Wellington Quay centreline is 49 m real, which is 24.5 m in game. Take away the quay half-width plus pavement (9 m) and a Temple Bar half-corridor (about 4 m), and only **about 11 m** is left for the quay-side buildings and for the Merchants' Hall (14 m deep). The quay nodes are also nudged about 10 m south for river width (`SQ6` is 8 m off). Options: accept a shallower Merchants' Hall, locally stretch north-south, or shift the spine north. This needs a decision.
2. **Should the player be able to drive the pedestrian core** (Temple Bar, Crown Alley, Temple Lane), as on Grafton St, or should it be blocked by bollards? Should the Merchant's Arch be passable at all (it is 2.6 m wide)?
3. **Loading hours** for the Temple Bar pedestrian zone are not tagged in OSM, apart from Parliament St (06:00–11:00). The signs in the photos say "Pedestrian Zone / No Entry". Should the AI model morning deliveries?
4. OSM tags Temple Bar segment 43984173 (Temple Lane to Fownes) as **asphalt**, but the photos show setts. It may have been resurfaced recently; this needs checking against current imagery.
5. The exact current names and colours of individual pubs change often (Farrington's is now The Norseman, per OSM). The build should use invented names, so this only affects colour choices.
6. Whether to add Wellington and Aston Quay one-way and bus-only rules globally. That is a wider traffic-system change outside this area.
7. `temple-bar-panoramio.jpg` is probably Anglesea St looking north, but the location is not confirmed.
