# Natural Road Ribbon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one transparent seamless road texture from extracted road assets and render a continuous curved road ribbon across the current height-map terrain.

**Architecture:** A deterministic Pillow script synthesizes a vertically periodic RGBA road material with transparent feathered sides. The existing road-ribbon mesh helpers create one height-following visual mesh from approved control points. Existing gameplay systems remain unchanged because the road adds no obstacle.

**Tech Stack:** Python 3, Pillow, TypeScript, Babylon.js, Playwright, Vite

---

## File Structure

- Create `scripts/generate-road-ribbon-texture.py`: deterministic road texture synthesis.
- Create `public/assets/terrain/atlas/road/road-ribbon-seamless.png`: generated `256x512` RGBA material texture.
- Modify `src/game/world/createMaterials.ts`: bind the generated road texture to `mat-terrain-road`.
- Modify `src/game/world/createDioramaMap.ts`: instantiate one approved `terrain-road-main` ribbon.
- Modify `tests/smoke.spec.ts`: verify texture, seams, material, geometry, bounds, and unchanged gameplay surface.
- Create `output/natural-road-game-desktop.png` and `output/natural-road-game-mobile.png`: visual verification screenshots.

### Task 1: Generate The Road Material Texture

**Files:**
- Modify: `tests/smoke.spec.ts`
- Create: `scripts/generate-road-ribbon-texture.py`
- Create: `public/assets/terrain/atlas/road/road-ribbon-seamless.png`

- [ ] **Step 1: Add the failing asset contract**

Add `/assets/terrain/atlas/road/road-ribbon-seamless.png` to `atlasTerrainAssets`. Assert its exact dimensions are `256x512`. Reuse the existing alpha-stat loop to require visible and transparent pixels.

Add a canvas calculation for mean absolute top/bottom RGBA differences and assert each channel is at most `2.0`:

```typescript
for (const difference of roadSeamStats) {
  expect(difference).toBeLessThanOrEqual(2);
}
```

- [ ] **Step 2: Verify the asset test is RED**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: FAIL because the new path returns a non-PNG response.

- [ ] **Step 3: Implement deterministic texture synthesis**

Create a Pillow script with:

```python
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/terrain/atlas/road/road-ribbon-seamless.png"
WIDTH = 256
HEIGHT = 512
SEED = 260711
SOURCES = (
    ROOT / "public/assets/terrain/atlas/road/road-straight-horizontal-wide.png",
    ROOT / "public/assets/terrain/atlas/road/road-rectangle-wide.png",
    ROOT / "public/assets/terrain/atlas/road/road-clearing-round-b.png",
)
```

Start with opaque warm dirt `(178, 137, 79, 255)`. Place 72 deterministic center crops using source fraction `0.58`, scale `0.8..1.45`, quarter-turn rotation, and radial alpha `52..88`. Copy patches crossing the top or bottom edge to the opposite edge.

Apply a side alpha profile per row:

```python
edge_distance = min(x / (WIDTH - 1), 1 - x / (WIDTH - 1))
edge_noise = math.sin(y * 0.071) * 0.012 + math.sin(y * 0.193 + 1.4) * 0.008
t = max(0.0, min(1.0, (edge_distance + edge_noise) / 0.18))
smooth = t * t * (3 - 2 * t)
alpha = round(source_alpha * smooth)
```

Blend the outermost 12 rows with their opposite rows using the same averaging algorithm as the seamless grass generator, then save as RGBA PNG and print its relative path and size.

- [ ] **Step 4: Generate and verify GREEN**

Run:

```bash
python3 scripts/generate-road-ribbon-texture.py
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: `1 passed`.

- [ ] **Step 5: Commit the generated texture pipeline**

```bash
git add scripts/generate-road-ribbon-texture.py public/assets/terrain/atlas/road/road-ribbon-seamless.png tests/smoke.spec.ts
git commit -m "feat: generate seamless road ribbon texture"
```

### Task 2: Add The Main Road Ribbon

**Files:**
- Modify: `tests/smoke.spec.ts`
- Modify: `src/game/world/createMaterials.ts`
- Modify: `src/game/world/createDioramaMap.ts`

- [ ] **Step 1: Add failing geometry and material assertions**

Extend `VillageSnapshot` with:

```typescript
terrainRoadDiffuseTextureSource: string | null;
terrainRoadBumpTextureSource: string | null;
terrainRoadUsesDiffuseAlpha: boolean;
```

Return sources from `mat-terrain-road`. Update the sparse-map test to require:

```typescript
expect(village.terrainMainRoads).toBe(1);
expect(village.terrainMainRoadVertices).toBeGreaterThanOrEqual(120);
expect(village.terrainMainRoadBounds).not.toBeNull();
expect(village.terrainMainRoadBounds!.maxX - village.terrainMainRoadBounds!.minX).toBeGreaterThanOrEqual(32);
expect(village.terrainMainRoadBounds!.maxZ - village.terrainMainRoadBounds!.minZ).toBeGreaterThanOrEqual(17);
expect(village.terrainRoadDiffuseTextureSource).toContain("/assets/terrain/atlas/road/road-ribbon-seamless.png");
expect(village.terrainRoadBumpTextureSource).toContain("/assets/terrain/atlas/road/road-ribbon-seamless.png");
expect(village.terrainRoadUsesDiffuseAlpha).toBe(true);
```

- [ ] **Step 2: Verify the sparse-map test is RED**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "renders a sparse grass map"
```

Expected: FAIL because no `terrain-road-main` mesh exists.

- [ ] **Step 3: Bind the generated road material**

Change `terrainRoad` to:

```typescript
const terrainRoad = makeImageTextured(
  "mat-terrain-road",
  "/assets/terrain/atlas/road/road-ribbon-seamless.png",
  new Color3(0.72, 0.48, 0.26),
  1,
  1,
  true,
  0.045,
);
```

Keep its existing diffuse and emissive colors.

- [ ] **Step 4: Instantiate the approved main route**

In `createDioramaMap`, call `addRoadRibbon("terrain-road-main", route, scene, materials.terrainRoad)` after the height-map terrain is created and before trees are added. Use exactly:

```typescript
const route: RoadRoutePoint[] = [
  { x: -18, z: -10.5, width: 2.3 },
  { x: -12, z: -8.1, width: 2.45 },
  { x: -8, z: -6.4, width: 2.35 },
  { x: -3, z: -5.2, width: 2.55 },
  { x: 0, z: -1.2, width: 2.7 },
  { x: 4, z: -0.4, width: 2.5 },
  { x: 8, z: 0, width: 2.25 },
  { x: 12, z: 4.5, width: 2.4 },
  { x: 18, z: 8.8, width: 2.3 },
];
```

Do not add the road to `obstacles`.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "renders a sparse grass map"
npm run typecheck
```

Expected: `1 passed` and typecheck exits `0`.

```bash
git add src/game/world/createMaterials.ts src/game/world/createDioramaMap.ts tests/smoke.spec.ts
git commit -m "feat: add natural main road ribbon"
```

### Task 3: Visual And Full Verification

**Files:**
- Create: `output/natural-road-game-desktop.png`
- Create: `output/natural-road-game-mobile.png`

- [ ] **Step 1: Verify generator determinism**

Run the generator twice and compare SHA-256 output. Both hashes must be identical:

```bash
python3 -m py_compile scripts/generate-road-ribbon-texture.py
python3 scripts/generate-road-ribbon-texture.py
shasum -a 256 public/assets/terrain/atlas/road/road-ribbon-seamless.png
python3 scripts/generate-road-ribbon-texture.py
shasum -a 256 public/assets/terrain/atlas/road/road-ribbon-seamless.png
```

- [ ] **Step 2: Capture desktop and mobile screenshots**

Use headless Chromium at `1440x900` and `390x844`, wait for `networkidle`, `#game-canvas`, and the ready camera condition, then write the two output screenshots. Reject browser console errors, page errors, blank canvas bounds, UI overlap, road/tree intersection, hard cross-road seams, and sprite-shaped road pieces.

- [ ] **Step 3: Run full verification**

Run:

```bash
KODU_PORT=5174 npm test
git diff --check
git status --short
```

Expected: all nine Playwright tests and typecheck pass; only planned screenshots remain uncommitted.

- [ ] **Step 4: Commit visual verification**

```bash
git add output/natural-road-game-desktop.png output/natural-road-game-mobile.png
git commit -m "test: add natural road visual snapshots"
```
