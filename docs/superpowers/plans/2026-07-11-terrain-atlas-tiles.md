# Terrain Atlas Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all 83 grass, road, and water units above the tree row in the terrain atlas into transparent, independently named PNG assets.

**Architecture:** Extend the existing Pillow slicer with a second manifest for terrain tiles while leaving the natural-prop manifest stable. Generate category-specific output directories and a checkerboard contact sheet, then verify every expected asset through the existing Playwright image smoke test.

**Tech Stack:** Python 3, Pillow, TypeScript, Playwright, Vite

---

## File Structure

- Modify `scripts/slice-terrain-atlas-props.py`: define the 83 terrain crop records, generate category directories, and render the review contact sheet.
- Modify `tests/smoke.spec.ts`: declare the complete terrain asset contract and verify serving, dimensions, visible pixels, and transparent pixels.
- Create `public/assets/terrain/atlas/grass/*.png`: 35 generated grass assets.
- Create `public/assets/terrain/atlas/road/*.png`: 21 generated road assets.
- Create `public/assets/terrain/atlas/water/*.png`: 27 generated water assets.
- Create `output/terrain-atlas-tiles-preview.png`: generated visual review sheet.

### Task 1: Define The Asset Contract

**Files:**
- Modify: `tests/smoke.spec.ts`
- Test: `tests/smoke.spec.ts`

- [ ] **Step 1: Add the failing terrain asset list**

Add `atlasTerrainAssets` beside `atlasPropAssets`. It must contain these exact relative names under `/assets/terrain/atlas/`:

```text
grass/grass-flat.png
grass/grass-flat-yellow.png
grass/grass-flat-yellow-flowers.png
grass/grass-flat-white-flowers.png
grass/grass-cliff-block-wide.png
grass/grass-cliff-block-small.png
grass/grass-cliff-block-medium-a.png
grass/grass-cliff-block-medium-b.png
grass/grass-cliff-block-narrow-a.png
grass/grass-cliff-block-narrow-b.png
grass/grass-cliff-corner-large.png
grass/grass-cliff-edge-narrow-a.png
grass/grass-cliff-edge-medium-a.png
grass/grass-cliff-corner-small-a.png
grass/grass-cliff-corner-small-b.png
grass/grass-cliff-edge-wide-a.png
grass/grass-cliff-corner-wide-a.png
grass/grass-cliff-edge-medium-b.png
grass/grass-cliff-corner-wide-b.png
grass/grass-cliff-edge-wide-b.png
grass/grass-cliff-edge-narrow-b.png
grass/grass-cliff-edge-medium-c.png
grass/grass-cliff-block-medium-c.png
grass/grass-dirt-patch-a.png
grass/grass-dirt-patch-b.png
grass/grass-flowers-red.png
grass/grass-flowers-white-a.png
grass/grass-flowers-white-b.png
grass/grass-dirt-stones-a.png
grass/grass-dirt-circle.png
grass/grass-dirt-stones-b.png
grass/grass-rocks-small.png
grass/grass-rocks-large.png
grass/grass-flowers-white-c.png
grass/grass-flowers-yellow.png
road/road-straight-vertical-wide.png
road/road-square-small.png
road/road-straight-horizontal-wide.png
road/road-vertical-a.png
road/road-vertical-b.png
road/road-rectangle-wide.png
road/road-vertical-narrow-a.png
road/road-corner-east.png
road/road-corner-west.png
road/road-vertical-narrow-b.png
road/road-end-round.png
road/road-vertical-narrow-c.png
road/road-t-junction-a.png
road/road-t-junction-b.png
road/road-t-junction-wide-a.png
road/road-t-junction-c.png
road/road-t-junction-wide-b.png
road/road-clearing-round-a.png
road/road-clearing-round-b.png
road/road-rectangle-small.png
road/road-corner-large.png
water/water-river-vertical-tall.png
water/water-river-straight-wide.png
water/water-river-inlets.png
water/water-river-corner-a.png
water/water-river-corner-wide.png
water/water-river-corner-small-a.png
water/water-river-corner-b.png
water/water-river-corner-small-b.png
water/waterfall-pool-small.png
water/water-pond-large.png
water/water-river-junction-a.png
water/water-river-junction-b.png
water/water-river-u-bend-a.png
water/water-river-u-bend-b.png
water/water-river-t-waterfall.png
water/water-pond-small.png
water/waterfall-small.png
water/water-river-straight-narrow.png
water/water-shoreline-a.png
water/water-shoreline-b.png
water/water-shoreline-c.png
water/water-shoreline-d.png
water/water-shoreline-e.png
water/water-bridge.png
water/water-river-pool-wide.png
water/waterfall-wide.png
water/waterfall-narrow.png
```

Spread `atlasTerrainAssets` into `assets`, include it in the minimum-dimension branch, and combine it with `atlasPropAssets` for alpha-stat checks.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: FAIL on the first missing `/assets/terrain/atlas/grass/grass-flat.png` request.

### Task 2: Generate The Terrain Assets

**Files:**
- Modify: `scripts/slice-terrain-atlas-props.py`
- Create: `public/assets/terrain/atlas/grass/*.png`
- Create: `public/assets/terrain/atlas/road/*.png`
- Create: `public/assets/terrain/atlas/water/*.png`
- Test: `tests/smoke.spec.ts`

- [ ] **Step 1: Add the terrain manifest and category output root**

Define:

```python
TERRAIN_OUTPUT_DIR = Path("public/assets/terrain/atlas")

TERRAIN_TILES = [
    ("grass", "grass-flat", (18, 13, 146, 130)),
    ("grass", "grass-flat-yellow", (146, 13, 273, 130)),
    ("grass", "grass-flat-yellow-flowers", (273, 13, 390, 130)),
    ("grass", "grass-flat-white-flowers", (390, 13, 510, 130)),
    ("grass", "grass-cliff-block-wide", (510, 13, 626, 130)),
    ("grass", "grass-cliff-block-small", (626, 13, 733, 130)),
    ("grass", "grass-cliff-block-medium-a", (733, 13, 846, 130)),
    ("grass", "grass-cliff-block-medium-b", (846, 13, 960, 130)),
    ("grass", "grass-cliff-block-narrow-a", (960, 13, 1048, 130)),
    ("grass", "grass-cliff-block-narrow-b", (1048, 13, 1146, 130)),
    ("grass", "grass-cliff-corner-large", (1146, 13, 1250, 130)),
    ("grass", "grass-cliff-edge-narrow-a", (14, 126, 101, 237)),
    ("grass", "grass-cliff-edge-medium-a", (101, 126, 202, 237)),
    ("grass", "grass-cliff-corner-small-a", (202, 126, 291, 237)),
    ("grass", "grass-cliff-corner-small-b", (291, 126, 393, 237)),
    ("grass", "grass-cliff-edge-wide-a", (393, 126, 509, 237)),
    ("grass", "grass-cliff-corner-wide-a", (509, 126, 625, 237)),
    ("grass", "grass-cliff-edge-medium-b", (625, 126, 731, 237)),
    ("grass", "grass-cliff-corner-wide-b", (731, 126, 843, 237)),
    ("grass", "grass-cliff-edge-wide-b", (843, 126, 956, 237)),
    ("grass", "grass-cliff-edge-narrow-b", (956, 126, 1051, 237)),
    ("grass", "grass-cliff-edge-medium-c", (1051, 126, 1145, 237)),
    ("grass", "grass-cliff-block-medium-c", (1145, 126, 1250, 237)),
    ("grass", "grass-dirt-patch-a", (13, 236, 126, 343)),
    ("grass", "grass-dirt-patch-b", (126, 236, 233, 343)),
    ("grass", "grass-flowers-red", (233, 236, 340, 343)),
    ("grass", "grass-flowers-white-a", (340, 236, 452, 343)),
    ("grass", "grass-flowers-white-b", (452, 236, 560, 343)),
    ("grass", "grass-dirt-stones-a", (560, 236, 670, 343)),
    ("grass", "grass-dirt-circle", (670, 236, 778, 343)),
    ("grass", "grass-dirt-stones-b", (778, 236, 880, 343)),
    ("grass", "grass-rocks-small", (880, 236, 983, 343)),
    ("grass", "grass-rocks-large", (983, 236, 1087, 343)),
    ("grass", "grass-flowers-white-c", (1087, 236, 1168, 343)),
    ("grass", "grass-flowers-yellow", (1168, 236, 1250, 343)),
    ("road", "road-straight-vertical-wide", (12, 345, 104, 453)),
    ("road", "road-square-small", (104, 345, 192, 453)),
    ("road", "road-straight-horizontal-wide", (192, 345, 331, 453)),
    ("road", "road-vertical-a", (331, 345, 427, 453)),
    ("road", "road-vertical-b", (427, 345, 532, 453)),
    ("road", "road-rectangle-wide", (532, 345, 642, 453)),
    ("road", "road-vertical-narrow-a", (642, 345, 735, 453)),
    ("road", "road-corner-east", (735, 345, 856, 453)),
    ("road", "road-corner-west", (856, 345, 992, 453)),
    ("road", "road-vertical-narrow-b", (992, 345, 1074, 453)),
    ("road", "road-end-round", (1074, 345, 1175, 453)),
    ("road", "road-vertical-narrow-c", (1175, 345, 1250, 453)),
    ("road", "road-t-junction-a", (12, 453, 141, 565)),
    ("road", "road-t-junction-b", (141, 453, 274, 565)),
    ("road", "road-t-junction-wide-a", (274, 453, 440, 565)),
    ("road", "road-t-junction-c", (440, 453, 584, 565)),
    ("road", "road-t-junction-wide-b", (584, 453, 765, 565)),
    ("road", "road-clearing-round-a", (765, 453, 909, 565)),
    ("road", "road-clearing-round-b", (909, 453, 1054, 565)),
    ("road", "road-rectangle-small", (1054, 453, 1157, 565)),
    ("road", "road-corner-large", (1157, 453, 1250, 565)),
    ("water", "water-river-vertical-tall", (12, 562, 120, 802)),
    ("water", "water-river-straight-wide", (123, 562, 250, 685)),
    ("water", "water-river-inlets", (252, 562, 385, 685)),
    ("water", "water-river-corner-a", (388, 562, 512, 685)),
    ("water", "water-river-corner-wide", (514, 562, 660, 685)),
    ("water", "water-river-corner-small-a", (661, 562, 757, 685)),
    ("water", "water-river-corner-b", (760, 562, 872, 685)),
    ("water", "water-river-corner-small-b", (873, 562, 966, 685)),
    ("water", "waterfall-pool-small", (968, 562, 1064, 685)),
    ("water", "water-pond-large", (1065, 562, 1250, 802)),
    ("water", "water-river-junction-a", (124, 681, 250, 802)),
    ("water", "water-river-junction-b", (252, 681, 374, 802)),
    ("water", "water-river-u-bend-a", (385, 681, 509, 802)),
    ("water", "water-river-u-bend-b", (510, 681, 634, 802)),
    ("water", "water-river-t-waterfall", (635, 681, 774, 880)),
    ("water", "water-pond-small", (773, 681, 871, 780)),
    ("water", "waterfall-small", (872, 681, 966, 780)),
    ("water", "water-river-straight-narrow", (967, 681, 1064, 780)),
    ("water", "water-shoreline-a", (10, 801, 122, 917)),
    ("water", "water-shoreline-b", (123, 801, 249, 917)),
    ("water", "water-shoreline-c", (250, 801, 374, 917)),
    ("water", "water-shoreline-d", (375, 801, 505, 917)),
    ("water", "water-shoreline-e", (506, 801, 635, 917)),
    ("water", "water-bridge", (773, 770, 902, 917)),
    ("water", "water-river-pool-wide", (903, 770, 1064, 917)),
    ("water", "waterfall-wide", (1065, 770, 1158, 917)),
    ("water", "waterfall-narrow", (1159, 770, 1250, 917)),
]
```

The list is in source-row order and contains 35 grass, 21 road, and 27 water records. Tall river, large pond, T-waterfall, bridge, river pool, and bottom waterfalls use their full multi-row bounds.

- [ ] **Step 2: Add category generation to `main()`**

After natural props are written, generate terrain tiles with the existing transparency pipeline:

```python
for category, name, box in TERRAIN_TILES:
    sprite = make_transparent(source.crop(box), background)
    output_dir = TERRAIN_OUTPUT_DIR / category
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"{name}.png"
    sprite.save(output)
    print(f"wrote {output} {sprite.size[0]}x{sprite.size[1]}")
```

- [ ] **Step 3: Generate all assets**

Run:

```bash
python3 scripts/slice-terrain-atlas-props.py
```

Expected: 37 existing prop writes followed by 83 terrain writes, with no empty images or exceptions.

- [ ] **Step 4: Run the focused asset test and verify GREEN**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: `1 passed`.

### Task 3: Build And Review The Contact Sheet

**Files:**
- Modify: `scripts/slice-terrain-atlas-props.py`
- Create: `output/terrain-atlas-tiles-preview.png`

- [ ] **Step 1: Add deterministic checkerboard preview rendering**

Add a `create_contact_sheet()` helper that loads each `TERRAIN_TILES` output, scales it into a fixed `180x150` preview cell without distortion, composites it over a light checkerboard, prints the category/name below it, and writes a three-column-grouped PNG to `output/terrain-atlas-tiles-preview.png`. Call it after all files are generated.

- [ ] **Step 2: Regenerate and inspect the preview**

Run:

```bash
python3 scripts/slice-terrain-atlas-props.py
```

Open `output/terrain-atlas-tiles-preview.png` and compare all 83 cells with the source atlas. Correct crop boxes if any cell clips artwork, contains a neighbor, or loses foam, flowers, stones, bridge edges, or shoreline detail.

- [ ] **Step 3: Re-run the focused test after crop corrections**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: `1 passed`.

### Task 4: Final Verification

**Files:**
- Verify: `scripts/slice-terrain-atlas-props.py`
- Verify: `tests/smoke.spec.ts`
- Verify: generated PNG directories and preview

- [ ] **Step 1: Verify Python syntax and output counts**

Run:

```bash
python3 -m py_compile scripts/slice-terrain-atlas-props.py
find public/assets/terrain/atlas/grass -type f -name '*.png' | wc -l
find public/assets/terrain/atlas/road -type f -name '*.png' | wc -l
find public/assets/terrain/atlas/water -type f -name '*.png' | wc -l
```

Expected counts: `35`, `21`, and `27`.

- [ ] **Step 2: Run the full project suite**

Run:

```bash
KODU_PORT=5174 npm test
```

Expected: typecheck and all Playwright smoke tests pass with zero failures.

- [ ] **Step 3: Review the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the planned script, test, generated terrain PNGs, preview, and plan changes are present.
