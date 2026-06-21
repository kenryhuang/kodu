# Large Textured Terrain Design

## Goal

Replace the small floating diorama platform with a larger playable map that uses real image assets for terrain height, grass, sand, and roads. The result should feel closer to the Babylon.js Chapter 5 environment approach while preserving the current 2.5D RPG controls, jump behavior, and obstacle rules.

## References

- Babylon.js Chapter 5: "A Better Environment" introduces grass, distant hills, sky, trees, and a height-map based ground.
- Babylon.js Chapter 5 hills notes describe a height map with a low central area for the village, brighter areas for hills, and gray areas for roads out of the valley.
- Babylon.js height-map documentation explains that grayscale pixels map to ground height, with lighter pixels producing higher terrain.

## Scope

- Add a reusable asset directory under `public/assets/terrain/`.
- Add initial PNG assets:
  - `heightmap-valley.png`
  - `grass.png`
  - `sand.png`
  - `road.png`
- Replace the current `map-grass-platform` box with a large terrain mesh created from the height map.
- Increase map bounds from the current small arena to a larger village-scale area.
- Add visual ground layers for grass, sand, and roads using image textures.
- Keep the existing village houses, rocks, trees, fences, and player controls working on the larger map.

## Non-Goals

- Do not add full terrain-following movement physics yet.
- Do not make player jump height depend on terrain elevation yet.
- Do not add streaming, map chunks, minimap, or biome gameplay effects in this pass.
- Do not replace the existing house or obstacle collision model.

## Asset Pipeline

Terrain images live in `public/assets/terrain/` so Babylon can load them by URL at runtime and so later map work can reuse the same convention. The first assets can be generated procedurally and committed as PNG files:

- Height map: grayscale valley layout with low central playable village ground, soft hills near the edges, and flatter corridors where roads leave the village.
- Grass texture: stylized cartoon grass tile with subtle color variation.
- Sand texture: warm cartoon sand tile with light speckling.
- Road texture: dirt or packed-earth road tile that reads clearly from the orthographic camera.

## Map Composition

The new terrain should be roughly 2.5x to 3x larger than the current map. The village remains near the center, with roads branching to the north, east, and southwest. A sand patch sits away from the central village so grass, sand, and road areas are all visible in the first playable map.

Roads and sand can be placed as thin textured meshes slightly above the terrain for this pass. This keeps the visual result controllable while avoiding a large physics rewrite.

## Collision And Gameplay

Player movement remains planar. The terrain mesh is visual, while `DioramaMap.bounds` defines the playable area and existing `map.obstacles` defines blocking and jumpable obstacles. Existing rules remain:

- Low rocks can be jumped onto.
- Houses and high obstacles remain above player jump reach and block the player.
- Airborne high-obstacle collision remains active.
- Space jumps; mouse click fires.

## Testing

- Smoke test verifies the terrain asset URLs exist and return PNG responses.
- Smoke test verifies the scene contains the large terrain mesh.
- Smoke test verifies grass, sand, and road materials use image textures.
- Smoke test verifies map bounds are larger than the old map.
- Existing jump, collision, house, and camera tests must continue to pass.
- `npm test` and `npm run build` must pass before the implementation is considered complete.
