# The Liffey's riverside landmarks (`liffey-quays`): research and build notes

Scope: Rowan Gillespie's *Famine* on Custom House Quay, the *Jeanie Johnston* tall ship, the CHQ building (Stack A,
home of EPIC), the Liffey Boardwalk, the Millennium Bridge, the Seán O'Casey Bridge and the Rosie Hackett Bridge.
Not in scope: the Loopline Bridge (the railway work builds it; the space between Butt Bridge and Talbot Memorial
Bridge is left alone).

- Raw OSM: `data/osm/liffey-quays.json`. Overpass `out geom`, bbox **S 53.3455, W -6.2690, N 53.3495, E -6.2440**
  (bridges, man_made, tourism, historic, memorials, artworks, named buildings, the CHQ block, railways, highways, lamps,
  benches, water). Snapshot `timestamp_osm_base` 2026-09-29T21:04:21Z. ODbL.
- References: `refs/liffey-quays/` holds 30 images from Wikimedia Commons (CC BY / CC BY-SA; credits in §2 and
  `refs/liffey-quays/sources.json`). Public-domain-tagged files were skipped (the licence rule allows only CC0, CC BY
  and CC BY-SA). No Google imagery.
- Facts from English Wikipedia (Jeanie Johnston, Seán O'Casey Bridge, Millennium Bridge (Dublin), Rosie Hackett
  Bridge, CHQ Building, Liffey Boardwalk), read through the MediaWiki API with a generic User-Agent.
- Game coordinates come from re-implementing `project()` in `src/world/geo.js`.

---

## 1. Map data: real positions and how the game differs

### 1.1 The game's river is not where the real one is (VERIFIED)

The game's banks are the quay road centrelines offset by the quay's half width plus its footpath (`geo.js`
`bankOffset`, 9 m). The quay nodes are coarse, and **the river keeps (roughly) its real width while the city is at half
scale**, so the game's north bank on Custom House Quay is ~15-20 m north of where an absolute projection puts the real
quay wall:

| Feature | Real (OSM) | Projected game (x, z) | Game bank there |
|---|---|---|---|
| Famine group (way 666422768) | 53.34804, -6.25004 | 302.6, -87.3 | north bank z ≈ -95.5: **the projection is 8 m out in the river** |
| O'Casey Bridge, north end | 53.34783, -6.24792 | 373.1, -75.8 | north bank z ≈ -94 |
| O'Casey Bridge, south end | 53.34696, -6.24803 | 368.0, -27.6 | south bank z ≈ -37 |
| Jeanie Johnston hull (way 590878259) | 53.34762, -6.24674 | 401.5 (bow) to 423.4, z -64 | north bank z ≈ -93.5 |
| CHQ (way 581158887) | 53.34882, -6.24784 | x 360-392, z -93 to -168 | the quay road runs at z ≈ -103, Mayor St Lower at z ≈ -160 |
| Millennium Bridge (way 568699876) | 53.34601, -6.26507 | -279 (N) / -273 (S), z 15-45 | lands on NQ5 / SQ5 almost exactly |
| Rosie Hackett Bridge (way 282571104) | 53.34763, -6.25733 | x 53-67, z -51 to -78 | lands on NQ9 (Marlborough St) / SQ9 (Burgh Quay at Hawkins St) |

**Rule used:** positions *along* the river from the OSM x, positions *across* it from the game's own banks
(`liffeysites.js bankAt()`).

**The game's Talbot Memorial Bridge lands ~70 m east of the real one** (NQ12 x 320.6; the real bridge is at x ≈ 250).
The Famine group really stands ~50 m east of Talbot, which in the game would put it *under* the bridge. It keeps the
real order (Talbot, the Famine, the O'Casey footbridge, the ship, Commons Street) and stands just east of the game's
Talbot, x 334-350. The O'Casey footbridge, the ship and CHQ are on their real x.

### 1.2 The landmarks

| Landmark | Facts (Wikipedia, OSM) | Game |
|---|---|---|
| **Famine** (Rowan Gillespie, 1997) | Six emaciated bronze figures and a starving dog walking east along the quay towards the port, on a cobbled strip between the riverside path and the road; in-ground uplighters | 6 figures (4 kit bodies) + dog, 1.92-2.12 m, on a granite strip on the quay footpath (3.5 m kerb to parapet) |
| **Jeanie Johnston** (2002 replica of the 1847 barque) | Three-masted barque, 47 m o/a, 37.5 m on deck, beam 8 m, air draft 28 m, draught 4.6 m; black hull, white band with painted ports; museum ship on a pontoon at Custom House Quay, gangway at the stern end, bow upriver | 0.75 scale: 28 m on deck, beam 6 m, masts to 21 m, bowsprit +8 m |
| **CHQ** (Stack A, John Rennie, 1820; restored 2005) | Cast-iron, brick and calp warehouse, 1 storey (+ vaults), 11 m; four parallel pitched roofs; a glazed quay front whose four gables follow the roofs ("THE chq BUILDING"); EPIC in the vaults | 30 m wide on the quay, 37.8 m deep (the game block is only ~40 m deep), 7 m eaves + 4 m gables |
| **Liffey Boardwalk** (2000, extended 2005) | Hardwood boardwalk cantilevered off the north quay walls outside the granite parapet, Grattan Bridge to Butt Bridge, broken at each bridge (ways 43325905, 43325903, 43319604, 286891495, 286891496); boards run along the walk; stainless posts with horizontal bars and a heavy timber handrail; long timber benches against the parapet; planters; tall lamps | 3.6 m deck, top 0.22 m below the pavement, 5 runs between the bridges, ~480 m in all |
| **Millennium Bridge** (1999, Howley Harrington / Price & Myers) | Pedestrian, 51 m long (41 m span), ~4 m wide; a slender steel portal truss on concrete haunches: flat deck, Warren web, the bottom chord deepening into the ends; light grey steel; tall lamp standards with saucer heads at the landings | footbridge NQ5-SQ5, 4 m deck, 0.42 m camber, truss 0.32 m deep mid-span to 2.3 m at the haunches |
| **Seán O'Casey Bridge** (2005, O'Neill / O'Connor Sutton Cronin) | Cable-stayed swing footbridge, 97.6 m, 4.54 m wide, 3 spans: two balanced arms on piers in the river; at each pier a V of grey box struts on each side of the deck with stays fanning to the deck; mesh balustrade leaning out | footbridge on its real line (x 373 N / 368 S), deck 4.6 m, piers at the quarter points, struts 8.5 m out and 4.2 m up |
| **Rosie Hackett Bridge** (2014) | Public transport, taxis, cyclists and pedestrians only; 48 m single smooth concrete span, 26 m wide; carries the Luas Green Line (southbound, from Marlborough St to Hawkins St) | road bridge way NQ9-SQ9, width 18, `access: destination`, a flat concrete arch with slim steel railings |

### 1.3 The Luas and the Rosie Hackett Bridge

The real southbound Green Line crosses the Liffey on the Rosie Hackett Bridge (Marlborough St -> bridge -> Hawkins St
-> College St), the northbound on O'Connell Bridge. **The game's Green Line routing belongs to the Luas work** (per the
coordinator), so `luasGreen` is untouched: the bridge is an 18 m road bridge way with room down its middle for the two
tracks (7.4 m bed) and a bus lane each side. The south landing is SQ9, which is where Hawkins Street meets Burgh
Quay; there is no Hawkins Street way in the game yet.

---

## 2. Reference images (`refs/liffey-quays/`)

All from Wikimedia Commons, 1280 px thumbnails (or the original if smaller).

| File | Author | Licence | Shows |
|---|---|---|---|
| 01-famine-group-wide.jpg | William Murphy | CC BY-SA 2.0 | the group on the quay |
| 02-famine-chadwick.jpg | N Chadwick | CC BY-SA 2.0 | figures, heights against the railing |
| 03-famine-dog.jpg | Joseph Mischyshyn | CC BY-SA 2.0 | the starving dog, head down |
| 04-famine-carried.jpg | Suzanne Mischyshyn | CC BY-SA 2.0 | the man carrying a limp figure over his shoulders |
| 05-famine-landscape.jpg | CraftyCaedus | CC BY-SA 4.0 | **key view**: the line from the east, cobbled strip, lamps, trees |
| 06-famine-figures.jpg | Holger Uwe Schmitt | CC BY-SA 4.0 | figures side-on |
| 07-jj-custom-house-quay.jpg | Zairon | CC BY 4.0 | **key view**: the ship broadside, pontoon, gangway |
| 08-jj-bow.jpg | Zairon | CC BY 4.0 | bow, bowsprit |
| 09-jj-from-river.jpg | Donaldytong | CC BY-SA 3.0 | rig from astern, pontoon, quay lamps |
| 10-jj-docklands.jpg | Eric Jones | CC BY-SA 2.0 | ship with the O'Casey bridge |
| 11-jj-night.jpg | Miguel Mendez | CC BY 2.0 | the ship floodlit at night |
| 12-jj-custom-house.jpg | Carroll Pierce | CC BY-SA 2.0 | ship, O'Casey bridge, Custom House |
| 13-millennium-bridge.jpg | Darrin Antrobus | CC BY-SA 2.0 | Millennium Bridge elevation |
| 14-millennium-ormond.jpg | Joseph Mischyshyn | CC BY-SA 2.0 | **key view**: truss, deck, Ormond Quay landing, boardwalk |
| 15-millennium-deck.jpg | N Chadwick | CC BY-SA 2.0 | deck and balustrade |
| 16-millennium-night.jpg | Smirkybec | CC BY-SA 4.0 | landing lamps (saucer heads); a temporary light arch, not modelled |
| 17-ocasey-from-quay.jpg | Eric Jones | CC BY-SA 2.0 | O'Casey from Custom House Quay |
| 18-ocasey-elevation.jpg | Joseph Mischyshyn | CC BY-SA 2.0 | **key view**: piers, V struts, stays |
| 19-ocasey-deck.jpg | N Chadwick | CC BY-SA 2.0 | deck, leaning mesh balustrade, struts through it, CHQ gables beyond |
| 20-ocasey-zairon.jpg | Zairon | CC BY 4.0 | box girder, tube spine, piers |
| 21-rosie-hackett-downstream.jpg | Guliolopez | CC BY-SA 3.0 | Rosie Hackett from O'Connell Bridge |
| 22-rosie-hackett-chadwick.jpg | N Chadwick | CC BY-SA 2.0 | the thin flat arch, planters on the deck |
| 23-rosie-hackett-upstream.jpg | Guliolopez | CC BY-SA 3.0 | from Butt Bridge |
| 24-chq-quay.jpg | Eric Jones | CC BY-SA 2.0 | **key view**: the four glass gables, "THE chq BUILDING" |
| 25-chq-building.jpg | Dublinprojekt | CC BY-SA 4.0 | brick and glass |
| 26-chq-dock.jpg | Eric Jones | CC BY-SA 2.0 | from George's Dock |
| 27-boardwalk-ormond.jpg | Ridiculopathy | CC BY-SA 4.0 | **key view**: boards along the walk, timber handrail, benches |
| 28-boardwalk-night.jpg | John Flanagan | CC BY 2.0 | the boardwalk at night |
| 29-boardwalk-chadwick.jpg | N Chadwick | CC BY-SA 2.0 | long benches, tall lamps, barred balustrade |
| 30-boardwalk-bachelors.jpg | Barcex | CC BY-SA 3.0 | Bachelors Walk |

---

## 3. What was built (phase 2)

| Piece | Where | Tris | Notes |
|---|---|---|---|
| Famine figures | `tools/blender/famine_bodies.py`, `build_famine.py` -> `public/models/famine.glb` (37 KB) | 4 x 1.2k + dog 0.33k | statue-kit bodies `famine_carrier`, `famine_shawl`, `famine_bundle`, `famine_sack`, `famine_dog`: starved proportions (limbs x0.7, torso x0.8, full-size heads), elongated, ragged folded coats. Loaded by `statues.js` only when a famine body is queued; new finish `famineBronze` |
| Famine setting | `src/world/liffey.js` | 0.5k | granite strip, bronze base plates, in-ground uplighters (glow at night), colliders per figure; bus stops and bins kept off the strip (`furniture.js`) |
| Liffey Boardwalk | `liffey.js` | 17.3k | deck, edge beam and soffit ribbons following the bank; brackets to the wall every 3 m; leaning barred balustrade (the balustrade mesh texture turned on its side) with a timber handrail; lamps every 16 m, long benches and planters every 32 m |
| Millennium Bridge | `liffey.js`, `ground.js` footbridges | 3.8k | truss, deck, balustrade, concrete haunches, four saucer lamps (collide) |
| Seán O'Casey Bridge | `liffey.js`, `ground.js` footbridges | 4.1k | deck, soffit, tube spine, piers and pivots, 8 struts, 26 stays, LED handrail |
| Jeanie Johnston | `liffey.js` | 2.0k + ~90 rigging lines | lofted hull with sheer and a band/port texture (the band glows faintly at night, floodlit), deck, deckhouses, 3 masts, 10 yards with furled sails, mizzen gaff and boom, bowsprit, shrouds and stays as one line set, deck lanterns, pontoon, both gangways |
| CHQ | `liffey.js`, `sites.js` reserved | 0.3k | brick walls with round-headed windows, four roofs with glazed ridges, the gabled glass front with the lettering (lit at night) |
| Rosie Hackett Bridge | `streets.json` way, `ground.js buildBridge` | (generic bridge) | single flat arch in smooth concrete, slim railings |

- Places: **Famine Memorial**, **Jeanie Johnston**, **Millennium Bridge**, **Seán O'Casey Bridge** (sites.js, HUD
  blurbs, map glyphs). CHQ is `extraSites.chq` and in `reserved` (no filler on it).
- Water glow: boardwalk lamps (every other one), both footbridges, the ship, CHQ's front.
- Materials: six of its own (boards, hull, CHQ brick, CHQ glass, lettering, balustrade mesh); the rest share the
  landmark set. Everything is merged into one world-space mesh per material before the static batch
  (`mergeByMaterial`), which cut the new batch buckets from 23 to ~15.
- Low / Battery saver: none of it casts the sun shadow (looks-for-speed, so Low only).

### 3.1 Frame cost

`tools/scenarios/areaperf.mjs`, four spots (O'Connell Bridge looking east, Custom House Quay at the Famine, Bachelors
Walk, Wellington Quay by the Millennium Bridge). Draw calls and triangles per frame (all passes):

| Spot | High before | High after | Low before | Low after |
|---|---|---|---|---|
| O'Connell Bridge east | 570 / 1.99M | 602 / 2.05M | 425 / 1.39M | 456 / 1.45M |
| Famine | 471 / 1.57M | 504 / 1.64M | 333 / 0.98M | 366 / 1.06M |
| Bachelors Walk | 638 / 1.97M | 662 / 2.03M | 433 / 1.19M | 466 / 1.27M |
| Millennium Bridge | 496 / 1.53M | 515 / 1.58M | 373 / 1.12M | 392 / 1.17M |

(The Low "after" numbers are from before the Low-only shadow cut, so they are an upper bound.) GPU ms on this machine
were dominated by other agents' concurrent runs (the same spot varied 45-120 ms between runs), so they are not quoted.

### 3.2 Tests

`footprints.mjs`: 0 on roads. `bridges.mjs`: no road over water (28 bridge ways, the Rosie Hackett included).
`dupcheck.mjs`: ok. Compare sheet: `docs/research/liffey-quays-compare.png` (left reference, right game).

---

## 4. Open questions / not done

1. **Talbot Memorial Bridge** lands 70 m east of the real one; moving NQ12/SQ12 west would let the Famine stand on its
   real spot. Not done (it would shift Memorial Road and the railway work's space).
2. **Hawkins Street** is missing; the Rosie Hackett lands at SQ9. The Luas work will route the southbound Green Line.
3. **EPIC** is only a name in the Places blurb: the vaults are underground and the museum entrance is in the glass
   front. George's Dock (water behind CHQ) is not in the game.
4. The O'Casey bridge's swing is not animated; the ship does not move.
5. The famine figures are kit proxies (≈1.2k tris each): they read as the group at game distances, not as Gillespie's
   surfaces close up.
