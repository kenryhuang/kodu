# Generated Materials and Models Design

## Goal

Move the current diorama closer to the concept image by making surfaces read as textured, aged, and layered instead of flat low-poly blocks. The scene should still run as the existing lightweight Babylon/Vite game, but houses, terrain, trees, and rocks need more believable material relief and small-scale construction detail.

## Scope

- Generate a project-bound material atlas for concept-aligned surface references.
- Extend the deterministic PNG generator with stronger texture frequency and keep all runtime assets local under `public/assets`.
- Add relief-like material settings in Babylon using existing `StandardMaterial` features, especially diffuse textures and bump textures.
- Add code-native model detail meshes for foundations, roof battens, wall weathering, rock clusters, bark ridges, and leaf depth cards.
- Keep gameplay collision bounds unchanged; new meshes are visual detail only unless they are already part of an existing obstacle.

## Architecture

The asset pipeline remains `scripts/generate-terrain-assets.mjs`, which writes PNGs directly into `public/assets`. Runtime material construction stays in `src/game/world/createMaterials.ts`, and world detail meshes stay in `src/game/world/createDioramaMap.ts` so they can reuse existing coordinate and terrain helpers.

The generated atlas is stored as `public/assets/textures/concept-material-atlas.png`. The app uses deterministic production textures for stable tests and can reference the atlas as a project artifact for visual direction.

## Visual Requirements

- Terrain and road surfaces should show layered grass, dirt ruts, grit, moss, and dry flecks.
- House walls should include aged plaster texture, darker ground/roof stains, and stone foundation pieces.
- Roofs should read as individual rows or battens rather than a single triangular prism.
- Rocks should look like small natural clusters instead of isolated cubes.
- Trees should add bark ridges, trunk/branch depth, and layered leaf cards around the canopy.

## Testing

Smoke tests should verify:

- New generated atlas and texture assets are served as PNGs.
- Multiple materials use bump textures for relief.
- The scene contains the new visual detail mesh families.
- Existing gameplay assertions for projectile, jumping, camera, collision, terrain, houses, shadows, and bounds still pass.

## Out Of Scope

- Importing GLB models or adding a heavy PBR pipeline.
- Changing player movement, collision rules, map bounds, camera behavior, or combat.
- Depending on remote assets at runtime.
