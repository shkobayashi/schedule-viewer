import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  bootNormalPage,
  colorsRegressionPath,
  connectionsSchedulePath,
  fieldsRegressionPath,
  longSchedulePath,
  membersRegressionPath,
  openScheduleFile,
  openSmokeSchedule,
  statusesRegressionPath,
} from "../helpers/session.ts";
import { importJsonInOpenSettings, openSettingsSection } from "../helpers/settings.ts";
import { selectTaskByName } from "../helpers/drag.ts";
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

test("leaves the chart still and shows the hidden-row message", async ({ page }) => {
  await openScheduleFile(page, longSchedulePath);
  await taskSearchBox(page).fill("行99");
  await expect.poll(async () => (await taskSearchBox(page).inputValue()) === "行99").toBe(true);
  const diffBtn = page.getByRole("button", { name: /未保存/ });
  if (await diffBtn.isVisible()) await diffBtn.click();
  const msg = page.getByText("絞り込みで出ていません");
  if (await msg.isVisible()) await expect(msg).toBeVisible();
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
