# Famous pubs: research and build notes (`pubs`)

Ten real Dublin pubs, built by a procedural pub-front kit (`src/world/pubs.js`) from specs in `src/world/pubsites.js`.
They replace the filler building at each site; the invented "Crampton's Bar" on the Temple Bar corner is gone and the
real Temple Bar pub stands there. Comparison sheet: `docs/research/pubs-compare.png` (reference photo, game by day,
game after dark).

Sources: OpenStreetMap via Overpass (fetched 2026-09-29, ODbL; raw pulls in `data/osm/pubs.json` and
`data/osm/pubs-streets.json`), and free-licensed Wikimedia Commons photos (table below, also `refs/pubs/sources.json`).
No Google imagery. Requests used the generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`.

The pub names are the real ones and are used as signage text. No brand logos are drawn: the lager awnings on the
Bleeding Horse and Grogan's carry the pub's own name (or nothing) instead of Carlsberg or Heineken, and there are no
Guinness harps or toucans.

## Positions (OSM)

| Pub | OSM | Address | Centroid (lat, lon) | Footprint (OSM) | Game placement |
|---|---|---|---|---|---|
| **The Temple Bar** | way 294962764 | 47-48 Temple Bar | 53.345461, -6.264059 | 19.6 m on Temple Bar x 13.7 m down Temple Lane S, L-shaped | SE corner of Temple Bar x Temple Lane South (`TTL`-`TFO`), 16 x 13 m, the corner face painted. Same spot as the old invented pub |
| **The Long Hall** | way 351409390 | 51 South Great George's St | 53.341856, -6.265315 | 6.9 m front x 23 m deep (the long bar) | West side of George's St, between Exchequer St (`SGG1`) and the new Stephen St Lower junction (`SGGS`), 7.2 x 14 m |
| **Kehoe's** | way 230613179 | 9 South Anne St | 53.341259, -6.259444 | 7.3 m front x 16.7 m | North side of the new South Anne St (`GR2`-`DSA`) |
| **J. Grogan's** (Castle Lounge) | way 229316784 | 15 South William St | 53.342251, -6.262723 | 6.7 m on William St x 15.7 m along Castle Market | West side of the new South William St at the Castle Market corner (`SW1`-`SW2`, corner `CM1`), the Castle Market face painted |
| **Davy Byrnes** | way 270968057 | 21 Duke St | 53.341851, -6.259362 | 6.6 m front x 9 m | South side of the new Duke St (`DKM`-`GRD`), near Grafton St |
| **Mulligan's** | way 228284414 | 8-9 Poolbeg St | 53.346964, -6.255542 | 16.6 m front | See note below: on Burgh Quay (`SQ9`-`SQ10`), 15.5 x 9 m, just west of College Square |
| **The Bleeding Horse** | way 283771391 | 24-25 Camden St Upper | 53.333505, -6.264745 | 17.8 m on Camden St x ~19 m along Charlotte Way | East side of Camden St Upper at the Charlotte Way corner (`GXSCM3`-`GXSCM2`, corner `GXSHC2`), 16 x 15 m, the Charlotte Way face painted |
| **Copper Face Jacks** | node 739778199 (nightclub) | Jackson Court Hotel, 29-30 Harcourt St | 53.335436, -6.263509 | two Georgian houses (~14 m) | West side of Harcourt St (`SGSW`-`HC1`), 14.4 x 14 m |
| **Flannery's** | way 407979343 | 6-8 Camden St Lower | 53.336121, -6.265026 | 19.9 m x 6.1 m | West side of Camden St Lower (`GXSCR1`-`GXSCM1`), 9.5 x 13 m |
| **O'Donoghue's** | way 279140841 | 15 Merrion Row | 53.338157, -6.254186 | 5.2 m front x 17 m | South side of Merrion Row (`SGNE`-`MR1`), 6.4 x 13 m |

The placement code (`pubsites.js place()`) projects the OSM position onto the named game road, sets the pub back by the
road's half-width plus footpath, and for corner pubs slides it along until the whole footprint (back corners too)
clears the cross street's footpath. `tools/scenarios/footprints.mjs` and `bridges.mjs` stay clean.

**Mulligan's.** Poolbeg Street runs 60 m (real) from Hawkins St to Tara St behind Burgh Quay. At half scale with real
road widths the gap between Burgh Quay and the College Square tower is ~20 m, so a street there would put the pub
facing a wall on both sides and clash with the tower's footprint (another agent's area). The pub stands on the quay
just west of the tower, about 25 game metres from its real spot, facing the river. Adding Poolbeg Street is left open.

## Streets added to `src/data/streets.json`

All short, traced from OSM (`data/osm/pubs-streets.json`); `node tools/dupcheck.mjs` clean.

| Street | Nodes | Notes |
|---|---|---|
| Duke Street | `GRD`-`DKM` pedestrian (paved, 8 m), `DKM`-`DKE` 6 m lane with 2 m paths | West end paved from Grafton St, east end one of the car streets to Dawson St, as in OSM |
| Anne Street South | `GR2`-`DSA` pedestrian, 8 m | Grafton St to Dawson St |
| South William Street | `WK1`-`SW1`-`SW2`, 6 m lane | From the Wicklow St / Exchequer St junction south to Chatham Row |
| Castle Market | `SW1`-`CM1` pedestrian | Grogan's corner |
| Stephen Street Lower | `SW2`-`SSL1`-`SGGS`, 6 m lane | Joins George's St at the new `SGGS` just south of the Long Hall |

New junction nodes on existing ways: `GRD` on Grafton St (at 0.352 of `GR1`-`GR2`, on the same line, so Bewley's and
Brown Thomas were re-pointed to the split with the same positions), `DKE` and `DSA` on Dawson St, `SGGS` on George's St.

## Facades (from the photos)

- **The Temple Bar.** Ground floor wrapping the corner in glossy pillar-box red, black fascia with gilt serif capitals
  THE TEMPLE BAR and the number 48 in gilt roundels at each end; the second house east carries TÁBHAIRNE BHARRA AN
  TEAMPAILL. Big multi-pane windows, a TOBACCO board, LIVE MUSIC posters, barrels on the path. Three storeys of dark
  Dublin brick with white sashes, painted wall lettering THE / TEMPLE BAR / ESTD. 1840 between the first-floor windows,
  the east house paler brown brick. Hanging baskets on scroll brackets everywhere and a row of window-box planting on
  the fascia cornice, swan-neck lanterns, a red neon TEMPLE BAR blade high on the corner and a black-and-gilt hanging
  sign. Night: the whole front glows red and warm (refs 01-05).
- **The Long Hall.** Narrow 3-storey house of bright orange-red brick; white stucco window aedicules (pediments on the
  first floor, roundel aprons) with red-and-white striped blinds in every window. Deep maroon front, cream fascia with
  "The Long Hall" in red script outlined in gold, 51 each end, striped awnings over both doors and a big plate window
  in the middle (longhall-02).
- **Kehoe's.** Dark varnished Victorian front with the gilt fascia and frosted snug glass under a brick house (no
  free photo of the front itself was found; anne-st-01 shows the street).
- **J. Grogan's.** Four storeys of brick at the corner, the Castle Market side a rendered ochre gable with CASTLE LOUNGE
  in tall painted letters running down it; red front with black fascias (J. GROGAN on William St, CASTLE LOUNGE with
  "Estd. 1899" on Castle Market), green awnings, and the white box sign THE CASTLE LOUNGE / J. GROGAN on the corner
  (grogans-01).
- **Davy Byrnes.** Slate-grey painted house with a big "21" between the first-floor windows and a green neon blade;
  teal-green front with "Davy Byrnes" in script on the fascia, 21 each end, blue lamps at each end, varnished door
  (davybyrnes-01).
- **Mulligan's.** Three fronts in a row: mustard-grained J. MULLIGAN with WINES / SPIRITS panels, the red-tiled
  LOUNGE BAR with arched windows and door, and the arched MULLIGAN'S door with an ULYSSES board; cream-painted upper
  floors with red reveals (mulligans-01).
- **The Bleeding Horse.** A big two-storey Victorian corner house (not half-timbered in any photo, 2011-2016): ground
  floor and pilasters painted near-black (earlier stone-coloured, bleedinghorse-03), brick first floor with plate-glass
  windows, a deep frieze with THE BLEEDING HORSE in raised letters, the 1649 panel, black awnings along both faces
  (bleedinghorse-01, 03).
- **Copper Face Jacks.** Two Georgian brick houses of the Jackson Court Hotel: fanlit doorcases up granite steps,
  basement railings, 6-over-6 sashes; the club's black sign board with copper-orange COPPER FACE JACKS lettering, the
  COPPERS entrance and an orange neon blade. No free-licensed photo of this front was found; the terrace details come
  from harcourt-01 (Russell Court, a few doors away).
- **Flannery's.** Grey-painted upper floors over a glossy red front, gilt lettering on a red fascia, swan-neck lamps
  along the fascia and a planted ledge above it (flannerys-01).
- **O'Donoghue's.** Narrow four-storey Georgian brick over a black-and-white front: white fascia with 15 O'DONOGHUE'S 15
  in black serif capitals, black pilasters with carved consoles, a white multi-pane window and a black door with white
  panels (odonoghues-02).

## The kit (`src/world/pubs.js`)

`buildPubs(Builder)` returns `{ groups, material, setNight(level), ms, paintMs, atlas }`. `landmarks.js` pushes the groups
into the landmark batch and calls `setNight` with the rest of the night lighting.

- Every face is painted into **one canvas atlas** (shopfronts 48 px/m, upper floors 24 px/m, party walls 8 px/m) plus a
  half-size glow atlas used as the emissive map: lit glass (about half the upper windows, warm or cool), lit fascia
  lettering, lanterns, neon blades, a wash of the paint colour for uplighting. Glazing bars are masked out of the glow.
- All geometry (walls, shopfront planes, fascia cornice, pilasters, parapet, striped / green / black awnings with the
  name on the valance, hanging baskets of leaves and flowers, window boxes, lanterns on brackets, double-sided blade
  signs, barrels) uses that atlas through **one material**, so the static batch merges all ten pubs into a handful of
  meshes (8 after batching, 5.3k triangles). Baskets and lanterns don't cast shadows.
- The baked street-lamp map lights the fronts at night like the filler facades (one texture tap).
- Low / Battery saver paint the atlas at half resolution (1024 instead of 2048); nothing else differs.
- Spec fields are documented at the top of `pubs.js`. A new pub is a spec in `PUB_SPECS`: road, OSM position, size,
  segments (floors, ground-floor height, upper wall and window style, shopfront bays, fascia text and font), optional
  painted corner face, baskets, lanterns, blades and barrels.

## Places

The Temple Bar, The Long Hall, The Bleeding Horse, Copper Face Jacks and O'Donoghue's are in the Places list and on the
map (`place: true` in the spec), each with a blurb and a teleport view in the lane with the pub ahead.

## Cost

`tools/scenarios/pubperf.mjs` (headless, Low profile, GPU timer queries; medians over ~150 frames):

| Spot | Pubs shown | Pubs hidden | Draw calls shown / hidden |
|---|---|---|---|
| The Temple Bar | 15.11 ms | 15.37 ms | 379 / 376 |
| The Long Hall | 13.41 ms | 13.14 ms | 441 / 438 |
| The Bleeding Horse | 11.25 ms | 11.14 ms | 412 / 408 |

Within noise on the GPU; +3-4 draw calls where pubs are in view. Load: ~350-450 ms to paint the two atlases and build
the meshes (mostly canvas painting, once).

## Shots

`node tools/check.mjs tools/scenarios/pubs.mjs [--mobile]` (NIGHT=1 for after dark, PUBS=key,key, SLIDE, DIST, EYE)
takes a driver-eye shot of each pub. The sheet is `tools/sheet.mjs tools/shots/pubs-sheet.json docs/research/pubs-compare.png`
(`sheet.mjs` now takes any number of columns).

## Open

- Poolbeg Street itself (Mulligan's is on the quay instead, see above).
- Kehoe's and Copper Face Jacks fronts are from descriptions and the street's style, not a photo of the front.
- Interiors are not modelled (the glass shows a warm gradient).

## Reference photos (`refs/pubs/`)

| File | Author | Licence | Date | Source |
|---|---|---|---|---|
| templebar-01.jpg | Sean MacEntee | CC BY 2.0 | 2014-06-05 | https://commons.wikimedia.org/wiki/File:The_Temple_Bar_pub,_Dublin_(14353941505).jpg |
| templebar-02.jpg | Jo and Steve Turner | CC BY-SA 2.0 | 2006-09-16 | https://commons.wikimedia.org/wiki/File:The_Temple_Bar,_48_Temple_Bar,_Dublin_-_geograph.org.uk_-_6402302.jpg |
| templebar-03.jpg | Gordon Leggett | CC BY-SA 4.0 | 2008-05-23 | https://commons.wikimedia.org/wiki/File:2008-05-23_The_Temple_Bar,_Dublin,_Ireland.jpg |
| templebar-04.jpg | Lobster1 | CC BY-SA 3.0 | 2012-06-15 | https://commons.wikimedia.org/wiki/File:The_Temple_Bar_Pub_in_Dublin_-_panoramio.jpg |
| templebar-05-night.jpg | Trevah | Public domain | 2009-03-22 | https://commons.wikimedia.org/wiki/File:Temple_Bar_Dublin_at_Night.jpg |
| longhall-02.jpg | Ian S | CC BY-SA 2.0 | 2016-01-14 | https://commons.wikimedia.org/wiki/File:The_Long_Hall_Public_House_-_geograph.org.uk_-_4796156.jpg |
| grogans-01.jpg | USERIS20010 | CC BY-SA 4.0 | 2023-11-23 | https://commons.wikimedia.org/wiki/File:Grogan%27s_Pub.jpg |
| davybyrnes-01.jpg | DanMS | CC BY-SA 3.0 | 2004-08-13 | https://commons.wikimedia.org/wiki/File:DavyByrnesPubDublin.jpg |
| mulligans-01.jpg | O'Dea | CC BY-SA 4.0 | 2008-07-22 | https://commons.wikimedia.org/wiki/File:Mulligan%27s.jpg |
| bleedinghorse-01.jpg | Joehawkins | CC BY-SA 4.0 | 2016-08-14 | https://commons.wikimedia.org/wiki/File:The_Bleeding_Horse,_Dublin_01.jpg |
| bleedinghorse-03.jpg | William Murphy | CC BY-SA 2.0 | 2014-03-03 | https://commons.wikimedia.org/wiki/File:The_Bleeding_Horse_Pub_In_Dublin.jpg |
| odonoghues-02.jpg | Robert Linsdell | CC BY 2.0 | 2015-06-12 | https://commons.wikimedia.org/wiki/File:O%27Donoghue%27s,_15_Merrion_Row,_Dublin_(507057)_(31302069222).jpg |
| harcourt-01.jpg | William Murphy | CC BY-SA 2.0 | 2012-03-14 | https://commons.wikimedia.org/wiki/File:Harcourt_Street_-_Dublin_-_6983385471.jpg |
| flannerys-01.jpg | Ian S | CC BY-SA 2.0 | 2016-01-14 | https://commons.wikimedia.org/wiki/File:Flannery%27s_Bar_-_geograph.org.uk_-_4794944.jpg |
| anne-st-01.jpg | Yair Haklai | CC BY-SA 4.0 | 2022-08-07 | https://commons.wikimedia.org/wiki/File:Anne_Street_South,_Dublin.jpg |
