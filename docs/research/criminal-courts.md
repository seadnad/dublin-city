# Criminal Courts of Justice (`ccj`): research and build notes

Scope: the Criminal Courts of Justice (CCJ) on the corner of Parkgate Street and Infirmary Road, at the Parkgate end of the Phoenix Park. Also its plot, the park wall and gate beside it, and the Parkgate Street terrace opposite.

- Raw OSM: `data/osm/criminal-courts.json`. Overpass `out geom`, bbox **S 53.3472, W -6.2990, N 53.3500, E -6.2915**. The pull covers buildings and building:parts, highways, barriers, landuse and leisure, amenity and tourism nodes, trees, railways and water: 479 elements. The main Overpass server was busy, so this came from the kumi.systems mirror (snapshot `timestamp_osm_base` 2026-07-24T11:04:51Z). The request used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`.
- References: `refs/criminal-courts/` holds 10 images from Wikimedia Commons (credits in §2 and `sources.json`). `refs/heuston/12-sean-heuston-bridge-elevation.jpg` also shows the drum from across the river.
- Game coordinates below come from `project()` in `src/world/geo.js`. The CCJ is at lon -6.2950 to -6.2964, which is **east of `PARK_X` (-6.2985)**. So it gets no east-west squeeze: plain half scale after the Dame Street band shift.

---

## 1. Map data

### 1.1 Footprint (VERIFIED, OSM way 46671353)

`amenity=courthouse`, `building=yes`, `layer=2`, "Criminal Courts of Justice", `addr:street=Parkgate Street`, D08 K6YH, `wikidata=Q5185535`.

- A least-squares circle fitted to the smooth south-west arc (vertices 53-63 and 0-5) gives **centre 53.348694, -6.295695 and radius 41.4 m**. That makes the south half a clean circle about 83 m across.
- **The north half is tighter, at about 37-38 m.** The build fits the whole plan as R(bearing) = 39.45 - 1.95 cos(bearing).
- Protrusions (bearings are clockwise from north, radius from the centre):

| Bearing | r (m) | What it is |
|---|---|---|
| 127-140° | 51-54 | The entrance: steps, canopy and landing facing the Parkgate St / Infirmary Rd junction (building:part `1503616267`, canopy roof `757833284`) |
| 93-113° | 45 | The curved limestone screen wall along Infirmary Road |
| ~9° | 48 | A narrow spike on the north side, read as a stair tower |
| 277-295° (NW) | 45-48 | A low service block (custody / vehicle entrance) |

- Extent: lat 53.34832-53.34912, lon -6.29641 to -6.29503.
- **Position relative to the roads.** Real Parkgate Street ends at the Infirmary Road junction (53.34813, -6.29500); west of that it is **Conyngham Road**.
  - The drum's south face stands about 12 m north of the Conyngham Road centreline. The road there is 4 lanes.
  - The east face is right on the Infirmary Road footpath.
  - The Chesterfield Avenue slip (`1067394353`) runs north-west from Conyngham Road at -6.29615 to the **Parkgate** (53.34859, -6.29739). The park wall (`331870100`, calp) runs north from the gate along the plot's west side. There is a stone wall (`1503616265`, 2 m) along the Infirmary Road side.
- The grounds are 0.95 ha (Wikipedia).

### 1.2 How the game differs

| Item | Real | Game | Handling |
|---|---|---|---|
| Infirmary Road junction | 53.34813, -6.29500 | PG1 at 53.34812, **-6.2942** (≈27 game m east) | Left as is (open question 1). It leaves a paved forecourt with plane trees between the drum and the road. |
| Phoenix Park green | Real park edge is the wall west of the plot | `greens` outline ran down Infirmary Rd to Parkgate St, **covering the plot** | Outline edited (`src/data/streets.json`): a pocket cut round the plot from 53.3494 N back to the Parkgate, crossing the avenue at the gate. `dupcheck` ok; written with `streets-fmt`. The park wall now runs along the plot's west side as in ref 11. |
| Conyngham Road width | 4 lanes | 13 m + footpaths | The drum is moved 6 m north so its south terrace wall clears the footpath (`CCJ` in `sites.js`). |

Game position: centre ≈ (-1340, -131), plan radius ≈ 23-24 game m.

### 1.3 Neighbours worth dressing (from OSM)

- **Parkgate Street, north side (the terrace in ref 06):**
  - **W. Ryan / Ryan's of Parkgate Street** (no. 28, pub, heritage 4, way `870583665`), a Victorian pub with a famous interior.
  - **Nancy Hands** (30-32, pub, `870583668`).
  - **P. Duggan's** (pub node 6969068085).
  - FX Buckley's (restaurant), Provender & Family (cafe), Berry Lane Cafe, and the Parkgate Street post office (53.34821, -6.29460).
  - The **Phoenix Park Hotel** (Infirmary Road, heritage 4, `662507864`).
  - Most are 2-3 storey houses (OSM levels 2-3).
- **The Ashling Hotel** is on Parkgate Street near Seán Heuston Bridge, but **it is not tagged in this OSM pull**; its exact footprint is unverified. It is likely among the buildings at 53.3478-53.3480, -6.2922 to -6.2926 by the bridge.
- **Between Parkgate Street and the river:**
  - Ionad Seán Heuston (`49982512`).
  - Parkgate Business Centre (`531836797`, levels 2).
  - Low commercial units (levels 1-2, `581922592/3`, `402753900`).
  - The Dublin Bus Conyngham Road garage (`240261231`).
- Dublin Canvas painted signal boxes ("Park Life", "Flora in the Phoenix Park"), the Phoenix Park Bike Hire (53.34844, -6.29751), and a taxi rank at 53.34823, -6.29587 in front of the courts.

### 1.4 What was done to the neighbours

The filler (`src/world/buildings.js`) now keeps Parkgate Street low within about 240 m of the courts, north of the river:

- 3 storeys (sometimes 4) on the main road;
- 2 storeys between Parkgate Street / Conyngham Road and the Liffey;
- 2-3 storeys behind.

Before this the filler put 4-6 storey blocks here, which hid the drum from Heuston. The variation uses a position hash, not `rand()`, so buildings elsewhere don't reshuffle. The individual pubs are not modelled (see §5).

---

## 2. Reference images (`refs/criminal-courts/`)

All are from Wikimedia Commons (geograph mirrors included). None come from Google.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-cc0-2010-from-conyngham.jpg | [CriminalCourtofJusticeDublin.jpg](https://commons.wikimedia.org/wiki/File:CriminalCourtofJusticeDublin.jpg) | DubhEire | CC0 | 2010-01-04 | **Key view**: the SE corner from the junction. Glass tiers, bronze slot, lobby and canopy, steps, screen wall |
| 02-entrance-2014.jpg | [Criminal Courts of Justice.jpg](https://commons.wikimedia.org/wiki/File:Criminal_Courts_of_Justice.jpg) | Stephenjudge | CC BY-SA 3.0 | 2014-10-22 | Canopy, columns, bronze fascia, louvred slot |
| 03-entrance-2014-b.jpg | [Criminal Courts of Justice 2.jpg](https://commons.wikimedia.org/wiki/File:Criminal_Courts_of_Justice_2.jpg) | Stephenjudge | CC BY-SA 3.0 | 2014-10-22 | The Justice figure, harp and lettering |
| 04-2019-metrocentric.jpg | [Criminal Courts of Justice, Dublin in 2019](https://commons.wikimedia.org/wiki/File:Criminal_Courts_of_Justice,_Dublin_in_2019.jpg) | Metro Centric | CC BY 2.0 | 2019-06-10 | Screen wall detail, slanted stair glazing |
| 05-2019-metrocentric-b.jpg | [Criminal Courts of Justice, Dublin 2019](https://commons.wikimedia.org/wiki/File:Criminal_Courts_of_Justice,_Dublin_2019.jpg) | Metro Centric | CC BY 2.0 | 2019-06-10 | The drum in sun: tier frames, top storey, slot, lobby |
| 06-2021-sheila1988.jpg | [Central Criminal Court, Dublin.jpg](https://commons.wikimedia.org/wiki/File:Central_Criminal_Court,_Dublin.jpg) | Sheila1988 | CC BY-SA 4.0 | 2021-10-22 | **Driver's eye** westbound on Parkgate St: the drum over the 3-storey terrace (Ryan's) |
| 07-steps-geograph-5948354.jpg | [Steps of The Criminal Courts of Justice, geograph 5948354](https://commons.wikimedia.org/wiki/File:Steps_of_The_Criminal_Courts_of_Justice_-_Dublin_-_geograph.org.uk_-_5948354.jpg) | Anthony Parkes | CC BY-SA 2.0 | 2018-10-18 | Granite steps, limestone coursing, calp plinth |
| 09-chadwick-6023861.jpg | [The Criminal Courts of Justice, geograph 6023861](https://commons.wikimedia.org/wiki/File:The_Criminal_Courts_of_Justice_-_geograph.org.uk_-_6023861.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-04 | Screen wall, the slanted glass stair enclosures, steps |
| 10-construction-2008-murphy.jpg | [DUBLIN - On The Last Day Of 2008 (3153160069)](https://commons.wikimedia.org/wiki/File:DUBLIN_-_On_The_Last_Day_Of_2008_(3153160069).jpg) | William Murphy | CC BY-SA 2.0 | 2008-12-30 | Parkgate St during construction (street context) |
| 11-construction-2008-murphy-b.jpg | [DUBLIN (Phoenix Park) - On The Last Day Of 2008 (3153180967)](https://commons.wikimedia.org/wiki/File:DUBLIN_(Phoenix_Park)_-_On_The_Last_Day_Of_2008_(3153180967).jpg) | William Murphy | CC BY-SA 2.0 | 2008-12-30 | From the People's Garden: the calp park wall between the park and the plot |

Not downloaded:

- `The Criminal Courts of Justice - geograph 6000366` (N Chadwick): the thumbnail request was refused (HTTP 400/429). Numbering skips 08.
- Four more William Murphy construction shots from 2008.

---

## 3. Landmark profile

### 3.1 Facts

- **Architect:** Henry J Lyons (lead Peter McGovern). **Services:** J.V. Tierney.
- **Dates and cost:** started 2007, **opened January 2010**, cost €140 m (Wikipedia).
- **Contents:** 22 courtrooms (Archiseek), over 600 rooms, 27 lifts, cells for 100 prisoners in the basement.
- **Size:** 11 floors, 25,000 m².
- **Height and diameter.** Wikipedia gives **height 32 m** and **"diameter 40 m"**. The OSM footprint is ~83 m across, so the 40 m figure can't be the building; it probably refers to the atrium, or it is wrong.
- Design intent (Archiseek): *"The circular form gives equal weight to both city and park creating a more definitive threshold to both."* It has a *"saw toothed glass facade [expressing] the double height courtrooms within. A perforated metal screen controls glare and maintains privacy"*. Inside, an eight-storey circular atrium has balconies to the courtroom corridors.

### 3.2 Form (from refs 01, 05, 06, 09, scaled by the 9 m entrance columns)

| Part | Height (real) | Notes |
|---|---|---|
| Ground storey | 0-5 m | Recessed dark glazing under the first tier; the lobby is double height (≈1.2-8.8 m) |
| Glazed tiers | 5-26 m | 4 tiers of ≈5.25 m (two storeys each). Each **leans out at its foot** with a white frame/soffit line, and the panes step in plan: the "saw-tooth". Panes ≈3.5 m wide |
| Top storey | 26-30.4 m | Set back ≈1.8 m, clearer blue-grey glazing, a thin white roof edge at ≈31 m |
| Atrium roof | ≈33 m | A glass roof over the central well (not seen from the street) |
| Bronze slots | full height | Vertical bronze-clad frames (two piers) around recessed louvred glazing where the cores meet the facade. One is at the entrance; others are round the drum (ref 06 shows one from the east) |
| Entrance | | Two round limestone-clad columns (~9 m); a bronze fascia band over the lobby; a cantilevered glass canopy at ≈5.3 m; a wide fan of granite steps (about 6-7 risers, ≈1.2 m rise) |
| Screen wall | ≈9 m | A curved limestone wall on a calp rubble plinth, forward of the drum along Infirmary Road. It carries the bronze **Justice** (blindfolded head and scales, ~4 m), the harp, and "Na Cúirteanna Breithiúnais Coiriúla / The Criminal Courts of Justice" |
| Stair glazing | | Slanted glass enclosures rising from behind the screen wall to the drum (refs 04, 09) |
| Flags | ≈12 m | Three flagpoles west of the entrance: tricolour, EU, tricolour (ref 01) |

The top of the drum at ≈26-31 m agrees with Wikipedia's 32 m.

### 3.3 Colours (hex estimates, refs 01, 05, 07)

| Surface | Hex |
|---|---|
| Tier glass, overcast | `#7e8e8a` (sky-lit head `#b0c2c0`, foot `#62726e`) |
| Tier frames / soffits | `#e3e6e6` |
| Top-storey glass | `#5f7a8c` |
| Bronze cladding | `#6f5a48` (shade `#4f3f32`) |
| Limestone | `#d6d0c3`, joints `#bdb6a8` |
| Calp rubble | `#5d5f5c` in pale mortar |
| Granite steps | `#7c7e80` |
| Justice bronze | `#8a8f86` / `#6b5140` |

### 3.4 Recognisable cues

1. **A glass drum closing the view west down Parkgate Street** over a low Victorian terrace (ref 06).
2. **Saw-toothed tiers**: each band of glass leans out with a white line under it (refs 01, 05).
3. **Bronze-framed louvred slots** cutting the drum (refs 01, 02, 05).
4. **The entrance**: columns, glass canopy, a fan of steps, flags (refs 01, 02).
5. **The curved limestone wall** with the Justice figure and the bilingual lettering (refs 03, 07, 09).
6. **At the Parkgate**, with the park's calp wall and the gate piers beside it (ref 11).

---

## 4. Build (done)

- **Model:** `tools/blender/build_ccj.py` → `public/models/ccj.glb` (37 KB, Draco), `models/ccj.blend`.
  - **3,338 triangles** in 3 meshes: glass 500, atlas 2,814, decal 24. That is under the 6-10k budget, because the look comes mostly from the texture and the saw-tooth.
  - Built at real size, plan scale 0.58, height 0.85: radius ≈23-24 game m, drum top ≈22 m, roof edge ≈26 m.
  - Origin at the drum centre; true north, no rotation.
- **Materials:** `src/world/ccj.js`. Textures are painted at load, so there are **3 draw calls** (plus shadows):
  - `ccj_glass`: an 8 × 4 pane texture, 32 distinct panes, reflective. Its night twin gives an even warm glow through the screens.
  - `ccj_atlas`: a 1024 atlas for bronze, louvres, lobby, ground and top glazing, limestone, calp, stair tower, roof, skylight, steps and canopy. Its night twin lights the lobby, the stair landings in the slots, the top storey, the atrium roof and a wash on the screen wall.
  - `ccj_decal`: alpha-tested: the Justice figure, lettering, harp and flags.
  - Low / Battery saver paints the canvases at 512 instead of 1024. That is the only looks-for-speed trade.
- **Placement:** `sites.js` exports `CCJ` (the OSM circle centre, moved north to clear Conyngham Road), `ccjOutline()`, and `sites.ccj` (Places entry, view from Parkgate Street westbound: `spot('WT3','PG1',0.35)`).
  - Reserved for the filler: the site box plus `ccjForecourt` (towards Infirmary Rd), `ccjWest` and `ccjNorth` (grounds out to the park wall).
  - Collision is the outline polygon, including the steps, screen wall, stair tower and wing, plus 5 plane trees.
- **Night:** `landmarks.setNight` passes the level to `ccjHero.setNight`.
- **HUD:** the Places blurb, and the map glyph 'J'.
- **Park:** the green outline pocket (§1.2).
- **Filler:** low Parkgate Street (§1.4).

### Verification

- `footprints.mjs`: 0 hits.
- `bridges.mjs`: `bad: {}`.
- `dupcheck`: ok.
- No console errors, desktop and `--mobile`.
- Frame cost (`areaperf.mjs`, low tier, headless, with vs without the model): +8 draw calls, +≈30k triangles counting the shadow pass and trees, GPU +≈1 ms at the Parkgate Street spot (18.6 → 20 ms median; noisy).
- Comparison sheet: `docs/research/criminal-courts-compare.png`.
  - Rows: SE corner; Parkgate St westbound; from the park; screen wall; from the Heuston side; night.
  - Left is the reference, right is the game.

---

## 5. Open questions / not done

1. **Infirmary Road is ≈27 game m east of reality** (PG1/IR1). Moving it would put the road against the screen wall as it really is, and bring the pubs and hotel onto the right side. But it moves the Parkgate Street / Conyngham Road split and the filler, so it was left alone.
2. **The view from Seán Heuston Bridge.** At half-scale plan with near-real heights, even 2-storey river-side buildings hide most of the drum from the bridge's south end. Only the top storey shows (night shot). The real view (Heuston ref 12) is also partly screened by Ionad Seán Heuston.
3. **The cream block** seen rising behind the drum to the north/north-east in refs 06 and Heuston 12 is not identified in OSM. It is not modelled.
4. **Night look** is from judgement: there were no licensed night photos. The drum glows warm and even, the lobby and atrium roof are bright, and the screen wall is washed.
5. **The Ashling Hotel** and Ryan's, Nancy Hands and the other pubs are only the generic 3-storey filler. Ryan's (heritage pub front) would be a good next dressing.
6. **The Justice figure** is a stylised painted cut-out and reads only up close. The lettering is legible only very near.
7. **The atrium diameter** and the number and position of the bronze slots round the back (N, SW, NW here) are estimated.

## Sources

- OSM via Overpass (ODbL): `data/osm/criminal-courts.json`
- [Criminal Courts of Justice, Wikipedia](https://en.wikipedia.org/wiki/Criminal_Courts_of_Justice)
- [Archiseek: 2010 Criminal Courts of Justice, Dublin](https://www.archiseek.com/2010-criminal-courts-of-justice-dublin/)
- [Henry J Lyons: The Criminal Courts of Justice](https://henryjlyons.com/projects/the-criminal-court-of-justice) (not fetched)
- Wikimedia Commons images as listed in §2
