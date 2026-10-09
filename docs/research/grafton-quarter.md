# The Grafton quarter: research and build notes (`grafton-quarter`)

Grafton Street's shopfronts, the side streets off it and their pubs, the Gaiety Theatre, Powerscourt Townhouse and the
George's Street Arcade, and the street life (flower sellers, buskers and their crowds, café tables, bikes).

Sources: OpenStreetMap via Overpass (fetched 2026-09-30, ODbL; raw pull in `data/osm/grafton-quarter.json`: highways,
buildings, amenities, shops, tourism and historic features in 53.3392,-6.2665 to 53.3440,-6.2575) and free-licensed
Wikimedia Commons photos (table below, also `refs/grafton-quarter/sources.json`). No Google imagery. Requests used the
generic User-Agent `DublinDriveResearch/1.0 (hobby game research)`; no personal data was sent.

## Status (paused)

Paused mid-build on the coordinator's order (usage limit). Committed state loads with no console errors (last full run
before the final texel-scale tweak), `tools/dupcheck.mjs` is clean, and a Node footprint check (`tmp/`, not committed:
every site against every road *including* pedestrian streets and footpaths, plus overlaps between the quarter's boxes)
is clean. The browser `footprints.mjs` / `bridges.mjs` were last run before the Weir / Brown Thomas adjustments; run
them again before merging.

Done:
- Streets (node prefix `GF`): Harry St, Balfe St, Chatham St, Johnson's Court, Clarendon St, Coppinger Row, Chatham Row,
  Clarendon Row, Drury St (pedestrian north of Fade St), Fade St. `WK1` (Wicklow / Exchequer / William St) and `SGG1`
  (George's St at Exchequer St) moved to their OSM positions, so Wicklow St now slants as it does. Existing ways split at
  the new junctions on their old lines (nothing along them moves); Long Hall, Grogan's, Bewley's, the St Stephen's Green
  Centre, the Green's teleport spot and the Georgian Sprint trial route re-pointed (the trial route had been broken by the
  earlier Duke St split; now fixed).
- The pub-front kit (`src/world/pubs.js`) extended rather than duplicated: `buildFronts(Builder, specs, sites, name,
  { scale })` splits any list of fronts over atlas pages; new wall styles (ashlar, rock-faced granite), windows
  (round-arched, paired, tall 1-over-1, modern ribbon), string courses, quoins, rose windows, shop bays (display windows
  with goods, glass doors, café windows, pointed-arch arcade, round-arched rusticated windows / doors, a lit arcade
  entrance), rusticated and modern shopfronts, gables, turrets with spires, slate mansards, pediments, a glazed lettered
  canopy, bracket clocks, brass-arm lamps, railings, any-colour awnings, and `terrace` fronts whose party walls are one
  flat patch (atlas saving).
- `src/world/graftonsites.js`: 46 fronts. Grafton St both sides end to end (invented names for chain stores; J. M.
  Barnardo kept as a historic name), the terracotta stepped-gable building, the Victorian 9-11, the department store in
  the old Brown Thomas building on the Duke St corner; McDaid's, Bruxelles, Neary's (brass arm lamps), Sheehan's, the
  International Bar; the Gaiety Theatre, Powerscourt House and the South City Markets / George's Street Arcade front.
  The three landmarks are in Places.
- `src/world/graftonquarter.js`: three flower stalls (two at the Harry St corner, one near the Green), three buskers with
  amp, guitar, open case and mic stand, their crowds, café tables with chairs and parasols on Chatham St, Coppinger Row,
  Castle Market, Drury St, Harry St, Duke St and Anne St, granite benches, Sheffield stands with bikes, two generic
  public-bike stations (Exchequer St, Clarendon Row), Phil Lynott (statue-kit figure) with his bass on a granite drum.
  One vertex-coloured mesh per 150 m cell; ~36k triangles.
- `src/game/people.js`: `fixed` people (standing, sitting at tables, a strumming busker pose) as extra instances of the
  pedestrian mesh; the quarter's streets weighted busier.

Left / known issues:
- Just before pausing the Grafton fronts' texel density was set to 0.75 of the pubs' (`landmarks.js`), to bring the atlas
  from four pages down to about three; not yet looked at. On High that is still ~3 x 2048² pages: check memory, or pack
  tighter.
- Not done: St Teresa's (Carmelite) church front on Clarendon St (no room between Brown Thomas's back and the street at
  half scale), the Arcade's Drury St front and market-hall roof, hanging baskets on Grafton's lamp posts, paving pattern,
  night screenshots, `--mobile` shots, frame-cost measurement, the compare sheet
  (`docs/research/grafton-quarter-compare.png`).
- St Andrew Street was tried and dropped (it cuts through the Kildare work's St Andrew's Church).
- Busker crowds and café sitters are always drawn (~60 extra instances, 30 on Low).

## Streets added (`src/data/streets.json`)

| Street | Nodes | Notes |
|---|---|---|
| Harry Street | `GR2`-`GFHA1`-`GFHA2` | pedestrian, paved |
| Balfe Street | `GFHA2`-`GFBA` | lane, access pedestrian |
| Chatham Street | `GFCH`-`GFCL`-`GFBA`-`GFCC` | pedestrian; `GFCH` on Grafton St |
| Johnson's Court | `GFJC`-`GFCP` | 3 m flagged passage; `GFJC` on Grafton St |
| Clarendon Street | `GFCW`-`GFCP`-`GFCC` | car lane; `GFCW` on Wicklow St |
| Coppinger Row | `SW1`-`GFCP` | pedestrian (café tables) |
| Chatham Row | `GFCC`-`GFCR` | car lane to William St (`GFCR`) |
| Clarendon Row | `GFCC`-`GFKR` | pedestrian to King St South (`GFKR`) |
| Drury Street | `GFDR`-`CM1`-`GFFD` pedestrian, `GFFD`-`SSL1` car | `GFDR` on Exchequer St; Castle Market now connects |
| Fade Street | `GFFD`-`GFFA` | car lane; `GFFA` on George's St |

The car lanes form loops (Wicklow - Clarendon - Chatham Row - William; Stephen St - Drury - Fade - George's), so AI
traffic has no dead ends; the rest is pedestrian.

## Survey highlights (OSM, Grafton St)

East side 1-51 from College Green to the Green, west side 52-116 back down. West: Weir & Son 96-99 (north corner of
Wicklow St), Brown Thomas 88-95, Bewley's 78-79 (Johnson's Court between 79 and 80), the bank on the Harry St corner
(flower sellers), 65-69, Chatham St, 52-64 (the navy toy shop 60-61). East: 1-12 (the Victorian 9-11), the department
store 15-19 (the old Brown Thomas building) to Duke St, 20-27, 28-33 to Anne St, 34-40, 41-51 (the chocolate café on the
Green corner). Side streets: McDaid's 3 and Bruxelles 7-8 Harry St (Lynott statue between), Neary's 1 and Sheehan's 17
Chatham St, the International Bar 23 Wicklow St, Powerscourt 59 South William St, the Gaiety 46-50 South King St, the
South City Markets on South Great George's St between Exchequer and Fade Streets, public bike stations on Exchequer St
and Clarendon Row.

## Reference photos (`refs/grafton-quarter/`)

| File | Author | Licence | Source |
|---|---|---|---|
| gaiety-01.jpg | DubhEire | CC0 | https://commons.wikimedia.org/wiki/File:Gaiety_Theatre,_Dublin.JPG |
| gaiety-02.jpg | Robert Linsdell | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:The_Gaiety_Theatre,_King_St_South,_Dublin_(507127)_(32615681881).jpg |
| arcade-01.jpg | Antony-22 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:St._George%27s_Arcade_Dublin_2018.jpg |
| arcade-02.jpg | Tony Webster | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:George%27s_Street_Arcade,_Dublin_(12893361005).jpg |
| grafton-01.jpg | Dieglop | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dublin_-_Grafton_Street_-_20160328140517.jpg |
| grafton-02.jpg | Cmccullough | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Dublin,_IE._Grafton_Street._May_23,_2012._~1200H.jpg |
| grafton-03.jpg | Jean Housen | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:20130810_dublin118.JPG |
| grafton-04.jpg | Jean Housen | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:20130810_dublin248.JPG |
| busker-01.jpg | Chad and Steph | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Busker_Grafton_Street.jpg |
| disney-01.jpg | J.-H. Janßen | CC0 | https://commons.wikimedia.org/wiki/File:Dublin_Grafton_Street_Disney_Store_01.JPG |
| powerscourt-01.jpg | Cathalpeelo | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dublin_-_Powerscourt_House,_Dublin_-_20141129143846.jpg |
| lynott-01.jpg | Chiara Lorè | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Statue_Philip_Lynott.jpg |
| lynott-02.jpg | Ardfern | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Phil_Lynott_statue,_Dublin,_October_2010.JPG |
| harry-st-01.jpg | Lobster1 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Statue_of_Philip_Lynnot_in_Dublin_-_panoramio.jpg |
| mcdaids-01.jpg | Ardfern | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:McDaids,_Dublin,_October_2010.JPG |
| international-01.jpg | Sheila1988 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:International_Bar,_Dublin.jpg |
| carmelite-01.jpg | Ardfern | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Clarendon_Street_Church,_Dublin,_October_2010.JPG |
| carmelite-02.jpg | J.-H. Janßen | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:St_Teresas_Church_Dublin_03.JPG |

No free-licensed photo of Neary's front was found; it is built from descriptions.
