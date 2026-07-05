# Kodu Texture Realism Visual Refresh Design

## Goal

Move the current Kodu scene away from the blocky cartoon/Minecraft-adjacent look and toward the approved semi-realistic, texture-rich 2.5D RPG target. Keep the same camera, map layout, gameplay readability, and lightweight Babylon.js architecture.

## Visual Direction

- Use richer diffuse texture detail for grass, dirt roads, sand, wood, bark, roof tiles, house walls, stones, bushes, and leaves.
- Reduce flat saturated color fields. Prefer lower saturation, more tonal variation, surface grain, edge wear, and natural dirt/stone/wood noise.
- Preserve the orthographic diorama composition and clear gameplay silhouettes.
- Avoid voxel, toy plastic, heavy photorealism, or imported large model packs.

## Scope

The first implementation pass focuses on visible impact:

- Expand the deterministic asset generator to create additional texture files for stone, wood, roof, house wall, leaves, bark, grass, sand, and roads.
- Update material setup so major scene objects use image-backed texture materials rather than plain colors or simple dynamic canvas patterns.
- Replace box-like rocks with irregular low-poly rock meshes while preserving obstacle bounds.
- Adjust tree, house, and fence materials to read as textured natural surfaces.
- Improve scene lighting with a warmer directional source and softer ambient fill, without changing camera behavior or gameplay systems.

## Non-Goals

- No external asset dependency in this pass.
- No full PBR material pipeline or normal maps.
- No replacement of gameplay collision, player controls, HUD behavior, or camera rules.
- No large GLB model import.

## Architecture

Keep the current structure:

- `scripts/generate-terrain-assets.mjs` remains the deterministic source of generated PNG assets.
- `src/game/world/createMaterials.ts` owns material creation and texture wiring.
- `src/game/world/createDioramaMap.ts` owns world mesh construction and should only change visual mesh/material details while keeping obstacle data stable.
- `src/game/GameScene.ts` owns lighting adjustments.

## Testing And Verification

- Run the asset generator after changing it.
- Run `npm test` to keep typecheck and smoke behavior green.
- Use the browser at `http://localhost:5173/` and capture a screenshot under `output/playwright/`.
- Compare visually against the approved target: texture richness should be obvious on ground, roads, houses, rocks, trees, and fences while the game remains readable.
