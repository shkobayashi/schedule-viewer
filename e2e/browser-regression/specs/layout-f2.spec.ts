import { expect, test } from "playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { bootNormalPage, openSmokeSchedule } from "../helpers/session.ts";
import {
  activateHighlightedPaletteItem,
  closeCommandPalette,
  openCommandPalette,
  runPaletteQuery,
} from "../helpers/palette.ts";

const specDir = path.dirname(fileURLToPath(import.meta.url));
const baselineDir = path.join(specDir, "../baselines");

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
});

test("shows only short toolbar labels at 1280 by 800", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("button", { name: "案内", exact: true })).toBeVisible();
  const day = page.getByRole("group", { name: "表示の切り替え" }).getByRole("button", { name: "日", exact: true });
  await expect(day).toHaveText("日");
  const dayTitle = (await day.getAttribute("title")) ?? "";
  expect(dayTitle.length).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "追加", exact: true })).toBeVisible();
});

test("folds the shortcut list into one column at 480 by 640", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 640 });
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog", { name: "ショートカット" });
  await expect(dialog).toBeVisible();
  const columns = dialog.locator(".shortcuts-entry-columns");
  const columnCount = await columns.evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length,
  );
  expect(columnCount).toBe(1);
});

test("keeps the corner context menu inside the 480 by 640 window", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 640 });
  const canvas = page.locator(".timeline-body canvas").first();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("chart canvas missing");
  await page.mouse.click(
    canvasBox.x + canvasBox.width - 48,
    canvasBox.y + canvasBox.height - 48,
    { button: "right" },
  );
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport missing");
  const menu = page.locator(".context-menu");
  await expect(menu).toBeVisible({ timeout: 15_000 });
  const box = await menu.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }
});

test("runs 今日 from the command palette...", async ({ page }) => {
  await openCommandPalette(page);
  await runPaletteQuery(page, "今日");
  await activateHighlightedPaletteItem(page);
  await closeCommandPalette(page);
  await expect(page.getByRole("dialog", { name: "操作の案内" })).toHaveCount(0);
  await page.getByRole("group", { name: "表示の切り替え" }).getByRole("button", { name: "日", exact: true }).click();
  await page.waitForTimeout(300);
});

test("compares light and dark screenshots of the sample without judging readability", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const app = page.locator(".app");
  await expect(app).toHaveScreenshot(path.join(baselineDir, "layout-f2-light.png"), {
    maxDiffPixelRatio: 0.04,
    animations: "disabled",
  });
  await openCommandPalette(page);
  await runPaletteQuery(page, "設定");
  await activateHighlightedPaletteItem(page);
  await page.getByLabel("配色").selectOption("dark");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await expect(app).toHaveScreenshot(path.join(baselineDir, "layout-f2-dark.png"), {
    maxDiffPixelRatio: 0.04,
    animations: "disabled",
  });
});
