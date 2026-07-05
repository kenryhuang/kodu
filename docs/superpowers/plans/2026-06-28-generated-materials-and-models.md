# Generated Materials and Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add generated concept material assets and richer code-native model details so the village reads closer to a textured concept render.

**Architecture:** Keep the current asset pipeline and Babylon world builder. Add tests first, generate local PNG assets, enrich `StandardMaterial` settings with bump textures, then add visual-only mesh detail families while preserving collision bounds.

**Tech Stack:** TypeScript, Babylon.js `StandardMaterial`, Vite public assets, Playwright smoke tests, Node PNG generation script.

---

### Task 1: Failing Smoke Tests

**Files:**
- Modify: `tests/smoke.spec.ts`

- [ ] **Step 1: Add asset and scene assertions**

Add `/assets/textures/concept-material-atlas.png` to the served PNG list. Extend `VillageSnapshot` and `readVillageSnapshot()` with counts for bump-textured materials, house foundation stones, wall weathering, roof battens, stone cluster pieces, tree bark ridges, and tree leaf depth cards.

- [ ] **Step 2: Run the focused smoke tests**

Run: `npm run test:smoke -- --grep "terrain image assets|renders village"`

Expected: FAIL because the atlas file and new mesh families do not exist yet.

### Task 2: Generated Texture Assets

**Files:**
- Modify: `scripts/generate-terrain-assets.mjs`
- Create: `public/assets/textures/concept-material-atlas.png`

- [ ] **Step 1: Generate a project-bound concept atlas**

Use the built-in image generation tool to produce a square atlas with realistic grass, dirt road, stone, bark, aged plaster, wood, roof tile, glass, moss, and foliage cells. Copy the selected PNG into `public/assets/textures/concept-material-atlas.png`.

- [ ] **Step 2: Strengthen deterministic texture generation**

Update the PNG generator to add more high-frequency grain, cracks, plank seams, tile mortar, moss, and grit to the existing terrain, vegetation, and house texture outputs.

- [ ] **Step 3: Regenerate assets**

Run: `node scripts/generate-terrain-assets.mjs`

Expected: PNG assets under `public/assets/terrain`, `public/assets/vegetation`, and `public/assets/textures` are refreshed.

### Task 3: Runtime Material Relief

**Files:**
- Modify: `src/game/world/createMaterials.ts`

- [ ] **Step 1: Add reusable texture creation**

Refactor the material helper so a diffuse texture can be paired with a bump texture using the same URL and UV scale.

- [ ] **Step 2: Add relief settings**

Apply modest bump levels to terrain grass, road, sand, stone, plaster walls, roof tiles, wood, bark, and foliage/detail materials. Add dedicated detail materials for house weathering, foundation stone, roof moss, bark ridges, and leaf depth cards.

- [ ] **Step 3: Run the focused smoke tests**

Run: `npm run test:smoke -- --grep "terrain image assets|renders village"`

Expected: the asset and material-relief assertions pass once model detail is also implemented.

### Task 4: Visual Model Detail Families

**Files:**
- Modify: `src/game/world/createDioramaMap.ts`

- [ ] **Step 1: Add house detail helpers**

Add visual-only stone foundation blocks, wall stain panels, roof battens, roof moss strips, and door plank/hinge pieces. Name meshes with stable prefixes so tests can count them.

- [ ] **Step 2: Add rock cluster helpers**

Place small low-poly chips around existing rock obstacles without adding collision obstacles.

- [ ] **Step 3: Add tree detail helpers**

Add bark ridge strips and leaf depth cards around each generated tree canopy.

- [ ] **Step 4: Run the focused smoke tests**

Run: `npm run test:smoke -- --grep "terrain image assets|renders village"`

Expected: PASS for the new asset, material, and mesh assertions.

### Task 5: Full Verification And Browser Review

**Files:**
- Verify: project test/build output
- Capture: `output/playwright/kodu-generated-material-model-pass.png`

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: typecheck and all Playwright smoke tests pass.

- [ ] **Step 2: Check the app in a real browser**

Start or reuse the Vite dev server, open `http://localhost:5173/`, wait for the canvas, and save a screenshot to `output/playwright/kodu-generated-material-model-pass.png`.

- [ ] **Step 3: Inspect the screenshot**

Open the screenshot locally and check that the scene is nonblank, framed correctly, and visibly more textured than the prior pass.
