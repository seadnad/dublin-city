# Grand Canal Square (`grandCanal`, `marker`, `gcsNorth`): research and build

Scope: the square at the east end of Grand Canal Dock and the buildings that frame it. That is the Bord Gáis Energy Theatre (Libeskind, 2010) at its west end, the Marker Hotel (Aires Mateus, 2013) on its north side, the Libeskind office blocks (2 Grand Canal Square to the south of the theatre, 4-5 Grand Canal Square across Misery Hill to the north of it), 1 Grand Canal Square (DMOD, 2006) on the south side, and the streets between them, Misery Hill and Hibernian Road. The dock's west side (Grand Canal Quay, Boland's Quay, Barrow Street) belongs to another pass.

- Raw OSM: `data/osm/grand-canal-square.json`. Overpass `out geom`, bbox **S 53.3425, W -6.2425, N 53.3462, E -6.2355**. Snapshot `timestamp_osm_base` 2026-06-01T08:52:28Z (the kumi.systems mirror; the main server was busy). It holds buildings and parts, highways, amenities, tourism, leisure, landuse, water and man_made: 320 elements.
- References: `refs/grand-canal-square/` holds 19 images from Wikimedia Commons (CC0, CC BY or CC BY-SA). Credits are in §2 and `refs/grand-canal-square/sources.json`. The owner's Street View screenshots were used only as guidance while modelling. They are not in the repo.
- Every request used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`.
- Game coordinates come from `project()` in `src/world/geo.js`. This area straddles the south edge of the quays' north-south stretch band (53.3442 to 53.3462, k = 1.4). North of latitude 53.3442, game z is therefore squeezed less, and a real metre north counts 0.7 game m (0.5 elsewhere). East-west it is plain half scale.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 Which building is which (VERIFIED, OSM plus sources)

| Building | OSM | Game footprint (x, z), plain projection | Facts |
|---|---|---|---|
| **Bord Gáis Energy Theatre** (Grand Canal Theatre until March 2012) | `way 52201224`, `architect=Daniel Libeskind`, `year_built=2010` | x 618.6-658.1, z 155.5-189.3. Its glass front faces **east** down the square to the water. The north side lines Misery Hill and the west side Macken Street. The south side is a diagonal against 2 GCS. | Opened 18 March 2010. 2,111 seats, Ireland's largest fixed-seat theatre. EUR 80 m. Libeskind with RHWL (theatre) and McCauley Daye O'Connell (executive). Sisk (contractor), Arup (structure). Designboom: "stainless steel rain screen cladding panels ... with strips of high performance glazing", and a lobby glass wall of "exposed polyester powder coated pre-fabricated steel box sections". |
| **The Marker** (now Anantara The Marker) | `way 102694950`, `architect=Manuel Aries [sic] Mateus`, `building:levels=7` | A parallelogram x 646.5-687, z 133.3-155.5, with the front (south) edge along Misery Hill's paved section, ~10° off east-west | Hotel with 187 rooms. The shell was finished c.2009 and stood empty until it opened in 2013 (refs 01-04 show it empty). Design by Manuel Aires Mateus, executive McCauley Daye O'Connell, fit-out by Sisk. The chequerboard facade is GRC panels with full-height glazing. The ground floor is a **6 m fully glazed storey**, and the block above rests on three columns. It has a rooftop bar and a 23 m pool. Real size ≈ 79 m x 21 m. |
| **4-5 Grand Canal Square** ("north block") | `way 287695750` (`development=Riverside 3`) | x 616.5-643.5, z 89-147. Cardiff Lane on the west, Misery Hill on the south, Hibernian Road on the east, Riverside 3 on the north. An entrance notch with steps (`way 1354672270`) at the SW corner. | Libeskind, 2009-10, eight floors, **"a dramatic gateway to Dublin harbour"**. The north and south blocks together are 45,500 m² of offices. It has twin-skin low-iron glazing with geometric ceramic frit and perforated blinds. It was Facebook's international HQ (interiors by Gehry) from c.2014. RKD have since retrofitted it (33,600 m²; new entrances, upgraded facades). **This is the "huge unique-looking office facing the side of the theatre"** in the owner's feedback: the leaning faceted glass prow over a glazed base on a granite plinth with steps. |
| **2 Grand Canal Square** ("south block") | `relation 4572157` (outline `102694980` + part `327144421`) | An L: a thin strip west of the theatre (x 610-619) and the main block south of it, x 611-642, z 181-211 | Libeskind, 2010, eight floors. It "opens toward the square". Leased by BCM Hanby Wallace (later Arthur Cox). |
| **1 Grand Canal Square** | `way 102694959`, `building:levels=7` | x 646-677, z 196-227, on the south side of the square | DMOD (Duffy Mitchell O'Donoghue; designer Colin O'Donoghue), 2006, EUR 40 m. The first all-glass building in Ireland: five office floors round an atrium over ground-floor shops (Cafe Bar H, HSBC). Accenture was the anchor tenant. |
| Marker Residences (behind the Marker) | `way 102694952`, 6 levels | x 665-691, z 90-137 (a U shape) | Apartments, addressed "The Marker Residences, Hibernian Road" |
| Chimney Park and the Misery Hill substation | `312553676`, `102694971`, chimney `46207550` | x 648-666, z 89-131 | A brick chimney (from the old gasworks / Hibernian Marine) in a small park |
| Gallery Quay | `102694937`, `102694984`, 7 levels | south of 2 GCS and 1 GCS, to Pearse Street | apartments |

### 1.2 Streets

| Street | OSM | Notes |
|---|---|---|
| **Misery Hill** | `37691371` (Cardiff Lane/Macken St junction to the theatre's NE corner: 3 lanes, 30 km/h, asphalt), `46933051` (on east: **one-way, paving stones**, along the Marker's front to the dock and Hanover Quay) | Wikipedia: "partly a one way street leading from Macken Street to Grand Canal Square". The OSM one-way direction runs from the dock end westwards. The paved section has double yellow lines and steel bollards (owner's photo). In the 1700s it was a gallows site, and it is also linked with a medieval leper hospital. |
| **Hibernian Road** | not tagged as a highway in OSM (only the service stub `312553678` into Chimney Park) | Property listings put 4-5 GCS "bounded by Hibernian Road to the east, Misery Hill to the south, Cardiff Lane to the west and Sir John Rogerson's Quay to the north". So Hibernian Road is the short north-south street between 4-5 GCS and the Marker / Chimney Park, with the theatre car park access. **Google's Street View labels the Misery Hill carriageway past the theatre "Hibernian Rd"** (owner's screenshots 327d3fcf, 9ed03ed0), so the names are used loosely. |
| Macken Street / Cardiff Lane | `4934683`, `1032415798`, `151364` | Macken Street (R813) runs south of the Misery Hill junction and Cardiff Lane north of it. The game calls both "Macken Street" (SQ15-MC1-MC2). |
| Chimney View | `4825239` | a residential cul-de-sac from Pearse Street up the east side of 2 GCS. It isn't in the game. |
| Grand Canal Square (footway) | `28046675` | the promenade along the dock edge (x ≈ 677-690) |

### 1.3 What the game had (before this pass)

- **No Misery Hill.** The block from Macken Street to Forbes Street and from the quay to the square was one filler block, so the theatre's north side and the office opposite had no street between them.
- `sites.grandCanal`: the theatre as a 26 x 34 m box at `at(53.34414, -6.23995)`, about 6 m too far south, with procedural walls (`grandCanalTheatre()`) and a leaning glass front.
- `extraSites.marker`: **36 x 12 m, 26 m high**, a checker texture on a box (`markerHotel()`). The real building at game scale is 40 x 14.5 m in plan (with the N stretch) and ~29 m high, with a deep 3D facade. Hence the owner's "the Marker Hotel is bigger".
- 4-5 GCS and 2 GCS were generic filler. `gcsOffice()` (1 GCS) is a 26 m glass box with a folded glass roof, roughly in the right place.
- `grandCanalSquare()`: the red carpet, the light-sticks and the green triangles. It is fine as it is and stays.

---

## 2. Reference images (`refs/grand-canal-square/`)

All come from Wikimedia Commons (1000 px thumbnails). None are from Google.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-marker-front-2010.jpg | [Grand Canal Square - Hotel Still Unoccupied](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_Hotel_Still_Unoccupied.jpg) | William Murphy | CC BY-SA 2.0 | 2010-10-11 | **Key elevation**, straight on: the chequerboard, the fins on the roofline, the faceted soffit row, the glazed ground floor, planters |
| 02-marker-soffit-2010.jpg | [... Unoccupied 2](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_Hotel_Still_Unoccupied_2.jpg) | William Murphy | CC BY-SA 2.0 | 2010-10-11 | **The soffit**: the solid cells of the first row hang down as faceted inverted pyramids over the recessed 6 m glazing |
| 03-marker-corner-2011.jpg | [Manuel Aires Mateus's luxury hotel (not operational)](https://commons.wikimedia.org/wiki/File:Manuel_Aires_Mateus%E2%80%99s_luxury_hotel_(not_operational).jpg) | William Murphy | CC BY-SA 2.0 | 2011-10-30 | the west end across the sticks |
| 04-marker-window-detail-2011.jpg | [... (not operational) 2](https://commons.wikimedia.org/wiki/File:Manuel_Aires_Mateus%E2%80%99s_luxury_hotel_(not_operational)_2.jpg) | William Murphy | CC BY-SA 2.0 | 2011-10-30 | deep reveals and dark frames at a corner |
| 05-marker-sticks-2012.jpg | [Grand Canal Square - panoramio (3)](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_panoramio_(3).jpg) | William Murphy | CC BY-SA 3.0 | 2012-05-11 | the Marker front with the sticks |
| 06-marker-2013.jpg | [Marker Hotel](https://commons.wikimedia.org/wiki/File:Marker_Hotel.jpg) | William Murphy | CC BY-SA 2.0 | 2013-10-28 | the hotel open |
| 07-marker-across-square-2010-geograph.jpg | [The Grand Canal Hotel, Chimney Park (geograph 2177530)](https://commons.wikimedia.org/wiki/File:The_Grand_Canal_Hotel,_Chimney_Park_-_geograph.org.uk_-_2177530.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | **The Marker straight on** across the red carpet: 26 columns, 7 rows above a glazed ground floor, the east return |
| 08-theatre-marker-2012.jpg | [Grand Canal Square - Dublin Docklands - panoramio (2)](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_Dublin_Docklands_-_panoramio_(2).jpg) | William Murphy | CC BY-SA 3.0 | 2012-07-22 | **The theatre front** with its folded roof, the V of white struts, the canopy with the name, the Marker's west end and 4-5 GCS behind |
| 09-theatre-northeast-side-2012.jpg | [... panoramio (6)](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_Dublin_Docklands_-_panoramio_(6).jpg) | William Murphy | CC BY-SA 3.0 | 2012-07-22 | the stainless-mesh wedge (car park stair) at the theatre's NE corner, the lawn, the Marker |
| 10-theatre-from-sjrq-2019.jpg | [Bord Gáis Energy Theatre, Dublin from Sir John Rogerson's Quay](https://commons.wikimedia.org/wiki/File:Bord_G%C3%A1is_Energy_Theatre,_Dublin_from_Sir_John_Rogerson%27s_Quay.jpg) | Metro Centric | CC BY 2.0 | 2019-06-08 | **The theatre's north face** down Hibernian Road: silver stainless panels in diagonal courses rising west to a peak, 4-5 GCS at right |
| 11-view-south-to-theatre-2010-geograph.jpg | [View south towards the Grand Canal Theatre (geograph 2178661)](https://commons.wikimedia.org/wiki/File:View_south_towards_the_Grand_Canal_Theatre_-_geograph.org.uk_-_2178661.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-11-13 | the pedestrian street south to the theatre's silver face |
| 12-theatre-across-dock-2010.jpg | [Grand Canal Theatre, Dublin](https://commons.wikimedia.org/wiki/File:Grand_Canal_Theatre,_Dublin.JPG) | DubhEire | CC0 | 2010-02-17 | **Massing across the dock**: the roof rising west from the glass front, the Marker (with the chimney behind), the jetty |
| 13-theatre-front-2018.jpg | [Bord Gáis Energy Theatre, Dublin](https://commons.wikimedia.org/wiki/File:Bord_G%C3%A1is_Energy_Theatre,_Dublin.jpg) | Tahir mq | CC BY-SA 4.0 | 2018-08-11 | the front close: green-tinted leaning glass, white diagonals, the soffit, BORD GÁIS ENERGY on the fascia |
| 14-theatre-front-close-2026.jpg | [Nahaufnahme Fassade](https://commons.wikimedia.org/wiki/File:Nahaufnahme_Fassade.jpg) | Andreas Wolf 01 | CC0 | 2026-06-22 | the leaning glass and the white soffit from below |
| 15-theatre-night-2012.jpg | [Bord Gáis Energy Theatre (8225076312)](https://commons.wikimedia.org/wiki/File:Bord_G%C3%A1is_Energy_Theatre_(8225076312).jpg) | Miguel Mendez | CC BY 2.0 | 2012-11-27 | **Night**: the lobby glowing through the glass, the lit name |
| 16-square-night-2017.jpg | [Grand Canal Square - Dublin, Ireland - August 18, 2017](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_Dublin,_Ireland_-_August_18,_2017.jpg) | Giorgio Galeotti | CC BY 4.0 | 2017-08-18 | **Night**: red and green light on the square, the lit sticks, the Marker's windows |
| 17-across-dock-2012.jpg | [Grand Canal Square - Dublin Docklands - panoramio](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_Dublin_Docklands_-_panoramio.jpg) | William Murphy | CC BY-SA 3.0 | 2012-07-22 | from the promenade: 1 GCS, the theatre roof's peak at the NW |
| 18-marker-hanover-2012.jpg | [Grand Canal Square - panoramio (15)](https://commons.wikimedia.org/wiki/File:Grand_Canal_Square_-_panoramio_(15).jpg) | William Murphy | CC BY-SA 3.0 | 2012-05-11 | the Marker's east end and Hanover Quay |
| 19-dock-night-2017.jpg | [Grand Canal Dock - Dublin, Ireland - August 18, 2017 01](https://commons.wikimedia.org/wiki/File:Grand_Canal_Dock_-_Dublin,_Ireland_-_August_18,_2017_01.jpg) | Giorgio Galeotti | CC BY 4.0 | 2017-08-18 | the dock at night from the east |

Commons has **no CC photo of 4-5 GCS's leaning prow on Misery Hill**. The model follows the design descriptions, ref 10's glimpse of its east face, and the owner's screenshots, which were used only as guidance.

---

## 3. Landmark profiles

### 3.1 The Marker (refs 01, 02, 05, 07)

- **Grid:** 26 columns along the square (≈ 3.0 m each over the 79 m front) and 6 across each end. **Rows above the glazed ground floor:** a soffit row, five chequer rows and a top row, seven in all (OSM: 7 levels).
  - Chequer rows: the solid white GRC cells are flush, and the window cells are set deep (≈ 0.6 m reveals) with dark frames and pale curtains.
  - Top row: the solid cells rise as **fins** to ≈ 1 m above the parapet, which gives the crenellated roofline. The window cells between them are the recessed glazing of the rooftop bar.
  - Soffit row: the solid cells **hang down as faceted inverted pyramids** (the "Giant's Causeway" folds). The window cells of that row are recessed solid panels in shadow.
- **Ground floor:** 6 m, fully glazed and set back ≈ 1.5 m under the soffit. It has a black steel porte-cochère box at the entrance near the east end, a lawn terrace with a granite kerb along the front, and planters with grasses.
- **Heights (estimated):** ground floor 6 m, then 7 rows of ≈ 3.1 m, fins +1 m, for a total of **≈ 29 m**.
- **Colours:** GRC `#e7e5df` (sunlit `#f0efea`, shaded `#b9b8b3`), glazing `#27323a` with curtains `#cfd3cf`, frames `#2b2f33`.

### 3.2 Bord Gáis Energy Theatre (refs 08, 10, 12-15)

- **Massing:** a folded "crystal". The roof is big inclined planes rising from the canopy at the front (east, fascia ≈ 25-27 m) to a high back edge over the fly tower (west, ≈ 40 m+) (refs 12, 17). A sharp prow rises at the NE top corner (ref 15). Studio Libeskind calls it a "five storey venue" with a "dramatic, four story glass facade, sharply angled roof line" whose glass "tilts back in space in diagonal pleats" ([libeskind.com](https://libeskind.com/work/bord-gais-energy-theatre-and-grand-canal-commercial-development/)). OSM (`way 52201224`) has no `height` or `building:levels`, and no source found gives metres, so the heights are photo estimates (see §5).
- **Canopy (refs 08, 13, 14, 16):** deep, with a white soffit that rises outwards to the fascia. It runs past the glass at the south end, where a white wedge hangs from it back down to the glass's corner at about half height. At the north end it becomes the prow.
- **The glass's pleats (refs 13, 14):** near plumb at the south under the deep soffit, and leaning far out at the north to meet the canopy. The four lobby tiers (balcony fronts, ramps, and red walls lit at night, ref 16) show through the glass.
- **East front (the lobby):** a huge **leaning glass wall**, set back at the foot and leaning out towards the square. Across it run **white box-section diagonals**: two big ones form a V with the apex low in the middle (ref 08), plus a lattice of lesser diagonals. At the top is the white soffit / canopy with **BORD GÁIS ENERGY THEATRE** on the fascia. It is green-tinted glass (`#5f8a80` on the reflections).
- **North side (Misery Hill) and west side (Macken Street):** stainless-steel rainscreen panels in **diagonal courses** (ref 10, `#c9ccce` sunlit, `#8f9496` shaded), with glazing strips.
  - Owner's screenshot (327d3fcf): the upper west part of the north side is a mass of **fine horizontal louvres** that overhangs the lower silver wall. The lower wall carries a big **black triangular opening** (the get-in / loading bay).
- **Night:** the lobby glows warm white through the glass (refs 15, 16), and the name is lit.

### 3.3 4-5 Grand Canal Square (owner's screenshots, design descriptions, ref 10)

- **Height and form:** eight floors, ≈ 33 m, green-grey reflective glass on thin dark mullions with a diagonal frit / structure pattern.
- **Misery Hill front:** the upper floors (from the third floor) **lean out and fold** into a faceted prow. The warped glass plane breaks into triangles, and the corner **cantilevers over a recessed two-storey glazed base** with an angled dark soffit and downlights. Under it, **granite steps** rise to a **granite plinth** (the street falls to the east).
- **Other features:** a lighter grey glass **blade** (the stair core) on the Misery Hill face towards Hibernian Road, and a curved glazed foot at the SE corner. On the Hibernian Road side there are horizontal spandrels and blinds (ref 10).

### 3.4 2 Grand Canal Square and 1 Grand Canal Square

- **2 GCS:** eight floors of the same Libeskind glass with angled facets, framing the theatre on the south. Mostly seen from Macken Street and over the theatre.
- **1 GCS:** a five-storey all-glass box with colour-shifting glazing over ground-floor shops, on the south side of the square. The existing procedural `gcsOffice()` is kept.

### 3.5 Five recognisable cues

1. The **Marker's chequerboard**, with its crenellated fins and the faceted soffit floating over a glazed ground floor.
2. The theatre's **leaning glass front with the white V**, and the folded silver roof rising to the west.
3. The **red light-sticks and red carpet** out over the water (existing).
4. On Misery Hill: the **silver theatre wall with louvres overhead** on one side and the **leaning glass prow of 4-5 GCS** on the other, with the Marker closing the view.
5. At night: the **glowing lobby**, the Marker's lit rooms, and red and green light on the square.

---

## 4. Build brief, and what was built

### Road change: Misery Hill (a minimal change to `src/data/streets.json`)

- The new nodes are **MH1** (53.34442, -6.23983, the theatre's NE corner), **MH2** (53.34434, -6.23926) and **MH3** (53.3443, -6.23877), all taken from the OSM ways.
- The west part, **MC1 → MH1**, is `secondary`, 8 m wide with 3 m footpaths. It is the 3-lane asphalt street between the theatre and 4-5 GCS.
- The paved part, **MH1 → MH2 → MH3 → HQ1**, is a `lane`, 6 m wide with 1.6 m footpaths. It has `surface: sett` (the grey paving), `oneway: -1` (westbound only, as in OSM, from the dock end to Macken Street), `access: destination` and `lamps: none` (the square's lights do the work).
- This joins Macken Street at MC1 and Hanover Quay / Forbes Street at HQ1.
- `dupcheck` and `streets-fmt` were run. `footprints.mjs` reports 0, and `bridges.mjs` reports none over water.
- Hibernian Road is not added. It is only a narrow gap in the game, so the space between 4-5 GCS and the Marker stays paved.

### The hero: `tools/blender/build_gcsquare.py` → `public/models/gcsquare.glb`

The GLB is 48 KB (Draco) with **3,809 triangles** after the AO subdivision (2,603 built; theatre v2). Before v2 it was 45 KB and 3,549. It has 4 materials, so 4 draw calls, with AO baked into the vertex colours of the opaque parts. It covers five buildings.

**Placement and scale**
- The model is built straight in game metres from absolute game coordinates: origin at game (640, 150), no rotation.
- The footprints are the OSM ones projected by `geo.js` and nudged clear of Misery Hill. They are kept once, in `GCSQ` in `sites.js`, for the site boxes, `reserved` and collision.
- **Plan is half scale** (the Marker's depth carries the N stretch). **Heights are real**, because the city's filler uses real storey heights.

**The Marker (the owner's "bigger")**
- Size: **40 x 14.6 m, 28.7 m to the fins**. Before it was 36 x 12 m and 26 m.
- 13 x 5 columns round a parallelogram.
- A 6 m glazed ground floor set 1.4 m back.
- The soffit row: its solid cells hang as faceted inverted pyramids, and its window cells are recessed panels.
- Five chequer rows with 0.55 m-deep windows. There are four window variants, with curtains by day and lit / dim / dark rooms at night.
- The top row: fins 1 m proud round the recessed rooftop-bar glazing, and a plant screen.
- At the front: the black porte-cochère with THE MARKER, and the lawn and planting terrace.

**Bord Gáis Energy Theatre**
- **v2 (the owner's "looks squashed"; sheet `docs/research/grand-canal-theatre-v2.png`).** What was wrong:
  - The half-scale plan made the lobby front 26 m wide against real heights. The real front is ≈ 47 m, about 1.9 : 1 wide against its height. The game's was about 1.2 : 1, a near-square box between 2 GCS (33 m) and the Marker.
  - The canopy was a thin 1.6 m lid, and the whole glass wall leaned out evenly. The front read as a tipped box.
  - The roof, 43 m back in plan against 77 m real, is edge-on from the square, so only the lid showed.
- **v2 fixes, for the theatre only:**
  - The plan runs west to the Macken Street footpath (x 614.8, +4.2 m depth), and the SE corner moves 1.5 m south.
  - The canopy is deep (5.6-7.6 m out from the glass foot), with a white soffit rising to a 1.8 m fascia. It runs 3.6 m past the glass's south corner, with the hanging white wedge down to 12.5 m. At the north it ends in a prow 3.4 m past the north wall, rising to ≈ 30.5 m. The front now reads ≈ 34 m wide.
  - The glass is in three pleats: 5.0 / 3.2 / 0.8 / 0.2 m out at the top (north to south), with glass tops at 24-21.6 m.
  - The white V and diagonals are heavier (0.85 m). The painted lobby tiers are every 6 m, lit, with red walls at night.
  - The roof is folded planes from the fascia (25.4-27.6 m) to a back edge at 40 m (NW) and 34 m (SW), with the fly tower's peak at 43 m and rooflights along the folds.
  - The canopy uses its own atlas swatch (`canopy`), uplit at night.
- The roof's folds and the rooflights are all the roof carries. From the square it stays edge-on, as expected with half-scale plan and real heights. From the dock and above, it now reads as the big pale folded plane of refs 12 and 17.
- The walls are stainless rainscreen in 1-in-2 diagonal courses (a seamless 16 m tile) with glazing strips.
- On Misery Hill: a **louvred mass** (30 real slats) overhangs the pavement over the upper west part, and there is a **black triangular get-in** with a steel edge.
- On Macken Street: a stage door and the name.
- The stainless-mesh car park stair (a wedge) stands on the square.

**4-5 Grand Canal Square**
- Eight floors, 32.6 m. The Misery Hill and Cardiff Lane faces **warp**: the SW corner leans out 4.8 m from 8 m up to the roof, so the glass folds into triangles.
- The prow **oversails the entrance notch**, which has a dark soffit, a granite platform, two steps and the plinth. The base is a two-storey glazed base.
- Also a grey-glass stair blade, the parapet and a plant room.

**2 Grand Canal Square**
- Behind the theatre on Macken Street. Its east face leans out towards the square, and the sloping roof rises to 33 m at the NE.

**1 Grand Canal Square**
- Was a procedural box, now in the hero. It is fitted to the OSM footprint: all glass over the shops, 23 m, with an atrium rooflight.

### Game side: `src/world/gcsquare.js`

**Textures.** All textures are painted at load, each with a night twin for the emissive map:
- office curtain glass: a 4-bay x 4-floor tile with fritted spandrels and diagonals;
- lobby glass: a green lattice, glowing warm at night;
- cladding;
- a 1024 atlas.

Low / Battery saver paints the textures at half size. That is the only looks-for-speed trade, and it is LITE only.

**Solid and water glow.** `gcsColliders()` makes the theatre, the Marker, both office blocks, 1 GCS and the wedge solid, whether or not the model loads. Two warm streaks go on the dock for the lit lobby.

**Fallback.** If the GLB fails, `landmarks.js` falls back to the old procedural theatre, Marker and 1 GCS.

**`sites.js`**
- `sites.grandCanal` is now the theatre's real box, along Misery Hill.
- New `sites.marker`, **"The Marker and Misery Hill"**, is a Places entry (map glyph M). Its view is on Misery Hill looking east, the owner's 327d3fcf view.
- Reserved: the Marker, `gcsNorth` / `gcsNorthS`, `gcsSouth`, `gcsWedge`, the open `gcsPlaza` between the theatre, the square and 1 GCS (no more filler block in front of the theatre), and `gcsOffice` (refit).
- The square (`grandCanalSquare()`, unchanged) is re-sited to x 655-687, z 167-191, clear of the new lane.

### Frame cost

`areaperf`, phone default (Low, dpr 1). GPU times are noisy because other agents share the GPU. The stand-in is the old procedural buildings.

| Spot | Hero (two runs) | Stand-in |
|---|---|---|
| Misery Hill looking east | p10 22.2 / 21.2 ms, 277 calls, 0.78 M tris | p10 18.7 ms, 291 calls, 0.77 M tris |
| Hanover Quay looking west at the square | p10 24.9 / 22.6 ms, 342 calls, 1.25 M | p10 28.0 ms, 357 calls, 1.24 M |
| Across the dock | p10 16.2 / 13.4 ms, 247 calls, 0.84 M | p10 18.1 ms, 247 calls, 0.84 M |

The hero costs **fewer draw calls** than the procedural stand-ins (4 materials against their many), for the same triangles. The GPU difference is within the noise.

### Not built / next

- **The owner's detail views need a portrait camera.** The huge louvred mass in 327d3fcf is mostly above a landscape frame at driver's eye.
- **Hibernian Road** is not a street in the game, so ref 10's view south from Sir John Rogerson's Quay is blocked by filler (Riverside 3 / Riverside One and Two are generic).
- The **theatre's roof garden / terrace** and the second (south) half of the lobby's balconies are not modelled. The south wall is mostly hidden by 2 GCS.
- The **red / green night lighting of the square** (ref 16) is still the old light-sticks only. There is no green edge lighting.
- The Marker Residences behind the Marker and Chimney Park's chimney are still filler.

---

## 5. Open questions

1. **Heights.** None are surveyed. The Marker ≈ 29 m is from the storey count and the 6 m ground floor (Irish Building Magazine). The theatre has no OSM height or levels, and no published metres were found (Libeskind, ArchDaily and Designboom give only "four story glass facade" and "five storey venue"). Its canopy (≈ 23-25 m at the NE, against the Marker's 28.7 m in ref 16, and 1 GCS's 23 m in ref 17) and its back edge / fly tower peak (≈ 40 m, refs 12, 17) are photo estimates, ±15%. v2 builds the fascia at 25.4-27.6 m, the prow at 30.5 m, and the peak at 43 m. 4-5 GCS ≈ 33 m is from "eight floors".
2. **Hibernian Road**'s exact line. OSM has no highway for it. The game leaves it as the paved gap between 4-5 GCS and the Marker.
3. **The louvred mass over Misery Hill**: is it the theatre's fly tower, or the north end of 2 GCS's strip along Macken Street? It is modelled on the theatre.
4. The theatre's **get-in opening**: its size and position on the north side are from one screenshot.

## Sources

- OSM via Overpass (ODbL): `data/osm/grand-canal-square.json`
- [Bord Gáis Energy Theatre, Wikipedia](https://en.wikipedia.org/wiki/Bord_G%C3%A1is_Energy_Theatre)
- [designboom: Daniel Libeskind, Grand Canal Square theatre and commercial development](https://www.designboom.com/architecture/daniel-libeskind-grand-canal-square-theatre-and-commercial-development/)
- [e-architect: Grand Canal Square](https://www.e-architect.com/dublin/grand-canal-square)
- [Irish Building Magazine: A marked change (The Marker, 2013)](https://irishbuildingmagazine.ie/2013/09/10/a-marked-change/)
- [Irish Examiner: All-glass building first for Ireland at €40m (1 GCS)](https://www.irishexaminer.com/business/arid-20032624.html)
- [RKD: 4-5 Grand Canal Square](https://rkd.ie/work/4-5-grand-canal-square/)
- [Irish Times: Inside Facebook's Dublin HQ](https://www.irishtimes.com/business/commercial-property/inside-facebook-dublin-hq-an-amazing-mix-of-design-and-cultures-1.2824019) (found by search)
- [Misery Hill, Wikipedia](https://en.wikipedia.org/wiki/Misery_Hill)
- Wikimedia Commons images as listed in §2
