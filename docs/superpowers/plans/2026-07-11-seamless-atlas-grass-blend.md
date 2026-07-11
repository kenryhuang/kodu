# Seamless Atlas Grass Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the approved vivid-flower seamless grass texture and apply it to the existing Babylon height-map terrain without changing terrain geometry or gameplay.

**Architecture:** A standalone deterministic Pillow script composes feathered center crops from five extracted grass assets over the existing generated grass texture and writes one periodic `512x512` PNG. The Babylon material keeps its current lighting values but uses the generated image for diffuse and bump textures at a lower repeat scale. Playwright verifies the asset, seams, material bindings, and unchanged map behavior.

**Tech Stack:** Python 3, Pillow, TypeScript, Babylon.js, Playwright, Vite

---

## File Structure

- Create `scripts/generate-seamless-grass-texture.py`: deterministic texture generator with center cropping, feather masks, wrapped placement, and edge equalization.
- Create `public/assets/terrain/atlas/grass/grass-seamless-blended.png`: generated approved texture.
- Modify `src/game/world/createMaterials.ts`: bind the generated texture to `mat-terrain-grass` with `4.5 x 3.5` repeats.
- Modify `tests/smoke.spec.ts`: validate the PNG, opposite edges, diffuse/bump sources, repeat scale, and unchanged terrain behavior.
- Create `output/seamless-grass-game-desktop.png`: desktop visual verification screenshot.
- Create `output/seamless-grass-game-mobile.png`: mobile visual verification screenshot.

### Task 1: Define The Generated Texture Contract

**Files:**
- Modify: `tests/smoke.spec.ts`
- Test: `tests/smoke.spec.ts`

- [ ] **Step 1: Add the missing asset to the smoke test**

Inside `terrain image assets are served`, define:

```typescript
const seamlessGrassAsset = "/assets/terrain/atlas/grass/grass-seamless-blended.png";
```

Add it to `assets` without adding it to `atlasAssets`, because the generated material texture is intentionally opaque.

- [ ] **Step 2: Add exact size and seam assertions**

After image dimensions load, assert:

```typescript
const seamlessGrassDimensions = dimensions.find(({ asset }) => asset === seamlessGrassAsset);
expect(seamlessGrassDimensions).toEqual({
  asset: seamlessGrassAsset,
  width: 512,
  height: 512,
});
```

Load the image into a canvas and compute the mean absolute RGB differences for left/right and top/bottom outermost pixels. Return both three-channel arrays and assert every value is at most `2.0`:

```typescript
for (const difference of [...seamStats.leftRight, ...seamStats.topBottom]) {
  expect(difference).toBeLessThanOrEqual(2);
}
```

- [ ] **Step 3: Run the focused asset test and verify RED**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: FAIL because `grass-seamless-blended.png` is missing and Vite returns a non-PNG response.

### Task 2: Generate The Approved Seamless Texture

**Files:**
- Create: `scripts/generate-seamless-grass-texture.py`
- Create: `public/assets/terrain/atlas/grass/grass-seamless-blended.png`
- Test: `tests/smoke.spec.ts`

- [ ] **Step 1: Implement deterministic source preparation**

Use these constants and data records:

```python
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/assets/textures/concept/grass.png"
OUTPUT = ROOT / "public/assets/terrain/atlas/grass/grass-seamless-blended.png"
SIZE = 512
SEED = 250711
GRASS_SOURCES = (
    ROOT / "public/assets/terrain/atlas/grass/grass-flat.png",
    ROOT / "public/assets/terrain/atlas/grass/grass-flat-yellow.png",
)
FLOWER_SOURCES = (
    ROOT / "public/assets/terrain/atlas/grass/grass-flowers-red.png",
    ROOT / "public/assets/terrain/atlas/grass/grass-flat-white-flowers.png",
    ROOT / "public/assets/terrain/atlas/grass/grass-flat-yellow-flowers.png",
)
```

Implement `center_crop(image, fraction)` by taking a centered crop whose width and height are each multiplied by `fraction`. Implement `feather_mask(width, height, opacity)` with an elliptical radial distance and smoothstep transition:

```python
distance = math.sqrt(nx * nx + ny * ny)
edge = max(0.0, min(1.0, (1.0 - distance) / 0.42))
smooth = edge * edge * (3.0 - 2.0 * edge)
alpha = round(255 * opacity * smooth)
```

- [ ] **Step 2: Implement periodic composition**

Implement `place_wrapped(canvas, patch, center_x, center_y)` by alpha-compositing the patch at all nine offsets formed by `(-SIZE, 0, SIZE)` on each axis. Implement `make_periodic(image, band)` by blending opposite pixel pairs toward their average, with full averaging at the outermost edge and linearly decreasing strength toward the interior.

Implement `prepare_patch(path, scale, opacity, angle, crop_fraction, saturation, contrast)` in this order:

```python
source = Image.open(path).convert("RGBA")
patch = center_crop(source, crop_fraction)
patch = ImageEnhance.Color(patch).enhance(saturation)
patch = ImageEnhance.Contrast(patch).enhance(contrast)
scaled_width = max(32, round(patch.width * scale))
scaled_height = max(32, round(patch.height * scale))
patch = patch.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
transparent_alpha = Image.new("L", (scaled_width, scaled_height), 0)
feather = feather_mask(scaled_width, scaled_height, opacity)
patch.putalpha(Image.composite(patch.getchannel("A"), transparent_alpha, feather))
patch = patch.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
```

- [ ] **Step 3: Implement the approved composition parameters**

Start from the existing base resized to `512x512`, apply `make_periodic(base, 18)`, and then use `random.Random(SEED)`.

Place 34 plain-grass patches with:

```python
scale=rng.uniform(0.78, 1.2)
opacity=rng.uniform(0.17, 0.24)
angle=rng.choice((0, 90, 180, 270))
crop_fraction=0.62
saturation=0.78
contrast=0.9
```

Place 7 flower patches with:

```python
scale=rng.uniform(0.9, 1.15)
opacity=rng.uniform(0.42, 0.56)
angle=rng.choice((0, 90, 180, 270))
crop_fraction=0.7
saturation=1.3
contrast=1.02
```

Apply `make_periodic(blended, 12)`, create the output directory, and save as RGBA PNG.

- [ ] **Step 4: Generate the texture**

Run:

```bash
python3 scripts/generate-seamless-grass-texture.py
```

Expected: print `wrote public/assets/terrain/atlas/grass/grass-seamless-blended.png 512x512` and exit `0`.

- [ ] **Step 5: Run the focused asset test and verify GREEN**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"
```

Expected: `1 passed` and all opposite-edge means are at most `2.0`.

- [ ] **Step 6: Commit the generated texture pipeline**

```bash
git add scripts/generate-seamless-grass-texture.py public/assets/terrain/atlas/grass/grass-seamless-blended.png tests/smoke.spec.ts
git commit -m "feat: generate seamless atlas grass texture"
```

### Task 3: Bind The Generated Texture To The Terrain Material

**Files:**
- Modify: `tests/smoke.spec.ts`
- Modify: `src/game/world/createMaterials.ts`
- Test: `tests/smoke.spec.ts`

- [ ] **Step 1: Add material snapshot fields**

Extend `VillageSnapshot` with:

```typescript
terrainGrassDiffuseTextureSource: string | null;
terrainGrassBumpTextureSource: string | null;
terrainGrassTextureScale: { u: number; v: number } | null;
```

Extend the material texture inspection type so diffuse and bump textures expose `name`, `url`, `uScale`, and `vScale`. Return values from `readVillageSnapshot` using `url ?? name ?? null`.

- [ ] **Step 2: Add runtime assertions and verify RED**

In `renders a sparse grass map with atlas tree cards`, assert:

```typescript
expect(village.terrainGrassDiffuseTextureSource).toContain("/assets/terrain/atlas/grass/grass-seamless-blended.png");
expect(village.terrainGrassBumpTextureSource).toContain("/assets/terrain/atlas/grass/grass-seamless-blended.png");
expect(village.terrainGrassTextureScale?.u).toBeCloseTo(4.5, 5);
expect(village.terrainGrassTextureScale?.v).toBeCloseTo(3.5, 5);
```

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "renders a sparse grass map"
```

Expected: FAIL because the material still uses `/assets/textures/concept/grass.png` at `7 x 6`.

- [ ] **Step 3: Update the terrain material**

Replace the existing `terrainGrass` constructor call with:

```typescript
const terrainGrass = makeImageTextured(
  "mat-terrain-grass",
  "/assets/terrain/atlas/grass/grass-seamless-blended.png",
  new Color3(0.7, 0.86, 0.38),
  4.5,
  3.5,
  false,
  0.07,
);
```

Do not change diffuse, emissive, or ambient colors.

- [ ] **Step 4: Run the focused map test and verify GREEN**

Run:

```bash
KODU_PORT=5174 npx playwright test tests/smoke.spec.ts -g "renders a sparse grass map"
```

Expected: `1 passed`.

- [ ] **Step 5: Commit the runtime material integration**

```bash
git add src/game/world/createMaterials.ts tests/smoke.spec.ts
git commit -m "feat: apply seamless grass texture to terrain"
```

### Task 4: Visual And Full Verification

**Files:**
- Create: `output/seamless-grass-game-desktop.png`
- Create: `output/seamless-grass-game-mobile.png`
- Verify: all modified and generated files

- [ ] **Step 1: Verify generator syntax and determinism**

Run the generator twice and compare SHA-256 values:

```bash
python3 -m py_compile scripts/generate-seamless-grass-texture.py
python3 scripts/generate-seamless-grass-texture.py
shasum -a 256 public/assets/terrain/atlas/grass/grass-seamless-blended.png
python3 scripts/generate-seamless-grass-texture.py
shasum -a 256 public/assets/terrain/atlas/grass/grass-seamless-blended.png
```

Expected: both hashes are identical.

- [ ] **Step 2: Capture desktop and mobile game screenshots**

Start Kodu on port `5174`, wait for `#game-canvas` and the camera-ready condition, then save screenshots at:

```text
output/seamless-grass-game-desktop.png  (1440x900 viewport)
output/seamless-grass-game-mobile.png   (390x844 viewport)
```

Inspect both images for seams, square silhouettes, repeated flower rows, clipping, overlap, and character readability. Confirm that the three existing atlas tree cards still render.

- [ ] **Step 3: Run the complete suite**

Run:

```bash
KODU_PORT=5174 npm test
```

Expected: typecheck and all Playwright tests pass with zero failures.

- [ ] **Step 4: Review the final worktree**

Run:

```bash
git diff --check
git status --short
```

Expected: only the plan, generator, generated texture, material, smoke test, and two verification screenshots are changed or added.

- [ ] **Step 5: Commit visual verification artifacts**

```bash
git add output/seamless-grass-game-desktop.png output/seamless-grass-game-mobile.png
git commit -m "test: add seamless grass visual snapshots"
```
