# Low-Poly Tree Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace thin tree leaf-card clusters with fuller local low-poly tree assets that match the `#DR9MT2#77` direction: solid trunks, branch structure, dense leaf volumes, and crisp alpha-tested foliage shells.

**Architecture:** Keep tree assembly inside `src/game/world/createDioramaMap.ts`, but add focused helpers for angled cylinders, irregular leaf-volume meshes, and embedded alpha-tested leaf shells. Extend `src/game/world/createMaterials.ts` with a dedicated alpha-test foliage material path and extend `scripts/generate-terrain-assets.mjs` with local tree bark and leaf-shell PNG assets.

**Tech Stack:** TypeScript, Babylon.js 8, Vite, Playwright smoke tests, Node ESM PNG generation.

## Global Constraints

- Do not import the full `ancient_ruins05k-png.glb` into the app.
- Do not make trees into physical obstacles in this pass.
- Do not add skeletal animation, wind animation, LOD switching, or runtime asset streaming.
- Do not change the terrain, roads, houses, or player controls except where tree placement needs small visual spacing adjustments.
- Keep player movement, obstacle collision, jump behavior, houses, roads, and firing controls unchanged.
- Tree assets must be generated in code and local PNG assets; do not load the full remote ruins GLB at runtime.
- `npm test` and `npm run build` must pass before the implementation is considered complete.

---

## File Structure

- `tests/smoke.spec.ts`: expands scene introspection to prove trees now use alpha-tested foliage and solid leaf-volume meshes.
- `scripts/generate-terrain-assets.mjs`: generates additional local PNGs for crisp foliage shells and bark texture.
- `src/game/world/createMaterials.ts`: adds nearest-sampled alpha-test foliage and bark materials.
- `src/game/world/createDioramaMap.ts`: replaces the current tree leaf-card canopy with a reusable low-poly tree asset builder.

---

### Task 1: Add Failing Smoke Coverage For Low-Poly Tree Assets

**Files:**
- Modify: `tests/smoke.spec.ts`

**Interfaces:**
- Consumes: existing `readVillageSnapshot(page)`.
- Produces new snapshot fields:
  - `treeLeafVolumes: number`
  - `treeLeafVolumeVertices: number`
  - `treeLeafShells: number`
  - `treeStyleVariants: number`
  - `treeFoliageAlphaTestMaterials: number`
  - `treeFoliageAlphaBlendMaterials: number`

- [ ] **Step 1: Extend `VillageSnapshot`**

Add these fields after `treeLeafCards`:

```ts
  treeLeafVolumes: number;
  treeLeafVolumeVertices: number;
  treeLeafShells: number;
  treeStyleVariants: number;
  treeFoliageAlphaTestMaterials: number;
  treeFoliageAlphaBlendMaterials: number;
```

- [ ] **Step 2: Extend material introspection types**

In the `scene.materials` type inside `readVillageSnapshot`, replace the current material shape with:

```ts
            materials: Array<{
              name: string;
              transparencyMode?: number | null;
              useAlphaFromDiffuseTexture?: boolean;
              needAlphaTesting?: () => boolean;
            }>;
```

- [ ] **Step 3: Add low-poly tree counters**

Inside `readVillageSnapshot`, after `vegetationAlphaMaterials`, add:

```ts
    const treeLeafVolumeMeshes = scene.meshes.filter((mesh) => (
      mesh.name.startsWith("tree-") && mesh.name.includes("-leaf-volume-")
    ));
    const treeStyleIds = new Set(
      treeLeafVolumeMeshes
        .map((mesh) => /-style-([a-z-]+)-leaf-volume-/.exec(mesh.name)?.[1])
        .filter((style): style is string => Boolean(style)),
    );
    const treeFoliageMaterials = scene.materials.filter((material) => (
      material.name === "mat-tree-leaf-mask"
      || material.name === "mat-tree-leaf-shell"
    ));
    const treeFoliageAlphaTestMaterials = treeFoliageMaterials.filter((material) => (
      material.transparencyMode === 1 || Boolean(material.needAlphaTesting?.())
    ));
    const treeFoliageAlphaBlendMaterials = treeFoliageMaterials.filter((material) => (
      material.transparencyMode === 2
    ));
```

Return these values:

```ts
      treeLeafVolumes: treeLeafVolumeMeshes.length,
      treeLeafVolumeVertices: treeLeafVolumeMeshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
      treeLeafShells: names.filter((name) => name.startsWith("tree-") && name.includes("-leaf-shell-")).length,
      treeStyleVariants: treeStyleIds.size,
      treeFoliageAlphaTestMaterials: treeFoliageAlphaTestMaterials.length,
      treeFoliageAlphaBlendMaterials: treeFoliageAlphaBlendMaterials.length,
```

- [ ] **Step 4: Add new local assets to the image asset test**

Extend the asset list in `terrain image assets are served`:

```ts
    "/assets/vegetation/tree-leaf-shell.png",
    "/assets/vegetation/tree-bark.png",
```

- [ ] **Step 5: Replace tree expectations in the village smoke test**

In `renders village houses as tall blocking obstacles`, replace:

```ts
  expect(village.treeLeafCards).toBeGreaterThanOrEqual(48);
```

with:

```ts
  expect(village.treeLeafCards).toBeLessThanOrEqual(12);
  expect(village.treeLeafVolumes).toBeGreaterThanOrEqual(24);
  expect(village.treeLeafVolumeVertices).toBeGreaterThanOrEqual(480);
  expect(village.treeLeafShells).toBeGreaterThanOrEqual(18);
  expect(village.treeStyleVariants).toBeGreaterThanOrEqual(3);
  expect(village.treeFoliageAlphaTestMaterials).toBeGreaterThanOrEqual(2);
  expect(village.treeFoliageAlphaBlendMaterials).toBe(0);
```

Keep existing root, branch, grass-card, bush-card, road, house, and movement assertions.

- [ ] **Step 6: Verify the tests fail for the intended reason**

Run:

```bash
npm run test:smoke -- --grep "terrain image assets|village houses"
```

Expected: FAIL because `tree-leaf-shell.png`, `tree-bark.png`, `mat-tree-leaf-mask`, `mat-tree-leaf-shell`, and `tree-*-leaf-volume-*` meshes do not exist yet.

---

### Task 2: Generate Local Tree Bark And Leaf-Shell PNG Assets

**Files:**
- Modify: `scripts/generate-terrain-assets.mjs`
- Create: `public/assets/vegetation/tree-leaf-shell.png`
- Create: `public/assets/vegetation/tree-bark.png`
- Modify: `public/assets/vegetation/tree-leaves.png`

**Interfaces:**
- Produces committed PNGs loaded by Babylon:
  - `/assets/vegetation/tree-leaves.png`
  - `/assets/vegetation/tree-leaf-shell.png`
  - `/assets/vegetation/tree-bark.png`

- [ ] **Step 1: Replace `tree-leaves.png` generation with denser lobe texture**

Replace the current `writePng(vegetationOutDir, "tree-leaves.png"...` block with:

```js
writePng(vegetationOutDir, "tree-leaves.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [72, 104, 62, 46],
    [118, 78, 72, 54],
    [172, 104, 66, 48],
    [92, 152, 74, 56],
    [152, 158, 72, 54],
    [128, 124, 92, 66],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) {
    mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  }
  const noise = fbm(x, y, 81, width, height);
  let color = mixColor([30, 90, 42], [102, 156, 66], noise);
  if (hash(x, y, 82) > 0.94) color = shade(color, 22);
  if (hash(x, y, 83) > 0.94) color = shade(color, -22);
  const cut = softShapeAlpha(mask);
  return [...color, cut > 70 ? 255 : 0];
});
```

- [ ] **Step 2: Add `tree-leaf-shell.png`**

Append after `tree-leaves.png`:

```js
writePng(vegetationOutDir, "tree-leaf-shell.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [64, 132, 54, 46],
    [116, 96, 70, 56],
    [174, 124, 58, 52],
    [138, 170, 78, 46],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) {
    mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  }
  const color = mixColor([28, 84, 42], [118, 166, 76], fbm(x, y, 121, width, height));
  const interior = mask > 0.18 ? 255 : 0;
  const holes = hash(Math.floor(x / 7), Math.floor(y / 7), 122) > 0.86 && mask > 0.35 ? 0 : interior;
  return [...color, holes];
});
```

- [ ] **Step 3: Add `tree-bark.png`**

Append after `tree-leaf-shell.png`:

```js
writePng(vegetationOutDir, "tree-bark.png", 256, 256, (x, y, width, height) => {
  const vertical = Math.sin((x * 0.14 + tileNoise(x, y, 18, 131, width, height) * 2.4) * Math.PI);
  const knots = tileNoise(x, y, 26, 132, width, height);
  let color = mixColor([86, 48, 25], [151, 91, 45], fbm(x, y, 133, width, height));
  color = shade(color, Math.round(vertical * 15));
  if (knots > 0.73) color = mixColor(color, [50, 28, 17], 0.48);
  if (hash(x, y, 134) > 0.965) color = shade(color, 24);
  return [...color, 255];
});
```

- [ ] **Step 4: Generate assets**

Run:

```bash
node scripts/generate-terrain-assets.mjs
```

Expected: `tree-leaf-shell.png`, `tree-bark.png`, and regenerated `tree-leaves.png` exist and are each larger than 500 bytes.

- [ ] **Step 5: Run the asset smoke test**

Run:

```bash
npm run test:smoke -- --grep "terrain image assets"
```

Expected: PASS.

- [ ] **Step 6: Commit assets**

```bash
git add scripts/generate-terrain-assets.mjs public/assets/vegetation/tree-leaves.png public/assets/vegetation/tree-leaf-shell.png public/assets/vegetation/tree-bark.png
git commit -m "feat: generate low-poly tree textures"
```

---

### Task 3: Add Alpha-Test Foliage And Bark Materials

**Files:**
- Modify: `src/game/world/createMaterials.ts`

**Interfaces:**
- Produces `CartoonMaterials` fields:
  - `treeLeafMask: StandardMaterial`
  - `treeLeafShell: StandardMaterial`
  - `treeBark: StandardMaterial`

- [ ] **Step 1: Add alpha-test texture helper**

After `makeImageTextured`, add:

```ts
  const makeAlphaTestTextured = (
    name: string,
    url: string,
    fallbackColor: Color3,
    cutoff = 0.48,
  ): StandardMaterial => {
    const material = make(name, fallbackColor);
    const texture = new Texture(url, scene, {
      invertY: false,
      samplingMode: Texture.NEAREST_SAMPLINGMODE,
    });
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.hasAlpha = true;
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(1, 1, 1);
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = cutoff;
    material.specularColor = new Color3(0, 0, 0);
    return material;
  };
```

- [ ] **Step 2: Add nearest texture helper for bark**

After `makeAlphaTestTextured`, add:

```ts
  const makeNearestImageTextured = (
    name: string,
    url: string,
    fallbackColor: Color3,
    tileScale = 1,
  ): StandardMaterial => {
    const material = make(name, fallbackColor);
    const texture = new Texture(url, scene, {
      invertY: false,
      samplingMode: Texture.NEAREST_SAMPLINGMODE,
    });
    texture.uScale = tileScale;
    texture.vScale = tileScale;
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(1, 1, 1);
    material.specularColor = new Color3(0, 0, 0);
    return material;
  };
```

- [ ] **Step 3: Add return fields**

Near existing tree materials, add:

```ts
    treeBark: makeNearestImageTextured("mat-tree-bark", "/assets/vegetation/tree-bark.png", new Color3(0.5, 0.29, 0.15), 1),
    treeLeafMask: makeAlphaTestTextured("mat-tree-leaf-mask", "/assets/vegetation/tree-leaves.png", new Color3(0.25, 0.58, 0.3), 0.46),
    treeLeafShell: makeAlphaTestTextured("mat-tree-leaf-shell", "/assets/vegetation/tree-leaf-shell.png", new Color3(0.3, 0.62, 0.34), 0.5),
```

Keep `treeLeavesCard`, `bushCard`, and `grassCard` for ground decoration compatibility.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit materials**

```bash
git add src/game/world/createMaterials.ts
git commit -m "feat: add alpha-test tree materials"
```

---

### Task 4: Build Low-Poly Tree Meshes With Solid Leaf Volumes

**Files:**
- Modify: `src/game/world/createDioramaMap.ts`

**Interfaces:**
- Consumes materials from Task 3.
- Produces mesh names:
  - `tree-<name>-style-<variant>-leaf-volume-<id>`
  - `tree-<name>-leaf-shell-<id>`
  - `tree-<name>-trunk-base`
  - `tree-<name>-branch-<id>`
- Produces style variants: `broad`, `tall`, `bent`.

- [ ] **Step 1: Import Quaternion**

Change the first import to:

```ts
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
```

- [ ] **Step 2: Replace `TreeStyle` type**

Replace the current `TreeStyle` with:

```ts
type TreeVariant = "broad" | "tall" | "bent";

type LeafLobe = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
};

type TreeStyle = {
  readonly scale: number;
  readonly yaw: number;
  readonly variant: TreeVariant;
  readonly trunkLean: number;
  readonly canopy: LeafLobe[];
};
```

- [ ] **Step 3: Add tree style presets**

Add after `TreeStyle`:

```ts
const treePresets: Record<TreeVariant, Pick<TreeStyle, "trunkLean" | "canopy">> = {
  broad: {
    trunkLean: 0.08,
    canopy: [
      { id: "core", x: 0, y: 1.28, z: 0, sx: 1.25, sy: 0.72, sz: 1.05 },
      { id: "left", x: -0.45, y: 1.22, z: 0.02, sx: 0.82, sy: 0.62, sz: 0.88 },
      { id: "right", x: 0.42, y: 1.25, z: 0.06, sx: 0.86, sy: 0.64, sz: 0.86 },
      { id: "back", x: -0.08, y: 1.36, z: 0.38, sx: 0.92, sy: 0.62, sz: 0.78 },
      { id: "front", x: 0.08, y: 1.18, z: -0.36, sx: 0.86, sy: 0.56, sz: 0.72 },
    ],
  },
  tall: {
    trunkLean: -0.04,
    canopy: [
      { id: "lower", x: 0, y: 1.18, z: 0, sx: 0.78, sy: 0.72, sz: 0.74 },
      { id: "mid", x: 0.08, y: 1.52, z: -0.04, sx: 0.9, sy: 0.78, sz: 0.78 },
      { id: "top", x: -0.06, y: 1.86, z: 0.06, sx: 0.68, sy: 0.62, sz: 0.6 },
      { id: "side", x: -0.3, y: 1.42, z: 0.12, sx: 0.56, sy: 0.52, sz: 0.58 },
    ],
  },
  bent: {
    trunkLean: 0.18,
    canopy: [
      { id: "core", x: 0.16, y: 1.28, z: 0, sx: 1.02, sy: 0.68, sz: 0.9 },
      { id: "heavy", x: 0.54, y: 1.2, z: -0.1, sx: 0.88, sy: 0.62, sz: 0.8 },
      { id: "back", x: -0.12, y: 1.36, z: 0.32, sx: 0.78, sy: 0.58, sz: 0.68 },
      { id: "tip", x: 0.34, y: 1.62, z: 0.1, sx: 0.64, sy: 0.52, sz: 0.58 },
    ],
  },
};
```

- [ ] **Step 4: Add angled cylinder helper**

Add after `addSimpleBox`:

```ts
function addAngledCylinder(
  name: string,
  start: Vector3,
  end: Vector3,
  diameterBottom: number,
  diameterTop: number,
  material: StandardMaterial,
  scene: Scene,
): void {
  const direction = end.subtract(start);
  const height = direction.length();
  const mesh = MeshBuilder.CreateCylinder(name, {
    height,
    diameterBottom,
    diameterTop,
    tessellation: 7,
  }, scene);
  mesh.position = start.add(end).scale(0.5);
  const normalized = direction.normalize();
  mesh.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.UpReadOnly, normalized, new Quaternion());
  mesh.material = material;
}
```

- [ ] **Step 5: Add irregular leaf-volume mesh helper**

Add after `addCrossCards`:

```ts
function addLeafVolume(
  name: string,
  center: Vector3,
  scale: Vector3,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
): void {
  const rings = [
    { y: -0.46, radius: 0.34 },
    { y: -0.18, radius: 0.78 },
    { y: 0.12, radius: 1 },
    { y: 0.38, radius: 0.62 },
  ];
  const segments = 9;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  positions.push(0, -0.58, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 1);

  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    const ring = rings[ringIndex];
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const wobble = 1 + Math.sin(segment * 1.7 + ringIndex * 0.8) * 0.12;
      positions.push(
        Math.cos(angle) * ring.radius * wobble,
        ring.y,
        Math.sin(angle) * ring.radius * (1.08 - wobble * 0.08),
      );
      normals.push(Math.cos(angle), 0.45, Math.sin(angle));
      uvs.push(segment / segments, ringIndex / (rings.length - 1));
    }
  }

  const topIndex = positions.length / 3;
  positions.push(0.06, 0.62, -0.04);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0);

  for (let segment = 0; segment < segments; segment += 1) {
    const next = segment === segments - 1 ? 0 : segment + 1;
    indices.push(0, 1 + segment, 1 + next);
  }

  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    const ringStart = 1 + ringIndex * segments;
    const nextStart = ringStart + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = segment === segments - 1 ? 0 : segment + 1;
      indices.push(ringStart + segment, nextStart + segment, ringStart + next);
      indices.push(ringStart + next, nextStart + segment, nextStart + next);
    }
  }

  const lastRingStart = 1 + (rings.length - 1) * segments;
  for (let segment = 0; segment < segments; segment += 1) {
    const next = segment === segments - 1 ? 0 : segment + 1;
    indices.push(lastRingStart + segment, topIndex, lastRingStart + next);
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.applyToMesh(mesh);
  mesh.position = center;
  mesh.rotation.y = yaw;
  mesh.scaling = scale;
  mesh.material = material;
}
```

- [ ] **Step 6: Replace `addTree` canopy implementation**

Inside `addTree`, derive preset and variant:

```ts
  const variant = style.variant ?? "broad";
  const preset = treePresets[variant];
  const trunkLean = style.trunkLean ?? preset.trunkLean;
```

Use `materials.treeBark` for trunk/root/branch meshes. Replace existing `leafClusters` and `addCrossCards(...leaf-card...)` loop with:

```ts
  const trunkBaseTop = position.add(new Vector3(Math.sin(yaw) * trunkLean * scale, 0.76 * scale, Math.cos(yaw) * trunkLean * scale));
  addAngledCylinder(`${name}-trunk-base`, position.add(new Vector3(0, 0.06 * scale, 0)), trunkBaseTop, 0.36 * scale, 0.24 * scale, materials.treeBark, scene);
  const trunkTop = trunkBaseTop.add(new Vector3(Math.sin(yaw + 0.4) * trunkLean * scale, 0.58 * scale, Math.cos(yaw + 0.4) * trunkLean * scale));
  addAngledCylinder(`${name}-trunk-upper`, trunkBaseTop, trunkTop, 0.24 * scale, 0.15 * scale, materials.treeBark, scene);

  for (let index = 0; index < 4; index += 1) {
    const rootYaw = yaw + index * Math.PI * 0.5 + (index % 2 === 0 ? 0.18 : -0.12);
    const rootEnd = position.add(new Vector3(Math.cos(rootYaw) * 0.46 * scale, 0.1 * scale, Math.sin(rootYaw) * 0.46 * scale));
    addAngledCylinder(`${name}-root-${index}`, position.add(new Vector3(0, 0.08 * scale, 0)), rootEnd, 0.14 * scale, 0.05 * scale, materials.treeBark, scene);
  }

  for (let index = 0; index < 4; index += 1) {
    const branchYaw = yaw + index * Math.PI * 0.52 + 0.32;
    const branchStart = trunkBaseTop.add(new Vector3(0, index * 0.08 * scale, 0));
    const branchEnd = branchStart.add(new Vector3(Math.cos(branchYaw) * (0.42 + index * 0.04) * scale, (0.26 + index * 0.05) * scale, Math.sin(branchYaw) * (0.42 + index * 0.04) * scale));
    addAngledCylinder(`${name}-branch-${index}`, branchStart, branchEnd, 0.14 * scale, 0.055 * scale, materials.treeBark, scene);
  }

  for (const lobe of preset.canopy) {
    const world = toHouseWorld(position, yaw, lobe.x * scale, lobe.y * scale, lobe.z * scale);
    addLeafVolume(
      `${name}-style-${variant}-leaf-volume-${lobe.id}`,
      world,
      new Vector3(lobe.sx * scale, lobe.sy * scale, lobe.sz * scale),
      yaw + lobe.x * 0.16,
      materials.treeLeafMask,
      scene,
    );
  }

  const shellCount = variant === "broad" ? 4 : 3;
  for (let index = 0; index < shellCount; index += 1) {
    const angle = yaw + index * (Math.PI * 2 / shellCount) + 0.22;
    const offset = new Vector3(Math.cos(angle) * 0.34 * scale, (1.32 + index * 0.08) * scale, Math.sin(angle) * 0.28 * scale);
    addVegetationCard(
      `${name}-leaf-shell-${index}`,
      position.add(offset),
      (0.8 + index * 0.08) * scale,
      (0.72 + (index % 2) * 0.08) * scale,
      angle,
      materials.treeLeafShell,
      scene,
      -0.12,
    );
  }
```

Remove the old `leafClusters` block so `tree-*-leaf-card-*` no longer drives tree canopies.

- [ ] **Step 7: Update tree placements to explicit variants**

Replace tree calls with:

```ts
  addTree("tree-north-west", new Vector3(-4.8, 0, 2.7), scene, materials, { scale: 1.05, yaw: 0.35, variant: "broad" });
  addTree("tree-south-east", new Vector3(6.55, 0, -2.1), scene, materials, { scale: 0.95, yaw: -0.6, variant: "bent" });
  addTree("tree-village-grove-a", new Vector3(2.4, 0, -3.95), scene, materials, { scale: 0.82, yaw: 1.25, variant: "tall" });
  addTree("tree-village-grove-b", new Vector3(7.4, 0, 4.9), scene, materials, { scale: 1.1, yaw: -1.05, variant: "broad" });
  addTree("tree-west-meadow", new Vector3(-8.35, 0, 0.85), scene, materials, { scale: 0.88, yaw: 2.1, variant: "tall" });
  addTree("tree-south-meadow", new Vector3(-1.7, 0, -6.4), scene, materials, { scale: 1.18, yaw: 0.75, variant: "bent" });
```

- [ ] **Step 8: Run village smoke**

Run:

```bash
npm run test:smoke -- --grep "village houses"
```

Expected: PASS with low-poly tree assertions.

- [ ] **Step 9: Commit tree mesh changes**

```bash
git add src/game/world/createDioramaMap.ts tests/smoke.spec.ts
git commit -m "feat: build low-poly tree assets"
```

---

### Task 5: Full Verification And Local Preview

**Files:**
- No source edits unless verification exposes a defect.

**Interfaces:**
- Produces local preview at `http://localhost:4173/`.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS, with all 9 smoke tests passing.

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected: PASS. Existing non-fatal Fluent UI `"use client"` and chunk-size warnings are acceptable only if the command exits 0.

- [ ] **Step 3: Restart local server on port 4173**

Run:

```bash
tmux kill-session -t kodu-preview-4173 2>/dev/null || true
for pid in $(lsof -ti tcp:4173); do kill "$pid"; done
tmux new-session -d -s kodu-preview-4173 'cd /Users/huanggui/workspace/kodu && npm run dev -- --port 4173'
sleep 2
curl -I http://localhost:4173/
```

Expected: HTTP 200 from `http://localhost:4173/`.

- [ ] **Step 4: Visual smoke screenshot**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('test-results/low-poly-tree-assets-preview.png').resolve()
out.parent.mkdir(parents=True, exist_ok=True)
console_errors = []
page_errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.goto('http://localhost:4173/')
    page.wait_for_load_state('networkidle')
    page.wait_for_selector('#game-canvas')
    page.wait_for_timeout(2500)
    page.screenshot(path=str(out), full_page=True)
    browser.close()
print(out)
print('console_errors=', console_errors)
print('page_errors=', page_errors)
PY
```

Expected: prints screenshot path, `console_errors= []`, and `page_errors= []`.

- [ ] **Step 5: Commit verification-driven fixes if needed**

If verification required source changes:

```bash
git add src/game/world/createDioramaMap.ts src/game/world/createMaterials.ts tests/smoke.spec.ts scripts/generate-terrain-assets.mjs public/assets/vegetation
git commit -m "fix: polish low-poly tree assets"
```

If no fixes were needed, skip this commit.
