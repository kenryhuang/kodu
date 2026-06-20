# Village Houses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small village feel to the Kodu diorama map with three primitive-built houses, a dirt path, and fence details.

**Architecture:** Keep the current map factory architecture. `createMaterials.ts` owns reusable cartoon materials, `createDioramaMap.ts` owns primitive mesh placement, and house body boxes are registered as normal `Obstacle` entries so the existing collision and jump-height rules apply without new gameplay systems.

**Tech Stack:** TypeScript, Babylon.js primitives, Vite, Playwright.

## Global Constraints

- Add three houses to the existing map.
- Build each house from Babylon primitives: a box body and a prism-like roof.
- Add lightweight village details such as a dirt path, short fence segments, and small props.
- Keep the current custom movement, collision, jump, projectile, NPC, and camera systems.
- Keep `Space` jump and mouse-click fire unchanged.
- Do not add external art assets, model loaders, textures, or a new placement system.
- Each house body is a collision obstacle.
- House body top height must be greater than the player's `1.8m` maximum jump reach from the floor.
- Roofs are visual-only mesh companions and do not need separate collision.
- Existing rocks must remain reachable jump targets.

---

## File Structure

- `src/game/world/createMaterials.ts`: add reusable village materials.
- `src/game/world/createDioramaMap.ts`: add house, roof, path, and fence helper functions; place three houses and village details.
- `tests/smoke.spec.ts`: add smoke coverage for rendered village meshes and house obstacle height.

## Task 1: Add Primitive Village Houses

**Files:**
- Modify: `tests/smoke.spec.ts`
- Modify: `src/game/world/createMaterials.ts`
- Modify: `src/game/world/createDioramaMap.ts`

**Interfaces:**
- Consumes:
  - Existing `__KODU_APP__.gameScene.scene.meshes` debug access in Playwright.
  - Existing `__KODU_APP__.gameScene.map.obstacles` debug access in Playwright.
  - Existing `Obstacle` shape: `{ name, center, halfExtents, mesh }`.
- Produces:
  - Three mesh names ending in `-body`: `house-north-body`, `house-south-west-body`, `house-east-body`.
  - Three mesh names ending in `-roof`: `house-north-roof`, `house-south-west-roof`, `house-east-roof`.
  - Three house body obstacles whose top heights are all greater than `1.8`.
  - At least four `village-path-*` meshes and at least four `fence-*` meshes.

- [ ] **Step 1: Add failing Playwright coverage**

In `tests/smoke.spec.ts`, add this type after `PlayerSnapshot`:

```ts
type VillageSnapshot = {
  houseBodies: number;
  houseRoofs: number;
  pathTiles: number;
  fenceSegments: number;
  houseObstacles: Array<{
    name: string;
    topHeight: number;
  }>;
};
```

Add this helper after `readProjectileCount()`:

```ts
async function readVillageSnapshot(page: Page): Promise<VillageSnapshot> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: { meshes: Array<{ name: string }> };
          map?: {
            obstacles: Array<{
              name: string;
              center: { y: number };
              halfExtents: { y: number };
            }>;
          };
        };
      };
    }).__KODU_APP__;
    const scene = app?.gameScene?.scene;
    const map = app?.gameScene?.map;
    if (!scene || !map) throw new Error("Missing game scene or map");
    const names = scene.meshes.map((mesh) => mesh.name);
    const houseObstacles = map.obstacles
      .filter((obstacle) => obstacle.name.startsWith("house-") && obstacle.name.endsWith("-body"))
      .map((obstacle) => ({
        name: obstacle.name,
        topHeight: obstacle.center.y + obstacle.halfExtents.y,
      }));
    return {
      houseBodies: names.filter((name) => name.startsWith("house-") && name.endsWith("-body")).length,
      houseRoofs: names.filter((name) => name.startsWith("house-") && name.endsWith("-roof")).length,
      pathTiles: names.filter((name) => name.startsWith("village-path-")).length,
      fenceSegments: names.filter((name) => name.startsWith("fence-")).length,
      houseObstacles,
    };
  });
}
```

Add this test after `space jumps without firing a projectile`:

```ts
test("renders village houses as tall blocking obstacles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const village = await readVillageSnapshot(page);
  expect(village.houseBodies).toBe(3);
  expect(village.houseRoofs).toBe(3);
  expect(village.pathTiles).toBeGreaterThanOrEqual(4);
  expect(village.fenceSegments).toBeGreaterThanOrEqual(4);
  expect(village.houseObstacles).toHaveLength(3);
  for (const obstacle of village.houseObstacles) {
    expect(obstacle.topHeight).toBeGreaterThan(1.8);
  }
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npm run test:smoke -- --grep "renders village houses as tall blocking obstacles"
```

Expected: FAIL because no `house-*`, `village-path-*`, or `fence-*` meshes exist yet.

- [ ] **Step 3: Add village materials**

Modify `src/game/world/createMaterials.ts` by adding these entries to the returned object after `stone`:

```ts
    houseWall: make("mat-house-wall", new Color3(0.86, 0.72, 0.54)),
    houseRoof: make("mat-house-roof", new Color3(0.68, 0.23, 0.16)),
    fenceWood: make("mat-fence-wood", new Color3(0.57, 0.38, 0.21)),
    pathDirt: make("mat-path-dirt", new Color3(0.55, 0.4, 0.25)),
```

- [ ] **Step 4: Add primitive village helpers**

Modify `src/game/world/createDioramaMap.ts`.

Add this helper after `makeObstacle(...)`:

```ts
function addHouse(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  roofYaw: number,
  obstacles: Obstacle[],
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const body = makeObstacle(`${name}-body`, center, halfExtents, scene, materials);
  body.mesh.material = materials.houseWall;
  obstacles.push(body);

  const roof = MeshBuilder.CreateCylinder(`${name}-roof`, {
    height: halfExtents.z * 2 + 0.28,
    diameter: halfExtents.x * 2.7,
    tessellation: 3,
  }, scene);
  roof.position = center.add(new Vector3(0, halfExtents.y + 0.33, 0));
  roof.rotation.x = Math.PI / 2;
  roof.rotation.y = roofYaw;
  roof.scaling.y = 0.55;
  roof.material = materials.houseRoof;
}
```

Add these helpers after `addTree(...)`:

```ts
function addPathTile(name: string, position: Vector3, width: number, depth: number, rotationY: number, scene: Scene, materials: CartoonMaterials): void {
  const path = MeshBuilder.CreateBox(name, { width, height: 0.04, depth }, scene);
  path.position = position;
  path.rotation.y = rotationY;
  path.material = materials.pathDirt;
}

function addFenceSegment(name: string, position: Vector3, length: number, rotationY: number, scene: Scene, materials: CartoonMaterials): void {
  const rail = MeshBuilder.CreateBox(name, { width: length, height: 0.16, depth: 0.08 }, scene);
  rail.position = position;
  rail.rotation.y = rotationY;
  rail.material = materials.fenceWood;
}
```

- [ ] **Step 5: Place houses, path tiles, and fences**

In `createDioramaMap(...)`, replace the current `const obstacles = [...]` block with:

```ts
  const obstacles = [
    makeObstacle("rock-west", new Vector3(-3.1, 0.28, -1.4), new Vector3(0.7, 0.35, 0.55), scene, materials),
    makeObstacle("rock-east", new Vector3(3.2, 0.28, 1.2), new Vector3(0.65, 0.35, 0.55), scene, materials),
  ];

  addHouse("house-north", new Vector3(-1.25, 0.95, 3.3), new Vector3(0.88, 0.95, 0.62), 0, obstacles, scene, materials);
  addHouse("house-south-west", new Vector3(-5.05, 0.95, -3.05), new Vector3(0.74, 0.95, 0.56), Math.PI / 2, obstacles, scene, materials);
  addHouse("house-east", new Vector3(5.0, 0.95, 2.15), new Vector3(0.8, 0.95, 0.58), -Math.PI / 2, obstacles, scene, materials);
```

After the existing `addTree(...)` calls, add:

```ts
  addPathTile("village-path-center", new Vector3(0, 0.02, 0.4), 1.0, 3.4, 0.1, scene, materials);
  addPathTile("village-path-north", new Vector3(-0.75, 0.021, 2.2), 0.85, 2.0, -0.35, scene, materials);
  addPathTile("village-path-east", new Vector3(3.25, 0.022, 1.55), 0.8, 2.8, Math.PI / 2 - 0.2, scene, materials);
  addPathTile("village-path-south-west", new Vector3(-3.6, 0.023, -2.1), 0.78, 2.4, Math.PI / 2 + 0.25, scene, materials);

  addFenceSegment("fence-north-a", new Vector3(-2.35, 0.18, 2.42), 0.9, 0, scene, materials);
  addFenceSegment("fence-north-b", new Vector3(-0.2, 0.18, 2.45), 0.75, 0, scene, materials);
  addFenceSegment("fence-east-a", new Vector3(4.05, 0.18, 1.15), 0.8, Math.PI / 2, scene, materials);
  addFenceSegment("fence-east-b", new Vector3(4.0, 0.18, 3.05), 0.85, Math.PI / 2, scene, materials);
  addFenceSegment("fence-south-west-a", new Vector3(-5.95, 0.18, -2.25), 0.75, Math.PI / 2, scene, materials);
  addFenceSegment("fence-south-west-b", new Vector3(-4.05, 0.18, -3.85), 0.75, 0, scene, materials);
```

- [ ] **Step 6: Run the focused test to verify GREEN**

Run:

```bash
npm run test:smoke -- --grep "renders village houses as tall blocking obstacles"
```

Expected: PASS. The test sees 3 house bodies, 3 roofs, at least 4 path tiles, at least 4 fence segments, and all house body obstacle top heights greater than `1.8`.

- [ ] **Step 7: Run full smoke tests**

Run:

```bash
npm run test:smoke
```

Expected: PASS. Existing render/fire, jump, rock landing, high-obstacle rejection, and resize smoke tests still pass.

- [ ] **Step 8: Run build and full verification**

Run:

```bash
npm run build
npm test
```

Expected: both commands exit `0`. Vite may emit existing Babylon/Fluent UI `"use client"` and large chunk warnings; those warnings must not fail the commands.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/game/world/createMaterials.ts src/game/world/createDioramaMap.ts tests/smoke.spec.ts
git commit -m "feat: add village houses to map"
```

## Self-Review Checklist

- Spec coverage:
  - Three primitive-built houses: Task 1 Steps 4 and 5.
  - Box body plus prism-like roof: Task 1 Step 4.
  - Dirt path and fence details: Task 1 Step 5.
  - House bodies are obstacles: Task 1 Step 4 pushes body obstacles into `obstacles`.
  - House tops exceed `1.8m`: Task 1 Step 5 uses center `0.95` plus half height `0.95`, and Task 1 Step 1 tests `topHeight > 1.8`.
  - No external assets or new systems: Task 1 only changes materials, map primitives, and tests.
  - Existing gameplay remains unchanged: Task 1 full smoke verification.
- Placeholder scan:
  - No TBD, TODO, "implement later", or vague "add tests" steps.
  - Every code change step includes exact snippets.
- Type consistency:
  - `CartoonMaterials` is inferred from `createMaterials`, so new material keys are available to `createDioramaMap.ts`.
  - `addHouse(...)` receives and mutates the same `Obstacle[]` returned by `createDioramaMap(...)`.
  - Test debug access matches existing smoke helper patterns for `scene` and `map`.
