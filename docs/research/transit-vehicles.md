# Luas and Dublin Bus vehicle design pass

## References

No photographs are bundled with the game or copied into this repository. These pages were used only as visual references for the shapes and liveries.

| Vehicle | Reference | Author and licence | Design cues |
|---|---|---|---|
| Luas | [Citadis 502 à Dublin](https://commons.wikimedia.org/wiki/File:Citadis_502_%C3%A0_Dublin.jpg) | Bapt45, CC BY-SA 4.0 | Rounded roof, deep side glazing, door rhythm, swept yellow cab and dark windscreen |
| Dublin Bus | [SG471 on O'Connell Street](https://commons.wikimedia.org/wiki/File:20190523-Dublin-Bus-SG471.jpg) | Alex Noble, CC0 | Volvo B5TL / Wright Gemini 3 profile, upper and lower front glazing, destination display, single nearside entrance, yellow and blue livery |
| Luas fleet size | [Alstom's 2020 Dublin tram announcement](https://www.alstom.com/press-releases-news/2020/7/alstom-delivers-new-tramways-dublin) | Alstom | Citadis trams reach 55 m in real service |

## Game implementation

- The moving Luas remains three 11 m gameplay carriages. Its 35.4 m train length is shorter than the real 55 m Citadis: changing it would also affect platform lengths, stopping positions, turns and collision spacing across the compressed city. This pass improves the silhouette without changing those systems.
- The Luas body has a rounded roof, separate side windows and doors, a lower purple band, a yellow belt stripe, dark articulation faces and a sloped glazed cab. All trams still share one instanced geometry per material; no downloaded model or texture is added.
- The bus keeps its runtime-painted route atlas and shared body geometry. The front leans back above the driver, the nearside has one entrance, mirrors are modeled, and the existing shared wheel instances sit at the visible body edge. The yellow and blue SG livery is retained so the model is recognisable as the game’s Dublin Bus, although newer vehicles use other TFI liveries.

Future accuracy work should compare the bus's front and rear lights and the Luas's cab end in close screenshots from several routes, then improve the atlas or geometry only where that detail remains visible at driving distance. Reassess startup and frame costs before increasing texture resolution or adding draw calls.
