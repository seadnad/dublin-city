# O'Connell Street, College Green and Dame Street monuments (`monuments`): Phase 1 research

Scope: the statues and monuments on the O'Connell Street median (O'Connell Monument, William Smith O'Brien, Sir John Gray, Jim Larkin, the Spire, Father Mathew, the Parnell Monument), the median itself (paving, trees, lamps), and the College Green / Dame Street group (Henry Grattan, the Thomas Davis memorial and Four Angels fountain, Molly Malone on Suffolk Street, plus the Burke/Goldsmith and Thomas Moore statues that sit on the same axis).

- Raw OSM: `data/osm/monuments.json`. Overpass `out geom`, snapshot `timestamp_osm_base` 2026-09-28T22:49:00Z, 553 elements. Queries:
  - `historic~memorial|monument`, `tourism=artwork`, `man_made~obelisk|column|monument`, `amenity=fountain` in bbox **S 53.3428, W -6.2690, N 53.3535, E -6.2570**
  - `natural=tree`, `highway=street_lamp`, `area:highway=*` and pedestrian/footway `area=yes` polygons in two tight boxes: O'Connell St (53.3472,-6.2625 to 53.3530,-6.2585) and College Green (53.3430,-6.2640 to 53.3455,-6.2585). 187 trees and 262 lamp nodes are in there, for dressing.
  - Road geometry used for §1 (O'Connell St carriageways, quays, College Green lanes) came from a second query that was not saved (the relevant way IDs are quoted inline).
- References: `refs/monuments/`, 20 images from Wikimedia Commons and Geograph Ireland (credits in §2, machine-readable in `refs/monuments/sources.json`). No Google imagery.
- Game coordinates come from re-implementing `project()` in `src/world/geo.js` (origin 53.34727/-6.25915, SCALE 0.5, both stretch bands). O'Connell Street lies east of the E-W stretch band and north of the N-S band, so it is a plain 50% projection shifted north by the N-S band; College Green is at the east edge of both bands (unstretched in x). **All game (x, z) below include this.**
- Tags: **VERIFIED** = from a named source (NIAH, Wikipedia, DCC, OSM) or measured directly off OSM geometry. **REF** = read off the reference photos by me. **EST** = my estimate.

---

## 1. Map data: where each monument really is, and what the game has now

### 1.1 Positions (VERIFIED, OSM nodes)

O'Connell Street runs on a bearing of about **345° (15° west of north)**. "Chainage" is the distance along the game's O'Connell Street polyline NQ8 → OC1 → OC2 → OC3 → OC4 (NQ8 = 0, OC1 = 49.1, OC2 = 118.3, OC3 = 190.4, OC4 = 273.0 game m). "Off" is the sideways offset from the game centreline; all are within 1 m except the Parnell Monument.

| Monument | OSM | lat, lon | Real distance N of O'Connell Mon. | Game (x, z) via `project()` | Game chainage |
|---|---|---|---|---|---|
| **O'Connell Monument** | node 603833917 | 53.347710, -6.259343 | 0 | (-6.4, -69.0) | **-5 (in the quay junction; see 1.3)** |
| William Smith O'Brien | node 6279642664 | 53.348245, -6.259582 | 62 m | (-14.4, -98.8) | 25.9 |
| Sir John Gray | node 1348371039 | 53.348526, -6.259703 | 94 m | (-18.4, -114.4) | 42.1 |
| (Abbey St junction = OC1) | | 53.34865, -6.25974 | 108 m | (-19.6, -121.3) | 49.1 |
| Jim Larkin | node 603833916 | 53.349091, -6.259945 | 159 m | (-26.4, -145.9) | 74.5 |
| The Spire | way 96578181 | 53.349801, -6.260255 | 241 m | (-36.7, -185.4) | 115.4 (game has it on OC2, 118.3) |
| **Father Mathew (since 2018)** | node 13254558101 | 53.350010, -6.260338 | 264 m | (-39.5, -197.0) | 127.3 |
| Father Mathew (pre-2016 site, stale OSM node) | node 603833919 | 53.351049, -6.260822 | (390 m) | (-55.6, -254.9) | 187 (do **not** use) |
| **Parnell Monument** | node 906593798 | 53.352594, -6.261477 | 562 m | (-82.8, -340.9) | 273 (at OC4, 5.4 m W of the line, **in the Parnell St junction**) |
| **Henry Grattan** | node 3632752127 | 53.344421, -6.259858 | – | (-23.5, 153.7) | – |
| Four Angels fountain (Davis memorial) | node 298085721 | 53.344370, -6.260502 | 43 m W of Grattan | (-44.9, 157.6) | – |
| Thomas Davis statue | node 1348371037 | 53.344355, -6.260654 | 53 m W, 7 m S of Grattan | (-50.0, 158.8) | – |
| Molly Malone | node 2980297988 | 53.343746, -6.260897 | 69 m W, 75 m S of Grattan | (-58.0, 196.1) | – |
| Edmund Burke (Foley, 1868) | node 2648528098 | 53.344571, -6.259197 | Trinity forecourt, N of gate | (-1.6, 142.0) | – |
| Oliver Goldsmith (Foley, 1864) | node 2648528099 | 53.344374, -6.259214 | Trinity forecourt, S of gate | (-2.1, 157.3) | – |
| Thomas Moore | node 1348371015 | 53.345153, -6.258902 | College St / Westmoreland St island | (8.2, 96.6) | – |
| (Trinity Front Gate) | | 53.34435, -6.25895 | 64 m E of Grattan | (6.6, 159.2) | – |

**Father Mathew moved.** He was removed in 2016 for Luas Cross City and reinstated in **2018 at a new site just north of the Spire** (Wikipedia O'Connell Street; Visit Dublin; OSM node 13254558101, added recently). OSM still has the old node 603833919 near Cathal Brugha Street, which is stale. VERIFIED.

**Molly Malone moved** from the foot of Grafton Street to **Suffolk Street, outside the former St Andrew's Church (tourist office)** in July 2014, for Luas Cross City works. VERIFIED. Suffolk Street is **not in the game's street graph**; her position falls inside a filler block between Dame St and Wicklow St.

Other items on the axis that are *not* statues: the "Meeting Place" (Hags with the Bags) bronze on Lower Liffey St; the James Joyce statue on North Earl St at the O'Connell St corner (53.349912, -6.259847); the Cúchulainn inside the GPO (indoor); the Four Angels are part of the Davis memorial (below). None of them is a priority.

### 1.2 The median and islands (VERIFIED from OSM polygons)

| OSM polygon | What | Real extent | Real width (⊥ to street) | Holds |
|---|---|---|---|---|
| way 41640630 (`highway=pedestrian`, paving stones) | **O'Connell Monument island** | 53.34762–53.34835 (≈ 82 m long) | **9.2 m** at the monument, 8.7 m, 8.1 m at the north end | O'Connell Monument, Smith O'Brien |
| way 41640635 (`area:highway=pedestrian`, paving stones) | **the main median** | 53.34840–53.35249 (≈ 455 m) | **7.5–7.8 m** from Abbey St to the Spire and Father Mathew; **narrows to 3.1–4.9 m north of 53.3503** (O'Connell St Upper, where the Luas runs alongside) | Gray, Larkin, Spire (on its own paved disc, way 42638929, 7 m), Father Mathew |
| way 548794186 (`highway=pedestrian`) | **Parnell Monument island** | 53.35251–53.35262 | irregular, ≈ 14.5 x 11.8 m bounding box | Parnell Monument (cobbled, bollards) |
| way 314630988 (`highway=pedestrian`, asphalt) | **Grattan island** (College Green, east end) | 53.34436–53.34460, -6.25990 to -6.25950 | ≈ 27 x 27 m bounding box, a curved triangle | Grattan, the two sea-horse lamp standards |
| way 314630989 (`highway=pedestrian`, paving stones) | **Davis plaza** (College Green, central island) | -6.26069 to -6.26001 | ≈ 46 m E-W x 11 m, lens-shaped | Davis statue (W end), Four Angels fountain (E of statue), granite tablets |

Game coordinates of those islands (polygon vertices through `project()`):
- Grattan island: (-23.9,158.6) (-16.5,154.6) (-13.7,147.9) (-11.8,139.9) (-17.6,145.0) (-24.5,149.4) (-24.5,157.8)
- Davis plaza: (-49.9,156.2) (-30.6,153.1) (-28.5,154.5) (-28.5,156.8) (-34.2,158.7) (-49.1,160.6) (-51.3,158.6)
- Parnell island: (-86.4,-341.0) (-82.2,-342.3) (-79.3,-340.9) (-80.4,-338.6) (-90.1,-336.4) (-87.0,-340.1)

**Real carriageways around them (OSM):** O'Connell St Lower is two 2-lane one-way carriageways either side of the median (tertiary, e.g. ways 3787955, 369897004, 1322636036–39). At College Green the Davis plaza is a central island between an eastbound lane on the north (way 4476041, towards Grattan and Westmoreland St) and a 2-lane westbound carriageway on the south (ways 907988495, 1491613583, towards Dame St). The Grattan island sits at the east end where traffic splits for Westmoreland St, College St and Grafton St. Private cars have been banned from College Green at all times since May 2023 (buses, taxis, cyclists only). VERIFIED (Wikipedia College Green).

### 1.3 What the game has now, and how far it is from reality

**Placement (src/world/landmarks.js `oconnellMonument()`, src/world/roads.js `buildMedian()`, src/world/sites.js `grattan`).**

- **The O'Connell Monument** is built at `NQ8 + 16 m` towards OC1: game (-10.9, -89.5), local +z facing south (the bridge). That is *roughly* right in game terms, but for a reason worth knowing. The real monument node projects to (-6.4, -69.0), 5 m **south** of NQ8 and inside the game's quay junction, because NQ8 (the quay centreline) was nudged about 13 game m north of the real quay line to keep the compressed Liffey readable. So the monument has to be placed **relative to the game junction, not from its lat/lon**. In reality the island's south tip is at the quays' north kerb, and the monument centre is about 10 m further north (VERIFIED from OSM). In the game that gives: `NQ8 + (quay half-width 5.5 + crossing ≈ 2.5 + base half-width ≈ 3.7 + 1)` ≈ **NQ8 + 12.5–13.5 m**, i.e. about (-10.0, -86.5). The current 16 m is 2.5–3.5 m too far north. Not dramatic.
- **There is no median between NQ8 and OC1.** `buildMedian()` skips that run ("the monument island is separate"), so the O'Connell Monument is a lone 5.4 x 5.4 m collider in the carriageway with no island, no paving and no crossing. Really, an 82 m by ≈ 9 m granite-paved island carries both the O'Connell Monument and Smith O'Brien, and Gray stands on the next median north of it.
- **The rest of the median** is a 6 m wide (±3 m) raised strip, trimmed 2 m back from each junction clearance. Real: 9.2 m at the monument, 7.5–7.8 m through O'Connell St Lower, 3–5 m in O'Connell St Upper. Width is 20–25% narrow in the Lower street, wide in the Upper.
- **Median trees** (`buildTrees()`): London planes every 13 m along the whole median (skipping 12 m around the Spire), scale ≈ 0.79. **Real (VERIFIED, Wikipedia/Irish Times on the 2006 IAP):** all the old London planes were removed in 2003–06; the plan put **Oriental planes along the footpaths** (46 from the Spire to Parnell) and **16 ornamental mountain ash (rowan) in the median**. REF: refs 06 and 07 (August 2013) show small trees with orange-red berries on the median north of the monument, and big planes along the footpaths. So the median trees should be **smaller rowans, spaced wider**, and the big planes belong on the footpaths.
- **Lamps**: O'Connell Street gets the generic "modern" pole (7.6 m, one arm) every 32 m at each kerb, and nothing on the median. REF (refs 06, 07, 10): the IAP "custom-designed lampposts" are tall slender silver-grey poles, ≈ 10–12 m (EST), with **one or two arms at different heights** (the higher one longer) and dish-shaped heads (the 2009 dusk photo listed in §2, and refs 06, 07); there are also very tall slim masts. Plus traffic signals, Luas overhead-line poles and span wires (ref 10 shows the wires right over the monument), and signal heads on the monument island (ref 01). EST: exact design not researched further; open question 6.
- **Henry Grattan** (`grattanIsland()`, `sites.grattan`) is at the midpoint of CG0–CGT: game (-40.7, 154.5). **Real (-23.5, 153.7): the game statue is 17 game m (≈ 34 m real) too far west**, standing almost exactly where the **Davis memorial** should be (-50 to -29). Its island is a 3.2 x 16 m kerbed strip oriented along the road. Real: a curved-triangle island ≈ 13 x 19 game m at the east end, next to the CGT junction.
- **Missing entirely:** Smith O'Brien, Gray, Larkin, Father Mathew, the Parnell Monument, the Davis memorial and Four Angels fountain, Molly Malone, Thomas Moore. Burke and Goldsmith exist as generic lumps in front of Trinity (`trinity()`; see below).

**Models.**

| Game element | What it is now | Reality | Gap |
|---|---|---|---|
| `oconnellMonument()` | 5 x 1.2 x 5 m granite box; granite cylinder r 2.3–2.5, 3.2 m (to 4.4 m); four `statue()` lumps (s 0.9, ≈ 2.2 m) at radius 2.9 as the Victories; **plain bronze cylinder** r 1.6–1.9, 4.5 m tall (4.4 → 8.9 m) as the frieze; granite cylinder r 1.1, 2.5 m (→ 11.4); `statue()` s 1.5 on top (→ ≈ 15.0 m). Collider 5.4 m square. | **12.2 m (40 ft)** (VERIFIED, Wikipedia). Three granite steps on a ≈ 7.3 m footprint, a ≈ 6 m square granite block to ≈ 2.7 m, four **winged** seated Victories on dark blocks at the corners, a 2.7 m granite drum with shields and "O'CONNELL" to ≈ 5.3 m, the **bronze frieze** of 30+ high-relief figures (≈ 2.3 m tall) round a ≈ 2.9 m drum, a moulded granite cornice and cylindrical pedestal to ≈ 9 m, and the **3.2–3.6 m cloaked O'Connell** facing south (REF, measured off ref 01, §3.1). | **3 m too tall**, frieze **twice too tall and plain**, base **too small and too low** (1.2 vs 2.7 m), Victories **wingless** pills with no bases, no steps, no shields or wreaths, no island. From the car it reads as a stack of cylinders. |
| `statue(x,y,z,s,mat)` helper | 0.9s x 0.5s x 0.9s box + 8-sided tapered cylinder r 0.28s–0.40s, 1.5s tall + 8x6 sphere r 0.22s at 2.2s. ≈ 2.4s tall, ≈ 140 tris. **No arms, no cloak, no facing.** | – | Used 17 times: O'Connell (5), Grattan, GPO roof (Hibernia, Mercury, Fidelity), Custom House (4 + Commerce), Trinity (Burke, Goldsmith), Castle gate (Justice), Bank of Ireland. A shared statue-proxy kit would upgrade all of them at once (§4, P1). |
| `M.bronze` | `0x4f5b47`, roughness 0.45, **metalness 0.85**, with screen-space reflections | Near-black bronze with green-grey verdigris streaks, matte (§3.4) | **Too light, too green, far too shiny.** At metalness 0.85 it mirrors the sky and reads as polished brass/steel. |
| `M.granite` | `0x9d9a93`, stone texture | O'Connell's Dalkey granite is a pale silver-grey, ≈ `#c4c1b9` lit (§3.4) | 20% too dark and too warm for this monument (fine for others). |
| `grattanIsland()` | 3.2 x 16 m kerb strip, 2.2 x 3.4 m granite box, cap, `statue()` s 1.25 (≈ 3 m). Total ≈ 7.4 m. | Bronze Grattan in tail coat and breeches, right arm thrust up and forward mid-speech, **facing east to Trinity's Front Gate (bearing ≈ 97°)**, on a square dressed **limestone** pedestal with a stepped base and scrolled brackets; two original **sea-horse (hippocampus) gas lamp standards** on the east side (VERIFIED, NIAH 50020253; Come Here To Me) | Wrong place (34 m W), no facing, no pose, granite not limestone, no lamps, island shape wrong. |
| `spire()` | "bronze" cylinder r 1.4–1.5, 3 m + stainless cone r 1.4 → 0.06, 118 m + a 12 m glowing tip (106–118 m). Total 121 m. Placed on node OC2. | **120 m** (Wikipedia; OSM `height=121.2`), 3 m diameter at the base tapering to 15 cm, shot-peened stainless steel, the **lower 10 m bead-blasted in a textured pattern**, **the top 10–12 m perforated with 11,884 holes lit by LEDs**, base floodlit at dusk (VERIFIED, Wikipedia). It rises straight out of the paving on a small paved disc; **there is no bronze plinth**. | Height and taper are right. The 3 m "bronze" drum at the foot is invented. Its site is 3 m chainage north of the OSM point (on OC2), negligible. Fine as is. |
| Trinity Burke/Goldsmith | 1.6 x 2.2 m granite box + `statue()` s 1.1 either side of the gate | Foley bronzes (1864/1868) on granite pedestals inside the railings, dark bronze | Acceptable; upgrade via the kit. |

**What a driver sees today:** coming off O'Connell Bridge, a 15 m grey-green column with a blob on top sits in the open carriageway; then an empty 6 m median with evenly spaced big planes all the way up, the Spire, and nothing at the top of the street (Parnell is missing). In reality the view north from the bridge is framed by the dark, busy silhouette of the O'Connell Monument with its four spread-winged Victories, backed by rowans and footpath planes, with the white Portland figures of Smith O'Brien and Gray, the arms-up Larkin and the Spire lined up behind, and the Parnell obelisk closing the view at the top.

---

## 2. Reference images (`refs/monuments/`)

All come from Wikimedia Commons or Geograph Ireland at ≈ 800–1,000 px (Geograph at its 800 px size or smaller original), CC0 / CC BY / CC BY-SA / public-domain-equivalent. None come from Google. Credit these if any are shipped. `refs/monuments/sources.json` has the same data.

| File | Source | Author | Licence | Date | What it shows |
|---|---|---|---|---|---|
| 01-oconnell-south-elevation.jpg | [O'Connell Monument by John Henry Foley and Thomas Brock.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_by_John_Henry_Foley_and_Thomas_Brock.jpg) | Yair-haklai | CC0 | 2022-08-07 | **Key elevation**, near-frontal from the south kerb: steps, base, two Victories (Fidelity with wolfhound on the right = SE), drum with shield and O'CONNELL, frieze with Erin, cornice, figure. Used for the dimension table |
| 02-oconnell-victory-bullet-holes.jpg | [O'Connell Monument angel 2.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_angel_2.jpg) | Oliver Gargan | CC BY-SA 4.0 | 2017-08-25 | Victory head and wings close-up, laurel crown, **bullet holes** in the breast, sword hilt in hand, shield on the drum, wave-scroll moulding |
| 03-oconnell-victory-courage.jpg | [Dublin-12-O'Connell-Denkmal-Engel-2017-gje.jpg](https://commons.wikimedia.org/wiki/File:Dublin-12-O%27Connell-Denkmal-Engel-2017-gje.jpg) | Gerd Eichmann | CC BY-SA 4.0 | 2017-10-06 | **Courage**: seated, wings half spread, serpent coiled at her feet, fasces; the dark block she sits on; harp shield on the drum |
| 04-oconnell-frieze-and-figure.jpg | [O'Connell Monument upper section.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_upper_section.jpg) | AwOiSoAk KaOsIoWa | CC BY-SA 3.0 | 18 Feb (year not given) | **Frieze close-up** (Erin with raised arm, bishop, figures in high relief) and the cloaked O'Connell with scroll and books; cornice and upper pedestal mouldings |
| 05-oconnell-figure-bullet-holes.jpg | [O'Connell Monument top closeup 1.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_top_closeup_1.jpg) | Oliver Gargan | CC BY-SA 4.0 | 2017-08-25 | O'Connell head and torso: bronze colour, verdigris streaks, bullet holes in the chest |
| 06-oconnell-driver-view-from-bridge.jpg | [O'Connell Monument Junction.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_Junction.jpg) | Jean Housen | CC BY-SA 3.0 | 2013-08-07 | **Driver's eye from the north end of O'Connell Bridge**: monument on its island past the yellow box, Bachelors Walk corner, footpath lamps, median rowans |
| 07-oconnell-from-bridge-sw-corner.jpg | [O'Connell Monument and pedestrian crossing.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_and_pedestrian_crossing.jpg) | Jean Housen | CC BY-SA 3.0 | 2013-08-07 | From the bridge's west footpath: monument, island, signals, **orange-berried rowans on the median**, planes on the footpaths, lamp poles |
| 08-oconnell-victory-fidelity.jpg | [O'Connell Monument angel 1.jpg](https://commons.wikimedia.org/wiki/File:O%27Connell_Monument_angel_1.jpg) | Oliver Gargan | CC BY-SA 4.0 | 2017-08-25 | **Fidelity** with the Irish wolfhound, wing and drapery detail |
| 09-oconnell-from-north.jpg | [O'Connell Monument](https://www.geograph.ie/photo/6411171) | N Chadwick | CC BY-SA 2.0 | c.2018 | From the north (behind the figure): the island, railings and bins at the north end, Luas rails and wires, the quays beyond |
| 10-oconnell-2025.jpg | [Dublin - O'Connell Monument.jpg](https://commons.wikimedia.org/wiki/File:Dublin_-_O%27Connell_Monument.jpg) | P. Hughes | CC BY 4.0 | 2025-06-16 | **Current state (2025)**: SW three-quarter view, Luas rails and overhead wires, CCTV/signal pole on the island, trees behind, bollards |
| 11-smith-obrien.jpg | [William Smith O'Brien statue](https://www.geograph.ie/photo/4589861) | Michael Dibb | CC BY-SA 2.0 | c.2015 | William Smith O'Brien: white Portland figure, arms folded, 4-tier granite base and inscribed pedestal |
| 12-john-gray.jpg | [John Gray Monument](https://www.geograph.ie/photo/6411162) | N Chadwick | CC BY-SA 2.0 | c.2018 | Sir John Gray: pale stone figure, hand on chest, stepped granite base and pedestal; the Spire behind |
| 13-larkin.jpg | [Jim Larkin Statue and the Spire of Dublin (12893828254).jpg](https://commons.wikimedia.org/wiki/File:Jim_Larkin_Statue_and_the_Spire_of_Dublin_(12893828254).jpg) | Tony Webster from Portland, Oregon, United States | CC BY 2.0 | 2013-10-12 | Jim Larkin: right arm up, left arm out, tapered granite pedestal with gilt JIM LARKIN 1874-1947; Clerys and the Spire |
| 14-father-mathew.jpg | [Statue of Father Mathew, Dublin](https://www.geograph.ie/photo/1681546) | Philip Halling | CC BY-SA 2.0 | c.2009 | Father Mathew (at his pre-2016 site): friar's habit, right arm raised, buttressed limestone pedestal |
| 15-parnell-from-south.jpg | [Parnell Monument](https://www.geograph.ie/photo/6411121) | N Chadwick | CC BY-SA 2.0 | c.2018 | **Parnell Monument** from the south: obelisk, tripod and flame, gilt inscription and harp, statue, festoon band, bollards, cobbled island |
| 16-parnell-statue-and-harp.jpg | [Charles Stewart Parnell Monument.jpg](https://commons.wikimedia.org/wiki/File:Charles_Stewart_Parnell_Monument.jpg) | Kellyd45 | CC BY-SA 4.0 | 2016-09-02 | Parnell statue (arm outstretched, draped table) against the obelisk; gilt inscription, harp and Irish blessing |
| 17-grattan-and-seahorse-lamps.jpg | [Grattan Statue, Dublin.jpg](https://commons.wikimedia.org/wiki/File:Grattan_Statue,_Dublin.jpg) | Sheila1988 | CC BY-SA 4.0 | 2022-03-20 | **Grattan**: right arm thrust up, tail coat, limestone pedestal with scroll brackets; the black cast-iron **sea-horse lamps**; island planes; Bank of Ireland behind |
| 18-four-angels-heralds.jpg | [The Four Angels memorial fountain, Dublin](https://www.geograph.ie/photo/7821540) | Meirion | CC BY-SA 2.0 | c.2024 | **Four Angels** (Davis memorial fountain): elongated crowned heralds with trumpets on the round granite platform; planes |
| 19-davis-fountain-college-green.jpg | [Four Angels Fountain against facade of Bank of Ireland, College Green, Dublin (14167330920).jpg](https://commons.wikimedia.org/wiki/File:Four_Angels_Fountain_against_facade_of_Bank_of_Ireland,_College_Green,_Dublin_(14167330920).jpg) | Sean MacEntee from Monaghan, Ireland | CC BY 2.0 | 2014-06-05 | The Davis fountain in context: heralds and jets in the granite-walled basin with relief panels, in front of the Bank of Ireland colonnade |
| 20-molly-malone-suffolk-st.jpg | [Statue of Molly Malone on St Andrew's Street - Statut de Molly Malone sur à St Andrew's Street.jpg](https://commons.wikimedia.org/wiki/File:Statue_of_Molly_Malone_on_St_Andrew%27s_Street_-_Statut_de_Molly_Malone_sur_%C3%A0_St_Andrew%27s_Street.jpg) | ESC0601 | CC BY 4.0 | 2025-05-14 | **Molly Malone** on Suffolk St: brown bronze, polished chest, two-wheeled barrow with baskets, granite plinth, St Andrew's granite rubble wall |

**Gaps and candidates not downloaded:**
- **No usable photo of the Thomas Davis statue itself** turned up in the Commons categories searched (only the Four Angels, refs 18–19). Look in `Category:Thomas Davis statue` if it exists, or Geograph "Thomas Davis College Green".
- `File:Night on O'Connell Street DUBLIN - panoramio.jpg` (Pastor Sam, CC BY 3.0, St Patrick's week 2009): dusk view of the footpath lamps (tall silver poles, **two arms at different heights with round dish heads**) and the GPO. Useful for the lamp design, not copied.
- `File:View of O'Connell Bridge and monument, Dublin (26827225555).jpg` (National Library of Ireland, no known restrictions): 1920s view from the Ballast Office showing the monument on its island facing the bridge. Historic context only.
- `File:Father Mathew Statue O'Connell Street.JPG` (public domain, 2007), `File:Henry Grattan oversee his Parliament.JPG` (CC BY-SA 3.0), a B&W herald close-up and `File:Big Jim Larkin and the GPO` (Geograph 1584391, Larkin with the GPO behind) were downloaded to scratch but not kept.
- **Father Mathew (ref 14) is shown at his pre-2016 site.** His figure and pedestal are unchanged, but the surroundings are not; no post-2018 photo was found.

---

## 3. Landmark profiles

### 3.1 The O'Connell Monument (top priority)

**Facts (VERIFIED):**
- Sculptor **John Henry Foley**; finished after his death (1874) by **Thomas Brock**. Foundation stone 8 Aug 1864 (a 2-ton block of Dalkey granite); O'Connell figure unveiled **15 Aug 1882**; the four Victories installed **May 1883** (Wikipedia; NIAH 50010320).
- **40 ft ≈ 12.2 m** tall overall. Bronze and **Dalkey granite**. NIAH calls the drum "limestone-clad"; the photos read as pale granite ashlar throughout, and Wikipedia and the DCC restoration say granite. Treat all the stone as one pale grey granite.
- **O'Connell**: standing, **cloaked**, about **2.5x life size** (Wikipedia) / "twice life-size" (NIAH), **facing south** down the street to the bridge. His right hand is at his chest, his left hand holds a scroll, and books lie at his left foot (REF, refs 01, 04, 05).
- **The frieze**: **30+ figures in high relief** round the drum, representing the classes of Irish society (clergy, peasants, artisans, professions, etc.). The central figure, **Erin**, faces south, stands with her **right arm raised high, pointing up**, tramples chains, and holds the 1829 Catholic Emancipation Act (NIAH; REF ref 04).
- **The four winged Victories**, seated at the corners of the square base, facing diagonally outwards: **Patriotism** (sword and shield), **Fidelity** (hand on an Irish wolfhound), **Courage** (strangling a serpent, fasces behind her), **Eloquence** (a book) (NIAH; Wikipedia, which lists "Justice (serpent)" in one place but calls the 1969-bombed figure "Courage"; NIAH and the photos agree on Courage). **Fidelity is at the south-east corner** (REF, refs 01 and 08: the dog is on the right-hand figure seen from the bridge). The other three corners are not verified (open question 2).
- Each Victory sits on a **dark rectangular block** (bronze or dark polished stone) projecting from the corner of the granite base (REF, ref 03). Their **wings are raised and half spread** and read clearly against the sky from 50 m away; they are the monument's signature silhouette and why Dubliners call it "the Angels".
- **Provincial shields** (the harp of Leinster/Ireland, the three crowns of Munster, the red hand of Ulster, Connacht's eagle and sword) in relief on the drum between the Victories, **laurel wreaths** on the base faces, and **"O'CONNELL"** cut into the drum on the south face (NIAH; REF refs 01, 03, 04).
- **Bullet holes from 1916–22**: 30 counted on the monument during the 2005 restoration, 10 in the O'Connell figure (two through his right temple), and visible holes in two Victories (Irish Times, 2005; NIAH; REF refs 02, 05). The Victory of Courage was blown into four pieces by a UVF bomb on 26 Dec 1969 and repaired.
- **Restoration**: 2005, over 1,000 hours of cleaning bronze and granite; the bullet holes were deliberately left (Irish Times).

**Dimensions (REF, measured off ref 01, a near-frontal photo from the south kerb, scaled to the verified 12.2 m; ±10%; the bottom of the monument is closer to the camera so it is slightly exaggerated):**

| Level | From ground | Height | Width / diameter |
|---|---|---|---|
| Granite **steps** (3 low steps, benches along the south side) | 0 – 1.2 m | 1.2 m | bottom ≈ **7.3 m** square |
| Square granite **base block** (wreaths in the faces) | 1.2 – 2.7 m | 1.5 m | ≈ **6.0 m** square, corners chamfered back behind the Victories |
| Victories' dark **blocks** | 2.7 – 3.0 m | 0.3 m | ≈ 1.4 x 0.8 m each, diagonal at the corners |
| Seated **Victories** | 3.0 – ≈ 5.0 m (head), wing tips ≈ 5.6 m | ≈ 2.0 m seated; wingspan ≈ 2.5 m | set ≈ 2.4 m out from the drum axis |
| Lower **granite drum** (shields, "O'CONNELL", a moulded ring with a wave-scroll band at the top) | 2.7 – 5.3 m | 2.6 m | ≈ **2.7 m** diameter |
| **Bronze frieze** (figures in the round against a dark bronze drum) | 5.3 – 7.6 m (Erin's hand ≈ 8.0 m) | ≈ 2.3 m | ≈ 2.9 m across the figures |
| Granite **cornice** (projects ≈ 0.3 m, dentil course) and **upper pedestal** (plain cylinder, two stepped rings, a dark bronze disc under the figure) | 7.6 – 9.0 m | 1.4 m | cornice ≈ 3.0 m, pedestal ≈ 2.2 m |
| **O'Connell** | 9.0 – 12.2 m | ≈ 3.2 m (≈ 3.6 m allowing for foreshortening) | ≈ 1.4 m wide with cloak |

**Setting (VERIFIED/REF):** the monument stands at the south tip of the O'Connell Street median, directly north of the Eden Quay / Bachelors Walk junction, and faces straight down O'Connell Bridge. The island is granite-paved with wide pedestrian crossings on its south side; traffic signal poles stand on the island corners; there are steel benches along its south step; trees (rowans and a few larger trees) stand on the island behind it; the Luas overhead span wires cross just north of it, and Luas rails run past its west side; a short run of black railings and bins stands at the north end of the base (REF refs 01, 06, 07, 09, 10).

**Five recognisable cues:**
1. The **four spread-winged, seated Victories** on the corners of a square granite base. From the car this is the key read; without wings it is just a column.
2. A **dark band of crowded figures** (the frieze) wrapped round the middle, with Erin's arm up.
3. **Pale granite, dark bronze**: a strong light/dark banding (steps–base pale, frieze dark, cornice pale, figure dark).
4. The **cloaked standing figure** on top, facing the bridge.
5. Its setting: dead centre at the bottom of the street, closing the view from O'Connell Bridge, with Clerys/GPO and the Spire behind.

### 3.2 The other O'Connell Street monuments

| Monument | Facts (VERIFIED unless marked) | Pose and silhouette (REF) | Dimensions (EST from refs) | Colours |
|---|---|---|---|---|
| **William Smith O'Brien** (Thomas Farrell, 1870; moved here from D'Olier St in 1929) | Portland limestone figure, **faces south**; granite pedestal with a recessed inscribed panel, a granite plinth and a **four-tier stepped granite base** (NIAH 50010513) | Standing, **arms folded across his chest**, long frock coat, bare head | Base ≈ 3.2 m square, pedestal top ≈ 4.6 m, figure ≈ 2.5 m, **overall ≈ 7 m** | figure pale cream-white `#d8d4c9`, weathered `#b3afa3`; granite `#a19e96` |
| **Sir John Gray** (Thomas Farrell, 1879) | **Faces south.** NIAH 50010514: Portland limestone figure and pedestal on a square stepped granite plinth. Wikipedia: white Sicilian marble. **Conflict**; it reads white either way | Standing, **right hand on chest**, coat open, left hand at side holding a scroll | 3 granite steps ≈ 1.0 m, granite block ≈ 1.1 m, stone pedestal and cornice ≈ 2.5 m, figure ≈ 2.6 m, **overall ≈ 7.2 m**; base ≈ 3.8 m square | figure and pedestal `#d6d3cb`; steps grey granite `#a09d95` |
| **Jim Larkin** (Oisín Kelly, 1979 cast, erected 1980) | Textured bronze, "figure with outstretched arms" (NIAH), on a square tooled granite pedestal of four solid blocks, gilt "JIM LARKIN 1874-1947", bronze plaques on three sides; outside Clerys, where he addressed the 1913 Lockout crowd. NIAH 50010519: faces **south**. One popular source gives "21 foot" (≈ 6.4 m) overall (not verified) | **Right arm straight up, hand open; left arm flung out sideways**, coat flying, leaning forward (ref 13). The pedestal **tapers slightly** upwards. The most dramatic silhouette on the street | Pedestal ≈ 1.6 m square x ≈ 3.3 m, figure ≈ 3.1 m with arms up, **overall ≈ 6.4 m** | bronze dark olive `#3e463d`, highlights `#66705f`; granite pale `#bdbab2`; gilt `#c8a24c` |
| **The Spire** (Ian Ritchie, 2003) | See §1.3 table | – | 120 m, 3 m to 0.15 m | stainless `#c9ccce` lit, `#8e9396` shade; LED tip `#fff4dc` |
| **Father Theobald Mathew** (Mary Redmond, 1892–93; moved 2016, reinstated 2018 just N of the Spire) | Carved figure on a limestone plinth with **ogee-moulded diagonal buttresses**, on a two-stage stepped octagonal fossil-limestone base; inscription panel on the south face (NIAH 50010613) | Friar's habit with cord, **right arm raised high in blessing**, left arm outstretched (ref 14) | Octagonal steps ≈ 3.5 m across, buttressed pedestal ≈ 3.8 m, figure ≈ 3.0 m, **overall ≈ 7 m** | figure grey limestone `#a4a6a1` (the material of the figure is not settled: sources vary; see open question 8); pedestal blue-grey `#8c8f90` |
| **Parnell Monument** (Augustus Saint-Gaudens statue, Henry Bacon architect; 1899–1911, unveiled 1 Oct 1911) | **19 m** (62 ft) overall (NIAH 50010557; Wikipedia). A **tapering triangular obelisk** of polished **Shantalla (Galway) granite** with Barna granite inlays; **bronze tripod with an eternal flame** on top; a **bronze statue ≈ 8 ft (2.4 m)** with one arm outstretched in mid-speech on a pedestal projecting south ≈ 9 ft (2.7 m) above the street; **gilt inscription and a gilt harp on the south face**; a bronze festoon band with **bucrania (ox skulls)** round the pedestal; bronze panels with the counties and provinces. On a **cobbled traffic island** at the Parnell St junction | From the south: a tall grey needle with the dark figure at its foot, gilt letters and harp above him (refs 15, 16) | Pedestal block ≈ 5 m wide x ≈ 2.7 m to the statue's feet; obelisk base ≈ 3 m, top ≈ 1.8 m, capital at ≈ 17 m; tripod to 19 m | granite warm grey `#a69f93`; polished face `#8d877d`; bronze `#3a3d36`; gilt `#c9a247`; cobbles `#77736b`; bollards granite |

### 3.3 College Green and Dame Street

| Monument | Facts | Pose and silhouette | Dimensions (EST) | Colours |
|---|---|---|---|---|
| **Henry Grattan** (J. H. Foley, 1876) | Bronze on a square dressed **limestone** pedestal with incised name panels in recessed panels, on a stepped limestone base with **scrolled brackets**. On a traffic island in the middle of College Green **facing Trinity College** (east). **Two original gas lamp standards carved with sea-horses** survive to the east, from an original four (NIAH 50020253; Come Here To Me). | Standing orator in a **tail coat and knee breeches (no cloak)**, **right arm thrust up and forward** at about 60°, weight on the back leg (REF, ref 17). The lamps are **black cast iron**: a tall pedestal with **intertwined sea-horses** at the base, a slim column and a large crowned lantern (ref 17), so NIAH's "carved" means cast. The island is shaded by **mature London planes** | Stepped base ≈ 3.2 m square x 0.8 m, pedestal ≈ 2.0 m square x ≈ 3.4 m with cornice and scroll brackets, figure ≈ 3.0 m (≈ 3.8 m to the raised hand), **overall ≈ 7.2 m**; lamps ≈ 5–5.5 m | bronze green-black with more verdigris than O'Connell `#3b4a41`, streaks `#6f9785`; limestone `#b9b6ad` |
| **Thomas Davis memorial** (Edward Delaney, with Frank du Berry of the OPW; unveiled Easter 1966 by de Valera) | A **9 ft (2.7 m) bronze Davis on a granite plinth of about the same height**, facing his university (Trinity, east); in front of him (east) the **Four Angels fountain**: **four tall, thin, trumpet-blowing bronze heralds** for the four provinces, on a round granite platform in a pool; **six granite tablets** with famine scenes and Davis's poems (Archiseek; Wikipedia College Green). Delaney later turned the heralds from facing in to **facing out** and put water jets behind them | Davis: standing bronze in Delaney's rough-textured style (EST: no photo of the statue checked). Heralds: Giacometti-like, elongated, crowned, trumpets raised, ≈ 3 m tall, very open silhouettes (ref 18) | Davis plinth ≈ 1.5 m square x 2.7 m + figure 2.7 m = **≈ 5.4 m**; a round granite platform ≈ 5 m across, with the heralds on it and jets behind them, inside a polygonal basin whose **granite parapet (≈ 0.9–1.0 m high) carries dark relief panels** (the tablets) (refs 18, 19), ≈ 8–9 m across; the plaza is ≈ 46 x 11 m | bronze heralds grey-green patina `#6f8378`, rust-brown texture `#5f5244`; granite pale `#c2bfb7` |
| **Molly Malone** (Jeanne Rynhart, 1988) | Bronze, life-size, a woman in a low-cut 17th-century dress pushing a **barrow** of fish (cockles and mussels); on Suffolk St outside the former St Andrew's Church since 2014 (VERIFIED) | Standing upright at the handles of the barrow, one hand on a shaft (ref 20). Her chest is **polished bright gold** by tourists | Figure ≈ 1.9 m on a ≈ 0.6 m granite plinth (≈ 3.5 x 2 m); a two-wheeled barrow (spoked wheels ≈ 1.1 m) with three wicker baskets (ref 20) | bronze brown-black `#3a2e25`; polished `#c49a55` |
| **Burke and Goldsmith** (Foley, 1868/1864) | Bronze on granite pedestals either side of Trinity's Front Gate, behind the railings | Standing; Goldsmith reading a book (pose details EST, not checked against photos) | ≈ 2.7 m figures on ≈ 2.5 m pedestals (EST) | dark bronze |
| **Thomas Moore** (Christopher Moore, 1857; sculptor and date EST, from memory, not verified here) | OSM node 1348371015: on the island where College St meets Westmoreland St, over the former "Meeting of the Waters" public toilet | Standing, cloaked (EST) | ≈ 3 m figure on a ≈ 4 m pedestal (EST) | dark bronze, limestone |

**The College Green plaza project** (Dublin City Council and NTA): new designs published Feb 2026, 81% support in consultation, a planning application to An Coimisiún Pleanála due in summer 2026, completion "by 2030". The Davis memorial fountain is kept as a water feature in the design; no statue relocation is proposed (Irish Times 11 Feb and 27 May 2026). **Model the current layout.**

### 3.4 Materials (hex, sampled from the refs and corrected for exposure; EST)

| Material | Hex | Notes |
|---|---|---|
| **O'Connell bronze**, body | `#2b302d` | near black with a green cast (refs 01–05, 10); the mid-tone on lit folds `#4d5650` |
| O'Connell verdigris streaks | `#5f8b78` | runs down from the shoulders, under the arms, round the bullet holes (ref 05); ~10–15% coverage |
| Grattan / Thomas Moore bronze | `#3b4a41` with `#6f9785` streaks | greener |
| Larkin bronze | `#3e463d` | olive, textured |
| Four Angels heralds | `#6f8378` / `#5f5244` | pale grey-green, rough |
| Parnell statue, Davis | `#3a3d36` | dark |
| Molly Malone | `#3a2e25`, polished `#c49a55` | brown bronze with a gold rub |
| **Dalkey granite** (O'Connell) | lit `#c4c1b9`, shade `#9a988f`, joints `#7c7a73` | pale silver-grey, fine-grained |
| Granite (Smith O'Brien, Gray steps, Larkin) | `#a29f97` | mid grey |
| Shantalla granite (Parnell) | `#a69f93`, polished `#8d877d` | warmer, faintly pink-beige |
| Portland limestone figures (Smith O'Brien, Gray) | `#d8d4c9`, weathered `#b3afa3` | the whitest things on the street |
| Limestone (Grattan, Mathew pedestal) | `#b9b6ad`, blue-grey `#8c8f90` | |
| Gilt lettering / harp | `#c9a247` | |
| Median paving (granite setts and slabs) | `#9e9a92` | with a darker kerb `#7b776f` |

**Guidance for the shader:** bronze should be `metalness` 0.3–0.5 at most, `roughness` 0.55–0.7, with the verdigris as a *non-metal* channel (as `M.copper` already does for roofs). The current 0.85 metalness with screen-space reflections makes it read as bright metal.

### 3.5 Night lighting

- **The Spire**: base floodlit at dusk; **top 10 m lit by LEDs** through 11,884 holes (VERIFIED). The game already has the glowing tip.
- **Statues**: Dublin is known for **not** floodlighting its statues; O'Connell Street is described as "frighteningly dark by night" (2023 forum discussion; not a primary source). I found no source for floodlights on the O'Connell, Parnell or Grattan monuments (EST: none, or at most small ground uplighters). At night they are lit by the street lamps and shop light.
- **Dublin Winter Lights**: in winter the O'Connell Street trees get LED neon rings round their canopies (DCC Winter Lights). An optional seasonal touch.
- **Recommendation**: do not floodlight them. Let the street lamps and a very low emissive "rim" (e.g. 0.05) keep the silhouettes readable against the sky, so the winged Victories still read at night. Optionally light the Parnell gilt and the Spire base.

---

## 4. Build brief (prioritised)

### Scale (recommendation)

**Build every statue and monument at full height (1.0x) and full footprint.** They are small in plan (the largest base is 7.3 m), so they fit on real-width islands without compression, and at full height they read properly from the driver's eye (1.2 m) at 30–80 m. Do not shrink them to the 0.85x that some buildings use: the monuments are the things people will compare to photos. The O'Connell Monument should come down from 15 m to **12.2 m**; the Parnell Monument should be **19 m**. Positions along the street follow the map (half scale), so the gaps between statues halve; that is fine, and it keeps the procession rhythm.

### P0: placement, islands and median (sites.js / roads.js / landmarks.js; next phase)

1. **O'Connell Monument island.** Give the NQ8–OC1 run a real median: from the quay junction clearance to the Abbey St clearance, **≈ 9 m wide at the monument** tapering to ≈ 8 m (real width; roads are real width). Monument centre at **NQ8 + ≈ 13 m** along NQ8→OC1, local +z facing south (down the bridge). Add a zebra/signal crossing band across its south tip and signal poles on the island corners.
2. **Median width** 7.5–8 m through O'Connell St Lower (currently 6), narrowing to ≈ 4 m north of Cathal Brugha St (OC3). Granite paving `#9e9a92`.
3. **Median trees**: replace the big planes with **rowans** (smaller, ≈ 6–8 m, orange berries late summer), spaced ≈ 15 m, and keep **clear zones of ≈ 10 m round each statue**; put Oriental planes (the existing plane model is fine) along the **footpaths**, Spire to Parnell.
4. **Statue positions** (use `project()` for all except O'Connell; they sit on the game centreline within 1 m):
   - Smith O'Brien (-14.4, -98.8), Gray (-18.4, -114.4), Larkin (-26.4, -145.9), Father Mathew (-39.5, -197.0), all facing south.
   - Gray is 7 m from the OC1 junction centre: check his base clears the Abbey St junction trim (move him 2–3 m south if needed).
   - Parnell: a **kerbed cobbled island in the OC4 junction** at (-82.8, -340.9), ≈ 8 x 7 game m, the statue face to the south. It will need an exemption in `footprints.mjs` (it is meant to be in the junction) or a small re-route of the Parnell Square East turn.
5. **College Green**:
   - Move Grattan to **(-23.5, 153.7)**, facing **east** (rotation so local +z points to the Trinity gate at (6.6, 159.2), bearing ≈ 97°). Island: a curved triangle ≈ 13 x 19 game m using the polygon in §1.2, clipped to keep the CGT junction mouth clear. Add the **two sea-horse lamp standards** on its east side.
   - Add the **Davis plaza** as a central island x -51 to -28.5, z 153–161 (lens-shaped, §1.2), the Davis statue at (-50.0, 158.8) facing east, the Four Angels fountain at (-44.9, 157.6).
   - The College Green road CG0–CGT is modelled as one 20 m carriageway; real traffic passes both sides of the Davis island (one lane north, two south). The simplest faithful version: split the carriageway round the island.
6. **Molly Malone**: needs **Suffolk Street** in the street graph (OSM ways 998280698 and 4475686, one-way, pedestrian-priority; from Church Lane / College Green to Grafton St, with St Andrew's St off it). Then place her at (-58.0, 196.1), on the **south** side of the street's west end (the street centreline there is at z ≈ 190), in front of a St Andrew's Church facade (granite rubble with ashlar dressings, ref 20) (Gothic revival, used as the tourist office). **P2**, as it depends on the new street.

### P1: the O'Connell Monument as a Blender hero GLB

`tools/blender/build_oconnell.py`, using `kit.py`. One GLB, AO baked into vertex colours as for the other heroes, with a small bronze/granite atlas painted at load in `heroes.js`. Origin: centre of the base at ground; local +Y (Blender) = the south face. **Budget ≈ 9.5k tris (ceiling 10k).**

| Part | Tris | How |
|---|---|---|
| Granite: 3 steps, base block with chamfered corners, lower drum with mouldings and the wave-scroll ring, cornice with dentils, upper pedestal rings | ≈ 1,800 | `Part.box`/`prism` (24-sided drums), bevelled. Wreaths, the "O'CONNELL" inscription and the dentil course go in the atlas as decals |
| Provincial shields ×4, dark Victory blocks ×4 | ≈ 150 | shields: bevelled quads with atlas faces (harp, crowns, red hand, eagle and sword) |
| **O'Connell** (standing cloaked figure) | ≈ 1,400 | from the statue-proxy kit (below), scaled to 3.4 m |
| **Four Victories** (seated winged) | 4 × ≈ 950 = 3,800 | kit figure, each with its attribute: sword and shield / wolfhound / serpent and fasces / book (≈ 100 tris each). **Wings are the priority**: real geometry, not alpha cards (they need to catch light and silhouette) |
| **Frieze** | ≈ 2,300 | a dark bronze drum core (24 sides) + **≈ 14 low-poly relief figures** (≈ 130 tris each: the standing-figure kit at its lowest LOD, flattened to 60% depth, embedded half into the drum), Erin in the middle of the south face with the raised arm (≈ 250 tris). A painted "crowd" atlas band (figure silhouettes, shaded as if lit from above, with drapery lines) wraps the drum behind them to suggest the other 16+ figures |
| **Total** | ≈ 9,450 | |

Atlas (1024², painted in code like `paintDecals`): bronze patina tile (black-green with verdigris streaks, 256²), frieze crowd band (1024 x 256), drapery-fold tile (256²), feather tile for wings (256²), shields ×4 (128² each), laurel wreath (128²), the inscription strip, granite ashlar/dentil strips.

**Materials**: `heroes.js byName()` strips the prefix, so `oc_granite` would pick up the existing `granite` entry (tile `#a8a59d`, darker than Dalkey granite). Either name it `oc_palegranite` and add a `palegranite` entry (`#c4c1b9`, roughness 0.8), or lighten via the baked vertex colour. Add a `bronze` entry to `stoneMaterials()` (`#2b302d`, metalness 0.4, roughness 0.6, verdigris from the atlas), used as `oc_bronze`; decals as `oc_decal` (alpha-tested atlas quads, its own atlas).

**Night**: no floodlight (§3.5).

### P1: a shared "statue proxy" kit (`tools/blender/statues.py`)

The same few body types cover every statue in the city. Build them once in Blender, export as named nodes in one `statues.glb`, and place instances with per-statue scale, pose variant and material. This also replaces the 17 `statue()` lumps (GPO, Custom House, Bank of Ireland, Trinity, Castle).

**How to get a convincing figure at 600–1,400 tris:**
1. **Block the body with the Skin modifier** on a stick skeleton (≈ 20 vertices: feet, knees, hips, spine, shoulders, elbows, hands, neck, head). Per-vertex skin radii give tapered limbs; one subdivision level, then **Decimate (collapse) to budget**. This gives organic shapes quickly and consistently, and poses are just moved skeleton vertices.
2. **Drape** (cloaks, habits, dresses, frock coats) as **lathed profiles**: a cone or bell swept round the body from the shoulders to the ankles, open at the front where needed, with 3–5 vertical fold ridges pushed out. The cloak is what makes a figure read as "Victorian statue" from 50 m, so give it the polygons.
3. **Heads** are a 6x5 sphere, slightly squashed, with a nose wedge; hair/laurel as a ring. Faces don't read at distance; keep them simple.
4. **Wings**: a flat, slightly curved blade (≈ 60 tris per wing) with a thickened leading edge and 4–5 stepped "feather tips" cut into the trailing edge; the feather tile in the atlas does the rest.
5. **AO baked into vertex colours** (existing `kit.bake_ao_vertex`) does most of the modelling work: it darkens the folds, armpits and cloak insides, which is what the eye reads as sculpture.
6. **Normal detail**: optional. If wanted, bake a tangent-space normal map of fold ridges into the atlas's "drapery" tile and apply it to all cloaks with tiling UVs; it's shared, so it costs nothing per statue.

| Kit body | Tris (LOD0 / LOD1) | Used for |
|---|---|---|
| **A. Standing cloaked figure** (arms down, one hand to chest, cloak to the ankles) | 1,400 / 450 | O'Connell, Gray (no cloak, frock coat), Smith O'Brien (arms folded variant), Davis, Burke, Goldsmith (book), Thomas Moore |
| **B. Orator**, arm raised | 1,200 / 400 | Grattan (right arm raised), Parnell (arm outstretched), Father Mathew (habit variant, right arm up, left out), Erin in the frieze |
| **C. Larkin**: right arm straight up, left arm out sideways, leaning forward | 1,000 / 350 | Larkin only (textured) |
| **D. Seated winged Victory** (laurel crown, chiton, lap drape, wings half spread) | 950 / 300 | the four O'Connell Victories (attributes as separate small meshes) |
| **E. Standing allegorical female** (classical drapery) | 900 / 300 | GPO roof (Hibernia, Mercury, Fidelity), Custom House, Justice (Castle gate), Bank of Ireland |
| **F. Herald** (elongated, crowned, trumpet raised) | 500 / 200 | the Four Angels (four, turned outwards) |
| **G. Molly Malone and barrow** | 1,100 / 400 | Molly |
| **Frieze figure** (flattened A at LOD1) | 130 | the O'Connell frieze |

**Plinth shapes** (all granite/limestone boxes with chamfers and cornices; ≈ 100–400 tris each; dimensions from §3.2–3.3): Smith O'Brien (4-tier stepped, ≈ 3.2 m base, 4.6 m to the figure); Gray (3 steps + block + pedestal + cornice, ≈ 3.8 m base, 4.6 m); Larkin (4 plain granite blocks, 1.6 m square, 3.3 m); Father Mathew (2 octagonal steps ≈ 3.5 m + buttressed pedestal to 3.8 m); Grattan (stepped base with scrolled brackets, 3.2 m, 4.2 m to the figure); Davis (plain granite pier 1.5 m square, 2.7 m).

**LOD**: LOD1 beyond ≈ 60 m; beyond ≈ 150 m the statues can be dropped entirely except the O'Connell Monument, Parnell and the Spire.

### P1: the Parnell Monument

Procedural in `landmarks.js` (or a tiny GLB, ≈ 1.5k tris): pedestal block ≈ 5.0 x 3.6 m to 2.7 m with the bronze festoon/bucrania band as an atlas strip; the **triangular obelisk** tapering from ≈ 3 m to ≈ 1.8 m up to ≈ 17 m, a cusped capital, and the bronze tripod and flame to 19 m; the gilt inscription and harp as a decal on the south face; the Parnell figure (kit B) on the south projection at 2.7 m; granite bollards round a cobbled island.

### P2

- **Davis memorial**: plinth + kit A (textured bronze), the round fountain with four kit-F heralds turned outwards, the granite tablets as low blocks, a pool with a water material.
- **Grattan's sea-horse lamps**: two black cast-iron standards (≈ 5–5.5 m: a pedestal with sea-horses coiled round it, a slim column, a large crowned lantern), plus 3–4 mature planes on the island.
- **Molly Malone** on the new Suffolk Street.
- **O'Connell Street lamps**: a new pole type for the `boulevard` (tall slim silver pole with one or two shallow arms), both footpaths, plus the traffic signals on the monument island and the Luas span wires.
- **Trinity**: swap Burke/Goldsmith and the other `statue()` users over to the kit.
- **Dublin Winter Lights** tree rings as a seasonal option.

**Triangle budget:** O'Connell Monument ≈ 9.5k; six other O'Connell St statues ≈ 6 x 1.6k (figure + plinth) ≈ 9.6k at LOD0; Parnell ≈ 1.5k; Grattan + lamps ≈ 2k; Davis + fountain ≈ 3.5k; Molly ≈ 1.3k. **Total ≈ 27k at LOD0**, but only 2–3 statues are ever near the camera at once, and LOD1 roughly thirds it. The statue kit is instanced, so the extra draw calls are ≈ 3–4 (one per material), not one per statue.

---

## 5. Open questions

1. **Game-relative placement of the O'Connell Monument.** Because NQ8 is nudged ≈ 13 game m north of the real quay line, the monument cannot go at its lat/lon. I recommend NQ8 + ≈ 13 m. Alternatively move NQ8 back towards the real quay line, but that affects the river width.
2. **Which Victory is at which corner.** Fidelity (wolfhound) is at the south-east (ref 01). The other three (Patriotism, Courage, Eloquence) need a photo from each side. The Victories' order matters only for the attributes.
3. **Exact monument dimensions.** Only the 40 ft total is published. My part heights are measured from one photo, ±10%. The DCC "History of Monuments, O'Connell Street Area" PDF (2018) was downloaded but its text could not be extracted here (no PDF tools); it may hold measured drawings.
4. **Is anything floodlit?** No evidence of floodlighting for the statues. Worth a night photo check.
5. **Grattan island vs the game's CGT junction.** The real island overlaps where the game's College Green (CGT–CGM) and Grafton St branch. It will need clipping or a small junction redesign.
6. **O'Connell Street lamp design.** The IAP "custom-designed lampposts" were not identified by name or designer; the description here comes from photos.
7. **Parnell in the junction.** The monument sits on an island inside the OC4 junction; `footprints.mjs` will flag it. Allow an exemption for monument islands?
8. **Material conflicts.** Sir John Gray: Portland limestone (NIAH) vs white Sicilian marble (Wikipedia). Father Mathew's figure: sources vary (limestone plinth per NIAH; the figure's stone is given variously). Both read as pale stone; it doesn't change the build.
9. **College Green plaza.** If the plaza is approved (application summer 2026, completion ≈ 2030), the Davis fountain stays but the roads round the islands go. Model today's layout for now?
10. **Photo gaps.** There is no photo of the Davis statue itself (pose and texture are EST), and none of Father Mathew at his post-2018 site. Larkin's facing is "south" per NIAH, but ref 13 is ambiguous. A walk-by (or a Mapillary token) would settle all three.

## Sources

- OSM via Overpass (ODbL): `data/osm/monuments.json`; road ways cited by ID
- [O'Connell Monument, Wikipedia](https://en.wikipedia.org/wiki/O'Connell_Monument)
- [NIAH 50010320, O'Connell Monument](https://www.buildingsofireland.ie/buildings-search/building/50010320/oconnell-monument-oconnell-street-lower-dublin-1-dublin)
- [Restored O'Connell monument to be unveiled, Irish Times (2005)](https://www.irishtimes.com/news/restored-o-connell-monument-to-be-unveiled-1.1177744)
- [NIAH 50010513, William Smith O'Brien Monument](http://www.buildingsofireland.ie/niah/search.jsp?type=record&county=DU&regno=50010513)
- [NIAH 50010514, Sir John Gray Monument](https://www.buildingsofireland.ie/buildings-search/building/50010514/sir-john-gray-monument-oconnell-street-lower-dublin-1-dublin)
- [NIAH 50010519, Jim Larkin Monument](https://www.buildingsofireland.ie/buildings-search/building/50010519/jim-larkin-monument-oconnell-street-lower-dublin-1-dublin)
- [NIAH 50010613, Father Mathew Monument](https://www.buildingsofireland.ie/buildings-search/building/50010613/father-mathew-monument-oconnell-street-upper-dublin-1-dublin)
- [NIAH 50010557, Charles Stewart Parnell Monument](https://www.buildingsofireland.ie/buildings-search/building/50010557/charles-stewart-parnell-monument-oconnell-street-upper-parnell-street-dublin-dublin)
- [Parnell Monument, Wikipedia](https://en.wikipedia.org/wiki/Parnell_Monument)
- [NIAH 50020253, Henry Grattan Monument](https://www.buildingsofireland.ie/buildings-search/building/50020253/henry-grattan-monument-college-green-dublin-2-dublin)
- [Henry Grattan Statue: A Photographic History, Come Here To Me](https://comeheretome.com/2010/01/17/henry-grattan-statue-a-photographic-history/)
- [1966 Thomas Davis Memorial, Archiseek](https://www.archiseek.com/1966-thomas-davis-memorial-college-green-dublin/)
- [College Green, Wikipedia](https://en.wikipedia.org/wiki/College_Green,_Dublin)
- [College Green civic plaza design revealed, Irish Times, 11 Feb 2026](https://www.irishtimes.com/ireland/dublin/2026/02/11/college-green-civic-plaza-design-revealed-eight-years-on-from-last-plans/)
- [Application for College Green plaza to be submitted by summer, Irish Times, 27 May 2026](https://www.irishtimes.com/ireland/dublin/2026/05/27/application-for-college-green-plaza-to-be-submitted-by-summer-amid-strong-public-approval/)
- [O'Connell Street, Wikipedia](https://en.wikipedia.org/wiki/O'Connell_Street) (IAP, trees, statues, Father Mathew's move)
- [List of public art in Dublin, Wikipedia](https://en.wikipedia.org/wiki/List_of_public_art_in_Dublin)
- [Spire of Dublin, Wikipedia](https://en.wikipedia.org/wiki/Spire_of_Dublin)
- [Molly Malone, Wikipedia](https://en.wikipedia.org/wiki/Molly_Malone) and [Suffolk Street, Dublin, Wikipedia](https://en.wikipedia.org/wiki/Suffolk_Street,_Dublin)
- [Statue of Father Theobald Mathew, Visit Dublin](https://www.visitdublin.com/statue-of-father-theobald-mathew)
- [Nelson and Company: the moving statues of Dublin, DCC Library blog](https://www.dublincity.ie/library/blog/nelson-and-company-moving-statues-dublin)
- [O'Connell Street trees, Dublin Winter Lights](https://dublinwinterlights.ie/installations/oconnell-street/)
- [History of Monuments, O'Connell Street Area, DCC (PDF, not parsed)](https://www.dublincity.ie/sites/default/files/media/file-uploads/2018-05/history_monuments_oconnell_st.pdf)
- Wikimedia Commons and Geograph Ireland images as listed in §2
