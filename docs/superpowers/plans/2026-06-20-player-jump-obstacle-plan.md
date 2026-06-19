# Player Jump To Obstacles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Space` jump controls that let the player jump onto existing rock obstacles while mouse click remains the only fire input.

**Architecture:** Keep the current lightweight system architecture. `InputManager` owns one-shot jump/fire inputs, `PlayerController` owns vertical jump state, and `CollisionSystem` owns obstacle side blocking plus obstacle-top support resolution.

**Tech Stack:** TypeScript, Babylon.js, Vite, Playwright.

## Global Constraints

- `Space`: jump.
- Mouse click: fire projectile.
- WASD and arrow keys: horizontal movement.
- Holding `Space` should not repeatedly jump while airborne.
- A new jump can start only when the player is grounded on the floor or on an obstacle top.
- No full platforming system.
- No ledge grabbing, wall jumping, slopes, moving platforms, or double jump.
- No new art assets.
- No physics dependency.
- Jump constants should be simple local values, not a new tuning system.

---

## File Structure

- `src/game/input/InputManager.ts`: split one-shot jump input from pointer fire input.
- `src/game/player/PlayerController.ts`: add vertical velocity, grounded/surface state, jump update, and landing helpers.
- `src/game/combat/CollisionSystem.ts`: add obstacle-top support resolution and gate side blocking by player support state.
- `src/game/GameScene.ts`: call horizontal and vertical player collision in the correct order.
- `tests/smoke.spec.ts`: add Playwright coverage for jump controls, mouse fire, and obstacle-top landing.

## Task 1: Split Fire Input And Add Basic Jump Arc

**Files:**
- Modify: `tests/smoke.spec.ts`
- Modify: `src/game/input/InputManager.ts`
- Modify: `src/game/player/PlayerController.ts`

**Interfaces:**
- Consumes: existing `InputManager.moveX`, `InputManager.moveZ`, `InputManager.getPointerAimDirection(origin)`, `PlayerController.position`, and HUD projectile count.
- Produces:
  - `InputManager.consumeJump(): boolean`
  - `InputManager.consumeFire(): boolean` returns mouse-click fire only.
  - `PlayerController.isGrounded: boolean`
  - `PlayerController.isGroundedOnFloor: boolean`
  - `PlayerController.isDescending: boolean`
  - `PlayerController.footHeight: number`
  - `PlayerController.previousFootHeight: number`
  - `PlayerController.surfaceHeight: number`
  - `PlayerController.landOnSurface(surfaceHeight: number): void`
  - `PlayerController.startFalling(): void`

- [ ] **Step 1: Add failing Playwright coverage for Space jump and mouse-only fire**

In `tests/smoke.spec.ts`, add these helper types and functions after the existing `CameraSnapshot` type:

```ts
type PlayerSnapshot = {
  x: number;
  y: number;
  z: number;
  footHeight: number;
  grounded: boolean;
  surfaceHeight: number;
};

async function readPlayerSnapshot(page: Page): Promise<PlayerSnapshot> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            position: { x: number; y: number; z: number };
            footHeight: number;
            isGrounded: boolean;
            surfaceHeight: number;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    if (!player) throw new Error("Missing player controller");
    return {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      surfaceHeight: player.surfaceHeight,
    };
  });
}

async function readProjectileCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          projectiles?: { projectiles: unknown[] };
        };
      };
    }).__KODU_APP__;
    const projectiles = app?.gameScene?.projectiles;
    if (!projectiles) throw new Error("Missing projectile system");
    return projectiles.projectiles.length;
  });
}
```

In the `renders the game and fires a projectile` test, after the existing projectile removal assertion, add:

```ts
  expect(await readProjectileCount(page)).toBe(0);
```

Add this new test after `renders the game and fires a projectile`:

```ts
test("space jumps without firing a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const before = await readPlayerSnapshot(page);
  expect(await readProjectileCount(page)).toBe(0);

  await page.keyboard.press("Space");
  await page.waitForTimeout(180);

  const after = await readPlayerSnapshot(page);
  expect(after.y).toBeGreaterThan(before.y + 0.12);
  expect(after.grounded).toBe(false);
  expect(await readProjectileCount(page)).toBe(0);

  await page.waitForTimeout(900);
  const landed = await readPlayerSnapshot(page);
  expect(landed.grounded).toBe(true);
  expect(landed.footHeight).toBeCloseTo(0, 1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npm run test:smoke -- --grep "space jumps without firing a projectile"
```

Expected: FAIL because the current player does not jump and `Space` currently creates a projectile through `InputManager.consumeFire()`.

- [ ] **Step 3: Split fire and jump input**

Modify `src/game/input/InputManager.ts`:

1. Add a `jumpPressed` field near `firePressed`:

```ts
  private firePressed = false;
  private jumpPressed = false;
```

2. Replace `consumeFire()` with mouse-only fire and add `consumeJump()`:

```ts
  consumeFire(): boolean {
    const shouldFire = this.firePressed;
    this.firePressed = false;
    return shouldFire;
  }

  consumeJump(): boolean {
    const shouldJump = this.jumpPressed;
    this.jumpPressed = false;
    return shouldJump;
  }
```

3. Replace `onKeyDown` with this one-shot jump handler:

```ts
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "Space" && !this.keys.has(event.code) && !event.repeat) {
      this.jumpPressed = true;
      event.preventDefault();
    }
    this.keys.add(event.code);
  };
```

Keep `onKeyUp`, pointer handling, and `onPointerDown()` unchanged.

- [ ] **Step 4: Add basic vertical jump state and helpers**

Modify `src/game/player/PlayerController.ts`.

Add these fields after `private fireCooldown = 0;`:

```ts
  private readonly baseCenterHeight = 0.62;
  private readonly jumpVelocity = 5.6;
  private readonly gravity = 13;
  private verticalVelocity = 0;
  private grounded = true;
  private currentSurfaceHeight = 0;
  private lastFootHeight = 0;
```

Replace the constructor body position line:

```ts
    this.mesh.position.set(0, this.baseCenterHeight, 0);
```

At the start of `update(deltaSeconds: number, input: InputManager)`, before calculating `move`, add:

```ts
    this.lastFootHeight = this.footHeight;
```

After the movement block and before pointer aim, add:

```ts
    if (input.consumeJump() && this.grounded) {
      this.verticalVelocity = this.jumpVelocity;
      this.grounded = false;
    }

    if (!this.grounded || this.verticalVelocity !== 0) {
      this.verticalVelocity -= this.gravity * deltaSeconds;
      this.mesh.position.y += this.verticalVelocity * deltaSeconds;

      const floorCenterY = this.baseCenterHeight;
      if (this.mesh.position.y <= floorCenterY && this.verticalVelocity <= 0) {
        this.landOnSurface(0);
      }
    }
```

Add these public getters and methods before `clampToBounds()`:

```ts
  get isGrounded(): boolean {
    return this.grounded;
  }

  get isGroundedOnFloor(): boolean {
    return this.grounded && this.currentSurfaceHeight <= 0.0001;
  }

  get isDescending(): boolean {
    return this.verticalVelocity <= 0;
  }

  get footHeight(): number {
    return this.mesh.position.y - this.baseCenterHeight;
  }

  get previousFootHeight(): number {
    return this.lastFootHeight;
  }

  get surfaceHeight(): number {
    return this.currentSurfaceHeight;
  }

  landOnSurface(surfaceHeight: number): void {
    this.currentSurfaceHeight = surfaceHeight;
    this.mesh.position.y = surfaceHeight + this.baseCenterHeight;
    this.verticalVelocity = 0;
    this.grounded = true;
  }

  startFalling(): void {
    if (!this.grounded) return;
    this.grounded = false;
    this.verticalVelocity = 0;
  }
```

- [ ] **Step 5: Run focused GREEN verification**

Run:

```bash
npm run test:smoke -- --grep "space jumps without firing a projectile"
```

Expected: PASS. The player Y position rises after pressing `Space`, no projectile is created, and the player lands back on the floor.

- [ ] **Step 6: Run existing smoke behavior**

Run:

```bash
npm run test:smoke -- --grep "renders the game and fires a projectile"
```

Expected: PASS. Mouse click still creates a projectile and the projectile count later returns to `0`.

- [ ] **Step 7: Run full verification and commit Task 1**

Run:

```bash
npm run build
npm test
```

Expected: `npm run build` exits `0`; `npm test` exits `0`. Vite may emit existing Babylon/FluentUI chunk and `"use client"` warnings, but they must not fail the command.

Commit:

```bash
git add src/game/input/InputManager.ts src/game/player/PlayerController.ts tests/smoke.spec.ts
git commit -m "feat: add player jump input"
```

## Task 2: Land On Obstacle Tops And Pass Over Obstacles While Airborne

**Files:**
- Modify: `tests/smoke.spec.ts`
- Modify: `src/game/combat/CollisionSystem.ts`
- Modify: `src/game/GameScene.ts`

**Interfaces:**
- Consumes from Task 1:
  - `PlayerController.isGroundedOnFloor: boolean`
  - `PlayerController.isGrounded: boolean`
  - `PlayerController.isDescending: boolean`
  - `PlayerController.footHeight: number`
  - `PlayerController.previousFootHeight: number`
  - `PlayerController.surfaceHeight: number`
  - `PlayerController.landOnSurface(surfaceHeight: number): void`
  - `PlayerController.startFalling(): void`
- Produces:
  - `CollisionSystem.resolvePlayerVerticalSupport(player: PlayerController, map: DioramaMap): void`
  - Existing `CollisionSystem.resolvePlayerObstacles(player, map)` only runs when the player is grounded on the floor.

- [ ] **Step 1: Add failing Playwright coverage for landing on a rock**

In `tests/smoke.spec.ts`, add this helper after `readProjectileCount()`:

```ts
async function placePlayer(page: Page, x: number, z: number): Promise<void> {
  await page.evaluate(({ x: nextX, z: nextZ }) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            position: { x: number; z: number };
            landOnSurface(surfaceHeight: number): void;
            clampToBounds(): void;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    if (!player) throw new Error("Missing player controller");
    player.position.x = nextX;
    player.position.z = nextZ;
    player.landOnSurface(0);
    player.clampToBounds();
  }, { x, z });
}
```

Add this new test after `space jumps without firing a projectile`:

```ts
test("player can jump onto a rock obstacle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const rockWestTop = 0.63;
  await placePlayer(page, -4.25, -1.4);
  const before = await readPlayerSnapshot(page);
  expect(before.footHeight).toBeCloseTo(0, 1);

  await page.keyboard.down("Space");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(360);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyD");
  await page.waitForTimeout(650);

  const after = await readPlayerSnapshot(page);
  expect(after.grounded).toBe(true);
  expect(after.surfaceHeight).toBeCloseTo(rockWestTop, 1);
  expect(after.footHeight).toBeCloseTo(rockWestTop, 1);
  expect(after.x).toBeGreaterThan(-3.8);
  expect(after.x).toBeLessThan(-2.4);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
npm run test:smoke -- --grep "player can jump onto a rock obstacle"
```

Expected: FAIL. With Task 1 only, the player either lands back on the floor or is blocked by existing side collision instead of settling on the obstacle top.

- [ ] **Step 3: Add obstacle top support helpers**

Modify `src/game/combat/CollisionSystem.ts`.

Add these helpers after `resolveCircleAgainstObstacle()`:

```ts
function overlapsObstacleTop(position: Vector3, radius: number, obstacle: Obstacle): boolean {
  const bounds = getObstacleBounds(obstacle);
  return (
    position.x + radius > bounds.minX &&
    position.x - radius < bounds.maxX &&
    position.z + radius > bounds.minZ &&
    position.z - radius < bounds.maxZ
  );
}

function getHighestObstacleSupport(player: PlayerController, map: DioramaMap): number | undefined {
  let supportHeight: number | undefined;
  for (const obstacle of map.obstacles) {
    if (!overlapsObstacleTop(player.position, player.radius, obstacle)) continue;
    const obstacleTop = obstacle.center.y + obstacle.halfExtents.y;
    if (player.previousFootHeight < obstacleTop || player.footHeight > obstacleTop) continue;
    supportHeight = supportHeight === undefined ? obstacleTop : Math.max(supportHeight, obstacleTop);
  }
  return supportHeight;
}

function hasSupportAtHeight(player: PlayerController, map: DioramaMap, surfaceHeight: number): boolean {
  if (surfaceHeight <= collisionEpsilon) return true;
  return map.obstacles.some((obstacle) => {
    const obstacleTop = obstacle.center.y + obstacle.halfExtents.y;
    return Math.abs(obstacleTop - surfaceHeight) <= collisionEpsilon && overlapsObstacleTop(player.position, player.radius, obstacle);
  });
}
```

- [ ] **Step 4: Add vertical support resolution**

In `src/game/combat/CollisionSystem.ts`, add this method inside `CollisionSystem`, before `resolveProjectileHits()`:

```ts
  resolvePlayerVerticalSupport(player: PlayerController, map: DioramaMap): void {
    if (player.isDescending) {
      const obstacleSupport = getHighestObstacleSupport(player, map);
      if (obstacleSupport !== undefined) {
        player.landOnSurface(obstacleSupport);
        return;
      }
    }

    if (player.isGrounded && !hasSupportAtHeight(player, map, player.surfaceHeight)) {
      player.startFalling();
    }
  }
```

Keep the existing projectile hit method unchanged.

- [ ] **Step 5: Gate horizontal side collision by floor support and call vertical support**

Modify `src/game/GameScene.ts` inside `update(deltaSeconds: number)`.

Replace:

```ts
    this.collisions.resolvePlayerObstacles(this.player, this.map);
    this.player.clampToBounds();
```

with:

```ts
    if (this.player.isGroundedOnFloor) {
      this.collisions.resolvePlayerObstacles(this.player, this.map);
    }
    this.collisions.resolvePlayerVerticalSupport(this.player, this.map);
    this.player.clampToBounds();
```

This preserves side blocking on the floor, lets airborne players pass over rocks, lets players stand on obstacle tops, and starts falling if they walk off an obstacle top.

- [ ] **Step 6: Run focused GREEN verification**

Run:

```bash
npm run test:smoke -- --grep "player can jump onto a rock obstacle"
```

Expected: PASS. The player lands grounded with `surfaceHeight` and `footHeight` close to `0.63`.

- [ ] **Step 7: Run all smoke tests**

Run:

```bash
npm run test:smoke
```

Expected: PASS. All smoke tests pass, including existing render/fire/resize coverage.

- [ ] **Step 8: Run full verification and commit Task 2**

Run:

```bash
npm run build
npm test
```

Expected: `npm run build` exits `0`; `npm test` exits `0`. Vite may emit existing Babylon/FluentUI chunk and `"use client"` warnings, but they must not fail the command.

Commit:

```bash
git add src/game/combat/CollisionSystem.ts src/game/GameScene.ts tests/smoke.spec.ts
git commit -m "feat: let player jump onto obstacles"
```

## Self-Review Checklist

- Spec coverage:
  - `Space` triggers jump only: Task 1.
  - Mouse click remains fire: Task 1 tests existing mouse fire behavior.
  - Player jumps in an arc and lands on floor: Task 1.
  - Holding `Space` cannot repeatedly jump while airborne: Task 1 one-shot `jumpPressed` plus grounded gate.
  - Player can land on rock obstacle top: Task 2.
  - No physics dependency: Tasks 1 and 2 use existing custom movement/collision.
  - No new art assets: Tasks 1 and 2 only change code/tests.
- Placeholder scan:
  - No TBD, TODO, "implement later", or vague "add tests" steps.
  - Every code change step includes exact snippets.
- Type consistency:
  - `InputManager.consumeJump()` is introduced before `PlayerController.update()` uses it.
  - `PlayerController` support getters/methods are introduced before `CollisionSystem` uses them.
  - `CollisionSystem.resolvePlayerVerticalSupport()` is introduced before `GameScene` calls it.
