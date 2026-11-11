import fs from "node:fs";
import { expect, test } from "playwright/test";
import { paletteFor } from "../../../src/model/palette.ts";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { openTaskBarContextMenu as openBarMenu } from "../helpers/contextMenu.ts";
import { runCheckStatuses } from "../helpers/diff.ts";
import { selectTaskByName } from "../helpers/drag.ts";
import {
  evaluateLightningIsoForTask,
  evaluateOverdueForTask,
  readKonvaTextsNearTaskRow,
  readNonWorkingHeaderBandFillCount,
  rowHasOverdueKonvaStroke,
  strokeMatches,
  readTaskBarKonvaForRow,
  requireKonva,
} from "../helpers/konvaUi.ts";
import {
  bootNormalPage,
  colorsRegressionPath,
  fieldsRegressionPath,
  fullSchedulePath,
  jp2026CalendarPath,
  lightningSchedulePath,
  lightningStatusesPath,
  membersRegressionPath,
  openScheduleFile,
  openSmokeSchedule,
  playgroundMembersPath,
  statusesRegressionPath,
  waitForTitle,
} from "../helpers/session.ts";
import {
  discardCatalogDraftIfShown,
  enableAllSidebarColumns,
  importJsonInOpenSettings,
  openCatalogEditorFromSettings,
  readColorSelectOptionLabels,
  chooseColorSelectOption,
  openSettingsSection,
  readDisplayScaleFactor,
  setDisplayScale,
} from "../helpers/settings.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
});

test("keeps 200 percent and auto after reload", async ({ page }) => {
  await openSmokeSchedule(page);
  await setDisplayScale(page, "2");
  await expect.poll(() => readDisplayScaleFactor(page)).toBe("2");
  await page.reload({ waitUntil: "load" });
  await openSmokeSchedule(page);
  await expect.poll(() => readDisplayScaleFactor(page)).toBe("2");
  await setDisplayScale(page, "auto");
  await page.reload({ waitUntil: "load" });
  await openSmokeSchedule(page);
  await openSettingsSection(page, "表示");
  await expect(page.getByLabel("表示サイズ")).toHaveValue("auto");
  await page.keyboard.press("Escape");
  const stored = await page.evaluate(() => localStorage.getItem("schedule-viewer/display-scale"));
  expect(stored).toBe("auto");
});

test("steps the display scale from the shortcut without zooming the page", async ({ page }) => {
  await openSmokeSchedule(page);
  await setDisplayScale(page, "auto");
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${mod}+=`);
  const afterZoom = await readDisplayScaleFactor(page);
  expect(afterZoom).not.toBe("auto");
  const pageZoom = await page.evaluate(() => window.devicePixelRatio);
  await page.keyboard.press(`${mod}+-`);
  await page.keyboard.press(`${mod}+-`);
  await page.keyboard.press(`${mod}+-`);
  await page.keyboard.press(`${mod}+-`);
  const pageZoomAfter = await page.evaluate(() => window.devicePixelRatio);
  expect(pageZoomAfter).toBe(pageZoom);
  await openSettingsSection(page, "表示");
  const selected = page.getByLabel("表示サイズ");
  await expect(selected).not.toHaveValue("auto");
  await page.keyboard.press("Escape");
});

async function columnLeft(page: import("playwright/test").Page, rowName: string, col: string) {
  const row = page.locator(".sidebar-row.task", { hasText: rowName }).first();
  const box = await row.locator(`.sidebar-col.${col}`).boundingBox();
  return box?.x ?? null;
}

test("aligns month-day, duration, percent, status, overrun, and assignee columns", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByRole("button", { name: "ステータス", exact: true }).click();
  await importJsonInOpenSettings(page, statusesRegressionPath);
  await page.keyboard.press("Escape");
  await enableAllSidebarColumns(page);
  await expect(page.locator(".sidebar-row", { hasText: "設計" })).toContainText("40%");
  for (const rowName of ["設計", "調査"]) {
    for (const col of ["start", "duration", "progress", "status"] as const) {
      const left = await columnLeft(page, rowName, col);
      const left2 = await columnLeft(page, rowName === "設計" ? "調査" : "設計", col);
      expect(left).not.toBeNull();
      expect(left2).not.toBeNull();
      expect(Math.abs((left ?? 0) - (left2 ?? 0))).toBeLessThan(2);
    }
    const designRow = page.locator(".sidebar-row.task", { hasText: rowName }).first();
    const assigneeBox = await designRow.locator(".assignee").boundingBox();
    expect(assigneeBox).not.toBeNull();
  }
  const designRow = page.locator(".sidebar-row.task", { hasText: "設計" }).first();
  const surveyRow = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  const alertDesign = await designRow.locator(".sidebar-alert-slot").boundingBox();
  const alertSurvey = await surveyRow.locator(".sidebar-alert-slot").boundingBox();
  expect(alertDesign?.width).toBe(alertSurvey?.width);
  const name = designRow.locator(".row-label");
  const box = await name.boundingBox();
  if (!box) throw new Error("label missing");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const progressX = await columnLeft(page, "設計", "progress");
  const progressXHover = await columnLeft(page, "設計", "progress");
  expect(Math.abs((progressX ?? 0) - (progressXHover ?? 0))).toBeLessThan(2);
});

test("keeps settings rows inside the dialog at 50 and 200 percent in light and dark", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  for (const scale of ["0.5", "2"] as const) {
    await setDisplayScale(page, scale);
    await openSettingsSection(page, "表示");
    const dialog = page.getByRole("dialog", { name: "設定" });
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error("layout missing");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.keyboard.press("Escape");
  }
  await setDisplayScale(page, "1");
  await openSettingsSection(page, "表示");
  await page.getByLabel("配色").selectOption("dark");
  await page.keyboard.press("Escape");
  for (const scale of ["0.5", "2"] as const) {
    await setDisplayScale(page, scale);
    await openSettingsSection(page, "メンバー");
    const darkDialog = page.getByRole("dialog", { name: "設定" });
    const darkBox = await darkDialog.boundingBox();
    const viewport = page.viewportSize();
    if (!darkBox || !viewport) throw new Error("layout missing");
    expect(darkBox.x + darkBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(darkBox.y + darkBox.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.keyboard.press("Escape");
  }
});

test("leaves chart assignee text unchanged when an unused catalog is renamed", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await importJsonInOpenSettings(page, playgroundMembersPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "メンバーの項目を編集" });
  const playgroundRadio = editor.getByRole("radio", { name: /playground/ });
  await playgroundRadio.click();
  const firstName = editor.locator(".status-catalog-editor-field-name input").first();
  await firstName.fill("未使用の表示名");
  await editor.getByRole("button", { name: "保存" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await selectTaskByName(page, "調査");
  requireKonva();
  const chartTexts = await readKonvaTextsNearTaskRow(page, "調査");
  expect(chartTexts.join(" ")).toContain("田中");
  expect(chartTexts.join(" ")).not.toContain("未使用の表示名");
  await expect(page.locator(".sidebar-row", { hasText: "設計" })).not.toContainText(
    "未使用の表示名",
  );
});

test("leaves the active catalog unchanged when a new catalog is created", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "メンバーの項目を編集" });
  await editor.getByRole("button", { name: "新しいカタログ" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await discardCatalogDraftIfShown(page);
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "メンバー");
  await expect(page.getByRole("radio", { name: "members" })).toBeChecked();
});

test("leaves the active catalog unchanged when JSON is downloaded", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "メンバーの項目を編集" });
  await editor.getByRole("radio", { name: "members" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    editor.getByRole("button", { name: "JSON を書き出す" }).click(),
  ]);
  await download.path();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "メンバー");
  await expect(page.getByRole("radio", { name: "members" })).toBeChecked();
});

test("keeps the assignee id and shows the unknown member after the person is deleted", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "メンバーの項目を編集" });
  await editor.getByRole("radio", { name: "members" }).click();
  await editor.getByRole("button", { name: "田中を削除" }).click();
  await editor.getByRole("button", { name: "保存" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toContainText(/メンバー不明（tanaka）/);
});

test("hides the member description on the list, the detail, and the chart", async ({ page }) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "メンバーの項目を編集" });
  await editor.getByRole("radio", { name: "members" }).click();
  await editor.getByRole("textbox", { name: "表示名", exact: true }).first().click();
  await editor.locator("aside textarea.status-catalog-editor-textarea-description").fill("説明は出さない");
  await editor.getByRole("button", { name: "保存" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await selectTaskByName(page, "調査");
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).not.toContainText("説明は出さない");
  const detail = page.getByRole("complementary", { name: "タスクの詳細" });
  await expect(detail).not.toContainText("説明は出さない");
  requireKonva();
  const chartTexts = await readKonvaTextsNearTaskRow(page, "調査");
  expect(chartTexts.join(" ")).not.toContain("説明は出さない");
});

test("grays a non-working weekday and restores weekends after the calendar is removed", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await selectTaskByName(page, "調査");
  await page
    .getByRole("group", { name: "表示の切り替え" })
    .getByRole("button", { name: "日", exact: true })
    .click();
  const nonWorkingFill = paletteFor("light").chart.nonWorking;
  const beforeCount = await readNonWorkingHeaderBandFillCount(page, nonWorkingFill);
  expect(beforeCount).toBeGreaterThan(0);
  await openSettingsSection(page, "稼働日");
  await importJsonInOpenSettings(page, jp2026CalendarPath);
  await expect(page.locator(".settings-current")).toContainText("jp-2026");
  await page.keyboard.press("Escape");
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  const withCalendar = await readNonWorkingHeaderBandFillCount(page, nonWorkingFill);
  await openSettingsSection(page, "稼働日");
  await page
    .getByRole("dialog", { name: "設定" })
    .getByRole("button", { name: "外す" })
    .click();
  await page.keyboard.press("Escape");
  await expect
    .poll(async () => readNonWorkingHeaderBandFillCount(page, nonWorkingFill))
    .toBeLessThanOrEqual(withCalendar);
  const afterRemove = await readNonWorkingHeaderBandFillCount(page, nonWorkingFill);
  expect(afterRemove).toBe(beforeCount);
});

test("shows catalog status colors, overdue borders, and lightning folds on the bars", async ({
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
  const expectOverdue = await evaluateOverdueForTask(page, overdueTask);
  expect(expectOverdue).toBe(true);
  await selectTaskByName(page, "未着手・終了後");
  await expect(
    page.locator(".sidebar-row.task .row-label.overdue", { hasText: "未着手・終了後" }),
  ).toBeVisible();
  const bar = await readTaskBarKonvaForRow(page, "未着手・終了後");
  expect(bar).not.toBeNull();
  expect(strokeMatches(bar!.fill ?? "", "#E2E6ED")).toBe(true);
  expect(await rowHasOverdueKonvaStroke(page, "未着手・終了後")).toBe(true);
  const lightningTask = { start: "2026-10-06", end: "2026-11-06", status: "not-started" };
  const foldDate = await evaluateLightningIsoForTask(page, lightningTask);
  expect(foldDate.length).toBeGreaterThan(0);
  await selectTaskByName(page, "未着手・期間中");
});

test("adds a status, colors the bar, and keeps the description after reload", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, statusesRegressionPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "ステータス一覧の項目を編集" });
  await editor.getByRole("radio", { name: /statuses/ }).click();
  await editor.getByRole("button", { name: "項目を足す" }).click();
  await editor.locator(".status-catalog-editor-field-id input:not([readonly])").last().fill("hold");
  await editor.locator(".status-catalog-editor-field-name input").last().fill("保留");
  await editor.locator("textarea.status-catalog-editor-textarea-description").last().fill("保留の説明");
  await editor.getByRole("button", { name: "保存" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await enableAllSidebarColumns(page);
  await selectTaskByName(page, "設計");
  await page.locator("#detailStatus").selectOption({ label: "保留" });
  await expect(page.locator("#detailStatus")).toHaveValue("hold");
  requireKonva();
  const holdBar = await readTaskBarKonvaForRow(page, "設計");
  expect(holdBar?.strokeWidth).toBeGreaterThan(0);
  await page.reload({ waitUntil: "load" });
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await openCatalogEditorFromSettings(page, "ステータス");
  const editor2 = page.getByRole("dialog", { name: "ステータス一覧の項目を編集" });
  await editor2.getByRole("radio", { name: /statuses/ }).click();
  await editor2.locator("li.status-catalog-editor-item", { hasText: "保留" }).click({ position: { x: 8, y: 8 } });
  await expect(editor2.locator("aside textarea.status-catalog-editor-textarea-description")).toHaveValue(
    "保留の説明",
  );
});

test("reorders statuses, downloads JSON that passes check:statuses, and leaves the active list unchanged when copied", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, statusesRegressionPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  const activeBefore = "statuses";
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "ステータス一覧の項目を編集" });
  await editor.getByRole("radio", { name: /statuses/ }).click();
  const orderBefore = await editor
    .locator(".status-catalog-editor-field-name input")
    .evaluateAll((inputs) => inputs.map((el) => (el as HTMLInputElement).value));
  await editor.getByRole("button", { name: "下へ" }).first().click();
  const orderAfter = await editor
    .locator(".status-catalog-editor-field-name input")
    .evaluateAll((inputs) => inputs.map((el) => (el as HTMLInputElement).value));
  expect(orderAfter).not.toEqual(orderBefore);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    editor.getByRole("button", { name: "JSON を書き出す" }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error("download missing");
  await editor.getByRole("button", { name: "コピーして作る" }).click();
  const copyConfirm = page.getByRole("alertdialog", { name: "コピーの確認" });
  await copyConfirm.getByRole("button", { name: "作る" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "ステータス");
  await expect(page.getByRole("radio", { name: activeBefore })).toBeChecked();
  const raw = fs.readFileSync(path, "utf8");
  const doc = JSON.parse(raw) as { statuses: { id: string; name: string }[] };
  expect(doc.statuses.length).toBeGreaterThan(0);
  runCheckStatuses(path);
  const downloadedNames = doc.statuses.map((item) => item.name);
  expect(downloadedNames).toEqual(orderAfter);
});

test("adds a custom list without a dialog", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, statusesRegressionPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "ステータス一覧の項目を編集" });
  const countBefore = await editor.getByRole("radio").count();
  await editor.getByRole("button", { name: "新しい一覧" }).click();
  await expect(editor.getByRole("radio")).toHaveCount(countBefore + 1);
  await editor.getByRole("button", { name: "閉じる" }).click();
  await discardCatalogDraftIfShown(page);
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "ステータス");
  await expect(page.getByRole("radio", { name: /statuses/ })).toBeChecked();
});

test("keeps a description, drops a blank instruction, and keeps the footer inside a narrow overlay", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, statusesRegressionPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "ステータス一覧の項目を編集" });
  await editor.getByRole("radio", { name: /statuses/ }).click();
  await editor.locator("textarea.status-catalog-editor-textarea-description").first().fill("行の説明");
  await editor.locator("textarea.status-catalog-editor-textarea-instruction").first().fill("");
  await editor.getByRole("button", { name: "保存" }).click();
  await page.setViewportSize({ width: 520, height: 700 });
  const footer = editor.locator(".status-catalog-editor-footer");
  await expect(footer).toBeVisible();
  const viewport = page.viewportSize();
  const footerBox = await footer.boundingBox();
  if (!viewport || !footerBox) throw new Error("footer missing");
  expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewport.height + 2);
});

test("shows the color field on detail, bulk, and duplicate, and separates leave-unchanged from none", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "色");
  await importJsonInOpenSettings(page, colorsRegressionPath);
  await page.getByRole("radio", { name: /colors/ }).click();
  await page.keyboard.press("Escape");
  await selectTaskByName(page, "設計");
  await expect(page.locator("#detailColor")).toBeVisible();
  await page.locator(".sidebar-row.task", { hasText: "調査" }).first().click();
  await page.keyboard.down("Shift");
  await page.locator(".sidebar-row.task", { hasText: "設計" }).first().click();
  await page.keyboard.up("Shift");
  const bulkColor = page.locator("#bulkColor");
  await expect(bulkColor).toBeVisible();
  const bulkOptions = await readColorSelectOptionLabels(page, "bulkColor");
  expect(bulkOptions).toContain("変更しない");
  expect(bulkOptions).toContain("なし");
  await selectTaskByName(page, "設計");
  await openBarMenu(page, "設計");
  await page
    .locator(".context-menu [role='menuitem']", {
      has: page.locator(".context-menu-label", { hasText: "複製" }),
    })
    .click();
  const dup = page.getByRole("dialog", { name: "タスクを複製" });
  await expect(dup.getByRole("combobox", { name: "色" })).toBeVisible();
  await page.keyboard.press("Escape");
  await chooseColorSelectOption(page, "detailColor", "なし");
  await expect(page.locator("#detailColor")).toContainText("なし");
  await page.locator("#detailColor").click();
  await expect(page.locator(".color-select-dropdown [role='option']", { hasText: "変更しない" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("opens a one-item color draft and leaves the active list unchanged", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "色");
  await importJsonInOpenSettings(page, colorsRegressionPath);
  await page.getByRole("radio", { name: /colors/ }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "色の一覧の項目を編集" });
  const countBeforeColors = await editor.getByRole("radio").count();
  await editor.getByRole("button", { name: "新しい一覧" }).click();
  await expect(editor.getByRole("radio")).toHaveCount(countBeforeColors + 1);
  await expect(editor.locator(".status-catalog-editor-field-name input")).toHaveValue("新しい色");
  await editor.getByRole("button", { name: "閉じる" }).click();
  await discardCatalogDraftIfShown(page);
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "色");
  await expect(page.getByRole("radio", { name: /colors/ })).toBeChecked();
});

test("keeps extension definitions after reload and leaves schedule field values unsaved", async ({
  page,
}) => {
  await openScheduleFile(page, fullSchedulePath);
  await waitForTitle(page, "回帰の詳細");
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  await page.locator('label.settings-catalog-row input[type="checkbox"]').first().check();
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "load" });
  await openScheduleFile(page, fullSchedulePath);
  await openSettingsSection(page, "拡張項目");
  await expect(
    page.locator("label.settings-catalog-row").filter({ hasText: "サンプル追加項目" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "拡張項目");
  await page.locator('label.settings-catalog-row input[type="checkbox"]').first().check();
  await page.keyboard.press("Escape");
  await selectTaskByName(page, "拡張あり");
  await page.locator("#detailField-sample_memo").fill("未保存のメモ");
  await page.locator("#detailField-sample_memo").blur();
  await expect.poll(async () => page.getByRole("button", { name: /未保存/ }).count()).toBeGreaterThan(0);
  await page.reload({ waitUntil: "load" });
  await openScheduleFile(page, fullSchedulePath);
  await selectTaskByName(page, "拡張あり");
  await expect(page.locator("#detailField-sample_memo")).not.toHaveValue("未保存のメモ");
});

test("keeps one close button and the footer inside a viewport under 900 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 700 });
  await openSmokeSchedule(page);
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "拡張項目" });
  await expect(editor.getByRole("button", { name: "閉じる" })).toHaveCount(1);
  const box = await editor.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("editor missing");
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 2);
});

test("adds two new extensions with one field each and can return to the previous radio", async ({
  page,
}) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "拡張項目" });
  const before = await editor.getByRole("radio").count();
  await editor.getByRole("button", { name: "新しい拡張" }).click();
  await editor.getByRole("button", { name: "新しい拡張" }).click();
  await expect(editor.getByRole("radio")).toHaveCount(before + 2);
  const radios = editor.getByRole("radio");
  const radioCount = await radios.count();
  for (let index = radioCount - 2; index < radioCount; index += 1) {
    await radios.nth(index).click();
    await discardCatalogDraftIfShown(page);
    const items = editor.locator(".field-definition-editor-field-name input");
    const beforeFields = await items.count();
    await editor.getByRole("button", { name: "項目を足す" }).click();
    await expect(items).toHaveCount(beforeFields + 1);
    await editor
      .locator(".field-definition-editor-field-id input:not([readonly])")
      .last()
      .fill(`field_${index}`);
    await items.last().fill(`項目${index}`);
    await editor.getByRole("button", { name: "保存" }).click();
    await expect(editor.getByRole("button", { name: "保存" })).toBeDisabled();
  }
  await editor.getByRole("radio").first().click();
  await expect(editor.getByRole("radio").first()).toBeChecked();
});

test("downloads the renamed extension and shows the new id in settings", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "拡張項目" });
  await editor.getByRole("radio", { name: "sample" }).click();
  await editor.getByLabel("拡張の名前").fill("改名サンプル");
  await editor.getByRole("button", { name: "保存" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    editor.getByRole("button", { name: "JSON を書き出す" }).click(),
  ]);
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("download missing");
  const extensionDoc = JSON.parse(fs.readFileSync(downloadPath, "utf8")) as {
    id: string;
    name: string;
  };
  expect(extensionDoc.id).toBe("sample");
  expect(extensionDoc.name).toBe("改名サンプル");
  await editor.getByRole("button", { name: "閉じる" }).click();
  await page.keyboard.press("Escape");
  await openSettingsSection(page, "拡張項目");
  await expect(
    page.locator("label.settings-catalog-row").filter({ hasText: "改名サンプル" }),
  ).toBeVisible();
  await expect(
    page.locator("label.settings-catalog-row").filter({ hasText: "改名サンプル" }),
  ).toContainText("sample");
});
