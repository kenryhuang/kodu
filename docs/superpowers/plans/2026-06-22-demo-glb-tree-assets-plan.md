# Demo GLB Tree Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current procedural tree visuals with locally vendored tree meshes from the Babylon.js Playground demo GLB.

**Architecture:** Keep terrain, houses, collision, camera, controls, NPCs, and projectiles unchanged. Load the demo GLB once during `GameScene.init()`, extract the `TreeLOWPOLY` leaf/trunk nodes into hidden source meshes, clone those source meshes into the existing six tree placements, and leave the old procedural tree builder only as a development fallback when the GLB cannot load.

**Tech Stack:** TypeScript, Vite static assets in `public/assets`, Babylon.js `LoadAssetContainerAsync`, Babylon glTF loader already imported in `src/game/GameApp.ts`, Playwright smoke tests.

## Global Constraints

- Demo reference: `https://playground.babylonjs.com/#DR9MT2#77`.
- Demo GLB source: `https://raw.githubusercontent.com/CedricGuillemet/dump/master/starryassets/ancient_ruins05k-png.glb`.
- Vendor the GLB locally at `public/assets/models/ancient_ruins05k-png.glb`; do not load it from GitHub at runtime.
- Include attribution for the original Sketchfab `Ancient ruins` model by fedorzabelin, licensed CC Attribution.
- Use only tree-related nodes from the GLB; do not display the full ruins environment.
- Imported trees are visual scenery only; do not add player collision obstacles for trees.
- Preserve existing controls: `space=jump`, `mouse click=fire`.
- Keep local service on port `4173`; kill any existing service on `4173` before restarting.

---

## File Structure

- Modify `tests/smoke.spec.ts`
  - Add a model asset smoke test.
  - Replace procedural-tree scene expectations with demo-GLB tree expectations.
- Create `public/assets/models/ancient_ruins05k-png.glb`
  - Local copy of the demo GLB.
- Create `public/assets/models/ATTRIBUTION.md`
  - Attribution and source/license notes for the vendored GLB.
- Create `src/game/world/treePlacements.ts`
  - Shared tree placement data used by the demo loader and procedural fallback.
- Create `src/game/world/addDemoGlbTrees.ts`
  - Imports the GLB, extracts the demo tree source meshes, configures materials, normalizes source geometry, and creates varied tree instances.
- Modify `src/game/world/createDioramaMap.ts`
  - Export `terrainVisualHeightAt`.
  - Remove direct procedural tree placement from the default map.
  - Export `addFallbackTrees()` for GLB load failure only.
- Modify `src/game/GameScene.ts`
  - Await `addDemoGlbTrees()` after creating the map and before starting player/NPC systems.
  - Use `addFallbackTrees()` only if GLB loading throws.

---

### Task 1: Vendor Demo GLB Asset

**Files:**
- Modify: `tests/smoke.spec.ts`
- Create: `public/assets/models/ancient_ruins05k-png.glb`
- Create: `public/assets/models/ATTRIBUTION.md`

**Interfaces:**
- Produces: local model URL `/assets/models/ancient_ruins05k-png.glb` for `addDemoGlbTrees()`.
- Produces: attribution document required by the design spec.

- [ ] **Step 1: Write the failing model asset smoke test**

In `tests/smoke.spec.ts`, add this test after `test("terrain image assets are served", ...)`:

```ts
test("demo tree model asset is served locally", async ({ page }) => {
  await page.goto("/");
  const response = await page.request.get("/assets/models/ancient_ruins05k-png.glb");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/application\/octet-stream|model\/gltf-binary/);
  expect((await response.body()).byteLength).toBeGreaterThan(10_000_000);
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npm run test:smoke -- --grep "demo tree model asset"
```

Expected: FAIL because `/assets/models/ancient_ruins05k-png.glb` does not exist yet and the response is not a successful model response.

- [ ] **Step 3: Download the GLB into the local assets folder**

Run:

```bash
curl -L --fail \
  https://raw.githubusercontent.com/CedricGuillemet/dump/master/starryassets/ancient_ruins05k-png.glb \
  -o public/assets/models/ancient_ruins05k-png.glb
```

Then confirm size:

```bash
wc -c public/assets/models/ancient_ruins05k-png.glb
```

Expected: byte count is greater than `10000000`.

- [ ] **Step 4: Add attribution**

Create `public/assets/models/ATTRIBUTION.md` with exactly this content:

```md
# Model Attribution

## ancient_ruins05k-png.glb

- Runtime path: `/assets/models/ancient_ruins05k-png.glb`
- Demo reference: https://playground.babylonjs.com/#DR9MT2#77
- Demo source file: https://raw.githubusercontent.com/CedricGuillemet/dump/master/starryassets/ancient_ruins05k-png.glb
- Original model: `Ancient ruins` by fedorzabelin on Sketchfab
- Original model page: https://sketchfab.com/3d-models/ancient-ruins-5da77fdce0cd46b395cbbdcce7eb17a7
- License: Creative Commons Attribution

This project vendors the GLB locally so the game does not depend on a remote asset URL at runtime.
```

- [ ] **Step 5: Run the asset test to verify it passes**

Run:

```bash
npm run test:smoke -- --grep "demo tree model asset"
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add tests/smoke.spec.ts public/assets/models/ancient_ruins05k-png.glb public/assets/models/ATTRIBUTION.md
git commit -m "feat: vendor demo tree model asset"
```

---

### Task 2: Add Scene-Level Smoke Coverage for Demo Trees

**Files:**
- Modify: `tests/smoke.spec.ts`

**Interfaces:**
- Consumes: local model asset from Task 1.
- Produces: smoke assertions that Task 4 must satisfy.

- [ ] **Step 1: Extend `VillageSnapshot`**

In `tests/smoke.spec.ts`, add these fields to `type VillageSnapshot` near the existing tree fields:

```ts
  demoTreeInstances: number;
  demoTreeVisualMeshes: number;
  demoTreeSourceMeshes: number;
  demoTreeLeafAlphaTestMaterials: number;
  demoTreeLeafAlphaBlendMaterials: number;
```

- [ ] **Step 2: Extend the evaluated scene shape**

Inside `readVillageSnapshot()`, extend the `scene` type with `transformNodes`:

```ts
          scene?: {
            materials: Array<{
              name: string;
              transparencyMode?: number | null;
              useAlphaFromDiffuseTexture?: boolean;
              needAlphaTesting?: () => boolean;
            }>;
            meshes: Array<{
              name: string;
              getBoundingInfo(): {
                boundingBox: {
                  minimumWorld: { x: number; z: number };
                  maximumWorld: { x: number; z: number };
                };
              };
              getTotalVertices(): number;
            }>;
            transformNodes: Array<{
              name: string;
            }>;
          };
```

- [ ] **Step 3: Add demo tree counters in `readVillageSnapshot()`**

After `const materialNames = scene.materials.map((material) => material.name);`, add:

```ts
    const transformNames = scene.transformNodes.map((node) => node.name);
    const demoTreeVisualMeshes = scene.meshes.filter((mesh) => (
      mesh.name.startsWith("demo-tree-")
      && (mesh.name.includes("TreeLOWPOLY_Leaves_0") || mesh.name.includes("TreeLOWPOLY_Tree_0"))
    ));
    const demoTreeSourceMeshes = scene.meshes.filter((mesh) => (
      mesh.name.startsWith("demo-tree-source-")
    ));
    const demoTreeLeafMaterials = scene.materials.filter((material) => (
      material.name.startsWith("Leaves")
    ));
    const demoTreeLeafAlphaTestMaterials = demoTreeLeafMaterials.filter((material) => (
      material.transparencyMode === 1 || Boolean(material.needAlphaTesting?.())
    ));
    const demoTreeLeafAlphaBlendMaterials = demoTreeLeafMaterials.filter((material) => (
      material.transparencyMode === 2
    ));
```

In the returned object, add:

```ts
      demoTreeInstances: transformNames.filter((name) => name.startsWith("demo-tree-instance-")).length,
      demoTreeVisualMeshes: demoTreeVisualMeshes.length,
      demoTreeSourceMeshes: demoTreeSourceMeshes.length,
      demoTreeLeafAlphaTestMaterials: demoTreeLeafAlphaTestMaterials.length,
      demoTreeLeafAlphaBlendMaterials: demoTreeLeafAlphaBlendMaterials.length,
```

- [ ] **Step 4: Replace old procedural tree expectations**

In `test("renders village houses as tall blocking obstacles", ...)`, replace the tree-specific expectations with:

```ts
  expect(village.treeTrunkBases).toBe(0);
  expect(village.treeRoots).toBe(0);
  expect(village.treeBranches).toBe(0);
  expect(village.treeCanopies).toBe(0);
  expect(village.treeLeafCards).toBe(0);
  expect(village.treeLeafVolumes).toBe(0);
  expect(village.treeLeafVolumeVertices).toBe(0);
  expect(village.treeLeafShells).toBe(0);
  expect(village.treeStyleVariants).toBe(0);
  expect(village.demoTreeInstances).toBeGreaterThanOrEqual(6);
  expect(village.demoTreeVisualMeshes).toBeGreaterThanOrEqual(12);
  expect(village.demoTreeSourceMeshes).toBeGreaterThanOrEqual(2);
  expect(village.demoTreeLeafAlphaTestMaterials).toBeGreaterThanOrEqual(1);
  expect(village.demoTreeLeafAlphaBlendMaterials).toBe(0);
```

Leave the existing grass, bush, house, road, map bounds, and obstacle assertions unchanged.

- [ ] **Step 5: Run the scene test to verify it fails**

Run:

```bash
npm run test:smoke -- --grep "village houses"
```

Expected: FAIL because the scene still uses procedural tree meshes and does not yet create `demo-tree-instance-*` transforms.

- [ ] **Step 6: Commit the red test**

Run:

```bash
git add tests/smoke.spec.ts
git commit -m "test: expect demo glb tree instances"
```

---

### Task 3: Add Shared Tree Placements and Fallback Hook

**Files:**
- Create: `src/game/world/treePlacements.ts`
- Modify: `src/game/world/createDioramaMap.ts`

**Interfaces:**
- Produces: `TreePlacement` type and `VILLAGE_TREE_PLACEMENTS` constant.
- Produces: exported `terrainVisualHeightAt(x: number, z: number): number`.
- Produces: exported `addFallbackTrees(scene: Scene, materials: CartoonMaterials): void`.

- [ ] **Step 1: Create shared placement data**

Create `src/game/world/treePlacements.ts`:

```ts
export type TreePlacementVariant = "broad" | "tall" | "bent";

export type TreePlacement = {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly yaw: number;
  readonly variant: TreePlacementVariant;
  readonly leafTint: readonly [number, number, number];
};

export const VILLAGE_TREE_PLACEMENTS: readonly TreePlacement[] = [
  { id: "north-west", x: -4.8, z: 2.7, scale: 1.05, yaw: 0.35, variant: "broad", leafTint: [0.98, 1.04, 0.96] },
  { id: "south-east", x: 6.55, z: -2.1, scale: 0.95, yaw: -0.6, variant: "bent", leafTint: [1.05, 0.98, 0.94] },
  { id: "village-grove-a", x: 2.4, z: -3.95, scale: 0.82, yaw: 1.25, variant: "tall", leafTint: [0.94, 1.02, 1.0] },
  { id: "village-grove-b", x: 7.4, z: 4.9, scale: 1.1, yaw: -1.05, variant: "broad", leafTint: [1.02, 1.0, 0.92] },
  { id: "west-meadow", x: -8.35, z: 0.85, scale: 0.88, yaw: 2.1, variant: "tall", leafTint: [0.96, 1.06, 0.95] },
  { id: "south-meadow", x: -1.7, z: -6.4, scale: 1.18, yaw: 0.75, variant: "bent", leafTint: [1.04, 1.0, 0.9] },
];
```

- [ ] **Step 2: Import placements in `createDioramaMap.ts`**

Add this import:

```ts
import { VILLAGE_TREE_PLACEMENTS } from "./treePlacements";
```

- [ ] **Step 3: Export terrain height**

Change:

```ts
function terrainVisualHeightAt(x: number, z: number): number {
```

to:

```ts
export function terrainVisualHeightAt(x: number, z: number): number {
```

- [ ] **Step 4: Export fallback tree placement**

After `function addTree(...)`, add:

```ts
export function addFallbackTrees(scene: Scene, materials: CartoonMaterials): void {
  for (const placement of VILLAGE_TREE_PLACEMENTS) {
    addTree(
      `tree-${placement.id}`,
      terrainPosition(placement.x, placement.z),
      scene,
      materials,
      {
        scale: placement.scale,
        yaw: placement.yaw,
        variant: placement.variant,
      },
    );
  }
}
```

- [ ] **Step 5: Remove default procedural tree calls**

In `createDioramaMap()`, delete these six direct calls:

```ts
  addTree("tree-north-west", terrainPosition(-4.8, 2.7), scene, materials, { scale: 1.05, yaw: 0.35, variant: "broad" });
  addTree("tree-south-east", terrainPosition(6.55, -2.1), scene, materials, { scale: 0.95, yaw: -0.6, variant: "bent" });
  addTree("tree-village-grove-a", terrainPosition(2.4, -3.95), scene, materials, { scale: 0.82, yaw: 1.25, variant: "tall" });
  addTree("tree-village-grove-b", terrainPosition(7.4, 4.9), scene, materials, { scale: 1.1, yaw: -1.05, variant: "broad" });
  addTree("tree-west-meadow", terrainPosition(-8.35, 0.85), scene, materials, { scale: 0.88, yaw: 2.1, variant: "tall" });
  addTree("tree-south-meadow", terrainPosition(-1.7, -6.4), scene, materials, { scale: 1.18, yaw: 0.75, variant: "bent" });
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/game/world/treePlacements.ts src/game/world/createDioramaMap.ts
git commit -m "refactor: share village tree placements"
```

---

### Task 4: Implement Demo GLB Tree Loader and Wire Scene Init

**Files:**
- Create: `src/game/world/addDemoGlbTrees.ts`
- Modify: `src/game/GameScene.ts`

**Interfaces:**
- Consumes: `TreePlacement` and `VILLAGE_TREE_PLACEMENTS` from `src/game/world/treePlacements.ts`.
- Consumes: `terrainVisualHeightAt()` and `addFallbackTrees()` from `src/game/world/createDioramaMap.ts`.
- Produces: `addDemoGlbTrees(scene: Scene, placements: readonly DemoTreePlacement[]): Promise<void>`.

- [ ] **Step 1: Create `addDemoGlbTrees.ts`**

Create `src/game/world/addDemoGlbTrees.ts`:

```ts
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { TreePlacement } from "./treePlacements";

export const DEMO_TREE_MODEL_URL = "/assets/models/ancient_ruins05k-png.glb";

const TREE_SOURCE_MESH_NAMES = new Set([
  "TreeLOWPOLY_Leaves_0",
  "TreeLOWPOLY_Tree_0",
]);
const TREE_TARGET_HEIGHT = 2.35;

export type DemoTreePlacement = TreePlacement & {
  readonly y: number;
};

function isTreeSourceMesh(mesh: AbstractMesh): boolean {
  return TREE_SOURCE_MESH_NAMES.has(mesh.name);
}

function configureTreeMaterials(meshes: readonly AbstractMesh[]): void {
  const materials = new Set(meshes.map((mesh) => mesh.material).filter((material): material is Material => Boolean(material)));
  for (const material of materials) {
    material.backFaceCulling = false;
    for (const texture of material.getActiveTextures()) {
      texture.updateSamplingMode(Texture.NEAREST_NEAREST);
    }
    if (material.name.startsWith("Leaves")) {
      material.transparencyMode = Material.MATERIAL_ALPHATEST;
      material.alphaMode = 0;
      material.needAlphaBlending = () => false;
      material.needAlphaTesting = () => true;
      if ("alphaCutOff" in material) {
        (material as Material & { alphaCutOff: number }).alphaCutOff = 0.72;
      }
    }
  }
}

function computeBounds(meshes: readonly AbstractMesh[]): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(box.minimumWorld);
    max.maximizeInPlace(box.maximumWorld);
  }
  return { min, max };
}

function normalizeSourceTree(sourceMeshes: readonly AbstractMesh[]): number {
  for (const mesh of sourceMeshes) {
    mesh.parent = null;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.rotationQuaternion = null;
    mesh.scaling.set(1, 1, 1);
    mesh.computeWorldMatrix(true);
  }

  const before = computeBounds(sourceMeshes);
  const centerX = (before.min.x + before.max.x) * 0.5;
  const centerZ = (before.min.z + before.max.z) * 0.5;
  for (const mesh of sourceMeshes) {
    mesh.position.x -= centerX;
    mesh.position.y -= before.min.y;
    mesh.position.z -= centerZ;
    mesh.computeWorldMatrix(true);
  }

  const after = computeBounds(sourceMeshes);
  const height = Math.max(0.001, after.max.y - after.min.y);
  return TREE_TARGET_HEIGHT / height;
}

function cloneTintedMaterial(material: Material, name: string, tint: readonly [number, number, number]): Material {
  const clone = material.clone(name);
  if (!clone) return material;
  const colorTint = new Color3(tint[0], tint[1], tint[2]);
  const tintable = clone as Material & {
    diffuseColor?: Color3;
    albedoColor?: Color3;
  };
  if (tintable.diffuseColor) tintable.diffuseColor = tintable.diffuseColor.multiply(colorTint);
  if (tintable.albedoColor) tintable.albedoColor = tintable.albedoColor.multiply(colorTint);
  return clone;
}

function instantiateTree(
  sourceMeshes: readonly AbstractMesh[],
  placement: DemoTreePlacement,
  sourceScale: number,
): TransformNode {
  const root = new TransformNode(`demo-tree-instance-${placement.id}`, sourceMeshes[0].getScene());
  root.position = new Vector3(placement.x, placement.y, placement.z);
  root.rotation.y = placement.yaw;
  const verticalVariation = placement.variant === "tall" ? 1.08 : placement.variant === "bent" ? 0.96 : 1;
  root.scaling = new Vector3(placement.scale * sourceScale, placement.scale * sourceScale * verticalVariation, placement.scale * sourceScale);

  for (const sourceMesh of sourceMeshes) {
    const clone = sourceMesh.clone(`demo-tree-${placement.id}-${sourceMesh.name}`, root, true);
    if (!clone) continue;
    clone.setEnabled(true);
    clone.isVisible = true;
    clone.receiveShadows = true;
    if (clone.material && clone.name.includes("Leaves")) {
      clone.material = cloneTintedMaterial(clone.material, `${clone.material.name}-${placement.id}`, placement.leafTint);
    }
  }

  return root;
}

export async function addDemoGlbTrees(scene: Scene, placements: readonly DemoTreePlacement[]): Promise<void> {
  const container = await LoadAssetContainerAsync(DEMO_TREE_MODEL_URL, scene);
  container.addAllToScene();

  const sourceMeshes = container.meshes.filter(isTreeSourceMesh);
  if (sourceMeshes.length < TREE_SOURCE_MESH_NAMES.size) {
    throw new Error(`Demo tree source meshes missing from ${DEMO_TREE_MODEL_URL}`);
  }

  for (const mesh of container.meshes) {
    if (!sourceMeshes.includes(mesh)) {
      mesh.dispose(false, true);
    }
  }
  for (const node of container.transformNodes) {
    if (node.name !== "TreeLOWPOLY") {
      node.dispose(false, false);
    }
  }

  configureTreeMaterials(sourceMeshes);
  const sourceScale = normalizeSourceTree(sourceMeshes);
  for (const sourceMesh of sourceMeshes) {
    sourceMesh.name = `demo-tree-source-${sourceMesh.name}`;
    sourceMesh.setEnabled(false);
  }

  for (const placement of placements) {
    instantiateTree(sourceMeshes, placement, sourceScale);
  }
}
```

- [ ] **Step 2: Wire the loader into `GameScene.ts`**

Add imports:

```ts
import { addDemoGlbTrees, type DemoTreePlacement } from "./world/addDemoGlbTrees";
import { VILLAGE_TREE_PLACEMENTS } from "./world/treePlacements";
```

Change the existing `createDioramaMap` import to include fallback and terrain height:

```ts
import { addFallbackTrees, createDioramaMap, terrainVisualHeightAt } from "./world/createDioramaMap";
```

After `this.map = createDioramaMap(this.scene, this.materials);`, add:

```ts
    const treePlacements: DemoTreePlacement[] = VILLAGE_TREE_PLACEMENTS.map((placement) => ({
      ...placement,
      y: terrainVisualHeightAt(placement.x, placement.z),
    }));
    try {
      await addDemoGlbTrees(this.scene, treePlacements);
    } catch (error) {
      console.error("Failed to load demo GLB trees; using procedural fallback trees.", error);
      addFallbackTrees(this.scene, this.materials);
    }
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS. If TypeScript rejects assigning `needAlphaBlending` or `needAlphaTesting`, replace those two assignments in `configureTreeMaterials()` with only `material.transparencyMode = Material.MATERIAL_ALPHATEST`, `material.alphaMode = 0`, and `alphaCutOff`; then rerun typecheck.

- [ ] **Step 4: Run the scene smoke test**

Run:

```bash
npm run test:smoke -- --grep "village houses"
```

Expected: PASS. The test confirms procedural tree counts are zero and demo GLB tree instances exist.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/game/world/addDemoGlbTrees.ts src/game/GameScene.ts
git commit -m "feat: load demo glb tree instances"
```

---

### Task 5: Full Verification and Local Service Restart

**Files:**
- No source edits expected.

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified build, smoke test result, screenshots, and a fresh service on `http://localhost:4173/`.

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected: exit code `0`. Existing Vite warnings about third-party `"use client"` directives or large chunks do not fail the build.

- [ ] **Step 2: Run all tests**

Run:

```bash
npm test
```

Expected: `9 passed` plus the added model asset test count. If the final count is `10 passed`, that is the expected result after Task 1 adds the model test.

- [ ] **Step 3: Restart local service on port 4173**

Run:

```bash
lsof -ti tcp:4173 | xargs -r kill
npm run dev -- --port 4173
```

Expected: Vite reports `Local: http://localhost:4173/`.

- [ ] **Step 4: Verify desktop and mobile rendering**

Run a Playwright check against the running service:

```bash
python - <<'PY'
from pathlib import Path
from playwright.sync_api import sync_playwright

for name, viewport, is_mobile in [
    ("desktop", {"width": 1280, "height": 800}, False),
    ("mobile", {"width": 390, "height": 844}, True),
]:
    errors = []
    console_errors = []
    screenshot_path = Path(f"/tmp/kodu-demo-glb-trees-{name}.png")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=viewport, is_mobile=is_mobile)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.goto("http://localhost:4173/")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("#game-canvas", state="visible")
        page.wait_for_timeout(2500)
        page.screenshot(path=str(screenshot_path), full_page=True)
        hud_state = page.locator('[data-hud="state"]').inner_text()
        browser.close()
    print(name, screenshot_path, hud_state, errors, console_errors)
PY
```

Expected: both rows print `Ready`, empty page error arrays, and empty console error arrays.

- [ ] **Step 5: Inspect git state**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: clean status and recent commits for the asset, tests, loader, and plan.

---

## Self-Review

- Spec coverage: the plan vendors the GLB locally, records attribution, filters to tree source nodes, applies alpha-test material handling, avoids tree collisions, preserves existing gameplay systems, and verifies desktop/mobile rendering.
- Placeholder scan: the plan contains exact paths, commands, test snippets, runtime function names, and expected results.
- Type consistency: `TreePlacement`, `DemoTreePlacement`, `VILLAGE_TREE_PLACEMENTS`, `terrainVisualHeightAt`, `addFallbackTrees`, and `addDemoGlbTrees` are defined before downstream tasks consume them.
