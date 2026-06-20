import { test, expect } from "@playwright/test";

test("manuscript theme: parchment background", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".shell");
  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
  );
  expect(bg).toBe("#e4d8b8");
});
