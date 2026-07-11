# Seamless Atlas Grass Blend Design

## Goal

Improve the current height-map grass with details sampled from the extracted grass assets while preserving the continuous look of the existing generated texture. The result must read as one textured meadow, not a grid of painted terrain tiles.

## Approved Visual Direction

Use the third preview variant approved on 2026-07-11:

- Keep `public/assets/textures/concept/grass.png` as the primary color and texture source.
- Add the current stronger grass-detail level without exposing any source-tile border, shadow, or square silhouette.
- Use sparse red, white, and yellow flower colors at their original, more vivid saturation to create local contrast.
- Preserve broad green continuity so the flowers remain accents instead of becoming a repeated pattern.

## Texture Generation

Add a deterministic Pillow generator that writes a `512x512` RGBA texture to `public/assets/terrain/atlas/grass/grass-seamless-blended.png`.

The generator uses these extracted inputs:

- `grass-flat.png`
- `grass-flat-yellow.png`
- `grass-flowers-red.png`
- `grass-flat-white-flowers.png`
- `grass-flat-yellow-flowers.png`

For every input, only the central texture area is sampled. Plain grass sources use the central 62 percent; flower sources use the central 70 percent. This excludes painted grass borders, drop shadows, and tile-shaped silhouettes.

The approved deterministic composition uses:

- 34 plain-grass placements;
- plain-grass opacity between 17 and 24 percent;
- plain-grass saturation at 78 percent and contrast at 90 percent;
- 7 flower placements distributed across red, white, and yellow sources;
- flower opacity between 42 and 56 percent;
- flower saturation at 130 percent and contrast at 102 percent;
- deterministic random seed `250711`;
- quarter-turn rotations and moderate scale variation.

Each sample receives an elliptical smooth feather mask. Samples that cross an image edge are copied to the opposite edge. A narrow final edge blend makes the outermost pixels periodic while leaving the image interior unchanged.

## Runtime Integration

Keep the existing height-map mesh, dimensions, subdivisions, elevation range, collision behavior, and map bounds unchanged. Replace only the diffuse and bump texture source used by `mat-terrain-grass` with the generated blended texture.

Reduce the texture repetition from the current `7 x 6` to `4.5 x 3.5` across the `36 x 28` terrain. This keeps the detail readable without making the repeated `512x512` pattern obvious. Existing grass color, ambient color, emissive color, and bump strength remain unchanged.

## Testing

Automated checks must verify:

- the generated texture is served as `image/png`;
- it is exactly `512x512` and contains visible pixels;
- the mean absolute RGB difference between opposite outermost edges is no greater than `2.0` per channel;
- `mat-terrain-grass` uses `grass-seamless-blended.png` for diffuse and bump textures;
- the height-map mesh dimensions, subdivisions, elevation range, bounds, and gameplay collision behavior remain unchanged.

Visual verification must compare desktop and mobile screenshots and confirm:

- no square tile silhouettes or painted borders are visible;
- no hard horizontal or vertical seams appear;
- grass detail is stronger than the original texture but still subordinate to characters;
- red, white, and yellow flowers provide sparse contrast without forming obvious rows or repeated clusters.

## Out Of Scope

- Creating additional terrain geometry, decals, splat-map shaders, or runtime tile meshes.
- Changing roads, water, cliffs, trees, characters, camera behavior, or collisions.
- Using the cliff, dirt, or rock grass assets in this first grass-material pass.
