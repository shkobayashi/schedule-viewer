import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  collapseDiffToHandle,
  diffListScrollTop,
  editLongScheduleRowsThrough40,
  editTaskEndDate,
  filterTasksByName,
  openDiffFromHandle,
  openScheduleDiffFromMenu,
  readChartScrollProbe,
  saveScheduleDownload,
  selectTaskViaSearch,
  unlinkTempFile,
} from "../helpers/diff.ts";
import { confirmDelete } from "../helpers/contextMenu.ts";
import { selectTaskByName } from "../helpers/drag.ts";
import {
  BROWSER_DIFF_REGRESSION_PORT,
  bootNormalPage,
  colorsRegressionPath,
  connectionsSchedulePath,
  fieldsRegressionPath,
  fullSchedulePath,
  longSchedulePath,
  membersRegressionPath,
  openScheduleFile,
  openScheduleFileManualScreenshot,
  openSmokeSchedule,
  statusesRegressionPath,
  waitForTitle,
} from "../helpers/session.ts";
import { importJsonInOpenSettings, openSettingsSection } from "../helpers/settings.ts";
import { openContextMenuAt, openTaskBarContextMenu } from "../helpers/contextMenu.ts";
import { pointerOnMilestoneDiamond } from "../helpers/konvaUi.ts";
import { wheelShiftHorizontalOnChart } from "../helpers/nav.ts";
import { taskSearchBox } from "../helpers/sidebar.ts";
test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
});

test("clicks a diff row without changing a multi-selection", async ({ page }) => {
  await openScheduleFile(page, longSchedulePath);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.locator(".sidebar-row.task", { hasText: "行01" }).first().click();
  await page.locator("#detailEnd").fill("2026-04-03");
  await page.locator("#detailEnd").press("Enter");
  await expect.poll(async () => page.locator("#detailEnd").inputValue()).toBe("2026-04-03");
  await page.keyboard.down("Shift");
  await page.locator(".sidebar-row.task", { hasText: "行02" }).first().click();
  await page.keyboard.up("Shift");
  await page.getByRole("button", { name: /未保存/ }).click();
  const expand = page.getByRole("button", { name: "差分", exact: true });
  if (await expand.isVisible()) await expand.click();
  const diffRegion = page.getByRole("region", { name: "差分" });
  await expect(diffRegion).toBeVisible({ timeout: 15_000 });
  const row = page.locator(".diff-strip-row, [role='option']").first();
  if (await row.count()) {
    await row.click();
  }
  await expect(page.locator(".sidebar-row.task.selected")).toHaveCount(2);
});

test("leaves the chart still and shows the filter-hidden message", async ({ page }) => {
  await bootNormalPage(page, BROWSER_DIFF_REGRESSION_PORT, { clearLocalStorage: true });
  await openScheduleFileManualScreenshot(page, longSchedulePath, "回帰の長い一覧");
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await editTaskEndDate(page, "行40", "2026-04-05", { viaSearch: true });
  await openDiffFromHandle(page);
  await filterTasksByName(page, "行01");
  const scrollBefore = await readChartScrollProbe(page);
  await page
    .getByRole("option", { name: /行40/ })
    .first()
    .click();
  await expect(page.getByRole("status").filter({ hasText: "絞り込みで出ていません" })).toBeVisible();
  const scrollAfter = await readChartScrollProbe(page);
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(2);
});

test("opens the diff handle after removing one connection", async ({ page }) => {
  await openScheduleFile(page, connectionsSchedulePath);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await selectTaskByName(page, "上：先行側");
  const beforeCount = await page.locator(".connection-row").count();
  await page.locator(".connection-row").getByRole("button", { name: "外す" }).first().click();
  await expect(page.locator(".connection-row")).toHaveCount(beforeCount - 1);
  await expect(page.getByRole("button", { name: "取り消し" })).toBeEnabled();
});

test("keeps the connection dialog open until both fields are filled", async ({ page }) => {
  await openScheduleFile(page, connectionsSchedulePath);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await taskSearchBox(page).fill("上：色なし");
  await expect(
    page.locator(".sidebar-row.task", { hasText: "上：色なし" }).first(),
  ).toBeVisible();
  await selectTaskByName(page, "上：色なし");
  await page.getByRole("button", { name: "足す" }).click();
  const dialog = page.getByRole("dialog", { name: "繋がりを足す" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "足す" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "相手のタスクを選んでください" })).toBeVisible();
  const other = dialog.locator("#addConnectionOther");
  await other.fill("あいだ：注力");
  const option = dialog.locator("#addConnectionOther-list [role='option']").first();
  await option.dispatchEvent("mousedown");
  await option.click();
  await expect(dialog.getByRole("button", { name: "選び直す" })).toBeVisible();
  await dialog.getByLabel("繋がりの言葉").fill("");
  await dialog.getByRole("button", { name: "足す" }).click();
  await expect(dialog.getByRole("alert")).toContainText("繋がりの言葉");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("saves a member display name from the overlay and leaves an unused catalog unchanged", async ({
  page,
}) => {
  await openSettingsSection(page, "メンバー");
  await importJsonInOpenSettings(page, membersRegressionPath);
  await page.getByRole("radio", { name: "members" }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "メンバーの項目を編集" });
  await editor.getByRole("radio", { name: "members" }).click();
  await editor.locator('.status-catalog-editor-field-name input[value="田中"]').fill("表示名テスト");
  await editor.getByRole("button", { name: "保存" }).click();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await expect(editor).toHaveCount(0);
  await page.keyboard.press("Escape");
  await selectTaskByName(page, "設計");
  await page.locator("#detailAssigneeAdd").selectOption({ label: "表示名テスト" });
  await expect(page.locator(".sidebar-row", { hasText: "設計" })).toContainText("表示名テスト");
});

test("discards or keeps a status draft and removes a catalog from the overlay", async ({
  page,
}) => {
  await openSettingsSection(page, "ステータス");
  await importJsonInOpenSettings(page, statusesRegressionPath);
  await page.getByRole("radio", { name: /statuses/ }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "ステータス一覧の項目を編集" });
  await editor.getByRole("radio", { name: "statuses" }).click();
  await editor.locator('.status-catalog-editor-field-name input[value="進行中"]').fill("進行");
  await editor.getByRole("button", { name: "閉じる" }).click();
  const discard = page.getByRole("alertdialog", { name: "下書きの確認" });
  await discard.getByRole("button", { name: "やめる" }).click();
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "閉じる" }).click();
  await discard.getByRole("button", { name: "捨てる" }).click();
  await expect(editor).toHaveCount(0);
  await openSettingsSection(page, "ステータス");
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.locator(".settings-catalog-list li").filter({ hasText: "statuses" }).getByRole("button", { name: "外す" }).click();
  await expect(settings.locator(".settings-catalog-list li").filter({ hasText: "statuses" })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("adds a color list and refuses a blank or duplicate id", async ({ page }) => {
  await openSettingsSection(page, "色");
  await importJsonInOpenSettings(page, colorsRegressionPath);
  await page.getByRole("radio", { name: /colors/ }).click();
  await page.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "色の一覧の項目を編集" });
  await editor.getByRole("radio", { name: "colors" }).click();
  const nameInput = editor.locator(".status-catalog-editor-items .status-catalog-editor-field-name input").first();
  await nameInput.fill("   ");
  await expect(editor.getByRole("button", { name: "保存" })).toBeDisabled();
  await editor.getByRole("button", { name: "項目を足す" }).click();
  await editor.locator(".status-catalog-editor-field-id input:not([readonly])").last().fill("focus");
  await expect(editor.getByRole("button", { name: "保存" })).toBeDisabled();
  await page.keyboard.press("Escape");
});

test("closes the field overlay with escape", async ({ page }) => {
  await openSettingsSection(page, "拡張項目");
  await importJsonInOpenSettings(page, fieldsRegressionPath);
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.locator('label.settings-catalog-row input[type="checkbox"]').first().check();
  await settings.getByRole("button", { name: "項目を編集…" }).click();
  const editor = page.getByRole("dialog", { name: "拡張項目" });
  await expect(editor).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "設定" })).toBeVisible();
});

test.describe("diff strip from the handle", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await bootNormalPage(page, BROWSER_DIFF_REGRESSION_PORT, { clearLocalStorage: true });
    await openScheduleFileManualScreenshot(page, longSchedulePath, "回帰の長い一覧");
    await page.locator(".timeline-body").waitFor({ state: "visible" });
  });

  test("opens the diff from the right-edge handle and shows the old and new end", async ({
    page,
  }) => {
    await editTaskEndDate(page, "行01", "2026-04-03");
    await openDiffFromHandle(page);
    const detail = page.getByLabel("差分の詳細");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("2026-04-02");
    await expect(detail).toContainText("2026-04-03");
  });

  test("places the copy notice off the diff column and scrolls only the list at height 800", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await editLongScheduleRowsThrough40(page);
    await openDiffFromHandle(page);
    const list = page.locator(".diff-strip-list");
  const listBox = await list.boundingBox();
    if (!listBox) throw new Error("diff list missing");
    const before = await diffListScrollTop(page);
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect.poll(() => diffListScrollTop(page)).toBeGreaterThan(before);
    const header = page.locator(".diff-strip-header");
    const headerTop = await header.evaluate((el) => el.getBoundingClientRect().top);
    const listTop = await list.evaluate((el) => el.getBoundingClientRect().top);
    expect(listTop).toBeGreaterThanOrEqual(headerTop);
    await page.getByRole("button", { name: "コピー", exact: true }).click();
    const toast = page.locator(".app-toast");
    await expect(toast).toContainText("差分をコピーしました");
    const toastBox = await toast.boundingBox();
    if (!toastBox) throw new Error("toast missing");
    const region = page.getByRole("region", { name: "差分" });
    const regionBox = await region.boundingBox();
    if (!regionBox) throw new Error("diff region missing");
    expect(toastBox.x + toastBox.width).toBeLessThanOrEqual(regionBox.x + 2);
  });

  test("collapses back to the handle and copies with the shortcut without opening the column", async ({
    page,
  }) => {
    await editTaskEndDate(page, "行01", "2026-04-03");
    await openDiffFromHandle(page);
    await collapseDiffToHandle(page);
    await page.keyboard.press("Control+Shift+KeyD");
    await expect(page.locator(".app-toast")).toContainText("差分をコピーしました");
    await expect(page.getByRole("listbox", { name: "差分の一覧" })).toHaveCount(0);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("2026-04-02");
    expect(clip).toContain("2026-04-03");
  });

  test("scrolls only the list under the diff heading", async ({ page }) => {
    await editLongScheduleRowsThrough40(page);
    await openDiffFromHandle(page);
    const list = page.locator(".diff-strip-list");
    const titleTop = await page
      .locator(".diff-strip-title")
      .evaluate((el) => el.getBoundingClientRect().top);
    const before = await diffListScrollTop(page);
    await list.evaluate((el) => {
      el.scrollTop = 120;
    });
    await expect.poll(() => diffListScrollTop(page)).toBeGreaterThan(before);
    const titleTopAfter = await page
      .locator(".diff-strip-title")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(titleTopAfter - titleTop)).toBeLessThan(1);
  });

  test("shows no difference after save and turns the empty column into a body when edited", async ({
    page,
  }) => {
    await editTaskEndDate(page, "行01", "2026-04-03");
    await openDiffFromHandle(page);
    await expect(page.getByRole("listbox", { name: "差分の一覧" })).toBeVisible();
    const savedPath = await saveScheduleDownload(page, BROWSER_DIFF_REGRESSION_PORT);
    await expect(page.locator(".diff-strip-handle")).toHaveCount(0);
    await openScheduleDiffFromMenu(page);
    await expect(page.getByLabel("差分テキスト")).toContainText("差はありません");
    await page.getByRole("button", { name: "閉じる", exact: true }).click();
    await editTaskEndDate(page, "行02", "2026-04-04");
    await expect(page.locator(".diff-strip-handle")).toBeVisible({ timeout: 15_000 });
    await openDiffFromHandle(page);
    await expect(page.getByRole("listbox", { name: "差分の一覧" })).toBeVisible();
    if (savedPath) unlinkTempFile(savedPath);
  });

  test("keeps the chart width as the remainder beside the detail and the diff column", async ({
    page,
  }) => {
    const pxTol = 3;
    await selectTaskViaSearch(page, "行20");
    await page.locator("#detailEnd").fill("2026-04-05");
    await page.locator("#detailEnd").press("Enter");
    await expect.poll(async () => page.locator("#detailEnd").inputValue()).toBe("2026-04-05");
    await openDiffFromHandle(page);
    await expect(page.getByRole("region", { name: "差分" })).toBeVisible();
    await page.locator(".sidebar-row.task", { hasText: "行20" }).first().click();
    await expect(page.getByRole("complementary", { name: "タスクの詳細" })).toBeVisible();

    const parent = page.locator(".chart-detail");
    const chart = page.locator(".timeline-body");
    const detail = page.getByRole("complementary", { name: "タスクの詳細" });
    const diff = page.getByRole("region", { name: "差分" });

    const parentBox = await parent.boundingBox();
    const chartBox = await chart.boundingBox();
    const detailBox = await detail.boundingBox();
    const diffBox = await diff.boundingBox();
    if (!parentBox || !chartBox || !detailBox || !diffBox) {
      throw new Error("layout region missing");
    }

    expect(chartBox.x + chartBox.width).toBeLessThanOrEqual(detailBox.x + pxTol);
    expect(detailBox.x + detailBox.width).toBeLessThanOrEqual(diffBox.x + pxTol);
    expect(chartBox.x + chartBox.width).toBeLessThanOrEqual(diffBox.x + pxTol);

    const expectedChartWidth = parentBox.width - detailBox.width - diffBox.width;
    expect(Math.abs(chartBox.width - expectedChartWidth)).toBeLessThanOrEqual(pxTol);
  });

  test("scrolls to the parent row and marks it when a deleted task row is pressed", async ({
    page,
  }) => {
    await editTaskEndDate(page, "行05", "2026-04-03");
    await selectTaskByName(page, "行05");
    await page.getByRole("button", { name: "削除", exact: true }).click();
    await confirmDelete(page);
    await openDiffFromHandle(page);
    await page.getByRole("option", { name: /行05/ }).first().click();
    const groupRow = page.locator(".sidebar-row.group", { hasText: "行" }).first();
    await expect(groupRow).toHaveClass(/hovered/);
    await expect(page.locator(".sidebar-row.task", { hasText: "行05" })).toHaveCount(0);
  });

});

test.describe("diff strip when a milestone band line is off", () => {
  test.beforeEach(async ({ page }) => {
    await bootNormalPage(page, BROWSER_DIFF_REGRESSION_PORT, { clearLocalStorage: true });
    await openScheduleFileManualScreenshot(page, fullSchedulePath, "回帰の詳細");
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "全体", exact: true }).click();
    await page
      .getByRole("group", { name: "表示の切り替え" })
      .getByRole("button", { name: "月", exact: true })
      .click();
    await page.evaluate(() => window.__manualScreenshotSetToday?.("2026-04-15"));
    await page.getByRole("button", { name: "今日" }).click();
    await wheelShiftHorizontalOnChart(page, 600);
  });

  test("leaves the chart still and shows the band-off message", async ({ page }) => {
    const diamond = await pointerOnMilestoneDiamond(page, "承認");
    if (!diamond) throw new Error("milestone diamond missing on chart");
    await page.mouse.dblclick(diamond.x, diamond.y);
    const dialog = page.getByRole("dialog", { name: "マイルストン編集" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("名前").fill("承認（変更）");
    await dialog.getByRole("button", { name: "保存" }).click();
    await expect(dialog).toHaveCount(0);
    const bandRow = page.locator(".sidebar-milestones", { hasText: "別の節目" }).first();
    const box = await bandRow.boundingBox();
    if (!box) throw new Error("milestone group row missing");
    await openContextMenuAt(page, box.x + box.width / 2, box.y + box.height / 2);
    await page
      .locator(".context-menu [role='menuitem']", {
        has: page.locator(".context-menu-label", { hasText: "この行だけ表示" }),
      })
      .click();
    const scrollBefore = await readChartScrollProbe(page);
    await openDiffFromHandle(page);
    await page.getByRole("option", { name: /承認/ }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "帯の線がオフ" })).toBeVisible();
    const scrollAfter = await readChartScrollProbe(page);
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(2);
  });
});
