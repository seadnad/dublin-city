# Temple Bar v2: facades, squares, lanes, night life

Build notes for the Temple Bar character pass (brief: docs/research/hotspots-green-templebar-dame.md, T1-T9).

## Status (paused)

Work was paused by the coordinator (usage limit) before verification finished. No perf numbers, compare sheet or
mobile / night / aerial checks yet.

Done (seen working in daytime eye-level screenshots):
- **Merchant's Arch fix (T1).** The hall's passage was in the east bay (local +x is west for this site), so from the
  quay you looked into a glazed window reflecting the sky. `E` is now derived from the site's rotation, and the rear
  of the passage is an open arch. The Merchant's Arch lane runs straight through it (new node `TBMA`) before turning
  to the square. You now see through to the lane.
- **Facade overhaul (T2)** in `buildings.js`. TEMPLEBAR lots have muted brick or render above (1 in 5 fully painted)
  and a 1.35x ground floor carrying a period front from the new shared shopfront set. The front is recoloured per
  building, and a name sits on each fascia. The atlas sample happens only inside the TB ground-floor branch
  (textureGrad, derivatives taken outside), so other buildings don't pay for it. The sign atlas is now 128 cells in
  one channel (1024x4096 R8, smaller than the old RGBA 1024x2048).
- **Shared shopfront set**, `src/world/shopfronts.js`: 16 key-coloured tiles painted by the pub kit's
  `paintShopfront` (now exported from pubs.js), `SHOPFRONT_GLSL`, `shopfrontUniforms`, 64 invented names, and
  `shopfrontCanvas(W, G, spec, { name })` for hero planes (Dame St / George's St).
- **Blank walls onto Temple Bar Square (T3).** Side walls of Temple Bar lots that face open ground (a square, a lane,
  a corner) now get windows. `frontage` flags 2 and 4, and `open: true` on reserved squares.
- **Lanes (T6)** in streets.json, node prefix `TB*`, dupcheck clean:
  - Drivable one-way: Asdill's Row (S), Bedford Row (N), Aston Place (S), Price's Lane (N, destination).
  - Pedestrian: Fownes St Lower, Cecilia St, Crow St (stops short of Dame St, so Dame St itself is untouched), and
    Curved St.
  - Split quay / lane segments. trial.js paths, the Ha'penny view spot and the Temple Bar pub's corner node (`TBTE`)
    were updated to match.
- **`src/world/templebar.js`.** Hanging name boards, neon blades (1 in 3 pubs), flags on angled poles, baskets,
  swan-neck lanterns and projecting clocks on every TEMPLEBAR front, in one atlas and one material, bucketed per
  200 m. There are also static people with pints round barrels, two buskers with listeners (the Temple Bar pub, the
  square), and warm lamp-map spots at the pub fronts for light spill after dark.
- **`src/world/meetinghouse.js`.** Meeting House Square (flags and the chequer, benches, 4 umbrella masts), The Ark
  (brick front, copper stage curtain), the IFI Georgian doorcase with its blue neon name, and the Gallery of
  Photography. Sites and reservations are in sites.js.

Known breakage / not verified:
- **The day market and umbrella canopies are switched off.** With those unbatched groups
  (`meetingHouse.dynamic`) in the scene, the ground around Eustace St and the square rendered pure black. Hiding
  them fixed it. The suspect is the shadow pass (open cones, `castShadow`). Fix, then re-enable in `landmarks.js`.
- Meeting House Square has not been rechecked since. Its paving may still look dark: the open squares are still in the
  ground-AO bake (main.js `bakeGroundAO` uses all `reserved`; filter `!r.open`).
- Not run: footprints.mjs, bridges.mjs, night, --mobile, aerial, and perf (the facade branch cost and the extra
  draw calls). No compare sheet (temple-bar-v2-compare.png). Before shots are not kept in the repo.

Left: the market fix; the checks above; Essex Gate, Exchange St, Crampton Ct and Cow's Lane; the Temple Bar Music
Centre on Curved St; Temple Bar Square's red-brick gabled south block; murals (T8); sound (T10).
