# Bright Meadow Ground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Kodu terrain read as a brighter, more varied fairy-tale meadow.

**Architecture:** Keep the existing generated-asset pipeline and Babylon scene assembly. The visual change is split between generated PNG color content, material tinting, a translucent meadow material, and additional non-colliding overlay meshes.

**Tech Stack:** TypeScript, Babylon.js, Vite, Playwright, Node PNG generation script.

---

### Task 1: Add Terrain Visual Assertions

**Files:**
- Modify: `tests/smoke.spec.ts`

- [ ] **Step 1: Extend `VillageSnapshot`**

Add fields for meadow patch count and terrain grass material color.

- [ ] **Step 2: Read the fields from the scene**

In `readVillageSnapshot`, count meshes named `terrain-patch-meadow-*` and capture `mat-terrain-grass.diffuseColor`.

- [ ] **Step 3: Assert the desired visual contract**

In `renders village houses as tall blocking obstacles`, assert at least four meadow patches and a bright grass tint.

- [ ] **Step 4: Run targeted smoke test and verify RED**

Run: `npx playwright test tests/smoke.spec.ts -g "renders village houses as tall blocking obstacles"`

Expected: fail because meadow patches are not implemented yet.

### Task 2: Implement Bright Meadow Ground

**Files:**
- Modify: `scripts/generate-terrain-assets.mjs`
- Modify: `src/game/world/createMaterials.ts`
- Modify: `src/game/world/createDioramaMap.ts`

- [ ] **Step 1: Brighten generated grass textures**

Update grass palette values toward fresh yellow-green, reduce dark clump influence, and add light flower/fleck variation.

- [ ] **Step 2: Brighten grass card texture**

Use the same brighter palette for `grass-card.png` so card vegetation matches the ground.

- [ ] **Step 3: Add concept grass generation**

Generate `public/assets/textures/concept/grass.png` from the same brighter meadow function.

- [ ] **Step 4: Adjust grass and meadow materials**

Set `mat-terrain-grass` fallback/tint so the texture remains bright in scene lighting, and add `mat-terrain-meadow` for translucent overlay patches.

- [ ] **Step 5: Add meadow overlay patches**

Use existing organic terrain patch helpers to add several `terrain-patch-meadow-*` meshes with `materials.terrainGrass`.

- [ ] **Step 6: Regenerate assets**

Run: `node scripts/generate-terrain-assets.mjs`

Expected: PNG assets update successfully.

### Task 3: Verify

**Files:**
- Verify only

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 2: Run targeted smoke test**

Run: `npx playwright test tests/smoke.spec.ts -g "renders village houses as tall blocking obstacles"`

Expected: pass.

- [ ] **Step 3: Check dev server**

Run: `Invoke-WebRequest http://127.0.0.1:5173/`

Expected: HTTP 200.
