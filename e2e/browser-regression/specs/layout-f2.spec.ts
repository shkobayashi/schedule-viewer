import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "playwright/test";

const baselineDir = fileURLToPath(new URL("../baselines/", import.meta.url));
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { bootNormalPage, openSmokeSchedule, readChartScrollXProbe } from "../helpers/session.ts";
import {
  activateHighlightedPaletteItem,
  closeCommandPalette,
  openCommandPalette,
  runPaletteQuery,
} from "../helpers/palette.ts";
import { openContextMenuAt } from "../helpers/contextMenu.ts";

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
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport missing");
  const body = page.locator(".timeline-body");
  const bodyBox = await body.boundingBox();
  if (!bodyBox) throw new Error("chart body missing");
  await openContextMenuAt(
    page,
    bodyBox.x + bodyBox.width * 0.9,
    bodyBox.y + bodyBox.height * 0.85,
  );
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

test("runs 今日 from the command palette and ignores the palette shortcut while a dialog is open", async ({
  page,
}) => {
  const xBefore = await readChartScrollXProbe(page);
  expect(xBefore).not.toBeNull();
  await openCommandPalette(page);
  await runPaletteQuery(page, "今日");
  await activateHighlightedPaletteItem(page);
  await closeCommandPalette(page);
  await expect(page.getByRole("dialog", { name: "操作の案内" })).toHaveCount(0);
  await page.getByRole("group", { name: "表示の切り替え" }).getByRole("button", { name: "日", exact: true }).click();
  await expect
    .poll(
      async () => {
        const x = await readChartScrollXProbe(page);
        return x != null && xBefore != null && Math.abs(x - xBefore) > 10;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
  await page.locator(".sidebar-row.task", { hasText: "設計" }).first().click();
  await page.getByRole("button", { name: "タイトルを変更" }).click();
  await page.keyboard.down(process.platform === "darwin" ? "Meta" : "Control");
  await page.keyboard.press("KeyP");
  await page.keyboard.up(process.platform === "darwin" ? "Meta" : "Control");
  await expect(page.getByRole("searchbox", { name: "コマンドパレット" })).toHaveCount(0);
});

test("compares light and dark screenshots of the sample without judging readability", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const app = page.locator(".app");
  await expect(app).toHaveScreenshot(path.join(baselineDir, "layout-f2-light.png"), {
    maxDiffPixelRatio: 0.06,
    animations: "disabled",
  });
  await openCommandPalette(page);
  await runPaletteQuery(page, "設定");
  await activateHighlightedPaletteItem(page);
  await page.getByLabel("配色").selectOption("dark");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "設定" })).toHaveCount(0);
  // ダーク配色は Konva の再描画が終わるまで条件の読み取り口が無い
  await page.waitForTimeout(400);
  await expect(app).toHaveScreenshot(path.join(baselineDir, "layout-f2-dark.png"), {
    maxDiffPixelRatio: 0.06,
    animations: "disabled",
  });
});
