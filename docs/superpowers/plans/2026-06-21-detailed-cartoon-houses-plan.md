# Detailed Cartoon Houses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing village houses with cartoon low-poly detail, procedural texture materials, and per-house variation.

**Architecture:** Keep collision as the current `house-*-body` obstacle boxes. Add reusable visual helpers in `createDioramaMap.ts` and procedural textured materials in `createMaterials.ts`, then verify visible detail meshes through the smoke test scene snapshot.

**Tech Stack:** TypeScript, Babylon.js primitive meshes, Babylon `DynamicTexture`, Playwright smoke tests, Vite.

## Global Constraints

- Do not add external image assets.
- Decorative house meshes must not be added to `map.obstacles`.
- House body obstacles must remain above the `1.8m` jump reach.
- Keep the style cartoon and low-poly.
- Restart the preview on port `4173` after implementation.

---

### Task 1: Detailed Cartoon House Visuals

**Files:**
- Modify: `tests/smoke.spec.ts`
- Modify: `src/game/world/createMaterials.ts`
- Modify: `src/game/world/createDioramaMap.ts`

**Interfaces:**
- Consumes: `createDioramaMap(scene, materials)` and `createMaterials(scene)`.
- Produces: house detail meshes named with `house-<id>-door`, `house-<id>-window-*`, `house-<id>-window-frame-*`, `house-<id>-chimney`, `house-<id>-roof-overhang-*`, and `house-<id>-roof-tile-*`.

- [ ] **Step 1: Write the failing smoke test**

Add house detail counts to `VillageSnapshot` and assert:

```ts
expect(village.houseDoors).toBe(3);
expect(village.houseWindows).toBeGreaterThanOrEqual(6);
expect(village.houseWindowFrames).toBeGreaterThanOrEqual(6);
expect(village.houseChimneys).toBe(3);
expect(village.houseRoofOverhangs).toBeGreaterThanOrEqual(6);
expect(village.houseRoofTiles).toBeGreaterThanOrEqual(12);
expect(village.houseWallTextureMaterials).toBeGreaterThanOrEqual(3);
expect(village.houseRoofTextureMaterials).toBeGreaterThanOrEqual(3);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:smoke -- --grep "renders village houses as tall blocking obstacles"`

Expected: FAIL because the new detail counts are `0`.

- [ ] **Step 3: Add procedural materials**

In `createMaterials.ts`, import `DynamicTexture` and `Texture`, add helpers that create wall and roof materials, and return:

```ts
houseWallVariants: [
  makeHouseWall("mat-house-wall-cream", "#dcb98a", "#c99862"),
  makeHouseWall("mat-house-wall-mint", "#9ccf9a", "#6fae75"),
  makeHouseWall("mat-house-wall-clay", "#d98b68", "#a95c44"),
],
houseRoofVariants: [
  makeHouseRoof("mat-house-roof-red", "#b7432f", "#7a241a"),
  makeHouseRoof("mat-house-roof-teal", "#2f7c83", "#1f4d54"),
  makeHouseRoof("mat-house-roof-violet", "#69538f", "#3e3158"),
],
houseTrim: make("mat-house-trim", new Color3(0.94, 0.84, 0.68)),
houseDoor: make("mat-house-door", new Color3(0.45, 0.25, 0.14)),
houseWindow: make("mat-house-window", new Color3(0.48, 0.78, 0.92)),
houseChimney: make("mat-house-chimney", new Color3(0.5, 0.26, 0.2)),
```

Keep `houseWall` and `houseRoof` as aliases to the first variants for compatibility.

- [ ] **Step 4: Implement house detail helpers**

In `createDioramaMap.ts`, replace the plain `addHouse` visual logic with a `HouseStyle` parameter. Add visual-only helpers for trim, doors, windows, roof overhangs, chimneys, and tile strips. Use three different `HouseStyle` values for the existing houses.

- [ ] **Step 5: Run focused smoke test**

Run: `npm run test:smoke -- --grep "renders village houses as tall blocking obstacles"`

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run: `npm test`

Expected: PASS with all smoke tests.

Run: `npm run build`

Expected: PASS; existing Vite chunk-size warnings are acceptable.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-06-21-detailed-cartoon-houses-design.md docs/superpowers/plans/2026-06-21-detailed-cartoon-houses-plan.md tests/smoke.spec.ts src/game/world/createMaterials.ts src/game/world/createDioramaMap.ts
git commit -m "feat: add detailed cartoon house visuals"
```
