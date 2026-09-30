# Kilmainham (`kilmainham`): Kilmainham Gaol and the Royal Hospital

Scope: Kilmainham Gaol and the Kilmainham Courthouse on Inchicore Road; the Royal Hospital Kilmainham (IMMA) with its
quadrangle, north tower and spire, formal gardens, avenues and the Richmond Tower gateway; the streets that reach them
(St John's Road West west of Military Road, Military Road, Irwin Street, Bow Lane West, Kilmainham Lane, the South
Circular Road from Islandbridge to Brookfield Road, Inchicore Road, Memorial Road, Con Colbert Road, Old Kilmainham and
Brookfield Road).

- Raw OSM: `data/osm/kilmainham.json`. Overpass `out geom`; highways, railways and waterways in bbox **S 53.3355,
  W -6.3200, N 53.3480, E -6.2880**; buildings, walls, landuse, leisure, historic, tourism and trees in **S 53.3375,
  W -6.3140, N 53.3465, E -6.2960**. Snapshot `timestamp_osm_base` 2026-09-29T23:08:21Z, 5,203 elements. ODbL.
- References: `refs/kilmainham/` holds 24 images from Wikimedia Commons (credits in section 2 and `sources.json`),
  fetched with `node tools/refs-kilmainham.mjs` (generic User-Agent only).
- Text sources: English Wikipedia (Royal Hospital Kilmainham, Kilmainham Gaol, Richmond Tower (Kilmainham)), the OSM
  tags, the photos. No personal data was sent with any request.
- Game coordinates below come from `project()` in `src/world/geo.js`. **Everything west of lon -6.2985 is squeezed
  east-west to 0.7 of the rest of the map (0.35 of real)**, and the band lat 53.3442-53.3462 is stretched north-south
  1.4x. Roads keep their real widths. So at Kilmainham an east-west real distance shrinks to about a third while the
  roads do not: that drives every compromise below.

---

## 1. Map data

### 1.1 What exists in the game (before this work)

South of the Liffey and west of Heuston the game had only St John's Road West (VQ2-SJ1-SJ2-SJ3, ending in a dead end
at SJ3, lon -6.297), Steevens Lane and James's Street (to JS3), and the South Circular Road stub north of the river
(PX05-PXS1) with Sarah Bridge (PXS1-PXS2) ending at the south bank. Everything else was interior backfill (4-6 storey
filler blocks on an 11 m grid), including the rail yards and the Royal Hospital's grounds.

### 1.2 The landmarks in OSM

| Feature | OSM | Real centre / extent | Game (x, z) |
|---|---|---|---|
| Kilmainham Gaol, the walled enclosure | way 41662413 (`historic=jail`, `barrier=wall`) | 53.34134-53.34209, -6.31034 to -6.30881; ~102 x 76 m | -1708..-1673, 288..328 |
| the gaol buildings | relation 279494 (74 x 36 m, an inner court 16 x 12 m); the front range way 391782030 (76 x 26 m) | | |
| Kilmainham Courthouse (1820, disused) | way 45405931 | 53.34165-53.34188, -6.30875 to -6.30825; 33 x 25 m | -1671..-1660, 300..313 |
| Royal Hospital Kilmainham (IMMA) | relation 21749: outer 89 x 94 m, courtyard 62 x 63 m, turned 11 degrees anticlockwise | centre 53.34294, -6.30005 | -1469, 241 |
| the grounds | way 41685963 (`leisure=park`) | 53.34173-53.34520, -6.30776 to -6.29734 | |
| the Formal Gardens | way 37044148 | 53.34342-53.34505, -6.30179 to -6.29918 (north of the building) | -1509..-1449, 104..214 |
| the west avenue (to the Richmond Tower) | way 60009535 (service, 462 m, asphalt) | 53.34283, -6.30077 to 53.34206, -6.30759 | |
| the east drive (from Military Road) | ways 128191913, 191892922, 31000192 (north drive round the building) | gate 53.34333, -6.29742 | |
| Richmond Tower | way 149068488 (`man_made=tower`), 8 x 17 m | 53.34199-53.34214, -6.30770 to -6.30757 | -1647..-1644, 286..294 (inside the SCR carriageway) |
| Bully's Acre | way 57404513 (`amenity=grave_yard`) | north of the avenue's west end | |
| Private Soldiers' Burial Ground | way 57406687 | north of Bully's Acre | |
| Garden House | way 191891063, 18 x 19 m | 53.34501, -6.30071 (north end of the gardens) | |
| Heuston South Quarter | Hibernia (6 storeys), Brunel (8), Telford buildings | 53.3434-53.3455, -6.2975 to -6.2990, between the gardens and Military Road | |
| Proclamation sculpture (Rowan Gillespie, 2008) | node 5879253487 | 53.34225, -6.30951, on a paved plaza across Inchicore Road from the gaol | |

- **The gaol front faces north onto Inchicore Road** (the road runs WNW, about 6 degrees north of west going west; 9
  degrees in game coordinates). The entrance front sits in a notch of the perimeter wall between lon -6.3097 and
  -6.3094.
- **The Royal Hospital's main front is the north range**, on the gardens, with the tower and spire over its centre.
  The avenue from the Richmond Tower arrives at the **west** front; the drive from Military Road at the **east**
  front; a service drive runs round the north side between the building and the gardens.
- The Richmond Tower stands **on the SCR's east footpath** facing Inchicore Road (the avenue's west end is the fourth
  arm of the Inchicore Road / SCR junction). In game coordinates its OSM footprint is inside the uncompressed SCR
  carriageway, so it has to move ~8 m east.
- The Heuston main line runs west north of St John's Road West (the yards fill the land between the road and the
  river) and passes **under** the Kilmainham junction in a short tunnel (way 43375147, layer -1), then west along the
  south side of Con Colbert Road. The Phoenix Park tunnel branch (GSWR North Wall branch) leaves it and crosses the
  Liffey at -6.304. None of the new roads cross a railway at grade.

### 1.3 Streets (traced from OSM; KH* nodes)

| Street | OSM ways (examples) | Reality | Game way |
|---|---|---|---|
| St John's Road West | 33925612, 746105768, 22978622, 1067431420 | dual carriageway, 2-3 lanes each way, 60 km/h, from Military Road SW to the Kilmainham junction | SJ3-KHS1..KHS5-KHJ, primary 14 m; KHM0 inserted between SJ2 and SJ3 for Military Road |
| Military Road | 33925610 (tertiary, 2 lanes, 30 km/h) | from St John's Road West south past Heuston South Quarter to the Royal Hospital's east gate at Irwin Street | KHM0-KHM4, secondary 8 m |
| Irwin Street | 33925611 | the gate south to Bow Lane West | KHM4-KHI1-KHB5, lane 7 m |
| Bow Lane West | 303325200 (tertiary) | James's Street (at Steevens Lane) west to Irwin Street | JS3-KHB1..KHB4-KHB5, secondary 7.5 m |
| Kilmainham Lane | 129774678 (tertiary) | Bow Lane West along the Royal Hospital's south wall to the SCR, 25 m south of the Inchicore Road junction | KHB5-KHL1..KHL6-KHK2, secondary 7 m |
| South Circular Road | 1219010948 ... 4934662, 143226428 | Islandbridge (Sarah Bridge) south past the Kilmainham junction, the Richmond Tower and the gaol, then east towards Dolphin's Barn and Rialto | PXS2-KHN1..KHN3-KHJ-KHK1-KHK2-KHK3-KHU1..KHU3-KHBR, secondary 11 m |
| Inchicore Road | 28391757, 750312892 ... | Kilmainham junction WNW past the gaol to Memorial Road | KHK1-KHG1..KHG6, secondary 10 m (nudged ~5 m north past the gaol, see 5.4) |
| Memorial Road | 781151847, 4402019 | Inchicore Road north to Con Colbert Road (a one-way pair in reality) | KHG6-KHR1-KHR2, secondary 8 m |
| Con Colbert Road | 22978649, 3819413 | dual carriageway along the War Memorial Gardens back to the Kilmainham junction | KHR2-KHC1-KHC2-KHJ, primary 13 m |
| Old Kilmainham | 4571527, 1125052328 | SCR east to Brookfield Road (continues as Mount Brown to James's Street) | KHK3-KHO1..KHO3, secondary 8 m |
| Brookfield Road | 26150087 ... | Old Kilmainham south to the SCR | KHO3-KHF1..KHF3-KHBR, lane 7 m |
| Royal Hospital drives | 128191913, 31000192, 60009535 | Military Road gate to the east front; round the north side; the lime avenue west to the Richmond Tower | KHM4-KHA3..KHA9-KHK1, lane 5.5 m, pedestrian access (no AI traffic), gas lamps |

Loops, no dead ends: SJRW-Military Rd-Irwin St-Bow Lane-Steevens Lane; Kilmainham Lane-SCR-SJRW-Military Rd;
Inchicore Rd-Memorial Rd-Con Colbert Rd-SCR; SCR-Old Kilmainham-Brookfield Rd; the Royal Hospital drives from Military
Road to the SCR. Left out on purpose: Emmet Road (would dead-end at Inchicore), Mount Brown and James's Street west of
Steevens Lane (the Luas agent's corridor: the Red Line runs James's St to James's, Fatima and Rialto), and the SCR east
of Brookfield Road to Rialto (it would dead-end until the Luas work reaches Rialto).

---

## 2. Reference images (`refs/kilmainham/`)

All from Wikimedia Commons (1000 px thumbnails). Credit these if any are shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-gaol-front-entrance.jpg | [Dublin-Kilmainham-Main-Entrance-1.jpg](https://commons.wikimedia.org/wiki/File:Dublin-Kilmainham-Main-Entrance-1.jpg) | Nol Aders | CC BY-SA 3.0 | 2009-07-04 | **Key elevation**: the front from across Inchicore Road: the recessed three-bay centre, both flanking blocks, the walls, railings |
| 03-gaol-entrance-door.jpg | [Entrance to Kilmainham.jpg](https://commons.wikimedia.org/wiki/File:Entrance_to_Kilmainham.jpg) | Stokeeees at English Wikipedia | CC BY-SA 3.0 | 2008-03-25 | **The door**: vermiculated surround, the serpents in the tympanum, the lantern, the barred arched windows and balconettes over it |
| 04-gaol-facade-through-trees.jpg | [Facade of Kilmainham Gaol through Trees (42609849305)](https://commons.wikimedia.org/wiki/File:Facade_of_Kilmainham_Gaol_through_Trees_-_Kilmainham_-_Dublin_-_Ireland_(42609849305).jpg) | Adam Jones | CC BY-SA 2.0 | 2018 | The east wing's rounded end: coursed limestone, segmental cell windows, conical slate roof, glazed lantern, brick stacks |
| 07-gaol-east-wing-and-wall.jpg | [Dublin-Kilmainham-Jail-2.jpg](https://commons.wikimedia.org/wiki/File:Dublin-Kilmainham-Jail-2.jpg) | Nol Aders | CC BY-SA 3.0 | 2009-07-04 | The perimeter wall (calp rubble, ~7.5 m) with the east wing's roof and cell windows over it |
| 08-gaol-from-south.jpg | [Dublin-Kilmainham-Jail-3.jpg](https://commons.wikimedia.org/wiki/File:Dublin-Kilmainham-Jail-3.jpg) | Nol Aders | CC BY-SA 3.0 | 2009-07-04 | From the south: the west wing's gable with its oculus, chimneys, the east wing's long slate roof |
| 09-kilmainham-courthouse.jpg | [Dublin-Kilmainham-Courthouse.jpg](https://commons.wikimedia.org/wiki/File:Dublin-Kilmainham-Courthouse.jpg) | Nol Aders | CC BY-SA 3.0 | 2009-07-04 | The courthouse front, the wall, and the gaol's east block with its blind arch and corbelled parapet |
| 10-gaol-inchicore-road.jpg | [Kilmainham Gaol 20190913124840](https://commons.wikimedia.org/wiki/File:Kilmainham_-_Kilmainham_Gaol_-_20190913124840.jpg) | Regier | CC BY-SA 4.0 | 2019-09-13 | **The courthouse** (now the gaol's visitor entrance): pediment with the royal arms, three round-headed windows over a rusticated ground floor |
| 12-gaol-stonebreakers-yard.jpg | [Courtyard behind Kilmainham Gaol.jpg](https://commons.wikimedia.org/wiki/File:Courtyard_behind_Kilmainham_Gaol.jpg) | Ticketautomat | CC BY-SA 3.0 | 2009-07 | The Stonebreakers' Yard, where the 1916 leaders were shot |
| 14-gaol-east-wing-interior.jpg | [County Dublin - Kilmainham Gaol - 20221129160314](https://commons.wikimedia.org/wiki/File:County_Dublin_-_Kilmainham_Gaol_-_20221129160314.jpg) | Olliebailie | CC BY-SA 4.0 | 2022-11-29 | (Despite the file name) the Stonebreakers' Yard: rubble walls ~8 m, the cross, the tricolour, the doorway |
| 15-gaol-proclamation-and-entrance.jpg | [Dublin-Proclamation-Kilmainham.jpg](https://commons.wikimedia.org/wiki/File:Dublin-Proclamation-Kilmainham.jpg) | Nol Aders | CC BY-SA 3.0 | 2009-07-04 | **The whole front** from the Proclamation plaza: both blocks curve into the recess, the walls run on either side |
| 20-rhk-north-side.jpg | [Royal-hospital-kilmainham-01.JPG](https://commons.wikimedia.org/wiki/File:Royal-hospital-kilmainham-01.JPG) | Deitel55 | CC BY-SA 3.0 | 2012-02-06 | **The north front centre**: steps up from the garden, the pedimented centre (four Corinthian pilasters, arms, doorcase), the tower |
| 21-rhk-tower.jpg | [Royal Kilmainham Hospital's Tower 01.jpg](https://commons.wikimedia.org/wiki/File:Royal_Kilmainham_Hospital%27s_Tower_01.jpg) | David Kernan | CC BY 4.0 | 2021-10-25 | The tower: calp shaft, clock stage, spire, sundial |
| 23-rhk-murphy.jpg | [RHKilmainhan.jpg](https://commons.wikimedia.org/wiki/File:RHKilmainhan.jpg) | William Murphy | CC BY-SA 2.0 | 2018 | **The courtyard, north range** straight on: pediment, the hall and chapel windows, dormered roof, tower and spire, the arcades returning |
| 24-rhk-courtyard.jpg | [Courtyard of Irish Museum of Modern Art.jpg](https://commons.wikimedia.org/wiki/File:Courtyard_of_Irish_Museum_of_Modern_Art.jpg) | William Murphy | CC BY-SA 2.0 | 2011 | **The arcade**: the south range's 21 round arches on square piers, the central passage, the flagged cross in the cobbles |
| 25-rhk-panorama-7.jpg | [IMMA panoramio (7)](https://commons.wikimedia.org/wiki/File:Museum_Of_Modern_Art_At_Royal_Hospital_Kilmainham_-_Dublin_(Ireland)_-_panoramio_(7).jpg) | William Murphy | CC BY-SA 3.0 | 2014 | **The formal gardens**: gravel walks, box hedges, cone yews, standard hollies, the Garden House |
| 27-rhk-grounds-autumn.jpg | [Kilmainham Hospital Grounds.jpg](https://commons.wikimedia.org/wiki/File:Kilmainham_Hospital_Grounds.jpg) | Paddez | CC BY-SA 2.0 | 2021-10-25 | The meadow and the trees of the grounds |
| 29-rhk-geograph-5199265.jpg | [geograph 5199265](https://commons.wikimedia.org/wiki/File:Royal_Hospital_Kilmainham,_Irish_Museum_of_Modern_Art_-_geograph.org.uk_-_5199265.jpg) | David Dixon | CC BY-SA 2.0 | 2016-07-12 | **The lime avenue** to the west front: a tarmac drive between rows of clipped limes, black lamp standards |
| 30-rhk-imma-front.jpg | [Irish-Museum-Modern-Art-Dublin.jpg](https://commons.wikimedia.org/wiki/File:Irish-Museum-Modern-Art-Dublin.jpg) | acediscovery | CC BY 4.0 | 2021-08-21 | North range from the courtyard: the sundial in the pediment, the tower's clock stage and copper spire, roughcast walls, dressings |
| 31-rhk-garden-house.jpg | [Royal Hospital Park - Gartenhaus.jpg](https://commons.wikimedia.org/wiki/File:Dublin_-_Kilmainham_-_Royal_Hospital_Park_-_Gartenhaus.jpg) | Eweht | CC BY-SA 4.0 | 2010-07-14 | The Garden House (pavilion) at the north end of the gardens |
| 32-rhk-panorama.jpg | [IMMA panoramio](https://commons.wikimedia.org/wiki/File:Museum_Of_Modern_Art_At_Royal_Hospital_Kilmainham_-_Dublin_(Ireland)_-_panoramio.jpg) | William Murphy | CC BY-SA 3.0 | 2014 | **The east front** and the chapel's great east window (rose tracery) at the NE corner |
| 33-rhk-malton.jpg | [Royal Hospital Kilmainham by Malton.jpg](https://commons.wikimedia.org/wiki/File:Royal_Hospital_Kilmainham_by_Malton.jpg) | James Malton (engr. Cartwright), 1794 | Public domain | 1794 | The north front: pedimented centre, tower, the hall's tall round-headed windows |
| 40-richmond-tower-autumn.jpg | [Richmond Tower.jpg](https://commons.wikimedia.org/wiki/File:Richmond_Tower.jpg) | David Kernan | CC BY 4.0 | 2021 | The tower from the avenue side, looking west |
| 41-richmond-tower-inchicore-road.jpg | [Richmond Tower from Inchicore Road.jpg](https://commons.wikimedia.org/wiki/File:Richmond_Tower_from_Inchicore_Road.jpg) | William Murphy | CC BY-SA 2.0 | 2019 | **Key elevation**: the Gothic gate from Inchicore Road: the pointed arch, crenellations, the round turret (south), the flanking walls |
| 45-richmond-tower-from-road.jpg | [Richmond Tower from the road.jpg](https://commons.wikimedia.org/wiki/File:Richmond_Tower_from_the_road.jpg) | さえぼー | CC0 | 2023 | From the courthouse door |

---

## 3. Landmark profiles

### 3.1 Kilmainham Gaol (1796; east wing 1862)

- Built 1796 as the County of Dublin Gaol ("New Gaol"); decommissioned 1924; restored by volunteers from 1960; now a
  museum (OPW). The 1916 leaders were held here and shot in the Stonebreakers' Yard.
- **The front** (refs 01, 03, 15): grey limestone ashlar, heavy and plain. A **recessed three-bay centre** between two
  **flanking blocks** whose inner front corners are **convex quadrants** curving back into the recess. The centre:
  three round-arched recesses on the ground floor (the middle one is the door), three taller arched recesses above with
  barred round-headed windows and iron balconettes (the middle one is where the public hangings took place), a
  parapet. The **door**: a round-headed opening in a deeply **vermiculated** (worm-eaten) surround, and in its
  tympanum the carved relief of **serpents chained together** (the "five devils of crime"), a lantern hanging in front.
  Iron railings enclose the small forecourt in the recess. Each flanking block: a barred window high up, a blind
  opening low down, a plain parapet; the east block shows a big blind arch and a corbelled parapet to the east (ref 09).
- **Heights (estimated from the photos against the 3.4 m door and 1.45 m cars, +-1 m)**: front to the parapet
  13.5-14 m; the perimeter wall 7-7.5 m, the Stonebreakers' Yard walls ~8 m; the west wing's eaves ~12 m, ridge
  ~16.5 m; the east wing's wall head ~13 m, the top of its roof lantern ~21 m.
- **The Victorian east wing** (1862, John McCurdy; refs 04, 07): a long hall of three tiers of cells round an open
  gallery under a glazed roof; its east end is **rounded** (OSM: a semicircle of radius ~12 m), so from outside it is a
  D-shaped block of coursed limestone with a row of small segmental cell windows under the eaves, a hipped / conical
  slate roof and a glazed lantern along the ridge, and yellow-brick chimney stacks.
- **The west wing** (the 1796 block, ref 08): three storeys of rubble round a small courtyard, gables with oculi,
  chimneys.
- **The Stonebreakers' Yard** (refs 12, 14): a narrow walled yard of calp rubble, ~8 m walls, a gravel floor, a
  wooden door, a black cross. Position within the enclosure: the south-east corner behind the east wing (**inferred**;
  OSM does not map it).
- **Kilmainham Courthouse** (1820; ref 10): two storeys, limestone ashlar, a pedimented three-bay centre with three
  tall round-headed windows over a channelled ground floor, the royal arms on the pediment, lower wings. It now houses
  the gaol's visitor entrance.

### 3.2 Royal Hospital Kilmainham (1680-84; tower and spire 1701)

- By Sir William Robinson, Surveyor General, for the Duke of Ormond; modelled on Les Invalides; a home for old
  soldiers until 1927; restored 1984 and opened as the Irish Museum of Modern Art in 1991. The first large classical
  building in Ireland.
- **The quadrangle**: four two-storey ranges round a courtyard of cobbles with a flagged cross (ref 24). The east, west
  and south ranges have an **arcaded ground floor** on the courtyard side (round arches on square piers, a central
  arched passage through the middle of each range), sash windows above, a heavy eaves cornice, and a **steep slate roof
  with a row of dormers** and tall rendered chimneys with terracotta pots. Walls are grey-buff **roughcast render** with
  limestone dressings (quoins, window surrounds, the arcade).
- **The north range** holds the Great Hall (west) and the Chapel (east) either side of a **pedimented centre** (four
  Corinthian pilasters on the garden side, a sundial in the courtyard pediment). Both are lit by **tall round-headed
  windows** on both faces (refs 20, 23, 33); the chapel's great east window has rose tracery (ref 32).
- **The tower and spire** over the centre of the north range: a square calp shaft with limestone quoins, a louvred
  round-headed belfry opening, a cornice with four urns, a copper-clad **clock stage** with a clock on each face, a
  second small cornice and a slender octagonal **copper spire** with a weathervane (refs 20, 21, 23, 30).
- **Heights (estimated; no survey found)**: eaves ~10.5 m, ridge ~16 m, north pediment apex ~15.5 m, tower shaft
  ~25 m, clock stage to ~30 m, spire tip ~38 m, vane ~39.5 m (+-4 m; from refs 20 and 23 scaled by the 62 m courtyard).
- **Formal gardens** (restored 1980s; ref 25): a sunken parterre north of the building on its axis: gravel walks, box
  hedging round lawns, cone yews and standard hollies, a statue roundel, and the **Garden House** at the north end.
- **The avenues**: the tree-lined avenue (clipped limes, black lamp standards, ref 29) runs ~450 m from the west front
  to the **Richmond Tower**; a shorter drive runs from the east gate on Military Road.
- Around: meadow and specimen trees; Bully's Acre (one of Dublin's oldest graveyards) by the Richmond Tower; the
  calp boundary wall along the SCR and Kilmainham Lane.

### 3.3 Richmond Tower (Francis Johnston, 1812; moved here 1846-47)

- Built at Barrack Bridge (Watling Street) as the Royal Hospital's gate; taken down after Kingsbridge station caused
  congestion and rebuilt at the west end of the avenue at the railway company's expense. **Calp limestone**, Gothic:
  a **pointed carriage arch** in a square gate block with a crenellated parapet over a band of little blind arches,
  a small window and the Royal Hospital's arms over the arch, and a **round crenellated turret** at the south corner,
  taller than the block (ref 41). Rubble walls with iron gates either side.
- **Heights (estimated)**: gate block to the top of the battlements ~12.5 m, turret ~16.5 m, arch ~4.5 m wide and
  ~7 m high.

### 3.4 Palette (sRGB)

- Gaol front and courthouse ashlar: `#9c9a94` (grey limestone), joints `#6e6c67`; rubble walls `#77736c` with stones
  `#5d5a55`-`#8a857d`; slate `#4f5357`; brick stacks `#b2926a`.
- Royal Hospital render: `#a39c8f` (grey-buff roughcast), dressings `#b8b1a3`, slate `#5a5e63`, chimney pots `#a8573a`,
  copper `#5f9e8b`, calp tower `#6e6b66`, window frames `#ece9e2`.
- Richmond Tower: calp `#8a867e`, rust stains.

---

## 4. Cues (what makes each read in a glance)

1. Gaol: the grim grey block front with its **dark recess, three arches over three arches**, the **two curved
   corners**, the **long blank walls** either side; after dark, the lantern over the door.
2. The Royal Hospital: a **long low building under a huge dormered roof** with a **slender copper spire** rising
   from the middle of the north range; from the courtyard, the **arcades** all round.
3. The **clipped lime avenue** with black lamps, closed at the far end by the Gothic **Richmond Tower** gate, and the
   formal gardens' **cone yews** in rows.

## 5. Build brief

### 5.1 Heroes (one Blender build: `tools/blender/build_kilmainham.py` -> `public/models/kilmainham.glb`)

Nodes: `gaol`, `courthouse`, `rhk`, `richmond`, `gardenhouse`. Built in real metres, scaled in plan by `kit.finish`,
real heights. Materials (painted at load in `src/world/kilmainham.js`): `km_ashlar`, `km_rubble`, `km_render`,
`km_dress`, `km_slate`, `km_copper` and `km_atlas` (windows, doors, the serpent door, clocks, sundial, the arcade
backs, the arms), with an emissive night twin for the lit windows and the lanterns. AO baked into vertex colours.

### 5.2 Placement (src/world/sites.js, from absolute coordinates)

- **Gaol**: plan 0.55, turned to Inchicore Road's game bearing, slid south until its front and walls clear the
  carriageway and footpath, its east wall on the OSM line (so the courthouse keeps its slot to the SCR).
- **Courthouse**: plan 0.45 x 0.5 on its OSM centre, between the gaol wall and the SCR footpath.
- **Royal Hospital**: plan 0.55 uniform (49 x 52 m against the 31 x 47 m the squeezed projection would give; a square
  courtyard stays square), turned 11 degrees, on the OSM centre.
- **Richmond Tower**: ~1:1 north-south, 0.8 east-west, straddling the avenue's last straight, moved east off the SCR
  carriageway. Its arch is widened to ~6 m so a car passes (compromise).
- Collision: gaol wall ring + front; courthouse box; the RHK's four ranges; the tower's two piers.

### 5.3 Ground

- The grounds are an OSM `greens` outline (grass everywhere but the drives); the gardens get gravel walks, box
  hedges, cone yews and hollies (instanced); lime rows along both avenues (trees.glb `lime`), specimen trees on the
  meadow; the calp boundary wall round the grounds with gaps at the gates.
- Filler: Kilmainham is 2-3 storey Victorian terraces (brick and stucco), 3 on the main roads; Heuston South Quarter
  keeps its 6-8 storey offices; no filler in the rail yard between St John's Road West and the river.

### 5.4 Compromises (documented)

- **The squeeze**: east-west distances here are 0.35 of real but roads are real width. The heroes are built at plan
  0.55 (like the other stone heroes), so they are ~1.5x wider east-west than their projected footprints and are slid
  to clear the roads.
- **Inchicore Road** is moved ~5 m north past the gaol (its real kerb is only ~7 m from the wall, the game's
  carriageway plus footpath need 8.5 m).
- **The Richmond Tower** moves ~8 m east off the SCR and its arch is widened.
- **Kilmainham Lane** meets the SCR 30 m south of the Inchicore Road junction in reality; here 17 m.
- **Emmet Road, Mount Brown and the SCR to Rialto** are not built (see 1.3).
- **Heights** are estimates from photos (sections 3.1-3.3).
