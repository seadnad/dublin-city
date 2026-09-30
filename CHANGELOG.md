# Change log

## 2026-09-30 - Public device startup follow-up

- Auto now starts masked GPUs and newer integrated graphics on the light scene. Recognisable desktop GPUs can start on Medium, and Auto can still raise render quality when frame times allow it.
- Low/Auto light devices use the existing static loading card with stage text. The aerial intro and its second WebGL context load only for the richer profile.
- The local browser check accepts `GFX=high` (or another graphics mode) to verify a profile without changing saved browser settings manually.
- Production browser checks reached play with no console errors: Auto/Low 38.5 s, mobile viewport 39.4 s, explicit High 41.9 s on this machine. This does **not** meet a good public first-visit target. The next architecture steps and tradeoffs are recorded in [docs/performance-work.md](docs/performance-work.md).

## 2026-09-30 - Performance and visual clarity

- Auto graphics on light-profile devices now favours a sharper image at about 30 fps. It keeps at least 1 render pixel per CSS pixel on touch devices and 0.8 on desktops, including when an older lower setting was saved.
- The aerial loading scene uses fewer pixels and runs at 30 fps on the light profile, leaving more GPU time for the main game to load. High and Medium keep their existing intro quality.
- Dublin Bus textures are painted directly at the size uploaded to the GPU, and car atlas readback uses a Canvas2D context suited to frequent reads.
- Detailed player cars remain in place. On Low and Battery saver, small decorative parts no longer cast separate sun shadows; the body and wheels still do.
- Startup stage and traffic construction timings are logged for future profiling. The full investigation and measurements are in [docs/performance-work.md](docs/performance-work.md).
- The bridge browser check has a longer timeout for its full-map scan.

Local mobile emulation reached play in about 37–39 seconds versus about 46 seconds before, with an Auto render ratio around 1.1 versus 0.9. This used a desktop GPU with a mobile viewport; the Samsung tablet and old laptop still need direct measurement. The production bundle loaded without console errors, the footprint check found 0 overlaps, and the bridge check found no road-over-water samples. Shader preparation remains the largest startup cost.
