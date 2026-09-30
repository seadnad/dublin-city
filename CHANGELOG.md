# Change log

## 2026-09-30 — Performance and visual clarity

- Auto graphics on light-profile devices now favours a sharper image at about 30 fps. It keeps at least 1 render pixel per CSS pixel on touch devices and 0.8 on desktops, including when an older lower setting was saved.
- The aerial loading scene uses fewer pixels and runs at 30 fps on the light profile, leaving more GPU time for the main game to load. High and Medium keep their existing intro quality.
- Dublin Bus textures are painted directly at the size uploaded to the GPU, and car atlas readback uses a Canvas2D context suited to frequent reads.
- Detailed player cars remain in place. On Low and Battery saver, small decorative parts no longer cast separate sun shadows; the body and wheels still do.
- Startup stage and traffic construction timings are logged for future profiling. The full investigation and measurements are in [docs/performance-work.md](docs/performance-work.md).
- The bridge browser check has a longer timeout for its full-map scan.

Local mobile emulation reached play in about 37–39 seconds versus about 46 seconds before, with an Auto render ratio around 1.1 versus 0.9. This used a desktop GPU with a mobile viewport; the Samsung tablet and old laptop still need direct measurement. The production bundle loaded without console errors, the footprint check found 0 overlaps, and the bridge check found no road-over-water samples. Shader preparation remains the largest startup cost.
