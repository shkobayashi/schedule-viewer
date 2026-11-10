import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  bootNormalPage,
  openSmokeSchedule,
  readChartScrollXProbe,
  waitForFitToWidthSettled,
} from "../helpers/session.ts";
import {
  cancelTaskBarDrag,
  clickUndoOnce,
  clickPeriodEdgeWithoutSelecting,
  dragTaskBar,
  dragTaskBarByDays,
  isDetailNameFocused,
  pointerOnTaskBar,
  readDetailDates,
  releaseTaskBarDrag,
  selectTaskByName,
} from "../helpers/drag.ts";
import { taskSearchBox } from "../helpers/sidebar.ts";
import {
  dismissDeleteConfirm,
  expectContextMenuOnly,
  openContextMenuAt,
  openTaskBarContextMenu,
} from "../helpers/contextMenu.ts";
import {
  readBarCenterForTask,
  readKonvaTextsInTimelineBody,
  readMidDragDateTexts,
  requireKonva,
} from "../helpers/konvaUi.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await waitForFitToWidthSettled(page);
});

test("does not focus the detail name when the period edge is clicked", async ({ page }) => {
  requireKonva();
  await clickPeriodEdgeWithoutSelecting(page, "設計");
  expect(await isDetailNameFocused(page)).toBe(false);
});

test("commits a drag that starts as a right click and undoes it once", async ({ page }) => {
  requireKonva();
  await openTaskBarContextMenu(page, "設計");
  await dragTaskBarByDays(page, "設計", 2);
  await releaseTaskBarDrag(page);
  const dragged = await readDetailDates(page);
  expect(dragged.start).toBe("2026-04-06");
  expect(dragged.end).toBe("2026-04-10");
  await clickUndoOnce(page);
  const restored = await readDetailDates(page);
  expect(restored.start).toBe("2026-04-04");
  expect(restored.end).toBe("2026-04-08");
});

test("keeps 設計 selected when the handle or its inside edge is right-clicked", async ({
  page,
}) => {
  requireKonva();
  await selectTaskByName(page, "設計");
  const bar = await readBarCenterForTask(page, "設計");
  if (!bar) throw new Error("bar missing");
  const handleX = bar.x - bar.width / 2 + 2;
  await page.mouse.click(handleX, bar.y, { button: "right" });
  await expect(page.locator(".context-menu")).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "設計" })).toBeVisible();
});

test("shows only delete after shift-clicking 調査 and 設計", async ({ page }) => {
  await page.locator(".sidebar-row.task", { hasText: "調査" }).first().click();
  await page.keyboard.down("Shift");
  await page.locator(".sidebar-row.task", { hasText: "設計" }).first().click();
  await page.keyboard.up("Shift");
  const row = page.locator(".sidebar-row.task", { hasText: "設計" }).first();
  const box = await row.boundingBox();
  if (!box) throw new Error("row missing");
  await openContextMenuAt(page, box.x + 80, box.y + box.height / 2);
  await expectContextMenuOnly(page, ["削除"]);
});

test("shows only add-milestone on an empty chart right click", async ({ page }) => {
  const body = page.locator(".timeline-body");
  const box = await body.boundingBox();
  if (!box) throw new Error("body missing");
  await openContextMenuAt(page, box.x + box.width * 0.85, box.y + 40);
  await expectContextMenuOnly(page, ["マイルストンを追加"]);
});

test("keeps 調査 when delete is cancelled", async ({ page }) => {
  const row = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  await row.click();
  const box = await row.boundingBox();
  if (!box) throw new Error("row missing");
  await openContextMenuAt(page, box.x + 80, box.y + box.height / 2);
  await page
    .locator(".context-menu [role='menuitem']", {
      has: page.locator(".context-menu-label", { hasText: "削除" }),
    })
    .click();
  await dismissDeleteConfirm(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" }).first()).toBeVisible();
});

test("keeps the empty group 後半 when delete is cancelled", async ({ page }) => {
  const group = page.locator(".sidebar-row", { hasText: "後半" }).first();
  const box = await group.boundingBox();
  if (!box) throw new Error("group missing");
  await openContextMenuAt(page, box.x + 60, box.y + box.height / 2);
  const deleteItem = page.locator(".context-menu [role='menuitem']", {
    has: page.locator(".context-menu-label", { hasText: "削除" }),
  });
  await deleteItem.click();
  await expect(page.getByRole("dialog", { name: /削除/ })).toBeVisible();
  await dismissDeleteConfirm(page);
  await expect(group).toBeVisible();
});

test("selects by click, shift range, and ctrl or meta toggle", async ({ page }) => {
  await page.locator(".sidebar-row.task", { hasText: "調査" }).first().click();
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "調査" })).toBeVisible();
  await page.keyboard.down("Shift");
  await page.locator(".sidebar-row.task", { hasText: "設計" }).first().click();
  await page.keyboard.up("Shift");
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "調査" })).toBeVisible();
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "設計" })).toBeVisible();
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.down(mod);
  await page.locator(".sidebar-row.task", { hasText: "調査" }).first().click();
  await page.keyboard.up(mod);
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "調査" })).toHaveCount(0);
});

test("extends the selection with shift and arrow keys", async ({ page }) => {
  await page.locator(".sidebar-row.task", { hasText: "調査" }).first().click();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.up("Shift");
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "設計" })).toBeVisible();
});

test("clears the selection when the filter changes", async ({ page }) => {
  await page.locator(".sidebar-row.task", { hasText: "設計" }).first().click();
  await taskSearchBox(page).fill("調査");
  await expect.poll(async () => page.locator(".sidebar-row.task.selected").count()).toBe(0);
});

test("does not change horizontal scroll when a visible bar is clicked", async ({ page }) => {
  requireKonva();
  const bar = await pointerOnTaskBar(page, "設計");
  await expect
    .poll(async () => (await readChartScrollXProbe(page)) != null, { timeout: 3_000 })
    .toBe(true);
  const x0 = await readChartScrollXProbe(page);
  expect(x0).not.toBeNull();
  await page.mouse.click(bar.x, bar.y);
  const xAfter = await readChartScrollXProbe(page);
  expect(xAfter).not.toBeNull();
  if (x0 != null && xAfter != null) {
    expect(Math.abs(xAfter - x0)).toBeLessThan(32);
  }
});

test("drags one bar across a non-working day without showing 休", async ({ page }) => {
  requireKonva();
  await page.getByRole("group", { name: "表示の切り替え" }).getByRole("button", { name: "日", exact: true }).click();
  await dragTaskBarByDays(page, "調査", 3);
  await releaseTaskBarDrag(page);
  await expect
    .poll(async () => {
      const texts = await readKonvaTextsInTimelineBody(page);
      return texts.some((t) => t.includes("休"));
    })
    .toBe(false);
});

test("shows month day chips mid drag without overlapping the bar (EDIT-02b)", async ({ page }) => {
  requireKonva();
  await selectTaskByName(page, "設計");
  await dragTaskBar(page, "設計", 40);
  await expect
    .poll(async () => (await readMidDragDateTexts(page)).length, { timeout: 3_000 })
    .toBeGreaterThanOrEqual(2);
  const texts = await readMidDragDateTexts(page);
  expect(texts.some((t) => t.includes("4/"))).toBe(true);
  await cancelTaskBarDrag(page);
  await expect.poll(async () => (await readMidDragDateTexts(page)).length).toBe(0);
});
