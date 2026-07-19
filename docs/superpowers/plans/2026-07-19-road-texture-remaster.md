# Road Texture Remaster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 22 road PNGs with style-matched 4× remasters while preserving their geometry, transparency, file paths, and the ribbon texture's vertical seam.

**Architecture:** Generate two reusable top-down source materials with the built-in image generator, then feed them into a deterministic Pillow pipeline. The pipeline reconstructs the 21 sprite masks from the tracked terrain atlas, applies the shared dirt and grass detail without changing Alpha geometry, and derives the seamless ribbon from the remastered straight tile. Python contract tests and Playwright assertions enforce dimensions, Alpha, topology, seam quality, and runtime loading.

**Tech Stack:** Python 3.12, Pillow 11, `unittest`, Vite 7, TypeScript 5.9, Playwright 1.55, built-in image generation.

---

## File map

- Create `scripts/road_texture_manifest.py`: canonical 21-tile crop boxes and legacy/output size contracts.
- Create `scripts/remaster-road-textures.py`: deterministic mask extraction, texture application, ribbon generation, and contact-sheet output.
- Create `scripts/test_road_texture_remaster.py`: fast Python contract tests for every generated PNG.
- Create `scripts/assets/road-remaster/dirt-material.png`: generated top-down seamless dirt material source.
- Create `scripts/assets/road-remaster/grass-material.png`: generated top-down seamless grass material source.
- Modify `scripts/generate-road-ribbon-texture.py`: delegate to the new 4× remaster pipeline instead of writing a 256×512 legacy image.
- Modify `tests/smoke.spec.ts`: assert all 22 remastered dimensions and retain runtime Alpha/detail/seam checks.
- Modify `public/assets/terrain/atlas/road/*.png`: replace all 22 runtime assets with 4× versions.
- Create `output/road-remaster-contact-sheet.png`: visual review sheet for the complete asset set.
- Create `output/road-remaster-game-desktop.png`: desktop runtime evidence.
- Create `output/road-remaster-game-mobile.png`: mobile runtime evidence.

### Task 1: Establish the road asset contract

**Files:**
- Create: `scripts/road_texture_manifest.py`
- Create: `scripts/test_road_texture_remaster.py`

- [ ] **Step 1: Add the exact manifest**

Create `scripts/road_texture_manifest.py` with an ordered `ROAD_TILES` tuple containing the 21 names and crop boxes already used by `scripts/slice-terrain-atlas-props.py`, plus:

```python
ROAD_TILES = (
    ("road-straight-vertical-wide", (12, 345, 104, 453)),
    ("road-square-small", (104, 345, 192, 453)),
    ("road-straight-horizontal-wide", (192, 345, 331, 453)),
    ("road-vertical-a", (331, 345, 427, 453)),
    ("road-vertical-b", (427, 345, 532, 453)),
    ("road-rectangle-wide", (532, 345, 642, 453)),
    ("road-vertical-narrow-a", (642, 345, 735, 453)),
    ("road-corner-east", (735, 345, 856, 453)),
    ("road-corner-west", (856, 345, 992, 453)),
    ("road-vertical-narrow-b", (992, 345, 1074, 453)),
    ("road-end-round", (1074, 345, 1175, 453)),
    ("road-vertical-narrow-c", (1175, 345, 1250, 453)),
    ("road-t-junction-a", (12, 453, 141, 565)),
    ("road-t-junction-b", (141, 453, 274, 565)),
    ("road-t-junction-wide-a", (274, 453, 440, 565)),
    ("road-t-junction-c", (440, 453, 584, 565)),
    ("road-t-junction-wide-b", (584, 453, 765, 565)),
    ("road-clearing-round-a", (765, 453, 909, 565)),
    ("road-clearing-round-b", (909, 453, 1054, 565)),
    ("road-rectangle-small", (1054, 453, 1157, 565)),
    ("road-corner-large", (1157, 453, 1250, 565)),
)

SCALE = 4
RIBBON_NAME = "road-ribbon-seamless"
RIBBON_SIZE = (1024, 2048)

LEGACY_SIZES = {
    "road-straight-vertical-wide": (75, 97),
    "road-square-small": (65, 77),
    "road-straight-horizontal-wide": (119, 74),
    "road-vertical-a": (84, 86),
    "road-vertical-b": (92, 93),
    "road-rectangle-wide": (93, 75),
    "road-vertical-narrow-a": (75, 95),
    "road-corner-east": (105, 93),
    "road-corner-west": (129, 101),
    "road-vertical-narrow-b": (73, 98),
    "road-end-round": (84, 90),
    "road-vertical-narrow-c": (60, 94),
    "road-t-junction-a": (114, 90),
    "road-t-junction-b": (117, 90),
    "road-t-junction-wide-a": (149, 91),
    "road-t-junction-c": (125, 91),
    "road-t-junction-wide-b": (160, 91),
    "road-clearing-round-a": (128, 95),
    "road-clearing-round-b": (129, 111),
    "road-rectangle-small": (86, 66),
    "road-corner-large": (77, 88),
}
```

- [ ] **Step 2: Write failing output-contract tests**

Create `scripts/test_road_texture_remaster.py` with tests that:

```python
class RoadTextureContractTest(unittest.TestCase):
    def test_all_outputs_are_rgba_and_four_times_legacy_size(self):
        for name, legacy_size in LEGACY_SIZES.items():
            image = Image.open(ROAD_DIR / f"{name}.png")
            self.assertEqual(image.mode, "RGBA", name)
            self.assertEqual(image.size, tuple(value * SCALE for value in legacy_size), name)

        ribbon = Image.open(ROAD_DIR / f"{RIBBON_NAME}.png")
        self.assertEqual(ribbon.mode, "RGBA")
        self.assertEqual(ribbon.size, RIBBON_SIZE)

    def test_every_output_keeps_transparent_and_visible_pixels(self):
        for path in ROAD_DIR.glob("*.png"):
            alpha = Image.open(path).convert("RGBA").getchannel("A")
            low, high = alpha.getextrema()
            self.assertEqual(low, 0, path.name)
            self.assertEqual(high, 255, path.name)

    def test_ribbon_top_and_bottom_rows_match(self):
        ribbon = Image.open(ROAD_DIR / f"{RIBBON_NAME}.png").convert("RGBA")
        top = list(ribbon.crop((0, 0, ribbon.width, 1)).getdata())
        bottom = list(ribbon.crop((0, ribbon.height - 1, ribbon.width, ribbon.height)).getdata())
        difference = sum(
            abs(top_pixel[channel] - bottom_pixel[channel])
            for top_pixel, bottom_pixel in zip(top, bottom, strict=True)
            for channel in range(4)
        ) / (ribbon.width * 4)
        self.assertLessEqual(difference, 2.0)
```

- [ ] **Step 3: Verify the contract fails against legacy assets**

Run: `python3 -m unittest scripts/test_road_texture_remaster.py -v`

Expected: FAIL because the 21 tiles and ribbon still have legacy dimensions.

- [ ] **Step 4: Commit the failing contract**

```bash
git add scripts/road_texture_manifest.py scripts/test_road_texture_remaster.py
git commit -m "test: define road remaster asset contract"
```

### Task 2: Generate reusable style materials

**Files:**
- Create: `scripts/assets/road-remaster/dirt-material.png`
- Create: `scripts/assets/road-remaster/grass-material.png`

- [ ] **Step 1: Inspect the local style references**

Load these as visual references before generation:

```text
public/assets/terrain/atlas/road/road-straight-vertical-wide.png
public/assets/terrain/atlas/road/road-corner-west.png
public/assets/terrain/0eb25ff3-a845-49d2-a37c-fd90ef46a85b.png
```

- [ ] **Step 2: Generate the dirt source material**

Use the built-in image generator with the references and this prompt:

```text
Use case: stylized-concept
Asset type: reusable game terrain material source
Primary request: create a square, perfectly top-down, edge-to-edge seamless hand-painted dirt-road material matching the reference roads
Style/medium: polished cozy stylized 3D game texture, softly hand-painted
Color palette: warm light ochre and sandy tan matching the references
Materials/textures: fine sand grain, shallow irregular ruts, restrained small cream and gray-brown pebbles, subtle ambient occlusion
Lighting/mood: soft diffuse overhead light, no directional cast shadows
Constraints: uniform texel density; seamless on all four edges; no grass, no border, no isolated object, no text, no watermark
Avoid: photorealism, harsh outlines, high-contrast sharpening halos, large rocks, footprints, wheels, signs
```

Save the selected output to `scripts/assets/road-remaster/dirt-material.png`.

- [ ] **Step 3: Generate the grass source material**

Use the built-in image generator with the same references and this prompt:

```text
Use case: stylized-concept
Asset type: reusable game terrain material source
Primary request: create a square, perfectly top-down, edge-to-edge seamless hand-painted short-grass material matching the grass fringe around the reference roads
Style/medium: polished cozy stylized 3D game texture, softly hand-painted
Color palette: muted yellow-green and olive green matching the references
Materials/textures: layered short grass blades, small natural value variation, restrained detail
Lighting/mood: soft diffuse overhead light, no directional cast shadows
Constraints: uniform texel density; seamless on all four edges; grass only; no dirt area, no flowers, no text, no watermark
Avoid: photorealism, neon green, harsh outlines, long grass, large leaves, isolated objects
```

Save the selected output to `scripts/assets/road-remaster/grass-material.png`.

- [ ] **Step 4: Validate and commit the two sources**

Open both images at original detail. Confirm square composition, no text/watermark, no unintended objects, and close palette agreement with the references.

```bash
git add scripts/assets/road-remaster/dirt-material.png scripts/assets/road-remaster/grass-material.png
git commit -m "art: add road remaster source materials"
```

### Task 3: Build the deterministic remaster pipeline

**Files:**
- Create: `scripts/remaster-road-textures.py`
- Modify: `scripts/generate-road-ribbon-texture.py`
- Modify: `public/assets/terrain/atlas/road/*.png`
- Create: `output/road-remaster-contact-sheet.png`

- [ ] **Step 1: Implement source extraction without changing geometry**

Load the existing extraction functions directly so the geometry has one implementation, then assert every extracted size before scaling:

```python
atlas_tools = runpy.run_path(ROOT / "scripts/slice-terrain-atlas-props.py")
estimate_background = atlas_tools["estimate_background"]
make_transparent = atlas_tools["make_transparent"]

source = Image.open(ATLAS_SOURCE).convert("RGB")
background = estimate_background(source)
for name, box in ROAD_TILES:
    legacy = make_transparent(source.crop(box), background)
    if legacy.size != LEGACY_SIZES[name]:
        raise ValueError(f"{name}: expected {LEGACY_SIZES[name]}, got {legacy.size}")
    scaled = legacy.convert("RGBa").resize(
        tuple(value * SCALE for value in legacy.size),
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    geometry_alpha = scaled.getchannel("A")
```

Preserve `geometry_alpha` unchanged through all later RGB operations and merge it back immediately before saving.

- [ ] **Step 2: Implement reusable texture tiling and masks**

Add these focused helpers:

```python
def tile_to_size(material: Image.Image, size: tuple[int, int], offset: tuple[int, int]) -> Image.Image:
    tiled = Image.new("RGB", size)
    source = material.convert("RGB")
    for y in range(-offset[1], size[1], source.height):
        for x in range(-offset[0], size[0], source.width):
            tiled.paste(source, (x, y))
    return tiled

def grass_mask(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    mask = Image.new("L", image.size)
    mask.putdata([
        255 if green > red * 0.94 and green > blue * 1.10 else 0
        for red, green, blue in rgb.getdata()
    ])
    return mask.filter(ImageFilter.GaussianBlur(radius=3.0))

def apply_material(base: Image.Image, material: Image.Image, mask: Image.Image, opacity: float) -> Image.Image:
    detail = ImageEnhance.Color(material).enhance(0.72)
    blended = Image.blend(base.convert("RGB"), detail.convert("RGB"), opacity)
    return Image.composite(blended, base.convert("RGB"), mask)
```

Color-match each tiled material to the mean and standard deviation of its target region before blending. Use the dirt source at restrained opacity over the road body and the grass source over the green fringe. Restore the original 4× Alpha at the end and apply a small-radius unsharp mask to RGB only.

- [ ] **Step 3: Generate the vertically periodic ribbon**

Derive the ribbon from the remastered `road-straight-vertical-wide.png`, mirroring the central strip to create a periodic unit. Resize premultiplied RGBA to 1024×2048, then force the last row to equal the first row exactly. Preserve transparent side edges and write `road-ribbon-seamless.png`.

- [ ] **Step 4: Generate a contact sheet**

Create `output/road-remaster-contact-sheet.png` on a checkerboard background, showing all 22 outputs at readable size with filenames. This is review evidence, not a runtime dependency.

- [ ] **Step 5: Run the pipeline and contract tests**

```bash
python3 scripts/remaster-road-textures.py
python3 -m unittest scripts/test_road_texture_remaster.py -v
```

Expected: 22 images written; all contract tests PASS.

- [ ] **Step 6: Inspect outputs and adjust one layer at a time**

Open the contact sheet plus the ribbon, a T-junction, a corner, and a clearing at original detail. If one material is too strong, change only its blend opacity or color-match range, regenerate, and rerun the contract tests.

- [ ] **Step 7: Commit the pipeline and generated runtime assets**

```bash
git add scripts/remaster-road-textures.py scripts/generate-road-ribbon-texture.py \
  public/assets/terrain/atlas/road output/road-remaster-contact-sheet.png
git commit -m "feat: remaster road textures at four-times resolution"
```

### Task 4: Update runtime assertions and capture visual evidence

**Files:**
- Modify: `tests/smoke.spec.ts`
- Create: `output/road-remaster-game-desktop.png`
- Create: `output/road-remaster-game-mobile.png`

- [ ] **Step 1: Update the Playwright dimension contract**

Replace the ribbon assertion with 1024×2048 and add a `Map<string, [number, number]>` for the 21 exact 4× dimensions. Assert every asset's loaded `naturalWidth` and `naturalHeight` matches its map entry.

- [ ] **Step 2: Run the targeted smoke test**

Run: `npx playwright test tests/smoke.spec.ts -g "terrain image assets are served"`

Expected: PASS, including Alpha, detail, and ribbon seam checks.

- [ ] **Step 3: Capture desktop and mobile evidence**

Run the Vite app and capture the existing terrain scene at desktop and mobile viewport sizes after the road is fully rendered. Save screenshots as:

```text
output/road-remaster-game-desktop.png
output/road-remaster-game-mobile.png
```

Inspect both for blur, white fringe, transparent seams, sampling shimmer, and palette mismatch.

- [ ] **Step 4: Run full verification**

```bash
python3 -m unittest scripts/test_road_texture_remaster.py -v
npm run typecheck
npm run build
npm test
```

Expected: Python contract tests PASS, TypeScript exits 0, production build exits 0, and all 9 Playwright tests PASS.

- [ ] **Step 5: Commit verification changes and evidence**

```bash
git add tests/smoke.spec.ts output/road-remaster-game-desktop.png output/road-remaster-game-mobile.png
git commit -m "test: verify high-resolution road textures"
```

### Task 5: Final audit and integration

**Files:**
- Review all files changed by the feature branch.

- [ ] **Step 1: Confirm only in-scope files changed**

Run:

```bash
git status --short
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: clean worktree; only the plan, source materials, remaster scripts, road PNGs, focused tests, and visual evidence are changed; no whitespace errors.

- [ ] **Step 2: Review against the design spec**

Confirm all 22 assets are present, all dimensions are 4×, geometry comes from deterministic legacy masks, visual detail comes from shared source materials, the ribbon is seamless, paths are unchanged, and no unrelated terrain or gameplay file changed.

- [ ] **Step 3: Integrate without overwriting the user's dirty terrain changes**

Merge `feature/road-texture-remaster` into `main` from the primary worktree. Resolve only files changed by this feature; leave the user's deleted `public/assets/terrain/0eb25ff3-a845-49d2-a37c-fd90ef46a85b.png` and untracked `public/assets/terrain/terrain_samples.png` untouched.
