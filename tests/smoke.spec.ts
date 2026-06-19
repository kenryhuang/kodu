import { expect, test } from "@playwright/test";

test("renders the game and fires a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator(".hud-title")).toHaveText("Kodu");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  await page.mouse.click(800, 420);

  await expect(page.locator('[data-hud="projectiles"]')).not.toHaveText("0");
  await page.waitForTimeout(1800);
  await expect(page.locator('[data-hud="projectiles"]')).toHaveText("0");
  expect(pageErrors).toEqual([]);
});
