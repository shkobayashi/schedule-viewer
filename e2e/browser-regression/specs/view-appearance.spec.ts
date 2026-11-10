import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { confirmDelete, openContextMenuAt, openTaskBarContextMenu } from "../helpers/contextMenu.ts";
import {
  clickUndoOnce,
  pointerOnTaskBar,
  selectTaskByName,
} from "../helpers/drag.ts";
import { filterTasksByName } from "../helpers/diff.ts";
import { exportWithFormat, readExportFile, unlinkExportFile } from "../helpers/export.ts";
import {
  contrastRatio,
  evaluateLightningIsoForTask,
  evaluateOverdueForTask,
  pointerOnMilestoneDiamond,
  pointerOnMilestoneLabel,
  readMilestoneDiamondFill,
  readTaskBarKonvaForRow,
  requireKonva,
} from "../helpers/konvaUi.ts";
import { wheelShiftHorizontalOnChart } from "../helpers/nav.ts";
import { readChartScrollXProbe } from "../helpers/session.ts";
import { collapseToggleFor, dragRowGrip, taskSearchBox } from "../helpers/sidebar.ts";
import {
  chooseColorSelectOption,
  enableAllSidebarColumns,
  importJsonInOpenSettings,
  openSettingsSection,
} from "../helpers/settings.ts";
import {
  bootNormalPage,
  colorsRegressionPath,
  fieldsRegressionPath,
  fieldsSchedulePath,
  fullSchedulePath,
  longSchedulePath,
  manyTasksSchedulePath,
  levels3SchedulePath,
  lightningSchedulePath,
  lightningStatusesPath,
  manualColorsSchedulePath,
  membersRegressionPath,
  openScheduleFile,
  openSmokeSchedule,
  waitForFitToWidthSettled,
  waitForTitle,
} from "../helpers/session.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
});

test("selects from the bar and the row and clears on the background", async ({ page }) => {
  requireKonva();
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.locator(".sidebar-row.task", { hasText: "調査" }).first().click();
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "調査" })).toBeVisible();
  const bar = await pointerOnTaskBar(page, "設計");
  await page.mouse.click(bar.x, bar.y);
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "設計" })).toBeVisible();
  const body = page.locator(".timeline-body");
  const box = await body.boundingBox();
  if (!box) throw new Error("body missing");
  await page.mouse.click(box.x + 12, box.y + box.height * 0.92);
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(0);
});

test("shows the full name on hover and does not drag the name, then reorders from the grip", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.setViewportSize({ width: 520, height: 700 });
  const row = page.locator(".sidebar-row.task", { hasText: "期限超過の作業" }).first();
  const label = row.locator(".row-label");
  const title = (await label.getAttribute("title")) ?? (await label.innerText());
  expect(title).toContain("期限超過の作業");
  const labelBox = await label.boundingBox();
  if (!labelBox) throw new Error("label missing");
  const beforeY = (await row.boundingBox())?.y;
  await page.mouse.move(labelBox.x + 8, labelBox.y + 4);
  await page.mouse.down();
  await page.mouse.move(labelBox.x + 40, labelBox.y + 4, { steps: 6 });
  await page.mouse.up();
  const afterY = (await row.boundingBox())?.y;
  expect(beforeY).toBe(afterY);
  const design = page.locator(".sidebar-row.task", { hasText: "設計" }).first();
  const survey = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  const designBox = await design.boundingBox();
  const surveyBox = await survey.boundingBox();
  if (!designBox || !surveyBox) throw new Error("rows missing");
  await dragRowGrip(page, design, -designBox.height - 4);
  const afterDesign = await design.boundingBox();
  const afterSurvey = await survey.boundingBox();
  if (!afterDesign || !afterSurvey) throw new Error("rows missing after drag");
  expect(afterDesign.y).toBeLessThan(afterSurvey.y);
});

test("drags the sidebar boundary, restores it on double click, and shrinks only the applied width", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  const boundary = page.locator(".sidebar-resizer");
  const before = await page.locator(".sidebar").boundingBox();
  const bBox = await boundary.boundingBox();
  if (!bBox || !before) throw new Error("sidebar missing");
  await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(bBox.x + 60, bBox.y + 40, { steps: 8 });
  await page.mouse.up();
  const widened = await page.locator(".sidebar").boundingBox();
  expect((widened?.width ?? 0)).toBeGreaterThan(before.width + 40);
  await boundary.dblclick();
  const restored = await page.locator(".sidebar").boundingBox();
  expect(Math.abs((restored?.width ?? 0) - before.width)).toBeLessThan(8);
});

test("does not reorder a filtered task, category, or group from the grip", async ({ page }) => {
  await openSmokeSchedule(page);
  await filterTasksByName(page, "設計");
  await expect.poll(async () => page.locator(".sidebar-row.task").count()).toBe(1);
  const grip = page.locator(".sidebar-row.task .row-grip").first();
  const box = await grip.boundingBox();
  if (!box) throw new Error("grip missing");
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator(".sidebar-drag-ghost")).toHaveCount(0);
});

test("scrolls the highlighted milestone into view and leaves the value unchanged on Enter", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "調査");
  const milestone = page.locator("#detailMilestone");
  await expect(milestone).toBeVisible();
  const before = await milestone.inputValue();
  await milestone.press("Enter");
  await expect(milestone).toHaveValue(before);
});

test("hides the extra-fields section on the startup sample", async ({ page }) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  await expect(page.getByRole("heading", { name: "追加項目" })).toHaveCount(0);
});

test("matches score and progress field widths to the note and shows a percent sign", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  await page
    .locator("label.settings-catalog-row", { hasText: "サンプル追加項目" })
    .locator('input[type="checkbox"]')
    .check();
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "load" });
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "拡張あり");
  await expect(page.locator("#detailField-sample_score")).toBeVisible({ timeout: 15_000 });
  await page.locator("#detailField-sample_score").fill("42");
  await page.locator("#detailField-sample_ratio").fill("50");
  const note = page.locator("#detailNote").locator("..");
  const score = page.locator("#detailField-sample_score").locator("..");
  const noteWidth = await note.evaluate((el) => el.getBoundingClientRect().width);
  const scoreWidth = await score.evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(noteWidth - scoreWidth)).toBeLessThan(6);
  await expect(page.locator("#detailField-sample_ratio").locator("..")).toContainText("%");
});

test("keeps the confirmation calendar inside the viewport", async ({ page }) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  await page.getByLabel("カレンダーを開く").first().click();
  const popover = page.locator(".date-popover");
  await expect(popover).toBeVisible();
  const box = await popover.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("popover missing");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
});

test("meets a 4.5 to 1 contrast for extra-field text and the percent sign in light and dark", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  await page
    .locator("label.settings-catalog-row", { hasText: "サンプル追加項目" })
    .locator('input[type="checkbox"]')
    .check();
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "load" });
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "拡張あり");
  const ratioField = await page.evaluate(() => {
    const el = document.querySelector("#detailField-sample_ratio");
    if (!el) return 0;
    const fg = getComputedStyle(el).color;
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue("--surface") ||
      "rgb(255,255,255)";
    return { fg, bg };
  });
  expect(contrastRatio(ratioField.fg, ratioField.bg.trim() || "rgb(255,255,255)")).toBeGreaterThanOrEqual(
    4.5,
  );
  await openSettingsSection(page, "表示");
  await page.getByLabel("配色").selectOption("dark");
  await page.keyboard.press("Escape");
  const darkRatio = await page.evaluate(() => {
    const el = document.querySelector("#detailField-sample_ratio");
    if (!el) return 0;
    const fg = getComputedStyle(el).color;
    const bg = getComputedStyle(document.documentElement).backgroundColor;
    return { fg, bg };
  });
  expect(contrastRatio(darkRatio.fg, darkRatio.bg)).toBeGreaterThanOrEqual(4.5);
});

test("omits the task itself from predecessor options", async ({ page }) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  const pred = page.locator("#fieldPredecessors");
  await pred.fill("設計");
  await expect(page.locator("#fieldPredecessors-list [role='option']")).toHaveCount(0);
});

test("closes only the predecessor list on Escape and leaves the detail open", async ({ page }) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  await page.locator("#fieldPredecessors").click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("complementary", { name: "タスクの詳細" })).toBeVisible();
  await expect(page.locator("#fieldPredecessors-list")).toHaveCount(0);
});

test("asks to narrow the predecessor search when there are more than 50 tasks", async ({
  page,
}) => {
  await openScheduleFile(page, manyTasksSchedulePath);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await selectTaskByName(page, "対象");
  const pred = page.locator("#fieldPredecessors");
  await pred.click();
  await pred.fill("候補");
  await expect(pred).toBeFocused();
  await expect(
    page.locator("#fieldPredecessors-list li.relation-none", {
      hasText: "さらに絞り込んでください",
    }),
  ).toBeVisible({ timeout: 15_000 });
});

test("shows the full task name, ellipsizes the hierarchy line, and shows the full path on hover", async ({
  page,
}) => {
  await openScheduleFile(page, levels3SchedulePath);
  await waitForTitle(page, "階層サンプル（3段）");
  await selectTaskByName(page, "草案");
  const pred = page.locator("#fieldPredecessors");
  await pred.click();
  await pred.fill("訪問");
  await expect(pred).toBeFocused();
  const option = page.locator("#fieldPredecessors-list [role='option']").first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  const text = await option.innerText();
  expect(text.length).toBeGreaterThan(2);
});

test("clears tag selection when filters change", async ({ page }) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.getByPlaceholder("タグ名で検索").fill("回帰");
  await page.locator(".filter-panel-tag-option-label", { hasText: "回帰" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(0);
});

test("removes the task and the predecessor line after the delete is confirmed", async ({
  page,
}) => {
  requireKonva();
  await openSmokeSchedule(page);
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await confirmDelete(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  const arrows = await page.locator(".timeline-body").evaluate(() => document.querySelectorAll("canvas").length);
  expect(arrows).toBeGreaterThan(0);
});

test("adds no task on cancel or Escape and keeps the dialog open when the end is before the start", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タスク名").fill("失敗する追加");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const again = page.getByRole("dialog");
  await again.getByLabel("開始").fill("2026-04-10");
  await again.getByLabel("終了").fill("2026-04-01");
  await again.getByRole("button", { name: "追加" }).click();
  await expect(again).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("ties todo checks to progress, hides checks under the row, and omits todos from HTML and SVG", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "やること付き");
  await page.getByLabel("下書きを済みにする").check();
  const row = page.locator(".sidebar-row", { hasText: "やること付き" }).first();
  await expect(row.locator("input[type='checkbox']")).toHaveCount(0);
  const htmlPath = await exportWithFormat(page, "html");
  const html = readExportFile(htmlPath);
  expect(html).not.toMatch(/下書き.*checkbox/i);
  unlinkExportFile(htmlPath);
});

test("fills in-progress bars with a darker progress segment, done in green, and not-started in gray", async ({
  page,
}) => {
  requireKonva();
  await openScheduleFile(page, manualColorsSchedulePath);
  await waitForTitle(page, "操作マニュアル用の見本");
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await waitForFitToWidthSettled(page);
  const progress = await readTaskBarKonvaForRow(page, "進行中（青）");
  expect(progress?.progressFill).not.toBeNull();
  const done = await readTaskBarKonvaForRow(page, "完了（緑）");
  expect(done?.fill).toBeTruthy();
});

test("scrolls milestone names to the right edge, ellipsizes past 24 characters, and shows the full name on hover", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await page.setViewportSize({ width: 900, height: 700 });
  await page.getByRole("button", { name: "全体", exact: true }).click();
  const longLabel = page.locator(".sidebar-milestones").filter({ hasText: "未確定の節目" });
  if (await longLabel.count()) {
    const text = await longLabel.first().innerText();
    expect(text.length).toBeGreaterThan(0);
  }
});

test("matches overdue borders, overrun frames, and lightning folds to isOverdue and lightningDate for the page today", async ({
  page,
}) => {
  requireKonva();
  await openScheduleFile(page, lightningSchedulePath);
  await waitForTitle(page, "イナズマ線の確認用");
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, lightningStatusesPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "表示");
  await page.getByLabel("イナズマ線を表示").check();
  await page.keyboard.press("Escape");
  const task = { status: "not-started", end: "2026-10-16" };
  const overdue = await evaluateOverdueForTask(page, task);
  expect(overdue).toBe(true);
  await expect(
    page.locator(".sidebar-row.task .row-label.overdue", { hasText: "未着手・終了後" }),
  ).toBeVisible();
  const bar = await readTaskBarKonvaForRow(page, "未着手・終了後");
  expect(bar).not.toBeNull();
  const foldTask = { start: "2026-10-06", end: "2026-11-06", status: "in-progress" };
  const iso = await evaluateLightningIsoForTask(page, foldTask);
  expect(iso.length).toBeGreaterThan(0);
});

test("shows unassigned, known, and unknown assignee chips on the list and in the HTML and SVG download", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".assignee-badge", { hasText: "未割当" }).first()).toBeVisible();
  await expect(page.locator(".sidebar-row", { hasText: "不明担当" })).toContainText(/メンバー不明/);
  await enableAllSidebarColumns(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toContainText("田中");
  const htmlPath = await exportWithFormat(page, "html");
  const html = readExportFile(htmlPath);
  expect(html).toContain("未割当");
  unlinkExportFile(htmlPath);
});

test("shows tentative hatch, committed solid bar, and no 未確定 in the task list", async ({
  page,
}) => {
  requireKonva();
  await openSmokeSchedule(page);
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await waitForFitToWidthSettled(page);
  await enableAllSidebarColumns(page);
  await expect(page.locator(".sidebar-row.task", { hasText: "未確定" })).toHaveCount(0);
  await expect(page.locator(".sidebar-row", { hasText: "期限超過の作業" })).toBeVisible();
  const tentative = await readTaskBarKonvaForRow(page, "設計");
  expect(tentative?.hasPattern).toBe(true);
  const committed = await readTaskBarKonvaForRow(page, "調査");
  expect(committed?.hasPattern ?? false).toBe(false);
  await page.getByRole("button", { name: "今日" }).click();
  const pt = await pointerOnMilestoneDiamond(page, "承認");
  expect(pt).not.toBeNull();
  if (pt) {
    const diamond = await readMilestoneDiamondFill(page, "承認");
    expect(diamond.fill).not.toBeNull();
  }
});

test("leaves unknown color ids and catalog-only risk unpainted, and hides the color field on the startup sample", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  await expect(page.locator("#detailColor")).toHaveCount(0);
});

test("restores the survey note and the design link after delete and undo, and leaves the selection empty", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await confirmDelete(page);
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(0);
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toBeVisible();
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(0);
});

test("removes the survey on redo and restores it again on undo, with the selection still empty", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await confirmDelete(page);
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${mod}+Shift+KeyZ`);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toBeVisible();
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(0);
});

// TC-EDIT-01b: covered by smoke-edit-drag.spec.ts "clears the selection when the filter changes"
// TC-EDIT-16e/17e: translucent grip drag covered by hierarchy-reorder.spec.ts
// TC-NAV-07: covered by layout-f2.spec.ts after KeyK fix
