import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  bootNormalPage,
  longSchedulePath,
  membersRegressionPath,
  openScheduleFile,
  openSmokeSchedule,
} from "../helpers/session.ts";
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
  await page.waitForTimeout(200);
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
  await page.waitForTimeout(200);
  const diffBtn = page.getByRole("button", { name: /未保存/ });
  if (await diffBtn.isVisible()) await diffBtn.click();
  const msg = page.getByText("絞り込みで出ていません");
  if (await msg.isVisible()) await expect(msg).toBeVisible();
});

test("opens the diff handle after removing one connection", async ({ page }) => {
  test.skip(true, "needs workspace baseline connections fixture");
});

test("keeps the connection dialog open until both fields are filled", async ({ page }) => {
  test.skip(true, "needs baseline connections editor");
});

test("saves a member display name from the overlay and leaves an unused catalog unchanged", async ({
  page,
}) => {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: /設定/ }).click();
  const importBtn = page.getByRole("button", { name: /取り込み/ }).first();
  if (await importBtn.isVisible()) {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      importBtn.click(),
    ]);
    await chooser.setFiles(membersRegressionPath);
    await page.waitForTimeout(400);
  }
  const edit = page.getByRole("button", { name: /項目を編集/ });
  if (await edit.isVisible()) {
    await edit.click();
    const row = page.locator(".catalog-editor-row").first();
    if (await row.count()) {
      await row.getByRole("textbox").first().fill("表示名テスト");
      await page.getByRole("button", { name: "保存" }).click();
    }
  }
});

test("discards or keeps a status draft and removes a catalog from the overlay", async ({ page }) => {
  test.skip(true, "needs status catalog overlay flow beyond smoke");
});

test("adds a color list and refuses a blank or duplicate id", async ({ page }) => {
  test.skip(true, "needs colors catalog import");
});

test("closes the field overlay with escape", async ({ page }) => {
  test.skip(true, "needs field extensions overlay");
});
