# Parliament House / Bank of Ireland, College Green (`parliament-house`): Phase 1 research

Scope: the former Irish Parliament House (Bank of Ireland, 2 College Green), its piazza, curved screen walls and three porticos; College Green between Foster Place / Church Lane and the Trinity arm; the south end of Westmoreland Street; the College Street vista; Foster Place.

- Raw OSM: `data/osm/parliament-house.json`. Overpass `out geom` from the overpass.private.coffee mirror (the main server and kumi were overloaded). Bbox **S 53.3435, W -6.2630, N 53.3470, E -6.2570**. Snapshot `timestamp_osm_base` 2026-07-24T11:04:51Z (the mirror lags the main server by about two months), 1,568 elements. It holds buildings and building:parts (**the columns are mapped individually as 1.0-1.1 m circles**), highways, trams, barriers (railings), trees, bus stops, taxi ranks, artworks and street furniture.
- References: `refs/parliament-house/` holds 16 images from Wikimedia Commons and geograph (credits in §2 and `sources.json`).
- Mapillary was not used (no token).
- Coordinates:
  - **Local (u, v)** is a building frame in real metres. Its origin is 53.3449, -6.2600, and it is rotated 12.7° anticlockwise so that +u runs along the College Green front (towards ENE) and +v points into the building (NNW). The front colonnade line is at v = -31.4.
  - **Game (x, z)** comes from re-implementing `project()` in `src/world/geo.js`. This site lies east of the Dame Street E-W stretch band, so x = 0.5 × real. It is **inside the N-S stretch band (53.3442-53.3462, ×1.4)**, so z = 0.7 × real. The game therefore draws this building 0.5× east-west and 0.7× north-south.

Tags: **VERIFIED** means confirmed by a primary source named in brackets (NIAH, OSM geometry, or photo measurement where two sources agree). *Estimated* means my measurement or judgement.

---

## 1. Map data: what is really there, and how the game differs

### 1.1 The building on the ground (VERIFIED, OSM relation 3676582 plus 60+ building:parts)

**Orientation.** The main front faces **SSE onto College Green**, towards Trinity's Front Gate and the Grafton Street junction. The front line runs at bearing ~77° (ENE), so the east end is about 10 m further north than the west end over the colonnade. [OSM outline and column circles; refs 01, 12]

**Blocks.** Going west to east, along the street:

| Element | Local (u, v) | Real size | Game (x, z), OSM-true |
|---|---|---|---|
| Foster Place (west) portico, front | u -69.8, v 1.7…14.1 | 12.4 m wide, projects 4.2 m from the west wall (u -65.6) | (-63.2, 121.7) |
| West quadrant screen wall | 12 columns from (-63.7, -6.6) to (-34.2, -30.6) | column line radius **≈31 m** (circle fit), centre (-33.6, 0), sweep ≈77°, **convex** (wraps the SW corner) | ends (-58.6, 130.6) and (-41.2, 142.9) |
| West arch pavilion | columns at u -32.8 and -26.8, v -31.4 | 6 m c/c, arch between | |
| **Piazza** (forecourt, "E"-plan colonnade) | arms' inner columns at u -26.8 and 6.3 | **33 m wide × 12-14 m deep** | front centre (-29.8, 139.3) |
| Central portico | 4 columns at u -15.5, -12.3, -8.1, -4.9, v -20.9 | **tetrastyle**, 3.2 / 4.2 / 3.2 m c/c (wider central bay) | (-30.9, 132.2) |
| East arch pavilion | columns at u 6.3 and 12.9, v -31.4 | 6.6 m c/c | |
| East quadrant screen wall | 11 columns mapped (probably 12) from (14.4, -30.2) to (41.2, -4.9) | column line radius **≈35 m** (fit), centre (7.1, 4.4), sweep ≈63°, **convex** (wraps the SE corner) | ends (-18.2, 135.7) and (-7.6, 113.3) |
| SE corner block | u 41.4…43.5, v -4.9…5.8 | ~10.7 m, three tall blind niches | |
| **House of Lords (east) portico** | 6 columns in a line at u ≈51.7, v 6.6…24.9 | **hexastyle**, 18.3 m c/c (3.66 m spacing), **~10 m deep** (wall at u 41.6), faces ENE straight down College Street | column line centre (-4.8, 97.6) |
| East front north of the portico | u ≈40.5, v 25…45 | ~20 m, blind niches, roundel, railings; a triumphal arch at the north end (NIAH) | NE corner (-13.3, 80.3) |
| West front (Foster Place) | u ≈-62…-66, v -6…48 | ~55 m | NW corner (-63.7, 93.3) |

- **Overall** (VERIFIED, OSM): ≈122 m from the west portico front to the east portico columns, and ≈79 m from the front colonnade to the north wall. "Nearly 6,000 m²" [Wikipedia].
- **The colonnade front** is ≈47 m between the quadrant starts. Wikipedia says "forty-seven metres"; the 1830s Atlas of Ireland says "147 feet in extent" (44.8 m). VERIFIED, two sources.
- **Column diameter** is ≈1.0-1.1 m (OSM circles; photo proportions agree). VERIFIED ±0.1 m.
- **The piazza.** The 1767 Omer plan (ref 16, scale bar in feet) gives the back row at ≈32.7 m between corner columns and the arms at ≈12.2 m deep. That matches OSM's 33 × 12-14 m. VERIFIED, two sources.
  - The piazza is **rectangular with square corners**. Its only curves are the convex quadrants outside it and the bowed front railing.
  - It is used as a **customer car park** (OSM `257354068`, in/out drives at each end). The piazza floor is ~0.6-1 m above the pavement, reached by steps (refs 02, 03).
- **Railings.** The front railing (OSM `357697756/757/759`) runs straight from the arm ends, then **bows out to v -36.8**, ≈5.4 m in front of the colonnade line. This bow is already on the 1767 plan. Railings also run ≈2-3 m in front of both quadrants (refs 05, 13) and along the east front north of the Lords portico (ref 10). They are **cast iron on a carved granite plinth, by Kennan & Sons, late 19th century**, ≈1.9-2 m tall (NIAH; ref 05 measured against people). Two gate piers at the piazza entrance carry black lamp standards (ref 01).
- **The Lords portico has no railings.** Its column plinths stand **on the public footpath** of Westmoreland Street / the College Green arm, ≈5-6 m from the carriageway, behind a two-way cycle track (refs 08, 09, 15; OSM cycleway `521995022`).

### 1.2 The street context (VERIFIED, OSM highways)

- **College Green is a dual carriageway with a central island**, not one wide road.
  - The **north carriageway** is one lane eastbound (`4476041`, `907988494`, `1177353551`, `55979303`). It runs along the Bank's front at v ≈ -44 to -48 (centre), then **curves north round the SE quadrant** into the bus-only arm up to Westmoreland / College Street (`68748138`, `24953749`, 3 lanes, `access=no bus=designated`).
  - The **south carriageway** is two lanes westbound (`532097269`, `907988495`, `1491613583`, `1252610758`), from the Grafton / Trinity junction to Church Lane and Dame Street.
  - Between them is the **island**: the Thomas Davis monument and Four Angels fountain at the west end (game ≈ (-50, 159) and (-45, 158)), and **Henry Grattan at the east end**, in front of the east arm pavilion (OSM `3632752127`, game (-23.5, 153.7)).
  - Kerb to kerb is ≈19 m real (north kerb v ≈ -42, south kerb v ≈ -61). From the colonnade line to the north kerb is ≈10.6 m: railing, footway, a two-way **cycle track** (`768246658`), then the kerb.
- **The east arm** (Grafton junction to Westmoreland / College St) carries **both Luas Green Line tracks** (`747008854` southbound, `585042210` northbound), bus lanes and cycle tracks. It passes within ≈10 m of the SE quadrant and the Lords portico (refs 13, 15).
- **Westmoreland Street** is one-way **northbound** for general traffic, towards O'Connell Bridge (`1310928651`, 3 lanes), with the northbound Luas. **D'Olier Street** carries southbound traffic, and **College Street** runs west into the junction below the Lords portico.
  - **Gandon's portico terminates the view west along College Street** (VERIFIED: Wikipedia "facing down College Street"; the 1828 Petrie/Winkles engraving "College Street"; ref 15).
- **Foster Place** is a short **cobbled cul-de-sac** (`129212230`, unclassified, 2 lanes). It leaves the College Green north carriageway at the SW quadrant (game (-59.1, 154.5)) and runs NNW along the Bank's west front to (-65.1, 128.8), ending in a hook at (-69.2, 107.8). It has a **taxi rank** (nodes `641811578`, `13902095081/82`), a row of steel planters, trees and heritage lamps (refs 11, 12). Opposite stand the Exchange Buildings (`275512933`) and the former Royal Bank / "The Bank" bar.
- **Church Lane** comes into College Green from the south opposite Foster Place (`4475687`, one-way northbound, 2 lanes). It is not in the game.
- **Bus stops** (VERIFIED, OSM): 4521 "College Green, Trinity College" and 4522 "College Green, Suffolk St", both on the south carriageway; 1278 and 1279 further west; DK "College Green (#13 or 123)" on the north carriageway west of Foster Place; Westmoreland St stops (CC, CD, CF, 318) north of Fleet St.
- **Taxis:** there is a rank on the north carriageway in front of the piazza / east quadrant (`593642488`; ref 13 shows a line of taxis against the east quadrant at night), plus the Foster Place rank.
- **Trees** stand along the west quadrant footway (OSM `5050667038/40/41`) and in Foster Place (`5050667042/43`).
- **Pending change:** Dublin City Council's **College Green plaza** would pedestrianise from Trinity's front to George's St (pre-planning design Feb 2026, planning application summer 2026, closure hoped for end 2027, completion 2029-30). Today's layout still stands. See open question 5.

**What a driver sees:**
- **Coming east along Dame Street:** the street widens into College Green. On the left, the **west quadrant** curves away with its 12 columns and balustrade, then the **west arch pavilion** and pediment, then the open piazza and the portico with its three statues. **Trinity's Front Gate closes the view dead ahead** (ref 12).
- **Coming down D'Olier St, then west along College Street:** the **Lords portico faces you head-on**, framed by Trinity on the left (ref 15, and the 1828 engraving).
- **Coming north out of College Green onto Westmoreland Street** (the legal car direction): the Lords portico's column plinths are on the left footpath, then the long niche wall runs north (ref 09).

### 1.3 What the game does now (`src/world/sites.js` l.110-116, `src/world/landmarks.js` `bankOfIreland()` l.336-371)

The site uses `beside('CGT', 'CG0', t≈0.67, -1, W=36, D=32)`, so it hangs off the single College Green way on its north side. It computes to **centre (-41.9, 120.1), rot -0.25 rad (-14.3°)**, with the front centre at about (-45.9, 135.6). What the model draws:
- a 36 × 21 m block, 13 m high, textured with the warm-cream `M.niche` bay texture (`#cfc8b6`), with a lead roof and a box cornice
- an 11 m-deep court in front, ringed by a **U of 17 plain columns**: 7 on the back line, 4 on each of two **concave quarter-curves of radius 7 m inside the court**, and 1 at the end of each side arm
- a flat 3 m-thick "screen wall" box behind each side arm
- a 4-column portico with a pediment, and three proxy statues (Hibernia at 15.3 m, two at 12.1 m)

**Errors against reality, most important first:**

1. **Wrong way round.**
   - The game front faces **SSW** (rot -0.25). The real front faces **SSE**, with its east end further north (rot ≈ **+0.27** in game space). That is a ≈30° error.
   - Cause: the College Green way CG0→CGT slopes the wrong way. CGT (53.34432) is ≈18 m real / 12 game m too far south, and CG0 (53.3445) is ≈15 m too far north (§4 P0).
2. **Wrong place.**
   - The front centre is ≈16 game m (≈32 m real) too far west: (-45.9, 135.6) against the real piazza front at (-29.8, 139.3).
   - The real east portico stands at x ≈ -4…-10, and the game's east arm and Westmoreland Street run exactly there, at x -13.3 to -4.3.
3. **Far too small, and the wrong plan shape.**
   - The game model is 36 × 32. The real footprint in game projection is ≈62 × 55, and the College Green frontage (quadrant + piazza + quadrant) is ≈105 m real.
   - The game has a U-court with concave rounded corners. The real building has a **rectangular piazza plus two large convex quadrant screen walls (radius ≈31-35 m)** that wrap the corners and carry the front round onto Foster Place and Westmoreland Street. **This curve is the building's signature, and it is missing.**
4. **No House of Lords portico.** Gandon's **Corinthian hexastyle portico** (6 columns across, plus one on each return, a deep coffered porch, a pediment with Fortitude, Justice and Liberty) facing College St / Westmoreland St is absent.
5. **No Foster Place side.** There is no Ionic tetrastyle west portico, and no Foster Place street at all.
6. **No arch pavilions** where the piazza arms meet the quadrants. Each is a pedimented bay with a big round-headed arch flanked by Ionic columns (refs 02, 03, 12).
7. **Column count.** The game has 17 columns. Reality has ≈56 free-standing columns plus engaged ones (the table in §3.2).
8. **The screen walls are flat boxes with a cream niche texture.** Real ones are **curved and windowless**: a rusticated granite lower storey, a platband, then blind round-headed niches set in architrave frames with cornices (some pedimented), Portland stone roundels with swags, and a detached Portland Ionic column between each pair of niches.
9. **Materials and colour.**
   - Everything in the game is warm cream.
   - Reality is **two-tone**: **grey granite walls** (ashlar above, rusticated below) against **white-grey Portland stone** columns, entablature, balustrade, pediments and statues.
   - There is **no balustrade** in the game. The real Portland balustrade runs over both quadrants and the flanks of the porticos.
10. **Massing.** The real main block behind the piazza rises about a storey above the colonnade entablature as a plain ashlar attic (ref 14). The game block is 13 m, the same as the colonnade.
11. **No railings.** The Kennan cast-iron railings are missing: the bowed front, the gates and the lamp-topped piers, and the runs along the quadrants and the east front.
12. **Dressing in the wrong place.** Grattan is placed at the midpoint of CG0-CGT; he really stands at the **east** end of the island (game (-23.5, 153.7)). Davis and the Four Angels fountain at the west end are missing. The planes are put on College Green's south footpath; the real trees are on the north footpath at the west quadrant and in Foster Place.
13. **Luas (outside this brief, noted).**
    - `luasGreen` routes WM1→CG1→CGM ("Trinity")→CGT. The real **Trinity stop is on College Street** (53.34533, -6.25826, southbound).
    - Both tracks really run on the College Green east arm past the Lords portico.
    - The real **Westmoreland stop** is at 53.34633, -6.25902, not at WM1.

---

## 2. Reference images (`refs/parliament-house/`)

All are from Wikimedia Commons (several originally from geograph), resized to ≤1000 px. None are from Google. Credit them if shipped. Full metadata is in `sources.json`.

| File | Source (Commons) | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-front-from-trinity-side-east-quadrant.jpg | [Bank of Ireland Building, Dublin.jpg](https://commons.wikimedia.org/wiki/File:Bank_of_Ireland_Building,_Dublin.jpg) | Yair Haklai | CC BY-SA 4.0 | 2022-08-07 | **Key view.** East quadrant (convex, 10+ columns, niches, balustrade), east arch pavilion, piazza portico with statues, west portico far left; Kennan railings, gate and lamp pier |
| 02-piazza-portico-and-west-pavilion.jpg | [Bank of Ireland - geograph 6036296](https://commons.wikimedia.org/wiki/File:Bank_of_Ireland_-_geograph.org.uk_-_6036296.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | Across the piazza from the SE: west arch pavilion, the back-row colonnade, the tetrastyle portico, the east arch |
| 03-east-arch-pavilion-and-quadrant.jpg | [Bank of Ireland - geograph 6036315](https://commons.wikimedia.org/wiki/File:Bank_of_Ireland_-_geograph.org.uk_-_6036315.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Arch pavilion detail**: round arch between Ionic columns, pediment, start of the quadrant with niches and balustrade |
| 04-pediment-statues-royal-arms.jpg | [Three statues and coat of arms…](https://commons.wikimedia.org/wiki/File:Three_statues_and_coat_of_arms_-_Main_entrance-former_Parliament_House,_Dublin.jpg) | Yair Haklai | CC BY-SA 4.0 | 2022-08-07 | **Pediment**: Hibernia (apex), Fidelity (west), Commerce (east), royal arms in the tympanum, dentil cornice, Ionic capitals |
| 05-east-quadrant-niches-railings.jpg | [Parliament House - geograph 6046527](https://commons.wikimedia.org/wiki/File:Parliament_House_(Bank_of_Ireland)_-_geograph.org.uk_-_6046527.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Texture and scale source**: quadrant bays (rusticated base, platband, niche in frame with cornice), columns, balustrade, railings with people for scale |
| 06-east-quadrant-to-lords-portico.jpg | [Parliament House - geograph 6046531](https://commons.wikimedia.org/wiki/File:Parliament_House_(Bank_of_Ireland)_-_geograph.org.uk_-_6046531.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | How the east quadrant ends in the SE corner block and the deep Lords portico begins |
| 07-lords-portico-elevation.jpg | [Parliament House - geograph 6046554](https://commons.wikimedia.org/wiki/File:Parliament_House_(Bank_of_Ireland)_-_geograph.org.uk_-_6046554.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | **Straight elevation** of the Corinthian hexastyle portico: 6 + return columns, Fortitude / Justice, blind arcade and pedimented niches behind. Used for height measurement |
| 08-lords-portico-on-westmoreland-pavement.jpg | [Parliament House - geograph 6046537](https://commons.wikimedia.org/wiki/File:Parliament_House_(Bank_of_Ireland)_-_geograph.org.uk_-_6046537.jpg) | N Chadwick | CC BY-SA 2.0 | 2018-08-03 | Portico columns standing on the footpath beside the road, statues on the pediment corners |
| 09-driver-view-north-up-westmoreland.jpg | [A view north into Westmoreland Street…](https://commons.wikimedia.org/wiki/File:A_view_north_into_Westmoreland_Street_from_College_Green_-_geograph.org.uk_-_1740505.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-03-07 | **Driver's eye** leaving College Green northbound: the portico on the left, Westmoreland St ahead |
| 10-east-front-north-of-lords-portico.jpg | [The portico … bottom of Westmoreland Street](https://commons.wikimedia.org/wiki/File:The_portico_of_the_Bank_of_Ireland_from_the_bottom_of_Westmoreland_Street_-_geograph.org.uk_-_1738186.jpg) | Eric Jones | CC BY-SA 2.0 | 2010-02-20 | The east front north of the portico: niches, roundel, pedimented windows, railings, corner balustrade |
| 11-foster-place-west-portico.jpg | [Foster Place, Dublin 05.jpg](https://commons.wikimedia.org/wiki/File:Foster_Place,_Dublin_05.jpg) | Ridiculopathy | CC0 | 2024-05-26 | **West (Parke) portico**: Ionic tetrastyle, plain pediment (no statues), rusticated blind arcade, pedimented niches, cobbles and planters; the west quadrant curving off to the right |
| 12-driver-view-east-from-dame-street.jpg | [Bank of Ireland, College Green (22446156086)](https://commons.wikimedia.org/wiki/File:Bank_of_Ireland,_College_Green,_Dublin_(22446156086).jpg) | dronepicr | CC BY 2.0 | 2015-10-09 | **Driver's eye from Dame Street**: west quadrant, west arch pavilion, piazza; Trinity's front closing the view |
| 13-night-east-quadrant-taxi-rank.jpg | [Dublin - Irish Houses of Parliament - 2025-09-27](https://commons.wikimedia.org/wiki/File:Dublin_-_Irish_Houses_of_Parliament_-_2025-09-27_01-34-59_001.jpeg) | Thoslee | CC BY-SA 4.0 | 2025-09-26 | **Night**: quadrant uplit from the ground in white, dark sky above the balustrade, taxis along the kerb, Luas wires |
| 14-night-piazza-floodlit-green.jpg | [Dublin - Irish Houses of Parliament - 20150315204333](https://commons.wikimedia.org/wiki/File:Dublin_-_Irish_Houses_of_Parliament_-_20150315204333.jpg) | Dieglop | CC BY-SA 4.0 | 2015-03-15 | Piazza floodlit **green** (St Patrick's festival) with amber side light; shows the attic above the colonnade and the gate piers |
| 15-night-lords-portico-luas-tracks.jpg | [Bank of Ireland E Dublin 235…](https://commons.wikimedia.org/wiki/File:Bank_of_Ireland_E_Dublin_235_IMG_20250802_2225.jpg) | Karlunun | CC0 | 2025-08-02 | **Night, College St vista**: Lords portico with lanterns, Luas tracks and yellow box in the foreground, quadrant at left |
| 16-plan-1767-omer-gilbert.jpg | [GILBERT(1896) p141 The Plan of the Parliament House](https://commons.wikimedia.org/wiki/File:GILBERT(1896)_p141_THE_PLAN_OF_THE_PARLIAMENT_HOUSE,_DUBLIN.jpg) | Rowland Omer 1767 (in Gilbert 1896) | Public domain | 1767/1896 | **Pearce's plan** before Gandon: piazza colonnade (4+4 back row, tetrastyle portico, 2 + end pier per arm), bowed front railing, octagonal Commons |

Candidates not downloaded:
- `College Street, Dublin, facing Bank of Ireland east portico.jpeg` (Petrie/Winkles 1828, PD): the portico closing College St.
- `Westmoreland Street Dublin 02.JPG` (YvonneM, CC BY-SA 3.0): the Lords portico at dusk, **warm uplighting on the flank**.
- `James Gandon - Elevation for the West Front…` (Yale, CC0).
- `Hibernia, with an olive branch…` and `Commerce by Edward Smyth…` (Haklai): statue close-ups.
- `Dublin - Irish Houses of Parliament - 20150315204323.jpg` (night, vertical).
- `Foster Place, Dublin 12.jpg` (CC0): the Foster Place street view.

No CC aerial or ortho view with a compatible licence was found. The plan geometry above comes from the OSM column circles instead, which are better than an aerial for this purpose.

---

## 3. Landmark profile

### 3.1 Facts

- **Architect and dates:** Sir Edward Lovett Pearce designed it; built **1728/29-1733** (NIAH) or 1729-39 (Wikipedia; Arthur Dobbs completed it after Pearce died in 1733). It was the **first purpose-built bicameral parliament house**. VERIFIED.
- **East (House of Lords) portico and the east curved screen wall:** James Gandon, **1785-89** ("c.1785" NIAH). It has **six Corinthian columns**, chosen "at the request of peers who wished their entrance to be distinct from the Ionic columns" (Wikipedia). NIAH describes a "pedimented prostyle hexastyle… portico having Corinthian columns to east elevation". VERIFIED.
- **West side:** Robert / Edward Parke, 1787-94. NIAH gives Edward Parke 1792-94; Wikipedia gives Robert Parke 1787. He built an Ionic colonnade and the **tetrastyle Ionic pedimented portico on Foster Place**. VERIFIED (NIAH).
- **Bank conversion:** Francis Johnston, from **1803** (after the Act of Union). He replaced Parke's open curved colonnade with a **curved wall matching Gandon's east wall, then added Ionic columns to both curved walls**, which unified the College Green front. VERIFIED (NIAH, Archiseek, Wikipedia).
- **Statues:**
  - South portico: **Hibernia (apex), Fidelity (west base), Commerce (east base)**, by Edward Smyth (NIAH adds John Smyth), c.1809. VERIFIED (NIAH; Cusack for the west/east placement; ref 04).
  - East portico: **Fortitude, Justice and Liberty** (NIAH). Archiseek says "Wisdom, Justice and Liberty". Minor conflict; NIAH preferred.
  - The **royal coat of arms** (lion and unicorn) is carved in the south tympanum. VERIFIED (NIAH; ref 04).
- **Materials:**
  - Calp rubble core faced with **Portland stone and granite**. NIAH: "Ashlar granite walls over platband and rusticated granite walls, Portland stone roundels and swags and Portland stone plinth course. Portland stone Ionic colonnade to front and screen walls". The parapet and balustrade are carved Portland stone. VERIFIED.
  - Roofs are pitched slate plus **copper-clad** and barrel-vaulted roofs to the rear buildings. OSM shows an "aquamarine" copper dome over the east rotunda. VERIFIED.
  - The piazza has **coffered soffits**. VERIFIED (NIAH).
- **Openings:**
  - Blind round-headed niches with architraves and entablatures, some pedimented. VERIFIED.
  - **Triumphal arches at the north ends of the east and west elevations**: a round arch between engaged Ionic columns under a balustrade. VERIFIED (NIAH).
  - Under the Lords portico, blind round-headed door openings with rusticated surrounds. VERIFIED.
- **The piazza** is enclosed to the south by **cast-iron railings on a carved granite plinth, late 19th century, Kennan & Sons**. VERIFIED (NIAH).
- **Today:** the building is closed to the public since 2020. The banking hall was the Bank of Ireland's flagship branch, and the House of Lords chamber survives. For the HUD only.

### 3.2 Column schedule (orders and counts)

| Group | Order | Count | Source |
|---|---|---|---|
| Central south portico (prostyle, pedimented, 3 statues) | Ionic | **4** (tetrastyle) | NIAH; OSM 4 circles; 1767 plan. VERIFIED |
| Piazza back row, either side of the portico | Ionic | **4 + 4** (including the corner columns) | 1767 plan. VERIFIED for Pearce's design, and refs 02/14 agree |
| Piazza arms (intermediate) | Ionic | **2 per arm** | 1767 plan; ref 14. VERIFIED |
| Arch pavilions at the arm ends (flanking the arch) | Ionic | **2 per pavilion** (plus engaged responds) | OSM pairs (6.0 / 6.6 m c/c); refs 02, 03. VERIFIED |
| West quadrant | Ionic, detached, in front of the wall | **12** | OSM 12 circles. VERIFIED |
| East quadrant | Ionic | **11 mapped, probably 12** (a symmetric design) | OSM; ref 01. *Build 12* |
| House of Lords portico | **Corinthian** | **6 across + 1 on each return = 8**, plus wall responds | OSM 6 in line; refs 07, 08 show the return columns. Hexastyle VERIFIED; returns *from photos* |
| Foster Place portico | Ionic | **4** (tetrastyle) | NIAH; ref 11. VERIFIED |
| North-end triumphal arches (east and west) | Ionic, engaged | 2 each | NIAH. *Low priority* |

That makes **≈56 free-standing columns** (8 + 4 + 4 + 4 + 24 + 8 + 4), against 17 in the game.

### 3.3 Heights and proportions (*estimated*, no surveyed source)

OSM `height` tags here (6, 7, 9, 12) are schematic and unusable. The figures below come from **ref 07** (a straight elevation with people at the plinths: ≈39-40 px/m, cross-checked against the 18.3 m OSM column span, which also gives ≈38 px/m) and **ref 05** (people at the railing).

| Element | Real (est.) | Note |
|---|---|---|
| Piazza / pavement step | 0.6-1.0 m | steps into the piazza and porticos |
| Column, base to top of capital | **10.5-10.8 m** | ≈9.5-10 diameters (1.1 m), classic Ionic / Corinthian |
| Entablature (architrave, frieze, cornice) | ≈2.0 m | cornice top **≈12.5-13 m** |
| Balustrade (quadrants, portico flanks) | ≈1.8 m | top **≈14.5-15 m** |
| Main block attic behind the piazza | top ≈16 m | plain ashlar with a cornice; ref 14 |
| Pediment apex, south and east | **≈15.5-16 m** | pitch ≈ 1:4.5 (≈23°) |
| Statues | ≈2.3-2.5 m figures on ≈0.8 m blocks | Hibernia's top ≈19-19.5 m |
| Rusticated granite lower storey on the quadrants | ≈5.5 m (to the platband) | niches above: ≈3.2 m high, ≈1.6 m wide, in a ≈2.4 × 4.2 m frame |
| Railings | ≈1.9-2.0 m | including the ≈0.4 m granite plinth |

### 3.4 Colours (hex estimates)

Sampled from refs 01, 03, 05, 07, 11 and 13, then corrected by eye (overcast and sunlit shots differ by about 2 stops).

| Surface | Hex | Note |
|---|---|---|
| Portland stone (columns, entablature, balustrade, statues), lit | `#dcd8cf` | sunlit refs 01/03 sample `#e1ded8` / `#dedddf` |
| Portland, shadowed / weathered | `#a3a099` | column undersides, soffits; dark rain streaks `#7d7a74` on statues and cornices |
| Granite ashlar (upper walls), lit | `#b3ada3` | ref 01 sample `#b6aea5`; overcast ≈`#6a6863` |
| Rusticated granite (lower storey) | `#9c968c` | deep joints `#55534e` |
| Niche recess | `#7a766e` | blind; granite in shadow |
| Soffits / coffers | `#8f8c85` | |
| Railings and gates | `#1b1c1d` | black cast iron; lamp glass `#f3e2b0` |
| Doors | `#3a2e25` | panelled timber, dark varnish (ref 07 shows a dark door) |
| Slate roof | `#4d5358` | mostly hidden |
| Copper roofs / rotunda dome | `#6aa592` | verdigris; OSM "aquamarine" |
| Piazza paving and setts | `#8e8a82` | Foster Place granite setts `#6d6b67` |

The current game uses `#cfc8b6` (warm cream) for everything. It is too warm and one-toned. The building's look is **white Portland columns against grey granite walls**.

### 3.5 Six recognisable cues (checked against the photos)

1. **The long convex curve of windowless wall** wrapping each corner, with free-standing white Ionic columns, blind niches between them and a balustrade on top (refs 01, 05, 13). This is the single strongest cue.
2. **The open piazza** behind bowed black railings, with the **tetrastyle portico and pediment** carrying Hibernia above the royal arms, flanked by Fidelity and Commerce (refs 02, 04, 14).
3. **Arch pavilions** (a big arch between columns, under a pediment) where the piazza meets each curve (refs 03, 12).
4. **Gandon's deep Corinthian portico** on the footpath at the foot of Westmoreland St, facing down College St, with three statues (refs 07, 08, 15).
5. **Two-tone stone**: white Portland against grey granite, with rusticated lower walls (refs 05, 07).
6. **Context**: Trinity's Front Gate directly opposite; Grattan on the island; buses, taxis and Luas wires; **night uplighting**, and on national days coloured floods (refs 13, 14).

---

## 4. Build brief (prioritised)

### P0: roads and placement (streets.json + sites.js)

**4.1 College Green nodes.** Move them so the street slopes the right way and sits where the real kerbs are. New game coordinates are shown in brackets.

| Node | Now (lat, lon → game) | Proposed | Why |
|---|---|---|---|
| **CG0** | 53.3445, -6.2612 → (-68.1, 147.5) | **53.34430, -6.26093** → (-59.2, 163.0) | Centre of the dual carriageway at the Foster Place / Church Lane junction. It is ≈13 game m too far north now |
| **CGT** | 53.34432, -6.25955 → (-13.3, 161.5) | **53.34448, -6.25947** → (-10.5, 149.3) | The real Grafton / College Green / arm junction. ≈12 game m too far south now. This reverses the slope of the front |
| **CGM** | 53.34466, -6.25955 → (-13.3, 135.0) | **53.344684, -6.259377** → (-7.5, 133.2) | The real arm centreline (Luas tracks) |
| **CG1** | 53.345, -6.25955 → (-13.3, 108.5) | **53.344843, -6.259227** → (-2.6, 120.8) | The real Westmoreland / College St junction; 11 m east and 12 m south of the current node |
| **WM1** | 53.3458, -6.25928 → (-4.3, 46.2) | 53.3458, **-6.25905** → (+1.5, 46.2) | Real centreline x = 0; +1.5 buys room for the Lords portico (see 4.3) |

**4.2 Street fixes.**
- **College Green CG0-CGT:**
  - width 20 → **18**, with `pave` 5.
  - Optionally, split it into two one-way carriageways round an island (north 1 lane eastbound, south 2 lanes westbound), with the island carrying Davis + Four Angels (west) and **Grattan at the east end, game (-23.5, 153.7)**.
  - At minimum, move `grattan` to that point, facing west down Dame St.
- **Arm CGT-CGM-CG1:** width 15 → **12**, `pave` 3.5. It carries both Luas tracks. Mark it bus-only (`access: 'pedestrian'`-style or a new `bus` flag) if the traffic model allows.
- **Add Foster Place:** FP0 **53.34441, -6.26093** (-59.1, 154.5) → FP1 **53.34474, -6.26111** (-65.1, 128.8) → FP2 **53.34501, -6.26122** (-69.2, 107.8). It is a `lane`, width 6, `surface: 'sett'`, `access: 'destination'`, and a dead end. Add a taxi rank prop along its east kerb and 3-4 trees.
- **Add Church Lane** (optional, next area): from CG0 south, 53.34413 → 53.34371, lon ≈ -6.26090, one-way northbound.
- **Westmoreland St** SQ8-WM1-CG1: optional `oneway` northbound (general traffic), per OSM.
- **Trinity dependency:** `trinityFront` is built with `beside('CGT', 'CGC', 0, 1, …)`, so moving CGT moves Trinity. Check Trinity's front against the Burke / Goldsmith positions (game (-1.6, 142) / (-2.1, 157.3)). The Trinity researcher should confirm.

**4.3 Site for the hero.** Replace the `beside()` construction with absolute placement, as Heuston does:

```js
// docs/research/parliament-house.md: origin = centre of the piazza front (between the arm-end inner columns, on the
// colonnade line); the model's +Y (north) runs into the building; the front follows College Green's north kerb.
const boi = project(53.344605, -6.260046);            // game (-29.8, 139.3)
bankOfIreland: { name: 'Bank of Ireland', x: boi.x, z: boi.z, rot: 0.27, w: 56, d: 50, labelY: 22,
  parts: { parliament: { x: boi.x, z: boi.z, rot: 0.27 } }, view: spot('CG0', 'CGT', 0.35) }
```

- `rot` ≈ **0.27 rad (15.7°)**. That is the angle of the proposed CG0→CGT line, so the colonnade runs parallel to the kerb. The true projected front angle is 17.4° (0.30); pick 0.27-0.30 and check that the railing bow clears the kerb.
- The `reserved` / `solid` footprint must follow the actual outline (the quadrants), not a 56 × 50 box. Several smaller boxes along the curve are fine.
- **Fit constraints**, to verify with `tools/.../footprints.mjs`:
  - the front railing bow is ≥2 m from the College Green north kerb
  - the SE quadrant and the SE corner block clear the arm's pavement
  - the **Lords portico column line is ≥2.5 m inside Westmoreland St's west kerb** (the columns stand on the footpath, so no gap is wanted beyond the footpath itself)
  - the west portico is ≥1 m from Foster Place's east kerb
- Checked numerically: with plan scale **0.45 along the front × 0.62 deep** and rot 0.30, the west portico lands at (-62.6, 123.9) and the Lords portico columns at x ≈ -10…-13.6. Both clear Westmoreland (moved to x +1.5, width 14, kerb at -5.5) and Foster Place (x ≈ -65…-69).

**4.4 Retire** the procedural `bankOfIreland()` as the fallback only (as `heuston()` is), and update `hud.js`: "Irish Parliament House (1729), Bank of Ireland since 1803: Pearce's piazza, Gandon's Corinthian Lords portico".

### P1: hero GLB (Blender, `tools/blender/build_parliament.py`, using `kit.py`)

**Scale.** Build in real metres in the (u, v) frame: X along the front (east), Y into the building (north), origin at the piazza front centre on the colonnade line. Then `kit.finish(objs, (0.45, 0.62), 0.9)`.
- **0.45 E-W**, not the map's 0.5. Real road widths leave no more room between Foster Place and Westmoreland St (open question 1).
- **0.62 N-S**, which sits between the map's 0.7 in this band and the usual 0.5-0.6.
- **0.9 height**, so the colonnade reads grand against Trinity's 15-17 m game front.
- **Pre-fatten** the columns ×1.25 in X only, so they don't turn into sticks after the 0.45 squash. After scaling they come out ≈0.62 m diameter at ≈1.6 m spacing, leaving ~1 m clear.
- **Keep every column count.** The count is the recognisability.

**Budget ≈ 12-13k triangles** (ceiling 15k). One file, `parliament.glb`, node `parliament`.

| Part | Tris | Modelling notes |
|---|---|---|
| Columns ×56 (+8 engaged) | ~3,600 | Shaft: 12-sided prism with no caps, slightly tapered. Base: torus as an 8-sided stepped box on a square plinth. **Ionic capital**: a flat abacus box plus a two-sided volute decal quad front and back. **Corinthian** (Lords portico): a flared 8-sided bell plus an acanthus decal band. About 55 tris each |
| Entablature over the colonnade and quadrants | ~1,800 | Three stepped bands (architrave, frieze, cornice with overhang) extruded along the path. The quadrant arcs use **16 segments each**, the straights 1 segment. Dentils go in the texture |
| Quadrant screen walls ×2 | ~900 | Convex arc, column-line radius ≈32 m (west 31, east 35; use the OSM fit per side), sweep ≈75°, wall face ≈1.0 m behind the column centres. Granite plinth, rusticated lower storey (texture), projecting platband, ashlar upper storey. **Niches and frames as decals** (one per bay, between columns) with a real 0.25 m cornice box over each frame |
| Balustrade | ~900 | Along the quadrants, over the arch pavilions and the portico flanks. A continuous base and rail with pedestals every 2 bays (boxes); **the balusters are an alpha decal strip**, as the Heuston balustrade plan intends |
| Piazza | ~1,200 | Floor slab +0.8 m with 3 steps (front and inner edges). Back wall with 3 doors (decal). **Coffered soffit** under the colonnade roof (one quad, coffer decal). Arm returns. The main block rises behind to ≈16 m as a plain attic with a cornice |
| South portico | ~450 | 4 columns (in the column count), projecting entablature, pediment (raking cornices as boxes, tympanum quad with the **royal arms decal**), statue plinths at the apex and both base corners |
| Arch pavilions ×2 | ~600 | Pier block, **real round-arched opening** (12-segment barrel, open to the sky / quadrant passage: visible in refs 02, 03), 2 columns, pediment facing south |
| Lords portico | ~900 | 8 Corinthian columns (6 + returns), a **deep porch (≈10 m real)** with coffered ceiling quad, pediment with plain tympanum, 3 statue plinths; the wall behind with blind arches (rusticated) and pedimented niches (decals) |
| Foster Place portico | ~350 | 4 Ionic columns, shallow (4.2 m real) porch, plain pediment, no statues |
| SE corner block, the east front north of the portico, the west front, the north-end triumphal arches | ~700 | Ashlar walls with niche and roundel decals; each triumphal arch is a decal + 2 engaged half-columns + a balustrade |
| Statues ×6 | ~900 | Proxies about 150 tris each: robed figure (tapered 6-sided body, head sphere, 1-2 limb boxes), plus attributes: Hibernia with spear and harp, Fidelity hand on breast, Commerce with anchor; Fortitude, Justice with scales, Liberty with pole. Portland colour with rain-streak AO |
| Roofs and rear massing | ~700 | Slate hipped roof over the front ranges (mostly hidden). **Copper dome over the east rotunda**, 16 segments at OSM (33.6, 15.9) real, ≈8 m diameter, visible from Westmoreland St. Copper gabled roof over the cash office |
| Railings (Kennan) | ~500 | Granite plinth (box strip), **alpha railing decal** (spear-top bars), along the front bow, the quadrants and the east front north of the portico; 2 gate piers with **black lamp standards** (lantern glass decal lights at night) |

**Atlas (decal) regions to add.** Paint them in `heroes.js` `paintDecals`, in the free area of the 1024 atlas (y 704-1024 is unused), or give the building its own atlas as the Ha'penny does:

| Region | Size (px) | Content |
|---|---|---|
| `niche` | 128 × 256 | round-headed blind niche (shadowed recess, keystone, impost) inside a rectangular architrave frame; the cornice or pediment goes on as geometry |
| `roundel` | 128 × 128 | Portland roundel with hanging swags |
| `ionic` | 128 × 64 | volute pair and egg-and-dart, alpha-cut |
| `corinth` | 128 × 96 | acanthus bell, alpha-cut |
| `arms` | 256 × 128 | royal arms (lion, unicorn, crown, shield) for the south tympanum |
| `balust` | 256 × 64 | alpha baluster run |
| `railing` | 256 × 64 | alpha black spear-top railing with a top rail and dog-bars |
| `coffer` | 128 × 128 | coffered soffit square |
| `rustic` | tile | rusticated granite (deep horizontal joints, 0.6 m courses): a new tiled stone material, `stoneTile(256, '#9c968c', 5, 0.1, 'rgba(60,58,54,0.7)')` with thicker joints |

Doors can reuse `door`, and the Lords portico's blind arches can reuse `arcade`.

**Materials.** Use `pr_portland` (new tile: `#dcd8cf`, fine joints), `pr_granite` (existing granite, colour `#b3ada3`), `pr_rustic`, `pr_slate`, `pr_copper` (`#6aa592`), `pr_dark` (railings), `pr_decal`. Add `portland` and `rustic` entries to `stoneMaterials()`. Bake AO to vertex colour as usual. The quadrant columns' AO against the wall behind is what makes the curve read.

**Night lighting.** In reality (refs 13, 14, 15, and the `Westmoreland Street Dublin 02` dusk shot):
- **ground-mounted warm-white uplighters** at the foot of every quadrant column and inside the piazza, washing the columns and walls; the balustrade fades to dark above
- lanterns either side of the Lords portico doors and on the gate piers
- the Lords portico uplit warm amber from the footpath
- on national days (St Patrick's, and others) the piazza is floodlit **green**

For the game:
1. Add an emissive "wash" to `pr_portland` at night: 0.12-0.2 × `#ffe6c4`. Modulate it by a vertex-colour gradient (1 at ground, 0.2 at the cornice), stored in a second colour attribute or in the AO alpha, so the bottoms glow brighter.
2. Lantern decals get `decal.emissiveIntensity` through `setStoneNight`.
3. Put 6-8 **light-pool decals** on the pavement under the quadrant columns (the Temple Bar lantern pools are the model).
4. Optional easter egg: on 17 March, tint the piazza wash green `#2bd46a`.

### P2: dressing and context

- **Kennan railings and gates**, if they are not in the GLB: the bowed front, the gate with lamp piers, and the quadrant runs.
- **The College Green island** with the Thomas Davis monument (granite figure plus a bronze Davis, the Four Angels fountain in front) at the west end and **Grattan at the east end**. Remove the planes from the south footpath and put **3 trees on the north footpath at the west quadrant** (OSM `5050667038/40/41`) and 2 in Foster Place.
- A **two-way cycle track** strip along the front (asphalt, red or green paint).
- **A taxi rank** on the north carriageway in front of the piazza and east quadrant, and one in Foster Place. Bus stops 4521 and 4522 on the south carriageway. Heritage lamps (the ornate College Green standards in ref 12).
- **Luas:** in the GLB-adjacent context, both tracks on the east arm with OCS span wires from rosettes and poles (refs 13, 15). The route and stop fixes belong to a separate Luas pass (§1.3 item 13).
- **Foster Place:** setts, planters, a taxi rank, and the Victorian Exchange Buildings opposite (a generic stone front). The BOI Arts Centre / "The Bank" bar is at the Foster Place hook.

**Textured:** the whole hero (decals, stone tiles). **Generic:** Foster Place buildings, the Westmoreland St frontages, the island monuments (simple proxies).

**Triangle budget for the area:** hero ≈12.5k, Davis / Grattan / fountain proxies ≈0.8k, railings (if separate) ≈0.5k, dressing ≈0.5k. **Total ≈14k.**

---

## 5. Open questions

1. **Plan scale.**
   - The real building needs 122 m E-W between Foster Place and Westmoreland St. With real-width roads the game has ≈54 game m there, which forces **≈0.45 E-W**. N-S fits at 0.62-0.7.
   - Is an anisotropic hero acceptable (0.45 × 0.62), with the quadrants becoming slightly elliptical? The alternative is a uniform 0.5 with Foster Place narrowed to 5 and Westmoreland nudged 3-4 m east.
   - My recommendation: anisotropic 0.45 / 0.62 / 0.9, with pre-fattened columns.
2. **Exact heights.** No surveyed elevation was found. Column ≈10.5 m, cornice ≈12.8 m, balustrade ≈14.8 m and pediment apex ≈15.5-16 m are photogrammetric (±0.7 m). Gilbert's *An Account of the Parliament House* (1896, on Commons as PDF scans) may give feet; it was not read.
3. **East quadrant column count.** OSM maps 11 (the west has 12). The design is symmetrical, so build 12 unless a straight-on photo counts 11.
4. **Lords portico return columns.** Refs 07 and 08 show one column on each return behind the corner columns (6 + 2). Confirm whether there are engaged responds against the wall; if so, add them as half-columns.
5. **College Green plaza.** Dublin City Council plans a pedestrian plaza from Trinity to George's St (planning application summer 2026, closure hoped for end 2027, finish 2029-30). Keep today's traffic layout? My suggestion: yes, and make the island and cycle track easy to swap later.
6. **Dual carriageway.** Should College Green become two one-way ways round an island (true to life, and it gives Grattan and Davis a proper home), or stay one 18 m way? This affects AI traffic and the `grattan` site.
7. **Trinity.** Moving CGT north (≈12 game m) moves `trinityFront`. It needs a joint check with whoever owns Trinity's research. The Burke and Goldsmith statues (OSM) mark the real Trinity front at game x ≈ -2.
8. **Statue names on the east portico.** NIAH says Fortitude, Justice, Liberty; Archiseek says Wisdom, Justice, Liberty. This only matters for props' attributes and the HUD.
9. **Luas Green Line.** The `luasGreen` stops "Trinity" (CGM) and "Westmoreland" (WM1) are both misplaced (§1.3 item 13). Is that in scope here, or for a Luas pass?

## Sources

- OSM via Overpass (ODbL): `data/osm/parliament-house.json`. Relation 3676582 (Bank of Ireland), building:parts `1482855306-319`, `1482872834-843`, `1482875449-461`, `666564428`, `1482875970`; railings `357697756/757/759`; highways as cited.
- [NIAH 50020250, Bank of Ireland, College Green](https://www.buildingsofireland.ie/buildings-search/building/50020250/bank-of-ireland-college-green-dublin-2-dublin-city): the description and appraisal quoted above.
- [Parliament House, Dublin, Wikipedia](https://en.wikipedia.org/wiki/Parliament_House,_Dublin)
- [Archiseek, 1803 Bank of Ireland, College Green](https://www.archiseek.com/1803-former-houses-of-parliament-bank-of-ireland-college-green-dublin/)
- [Andrew Cusack, The Houses of Parliament, Dublin](https://www.andrewcusack.com/2010/parliament-house-dublin/): statue placement.
- [Library Ireland, Atlas: College Green](https://www.libraryireland.com/Atlas/Dublin-College-Green.php): "147 feet in extent".
- [CraftValue, Former Parliament House](https://craftvalue.org/parliament-house-college-green/): Portland drum construction.
- College Green plaza: [RTÉ 2026-02-11](https://www.rte.ie/news/dublin/2026/0211/1557986-college-green/), [Irish Times 2026-05-27](https://www.irishtimes.com/ireland/dublin/2026/05/27/application-for-college-green-plaza-to-be-submitted-by-summer-amid-strong-public-approval/), [TheJournal 2026-05](https://www.thejournal.ie/college-green-pedestrianisation-plans-council-dublin-7053713-May2026/)
- Rowland Omer's 1767 plan in J.T. Gilbert, *An Account of the Parliament House, Dublin* (1896), via Commons (ref 16).
- Wikimedia Commons / geograph images as listed in §2.
