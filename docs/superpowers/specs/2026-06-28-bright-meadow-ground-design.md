# Bright Meadow Ground Design

## Goal

Make the main grassland read as a brighter, more varied fairy-tale meadow instead of a dark, repeated green surface.

## Scope

- Brighten the primary grass texture used by `mat-terrain-grass`.
- Add non-colliding meadow overlay patches that sit on top of the heightmap terrain.
- Keep terrain height, roads, houses, obstacles, player movement, and collision behavior unchanged.
- Keep the look compatible with the existing Babylon.js/Vite prototype and generated PNG asset pipeline.

## Visual Direction

The ground should shift toward light yellow-green and fresh meadow green. Variation should come from soft clover-like shapes, warm dry flecks, tiny flower hints, and a few translucent meadow patches. Grass cards should feel consistent with the brighter base.

## Implementation

- Update `scripts/generate-terrain-assets.mjs` so `grass.png`, `vegetation/grass-card.png`, and `textures/concept/grass.png` are brighter and less muddy.
- Update `src/game/world/createMaterials.ts` so the terrain grass material tint and fallback color do not darken the generated texture, and add a translucent meadow overlay material.
- Update `src/game/world/createDioramaMap.ts` to add several organic `terrain-patch-meadow-*` overlays using the meadow material.
- Update `tests/smoke.spec.ts` to assert the meadow patches exist and the grass material is tinted brightly enough.

## Verification

- Run the targeted Playwright smoke test for village/terrain composition and watch the new assertion fail before implementation.
- Regenerate PNG assets.
- Run typecheck and the relevant smoke test after implementation.
- Confirm the Vite page remains reachable.
