# Concept Gap Visual Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the current game screenshot closer to the concept image by adding shadows, dense ground detail, richer tree foliage, and less plastic material response.

**Architecture:** Keep the existing Babylon scene architecture. Add structural smoke-test coverage, then implement visual-only systems in `GameScene.ts`, `createDioramaMap.ts`, and `createMaterials.ts` without touching gameplay collision behavior.

**Tech Stack:** TypeScript, Babylon.js, Vite, Playwright smoke tests.

---

## Files

- Modify: `tests/smoke.spec.ts` to assert shadow system and visual density props.
- Modify: `src/game/GameScene.ts` to create/configure a shadow generator and mesh shadow participation.
- Modify: `src/game/world/createDioramaMap.ts` to add deterministic ground detail props, wildflowers, pebbles, tree-base clutter, and extra foliage shells.
- Modify: `src/game/world/createMaterials.ts` to tune character, foliage, flower, pebble, and shadow-friendly materials.

## Task 1: Red Test For Concept Gap Systems

- [ ] Extend `VillageSnapshot` with `shadowGenerators`, `shadowCasters`, `shadowReceivers`, `groundDetailClumps`, `wildflowerCards`, `pebbleMeshes`, `treeBaseClutter`, and `extraFoliageShells`.
- [ ] Add assertions to the village smoke test requiring at least one shadow generator, 20 shadow casters, 8 shadow receivers, 45 ground detail clumps, 18 wildflower cards, 18 pebble meshes, 8 tree-base clutter props, and 12 extra foliage shells.
- [ ] Run `npx playwright test tests/smoke.spec.ts -g "renders village houses as tall blocking obstacles"` and verify it fails.

## Task 2: Shadows And Grounding

- [ ] Add `ShadowGenerator` wiring to `GameScene.ts`.
- [ ] Mark terrain, roads, and patches as shadow receivers.
- [ ] Add house/tree/rock/player/NPC meshes as shadow casters.
- [ ] Re-run the village smoke test and confirm shadow counts pass or continue to Task 3 for remaining visual-density failures.

## Task 3: Ground Detail And Foliage Density

- [ ] Add deterministic visual-only pebbles, flower cards, grass clumps, and tree-base clutter in `createDioramaMap.ts`.
- [ ] Add extra leaf shell/card layers around existing tree volumes.
- [ ] Add needed materials in `createMaterials.ts`.
- [ ] Re-run the village smoke test and confirm it passes.

## Task 4: Full Verification And Preview

- [ ] Run `npm test`.
- [ ] Open the app in browser and capture `output/playwright/kodu-concept-gap-pass.png`.
- [ ] Check browser console for application errors.
- [ ] Report visual deltas and remaining rough edges.
