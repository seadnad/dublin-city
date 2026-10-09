# Temple Bar v2: facades, squares, lanes, night life

Build notes for the Temple Bar character pass (brief: docs/research/hotspots-green-templebar-dame.md, T1-T9).

## Status (done)

Finished after merging main (Grafton quarter, Dublin Castle / George's St, O'Connell St, Green interior, Luas rebuild,
district streaming). Compare sheet: `docs/research/temple-bar-v2-compare.png`.

Fixed on the way out:
- **Meeting House Square market and umbrellas are back on** (`landmarks.js` pushes `meetingHouse.dynamic`; kept out of
  the static batch, open by day, furled after dark). The black ground did not come back after the merge, and nothing
  in the market's geometry or materials was bad. The dark look came from two things stacking. The four open canopies
  (9 m across, `castShadow`) shade nearly the whole square, and the open squares were still in the ground-AO bake, so
  the paving under the shadow was AO-darkened as if a building stood on it. `main.js` now bakes AO only for reserved
  rects without `open: true` (Temple Bar Square and Meeting House Square). The canopy fabric also had no light from
  below, so its underside read black from eye level. The open canopies and striped gazebos get a little emissive
  (light through sunlit canvas), and the furled umbrellas use a plain material so they don't glow at night.

Checks (after the merge):
- `footprints.mjs`: 0 footprints on roads. `bridges.mjs`: no bad bridges. No console errors.
- Day, night and `--mobile` looks along Temple Bar, Merchant's Arch, Meeting House Square, Temple Bar Square and Eustace St.
- Frame cost at the `areaperf.mjs` temple-bar spot (Temple Lane South looking west, low tier, dpr 1, headless):
  main 362 calls / 1.12M tris, GPU median 33.7 ms (p10 29.4); branch 401 calls / 1.19M tris, GPU median 31.9 to
  40.3 ms over three runs (p10 26.9 to 27.6). That is +39 draw calls and +0.07M triangles, and the GPU time is
  within run-to-run noise.

Left:
- Merchant's Arch hall reads as dark grey stone; the real one is pale granite with flower boxes over the arch.
- Night cobbles on Temple Bar are very dark between the pub spills (more lamp-map spots, or a warmer street lamp).
- Temple Bar Square: the red-brick gabled south block, trees and the crowd are missing.
- Essex Gate, Exchange St, Crampton Ct and Cow's Lane; the Temple Bar Music Centre on Curved St; murals (T8);
  sound (T10). Aerial check not done.

Done in the first pass:
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
