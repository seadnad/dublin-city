# Barrow Street, the Google campus, Boland's Quay and the west side of Grand Canal Dock (`barrow-street`)

Scope: Barrow Street from Grand Canal Street Upper to Ringsend Road, including the one-lane underpass under the DART and Grand Canal Dock station; Google's buildings on and around it (Google Docks, the old Montevetro; Gordon House; Gasworks House; Boland's Quay); the restored Boland's Mills; Alto Vetro; Grand Canal Quay (the living street down the west side of the inner basin, and the paved quay promenade from Pearse Street north to Grand Canal Square); and the edges of the inner basin. Grand Canal Square itself (the theatre, the Marker, the offices around the square) belongs to another brief and is not changed here.

- Raw OSM: `data/osm/barrow-street.json`. Overpass `out geom`, bbox **S 53.3375, W -6.2425, N 53.3452, E -6.2330** (about 630 m E-W by 860 m N-S). Snapshot `timestamp_osm_base` 2026-09-29T17:17:36Z, 2,025 elements: buildings and building:parts, highways, railways and platforms, public transport, water, man_made, place, leisure, trees, office, amenity, tourism and landuse (city-wide relations dropped). Pulled in seven smaller queries because the main server was timing out, then merged.
- References: `refs/barrow-street/` holds 28 images from Wikimedia Commons (several are geograph uploads), all CC0, CC BY or CC BY-SA. Credits are in §2 and `refs/barrow-street/sources.json`. None come from Google.
- The owner's Street View screenshot of the Pearse Street / Grand Canal Quay corner was looked at for guidance only. It is not in the repo.
- Game coordinates below come from `project()` in `src/world/geo.js` (origin 53.34727/-6.25915, scale 0.5). The whole area is east of the Dame Street stretch band and south of the quay stretch band (53.3442), so **x = (lon + 6.25915) x 33,240 and z = (53.34727 - lat) x 55,660** here: a plain half-scale projection.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 Layout in one paragraph

Grand Canal Dock is two basins joined under **MacMahon Bridge** (Pearse Street becomes Ringsend Road on the bridge). The **outer basin** runs east to the Liffey locks; Grand Canal Square and the theatre are at its west end. The **inner basin** runs south from the bridge to the railway, where the canal's last channel comes in under Victoria Bridge (the DART) from lock C1 at Grand Canal Street. **Grand Canal Quay** runs down the west side of both basins. North of Pearse Street it is a broad paved promenade to the square (foot and cycle only). South of it, it is a sett-paved living street to Grand Canal Street Lower, cut in two by a foot and cycle tunnel under the railway. **Barrow Street** runs NNE parallel to the inner basin's east side, one street back, from Grand Canal Street Upper, under the DART (one lane, alternating) and past the station, Google Docks and Gordon House, to Ringsend Road. **Boland's Quay** fills the block between the inner basin, Ringsend Road and Barrow Street.

### 1.2 The buildings (VERIFIED from OSM unless marked)

| Building | OSM | Real centre | Game x, z (centre) | Height / storeys | Notes |
|---|---|---|---|---|---|
| **Google Docks** (ex-Montevetro) | way 48894062, `brand=Google`, housename "Google Docks" | 53.33975, -6.23716 | 731, 419 | **67 m** (OSM), 14 levels; Wikipedia list: **65.6 m, 15 floors, 2010, 4th tallest in Dublin** | Treasury Holdings' Montevetro (the "glass mountain"). **Google bought it in Feb 2011** and renamed it Google Docks (Irish Independent, 17 Feb 2011, cited by Wikipedia). Plan: a trapezoid, 74 x 20-50 m, the long faces N and S, the SW side cut along the railway. |
| **Gordon House** | way 330035477, Google | 53.33997, -6.23597 | 775, 407 | 6 levels | Google's first Dublin HQ building (east side of Barrow Street, opposite Google Docks). A **glazed skybridge** (OSM building:part 1110143050, level 2-3, glass) crosses Barrow Street from it to Google Docks; a third arm makes it the "three-way skybridge" (ref 06). |
| **Gasworks House** | way 48960865, Google | 53.33934, -6.23627 | 763, 443 | 8 levels | East of Barrow St, just north of the railway. Named after the gasworks that stood here. |
| **Google BOL1 / BOL2** (Boland's Quay) | ways 1217422779 / 1217422778, Google | 53.34177, -6.23655 / 53.34130, -6.23677 | 749, 306 / 745, 336 | **12 and 11 levels**; Wikipedia list: **Boland's Quay 1, 54 m, 13 floors, 2025, 10th tallest** | New towers of the Boland's Quay scheme (2017-2024). Wikipedia: Google bought the development in **2018**. Off-white panels with a scatter of vertical window slots, copper-red fin cladding on the back and flanks (refs 09, 10, 12). |
| **Boland's Mills** (stone warehouses) | ways 329106838 / 40 / 42 / 43 | 53.3419-53.3421, -6.2363 to -6.2370 | 726-763, 287-301 | two **six-storey 1830s calp limestone warehouses** (Wikipedia) | Protected structures facing Ringsend Road and the dock. The west block shows **twin gables to the basin** with **BOLANDS / FLOUR MILLS** in big orange-gold letters (refs 09-13). 1916: 3rd Battalion under de Valera. Concrete silos (1940s-60s) demolished 2017-18. |
| Stone warehouse at the dock edge | way 283083647 | 53.34145, -6.23734 | 725, 325 | ~5-6 storeys (ref 12) | Calp limestone, now apartments with steel balconies (refs 09, 12). |
| **Alto Vetro** | way 48897785, architect **Shay Cleary** | 53.34226, -6.23873 | 679, 280 | **52 m** OSM, 15 levels; Wikipedia list: **51 m, 16 floors, 2008, 15th tallest** | Slender residential tower on the quay edge just south of MacMahon Bridge; cantilevered black glass balconies alternating up both long sides (ref 15). RIAI Silver Medal for Housing 2007-08. Built by Sisk for Treasury Holdings, like Montevetro. |
| Waterways Ireland Visitor Centre | way 48914525 | 53.34178, -6.23838 | 692, 307 | 2 levels | The white box on stilts **in** the inner basin off Grand Canal Quay, with glass-block walls and a pontoon (refs 10, 15). |
| The Tower (Tower Design Centre, old sugar refinery) | way 88150333 | 53.34199, -6.23937 | 656, 293 | ~7 storeys (unverified) | Stone and brick, on Grand Canal Quay behind Alto Vetro. |
| Trinity Innovation Centre, Waterways House, The Malt House N/S, The Malting Tower | 329445776, 102694989, 48951689/88, 48951687 | Grand Canal Quay, 53.3400-53.3415 | 650-675, 330-400 | 3-7 levels | Converted stores and offices along the quay; the old malt stores are stone. |
| **The Lir** (National Academy of Dramatic Art) | way 102694981 | 53.34223, -6.23920 | 663, 282 | 2 levels | SW corner of Pearse Street and Grand Canal Quay (owner's screenshot). |
| Gallery Quay (apartments) | way 102694937 | 53.34298, -6.23940 | 657, 240 | 7 levels | NW corner of Pearse St / Grand Canal Quay: the white apartments along the promenade (ref 14; the scaffolded block in the owner's screenshot). Its east face is at x ≈ 673; the water at x ≈ 684-691. |
| 1 Grand Canal Square | way 102694959 | 53.34339, -6.23925 | 662, 212 | 7 levels | The glass office with gold fins between Gallery Quay and the square (ref 14). *Square brief.* |
| The Millennium Tower | way 48898702 | 53.34283, -6.23687 | 740, 246 | 63 m (OSM), 13 levels | Charlotte Quay, SE corner of the outer basin. **Not on Wikipedia's list.** Not built here (filler covers it; see §5). |
| South Bank House, Grand Mill Quay, The Dock Mill, The Warehouse | 48858941, 48894063, 329884926, 228544066 | Barrow St, 53.3404-53.3409 | 715-755, 353-406 | 3-7 | The old stone mill and warehouse range between Boland's and Google Docks along the basin's east edge (ref 02: stone gables, red brick). |
| Grand Canal Dock station | way 48894059, platforms 402280899 / 1255798817 / 311839244 | 53.33961, -6.23737 | 724, 428 | elevated | Three platforms on the embankment between the canal channel and Barrow Street; steps and lift down to Barrow St. Opened 2001 on the 1834 Dublin & Kingstown line (Wikipedia). |
| The Bakery (old Treasury Building), Velasco, 1 Grand Canal Plaza | 52205030, 399112486, 110542366 | Grand Canal St Lower | 598-705, 466-490 | 6-8 | Also Google (OSM). Outside the build (filler). |

**Google's footprint** (OSM `brand=Google` plus press): Google Docks, Gordon House, Gasworks House, BOL1 and BOL2 at Boland's Quay, 1 Grand Canal Plaza, The Bakery on Grand Canal Street Lower, and Velasco. The recognisable ones from the street are **Google Docks** (the tall dark glass slab, visible from the whole dock), the **skybridge over Barrow Street**, and the **Boland's Quay towers behind the stone mill**.

### 1.3 Wikipedia "List of tallest buildings and structures in Dublin" entries in this area

(en.wikipedia.org, wikitext fetched 2026-09-29)

| Rank | Name | Height | Floors | Year | Game treatment |
|---|---|---|---|---|---|
| 4 | **Google Docks** | 65.6 m | 15 | 2010 | Hero |
| 10 | **Boland's Quay 1** | 54 m | 13 | 2025 | Hero (with BOL2) |
| 15 | **Alto Vetro** | 51 m | 16 | 2008 | Hero |
| proposed | 1/2 Grand Canal Quay | 64.1 m | 15 | under construction 2023 | Not built (exact site unconfirmed; see §5) |

### 1.4 The existing game map here, and how it differs

| Item | Game before | Reality | Action |
|---|---|---|---|
| **Barrow Street** `BW1 → RR1` | Straight, ending at RR1 (53.34222, -6.23700), the east end of MacMahon Bridge | Runs NNE: BW1 → **underpass 53.33905-53.33942** (one lane, `oneway=alternating`, 3.67 m headroom) → 53.34073, -6.23632 → **Ringsend Rd at 53.34210, -6.23603**, ~65 m east of RR1 | Re-route via new nodes BWS1, BWS2 (underpass, width 5), BWS3, BWR (inserted into Ringsend Road) |
| Grand Canal Quay (inner basin) | Missing | Living street, setts, 30 km/h, 5.7-7.5 m, from GCS Lower (53.33889, -6.23970) north to Pearse St; the stretch under the railway (53.34021-53.34041) is a **foot and cycle tunnel** (`motor_vehicle=no`) | New ways: lane, `access: destination`; the tunnel stretch `access: pedestrian` |
| **Pearse St → dock promenade** | Filler buildings stand on the corner and on the whole strip between the street and the water; there is no way through to the square | A broad paved promenade (OSM footway 28046675 "Grand Canal Square", foot and cycle designated) from Pearse St (53.34252, -6.23877) north along the water to Hanover Quay, with a double row of young trees along the water (58 OSM trees), bollards, and the square opening off it | New pedestrian way PS5 → GQP1 → GQP2 → GQP3 (stops at the square's south edge), width 8, paved wall to wall; trees along the water |
| Grand Canal Street Lower `GCM → GCB` | Straight | Bends through 53.33932, -6.24084 and 53.33889, -6.23970 (the Grand Canal Quay junction) | Shape nodes GCL1 and AVGQ0 |
| Filler style | Brick and stucco (the Docklands "modern" zone stopped at z 150) | Glass and panel offices and apartments, stone mills, a few two-storey Barrow St cottages | "Silicon Docks" style zone, x 600-800, z 150-520 |

### 1.5 Streets: facts from OSM

| Street | OSM | Notes |
|---|---|---|
| Barrow Street | tertiary, 2 lanes, 30 km/h (`10497823`, `80390834`, `49057073`, `51269108`); the underpass `80390832` / `1477816561`: **1 lane, oneway=alternating**, foot and cycle yes | Two-storey artisan cottages (nos 1-7 south of the railway, 9-23 north of the station) survive among the glass. Google's front doors, taxis, the skybridge. |
| Grand Canal Quay | `living_street` 30 km/h, setts, 5.7-7.5 m (`260607181`, `1127598616`, `1127724624`, `74073875`); tunnel `74073872` cycleway, `motor_vehicle=no`; the last 30 m to Pearse St `unclassified`, paving stones | North of Pearse St the promenade is the footway `28046675`, paving stones, foot and bicycle designated |
| Ringsend Road | secondary, 3-4 lanes, 50 km/h; MacMahon Bridge 4 lanes (`4934672`, `4934673`, `547144825`, `409845700`, `369558636`) | A new footbridge (`1217423437`) crosses the inner basin's NE corner from Ringsend Rd to Boland's Quay |
| Pearse Street | secondary, 4 lanes, 50 km/h (`1015112056`) | Cycle tracks both sides at the bridge |
| Charlotte Quay | service road (`753614439`) | Unchanged |
| Railway | Dublin & Kingstown line on an embankment and viaduct, layer 1: Victoria Bridge over the channel (`274231714`), platforms 1-3, the bridge over Barrow St (`10497827`, `274233178`) | No railway system in the game: only the bridges and a length of embankment are modelled |

### 1.6 Street-graph changes made (JSON)

```json
"GCL1": [53.33932, -6.24084], "AVGQ0": [53.33889, -6.2397],
"GQ1": [53.33977, -6.23945], "GQT0": [53.34019, -6.23935], "GQT1": [53.34043, -6.2393], "GQ2": [53.34102, -6.23916], "GQ3": [53.34216, -6.23887],
"GQP1": [53.34278, -6.23871], "GQP2": [53.34323, -6.23862], "GQP3": [53.34368, -6.23854],
"BWS1": [53.33905, -6.23668], "BWS2": [53.33942, -6.23659], "BWS3": [53.34073, -6.23632], "BWR": [53.3421, -6.23603]
```
- `Grand Canal Street Lower`: HOL1, GT1, GCM, **GCL1, AVGQ0**, GCB
- `Ringsend Road`: PS5, RR1, **BWR**, SD1
- `Barrow Street` BW1 → BWS1 (width 8); BWS1 → BWS2 (width 5, pave 1.4: the underpass); BWS2 → BWS3 → BWR (width 8). The old BW1 → RR1 way is gone.
- `Grand Canal Quay` AVGQ0 → GQ1 → GQT0 (lane 5, destination); GQT0 → GQT1 (lane 4, `access: pedestrian`: the tunnel); GQT1 → GQ2 → GQ3 → PS5 (lane 5, destination); **PS5 → GQP1 → GQP2 → GQP3 (lane 8, `pedestrian: true`, pave 0.6): the promenade.** The promenade stops at the square's south edge so the square brief can shape its end.

The positions of the promenade nodes are pulled ~2 m west of the OSM footway so that the full paved width stays on land (the game's dock outline).

---

## 2. Reference images (`refs/barrow-street/`)

All from Wikimedia Commons at 1200 px thumbnails. Licences as recorded on Commons. Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-google-docks-montevetro.jpg | [Google Docks Building Dublin.jpg](https://commons.wikimedia.org/wiki/File:Google_Docks_Building_Dublin.jpg) | Jmckinley | CC BY-SA 3.0 | 2014-04-04 | **Key.** From high in the NW across the inner basin: the dark slab, its black frame grid, the **yellow spandrel strip on the east end**, the lower NW shoulder; stone mills in front |
| 02-google-docks-from-dock.jpg | [Google Docks Montevetro building.jpg](https://commons.wikimedia.org/wiki/File:Google_Docks_Montevetro_building.jpg) | Jmckinley | CC BY-SA 3.0 | 2014-03-18 | From the inner basin: the slab over the Dock Mill's stone gables and red brick |
| 03-montevetro-murphy.jpg | [Google Montevetro building.jpg](https://commons.wikimedia.org/wiki/File:Google_Montevetro_building.jpg) | William Murphy | CC BY-SA 2.0 | | Street view of the tower |
| 04-montevetro-2014.jpg | [Montevetro Building.jpg](https://commons.wikimedia.org/wiki/File:Montevetro_Building.jpg) | Maryperidot | CC BY-SA 4.0 | 2014-12-03 | Barrow St between Gordon House (left) and Google Docks (right), the **curved glass skybridge**, the railway bridge at the end |
| 05-google-docks-from-barrow-street.jpg | [Google Docks view from Barrow Street.jpg](https://commons.wikimedia.org/wiki/File:Google_Docks_view_from_Barrow_Street.jpg) | Jmckinley | CC BY-SA 3.0 | 2014-03-18 | **Key.** From Barrow St south of the railway: the stone railway bridge with the **yellow-and-black height bar ("3.67 m")**, the calp embankment wall with brick arches, the tower's south face with yellow bands |
| 06-barrow-street-skybridge.jpg | [Three way skybridge over Barrow Street.jpg](https://commons.wikimedia.org/wiki/File:Three_way_skybridge_over_Barrow_Street.jpg) | Grendelkhan | CC BY-SA 4.0 | 2019-05-03 | The skybridge |
| 07-barrow-street-station-night.jpg | [Dublin At Night - Railway Station, Barrow Street (Beside Google)](https://commons.wikimedia.org/wiki/File:Dublin_At_Night_-_Railway_Station,_Barrow_Street_(Beside_Google)_(6540581601).jpg) | William Murphy | CC BY-SA 2.0 | | Platforms at night, sodium lamps, offices lit |
| 08-grand-canal-dock-station-2025.jpg | [Grand Canal Dock Station.jpg](https://commons.wikimedia.org/wiki/File:Grand_Canal_Dock_Station.jpg) | David Kernan | CC BY 4.0 | 2025-12-22 | Platform sign, footbridge, Google Docks lit behind |
| 09-bolands-quay-2023.jpg | [Bolands Quay, Dublin Docklands (2023).jpg](https://commons.wikimedia.org/wiki/File:Bolands_Quay,_Dublin_Docklands_(2023).jpg) | DylanGLC2017 | CC0 | 2024-04-20 | **Key driver's view** from MacMahon Bridge: the mill's twin gables with the lettering, BOL1 and BOL2, the balconied stone warehouse |
| 10-bolands-quay-silicon-docks.jpg | [Boland's Quay, Silicon Docks.jpg](https://commons.wikimedia.org/wiki/File:Boland%27s_Quay,_Silicon_Docks.jpg) | William Murphy | CC BY-SA 2.0 | | From the inner basin: gables, both towers, the Waterways centre, Alto Vetro's drum |
| 11-bolands-mills-2023.jpg | [Bolands Mills 2023.jpg](https://commons.wikimedia.org/wiki/File:Bolands_Mills_2023.jpg) | Sheila1988 | CC BY-SA 4.0 | 2023-10-12 | The long six-storey calp front on Ringsend Rd, the lettering, the new footbridge |
| 12-bolands-mill-night.jpg | [Boland's Mill under nightfall.jpg](https://commons.wikimedia.org/wiki/File:Boland%27s_Mill_under_nightfall.jpg) | David Kernan | CC BY 4.0 | 2025-12-16 | **Key night view**: lit lettering, towers' window slots lit, Google Docks' lit grid reflected in the basin |
| 13-bolands-mill-2015.jpg | [Bolands' Mill and surrounding buildings, Dublin 20150809 1.jpg](https://commons.wikimedia.org/wiki/File:Bolands%27_Mill_and_surrounding_buildings,_Dublin_20150809_1.jpg) | DXR | CC BY-SA 4.0 | 2015-08-09 | Before the rebuild, with the silos |
| 14-grand-canal-quay-from-pearse-street.jpg | [Grand Canal Quay from Pearse Street - geograph 2178439](https://commons.wikimedia.org/wiki/File:Grand_Canal_Quay_from_Pearse_Street_-_geograph.org.uk_-_2178439.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | **Key for the owner's complaint**: the promenade from Pearse St to the square along the water, Gallery Quay, 1 GCS, the Marker and the red light-sticks at the end |
| 15-alto-vetro.jpg | [Alto Vetro.jpg](https://commons.wikimedia.org/wiki/File:Alto_Vetro.jpg) | Sarah777 | CC0 | 2009-05-30 | Alto Vetro from the inner-basin promenade: black floor bands, cantilevered balconies; the Waterways centre on stilts |
| 16-alto-vetro-from-hanover-quay.jpg | [geograph 1010427](https://commons.wikimedia.org/wiki/File:Alto_Vetro_Tower_and_Grand_Canal_Square_from_Hanover_Quay_-_geograph.org.uk_-_1010427.jpg) | Ian Paterson | CC BY-SA 2.0 | 2008-10-15 | Alto Vetro and the square |
| 17-grand-canal-quay-walk.jpg | [geograph 2169418](https://commons.wikimedia.org/wiki/File:Walking_the_Celtic_Tiger_on_Grand_Canal_Quay%5E_-_geograph.org.uk_-_2169418.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | The promenade surface: granite flags, sett strip at the edge, bollards, caged young trees |
| 18-macmahon-bridge.jpg | [Macmahon bridge.jpg](https://commons.wikimedia.org/wiki/File:Macmahon_bridge.jpg) | Bluntylad67 | CC BY-SA 4.0 | 2008-06-01 | MacMahon Bridge |
| 19-bolands-quay-construction-2020.jpg | [Boland's Quay Construction Dublin 2020.jpg](https://commons.wikimedia.org/wiki/File:Boland%27s_Quay_Construction_Dublin_2020.jpg) | William Murphy | CC BY-SA 2.0 | | Construction |
| 20-offices-near-station-2010.jpg | [geograph 1973340](https://commons.wikimedia.org/wiki/File:New_office_buildings_near_the_Grand_Canal_Dock_Station_-_geograph.org.uk_-_1973340.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-07-17 | Offices by the station |
| 21-grand-canal-quay-2019.jpg | [Grand Canal Quay.jpg](https://commons.wikimedia.org/wiki/File:Grand_Canal_Quay.jpg) | Metro Centric | CC BY 2.0 | 2019-06-08 | Grand Canal Quay |
| 22-panorama-from-google-office.jpg | [Dublin-panorama-google-office-01.jpg](https://commons.wikimedia.org/wiki/File:Dublin-panorama-google-office-01.jpg) | Remca | CC BY-SA 4.0 | 2012-07-04 | The dock from high in Google Docks |
| 23-macmahon-bridge-geograph.jpg | [geograph 2177413](https://commons.wikimedia.org/wiki/File:Bridge_over_the_Grand_Canal_Basin_-_geograph.org.uk_-_2177413.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | MacMahon Bridge |
| 24-grand-canal-docks-2007.jpg | [geograph 1814558](https://commons.wikimedia.org/wiki/File:Grand_Canal_Docks_(2)_-_geograph.org.uk_-_1814558.jpg) | Sarah777 | CC BY-SA 2.0 | 2007-04-02 | The docks in 2007 |
| 25-inner-basin-to-trinity-enterprise-centre.jpg | [geograph 2178419](https://commons.wikimedia.org/wiki/File:View_across_the_Grand_Canal_Basin_towards_the_Trinity_Enterprise_Centre_-_geograph.org.uk_-_2178419.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | Alto Vetro beyond MacMahon Bridge, the square's poles |
| 26-barrow-street-warehouse.jpg | [Lagerhalle Barrow Street 1.JPG](https://commons.wikimedia.org/wiki/File:Lagerhalle_Barrow_Street_1.JPG) | Dublinprojekt | CC BY-SA 4.0 | | A Barrow St warehouse |
| 27-macmahon-bridge-2012.jpg | [GrandCanal-1-MacMahonBridge.JPG](https://commons.wikimedia.org/wiki/File:GrandCanal-1-MacMahonBridge.JPG) | Deitel55 | CC BY-SA 3.0 | 2012-02-03 | MacMahon Bridge |
| 28-grand-canal-dock-station-night.jpg | [Dublin At Night - Grand Canal Dock Railway Station (6540585763)](https://commons.wikimedia.org/wiki/File:Dublin_At_Night_-_Grand_Canal_Dock_Railway_Station_(6540585763).jpg) | William Murphy | CC BY-SA 2.0 | | Station at night |

---

## 3. Landmark profiles

### 3.1 Google Docks (Montevetro)

- Developer Treasury Holdings; completed c. 2009 (Wikipedia list: 2010); bought by Google in 2011. Architect: **Burdon Craig Dunne Henry** is often given (unverified here; not in the sources fetched).
- **Form:** a flat-topped dark glass slab, ~15 storeys (floor-to-floor ≈ 4.4 m), long faces N (the dock) and S (the railway). A lower shoulder at the NW end (refs 01, 02). The frame is a **near-black grid** of aluminium mullions and floor bands; each structural bay holds a 2 x 2 grid of blue-green panes (refs 01, 02).
- **The east end** (onto Barrow Street) and the SE corner carry **yellow-orange spandrel panels**, one per floor, in a vertical strip (refs 01, 05). This is the tower's most recognisable cue from the dock.
- **Night:** a regular lit grid of office floors, cool white (refs 08, 12).

### 3.2 Boland's Quay

- **Mills:** calp limestone (dark grey-brown, rubble-coursed, with lighter granite/limestone dressings), six storeys, small segmental-headed sash windows in regular rows, slate roofs. The west block shows **two gables side by side to the basin**, each with a column of windows; **BOLANDS / FLOUR MILLS** in raised orange-gold letters across both gables at 3rd-4th floor level. The long north front on Ringsend Rd is ~20 bays.
- **Towers:** BOL1 (13 floors, 54 m) nearer Ringsend Rd, BOL2 (11-12 floors) south of it. Off-white/very pale grey rainscreen with **narrow vertical window slots scattered floor by floor**, dark glass slots, flat tops with a slightly sloped cap; **copper-red vertical fins** on the back (east) and on the flanks (refs 09, 10, 12). A glazed link bridge between them.
- **Night:** window slots lit warm white; the lettering lit (ref 12).

### 3.3 Alto Vetro

- Shay Cleary Architects, 2008, 16 storeys, 51-52 m, **only ~7-10 m wide** in plan. Floor-to-ceiling glass with thin mullions and **black floor bands**; **black-framed glass balconies cantilever out** from the long sides, alternating floor by floor. A glass rooftop pavilion. Stands on the quay edge at the NW corner of the inner basin.

### 3.4 Grand Canal Dock station and the railway

- Elevated. The line crosses Barrow Street on a **low stone bridge with a steel deck**, a **yellow-and-black chevron height bar** and a "3.67 m" roundel (ref 05). The embankment is **calp rubble with red-brick relieving arches** (ref 05). Three platforms with grey steel shelters and canopies, steps and a lift down to Barrow St.

### 3.5 The west promenade (Grand Canal Quay north of Pearse St)

- 20-25 m wide real (≈ 11 game m) from the building line to the quay edge: granite flags, a strip of setts along the edge, a granite coping, **cast-iron bollards** at the water's edge, **a double row of young trees in steel cages** along the water, light columns (refs 14, 17; owner's screenshot). The Gallery Quay apartments and 1 Grand Canal Square on the left, with cafés at ground floor.

### 3.6 Colours (sRGB, sampled from refs, corrected by eye)

| Surface | Hex |
|---|---|
| Google Docks frame | `#1c1f22` |
| Google Docks glass (day) | `#3f5b6e` to `#6d8fa3` |
| Google Docks yellow spandrels | `#e0b12a` |
| Boland's Quay panels | `#e6e6e1` |
| Boland's Quay copper fins | `#9c4a2c` |
| Calp limestone (mills) | `#7d776e`, dressings `#a7a095` |
| Lettering | `#e39a2d` |
| Slate | `#4a4e52` |
| Alto Vetro glass / bands | `#51646f` / `#15181a` |
| Promenade granite | `#b5b2aa` |

### 3.7 Recognisable cues (from a car)

1. From Pearse St at the dock corner: the open promenade running north along the water to the square, the theatre and the Marker's checkerboard at the end (owner's screenshot, ref 14).
2. From MacMahon Bridge: the mill's twin gables with **BOLANDS FLOUR MILLS**, and two pale towers behind (ref 09).
3. Over the inner basin: the dark Google Docks slab with its yellow strip (ref 01).
4. On Barrow St: the skybridge between Gordon House and Google Docks, and the low railway bridge with the yellow-and-black bar (refs 04, 05).
5. Alto Vetro's thin glass needle by the bridge (ref 15).

---

## 4. Build brief (prioritised)

### P0: roads and the promenade (`streets.json`, done in this brief)
See §1.6. Filler kept off the promenade (the way itself plus a reserved strip to the water); trees and bollards along the edge.

### P1: the hero GLB (`tools/blender/build_barrowst.py` → `public/models/barrowst.glb`)
One file of named parts, each built in its own frame (u east, v north, metres in game plan, real heights) and placed from absolute coordinates in `src/world/sites.js` (`barrowParts`), then merged by material:
- `montevetro` (Google Docks), `gordon` (Gordon House), `gasworks` (Gasworks House), `skybridge`
- `bol1`, `bol2`, `millw` (the gabled west warehouse), `millr` (the Ringsend Rd range), `stonewh` (the balconied warehouse), `dockmill` (the stone/brick range between Boland's and Google Docks)
- `altovetro`, `waterways` (the visitor centre on stilts)
- `railway`: the embankment from the Grand Canal Quay tunnel to Barrow St, platforms and shelters, the Barrow St and Grand Canal Quay rail bridges

Materials painted at load (`src/world/barrowst.js`): repeating facade modules for the glass towers with night twins (random lit offices), calp stone with sash windows, slate, copper fins, and a small atlas for the lettering, the station sign and the chevron bar.

### P2
- Filler: modern glass and panel offices in the "Silicon Docks" zone.
- Places: "Google (Barrow Street)" and "Boland's Quay".
- The Millennium Tower on Charlotte Quay (63 m) and the offices on Grand Canal Plaza.

---

## 5. Open questions

1. **1/2 Grand Canal Quay** (64.1 m, 15 floors, under construction 2023 per the Wikipedia list): which plot? If it is the Gallery Quay / Pearse St corner (the scaffolding in the owner's screenshot), the promenade stays but the NW corner block would become a tower. Not built.
2. **Montevetro's architect** (BCDH?) and completion year (2009 vs the list's 2010) are unverified.
3. **The Millennium Tower** (63 m, OSM) is not on the Wikipedia list. Filler covers it for now. It could share this hero kit later.
4. The skybridge's third arm: which building it reaches (Gasworks House?) is unclear from ref 06.
5. The Barrow St underpass is modelled as a narrow two-way way (the game has no alternating signals).

## Sources

- OpenStreetMap contributors, via Overpass API, ODbL: `data/osm/barrow-street.json`.
- Wikipedia (CC BY-SA): "List of tallest buildings and structures in Dublin"; "Boland's Mill"; "Alto Vetro"; "Grand Canal Dock"; "Grand Canal Dock railway station"; "Bord Gáis Energy Theatre" (text fetched 2026-09-29 through the MediaWiki API).
- Wikimedia Commons images as listed in §2 and `refs/barrow-street/sources.json`.
