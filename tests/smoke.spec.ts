import { expect, test, type Locator, type Page } from "@playwright/test";

type CameraSnapshot = {
  renderWidth: number;
  renderHeight: number;
  orthoLeft: number;
  orthoRight: number;
  positionY: number;
  targetY: number;
};

type PlayerSnapshot = {
  x: number;
  y: number;
  z: number;
  footHeight: number;
  grounded: boolean;
  surfaceHeight: number;
};

type VillageSnapshot = {
  houseBodies: number;
  houseRoofs: number;
  houseDoors: number;
  houseWindows: number;
  houseWindowFrames: number;
  houseChimneys: number;
  houseRoofOverhangs: number;
  houseRoofTiles: number;
  pathTiles: number;
  fenceSegments: number;
  houseWallTextureMaterials: number;
  houseRoofTextureMaterials: number;
  houseObstacles: Array<{
    name: string;
    topHeight: number;
  }>;
};

async function sampleCanvasScreenshot(page: Page, canvas: Locator): Promise<{
  width: number;
  height: number;
  pixels: number[][];
}> {
  const screenshot = await canvas.screenshot();
  return page.evaluate(async (pngBase64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${pngBase64}`;
    await image.decode();

    const surface = document.createElement("canvas");
    surface.width = image.width;
    surface.height = image.height;

    const context = surface.getContext("2d");
    if (!context) throw new Error("Missing 2D context");

    context.drawImage(image, 0, 0);
    const points: Array<[number, number]> = [
      [Math.floor(surface.width * 0.5), Math.floor(surface.height * 0.55)],
      [Math.floor(surface.width * 0.38), Math.floor(surface.height * 0.72)],
      [Math.floor(surface.width * 0.62), Math.floor(surface.height * 0.72)],
      [Math.floor(surface.width * 0.5), Math.floor(surface.height * 0.35)],
    ];

    return {
      width: surface.width,
      height: surface.height,
      pixels: points.map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data)),
    };
  }, screenshot.toString("base64"));
}

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

async function readVillageSnapshot(page: Page): Promise<VillageSnapshot> {
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          map?: unknown;
          scene?: unknown;
        };
      };
    }).__KODU_APP__;
    return Boolean(app?.gameScene?.scene && app.gameScene.map);
  });
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: {
            materials: Array<{ name: string }>;
            meshes: Array<{ name: string }>;
          };
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
    const materialNames = scene.materials.map((material) => material.name);
    const houseObstacles = map.obstacles
      .filter((obstacle) => obstacle.name.startsWith("house-") && obstacle.name.endsWith("-body"))
      .map((obstacle) => ({
        name: obstacle.name,
        topHeight: obstacle.center.y + obstacle.halfExtents.y,
      }));
    return {
      houseBodies: names.filter((name) => name.startsWith("house-") && name.endsWith("-body")).length,
      houseRoofs: names.filter((name) => name.startsWith("house-") && name.endsWith("-roof")).length,
      houseDoors: names.filter((name) => name.startsWith("house-") && name.endsWith("-door")).length,
      houseWindows: names.filter((name) => name.startsWith("house-") && name.includes("-window-") && !name.includes("-window-frame-")).length,
      houseWindowFrames: names.filter((name) => name.startsWith("house-") && name.includes("-window-frame-")).length,
      houseChimneys: names.filter((name) => name.startsWith("house-") && name.endsWith("-chimney")).length,
      houseRoofOverhangs: names.filter((name) => name.startsWith("house-") && name.includes("-roof-overhang-")).length,
      houseRoofTiles: names.filter((name) => name.startsWith("house-") && name.includes("-roof-tile-")).length,
      pathTiles: names.filter((name) => name.startsWith("village-path-")).length,
      fenceSegments: names.filter((name) => name.startsWith("fence-")).length,
      houseWallTextureMaterials: materialNames.filter((name) => name.startsWith("mat-house-wall-")).length,
      houseRoofTextureMaterials: materialNames.filter((name) => name.startsWith("mat-house-roof-")).length,
      houseObstacles,
    };
  });
}

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

async function dropPlayerFromHeight(page: Page, x: number, centerY: number, z: number): Promise<void> {
  await page.evaluate(({ x: nextX, centerY: nextY, z: nextZ }) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            position: { x: number; y: number; z: number };
            landOnSurface(surfaceHeight: number): void;
            startFalling(): void;
            clampToBounds(): void;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    if (!player) throw new Error("Missing player controller");
    player.landOnSurface(0);
    player.position.x = nextX;
    player.position.y = nextY;
    player.position.z = nextZ;
    player.startFalling();
    player.clampToBounds();
  }, { x, centerY, z });
}

async function addTestObstacle(
  page: Page,
  obstacle: {
    name: string;
    center: { x: number; y: number; z: number };
    halfExtents: { x: number; y: number; z: number };
  },
): Promise<void> {
  await page.evaluate((nextObstacle) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          map?: {
            obstacles: Array<{
              name: string;
              center: { x: number; y: number; z: number };
              halfExtents: { x: number; y: number; z: number };
              mesh?: unknown;
            }>;
          };
        };
      };
    }).__KODU_APP__;
    const map = app?.gameScene?.map;
    if (!map) throw new Error("Missing diorama map");
    map.obstacles.push({ ...nextObstacle, mesh: undefined });
  }, obstacle);
}

async function readCameraSnapshot(page: Page): Promise<CameraSnapshot> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: {
            activeCamera?: {
              getTarget(): { y: number };
              orthoLeft: number;
              orthoRight: number;
              position: { y: number };
            };
            getEngine(): { getRenderWidth(): number; getRenderHeight(): number };
          };
        };
      };
    }).__KODU_APP__;
    const scene = app?.gameScene?.scene;
    const camera = scene?.activeCamera;
    if (!scene || !camera) throw new Error("Missing active camera");

    return {
      renderWidth: scene.getEngine().getRenderWidth(),
      renderHeight: scene.getEngine().getRenderHeight(),
      orthoLeft: Number(camera.orthoLeft),
      orthoRight: Number(camera.orthoRight),
      positionY: camera.position.y,
      targetY: camera.getTarget().y,
    };
  });
}

test("terrain image assets are served", async ({ page }) => {
  await page.goto("/");
  for (const asset of [
    "/assets/terrain/heightmap-valley.png",
    "/assets/terrain/grass.png",
    "/assets/terrain/sand.png",
    "/assets/terrain/road.png",
  ]) {
    const response = await page.request.get(asset);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(500);
  }
});

test("renders the game and fires a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  const canvas = page.locator("#game-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".hud-title")).toHaveText("Kodu");
  await expect(page.locator(".hud-help")).toHaveText("Move WASD / Arrows · Jump Space · Fire Click · Inspector I");
  await expect(page.locator('[data-hud="state"]')).toHaveText("Ready");

  const canvasSample = await sampleCanvasScreenshot(page, canvas);

  expect(canvasSample.width).toBeGreaterThan(0);
  expect(canvasSample.height).toBeGreaterThan(0);
  expect(canvasSample.pixels.some(([r, g, b, a]) => r !== 148 || g !== 209 || b !== 235 || a !== 255)).toBe(true);

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Missing canvas bounds");
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.18, canvasBox.y + canvasBox.height * 0.82);

  await expect(page.locator('[data-hud="projectiles"]')).not.toHaveText("0");
  await page.waitForTimeout(1800);
  await expect(page.locator('[data-hud="projectiles"]')).toHaveText("0");
  expect(await readProjectileCount(page)).toBe(0);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

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

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Space",
      key: " ",
    }));
  });
  let after: { grounded: boolean; y: number } | undefined;
  try {
    const jumpSample = await page.waitForFunction((startY) => {
      const app = (globalThis as typeof globalThis & {
        __KODU_APP__?: {
          gameScene?: {
            player?: {
              isGrounded: boolean;
              position: { y: number };
            };
          };
        };
      }).__KODU_APP__;
      const player = app?.gameScene?.player;
      if (!player || player.isGrounded || player.position.y <= startY + 0.08) return false;
      return {
        grounded: player.isGrounded,
        y: player.position.y,
      };
    }, before.y);
    after = await jumpSample.jsonValue() as { grounded: boolean; y: number };
  } finally {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        bubbles: true,
        code: "Space",
        key: " ",
      }));
    });
  }

  if (!after) throw new Error("Missing jump sample");
  expect(after.y).toBeGreaterThan(before.y + 0.08);
  expect(after.grounded).toBe(false);
  expect(await readProjectileCount(page)).toBe(0);

  await page.waitForTimeout(900);
  const landed = await readPlayerSnapshot(page);
  expect(landed.grounded).toBe(true);
  expect(landed.footHeight).toBeCloseTo(0, 1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("camera ignores player jump height", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: {
            activeCamera?: {
              getTarget(): { y: number };
              position: { y: number };
            };
          };
        };
      };
    }).__KODU_APP__;
    const camera = app?.gameScene?.scene?.activeCamera;
    return Boolean(camera && Math.abs(camera.position.y - (camera.getTarget().y + 8.4)) < 0.03);
  });

  const before = await readCameraSnapshot(page);
  const playerBefore = await readPlayerSnapshot(page);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Space",
      key: " ",
    }));
  });

  let during: CameraSnapshot & { playerY: number } | undefined;
  try {
    const jumpSample = await page.waitForFunction((startY) => {
      const app = (globalThis as typeof globalThis & {
        __KODU_APP__?: {
          gameScene?: {
            player?: {
              position: { y: number };
            };
            scene?: {
              activeCamera?: {
                getTarget(): { y: number };
                orthoLeft: number;
                orthoRight: number;
                position: { y: number };
              };
              getEngine(): { getRenderWidth(): number; getRenderHeight(): number };
            };
          };
        };
      }).__KODU_APP__;
      const gameScene = app?.gameScene;
      const player = gameScene?.player;
      const scene = gameScene?.scene;
      const camera = scene?.activeCamera;
      if (!player || !scene || !camera || player.position.y <= startY + 0.35) return false;
      return {
        renderWidth: scene.getEngine().getRenderWidth(),
        renderHeight: scene.getEngine().getRenderHeight(),
        orthoLeft: Number(camera.orthoLeft),
        orthoRight: Number(camera.orthoRight),
        positionY: camera.position.y,
        targetY: camera.getTarget().y,
        playerY: player.position.y,
      };
    }, playerBefore.y);
    during = await jumpSample.jsonValue() as CameraSnapshot & { playerY: number };
  } finally {
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        bubbles: true,
        code: "Space",
        key: " ",
      }));
    });
  }

  if (!during) throw new Error("Missing camera jump sample");
  expect(during.playerY).toBeGreaterThan(playerBefore.y + 0.35);
  expect(during.targetY).toBeCloseTo(before.targetY, 2);
  expect(during.positionY).toBeCloseTo(before.positionY, 1);
});

test("renders village houses as tall blocking obstacles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const village = await readVillageSnapshot(page);
  expect(village.houseBodies).toBe(3);
  expect(village.houseRoofs).toBe(3);
  expect(village.houseDoors).toBe(3);
  expect(village.houseWindows).toBeGreaterThanOrEqual(6);
  expect(village.houseWindowFrames).toBeGreaterThanOrEqual(6);
  expect(village.houseChimneys).toBe(3);
  expect(village.houseRoofOverhangs).toBeGreaterThanOrEqual(6);
  expect(village.houseRoofTiles).toBeGreaterThanOrEqual(12);
  expect(village.houseWallTextureMaterials).toBeGreaterThanOrEqual(3);
  expect(village.houseRoofTextureMaterials).toBeGreaterThanOrEqual(3);
  expect(village.pathTiles).toBeGreaterThanOrEqual(4);
  expect(village.fenceSegments).toBeGreaterThanOrEqual(4);
  expect(village.houseObstacles).toHaveLength(3);
  for (const obstacle of village.houseObstacles) {
    expect(obstacle.topHeight).toBeGreaterThan(1.8);
  }
});

test("player can jump onto a rock obstacle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const rockWestTop = 0.63;
  const rockWestMinX = -3.8;
  const rockWestMaxX = -2.4;
  const playerRadius = 0.42;
  const after = await page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          collisions?: {
            resolvePlayerVerticalSupport(player: unknown, map: unknown): void;
          };
          map?: unknown;
          player?: {
            clampToBounds(): void;
            footHeight: number;
            isGrounded: boolean;
            landOnSurface(surfaceHeight: number): void;
            position: { x: number; y: number; z: number };
            startFalling(): void;
            surfaceHeight: number;
            update(deltaSeconds: number, input: unknown): void;
          };
        };
      };
    }).__KODU_APP__;
    const gameScene = app?.gameScene;
    const player = gameScene?.player;
    const collisions = gameScene?.collisions;
    const map = gameScene?.map;
    if (!player || !collisions || !map) throw new Error("Missing deterministic landing dependencies");

    player.landOnSurface(0);
    player.position.x = -3.1;
    player.position.y = 2.2;
    player.position.z = -1.4;
    player.startFalling();
    player.clampToBounds();

    const idleInput = {
      consumeFire: () => false,
      consumeJump: () => false,
      get moveX() { return 0; },
      get moveZ() { return 0; },
      getPointerAimDirection: () => undefined,
    };

    for (let step = 0; step < 180; step += 1) {
      player.update(1 / 60, idleInput);
      collisions.resolvePlayerVerticalSupport(player, map);
      player.clampToBounds();
      if (player.isGrounded && Math.abs(player.surfaceHeight - 0.63) < 0.05) break;
    }

    return {
      x: player.position.x,
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      surfaceHeight: player.surfaceHeight,
    };
  });

  expect(after.grounded).toBe(true);
  expect(after.surfaceHeight).toBeCloseTo(rockWestTop, 1);
  expect(after.footHeight).toBeCloseTo(rockWestTop, 1);
  expect(after.x + playerRadius).toBeGreaterThan(rockWestMinX);
  expect(after.x - playerRadius).toBeLessThan(rockWestMaxX);
});

test("player cannot land on an obstacle above jump reach", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const unreachableTop = 2.0;
  await addTestObstacle(page, {
    name: "test-high-obstacle",
    center: { x: -3.1, y: 1.0, z: 2.8 },
    halfExtents: { x: 0.85, y: 1.0, z: 0.65 },
  });
  await dropPlayerFromHeight(page, -3.1, 3.1, 2.8);
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            footHeight: number;
            isGrounded: boolean;
            surfaceHeight: number;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    return Boolean(player && player.isGrounded && Math.abs(player.surfaceHeight) < 0.05 && Math.abs(player.footHeight) < 0.05);
  });

  const after = await readPlayerSnapshot(page);
  expect(after.grounded).toBe(true);
  expect(after.surfaceHeight).not.toBeCloseTo(unreachableTop, 1);
  expect(after.footHeight).toBeCloseTo(0, 1);
});

test("airborne player cannot pass through high obstacles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const obstacleCenterX = 1.1;
  const obstacleHalfX = 0.55;
  const playerRadius = 0.42;
  await addTestObstacle(page, {
    name: "test-airborne-high-obstacle",
    center: { x: obstacleCenterX, y: 0.95, z: 0 },
    halfExtents: { x: obstacleHalfX, y: 0.95, z: 0.65 },
  });

  const after = await page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          input?: unknown;
          player?: {
            footHeight: number;
            isGrounded: boolean;
            landOnSurface(surfaceHeight: number): void;
            position: { x: number; y: number; z: number };
          };
          update(deltaSeconds: number): void;
        };
      };
    }).__KODU_APP__;
    const gameScene = app?.gameScene;
    const player = gameScene?.player;
    if (!gameScene || !player) throw new Error("Missing game scene or player");

    player.landOnSurface(0);
    player.position.x = 0;
    player.position.z = 0;

    let jumpAvailable = true;
    gameScene.input = {
      consumeFire: () => false,
      consumeJump: () => {
        const shouldJump = jumpAvailable;
        jumpAvailable = false;
        return shouldJump;
      },
      get moveX() { return 1; },
      get moveZ() { return 0; },
      getPointerAimDirection: () => undefined,
    };

    for (let step = 0; step < 70; step += 1) {
      gameScene.update(1 / 60);
    }

    return {
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      x: player.position.x,
    };
  });

  expect(after.footHeight).toBeLessThan(1.9);
  expect(after.x + playerRadius).toBeLessThanOrEqual(obstacleCenterX - obstacleHalfX + 0.03);
});

test("updates orthographic bounds when the viewport resizes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const initial = await readCameraSnapshot(page);
  expect(initial.renderWidth).toBeGreaterThan(0);
  expect(initial.renderHeight).toBeGreaterThan(0);

  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & { __KODU_APP__?: { gameScene?: { scene?: { getEngine(): { getRenderWidth(): number; getRenderHeight(): number } } } } }).__KODU_APP__;
    const engine = app?.gameScene?.scene?.getEngine();
    return engine?.getRenderWidth() === 800 && engine.getRenderHeight() === 800;
  });

  const resized = await readCameraSnapshot(page);
  const halfHeight = 5.2;
  expect(initial.orthoLeft).toBeCloseTo(-halfHeight * (initial.renderWidth / initial.renderHeight), 5);
  expect(initial.orthoRight).toBeCloseTo(halfHeight * (initial.renderWidth / initial.renderHeight), 5);
  expect(resized.orthoLeft).toBeCloseTo(-halfHeight * (resized.renderWidth / resized.renderHeight), 5);
  expect(resized.orthoRight).toBeCloseTo(halfHeight * (resized.renderWidth / resized.renderHeight), 5);
  expect(resized.orthoRight).not.toBeCloseTo(initial.orthoRight, 5);
});
