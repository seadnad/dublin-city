# Hotspot audit: St Stephen's Green, Temple Bar, Dame St / George's St / Dublin Castle

This is an audit plus a build list. No `src/` changes were made. The brief was to make the existing map feel alive and specific, with depth over scale. The owner put it this way: "Grafton lacks some of the character on the street. There are tons of small side streets with nice old-school pubs."

**Sources.**
- OSM via Overpass (ODbL), all pulled 2026-09-30:
  - `data/osm/stephens-green-audit.json`: bbox 53.3350,-6.2640,53.3408,-6.2525, 3,035 elements.
  - `data/osm/temple-bar-dame-audit.json`: bbox 53.3395,-6.2710,53.3468,-6.2585, 4,554 elements.
  - `data/osm/stephens-green-water-audit.json`: the lake, its bridge and the fountains.
  - Each pull covers highways, barriers, leisure, water, named or heritage buildings, and amenity, shop, tourism, historic, artwork, lamp, tree and furniture nodes.
- 45 CC0, CC BY, CC BY-SA and public-domain Commons photos in `refs/stephens-green-audit/` (19), `refs/temple-bar-audit/` (7) and `refs/dame-castle-audit/` (19). Each folder has a `sources.json`, and the credits are in §7. The earlier `refs/temple-bar/` set (25 photos) and `docs/research/temple-bar.md` still apply and are not repeated here.
- Wikipedia REST summaries, used for dates and facts.

**Current-state shots.** The contact sheet is `docs/research/hotspots-gtd-current.png` (18 of the 32 shots). All were taken with `tools/scenarios/look.mjs` from the current branch (38908d7), at driver eye (1.6 m) or 90–160 m for the aerials.

**Privacy.** All requests used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`. No owner name, email or account went into any request. No tokens, sign-ups or uploads were used.

**Overlaps with other agents (noted, not duplicated):**

| Agent | Overlap with this audit |
|---|---|
| **Pubs** | The Long Hall (George's St at Stephen St Lower), the Temple Bar pub (the Crampton's corner hero in `landmarks.js redPub`), O'Donoghue's (Merrion Row, at the Green's NE corner), Copper Face Jacks (Harcourt St), Grogan's (William St South), Kehoe's (Anne St South), Davy Byrnes (Duke St), Mulligan's, Bleeding Horse, Flannery's. None of them are proposed below. **The Stag's Head is not on their list**, so it is proposed here (D2). |
| **Grafton quarter** (follows) | The lanes east of George's St: Castle Market, William St S, Drury St east side, Clarendon St, Johnson's Ct, Coppinger Row, Chatham St/Row, Harry St, Duke St, Anne St S, Balfe St, Lemon St. They are listed in §5 for reference only. |
| **Luas routing** | The St Stephen's Green stop kit (item G10) touches `luas.js` STOP_KITS, so coordinate with them or hand the item over. |
| **Kildare / Shelbourne** | Already merged (`KD_BOXES.shelbourne`, `kildarelayout.js`). The Green's north-east frontage belongs to it. Do not move `SGNE` or `KS1` without that frame in mind (see G0). |

---

## 1. Current state: what the game has

### 1.1 St Stephen's Green

| Element | In game | Notes |
|---|---|---|
| Park polygon | `parks["St Stephen's Green"]` on nodes SGNW, DS1, KS1, SGNE, SGSE, HC0, SGSW, SGW | See §2.1 G0: the shape is wrong. The real Green is a square turned about 22° clockwise; the game's is a rectangle turned about 9°. The game's SE corner (`SGSE` 53.3366,-6.2554) is **about 125 m east** of the real Leeson St / Earlsfort Tce junction (53.33614,-6.25726). |
| Railings | Generic park railings on a plinth (`ground.js buildRailings`) | Good. The real ones have gate piers at 8+ gates, and none are modelled. |
| Interior | Two rings of big trees and a shrub band inside the railings, 90 shrub blobs, and 110 scattered trees on a flat lawn (`landmarks.js` ~2205). **No paths, lawns, flower beds, statues, bandstand, shelters or bridge.** | Shot 08: from inside it reads as a forest of blobs. The aerial (shot 09) shows a uniform tree carpet. |
| Lake | A 40 x 18 m ellipse (`c.x+10, c.z-18`) with a granite rim | The real lake is **252 m x 60–122 m, which is ~126 x 45 m in game**. It is L-shaped, runs east–west across the north half, and has rocky edges, islands and the O'Connell Bridge. From the aerial the game's pond cannot be seen at all. |
| Fusiliers' Arch | Hero (`fusiliersArch`) with gates, piers, lamps, cobbled forecourt and bollards | Good (shot 01). |
| Shopping Centre | Hero (`stephensGreenCentre`) | Good. |
| The Shelbourne | Hero, built by the Kildare agent | Good. The canopy, torch-bearers and red brick all read (shot 04). |
| Grafton top plaza | Flags, 4 planters, one festoon and chandelier | Plausible. |
| Luas | Green Line on SG North → SG West → Harcourt St, with the "St. Stephen's Green" stop on SG West | The stop uses the simple platform, not the stop kit. Tracks run on a flagged strip (shot 02). |
| Edges | GEORGIAN_ST filler on all four sides: brick, doorcases and area railings, with generic shopfront names ("Moran Hardware", "Kavanagh's") | North and East read Georgian. **The West has none of its big set-pieces** (RCSI portico, Unitarian Church spire, Fitzwilliam Hotel). **The South has none** (Iveagh House, Newman House, University Church, the Loreto/Wesley frontages). The SE corner at Leeson St and Earlsfort Tce is an ordinary crossroads. |
| Street furniture | Heritage lamps, bins, a bus shelter with a "VISIT DUBLIN" ad (shot 03) | The ad is nice. There are no granite kerb posts, lime-tree line, jaunting cars, rickshaws, Dublin Bikes, or bilingual signs. |
| Harcourt St | Georgian terrace, Luas tracks, "Kavanagh's" front (shot 07) | Good bones. Coppers belongs to the pubs agent. |

### 1.2 Temple Bar

The earlier refinement (docs/research/temple-bar.md, BUILD-REPORT.md) got the street graph broadly right. It re-traced the spine, straightened Eustace, Sycamore and Anglesea, added Cope St, Temple Lane S, Fownes Upper and the Merchant's Arch lane, set real widths, one-way loops, a pedestrian core and setts, and built Merchants' Hall, Crampton's Bar (red corner), Temple Bar Square, wall lanterns, festoons and baskets.

What the shots show (01–10, night 01–02):
- **Walls are painted one saturated colour top to bottom** (whole-building green, purple, royal blue or red; shots b-02, b-06, b-09, b-17). Real Temple Bar is dark brick or buff and cream render above, with the colour **concentrated in the ground-floor shopfront and fascia**, plus a few fully painted pubs (Gogarty yellow, Quays faience). The effect reads "toy town", not "old-school pubs".
- **Shopfronts are flat** (a fascia with a name over dark glass). There are no pilasters, stall risers, recessed doors, hanging signs, flags, lit windows, A-boards or awnings, and nearly all names are the same set of generic surnames.
- **Blank party walls face the square** (the green and purple slabs in b-02). Temple Bar Square's south side should be the red-brick gabled Victorian block.
- **The Merchant's Arch passage shows a flat blue-grey fill from the quay** (b-03). You cannot see through to the lane and the square. It may be a back-face or vault issue; worth checking first (T1).
- **Night** (c-01): Crampton's windows glow and the festoons show. Everything else is dark: no neon, no lit pub windows in the filler, no light spill onto the setts.
- Missing (see §5): Meeting House Square, Asdill's Row, Bedford Row, Aston Place, Price's Lane, Fownes St Lower, Crow St, Cecilia St, Curved St, Essex Gate, Crampton Court, Dame Lane, Dame Court and Temple Bar Square as a proper polygon (it is currently a box). There are also no culture buildings: IFI, The Ark, Gallery of Photography, Project Arts Centre, Temple Bar Gallery, Smock Alley.

### 1.3 Dame St / George's St / Dublin Castle

| Element | In game | Notes |
|---|---|---|
| City Hall | Hero (`cityHall`): portico, dome, podium, lamps | Good (shot b-12). |
| **Dublin Castle** | `dublinCastle()`, a 40 m stub on Cork Hill: gate arch with Justice, railings, one brick range and a small copper-domed tower (the "Bedford Tower"), cobbled yard (shot b-18) | **The Record Tower, Chapel Royal, Lower Yard, Dubh Linn Gardens, Chester Beatty, State Apartments range, Fortitude gate, Coach House and Castle St/Palace St are all missing.** The real complex is 257 x 270 m (~130 x 135 m in game). The stub's tower is the wrong one: the Bedford Tower is a cupola over a classical front, not a dome on a box. |
| Central Bank, Olympia, clock corner, Trinity, Bank of Ireland | Heroes | The Olympia's blade signs and canopy are there but hardly glow at night (c-03). |
| Dame St filler | Mixed brick, stucco and colour | The brief's reference notes are Victorian red-brick gables and ornate stone commercial. At the moment it is generic 5-storey boxes. The Dame St segment west of George's St is missing the Stag's Head mosaic and the Dame Court opening, and the "Dame Tavern / Dame Lane" pub row (Dame Lane is not in the graph). |
| S Great George's St | Generic brick and stucco with generic shopfronts (b-14, b-15) | **The South City Markets / George's Street Arcade block is missing.** It is a whole city block of 1881 red brick and terracotta, with steep slate roofs, pinnacled turrets and Gothic gables, and the arched arcade entrance. It is the one thing that makes George's St recognisable. The Long Hall belongs to the pubs agent. |
| Exchequer St | Tagged TEMPLE_BAR style, so the same saturated colours (b-17) | Wrong style. Real Exchequer St is red-brick Victorian (the arcade's north side and the Exchequer pub) with modern infill. It should not be cobbled either: OSM says asphalt. |
| Aungier St | Georgian and brick filler (b-16) | Fine as a through-road. Missing: Whitefriar St Church (Carmelite, the St Valentine relics), the red-brick Swan pub corner at York St, and the Aungier St/Kevin St/Cuffe St 5-way. |

---

## 2. Research: character features and gaps

### 2.1 St Stephen's Green

**G0 Geometry (a decision item).** Real corners (OSM road centrelines) compared with the game:

| Corner | Real | Game node | Offset |
|---|---|---|---|
| NW (Grafton top) | 53.33990,-6.26066 | SGNW 53.33975,-6.2614 | 50 m W |
| NE (Merrion Row) | 53.33859,-6.25529 | SGNE 53.33905,-6.2548 | 50 m N, 30 m E |
| SE (Leeson St / Earlsfort Tce) | 53.33614,-6.25726 | SGSE 53.3366,-6.2554 | **125 m E**, 50 m N |
| SW (Harcourt St / Cuffe St) | 53.33754,-6.26270 | SGSW 53.3369,-6.262 | 70 m S |

The real sides are about 390 m (N), 290 m (E), 400 m (S) and 290 m (W), in a rotated-square shape. The game's east side runs almost north–south, so SG East, Leeson St Lower and Earlsfort Tce all meet at the wrong place. This is why the SE corner has no recognisable junction (the flatiron "Regency" corner, see `leeson-street-junction-…jpg`). Earlsfort Tce is also cut off: the game way starts at Hatch St (GXSHT2), and its real north end (53.33614,-6.25726 → Hatch St) is missing.

**Fixing it is L-sized and touches `streets.json`, the park polygon, the Shelbourne/Kildare frame (KS1/SGNE), Leeson St, Hume St, Merrion Row and the canal-south nodes.** I recommend fixing only the SE corner: move SGSE to the real junction and add the Earlsfort Tce stub. Leave the north side alone (the Kildare frame depends on it). This needs a decision from the owner.

**Interior layout (OSM + photos).** The 1880 William Sheppard design:
- **Lake** (rel 14581057): runs east–west across the north half, from lon -6.26089 to -6.25710 and lat 53.33818 to 53.33928. It is narrow at the west end, where the **O'Connell Bridge** (way 25840255, 53.33874,-6.25896) crosses it: a single low granite rubble arch with coping (`st-stephen-s-green-lake-…5421973288.jpg`). It has rockwork edges, a waterfall at the west end, a duck house, and islands.
- **Central circle**: a sunken lawn with **two fountains** (ways 1355101634/5, 53.33826,-6.25959 and 53.33808,-6.25869), formal flower beds with iron hoop edging, and phormium clumps (`centre-of-…jpg`, `central-flower-beds-…jpg`).
- **Bandstand** (way 74496050, 53.33754,-6.25963): a white timber octagon with a shingle roof, south of the centre, facing the lake's SE arm (`duckpond-and-bandstand-…jpg`).
- **Shelters**: 3 Victorian timber shelters (ways 74496029, 74496043, 74496056) and 2 small ones by the west gate (1355848853/4).
- **Superintendent's Lodge** (way 74496042, 53.33780,-6.26197): a Tudor-revival gate lodge with half-timbering, inside the SG West railings (`gate-lodge-…jpg`).
- **Paths**: 13 named pedestrian ways plus 105 footways, which form the axes: the diagonals from the arch and from the Shelbourne gate, the circle round the centre, and the lakeside walks. They are tarmac with granite edging (the Yeats memorial path is setts, way 25581816).
- **Statues and memorials**, all OSM nodes. Every one of them is missing:

| Feature | lat, lon | Form |
|---|---|---|
| Lord Ardilaun | 53.33863,-6.26139 | Seated bronze on a tall plinth, facing the RCSI, by the West gate |
| Robert Emmet | 53.33899,-6.26089 | Standing bronze, SG West, opposite his birthplace |
| O'Donovan Rossa | 53.33951,-6.26022 | A rough boulder memorial just inside the arch |
| W.B. Yeats (Henry Moore "Knife Edge") | 53.33837,-6.26038 | Abstract bronze on a stepped sett platform (the "cobbled area" photo) |
| Mangan bust | 53.33807,-6.25993 | Bust on a plinth with a marble relief |
| Constance Markievicz | 53.33782,-6.25910 | Bust on a plinth |
| Thomas Kettle | 53.33807,-6.25829 | Bust on a plinth |
| **Three Fates fountain** (Wackerle, 1956) | 53.33679,-6.25770 | Three bronze women in a pool, just inside the **Leeson St gate** (SE). Very recognisable. |
| **Wolfe Tone "Tonehenge"** (Delaney, 1967) | 53.33839,-6.25620 | Standing bronze in front of a ring of rough granite pillars, at the **Merrion Row / NE gate** |
| Famine memorial (Delaney) | 53.33838,-6.25629 | Gaunt bronze figures behind the Tone ring |
| Joyce bust | 53.33723,-6.26004 | Facing Newman House (S) |
| Lady Grattan drinking fountain | 53.33943,-6.25877 | Granite and iron, SG North by the Dawson St gate |
| Old water pillar (fire hydrant) | – | A ribbed cast-iron pillar |

- **Gates**: 22 gate nodes. The recognisable ones are the **Fusiliers' Arch** (NW, built), the **Merrion Row gate** (NE, 53.33846,-6.25625), the **Leeson St gate** (SE, 53.33676,-6.25880), the **Harcourt St gate** (SW, 53.33735,-6.26104), the **Shelbourne / Dawson St gate** (N, 53.33945,-6.25934) and the **Earlsfort / East gates**. All have granite piers, cast-iron gates and heritage lanterns.
- **Trees** (359 OSM tree nodes in the park bbox): mostly **lime (Tilia, 64 tagged)** plus plane, beech, oak, horse chestnut and birch. The limes line the outer footpaths (`looking-north-…jpg`). The perimeter belt is dense with holly and laurel understorey. Inside, the belt opens to **large lawns**: the centre and the south lawns are open grass, which is the opposite of the game's scatter.
- **Benches and bins**: 56 benches and 24 bins inside the park (OSM). The benches are green or teak slatted with cast-iron ends.

**Edges: set-piece buildings.**

| Side | Building | lat, lon | Character |
|---|---|---|---|
| W | **RCSI (Royal College of Surgeons)** | way 129750572, ~53.33955,-6.26335 | Granite, 3 storeys. Portland pedimented portico of 4 engaged Doric columns, **statues on the pediment** (Athena, Asclepius, Hygieia), flag (`royal-college-…jpg`). **The most recognisable building on the west side.** |
| W | Unitarian Church | way 230568525, 53.33793,-6.26261 | 1863 Gothic granite, a narrow gable with a spirelet, squeezed into the terrace |
| W | Fitzwilliam Hotel / Stephen's Green Centre | 53.33936,-6.26148 | Modern stone and glass (the centre is built) |
| W | Luas terminus | – | Stop on SG West. The Cross City tracks turn east along SG North to Dawson St. |
| S | **Iveagh House** (80–81) | way 275480357, 53.33653,-6.25911 | Portland-stone Georgian palazzo front, 3 storeys, 7 bays, rusticated ground floor, balustrade. The Department of Foreign Affairs (`iveagh-house-morning.jpg`). |
| S | **Newman House** (85–86) / MoLI | way 275478032, 53.33666,-6.26044 | Two Georgian houses: 86 is brick, 85 is granite with a Palladian door and a **lion over the door**. |
| S | **University Church** | way 275478033, 53.33639,-6.26068 | A tiny Byzantine-style porch squeezed between the terraces, with a bellcote and a polychrome brick arch. Unmistakable. |
| S | Stauntons, Clanwilliam House, Loreto | – | Georgian terraces |
| E | Dept of Justice (51), Loreto College, St Vincent's old hospital front, Hume St corner, Huguenot Cemetery (Merrion Row) | – | Georgian; No. 51 has a granite ground floor |
| E | Rickshaw and pedicab rank; **horse-drawn carriages** wait on SG North by the Shelbourne and at the Grafton top | `bicycle-taxis-…jpg` | Street life |
| SE | **Leeson St / Earlsfort Tce fork**: a flatiron corner with a single-storey gabled Victorian shop with a glazed lantern ("Regency" cleaners), a big yellow box junction, the Conrad hotel behind, Earlsfort Tce leading to the National Concert Hall | 53.33614,-6.25726 | `leeson-street-junction-…jpg` |
| N | The Shelbourne (built), the Little Museum (15), the Hibernian Club, Stephen's Green Club, the University Club | – | North is covered by Kildare |

**Street furniture on the Green's footpaths.**
- A line of **lime trees in the footpath**.
- **Granite kerb posts with iron caps** at intervals.
- **Victorian cast-iron lamp columns** (a fluted base and a lantern top) and tall modern grey columns. OSM: 47 LED pole lamps and 42 electric pole lamps.
- **Dublin Bikes stations**: SG South 53.33745,-6.26171, SG East 53.33783,-6.25609 / 53.33753,-6.25637, Newman House, Clonmel St.
- A taxi rank on SG North (53.33915,-6.25735), 2 phone kiosks (53.33905,-6.25695), post boxes (a green Victorian type A outside Newman House).
- **Bilingual blue street plates** ("Faiche Stiabhna" is the Irish name on OSM). Bus stops (11) with shelters.

**Sounds.** Ducks and gulls at the lake, the fountains, the Luas bell and wheel squeal on the SG West curve, the bandstand's summer concerts, horses' hooves at the carriage stand.

### 2.2 Temple Bar

The earlier brief (`temple-bar.md` §A–C) still stands: street table, widths, materials, sign and lamp types. New findings from this pull and the photos:

- **Pub and bar density**: about 60 named pub, bar and nightclub nodes in the bbox. The fronts that give the quarter its "old-school" feel (all invented names in game, per temple-bar.md C3):

| Front | lat, lon | Look |
|---|---|---|
| The Temple Bar pub corner | TTL | Red; pubs agent |
| The Quays Bar | 53.34564,-6.26336 | Oxblood/green faience at Fownes St Lower |
| The Old Storehouse | 53.34513,-6.26267 | Crown Alley, black/gold |
| Gogarty | 53.34559,-6.26168 | Yellow render, flags, oriels |
| The Auld Dubliner | 53.34558,-6.26200 | 2-storey, green and gold |
| Palace Bar | 53.34595,-6.25958 | Fleet St, Victorian mahogany and mirrors, blue fascia |
| Bad Bob's | 53.34503,-6.26599 | Essex St E |
| Porterhouse | 53.34505,-6.26738 | Parliament St, 5 storeys, timber |
| Turk's Head | 53.34481,-6.26763 | Parliament St, Gaudí-ish tiled |
| Norseman / Farrington's | 53.34547,-6.26512 | Essex × Eustace |
| Fitzsimons | 53.34561,-6.26518 | A large corner bar at Eustace × Essex |
| Oliver St John Gogarty's Hostel / Merchant's Arch pub | – | Built |

  Names are trademarks: invent them, as `temple-bar.md` C3 says.
- **Culture buildings.** These make Temple Bar more than pubs, and they give the lanes landmarks:

| Building | lat, lon | Look |
|---|---|---|
| **IFI** (Irish Film Institute) | ~53.34495,-6.26510, Eustace St | The ex-Friends Meeting House: a Georgian brick front with a tall pedimented doorcase, a narrow entrance, and a **blue neon "IFI" sign** (`irish-film-institute-dublin.jpg`) |
| **The Ark** | Eustace St, ~53.34525,-6.26505 | Children's culture centre. Brick front on Eustace St, with **the curved copper-framed stage curtain wall facing Meeting House Square** (`20130807-dublin056.jpg`) |
| **Gallery of Photography / National Photographic Archive** | Meeting House Sq S and N | Pale 1990s Portland/render with a grid of square windows; Group 91 architecture (`dublin-city-gallery-of-photography.jpg`) |
| Project Arts Centre | 53.34495,-6.26632 | Essex St E; black box with a big graphic front |
| Temple Bar Gallery & Studios | 53.34575,-6.26393 | Temple Bar × Temple Lane; glass lantern top |
| Smock Alley Theatre | 53.34499,-6.26914 | Essex St W; a converted brick church with a big arched window |
| Temple Bar Music Centre / Button Factory | Curved St | |
| Central Bank plaza | – | Built. Add Crann an Óir (the gold tree sculpture, 53.34438,-6.26322); the plaza's steps and skaters |
| Sunlight Chambers | 53.34527,-6.26771 | Essex Quay × Parliament St; **a painted terracotta frieze** band |

- **Meeting House Square** (ways 25631150/188, 25677213; 25 x 30 m real):
  - An enclosed flagged square with a **chequered paving** zone.
  - **Four tall retractable umbrella masts** (steel poles with furled canopies; open for events and the Saturday market).
  - Movable timber benches on castors, steel bollards.
  - Red-brick walls on three sides, with The Ark curtain on the east side.
  - Gated at night.
  - Entered through a passage off Eustace St (way 44765175, steps and building passage) and from Temple Bar via Curved St.
  - **Temple Bar Food Market**: Saturdays, 20–30 stalls with striped gazebo canopies. The Temple Bar Book Market was at Temple Bar Square at weekends.
- **Temple Bar Square** (way 25631085): currently an in-game box. Its real outline is 41 x 21 m. Its south side is the red-brick gabled 5-storey block with a granite ground floor (see `refs/temple-bar/temple-bar-square.jpg`). Street band, book market.
- **Murals and art** (all nodes): The Dice Man (53.34564,-6.26501), Love Wall (53.34471,-6.26656), Einstein (53.34412,-6.26595), Rory Gallagher Corner (53.34530,-6.26550, a bronze guitar wall plaque), the Diceman's Corner, Dublin Characters, and the Icon Walk (Aston Place, 53.34628,-6.26014: a lane of painted panels). All are painted wall panels, which cost little and add a lot.
- **Furniture** (OSM, bbox): 286 wall lamps and 309 pole lamps, 53 flagpoles (flags on fronts), 89 bicycle stands, 92 bins, 24 bollards, 24 clocks (projecting clocks on fronts), 21 planters.
- **Street life**:
  - Buskers at Temple Bar Square, Merchant's Arch and Grafton top.
  - Stag and hen parties.
  - Rickshaws; taxis queuing on Eustace and Anglesea.
  - Delivery vans with kegs in the mornings.
  - **Viking Splash** amphibious DUKWs on the quays.
  - Crowds spill onto the setts at night. Music leaks from open pub doors, as trad sessions, which is a good sound hook.

### 2.3 Dame St, George's St and the Castle

**Dublin Castle** (way 350242806, the whole complex, 53.34291,-6.26687, 257 x 270 m real):

| Part | OSM / lat, lon | Look |
|---|---|---|
| **Upper Castle Yard** | ~53.34335,-6.26700 | A cobbled rectangle, ~95 x 40 m real. North side: the **Bedford Tower** (1761), a pedimented Portland frontispiece over an arch with an **octagonal cupola and clock**, flanked by two gates topped by **Justice (Cork Hill side) and Fortitude**. OSM nodes: Justice 53.34339,-6.26744, Fortitude 53.34331,-6.26790. South side: the red-brick State Apartments with a Portland centrepiece and a colonnaded ground floor (`bedford-tower-…jpg`, `dublin-castle-06.jpg`). |
| **Record Tower** | ~53.3429,-6.2666 | The 13th-century round keep: calp rubble, machicolated crenellated top, a few pointed windows. **The one medieval thing in the city centre.** |
| **Chapel Royal** | way 868152749, 53.34311,-6.26612 (as mapped) | Johnston 1814 Gothic revival in Tullamore limestone: tall traceried windows, crocketed pinnacles, crenellations, **carved heads round the exterior** (`dublin-castle-chapel-royal-record-tower.jpg`). It sits against the Record Tower on the Lower Yard. |
| **Lower Yard** | way 229883915, 53.34326,-6.26616 | Car park; Garda station; the Treasury building; the Castle Hall |
| **Dubh Linn Garden** | way 74600932, 53.34235,-6.26667, ~90 x 88 m real | A circular lawn with **serpentine Celtic-knot paths cut in the grass** (it doubles as a helipad), ringed by a path and walls. The Coach House (castellated Gothic toy fort, way 74600954) and the Chester Beatty (modern and 18th-century, 53.34220,-6.26745) are on its sides. Garda Memorial and Special Olympics gardens (`dubhlinnsite.jpg`). **From above this is the most striking shape in the south city.** |
| Castle St, Palace St, Cork Hill | Castle St: ways 372226836 and others, 171 m, one-way, asphalt. Cork Hill: 78 m. Palace St: 28 m pedestrian (the Palace St gate, facing the Olympia/Dame Lane). Ship St Great: 185 m, setts, along the Castle's west wall. | See §5 |

**South City Markets / George's Street Arcade** (node 3077161517, 53.34258,-6.26419):
- The block is bounded by S Great George's St (west, 316 m), Exchequer St (north), Drury St (east) and Fade St (south). It is roughly 125 x 45 m real.
- 1881 (Lockwood & Mawson), red brick and terracotta, 3 storeys plus a steep slate attic.
- **Pinnacled octagonal corner turrets**, a Gothic gable with a traceried window over the **double-arched main entrance**, stepped gables with finials along the roof, a rhythm of paired round-arched windows, and tall chimneys. Shop units along George's St with green awnings (`georges-st-arcade-dublin-doyler79.jpg`, `south-great-george-s-street-dublin.jpg`, `st-george-s-arcade-dublin-2018.jpg`).
- Inside: a glass-roofed arcade (way 27805936, 144 m through to Drury St), stalls and a vintage and records market (`market-doyler79.jpg`).
- **Priority: very high**. It is the defining building of the street.

**Dame St frontages.**
- **Stag's Head** (way 228968680, 53.34385,-6.26341): 1895 Victorian red brick and stone with a mahogany and stained-glass front, in Dame Court. Its sign is **a mosaic set into the Dame St footpath** (`stagsheadmosaic.jpg`), at the mouth of **Dame Court** (122 m, pedestrian, with a building passage from Dame St).
- **Dame Lane** (259 m service lane behind the south side): a row of pubs (Dame Tavern, 4 Dame Lane, the Stag's Head's back), a festoon lane at night.
- Along the south side: Trinity St and St Andrew's St corners, the International Bar (1838, 53.34317,-6.26190, Wicklow St), the Mercantile, Thomas Read's (Parliament St corner, curved glazed), the Olympia (built), Burton Chambers, and the Pawn Shop / City Pharmacy row by George's St.
- Along the north side: the Central Bank (built), the Trinity Bar, Mulligan and Haines, and Peadar Kearney's.
- **Furniture** (`20130807-dublin024.jpg`, `ornate-lamp-standards-…jpg`):
  - black cast-iron bollards with collar rings along the kerb;
  - the **ornate Victorian twin-arm lamp standards with shamrock bases** (Dublin Corporation pattern) at Cork Hill, City Hall and Parliament St;
  - A-boards, green Edward VII post boxes;
  - a double-lane bus corridor with red bus lanes.
- **S Great George's St** also has:
  - The George (53.34220,-6.26480): a gay bar with **rainbow flags** and a red front, and a strong night marker.
  - Pim Brothers' old red-brick Victorian building and the Castle House and Wicklow House 1970s blocks (`castle-house-…` on Commons).
  - The Long Hall (pubs agent).
  - Hogan's, the Globe, the Market Bar (Fade St) and Kellys Hotel (53.34195,-6.26460).
  - Dunnes Stores HQ at the south end.
- **Aungier St**: Whitefriar St Carmelite church (the front sits on Aungier St: a classical façade with a pedimented door), Darwin's, the Swan (York St corner, Victorian red brick and a Guinness-era front), and a Georgian terrace mixed with 1970s offices (`aungier-street-dublin-…jpg`).

**Sounds.** Buses and air brakes on Dame St, the Castle's flag halyards, trad music from Dame Lane, and market chatter in the arcade.

---

## 3. Missing streets and lanes (OSM geometry)

"Drivable" means it could join the car network. "Ped" means pedestrian (the player can still drive it slowly, as on Grafton St, and AI stays out). Lengths are real metres. Endpoints are OSM first and last nodes; see way ids in the pulls.

### 3.1 St Stephen's Green

| Street | Way(s) | Real length | OSM class | Endpoints | Game use |
|---|---|---|---|---|---|
| **Earlsfort Tce, north end** | 4628796 (partly) | ~250 m to Hatch St | secondary, 2-way | 53.33614,-6.25726 → 53.33386,-6.25862 | **Drivable**. The game way starts only at Hatch St. Depends on G0. |
| Hume St | 3792427 and others | 124 m | tertiary, one-way | 53.33790,-6.25544 → Ely Pl | Drivable, Georgian, E off SG East |
| Ely Place / Ely Pl Upper | 3792428, 47638297 | 124 + 48 m | tertiary | 53.33758,-6.25411 | Drivable. RHA Gallagher gallery. |
| York St | 4919197 | 181 m | unclassified, one-way | 53.33870,-6.26179 → 53.33926,-6.26433 | Drivable, W off SG West to Aungier St |
| Glovers Alley | 4919441 and others | 194 m | unclassified, sett / building passage | 53.33913,-6.26170 → 53.33949,-6.26277 | Drivable service lane beside the RCSI |
| Cuffe Lane | 14151844 | 108 m | residential | 53.33755,-6.26370 → 53.33852,-6.26367 | Minor |
| Montague St / Lane / Court | 922757660 and others | 57 / 100 / 38 m | – | off Harcourt St | Minor |
| Clonmel St | 13866376 | 74 m | unclassified | 53.33605,-6.26336 → 53.33599,-6.26225 | Minor, Iveagh Gardens gate |
| Stokes Place | 38167420 and others | 174 m | service | off SG South | Minor |
| Leeson Lane, Quinn's Lane, Stable Lane, Windsor Pl, Bells Lane, Proud's Lane, Crabbe Lane | – | 50–250 m | service | – | Skip (back lanes) |
| Park paths | 13 pedestrian + 105 footways | ~2.6 km | pedestrian / footway | in the park | **Ped only**, drawn as path surfaces (item G1), not `streets.json` ways |

### 3.2 Temple Bar (still missing after the first refinement)

| Street | Way | Length | Class / direction | Endpoints | Game use |
|---|---|---|---|---|---|
| **Meeting House Square** | 25631150/188, 25677213, passage 44765175 | area ~25 x 30 m | pedestrian, gated | 53.34530,-6.26556 → 53.34492,-6.26483 | **Ped area**, not drivable (passage 2–3 m) |
| **Temple Bar Square** (polygon) | 25631085 | 41 x 21 m | pedestrian area | around 53.34561,-6.26284 | Ped area (replace the box) |
| **Asdill's Row** | 25631021 | 58 m | residential, one-way S | 53.34615,-6.26255 → 53.34563,-6.26247 | **Drivable** loop from the quay |
| **Bedford Row** | 25631097 | 71 m | residential, one-way N | 53.34565,-6.26182 → 53.34629,-6.26189 | **Drivable** loop to the quay |
| **Aston Place** | 129212226 | 93 m | unclassified, one-way S | 53.34656,-6.26073 → 53.34573,-6.26060 | **Drivable**; the Icon Walk murals |
| **Price's Lane** | 129212232 | 105 m | unclassified, one-way N | 53.34577,-6.25992 → 53.34671,-6.26008 | Drivable |
| Fownes St Lower | 25631112 | 42 m | pedestrian | 53.34559,-6.26342 → 53.34596,-6.26348 | Ped; the Quays Bar corner |
| Crow St | 8404761 | 91 m | pedestrian, sett | 53.34419,-6.26380 → 53.34501,-6.26378 | Ped |
| Cecilia St | 129212228 | 59 m | pedestrian, sett | 53.34501,-6.26425 → 53.34503,-6.26337 | Ped |
| Curved St | 25631208 | 40 m | pedestrian | 53.34492,-6.26483 → 53.34488,-6.26425 | Ped; Music Centre |
| **Essex Gate** | 25631272 | 49 m | unclassified, one-way NE, sett | 53.34475,-6.26815 → 53.34495,-6.26751 | Drivable |
| Exchange St Upper / Lower | 27806145 / 27806076 | 83 / 143 m | one-way, sett / asphalt | – | Drivable (Smock Alley) |
| Crampton Court | 37264795 and others | 113 m | service / footway, passage | 53.34505,-6.26666 → 53.34466,-6.26647 | Ped |
| Crane Lane | 23721226 | 96 m | service, sett | 53.34500,-6.26710 → 53.34416,-6.26680 | Ped / service |
| Bedford Lane | 129212227 | 80 m | service, cobbles | – | Skip |
| Cow's Lane | 27806085 | 86 m | pedestrian | 53.34388,-6.26861 → 53.34462,-6.26898 | Ped; Cow's Lane market |
| Millennium Bridge | 31028727 | 46 m | footway, metal | 53.34623,-6.26513 → 53.34582,-6.26499 | Ped footbridge, lines up with Eustace St (Custom House Quay agent handles footbridges? Check.) |

### 3.3 Dame St, George's St and the Castle

| Street | Way | Length | Class / direction | Endpoints | Game use |
|---|---|---|---|---|---|
| **Dame Lane** | 42880481, 128944693 | 259 m | service, part `mv=no` | 53.34386,-6.26613 → 53.34384,-6.26445 (and on to Trinity St) | **Ped** lane of pubs |
| **Dame Court** | 8080825 and others | 122 m | pedestrian, passage from Dame St | 53.34302,-6.26371 → 53.34389,-6.26376 | Ped; the Stag's Head |
| **Trinity St** | 4919462 | 91 m | unclassified, one-way | 53.34425,-6.26238 → 53.34356,-6.26172 | Drivable, Dame St → Andrew St |
| **St Andrew St** | 4919463 and others | 127 m | unclassified, one-way | 53.34356,-6.26172 → 53.34386,-6.26087 | Drivable (Grafton quarter edge) |
| **Castle St** | 372226836 and others | 171 m | unclassified, one-way | 53.34339,-6.26888 → 53.34372,-6.26760 | **Drivable**. City Hall flank to Christ Church. |
| **Cork Hill** | 4919464 and others | 78 m | secondary / sett | at 53.34393,-6.26760 | Drivable; the Castle gate approach |
| Palace St | 663919469 | 28 m | pedestrian | 53.34411,-6.26612 → 53.34386,-6.26613 | Ped; the Castle's Palace St gate |
| **Ship St Great** | 264876950 | 185 m | unclassified, sett | 53.34108,-6.26694 → 53.34244,-6.26855 | Drivable; the Castle's west wall and the Ship St gate |
| Ship St Little | 22962976 | 103 m | sett | – | Minor |
| **Stephen St Lower / Upper** | 4919471 / 16309919 | 156 / 199 m | tertiary, one-way | George's St (Long Hall corner) → Aungier / Whitefriar | **Drivable** |
| **Fade St** | 4919538 | 78 m | unclassified, one-way | 53.34187,-6.26362 → 53.34216,-6.26468 | Drivable; the arcade's south side |
| **Drury St** | 24687121 and others | 217 m | unclassified / pedestrian part | 53.34209,-6.26348 → 53.34304,-6.26287 | Drivable (the arcade's east side; shared edge with the Grafton quarter) |
| George's Street Arcade | 27805936 and others | 144 m | footway / corridor | 53.34261,-6.26447 → 53.34246,-6.26341 | **Ped** through the building (like Merchant's Arch) |
| Castle Market | 4919540 | 56 m | pedestrian | – | Grafton quarter |
| Longford St Great / Little | 16309917 / 24349650 | 129 / 73 m | tertiary, one-way | – | Drivable, to Aungier St |
| Whitefriar St / Pl, Digges Lane, Bow Lane E, Mercer St, Johnson Pl | – | 90–180 m | – | – | Drivable minors south of Stephen St |
| Castle interior: Lower Yard, Back Avenue, Castle Steps | 229883912, 229883913, 25217854 | 215 / 188 / 109 m | service private / steps | – | Ped / service only |

---

## 4. Prioritised build list

Effort: S is under half a day, M is about a day, L is more than a day, for one agent. "Why" is recognisability from the driver's seat or the air.

### 4.1 St Stephen's Green

| # | What | Where (lat, lon) | Why | Effort | Depends on |
|---|---|---|---|---|---|
| **G1** | **Interior layout.** Tarmac paths from the OSM footways (drawn as a ground surface), the central sunken lawn and circle with 2 fountains and flower beds, **open lawns** (clear the random scatter out of the paths and the centre), trees clustered along paths and the perimeter belt | park; paths from the OSM pull | Today the inside is a blob forest. The formal Victorian layout is the park's identity. | L | Move the SG tree and shrub scatter out of `landmarks.js` (~2205) into a new module |
| **G2** | **The lake at real size** (~126 x 45 m game, L-shaped, from rel 14581057) with rockwork edges, islands, a waterfall at the W end, a duck house, **the O'Connell Bridge** (single rubble arch), and ducks and gulls (instanced, bobbing) | 53.33818–53.33928, -6.26089 – -6.25710; bridge 53.33874,-6.25896 | The single most photographed feature. The current 40 m ellipse is invisible from the air. | M | G1 (same module); water material from `landmarks.js`; reflections list |
| **G3** | **Bandstand** (white timber octagon, shingle roof), 3 Victorian shelters, the **Superintendent's Lodge** (Tudor half-timber) | 53.33754,-6.25963; lodge 53.33780,-6.26197 | Cheap props that read instantly | S–M | G1 |
| **G4** | **Statues and memorials** via the statue kit (`statues.js`): Three Fates in its pool, Wolfe Tone plus the granite "Tonehenge" ring and the Famine group, Ardilaun seated (a new pose or standing substitute), Emmet, Yeats "Knife Edge" (abstract), busts (Mangan, Markievicz, Kettle, Joyce), O'Donovan Rossa boulder, Lady Grattan fountain | table §2.1 | The gate set-pieces make each corner distinct (Three Fates SE, Tone NE) | M | Statue kit; G1 for the positions of the paths |
| **G5** | **Gates**: granite piers, cast-iron gates and lanterns at the Merrion Row, Leeson St, Harcourt St, Dawson/Shelbourne and East gates, cut into the railings, plus a path from each | gate nodes §2.1 | They are the park's "doors". At the moment the railings are continuous except at the arch. | S | `ground.js buildRailings` needs gap support; G1 |
| **G6** | **RCSI hero**: granite, Portland portico with 4 columns, pediment statues (statue kit), flag | ~53.3395,-6.2633 (SG West N end) | The west side's landmark; visible down the Luas line | M | Site in `sites.js`; filler exclusion |
| **G7** | **SG South set**: Iveagh House (Portland palazzo), Newman House pair (85 granite with the lion, 86 brick), **University Church porch**, Unitarian Church (SG West gable and spirelet) | §2.1 edges table | These turn the south and west sides from "any Georgian street" into the Green | M | G6 (same module) |
| **G8** | **Footpath furniture ring**: lime trees in the footpath all round, granite kerb posts, Victorian lamp columns, Dublin Bikes stations (4), taxi rank, phone kiosks, bilingual street plates | perimeter | Depth at driver's eye | S–M | The shared furniture kit (WP-X) |
| **G9** | **Street life**: jaunting cars (horse and carriage, idle with a bob) at SG North by the Shelbourne and the Grafton top, a rickshaw rank, people sitting on the lawns and benches, strollers on the paths, ducks | – | Owner's "alive". Horse carriages at the Green are iconic. | M | People system (sitting pose); G1 paths as walk lanes |
| G10 | **St Stephen's Green Luas stop kit** on SG West: shelters and poles, the terminus crossover, the cobbled strip | stop node SGW | The busiest stop in the city | S | Luas agent owns `luas.js` STOP_KITS: coordinate or hand over |
| G11 | **SE corner fix** (G0): move SGSE to 53.33614,-6.25726 and add Earlsfort Tce north (→ Hatch St). Build the flatiron corner shop (the "Regency" single-storey gabled front) and the yellow box. | SE corner | Makes Leeson St and Earlsfort read as the real fork | L (graph plus knock-on) | Owner decision; `dupcheck.mjs`, `footprints.mjs`; Kildare frame untouched |
| G12 | Sound zone: ducks and gulls near the lake, fountain splash, birdsong under the trees, a summer brass band at the bandstand (day), hooves at the carriage rank | – | Cheap and atmospheric | S | Audio beds (WP-X) |

### 4.2 Temple Bar

| # | What | Where | Why | Effort | Depends on |
|---|---|---|---|---|---|
| **T1** | **Fix the Merchant's Arch passage view** (the flat blue fill in b-03). Make the vault interior double-sided and open, so you see the lane, the square and the festoons through it from the quay and the Ha'penny Bridge. | 53.34594,-6.26284 | The sightline Ha'penny → arch → square is the quarter's postcard | S | – |
| **T2** | **Filler façade overhaul for the TEMPLEBAR style** (`buildings.js`): upper floors in dark or buff brick or muted render (cream, grey, ochre). Put the saturated colour on the ground-floor front only, with 1 in 6 fully painted. Build a **shopfront atlas** (pilasters, stall riser, recessed door, deep fascia with gilt serif letters, invented names, pub, café, gift and "Irish music" variants), **projecting hanging signs, flags on angled poles, projecting clocks**, and lit windows at night. Exchequer St and Wicklow St leave this style (Victorian brick instead). | all TB lanes | The owner's complaint, straight on. Shots b-02, b-06 and b-17 read as toy blocks. | L | `temple-bar.md` P3; perf check (atlas, instancing) |
| **T3** | **Temple Bar Square proper**: the OSM polygon, the red-brick gabled south block, a faience pub front at the Fownes Lower corner, no blank party walls onto the square (force windowed faces), the book-market tables at weekends, a busker spot | 53.34561,-6.26284 | The quarter's hub | M | T2 atlas; WP-S for the polygon |
| **T4** | **Meeting House Square**: flagged plus chequered paving, **4 umbrella masts** (furled; open with the market), timber benches on castors, **The Ark's copper stage curtain**, the Gallery of Photography and Photographic Archive fronts, gates, **the Saturday food-market stalls** (striped gazebos, crowd) | 53.3451,-6.2652 | A second square; the market is pure "alive" | M | WP-S (area plus passages) |
| **T5** | **Culture fronts on Eustace and Essex**: the IFI (Georgian doorcase and blue neon), The Ark (Eustace St front), Project Arts Centre, Temple Bar Gallery, Smock Alley (arched church window), Sunlight Chambers' terracotta frieze | §2.2 | Landmarks inside the lanes, so each lane is different | M | T2 |
| **T6** | **Missing car loops and lanes**: Asdill's Row, Bedford Row, Aston Place (with the Icon Walk mural panels), Price's Lane, Essex Gate, Exchange St Upper and Lower. Pedestrian: Fownes Lower, Crow St, Cecilia St, Curved St, Crampton Ct, Cow's Lane. | §3.2 | Real "tons of small side streets"; more loops to drive | M | **WP-S** (all `streets.json` work in one package) |
| **T7** | **Night character**: neon blade signs (red, green, blue) on 1 in 4 pubs, lit pub windows and doorway spill on the setts, brighter festoons, lit projecting signs, wet-sett specular (already in rain) | TB core | Temple Bar is a night place; currently only Crampton's glows | M | T2 (emissive atlas); Low/Battery cut for the light-pool count |
| T8 | **Murals** as painted panels: Dice Man, Love Wall, Einstein, Rory Gallagher corner, Dublin Characters | nodes §2.2 | Very cheap texture panels that give identity | S | T2 |
| T9 | **Street life**: crowds on the setts at night (a density boost after dark), buskers (a standing figure plus instrument and an audio source) at the Square, Merchant's Arch and Crown Alley, rickshaws, keg vans at morning loading, a hen-party group, taxis queuing on Eustace | – | "Alive" | M | People system (static actors), WP-X audio |
| T10 | **Sound**: trad music and chatter leaking from pub doors (positional loops at 4–6 pubs), busker loops, the market | – | Big payoff, small cost | S | WP-X |

### 4.3 Dame St, George's St and the Castle

| # | What | Where | Why | Effort | Depends on |
|---|---|---|---|---|---|
| **D1** | **South City Markets / George's Street Arcade block hero**: the whole block, with red brick and terracotta, turrets, Gothic gables, the arched entrance with a lantern, steep slate roofs and chimneys, green awnings over the shop units, and the arcade passage through to Drury St (glass roof, stalls) | block George's St / Exchequer St / Drury St / Fade St, entrance 53.34258,-6.26419 | Defines S Great George's St. Visible from Dame St. | L | WP-S (Fade St, Drury St); Long Hall is across Stephen St, pubs agent: no overlap |
| **D2** | **Dublin Castle core**: the Upper Yard (cobbled) with the **Bedford Tower** (cupola, clock) and its Justice and Fortitude gates, the red-brick **State Apartments** range, the **Record Tower** (round calp keep, machicolations), the **Chapel Royal** (Gothic limestone, pinnacles, traceried windows), the Lower Yard. **Replaces the `dublinCastle()` stub.** | §2.3 table | The city's origin; seen from Dame St through the Cork Hill gate and from the air | L | Sites; `footprints.mjs`; Castle St / Palace St from WP-S |
| **D3** | **Dubh Linn Garden**: the circular lawn with Celtic-knot paths, the ring path and walls, the Coach House (castellated toy fort), the Chester Beatty front, the Garda memorial garden | 53.34235,-6.26667 | The most striking plan shape in the south city, and good for the heli | M | D2 (same module) |
| **D4** | **Stag's Head + Dame Court + Dame Lane**: the Victorian pub hero (brick, stone, mahogany and stained glass, lanterns), **the mosaic in the Dame St footpath**, the Dame Court passage, Dame Lane as a festoon pub lane (Dame Tavern, 4 Dame Lane) | 53.34385,-6.26341 | Classic old-school pub down a side lane. Not on the pubs agent's list. | M | WP-S (Dame Lane, Dame Court); T2 atlas |
| D5 | **Dame St frontage pass**: a Victorian red-brick gabled row and ornate stone commercial fronts on the south side between George's St and Trinity St; Thomas Read's curved corner at Parliament St; the Olympia's blade signs lit at night; a bus corridor (red lanes, more buses: the backlog item "buses on Dame St") | Dame St | The brief's Dame St notes (the user's photos) | M | Olympia hero exists; fleet bus density |
| D6 | **Castle St, Cork Hill, Palace St, Ship St Great** with the Castle's outer walls and gates (Ship St gate, Palace St gate) | §3.3 | Lets you drive round the Castle; gives the Castle a street edge | M | WP-S; D2 |
| D7 | **George's St frontages**: The George (rainbow flags, red front, lit at night), Pim Brothers red brick, Kellys Hotel, Hogan's, the Market Bar on Fade St, plus a style rule so George's St reads **Victorian red brick** (not Temple Bar colour) | S Great George's St | Recognisable run to the Long Hall | M | D1; T2 atlas (shared) |
| D8 | **Aungier St**: Whitefriar St Church front, the Swan corner (York St), Darwin's; Stephen St Upper and Lower as streets | §2.3 | Rounds off the route to Camden St | M | WP-S |
| D9 | **Furniture**: the ornate shamrock-base twin lamp standards at Cork Hill, City Hall and Parliament St, black collar bollards along Dame St, Edward VII post boxes, A-boards | Dame St, Cork Hill | Depth at driver's eye | S | WP-X kit |
| D10 | Sound: buses and air brakes (existing), trad from Dame Lane, the arcade's market hum | – | – | S | WP-X |

### 4.4 Top 10 across all three areas

1. **G1 + G2: the Green's interior layout and the real-size lake with the O'Connell Bridge.** Today the park is a blob forest with an invisible pond.
2. **D1: the South City Markets / George's Street Arcade block.**
3. **T2: the Temple Bar façade overhaul.** Colour on the shopfront, not the whole wall, plus a real pub-front atlas, hanging signs and flags. This is the owner's "character" complaint.
4. **D2 + D3: Dublin Castle**: Record Tower, Chapel Royal, Bedford Tower and Upper Yard, and Dubh Linn Garden.
5. **T4: Meeting House Square with the umbrellas, The Ark curtain and the Saturday food market.**
6. **T6 + WP-S: the missing lanes and loops** (Asdill's Row, Bedford Row, Aston Place, Crow/Cecilia/Curved, Dame Lane/Dame Court, Castle St, Fade St, Stephen St).
7. **T7: night character**: neon, lit pub windows and light spill across Temple Bar and Dame Lane.
8. **G4 + G5: the Green's statues and gates**: Three Fates (SE), Wolfe Tone ring (NE), Ardilaun, and the gate piers.
9. **D4: the Stag's Head, the Dame St mosaic, Dame Court and Dame Lane.**
10. **G6 + G7: the Green's frontages**: RCSI, Iveagh House, Newman House, University Church, Unitarian Church.

Honourable mentions: T1 (the Merchant's Arch see-through bug, S, do it first), the street life and sound hooks (G9, T9, T10), and G11 (the SE corner geometry, which needs an owner decision).

---

## 5. Proposed work packages

Each package is about one build agent. Files are chosen so packages can run in parallel, except that **all `streets.json` edits go into WP-S**. That package should run first, or at least alone, because `streets.json` must not be edited by two agents at once (CLAUDE.md; node-ID gotcha).

| WP | Scope (items) | Files it owns | Must not touch | Order |
|---|---|---|---|---|
| **WP-S: street graph** (M–L) | T6 lanes and loops; the Temple Bar Sq and Meeting House Sq polygons as ped areas; Dame Lane, Dame Court, Trinity St, St Andrew St, Castle St, Cork Hill, Palace St, Ship St Great, Fade St, Drury St (west half), Stephen St Upper/Lower, Longford St, York St, Hume St, Glovers Alley; optionally G11 (SE corner + Earlsfort north) once the owner says yes | `src/data/streets.json` (via `streets-fmt.mjs`, `dupcheck.mjs`), small `geo.js` support for ped areas if needed | Hero files | **1st** (alone). Run `footprints.mjs` and `bridges.mjs`. |
| **WP-G1: the Green's interior** (L) | G1, G2, G3, G4, G5, G12 (park sounds as data hooks) | new `src/world/greenpark.js`, new `src/data/stephens-green.json` (paths, lake, gates from the OSM pull), the SG block in `landmarks.js` (remove the pond and scatter, call the new module), a gap option in `ground.js buildRailings` | Edges, streets.json | Any time (independent of WP-S) |
| **WP-G2: the Green's edges** (M–L) | G6, G7, G8, G10 (hand to the Luas agent if they are still running), the SE corner building if G11 is done | new `src/world/greenedge.js`, `sites.js` entries plus reserved boxes, `buildings.js` exclusions | Shelbourne / `kildare*.js`, Coppers / Harcourt St 29–30 and O'Donoghue's (pubs agent) | After WP-S if G11 is in; otherwise any time |
| **WP-T1: Temple Bar façades and squares** (L) | T1, T2, T3, T5, T8 | `buildings.js` TEMPLEBAR style plus a new shopfront atlas module (e.g. `src/world/shopfronts.js`, reusable by D4/D7 and by the Grafton quarter agent), `landmarks.js` Temple Bar section (square, arch fix) | The Temple Bar pub hero (pubs agent) | After WP-S (squares); the atlas can start at once |
| **WP-T2: Temple Bar and Meeting House Sq life** (M) | T4 (square build), T7 (night), T9, T10 | new `src/world/meetinghouse.js`, new `src/game/streetlife.js` (buskers, market stalls, carriages, rickshaws, static and seated people), people.js density hooks, `audio/city.js` positional loops | Façades (WP-T1) | After WP-T1's atlas (neon and emissive) |
| **WP-D1: Dublin Castle** (L) | D2, D3, D6 (walls and gates), D9 lamp standards at Cork Hill | new `src/world/castle.js` (replaces `dublinCastle()` in `landmarks.js`), `sites.js` castle entries | City Hall hero | After WP-S (Castle St, Palace St, Ship St) |
| **WP-D2: George's St and Dame St** (L) | D1, D4, D5, D7, D8, D10 | new `src/world/georges.js`, `buildings.js` style rule for George's St, Exchequer St and Dame St (coordinate the diff with WP-T1: different regexes, same function) | The Long Hall and Grogan's (pubs), the Castle (WP-D1), the Grafton-side lanes (Grafton quarter agent) | After WP-S and after the WP-T1 atlas |
| **WP-X: shared kits (small, first or alongside)** | A street-furniture kit (bilingual street plates, Dublin Bikes station, collar bollard, granite kerb post, shamrock twin lamp, Victorian post box, A-board, phone kiosk), a people seated/standing pose, audio positional-loop support | `furniture.js`, `props.js`, `statues.js` (seated pose), `audio/assets.js` + `city.js` loop API | Area heroes | **Early** (G8, G9, T9, D9 all use it) |

**Hand-offs to the Grafton quarter agent**:
- the lanes between Grafton St and George's St: Castle Market, William St S, Clarendon St, Johnson's Ct, Coppinger Row, Chatham St/Row, Harry St, Duke St, Anne St S, Balfe St, Lemon St, Duke Lane, Anne's Lane, Royal Hibernian Way, Westbury Mall, Tangier Lane;
- Powerscourt Townhouse, the Westbury, the Gaiety (King St S), and Neary's;
- the shopfront atlas from WP-T1, which it should reuse.

**Performance notes** (standing policy: pure efficiency changes go everywhere; looks-for-speed trades only on Low/Battery):
- The Temple Bar core is already the heaviest area (BUILD-REPORT: +3–4 ms GPU, instanced props 5.7 ms).
- WP-T1 and WP-T2 should **merge** façade decals into the atlas, not add meshes.
- Neon and light pools need a distance cut on Low/Battery.
- The Green's lawns are cheap. The tree count should go **down** in the interior, where open lawns replace the scatter, which pays for the lake, bandstand and statues.
- Castle and arcade heroes should be at 8–20k triangles each, with the AO in vertex colours, as the other heroes are.

---

## 6. Screenshots

The contact sheet `docs/research/hotspots-gtd-current.png` holds 18 shots from 32 taken (see the row labels). The full set was regenerated from these `LOOKS` in `tools/scenarios/look.mjs`:

- Green: `GR2→SGNW 0.55` (arch), `SGNW→SGW 0.12` (Luas), `SGNW:-6:0→DS1 0.25` (north), `KS1→SGNE 0.2` (Shelbourne), `SGNE→SGSE 0.15` (east), `SGSE→HC0 0.2` (south), `SGSW→HC1 0.15` (Harcourt), `@stephensGreen:-30:30→@stephensGreen:10:-18` (interior), `@stephensGreen:0:220` at eye 160 (aerial).
- Temple Bar: `TEU→TTL 0.5`, `TFO→TBQ 0.3`, `HPS→TBQ 0.05`, `CCA→TBQ`, `CFO→CAN`, `DEU→TEU`, `ES1→TEU`, `WM1→FL1`, `DM1→TTL`, `TBQ:0:140` at eye 120.
- Dame: `DM1→DM3 0.3`, `DSY→DM3 0.5`, `DM2→CG0`, `DM2→SGG1`, `SGG1→SGG2`, `SGG2→CU1`, `SGG1→WK1`, `@castle:0:-80` at eye 90.
- Night (NIGHT=1): `TFO→TTL 0.45`, `TFO→TBQ`, `DM1→DM3`, `DM2→SGG1`, `GR2→SGNW`.

(Note: the HUD street label in look.mjs shots shows the parked car's street, "O'Connell Street", not the camera's.)

---

## 7. Reference image credits

All images are Wikimedia Commons thumbnails, 800 px. The full records (URL, thumb, date, description) are in each folder's `sources.json`.

| File | Licence | Author | Source |
|---|---|---|---|
| stephens-green-audit/ucdnewmanhouse.jpg | CC BY-SA 3.0 | Dilbert55 at English Wikipedia | https://commons.wikimedia.org/wiki/File:UCDNewmanHouse.jpg |
| stephens-green-audit/iveagh-house-morning.jpg | CC BY-SA 3.0 | Jnestorius | https://commons.wikimedia.org/wiki/File:Iveagh_House_morning.jpg |
| stephens-green-audit/bicycle-taxis-dublin-october-2010.jpg | CC BY-SA 3.0 | Ardfern | https://commons.wikimedia.org/wiki/File:Bicycle_Taxis,_Dublin,_October_2010.JPG |
| stephens-green-audit/luas-tram-at-st-stephen-s-green-geograph-org-uk-446156.jpg | CC BY-SA 2.0 | Raymond Okonski | https://commons.wikimedia.org/wiki/File:Luas_Tram_at_St_Stephen%27s_Green_-_geograph.org.uk_-_446156.jpg |
| stephens-green-audit/royal-college-of-surgeons-in-ireland-st-stephens-green-1-geo.jpg | CC BY-SA 2.0 | Harold Strong | https://commons.wikimedia.org/wiki/File:Royal_College_of_Surgeons_in_Ireland,_St._Stephens_Green_(1)_-_geograph.org.uk_-_715735.jpg |
| stephens-green-audit/leeson-street-junction-earlsfort-terrace-and-stephens-green.jpg | CC BY-SA 2.0 | William Murphy | https://commons.wikimedia.org/wiki/File:Leeson_Street_junction_Earlsfort_Terrace_and_Stephens_Green.jpg |
| stephens-green-audit/duckpond-and-bandstand-st-stephen-s-green.jpg | CC BY-SA 4.0 | Rob Hurson | https://commons.wikimedia.org/wiki/File:Duckpond_and_bandstand,_St._Stephen%27s_Green.jpg |
| stephens-green-audit/st-stephen-s-green-lake-dublin-5421973288.jpg | CC BY 2.0 | kathryn | https://commons.wikimedia.org/wiki/File:St._Stephen%27s_Green_Lake,_Dublin-5421973288.jpg |
| stephens-green-audit/the-luas-on-harcourt-street-2855262065.jpg | CC BY-SA 2.0 | William Murphy | https://commons.wikimedia.org/wiki/File:The_LUAS_on_Harcourt_Street_(2855262065).jpg |
| stephens-green-audit/centre-of-st-stephens-green.jpg | CC BY-SA 4.0 | CraftyCaedus | https://commons.wikimedia.org/wiki/File:Centre_of_St_Stephens_Green.jpg |
| stephens-green-audit/a-small-cobbled-area-in-st-stephens-green.jpg | CC BY-SA 4.0 | CraftyCaedus | https://commons.wikimedia.org/wiki/File:A_small_cobbled_area_in_St_Stephens_Green.jpg |
| stephens-green-audit/looking-north-towards-grafton-street-from-st-stepehens-green.jpg | CC0 | MarioMagdic | https://commons.wikimedia.org/wiki/File:Looking_North_towards_Grafton_Street_from_St._Stepehens_Green_in_Dublin,_Ireland.jpg |
| stephens-green-audit/51-st-stephen-s-green-dublin.jpg | CC BY-SA 4.0 | M.nelson | https://commons.wikimedia.org/wiki/File:51_St_Stephen%27s_Green_Dublin.jpg |
| stephens-green-audit/dublin-unitarian-church-geograph-org-uk-6028050.jpg | CC BY-SA 2.0 | N Chadwick | https://commons.wikimedia.org/wiki/File:Dublin_Unitarian_Church_-_geograph.org.uk_-_6028050.jpg |
| stephens-green-audit/gate-lodge-st-stephen-s-green-geograph-org-uk-6028063.jpg | CC BY-SA 2.0 | N Chadwick | https://commons.wikimedia.org/wiki/File:Gate_Lodge,_St_Stephen%27s_Green_-_geograph.org.uk_-_6028063.jpg |
| stephens-green-audit/an-old-water-pillar-st-stephen-s-green-geograph-org-uk-60280.jpg | CC BY-SA 2.0 | N Chadwick | https://commons.wikimedia.org/wiki/File:An_old_water_pillar,_St_Stephen%27s_Green_-_geograph.org.uk_-_6028065.jpg |
| stephens-green-audit/central-flower-beds-st-stephen-s-green-geograph-org-uk-60309.jpg | CC BY-SA 2.0 | N Chadwick | https://commons.wikimedia.org/wiki/File:Central_flower_beds,_St_Stephen%27s_Green_-_geograph.org.uk_-_6030974.jpg |
| stephens-green-audit/lake-st-stephen-s-green-geograph-org-uk-6031026.jpg | CC BY-SA 2.0 | N Chadwick | https://commons.wikimedia.org/wiki/File:Lake,_St_Stephen%27s_Green_-_geograph.org.uk_-_6031026.jpg |
| stephens-green-audit/bench-in-st-stephens-green.jpg | CC BY-SA 4.0 | Finnfrog99 | https://commons.wikimedia.org/wiki/File:Bench_in_st_stephens_green.jpg |
| temple-bar-audit/irish-film-institute-dublin.jpg | CC0 | DubhEire | https://commons.wikimedia.org/wiki/File:Irish_Film_Institute,_Dublin.JPG |
| temple-bar-audit/20130807-dublin015.jpg | CC BY-SA 3.0 | Jean Housen | https://commons.wikimedia.org/wiki/File:20130807_dublin015.JPG |
| temple-bar-audit/20130807-dublin056.jpg | CC BY-SA 3.0 | Jean Housen | https://commons.wikimedia.org/wiki/File:20130807_dublin056.JPG |
| temple-bar-audit/20130807-dublin057.jpg | CC BY-SA 3.0 | Jean Housen | https://commons.wikimedia.org/wiki/File:20130807_dublin057.JPG |
| temple-bar-audit/temple-bar-dublin-georgianisch-22483153771.jpg | CC BY 2.0 | dronepicr | https://commons.wikimedia.org/wiki/File:Temple_Bar_Dublin_georgianisch_(22483153771).jpg |
| temple-bar-audit/dublin-city-gallery-of-photography.jpg | CC BY-SA 4.0 | Oliver Gargan | https://commons.wikimedia.org/wiki/File:Dublin_City_Gallery_Of_Photography.jpg |
| temple-bar-audit/the-ark-dublin.jpg | CC0 | Sheila1988 | https://commons.wikimedia.org/wiki/File:The_Ark,_Dublin.jpg |
| dame-castle-audit/dubhlinnsite.jpg | Public domain | Brendan K Ward | https://commons.wikimedia.org/wiki/File:DubhlinnSite.JPG |
| dame-castle-audit/chapel-royal-dublin-castle-geograph-org-uk-1080648.jpg | CC BY-SA 2.0 | Chris Whippet | https://commons.wikimedia.org/wiki/File:Chapel_Royal,_Dublin_Castle_-_geograph.org.uk_-_1080648.jpg |
| dame-castle-audit/georges-st-arcade-dublin-doyler79.jpg | CC BY-SA 3.0 | Doyler79 | https://commons.wikimedia.org/wiki/File:Georges_St_Arcade_Dublin_doyler79.jpg |
| dame-castle-audit/market-doyler79.jpg | CC BY-SA 3.0 | Doyler79 | https://commons.wikimedia.org/wiki/File:Market-doyler79.JPG |
| dame-castle-audit/dublin-castle-chapel-royal-record-tower.jpg | CC BY-SA 3.0 | J.-H. Janßen | https://commons.wikimedia.org/wiki/File:Dublin_Castle_Chapel_Royal_Record_Tower.JPG |
| dame-castle-audit/dublin-castle-record-tower-01.jpg | CC BY-SA 3.0 | J.-H. Janßen | https://commons.wikimedia.org/wiki/File:Dublin_Castle_Record_Tower_01.JPG |
| dame-castle-audit/20130807-dublin061.jpg | CC BY-SA 3.0 | Jean Housen | https://commons.wikimedia.org/wiki/File:20130807_dublin061.JPG |
| dame-castle-audit/st-george-s-arcade-dublin-2018.jpg | CC BY-SA 4.0 | Antony-22 | https://commons.wikimedia.org/wiki/File:St._George%27s_Arcade_Dublin_2018.jpg |
| dame-castle-audit/south-great-george-s-street-dublin.jpg | CC BY-SA 2.0 | William Murphy | https://commons.wikimedia.org/wiki/File:South_Great_George%27s_Street_Dublin.jpg |
| dame-castle-audit/stagsheadmosaic.jpg | Public domain | Diane duane | https://commons.wikimedia.org/wiki/File:StagsHeadMosaic.jpg |
| dame-castle-audit/bedford-tower-dublin-castle-dublin-ireland-geograph-org-uk-3.jpg | CC BY-SA 2.0 | Peter Gerken | https://commons.wikimedia.org/wiki/File:Bedford_Tower,_Dublin_Castle,_Dublin,_Ireland_-_geograph.org.uk_-_333854.jpg |
| dame-castle-audit/central-bank-of-ireland-dame-street-dublin-geograph-org-uk-7.jpg | CC BY-SA 2.0 | Hector Davie | https://commons.wikimedia.org/wiki/File:Central_Bank_of_Ireland,_Dame_Street,_Dublin_-_geograph.org.uk_-_712576.jpg |
| dame-castle-audit/dublin-castle-06.jpg | CC BY-SA 3.0 | J.-H. Janßen | https://commons.wikimedia.org/wiki/File:Dublin_Castle_06.JPG |
| dame-castle-audit/stag-s-head-dublin-1.jpg | CC BY 2.0 | Adam Bruderer | https://commons.wikimedia.org/wiki/File:Stag%27s_Head,_Dublin_1.jpg |
| dame-castle-audit/20130807-dublin024.jpg | CC BY-SA 3.0 | Jean Housen | https://commons.wikimedia.org/wiki/File:20130807_dublin024.JPG |
| dame-castle-audit/20130807-dublin028.jpg | CC BY-SA 3.0 | Jean Housen | https://commons.wikimedia.org/wiki/File:20130807_dublin028.JPG |
| dame-castle-audit/ornate-lamp-standards-with-shamrocks-in-georgian-dublin-pano.jpg | CC BY 3.0 | Pastor Sam | https://commons.wikimedia.org/wiki/File:Ornate_Lamp_Standards_with_Shamrocks_in_Georgian_Dublin._-_panoramio.jpg |
| dame-castle-audit/old-shop-front-south-great-george-s-street-dublin.jpg | CC BY-SA 4.0 | Oliver Gargan | https://commons.wikimedia.org/wiki/File:Old_Shop_Front,_South_Great_George%27s_Street,_Dublin.jpg |
| dame-castle-audit/aungier-street-dublin-geograph-org-uk-4794354.jpg | CC BY-SA 2.0 | Ian S | https://commons.wikimedia.org/wiki/File:Aungier_Street,_Dublin_-_geograph.org.uk_-_4794354.jpg |

One download (`End of tram lines`, geograph 1578779) failed on Commons rate limiting (HTTP 429) and is not used.

## 8. Open questions for the owner

1. **The Green's shape (G0/G11)**: fix the SE corner and Earlsfort Tce, or accept the current rectangle?
2. Should the Green's paths be **drivable** (slowly, like the pedestrian zones) or kerbed off? The lake must be solid either way.
3. Should Meeting House Square's food market and the umbrellas depend on the day (Saturday) or always show?
4. Dublin Castle: should the Upper Yard be drivable through the Cork Hill gate? It really is car-accessible for official traffic, and it would make a great "secret" route.
