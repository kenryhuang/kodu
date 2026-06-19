import { expect, test, type Locator, type Page } from "@playwright/test";

type CameraSnapshot = {
  renderWidth: number;
  renderHeight: number;
  orthoLeft: number;
  orthoRight: number;
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

async function readCameraSnapshot(page: Page): Promise<CameraSnapshot> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & { __KODU_APP__?: { gameScene?: { scene?: { activeCamera?: Record<string, number>; getEngine(): { getRenderWidth(): number; getRenderHeight(): number } } } } }).__KODU_APP__;
    const scene = app?.gameScene?.scene;
    const camera = scene?.activeCamera;
    if (!scene || !camera) throw new Error("Missing active camera");

    return {
      renderWidth: scene.getEngine().getRenderWidth(),
      renderHeight: scene.getEngine().getRenderHeight(),
      orthoLeft: Number(camera.orthoLeft),
      orthoRight: Number(camera.orthoRight),
    };
  });
}

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
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
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
