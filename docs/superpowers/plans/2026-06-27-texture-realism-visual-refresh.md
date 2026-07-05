# Texture Realism Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Kodu scene visibly more realistic and texture-rich while preserving the existing 2.5D gameplay and smoke tests.

**Architecture:** Keep the current deterministic asset pipeline. Add generated texture PNGs, wire them through `createMaterials.ts`, update visual meshes in `createDioramaMap.ts`, and tune lighting in `GameScene.ts` without changing gameplay contracts.

**Tech Stack:** TypeScript, Babylon.js, Vite, Playwright, deterministic Node PNG generator.

---

## Files

- Modify: `tests/smoke.spec.ts` to require newly generated texture assets.
- Modify: `scripts/generate-terrain-assets.mjs` to generate richer terrain and object textures.
- Modify: `src/game/world/createMaterials.ts` to use image-backed textured materials for stone, wood, roof ridge, trim, doors, windows, and house walls.
- Modify: `src/game/world/createDioramaMap.ts` to replace visual rock boxes with irregular low-poly meshes while keeping obstacle bounds stable.
- Modify: `src/game/GameScene.ts` to add warmer directional lighting and lower-saturation clear color.
- Generated: `public/assets/textures/*.png` and refreshed files under `public/assets/terrain/` and `public/assets/vegetation/`.

## Task 1: Asset Contract Test

- [ ] Add new required texture asset paths to `tests/smoke.spec.ts`.
- [ ] Run `npm run test:smoke -- tests/smoke.spec.ts -g "terrain image assets are served"`.
- [ ] Confirm the test fails with 404s for the new texture assets.

## Task 2: Texture Generation

- [ ] Extend `scripts/generate-terrain-assets.mjs` to create `public/assets/textures/stone.png`, `weathered-wood.png`, `roof-tiles-red.png`, `roof-tiles-teal.png`, `roof-tiles-violet.png`, `plaster-warm.png`, `plaster-sage.png`, `plaster-clay.png`, `trim-aged.png`, `door-wood.png`, and `window-glass.png`.
- [ ] Increase realism in existing grass, road, sand, bark, leaf, bush, and grass-card textures with denser grain, natural color variation, and lower saturation.
- [ ] Run `node scripts/generate-terrain-assets.mjs`.
- [ ] Re-run the asset contract test and confirm it passes.

## Task 3: Material Wiring

- [ ] Update `src/game/world/createMaterials.ts` so house walls, roofs, trim, door, window, fence, stone, and tree bark use image-backed textures.
- [ ] Keep existing exported material property names stable so map/player/combat code does not change.
- [ ] Run `npm run typecheck`.

## Task 4: Rock And Lighting Visuals

- [ ] Update `src/game/world/createDioramaMap.ts` so rock obstacle visuals use irregular low-poly meshes named consistently with the existing obstacles, while collision half-extents remain unchanged.
- [ ] Update `src/game/GameScene.ts` with directional light plus softer hemispheric fill and a less saturated clear color.
- [ ] Run `npm test`.

## Task 5: Browser Preview

- [ ] Ensure Vite is running on `http://localhost:5173/`.
- [ ] Use Playwright/browser to open the page, check console output, and capture `output/playwright/kodu-texture-realism.png`.
- [ ] Report whether the texture-rich direction is visible and list any remaining visual rough edges.
