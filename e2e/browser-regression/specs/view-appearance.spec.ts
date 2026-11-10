import { paletteFor } from "../../../src/model/palette.ts";
import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { confirmDelete, openTaskBarContextMenu } from "../helpers/contextMenu.ts";
import {
  clickPeriodEdgeWithoutSelecting,
  clickRedoOnce,
  clickUndoOnce,
  pointerOnTaskBar,
  selectTaskByName,
} from "../helpers/drag.ts";
import { filterTasksByName } from "../helpers/diff.ts";
import { exportWithFormat, readExportFile, unlinkExportFile } from "../helpers/export.ts";
import {
  contrastRatio,
  countKonvaArrowsInTimelineBody,
  evaluateLightningIsoForTask,
  evaluateOverdueForTask,
  fillMatches,
  pointerOnMilestoneDiamond,
  pointerOnMilestoneLabel,
  readAllKonvaTextContents,
  readKonvaTextsInMilestoneBand,
  readKonvaTextsInTimelineBody,
  readLightningVerticalClientXForRow,
  readMilestoneDiamondFill,
  readTaskBarKonvaForRow,
  requireKonva,
  rowHasOverdueKonvaStroke,
  strokeMatches,
} from "../helpers/konvaUi.ts";
import { wheelShiftHorizontalOnChart } from "../helpers/nav.ts";
import { dragRowGrip, taskSearchBox } from "../helpers/sidebar.ts";
import {
  enableAllSidebarColumns,
  importJsonInOpenSettings,
  openSettingsSection,
} from "../helpers/settings.ts";
import {
  bootNormalPage,
  colorsCatalogPath,
  colorsSchedulePath,
  fieldsRegressionPath,
  fullSchedulePath,
  manyTasksSchedulePath,
  levels3SchedulePath,
  lightningSchedulePath,
  lightningStatusesPath,
  manualColorsSchedulePath,
  membersRegressionPath,
  openScheduleFile,
  openSmokeSchedule,
  playgroundSchedulePath,
  readSidebarAppliedWidth,
  waitForFitToWidthSettled,
  waitForTitle,
} from "../helpers/session.ts";

const lightStatus = paletteFor("light").chart;

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
  await enableAllSidebarColumns(page);
  await page.setViewportSize({ width: 320, height: 700 });
  const row = page.locator(".sidebar-row.task", { hasText: "期限超過の作業" }).first();
  const label = row.locator(".row-label");
  const textSpan = label.locator(".row-label-text");
  await expect
    .poll(async () => {
      const overflow = await textSpan.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      const title = await label.getAttribute("title");
      return overflow && Boolean(title?.includes("期限超過の作業"));
    })
    .toBe(true);
  const labelBox = await label.boundingBox();
  if (!labelBox) throw new Error("label missing");
  await page.mouse.move(labelBox.x + 8, labelBox.y + 4);
  await expect(label).toHaveAttribute("title", /期限超過の作業/);
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
  await page.mouse.move(bBox.x + bBox.width / 2, bBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(bBox.x + 120, bBox.y + 40, { steps: 8 });
  await page.mouse.up();
  const wideSidebar = await page.locator(".sidebar").boundingBox();
  if (!wideSidebar) throw new Error("sidebar missing");
  await page.setViewportSize({ width: 400, height: 700 });
  const narrowedSidebar = await page.locator(".sidebar").boundingBox();
  if (!narrowedSidebar) throw new Error("sidebar missing");
  expect(narrowedSidebar.width).toBeLessThan(wideSidebar.width - 4);
  await page.setViewportSize({ width: 1280, height: 800 });
  const restoredSidebar = await page.locator(".sidebar").boundingBox();
  if (!restoredSidebar) throw new Error("sidebar missing");
  expect(restoredSidebar.width).toBeGreaterThan(narrowedSidebar.width);
});

test("does not reorder a filtered task, category, or group from the grip", async ({ page }) => {
  await openSmokeSchedule(page);
  const dragGripNoGhost = async (grip: ReturnType<typeof page.locator>) => {
    const box = await grip.boundingBox();
    if (!box) throw new Error("grip missing");
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + 4, box.y + 80, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator(".sidebar-drag-ghost")).toHaveCount(0);
  };
  await filterTasksByName(page, "設計");
  await expect.poll(async () => page.locator(".sidebar-row.task").count()).toBe(1);
  await dragGripNoGhost(page.locator(".sidebar-row.task .row-grip").first());
  await taskSearchBox(page).fill("");
  await filterTasksByName(page, "調査");
  await expect(page.locator(".sidebar-row.category", { hasText: "計画" })).toHaveCount(1);
  await expect(page.locator(".sidebar-row.category", { hasText: "空の分類" })).toHaveCount(0);
  await dragGripNoGhost(
    page.locator(".sidebar-row.category", { hasText: "計画" }).first().locator(".row-grip"),
  );
  await taskSearchBox(page).fill("");
  await filterTasksByName(page, "設計");
  await expect(page.locator(".sidebar-row", { hasText: "前半" })).toHaveCount(1);
  await expect(page.locator(".sidebar-row", { hasText: "後半" })).toHaveCount(0);
  await dragGripNoGhost(
    page.locator(".sidebar-row", { hasText: "前半" }).first().locator(".row-grip"),
  );
});

test("scrolls the highlighted milestone into view and leaves the value unchanged on Enter", async ({
  page,
}) => {
  await openScheduleFile(page, playgroundSchedulePath);
  await waitForTitle(page, "AI活用PoC推進プロジェクト（playground）");
  await taskSearchBox(page).fill("本番リリース");
  await selectTaskByName(page, "本番リリース");
  const milestone = page.locator("#detailMilestone");
  await expect(milestone).toHaveValue(/本番リリース（全社展開開始・運用移管）/);
  await milestone.click();
  const list = page.locator("#detailMilestone-list");
  await expect(list).toBeVisible();
  const active = list.locator("button.active");
  await expect(active).toBeVisible();
  const listBox = await list.boundingBox();
  const activeBox = await active.boundingBox();
  if (!listBox || !activeBox) throw new Error("milestone list geometry missing");
  expect(activeBox.y).toBeGreaterThanOrEqual(listBox.y - 1);
  expect(activeBox.y + activeBox.height).toBeLessThanOrEqual(listBox.y + listBox.height + 1);
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
  const progressField = page.locator("#detailProgress").locator("..");
  const progressWidth = await progressField.evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(noteWidth - progressWidth)).toBeLessThan(6);
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
  const pred = page.locator("#fieldPredecessors");
  await pred.click();
  await pred.fill("調");
  await expect(page.locator("#fieldPredecessors-list")).toBeVisible();
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
  await expect(pred).toBeFocused();
  await expect(page.locator("#fieldPredecessors-list")).toBeVisible({ timeout: 15_000 });
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
  await page.setViewportSize({ width: 480, height: 700 });
  await selectTaskByName(page, "草案");
  await expect(page.locator("#detailName")).toHaveValue("草案");
  await expect(page.locator("#detailName")).toHaveValue(/草案/);
  const pred = page.locator("#fieldPredecessors");
  await pred.click();
  await pred.fill("訪問");
  await expect(pred).toBeFocused();
  const option = page.locator("#fieldPredecessors-list [role='option']").first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  const relationLabel = page.locator(".relation-label").first();
  await expect(relationLabel).toHaveAttribute("title", /要件 \/ ヒアリング \/ 訪問1/);
  const ancestors = relationLabel.locator(".relation-ancestors");
  await expect(ancestors).toBeVisible();
  await expect
    .poll(async () =>
      ancestors.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === "ellipsis",
      ),
    )
    .toBe(true);
  await relationLabel.hover();
  await expect(relationLabel).toHaveAttribute("title", /要件 \/ ヒアリング \/ 訪問1/);
});

test("relaxes a done status filter when a task is added and selects the new row", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await selectTaskByName(page, "設計");
  const beforeCount = await page.locator(".sidebar-row.task").count();
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.locator(".filter-panel").getByLabel("ステータス").selectOption("done");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タスク名").fill("完了絞り込みの追加");
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task")).toHaveCount(beforeCount + 1);
  await expect(
    page.locator(".sidebar-row.task.selected", { hasText: "完了絞り込みの追加" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await expect(page.locator(".filter-panel").getByLabel("ステータス")).toHaveValue("all");
  await page.keyboard.press("Escape");
});

test("clears tag selection when a task is added under a tag filter", async ({ page }) => {
  await openSmokeSchedule(page);
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.getByPlaceholder("タグ名で検索").fill("回帰");
  await page.locator(".filter-panel-tag-option-label", { hasText: "回帰" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タスク名").fill("タグ絞り込みの追加");
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task", { hasText: "タグ絞り込みの追加" })).toBeVisible();
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await expect(page.locator(".filter-panel-tag-option-active")).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("removes the task and the predecessor line after the delete is confirmed", async ({
  page,
}) => {
  requireKonva();
  await openSmokeSchedule(page);
  const arrowsBefore = await countKonvaArrowsInTimelineBody(page);
  expect(arrowsBefore).toBeGreaterThanOrEqual(1);
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await confirmDelete(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  await expect.poll(async () => countKonvaArrowsInTimelineBody(page)).toBeLessThan(arrowsBefore);
});

test("adds no task on cancel or Escape and keeps the dialog open when the end is before the start", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  const countBefore = await page.locator(".sidebar-row.task").count();
  await openTaskBarContextMenu(page, "設計");
  await page
    .locator(".context-menu [role='menuitem']", {
      has: page.locator(".context-menu-label", { hasText: "複製" }),
    })
    .click();
  let dialog = page.getByRole("dialog", { name: "タスクを複製" });
  await dialog.getByLabel("タスク名").fill("複製キャンセル");
  await dialog.evaluate((panel) => {
    const cancel = [...panel.querySelectorAll(".modal-actions button")].find(
      (button) => button.textContent?.trim() === "キャンセル",
    );
    cancel?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task")).toHaveCount(countBefore);
  await openTaskBarContextMenu(page, "設計");
  await page
    .locator(".context-menu [role='menuitem']", {
      has: page.locator(".context-menu-label", { hasText: "複製" }),
    })
    .click();
  dialog = page.getByRole("dialog", { name: "タスクを複製" });
  const again = dialog;
  await again.getByLabel("タスク名").fill("複製Escape");
  await page.keyboard.press("Escape");
  await expect(again).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task")).toHaveCount(countBefore);
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("開始").fill("2026-04-10");
  await addDialog.getByLabel("終了").fill("2026-04-01");
  await addDialog.getByRole("button", { name: "追加" }).click();
  await expect(addDialog).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".sidebar-row.task")).toHaveCount(countBefore);
});

test("ties todo checks to progress, hides checks under the row, and omits todos from HTML and SVG", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "やること付き");
  await expect(page.locator("#detailProgress")).toHaveText("50%");
  await page.getByLabel("下書きを済みにする").check();
  await expect(page.locator("#detailProgress")).toHaveText("100%");
  const row = page.locator(".sidebar-row", { hasText: "やること付き" }).first();
  await expect(row.locator("input[type='checkbox']")).toHaveCount(0);
  const htmlPath = await exportWithFormat(page, "html");
  const html = readExportFile(htmlPath);
  expect(html).not.toMatch(/下書き.*checkbox/i);
  unlinkExportFile(htmlPath);
  const svgPath = await exportWithFormat(page, "svg");
  const svg = readExportFile(svgPath);
  expect(svg).not.toContain("下書き");
  unlinkExportFile(svgPath);
});

test("fills in-progress bars with a darker progress segment, done in green, and not-started in gray", async ({
  page,
}) => {
  requireKonva();
  await openScheduleFile(page, manualColorsSchedulePath);
  await waitForTitle(page, "操作マニュアル用の見本");
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await waitForFitToWidthSettled(page);
  const inProgress = await readTaskBarKonvaForRow(page, "進行中（青）");
  expect(inProgress?.progressFill).not.toBeNull();
  expect(fillMatches(inProgress!.fill ?? "", lightStatus.statusInProgress.bg)).toBe(true);
  expect(
    fillMatches(inProgress!.progressFill ?? "", lightStatus.statusInProgress.fill!),
  ).toBe(true);
  const done = await readTaskBarKonvaForRow(page, "完了（緑）");
  expect(fillMatches(done!.fill ?? "", lightStatus.statusDone.bg)).toBe(true);
  const notStarted = await readTaskBarKonvaForRow(page, "未着手（灰）");
  expect(fillMatches(notStarted!.fill ?? "", lightStatus.statusNotStarted.bg)).toBe(true);
});

test("scrolls milestone names to the right edge, ellipsizes past 24 characters, and shows the full name on hover", async ({
  page,
}) => {
  requireKonva();
  const fullName = "ステークホルダー合意形成（例外運用の了承）";
  await openScheduleFile(page, playgroundSchedulePath);
  await waitForTitle(page, "AI活用PoC推進プロジェクト（playground）");
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page
    .getByRole("group", { name: "表示の切り替え" })
    .getByRole("button", { name: "月", exact: true })
    .click();
  await page.setViewportSize({ width: 720, height: 700 });
  await page
    .getByRole("group", { name: "表示の切り替え" })
    .getByRole("button", { name: "月", exact: true })
    .click();
  for (let step = 0; step < 24; step += 1) {
    await wheelShiftHorizontalOnChart(page, step < 12 ? 650 : -650);
  }
  await expect
    .poll(async () => {
      const texts = await readAllKonvaTextContents(page);
      return texts.some((t) => t.includes("…") && t.length < fullName.length);
    })
    .toBe(true);
  const chartLabel = (await readAllKonvaTextContents(page)).find((t) => t.includes("…"));
  expect(chartLabel).toBeTruthy();
  expect((chartLabel?.length ?? fullName.length)).toBeLessThan(fullName.length);
  const pt = await pointerOnMilestoneLabel(page, chartLabel!);
  if (!pt) throw new Error("milestone label pointer missing");
  await page.mouse.move(pt.x, pt.y);
  const overlay = page.locator(".milestone-hover-overlay");
  await expect(overlay).toBeVisible({ timeout: 5_000 });
  const prefix = chartLabel!.replace(/…$/, "");
  const playgroundMilestones = [
    "事業部長承認（経営会議付議前の前提確認）",
    "契約締結・発注完了（調達・法務サインオフ済み）",
    "要件確定（スコープ・受入条件の合意）",
    "設計レビュー完了（アーキテクチャサインオフ）",
    "PoC完了（評価指標クリア・次フェーズ判定）",
    "本番リリース（全社展開開始・運用移管）",
    fullName,
  ];
  const hoveredFull =
    playgroundMilestones.find((name) => name.startsWith(prefix)) ?? fullName;
  await expect(overlay).toContainText(hoveredFull);
  expect(hoveredFull.length).toBeGreaterThan(chartLabel!.length);
});

test("matches overdue borders, overrun frames, and lightning folds to isOverdue and lightningDate for the page today", async ({
  page,
}) => {
  requireKonva();
  await openScheduleFile(page, lightningSchedulePath);
  await waitForTitle(page, "イナズマ線の確認用");
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, lightningStatusesPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  await page.keyboard.press("Escape");
  await enableAllSidebarColumns(page);
  await openSettingsSection(page, "表示");
  await page.getByLabel("イナズマ線を表示").check();
  await expect(page.getByLabel("イナズマ線を表示")).toBeChecked();
  await page.keyboard.press("Escape");
  const overdueTask = { status: "not-started", end: "2026-10-16" };
  expect(await evaluateOverdueForTask(page, overdueTask)).toBe(true);
  await selectTaskByName(page, "未着手・終了後");
  await expect(
    page.locator(".sidebar-row.task .row-label.overdue", { hasText: "未着手・終了後" }),
  ).toBeVisible();
  const bar = await readTaskBarKonvaForRow(page, "未着手・終了後");
  expect(bar).not.toBeNull();
  expect(strokeMatches(bar!.fill ?? "", lightStatus.statusNotStarted.bg)).toBe(true);
  expect(await rowHasOverdueKonvaStroke(page, "未着手・終了後")).toBe(true);
  const lightningTask = { start: "2026-10-06", end: "2026-11-06", status: "not-started" };
  const foldDate = await evaluateLightningIsoForTask(page, lightningTask);
  expect(foldDate.length).toBeGreaterThan(0);
  await page
    .getByRole("group", { name: "表示の切り替え" })
    .getByRole("button", { name: "日", exact: true })
    .click();
  await selectTaskByName(page, "未着手・期間中");
  const endIso = await page.locator("#detailEnd").inputValue();
  expect(foldDate).toBe(endIso);
  const foldX = await readLightningVerticalClientXForRow(
    page,
    "未着手・期間中",
    lightStatus.lightning,
  );
  expect(foldX).not.toBeNull();
  const barPointer = await pointerOnTaskBar(page, "未着手・期間中");
  const { x: barEndX } = await clickPeriodEdgeWithoutSelecting(page, "未着手・期間中");
  expect(foldX!).toBeGreaterThan(barPointer.x + 12);
  expect(Math.abs(foldX! - barEndX)).toBeLessThan(180);
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await selectTaskByName(page, "調査");
  await page.locator("#detailEnd").fill("2026-05-10");
  await page.locator("#detailEnd").press("Tab");
  await enableAllSidebarColumns(page);
  const surveyRow = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  await expect(surveyRow.locator("[aria-label='超過']")).toBeVisible();
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
  const svgPath = await exportWithFormat(page, "svg");
  const svg = readExportFile(svgPath);
  expect(svg).toContain("未割当");
  unlinkExportFile(svgPath);
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
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "調査");
  await page.locator("#detailEnd").fill("2026-05-10");
  await page.locator("#detailEnd").press("Tab");
  const overrunRow = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  await expect(overrunRow.locator("[aria-label='超過']")).toBeVisible();
  await expect(overrunRow.locator(".sidebar-col.confidence", { hasText: "未確定" })).toHaveCount(0);
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
  await openScheduleFile(page, colorsSchedulePath);
  await waitForTitle(page, "色の一覧で行の地（VIEW-14）");
  await openSettingsSection(page, "色");
  await importJsonInOpenSettings(page, colorsCatalogPath);
  await page.getByRole("radio", { name: /colors/ }).click();
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "load" });
  await openScheduleFile(page, colorsSchedulePath);
  const rowBg = async (label: string) =>
    page.locator(".sidebar-row.task", { hasText: label }).first().evaluate((el) => {
      const style = el.getAttribute("style") ?? "";
      if (style.includes("background")) return style;
      return getComputedStyle(el).backgroundColor;
    });
  const noneStyle = await rowBg("色なし（今の地のまま）");
  const missingStyle = await rowBg("一覧に無い色（塗らない）");
  expect(missingStyle).not.toMatch(/fef3c7|dbeafe/i);
  expect(noneStyle).not.toMatch(/fef3c7|dbeafe/i);
  const focusStyle = await rowBg("注力（黄の地、進行中のバー）");
  expect(focusStyle).toMatch(/fef3c7|254\s*,\s*243\s*,\s*199/i);
  const waitStyle = await rowBg("待ち（青の地、完了のバー）");
  expect(waitStyle).toMatch(/dbeafe|219\s*,\s*234\s*,\s*254/i);
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
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
  await selectTaskByName(page, "調査");
  await expect(page.locator("#detailNote")).toHaveValue("回帰確認用のノート");
  await selectTaskByName(page, "設計");
  await expect(page.locator(".relation-list", { hasText: "調査" })).toBeVisible();
});

test("removes the survey on redo and restores it again on undo, with the selection still empty", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "調査");
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await confirmDelete(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toBeVisible();
  await clickRedoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toBeVisible();
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(0);
});

// TC-EDIT-01b: covered by smoke-edit-drag.spec.ts "clears the selection when the filter changes"
// TC-EDIT-16e/17e: translucent grip drag covered by hierarchy-reorder.spec.ts
// TC-NAV-07: covered by layout-f2.spec.ts after KeyK fix
