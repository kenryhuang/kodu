# Natural Road And Demo-Style Trees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one continuous natural dirt road across the map and rebuild trees with generated alpha-card vegetation assets.

**Architecture:** Keep the scene composition in `src/game/world/createDioramaMap.ts`, but add focused helpers for road ribbons and vegetation cards. Keep image material creation in `src/game/world/createMaterials.ts` and extend the existing PNG generator so assets remain local, deterministic, and committed.

**Tech Stack:** TypeScript, Babylon.js 8, Vite, Playwright smoke tests, Node ESM scripts.

## Global Constraints

- Do not import the full external demo GLB.
- Do not add a new asset loader or runtime dependency.
- Do not turn tree leaves, grass cards, or bushes into physical obstacles.
- Do not rewrite terrain physics or make the player follow terrain height in this pass.
- Keep existing player movement, obstacle collision, jump height, houses, and firing controls unchanged.
- Main road must be a single continuous mesh that enters one map side, passes through the village area, and exits another side.
- Vegetation images must live under `public/assets/vegetation/` and be committed.
- `npm test` and `npm run build` must pass before completion.

---

### Task 1: Add Failing Smoke Coverage

**Files:**
- Modify: `tests/smoke.spec.ts`

**Interfaces:**
- Consumes: Existing `readVillageSnapshot(page)` helper.
- Produces: New snapshot fields used by the smoke assertions:
  - `terrainMainRoads: number`
  - `terrainMainRoadVertices: number`
  - `terrainMainRoadBounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null`
  - `terrainRoadSpurs: number`
  - `vegetationAlphaMaterials: number`
  - `treeLeafCards: number`
  - `treeCanopies: number`
  - `grassCards: number`
  - `bushCards: number`

- [ ] **Step 1: Extend the smoke snapshot types**

Add these fields to `VillageSnapshot`:

```ts
  terrainMainRoads: number;
  terrainMainRoadVertices: number;
  terrainMainRoadBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null;
  terrainRoadSpurs: number;
  vegetationAlphaMaterials: number;
  treeLeafCards: number;
  grassCards: number;
  bushCards: number;
```

- [ ] **Step 2: Read the main road mesh and vegetation-card counts**

Inside `readVillageSnapshot`, add:

```ts
    const mainRoad = scene.meshes.find((mesh) => mesh.name === "terrain-road-main");
    const mainRoadBox = mainRoad?.getBoundingInfo().boundingBox;
    const vegetationAlphaMaterials = scene.materials.filter((material) => (
      material.name === "mat-tree-leaves-card"
      || material.name === "mat-bush-card"
      || material.name === "mat-grass-card"
    ) && material.useAlphaFromDiffuseTexture);
```

Return:

```ts
      terrainMainRoads: names.filter((name) => name === "terrain-road-main").length,
      terrainMainRoadVertices: mainRoad?.getTotalVertices() ?? 0,
      terrainMainRoadBounds: mainRoadBox ? {
        minX: mainRoadBox.minimumWorld.x,
        maxX: mainRoadBox.maximumWorld.x,
        minZ: mainRoadBox.minimumWorld.z,
        maxZ: mainRoadBox.maximumWorld.z,
      } : null,
      terrainRoadSpurs: names.filter((name) => name.startsWith("terrain-road-spur-")).length,
      vegetationAlphaMaterials: vegetationAlphaMaterials.length,
      treeLeafCards: names.filter((name) => name.startsWith("tree-") && name.includes("-leaf-card-")).length,
      grassCards: names.filter((name) => name.startsWith("grass-card-")).length,
      bushCards: names.filter((name) => name.startsWith("bush-card-")).length,
```

- [ ] **Step 3: Add vegetation assets to the asset test**

Extend the existing `assets` array in `terrain image assets are served`:

```ts
    "/assets/vegetation/tree-leaves.png",
    "/assets/vegetation/bush.png",
    "/assets/vegetation/grass-card.png",
```

Keep the same PNG response and byte-size assertions. Keep the dimension assertion for all non-heightmap assets.

- [ ] **Step 4: Replace road/tree assertions**

In `renders village houses as tall blocking obstacles`, replace the old road and canopy expectations with:

```ts
  expect(village.terrainRoadPatches).toBe(0);
  expect(village.terrainMainRoads).toBe(1);
  expect(village.terrainMainRoadVertices).toBeGreaterThanOrEqual(80);
  expect(village.terrainMainRoadBounds).not.toBeNull();
  expect(village.terrainMainRoadBounds!.minX).toBeLessThanOrEqual(-15);
  expect(village.terrainMainRoadBounds!.maxX).toBeGreaterThanOrEqual(14);
  expect(village.terrainMainRoadBounds!.minZ).toBeLessThanOrEqual(-10);
  expect(village.terrainMainRoadBounds!.maxZ).toBeGreaterThanOrEqual(8);
  expect(village.terrainRoadSpurs).toBeGreaterThanOrEqual(3);
  expect(village.vegetationAlphaMaterials).toBeGreaterThanOrEqual(3);
  expect(village.treeCanopies).toBe(0);
  expect(village.treeLeafCards).toBeGreaterThanOrEqual(48);
  expect(village.grassCards).toBeGreaterThanOrEqual(18);
  expect(village.bushCards).toBeGreaterThanOrEqual(8);
```

- [ ] **Step 5: Run the failing test**

Run: `npm run test:smoke -- --grep "terrain image assets|village houses"`

Expected: FAIL because `/assets/vegetation/*.png`, `terrain-road-main`, and leaf-card meshes do not exist yet.

---

### Task 2: Generate Vegetation PNG Assets

**Files:**
- Modify: `scripts/generate-terrain-assets.mjs`
- Create: `public/assets/vegetation/tree-leaves.png`
- Create: `public/assets/vegetation/bush.png`
- Create: `public/assets/vegetation/grass-card.png`

**Interfaces:**
- Produces committed PNGs loaded by Babylon from:
  - `/assets/vegetation/tree-leaves.png`
  - `/assets/vegetation/bush.png`
  - `/assets/vegetation/grass-card.png`

- [ ] **Step 1: Add a vegetation output directory**

Change the top of `scripts/generate-terrain-assets.mjs` to keep terrain output and add vegetation output:

```js
const terrainOutDir = join(root, "public", "assets", "terrain");
const vegetationOutDir = join(root, "public", "assets", "vegetation");
mkdirSync(terrainOutDir, { recursive: true });
mkdirSync(vegetationOutDir, { recursive: true });
```

Change `writePng` to accept an output directory:

```js
function writePng(outDir, fileName, width, height, pixelAt) {
```

Update existing terrain calls to start with `terrainOutDir`.

- [ ] **Step 2: Add transparent vegetation shape helpers**

Add helpers after `edgeAlpha`:

```js
function ellipseMask(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return Math.max(0, 1 - dx * dx - dy * dy);
}

function softShapeAlpha(amount) {
  return Math.round(clamp(smooth(clamp(amount, 0, 1)) * 255, 0, 255));
}
```

- [ ] **Step 3: Write the three vegetation images**

Append deterministic PNG generation for:

```js
writePng(vegetationOutDir, "tree-leaves.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [86, 102, 55, 42],
    [132, 82, 64, 48],
    [166, 124, 62, 50],
    [108, 152, 70, 54],
    [146, 166, 58, 44],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  const noise = fbm(x, y, 81, width, height);
  let color = mixColor([35, 103, 48], [104, 164, 70], noise);
  if (hash(x, y, 82) > 0.965) color = shade(color, 28);
  if (hash(x, y, 83) > 0.955) color = shade(color, -24);
  return [...color, softShapeAlpha(mask)];
});

writePng(vegetationOutDir, "bush.png", 256, 256, (x, y, width, height) => {
  const clusters = [
    [76, 166, 54, 44],
    [122, 136, 70, 58],
    [174, 164, 58, 46],
    [132, 184, 86, 42],
  ];
  let mask = 0;
  for (const [cx, cy, rx, ry] of clusters) mask = Math.max(mask, ellipseMask(x, y, cx, cy, rx, ry));
  const color = mixColor([42, 115, 55], [123, 170, 78], fbm(x, y, 91, width, height));
  return [...color, softShapeAlpha(mask)];
});

writePng(vegetationOutDir, "grass-card.png", 256, 256, (x, y, width, height) => {
  const ground = y / (height - 1);
  const bladeField = Math.max(0, ground - 0.25);
  const blade = grassBladeAmount(x, y) || (hash(Math.floor(x / 5), Math.floor(y / 9), 101) > 0.62 && bladeField > 0 ? bladeField : 0);
  const color = mixColor([46, 111, 48], [139, 187, 82], fbm(x, y, 102, width, height));
  return [...color, Math.round(clamp(blade * 255, 0, 255))];
});
```

- [ ] **Step 4: Generate the assets**

Run: `node scripts/generate-terrain-assets.mjs`

Expected: `public/assets/vegetation/tree-leaves.png`, `bush.png`, and `grass-card.png` exist and are larger than 500 bytes.

- [ ] **Step 5: Run the asset smoke test**

Run: `npm run test:smoke -- --grep "terrain image assets"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-terrain-assets.mjs public/assets/vegetation
git commit -m "feat: generate vegetation card assets"
```

---

### Task 3: Add Vegetation Alpha Materials

**Files:**
- Modify: `src/game/world/createMaterials.ts`

**Interfaces:**
- Produces `CartoonMaterials` fields:
  - `treeLeavesCard: StandardMaterial`
  - `bushCard: StandardMaterial`
  - `grassCard: StandardMaterial`

- [ ] **Step 1: Add vegetation materials**

Add return fields near the current tree materials:

```ts
    treeLeavesCard: makeImageTextured("mat-tree-leaves-card", "/assets/vegetation/tree-leaves.png", new Color3(0.28, 0.62, 0.3), 1, 1, true),
    bushCard: makeImageTextured("mat-bush-card", "/assets/vegetation/bush.png", new Color3(0.32, 0.62, 0.3), 1, 1, true),
    grassCard: makeImageTextured("mat-grass-card", "/assets/vegetation/grass-card.png", new Color3(0.48, 0.72, 0.34), 1, 1, true),
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/game/world/createMaterials.ts
git commit -m "feat: add vegetation card materials"
```

---

### Task 4: Replace Road Patches With A Continuous Ribbon

**Files:**
- Modify: `src/game/world/createDioramaMap.ts`

**Interfaces:**
- Produces helper:
  - `addRoadRibbon(name: string, route: RoadRoutePoint[], scene: Scene, material: StandardMaterial): Mesh`
- Produces mesh names:
  - `terrain-road-main`
  - `terrain-road-spur-north-house`
  - `terrain-road-spur-east-house`
  - `terrain-road-spur-south-west-house`

- [ ] **Step 1: Add road route types and helpers**

Add near `PatchPoint`:

```ts
type RoadRoutePoint = {
  readonly x: number;
  readonly z: number;
  readonly width: number;
};
```

Add deterministic helpers before `addTerrainPatch`:

```ts
function roadJitter(index: number, side: number): number {
  return Math.sin(index * 12.9898 + side * 78.233) * 0.11 + Math.sin(index * 4.17 + side * 1.9) * 0.05;
}

function sampleRoute(route: RoadRoutePoint[], stepsPerSegment: number): RoadRoutePoint[] {
  const samples: RoadRoutePoint[] = [];
  for (let segment = 0; segment < route.length - 1; segment += 1) {
    const a = route[segment];
    const b = route[segment + 1];
    for (let step = 0; step < stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      const eased = t * t * (3 - t * 2);
      samples.push({
        x: a.x + (b.x - a.x) * eased,
        z: a.z + (b.z - a.z) * eased,
        width: a.width + (b.width - a.width) * eased,
      });
    }
  }
  samples.push(route[route.length - 1]);
  return samples;
}
```

- [ ] **Step 2: Add `addRoadRibbon`**

Add a mesh builder that creates two vertices per sample:

```ts
function addRoadRibbon(name: string, route: RoadRoutePoint[], scene: Scene, material: StandardMaterial): Mesh {
  const samples = sampleRoute(route, 8);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let traveled = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    const previous = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    if (index > 0) {
      const dx = current.x - previous.x;
      const dz = current.z - previous.z;
      traveled += Math.sqrt(dx * dx + dz * dz);
    }
    const tangentX = next.x - previous.x;
    const tangentZ = next.z - previous.z;
    const length = Math.max(0.001, Math.sqrt(tangentX * tangentX + tangentZ * tangentZ));
    const normalX = -tangentZ / length;
    const normalZ = tangentX / length;
    const leftWidth = current.width * 0.5 + roadJitter(index, -1);
    const rightWidth = current.width * 0.5 + roadJitter(index, 1);
    positions.push(current.x + normalX * leftWidth, 0, current.z + normalZ * leftWidth);
    positions.push(current.x - normalX * rightWidth, 0, current.z - normalZ * rightWidth);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, traveled / 5, 1, traveled / 5);
  }

  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = index * 2;
    indices.push(left, left + 2, left + 1, left + 1, left + 2, left + 3);
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.applyToMesh(mesh);
  mesh.position.y = 0.052;
  mesh.material = material;
  return mesh;
}
```

- [ ] **Step 3: Replace old road patches**

Remove the four `addTerrainPatch("terrain-patch-road-*"...` calls. Add:

```ts
  addRoadRibbon("terrain-road-main", [
    { x: -17.4, z: -11.4, width: 1.28 },
    { x: -11.2, z: -6.6, width: 1.42 },
    { x: -5.6, z: -2.8, width: 1.18 },
    { x: -0.8, z: 0.35, width: 1.52 },
    { x: 4.8, z: 2.0, width: 1.34 },
    { x: 10.2, z: 5.8, width: 1.18 },
    { x: 17.4, z: 10.6, width: 1.42 },
  ], scene, materials.terrainRoad);
  addRoadRibbon("terrain-road-spur-north-house", [
    { x: -0.8, z: 0.35, width: 0.72 },
    { x: -1.05, z: 1.8, width: 0.82 },
    { x: -1.2, z: 2.75, width: 0.68 },
  ], scene, materials.pathDirt);
  addRoadRibbon("terrain-road-spur-east-house", [
    { x: 4.8, z: 2.0, width: 0.76 },
    { x: 5.2, z: 2.15, width: 0.62 },
  ], scene, materials.pathDirt);
  addRoadRibbon("terrain-road-spur-south-west-house", [
    { x: -5.6, z: -2.8, width: 0.82 },
    { x: -4.95, z: -3.05, width: 0.66 },
  ], scene, materials.pathDirt);
```

- [ ] **Step 4: Remove old path tiles**

Remove the four `addPathTile("village-path-*"...` calls, because the new spur ribbons replace them visually.

- [ ] **Step 5: Run the road smoke test**

Run: `npm run test:smoke -- --grep "village houses"`

Expected: road assertions pass; vegetation-card assertions still fail until Task 5.

- [ ] **Step 6: Commit**

```bash
git add src/game/world/createDioramaMap.ts tests/smoke.spec.ts
git commit -m "feat: add continuous natural road"
```

---

### Task 5: Rebuild Trees With Vegetation Cards

**Files:**
- Modify: `src/game/world/createDioramaMap.ts`

**Interfaces:**
- Consumes `materials.treeLeavesCard`, `materials.bushCard`, and `materials.grassCard`.
- Produces mesh names:
  - `tree-<id>-leaf-card-<n>`
  - `bush-card-<id>-<n>`
  - `grass-card-<id>-<n>`

- [ ] **Step 1: Add vegetation card helpers**

Add after `addSimpleBox`:

```ts
function addVegetationCard(
  name: string,
  position: Vector3,
  width: number,
  height: number,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
  pitch = 0,
): void {
  const card = MeshBuilder.CreatePlane(name, { width, height, sideOrientation: Mesh.DOUBLESIDE }, scene);
  card.position = position;
  card.rotation.x = pitch;
  card.rotation.y = yaw;
  card.material = material;
}
```

Add:

```ts
function addCrossCards(
  prefix: string,
  position: Vector3,
  width: number,
  height: number,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
): void {
  addVegetationCard(`${prefix}-0`, position, width, height, yaw, material, scene);
  addVegetationCard(`${prefix}-1`, position, width * 0.94, height * 0.98, yaw + Math.PI / 2, material, scene);
}
```

- [ ] **Step 2: Replace sphere canopy creation**

Remove the `canopyParts` sphere loop and `leaf-highlight-main` sphere. Add a leaf-card cluster:

```ts
  const leafClusters = [
    { id: "center", x: 0, y: 1.26, z: 0, w: 1.2, h: 1.05, yawOffset: 0 },
    { id: "front", x: 0.12, y: 1.12, z: -0.34, w: 0.96, h: 0.86, yawOffset: 0.62 },
    { id: "back", x: -0.1, y: 1.18, z: 0.34, w: 0.98, h: 0.88, yawOffset: -0.48 },
    { id: "left", x: -0.4, y: 1.16, z: 0.02, w: 0.92, h: 0.84, yawOffset: 1.18 },
    { id: "right", x: 0.42, y: 1.2, z: 0.08, w: 0.9, h: 0.82, yawOffset: -1.05 },
  ];

  for (const cluster of leafClusters) {
    const world = toHouseWorld(position, yaw, cluster.x * scale * shapeScale.x, cluster.y * scale * shapeScale.y, cluster.z * scale * shapeScale.z);
    addCrossCards(`${name}-leaf-card-${cluster.id}`, world, cluster.w * scale * shapeScale.x, cluster.h * scale * shapeScale.y, yaw + cluster.yawOffset, materials.treeLeavesCard, scene);
  }
```

This creates 10 leaf cards per tree and no `-canopy-` meshes.

- [ ] **Step 3: Add shrubs and grass cards**

Add helper:

```ts
function addGroundVegetation(
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const bushes = [
    ["west-a", -7.2, 0.05, -0.8, 0.75, 0.58, 0.3],
    ["west-b", -8.9, 0.05, 1.7, 0.68, 0.52, -0.4],
    ["grove-a", 2.0, 0.05, -4.65, 0.72, 0.55, 1.2],
    ["grove-b", 6.7, 0.05, 4.2, 0.78, 0.58, -1.1],
  ] as const;
  for (const [id, x, y, z, width, height, yaw] of bushes) {
    addCrossCards(`bush-card-${id}`, new Vector3(x, y + height * 0.5, z), width, height, yaw, materials.bushCard, scene);
  }

  const grasses = [
    [-10.8, -4.8], [-9.6, -2.6], [-7.6, 3.3], [-5.9, 5.2],
    [-2.7, -7.4], [0.8, -6.1], [2.9, -5.5], [4.2, -4.4],
    [6.4, -3.4], [8.8, -1.2], [9.6, 2.9], [11.4, 5.1],
  ] as const;
  grasses.forEach(([x, z], index) => {
    addCrossCards(`grass-card-meadow-${index}`, new Vector3(x, 0.33, z), 0.54 + (index % 3) * 0.08, 0.66 + (index % 2) * 0.1, index * 0.47, materials.grassCard, scene);
  });
}
```

Call `addGroundVegetation(scene, materials);` after the tree placements.

- [ ] **Step 4: Run the village smoke test**

Run: `npm run test:smoke -- --grep "village houses"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/world/createDioramaMap.ts tests/smoke.spec.ts
git commit -m "feat: rebuild trees with vegetation cards"
```

---

### Task 6: Full Verification And Local Preview

**Files:**
- No source edits unless verification exposes a defect.

**Interfaces:**
- Produces a working local preview at `http://localhost:4173/`.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: PASS. Existing non-fatal chunk-size or Fluent UI `"use client"` warnings are acceptable if the build exits 0.

- [ ] **Step 3: Restart the preview on port 4173**

Run:

```bash
tmux kill-session -t kodu-preview-4173 || true
for pid in $(lsof -ti tcp:4173); do kill "$pid"; done
tmux new-session -d -s kodu-preview-4173 'cd /Users/huanggui/workspace/kodu && npm run dev -- --port 4173'
```

Expected: `curl -I http://localhost:4173/` returns HTTP 200.

- [ ] **Step 4: Commit remaining verification-driven fixes**

If verification required code changes:

```bash
git add src/game/world/createDioramaMap.ts src/game/world/createMaterials.ts tests/smoke.spec.ts scripts/generate-terrain-assets.mjs public/assets/vegetation
git commit -m "fix: polish natural road and vegetation cards"
```

If no verification fixes were needed, skip this commit.
