# Kildare Street, Merrion Street and College Green's statues (`kildare-street`)

Scope: Leinster House (Dáil Éireann) with its Kildare Street forecourt and Leinster Lawn; the National Library and the National Museum (Archaeology), the twin rotunda-fronted buildings flanking the forecourt; Government Buildings on Merrion Street Upper; the Natural History Museum and the National Gallery's Merrion Square front (cheap versions); the Shelbourne Hotel on St Stephen's Green North with its bronze torch-bearers. Also the College Green / Suffolk Street statues from `monuments.md`: the Thomas Davis memorial and the Four Angels fountain, Grattan's sea-horse lamps, and Molly Malone outside St Andrew's Church.

- Raw OSM: `data/osm/kildare-street.json`. Overpass `out geom`, bbox **S 53.3380, W -6.2625, N 53.3450, E -6.2480** (College Green to Merrion Square), `timestamp_osm_base` 2026-09-29T21:04:21Z. Buildings and building:parts, highways, historic/tourism nodes, fountains, street lamps, leisure/landuse, trees, barriers.
- References: `refs/kildare-street/` holds 22 images from Wikimedia Commons (credits in §3 and `sources.json`). The Commons API was rate-limited (HTTP 429) during the pull; two geograph mirrors (Leinster House from Merrion Street, the Kildare Street pedestrian gate) failed to download and are not used.
- Game coordinates come from `project()` in `src/world/geo.js`; everything here is east of the Dame Street stretch band and south of the quays band, so game x/z are plain half-scale metres.

---

## 1. Map data

### 1.1 Positions (OSM, game x/z)

| Feature | OSM | Real centre | Game (x, z) | Notes |
|---|---|---|---|---|
| National Library | way 231082840 | 53.341033, -6.254491 | (154.8, 347.1) | 71 x 52 m real; the rotunda faces south into the forecourt |
| National Museum (Archaeology) | way 1029441205, rel 13777107 | 53.340260, -6.254942 | (139.8, 390.2) | 74 x 73 m; the rotunda (part, round) faces north |
| Leinster House | way 231082843 | 53.340231, -6.254118 | (167.2, 391.8) | main block ~43 x 23 m real, 11 bays; the polygon includes the Seanad wing and the link to the NHM |
| Leinster House 2000 | way 231082842 | 53.340984, -6.253265 | (195.5, 349.9) | modern offices, not modelled (filler) |
| Leinster Lawn | way 231109902 | 53.340182, -6.252498 | (221, 394.5) | 57 x 60 m real |
| Cenotaph (obelisk) | way 1483591051 | 53.34030, -6.25236 | (204.2, 385.9) | `height` 18.3, pyramidal roof |
| Natural History Museum | way 231082847 | 53.339916, -6.253397 | (191.2, 409.3) | `height` 9 (eaves), hipped |
| National Gallery | rel 3101326 | - | (200-242, 311-374) | Dargan wing to the lawn, Millennium wing to Clare St |
| Government Buildings | way 231082849 + 40 parts | 53.339172, -6.253525 | (186.9, 450.7) | 128 x 136 m real; the drum part 12-20 m and dome 20-23 m (parts 1280902365, 1483581202, low); wings 9-12 m; the screen columns 11 m with 14 m gabled pediments (parts 1483007575-80, 1483014632-3, 1483018374-5) |
| Shelbourne Hotel | rel 17816371 | - | x 92-138, z 440-468 | `building:levels` 5; the front runs along St Stephen's Green North |
| Thomas Davis | node 1348371037 | 53.344355, -6.260654 | (-50.0, 158.8) | from monuments.md |
| Four Angels fountain | node 298085721 | 53.344370, -6.260502 | (-44.9, 157.6) | |
| Henry Grattan | node 3632752127 | 53.344421, -6.259858 | (-23.5, 153.7) | |
| Molly Malone | node 2980297988 | 53.343746, -6.260897 | (-58.1, 196.2) | Suffolk St, at the foot of St Andrew's NE tower |
| St Andrew's Church | way 113818887 + parts 1484410759-78 | - | x -73..-50, z 200..222 | nave 22 m, tower 25 m, spire to 40 m (part 1484410776) |

### 1.2 The Kildare Street frame

Everything east of Kildare Street is laid out in one frame (`src/world/kildarelayout.js`, `build_kildare.py`): origin at node **KDK1** (the OSM Kildare Street line at 53.3415, -6.254924), **u** south along the street (bearing ~198°), **v** east away from its centreline. In it the real layout is a near-rectangle: Kildare Street at v 0, Merrion Square West / Merrion Street Upper at v ~121-134, St Stephen's Green North / Merrion Row at u ~128-150 (real).

| Building | Real (u, v) extent | Built (u, v) | Change |
|---|---|---|---|
| Library | u 4-37, v 7-26 | u 6-24 (+ rotunda to 30.8), v 9.8-31 | Front pushed to the game footpath (roads keep real width, so ~3.5 m further out) |
| Museum | u 53-83, v 5.5-36.5 | u 48-72.8, v 9.8-31 | Mirrored about Leinster House's axis (u 39.4) |
| Leinster House | u 27.5-49, v 39.4-51 | u 27.9-50.9, v 43-55 | +3.5 in v |
| NHM | u 62-75, v 60-96 | u 63-75, v 64-101 | |
| Gallery (Dargan / Milltown) | u -33..22, v 64-106 | u -12..21, v 70-120 | east face moved +12 to meet the slanted game Merrion Square West |
| Government Buildings | u 77-138, v 56-110 | u 77.5-119.3, v 64-113 | **squeezed to 0.7 in u** to fit north of the game's Merrion Row (see 1.3) |
| Shelbourne | u 122-150, v -2..43 | u 100-117.5, v 9.8-42 | **moved ~30 m north** and shortened: the game's St Stephen's Green North sits ~25 m north of the real street |

### 1.3 Streets: what the game had, what changed (src/data/streets.json)

- **Kildare Street** was a straight NS2-KS1 line 8-15 m west of the real street past Leinster House. Two nodes on the OSM line, **KDK1** (53.3415, -6.254924) and **KDK2** (53.339893, -6.255815), now bend it onto it.
- **Merrion Square West** ran MSNW to MSSW (53.3389, -6.2515), ~35 m east of the real road at the NHM. **MSSW moved to the real SW corner of the square** (53.339759, -6.252046, the Merrion St Upper / Merrion Sq West / South junction, OSM 887900301). **Merrion Row** was SGNE-MR1-MSSW; its MR1-MSSW leg is now its own way, **Merrion Street Upper**, the street Government Buildings fronts. Node topology is unchanged (the Georgian Sprint trial still runs MSSE-MSSW-MR1-SGNE).
- St Stephen's Green North (KS1-SGNE) and Merrion Row (SGNE-MR1) remain ~25 m north of OSM. Not moved (the Green, its park polygon and other agents' work hang off those nodes): Government Buildings and the Shelbourne were fitted instead.
- **Suffolk Street** (pedestrian, OSM 4475686 / 998280698) added from CG3 via **KDS1** (53.343635, -6.260388) to **KDS2** (53.34386, -6.260872), and **Church Lane** (OSM 4475687) from KDS2 north to College Green at CG0, so it isn't a dead end. St Andrew Street (west of KDS2) is not in the graph; its first 20 m is a paved forecourt in front of the church.
- **College Green CG0-CGT** carries `laneOff: 5` (new field, `geo.js` laneOffset): traffic runs 5 m either side of the centreline, round the Davis and Grattan islands, as the real one-lane-north / two-lanes-south layout does.

### 1.4 College Green placement (from monuments.md 1.2, 5)

College Green frame: s along CG0-CGT from CG0, l to the north (`src/world/collegegreen.js`).

| Item | Real (game x, z) | Built (s, l) | Notes |
|---|---|---|---|
| Davis plaza | x -51.3..-28.5 | lens s 8.5-31.5, half width 3.2 | kerbed, cobbled; exempt in footprints.mjs by name, checked to lie on its island |
| Thomas Davis | (-50.0, 158.8) | (11.2, 0) | 2.7 m bronze on a 2.7 m granite pier, facing east (Trinity) |
| Four Angels fountain | (-44.9, 157.6) | (18.6, 0) | octagonal parapet 0.85 m with 6 bronze famine panels, pool, round platform, 4 heralds 2.9 m facing out, jets |
| Grattan island | x -24.5..-11.8 | lens s 33.2-45.5, half width 3.3 | the real curved triangle reaches into the CGT junction; clipped to a lens |
| Grattan | (-23.5, 153.7) | (37.2, 0) | orator, 3.0 m, greenBronze, pale limestone pedestal with corner brackets, facing east (NIAH 50020253) |
| Sea-horse lamps | east of Grattan | (41.6, +-1.5) | two cast-iron standards, 5.2 m, lantern glass lit at night |
| Molly Malone | (-58.1, 196.2) | Suffolk frame (4.25, 6.0) | at the church's NE corner, side-on to the street, pushing her barrow west along the church front (ref 22) |

## 2. Visual cues

- **Leinster House** (Cassels, 1745; refs 01-03): pale grey limestone ashlar, 11 bays x 3 storeys, rusticated ground floor, the first-floor windows under alternating pediments, a balustrade under the three central windows; the centre three bays break forward under a pediment on four engaged Corinthian columns; hipped slate roof, two chimney stacks, the tricolour on a roof pole. The lawn (east) front is plainer. The forecourt is tarmac with parked cars and a raised planted terrace; ornate iron railings and gates with granite piers on Kildare Street (ref 07 shows the "LIBRARY" gate lettering).
- **Library and Museum** (Deane & Deane, 1885-90; refs 02, 07, 08): buff sandstone, two tall storeys and an attic, the Kildare Street end pavilions pedimented; each has a half-round two-tier **rotunda** facing the forecourt: an open colonnade below, an upper drum with oculi and a balustrade, a low lead dome.
- **Government Buildings** (Aston Webb, 1904-22; refs 09-12): Portland stone Edwardian Baroque. Two long wings reach Merrion Street Upper either side of a courtyard; the central block closes it with a pedimented centre on engaged columns; above it a drum with a clock and a **grey lead dome with a lantern**. The street is screened by **paired giant Tuscan columns carrying an entablature and balustrade, with carved pedestals and urns over the gate piers**, black iron gates and railings between. Floodlit warm-white at night (ref 11).
- **Shelbourne** (McCurdy, 1867; refs 13-16): red brick with cream stucco window surrounds and string courses, five storeys and a dormered mansard; arched ground and first-floor windows; a black cast-iron and glass **canopy** over the entrance with "SHELBOURNE HOTEL", a balustraded balcony above; four bronze female **torch-bearers** on pedestals at the area railings, holding lamps aloft.
- **Davis memorial** (Delaney, 1966; refs 19-21): the heralds are very tall, thin, rough-cast and crowned, the long trumpet held out and down from the lips, one broad flat wing behind; greenish-grey bronze. The basin's granite blocks carry dark bronze relief panels, with glass panels between (recent).
- **Molly Malone** (Rynhart, 1988; refs 22-23): brown bronze, low-cut dress, the bodice rubbed gold; a two-wheeled barrow with big spoked wheels and baskets; granite plinth. St Andrew's (Lanyon, Lynn & Lanyon, 1860s) is dark calp rubble with granite dressings, a tower and broach spire at the NE corner, a big traceried window in the gable.
- **Sea-horse lamps** (ref 24): black cast iron; sea-horses twined up the pedestal, a slim column, a crowned lantern.

## 3. Reference images (`refs/kildare-street/`)

All from Wikimedia Commons, thumbnails at ~1000-1280 px. Credit these if shipped.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-leinster-house-kildare-st-front.jpg | [Leinster House, Dublin, October 2010 (03).JPG](https://commons.wikimedia.org/wiki/File:Leinster_House,_Dublin,_October_2010_(03).JPG) | Ardfern | CC BY-SA 3.0 | 2010-10-27 | The Kildare Street front across the forecourt |
| 02-leinster-house-and-museum.jpg | [Leinster House and National Museum.jpg](https://commons.wikimedia.org/wiki/File:Leinster_House_and_National_Museum.jpg) | Sheila1988 | CC0 | 2023-12-30 | Leinster House with the Museum rotunda |
| 03-leinster-house-lawn-front.jpg | [Leinster House - cote Merrion Square.jpg](https://commons.wikimedia.org/wiki/File:Leinster_House_-_cote_Merrion_Square.jpg) | Cqui | CC BY-SA 3.0 | 2011-06-09 | The lawn front and the obelisk from Merrion Square |
| 06-leinster-house-obelisk.jpg | [Leinster House Behind the Obelisk.jpg](https://commons.wikimedia.org/wiki/File:Leinster_House_Behind_the_Obelisk.jpg) | Simo.Albo80 | CC BY-SA 4.0 | - | The cenotaph on Leinster Lawn |
| 07-national-library-rotunda.jpg | [National Library of Ireland, Dublin, October 2010 (01).JPG](https://commons.wikimedia.org/wiki/File:National_Library_of_Ireland,_Dublin,_October_2010_(01).JPG) | Ardfern | CC BY-SA 3.0 | 2010-10-27 | The Library gate lettering and the rotunda |
| 08-national-library-kildare-st.jpg | [National Library of Ireland Kildare Street.jpg](https://commons.wikimedia.org/wiki/File:National_Library_of_Ireland_Kildare_Street.jpg) | Alicia Fagerving | CC BY-SA 3.0 | 2017-07-09 | The Library from Kildare Street |
| 09-government-buildings-front.jpg | [Government Buildings, Dublin 2018-08-08.jpg](https://commons.wikimedia.org/wiki/File:Government_Buildings,_Dublin_2018-08-08.jpg) | August Schwerdfeger | CC BY 4.0 | 2018-08-08 | The screen, the courtyard, the central block and dome |
| 10-government-buildings-screen.jpg | [Government Buildings, Merrion St Upper, Dublin (507053) (31252325261).jpg](https://commons.wikimedia.org/wiki/File:Government_Buildings,_Merrion_St_Upper,_Dublin_(507053)_(31252325261).jpg) | Robert Linsdell | CC BY 2.0 | 2015-06-12 | The screen and gates straight on |
| 11-government-buildings-evening.jpg | [Evening at Government Buildings, Merrion Square (Main facade).jpg](https://commons.wikimedia.org/wiki/File:Evening_at_Government_Buildings,_Merrion_Square_(Main_facade).jpg) | David Kernan | CC BY 4.0 | 2024-09-20 | Floodlit at dusk (night look) |
| 12-government-buildings-street.jpg | [Dublin, Government buildings, Merrion Street Upper - geograph 2505964](https://commons.wikimedia.org/wiki/File:Dublin,_Government_buildings,_Merrion_Street_Upper_-_geograph.org.uk_-_2505964.jpg) | Dr Neil Clifton | CC BY-SA 2.0 | 2011-07-07 | From Merrion Street Upper |
| 13-shelbourne-front.jpg | [Shelbourne Hotel, Dublin, October 2010 (01).JPG](https://commons.wikimedia.org/wiki/File:Shelbourne_Hotel,_Dublin,_October_2010_(01).JPG) | Ardfern | CC BY-SA 3.0 | 2010-10-27 | The Green front, canopy, balcony, statues |
| 14-shelbourne-street.jpg | [Dublin, Shelbourne Hotel - geograph 2505936](https://commons.wikimedia.org/wiki/File:Dublin,_Shelbourne_Hotel_-_geograph.org.uk_-_2505936.jpg) | Dr Neil Clifton | CC BY-SA 2.0 | 2011-07-07 | From St Stephen's Green North |
| 15-shelbourne-torchbearer.jpg | [Statue of Nubian noblewoman outside the Shelbourne Hotel in Dublin.jpg](https://commons.wikimedia.org/wiki/File:Statue_of_Nubian_noblewoman_outside_the_Shelbourne_Hotel_in_Dublin.jpg) | Sharonlflynn | CC BY-SA 4.0 | 2017-04-17 | A torch-bearer |
| 16-shelbourne-entrance.jpg | [Shelbourne Hotel entrance.jpg](https://commons.wikimedia.org/wiki/File:Shelbourne_Hotel_entrance.jpg) | Sharonlflynn | CC BY-SA 4.0 | 2017-04-17 | The canopy and entrance |
| 17-natural-history-museum.jpg | [Natural History Museum Dublin exterior.jpg](https://commons.wikimedia.org/wiki/File:Natural_History_Museum_Dublin_exterior.jpg) | William Murphy | CC BY-SA 2.0 | 2016-03-26 | The NHM |
| 18-national-gallery.jpg | [National Gallery of Ireland - Merrion Square.jpg](https://commons.wikimedia.org/wiki/File:National_Gallery_of_Ireland_-_Merrion_Square.jpg) | Alicia Fagerving | CC BY-SA 3.0 | 2017-07-12 | The Merrion Square West front |
| 19-thomas-davis-statue.jpg | [Thomas Davis Statue and Bank of Ireland, College Green.jpg](https://commons.wikimedia.org/wiki/File:Thomas_Davis_Statue_and_Bank_of_Ireland,_College_Green.jpg) | Rob Hurson | CC BY-SA 4.0 | 2014-11-01 | **Titled Davis, but shows a herald close up** |
| 20-four-angels-fountain.jpg | [Four Angels Fountain.jpg](https://commons.wikimedia.org/wiki/File:Four_Angels_Fountain.jpg) | Yair Haklai | CC BY-SA 4.0 | 2022-08-07 | The heralds, a relief panel, the basin |
| 21-davis-fountain-college-green.jpg | [Dublin College Green Fountain.JPG](https://commons.wikimedia.org/wiki/File:Dublin_College_Green_Fountain.JPG) | J.-H. Janßen | CC0 | 2012-09-23 | The fountain running |
| 22-molly-malone-st-andrews.jpg | [Irlanda - Dublino - St Andrew's Church con la statua di Molly Malone.jpg](https://commons.wikimedia.org/wiki/File:Irlanda_-_Dublino_-_St_Andrew%27s_Church_con_la_statua_di_Molly_Malone.jpg) | Mario Falcetti | CC BY 4.0 | 2023-08-03 | Molly at St Andrew's |
| 23-molly-malone.jpg | [Molly Malone Statue, Dublin.jpg](https://commons.wikimedia.org/wiki/File:Molly_Malone_Statue,_Dublin.jpg) | Ken Eckert | CC BY-SA 4.0 | 2014-07 | Molly and her barrow |
| 24-grattan-seahorse-lamp.jpg | [Hippocampus, Dublin.jpg](https://commons.wikimedia.org/wiki/File:Hippocampus,_Dublin.jpg) | Debbiesw | CC0 | 2016-12-20 | A sea-horse lamp base |

## 4. Build (phase 2)

- **Hero**: `tools/blender/build_kildare.py` -> `public/models/kildare.glb` (119 KB, **8.6k triangles** after the AO bake), one node `kildare` in the frame above, placed by `placeKildare()` (`src/world/kildare.js`) through `heroes.js placeParts` with the shared stone materials: Portland and granite are floodlit after dark (`uplit`), window decals glow (`setStoneNight`). About 12 draw calls.
- **Statue kit**: five new bodies in `statue_bodies.py` (`davis`, `herald`, `molly`, `torchbearer`, `seahorse_lamp`); `statues.glb` 130 -> 203 KB, 22.4k triangles for all 16 bodies. New finishes `heraldBronze`, `mollyBronze`, `castIron`; `addStatue({ polish })` rubs a spot bright (Molly's bodice). Kit figures merge per material per 600 m block, so the new statues add no draw calls there.
- **Builder geometry** (`src/world/kildare.js`): the College Green islands, plinths, the fountain (basin, water, jets) and the lamps' glass; Suffolk Street's paving, Molly's plinth and St Andrew's Church in one builder.
- Collision: every building box, the obelisk, the islands' outlines, the fountain, Grattan's pedestal, the lamps, Molly's plinth, the church.
- Places: Leinster House, Government Buildings, The Shelbourne, Molly Malone.
- Measured (areaperf, low tier, dpr 1): **+22 draw calls / +30k triangles on Kildare Street, +34 / +50k at College Green, +24 / +30k on Merrion Street.** GPU times in the same runs were dominated by other jobs on the machine (the same spot varied 38-116 ms between runs) and aren't usable.

## 5. Open questions

1. St Stephen's Green North / Merrion Row sit ~25 m north of OSM. Moving SGNE/KS1 south would let the Shelbourne and Government Buildings take their real footprints (and fix the Green); it touches the park and the Luas.
2. Merrion Square West still slants north-east to MSNW (the Clare St corner is ~15 m off); the Gallery's front stands back from it.
3. Leinster House 2000, the Seanad wing detail, Kildare Place and the Prince Albert statue on the lawn are not modelled.
4. Davis's own pose is still a guess (no photo of the figure found; ref 19 turned out to be a herald).
