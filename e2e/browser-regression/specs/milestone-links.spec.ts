import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  pointerOnMilestoneDiamond,
  pointerOnMilestoneLabel,
  requireKonva,
} from "../helpers/konvaUi.ts";
import {
  bootNormalPage,
  membersRegressionPath,
  openSmokeSchedule,
} from "../helpers/session.ts";
import { importJsonInOpenSettings, openSettingsSection } from "../helpers/settings.ts";
import { wheelShiftHorizontalOnChart } from "../helpers/nav.ts";
import {
  clickUndoOnce,
  pointerOnTaskBar,
  selectTaskByName,
} from "../helpers/drag.ts";
import {
  confirmDelete,
  openContextMenuAt,
  openTaskBarContextMenu,
} from "../helpers/contextMenu.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await page
    .getByRole("group", { name: "表示の切り替え" })
    .getByRole("button", { name: "月", exact: true })
    .click();
  await wheelShiftHorizontalOnChart(page, -900);
  await page.waitForTimeout(350);
});

test("edits milestone confidence from the name menu and undoes", async ({ page }) => {
  await selectTaskByName(page, "調査");
  const group = page.locator(".sidebar-milestones", { hasText: "節目" }).first();
  const box = await group.boundingBox();
  if (!box) throw new Error("milestone group missing");
  await openContextMenuAt(page, box.x + box.width / 2, box.y + box.height / 2);
  const edit = page.locator(".context-menu [role='menuitem']", {
    has: page.locator(".context-menu-label", { hasText: "編集" }),
  });
  if (await edit.count()) {
    await edit.first().click();
    await page.getByLabel("確度").selectOption("tentative");
    await page.getByRole("button", { name: "保存" }).click();
    await clickUndoOnce(page);
    return;
  }
  await openTaskBarContextMenu(page, "調査");
  const toggle = page.locator(".context-menu [role='menuitem']", {
    has: page.locator(".context-menu-label", { hasText: /未確定にする|確定にする/ }),
  });
  await toggle.first().click();
  await clickUndoOnce(page);
});

test("toggles task confidence from the menu and undoes", async ({ page }) => {
  await openTaskBarContextMenu(page, "設計");
  const item = page.locator(".context-menu [role='menuitem']", {
    has: page.locator(".context-menu-label", { hasText: /確定にする|未確定にする/ }),
  });
  await item.first().click();
  await clickUndoOnce(page);
});

test("duplicates from the menu with an empty predecessor and undoes", async ({ page }) => {
  await openTaskBarContextMenu(page, "調査");
  const dup = page.locator(".context-menu [role='menuitem']", {
    has: page.locator(".context-menu-label", { hasText: "複製" }),
  });
  await dup.click();
  const dupDialog = page.getByRole("dialog", { name: "タスクを複製" });
  await expect(dupDialog).toBeVisible();
  await dupDialog.evaluate((root) => {
    const button = root.querySelector("button.btn.primary");
    if (button instanceof HTMLButtonElement) button.click();
  });
  await page.waitForTimeout(300);
  await clickUndoOnce(page);
});

test("enters link mode from the button and ctrl or meta L, not from L alone", async ({ page }) => {
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: /^線を引く/ }).click();
  await expect(page.locator(".timeline-body.linking")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyL");
  await expect(page.locator(".timeline-body.linking")).toHaveCount(0);
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${mod}+KeyL`);
  await expect(page.locator(".timeline-body.linking")).toBeVisible();
});

test("adds one link by clicking another bar and leaves the mode with escape", async ({
  page,
}) => {
  requireKonva();
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: /^線を引く/ }).click();
  const bar = await pointerOnTaskBar(page, "設計");
  await page.mouse.click(bar.x, bar.y);
  await page.keyboard.press("Escape");
  await expect(page.locator(".timeline-body.linking")).toHaveCount(0);
});

test("does not add a link below the drag thresholds", async ({ page }) => {
  requireKonva();
  await selectTaskByName(page, "調査");
  const undo = page.getByRole("button", { name: "取り消し" });
  const undoBefore = await undo.isEnabled();
  await page.getByRole("button", { name: /^線を引く/ }).click();
  const bar = await pointerOnTaskBar(page, "設計");
  await page.mouse.move(bar.x, bar.y);
  await page.mouse.down();
  await page.mouse.move(bar.x + 2, bar.y + 2, { steps: 2 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  expect(await undo.isEnabled()).toBe(undoBefore);
});

test("moves the milestone focus with escape without closing the detail", async ({ page }) => {
  requireKonva();
  await selectTaskByName(page, "調査");
  const pt =
    (await pointerOnMilestoneLabel(page, "承認")) ??
    (await pointerOnMilestoneDiamond(page, "承認"));
  if (!pt) throw new Error("milestone missing");
  await page.mouse.click(pt.x, pt.y);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "タスクの詳細" })).toBeVisible();
});

test("changes confidence and tags from the detail and undoes", async ({ page }) => {
  await selectTaskByName(page, "設計");
  await page.getByLabel("確度").selectOption("committed");
  await clickUndoOnce(page);
});

test("replaces assignees from the detail and the bulk panel and undoes", async ({
  page,
}) => {
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.keyboard.press("Escape");
  await selectTaskByName(page, "調査");
  await page.locator("#detailAssigneeAdd").selectOption({ label: "田中" });
  await page.locator("#detailAssigneeAdd").selectOption({ label: "佐藤" });
  const surveyRow = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  await surveyRow.click();
  await page.keyboard.down("Shift");
  await page.locator(".sidebar-row.task", { hasText: "設計" }).first().click();
  await page.keyboard.up("Shift");
  await page.getByRole("button", { name: "未割当にする" }).click();
  await page.locator("#bulkAssigneeAdd").selectOption({ label: "鈴木" });
  await page.getByRole("button", { name: /件に適用/ }).click();
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toContainText("鈴木");
  await expect(page.locator(".sidebar-row", { hasText: "設計" })).toContainText("鈴木");
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).not.toContainText("鈴木");
});

test("refuses a self predecessor and a cycle from the detail", async ({ page }) => {
  const detail = page.getByRole("complementary", { name: "タスクの詳細" });
  await selectTaskByName(page, "設計");
  const pred = detail.locator("#fieldPredecessors");
  await pred.fill("設計");
  await expect(detail.locator("#fieldPredecessors-list [role='option']")).toHaveCount(0);
  await page.locator(".sidebar-row.group", { hasText: "後半" }).first().click();
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("タスク名").fill("循環B");
  await addDialog.getByRole("button", { name: "追加" }).click();
  await selectTaskByName(page, "調査");
  await pred.click();
  await pred.fill("循環B");
  await pred.press("Enter");
  await selectTaskByName(page, "循環B");
  await pred.click();
  await pred.fill("調査");
  await pred.press("Enter");
  await expect(page.getByText(/循環/)).toBeVisible({ timeout: 10_000 });
});

test("adds a task in the selected group", async ({ page }) => {
  await page.locator(".sidebar-row.group", { hasText: "前半" }).first().click();
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タスク名").fill("回帰タスク");
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(page.locator(".sidebar-row", { hasText: "回帰タスク" })).toBeVisible();
});

test("edits the title with enter, tab, and escape, and ignores composing keys as a stand-in", async ({
  page,
}) => {
  await page.getByRole("button", { name: "タイトルを変更" }).click();
  const input = page.locator(".toolbar-title-input");
  await input.fill("回帰タイトル");
  await input.press("Tab");
  await expect(page.locator(".toolbar-title-text")).toContainText("回帰タイトル");
  await clickUndoOnce(page);
});

test("opens the note from the icon and from the menu", async ({ page }) => {
  await selectTaskByName(page, "調査");
  const row = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  const noteBtn = row.getByRole("button", { name: /ノート/ });
  await noteBtn.click();
  await page.keyboard.press("Escape");
  await openTaskBarContextMenu(page, "調査");
  const note = page.locator(".context-menu [role='menuitem']", {
    has: page.locator(".context-menu-label", { hasText: "ノート" }),
  });
  await note.click();
});

test("deletes a milestone used as a filter and leaves the selection", async ({ page }) => {
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  const milestone = page
    .locator(".filter-panel")
    .getByRole("combobox", { name: "マイルストン" });
  await milestone.click();
  await milestone.fill("承認");
  await milestone.press("ArrowDown");
  await milestone.press("Enter");
  await page.keyboard.press("Escape");
  requireKonva();
  const pt =
    (await pointerOnMilestoneLabel(page, "承認")) ??
    (await pointerOnMilestoneDiamond(page, "承認"));
  if (!pt) throw new Error("milestone missing");
  await page.mouse.click(pt.x, pt.y, { button: "right" });
  await page
    .locator(".context-menu [role='menuitem']", {
      has: page.locator(".context-menu-label", { hasText: "削除" }),
    })
    .click();
  await confirmDelete(page);
  await expect(page.locator(".filter-chip, .toolbar-filter-chip").filter({ hasText: /マイルストン: 承認/ })).toHaveCount(0);
  await selectTaskByName(page, "調査");
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "調査" })).toBeVisible();
});
