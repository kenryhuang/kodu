# Clean Fairy Village Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Kodu village scene cleaner, brighter, and more coherent with the fairy-tale grass direction.

**Architecture:** Keep the existing Babylon.js scene-generation files and deterministic PNG generation script. Update visual contracts in the smoke test first, then satisfy them with focused changes to generated textures, materials, house placement/detail composition, tree composition, and ground-detail distribution.

**Tech Stack:** TypeScript, Babylon.js, Vite, Playwright, Node.js PNG generation.

---

### Task 1: Visual Contract Tests

**Files:**
- Modify: `tests/smoke.spec.ts`

- [ ] Add fields to `VillageSnapshot` for road material color, road bounds, house-road separation, simplified house detail counts, and tree leaf card counts.
- [ ] Update `readVillageSnapshot()` to collect `mat-terrain-road.diffuseColor`, `mat-path-dirt.diffuseColor`, `terrain-road-main` bounds, each house body's X/Z bounds, and tree foliage counts.
- [ ] Add assertions that road materials are warm and bright, house bodies do not intersect the main road bounds, house weathering/moss/batten details are reduced, and trees retain trunks plus visible leaf cards.
- [ ] Run `npx playwright test tests/smoke.spec.ts -g "renders village houses as tall blocking obstacles"` and verify it fails before implementation.

### Task 2: Warm Clean Roads

**Files:**
- Modify: `scripts/generate-terrain-assets.mjs`
- Modify: `src/game/world/createMaterials.ts`

- [ ] Rework `road.png` generation toward tan/warm-brown dirt with lower black contrast and fewer rut marks.
- [ ] Add or update `textures/concept/dirt-road.png` generation so runtime road texture matches the clean road.
- [ ] Set `mat-terrain-road` and `mat-path-dirt` diffuse/emissive colors to warm, clean values.

### Task 3: Road-Side Simple Houses

**Files:**
- Modify: `src/game/world/createDioramaMap.ts`
- Modify: `src/game/world/createMaterials.ts`

- [ ] Move house centers away from the main road ribbon while keeping them reachable and within map bounds.
- [ ] Reduce house detail clutter by lowering roof tile rows, removing or suppressing wall weathering, roof moss, and excess battens.
- [ ] Brighten wall/roof/trim material tints so houses match the grass and road.
- [ ] Keep each house body in the obstacle list.

### Task 4: Readable Trees and Natural Ground Details

**Files:**
- Modify: `src/game/world/createDioramaMap.ts`
- Modify: `src/game/world/createMaterials.ts`
- Modify: `scripts/generate-terrain-assets.mjs`

- [ ] Replace ball-like leaf volumes with layered leaf cards and simple leaf cluster planes around visible trunks/branches.
- [ ] Keep trunk bases, roots, and branches visible.
- [ ] Make bushes and grass clumps sparser and more natural by using organic seeded positions rather than dense grid-like scatter.
- [ ] Reduce dark sand/dirt patch size and move patches away from houses/roads where possible.

### Task 5: Generate and Verify

**Files:**
- Generated: `public/assets/**`
- Verify only: `output/playwright/clean-fairy-village.png`

- [ ] Run `node scripts/generate-terrain-assets.mjs`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test:smoke`.
- [ ] Capture `output/playwright/clean-fairy-village.png` from `http://127.0.0.1:5173/`.
