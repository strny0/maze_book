import { test, expect } from "@playwright/test";

test("room image toolbar has 7 icon buttons", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".toolbar");
  const btns = page.locator(".tbtn");
  expect(await btns.count()).toBe(7);
});

test("palette shows when draw tool active", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".toolbar");
  await expect(page.locator(".palette-group")).not.toBeVisible();
  await page.locator(".tbtn").nth(1).click(); // draw tool
  await expect(page.locator(".palette-group")).toBeVisible();
});

test("annotate mode: click creates point annotation popup", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".view");
  await page.locator(".tbtn").nth(3).click(); // annotate tool
  const view = page.locator(".view");
  const box = await view.boundingBox();
  if (!box) throw new Error("no view box");
  await view.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator(".popup")).toBeVisible();
});
