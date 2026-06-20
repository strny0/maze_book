import { test, expect } from "@playwright/test";

test("manuscript theme: parchment background", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
  );
  expect(bg).toBe("#e4d8b8");
});

test("cog button opens options dialog", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  await page.click(".cog");
  await expect(page.locator(".dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".dialog")).not.toBeVisible();
});

test("switching to Engraved darkens panels", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  await page.click(".cog");
  await page.click("text=Engraved");
  const panelColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--panel").trim()
  );
  expect(panelColor).toBe("#241d12");
  await page.keyboard.press("Escape");
});
