import { expect, test } from "@playwright/test";

test("renders the game and fires a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const canvas = page.locator("#game-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".hud-title")).toHaveText("Kodu");
  await expect(page.locator('[data-hud="state"]')).toHaveText("Ready");

  const canvasSample = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const gl = canvasElement.getContext("webgl2") ?? canvasElement.getContext("webgl");
    if (!gl) throw new Error("Missing WebGL context");

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const points: Array<[number, number]> = [
      [Math.floor(width * 0.5), Math.floor(height * 0.55)],
      [Math.floor(width * 0.38), Math.floor(height * 0.72)],
      [Math.floor(width * 0.62), Math.floor(height * 0.72)],
      [Math.floor(width * 0.5), Math.floor(height * 0.35)],
    ];
    const pixels = points.map(([x, y]) => {
      const rgba = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      return Array.from(rgba);
    });

    return { width, height, pixels };
  });

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
});
