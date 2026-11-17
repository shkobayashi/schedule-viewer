import { expect, type Page } from "playwright/test";

export async function openSettingsDialog(page: Page): Promise<void> {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: /設定/ }).click();
  await page.getByRole("dialog", { name: "設定" }).waitFor({ state: "visible" });
}

export async function openSettingsSection(page: Page, section: string): Promise<void> {
  await openSettingsDialog(page);
  await page.getByRole("button", { name: section, exact: true }).click();
}

export async function importJsonInOpenSettings(
  page: Page,
  filePath: string,
): Promise<void> {
  const importBtn = page.getByRole("button", { name: /取り込み/ }).first();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    importBtn.click(),
  ]);
  await chooser.setFiles(filePath);
  const overwrite = page.getByRole("button", { name: /上書き/ });
  if (await overwrite.isVisible().catch(() => false)) {
    await overwrite.click();
  }
  await expect(importBtn).toBeEnabled({ timeout: 10_000 });
}

export async function openCatalogEditorFromSettings(
  page: Page,
  section: string,
): Promise<void> {
  await openSettingsSection(page, section);
  await page.getByRole("button", { name: "項目を編集…" }).click();
}

export async function confirmOverwriteImportIfShown(page: Page): Promise<void> {
  const confirm = page.getByRole("alertdialog", { name: "上書きの確認" });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.getByRole("button", { name: /上書き/ }).click();
  }
}

export async function enableAllSidebarColumns(page: Page): Promise<void> {
  await openSettingsSection(page, "表示");
  const settings = page.getByRole("dialog", { name: "設定" });
  for (const label of ["開始", "終了", "日数", "進捗", "ステータス"]) {
    const toggle = settings.getByLabel(label);
    if (!(await toggle.isChecked())) {
      await toggle.check();
    }
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "設定" })).toHaveCount(0);
}

export async function setDisplayScale(page: Page, value: string): Promise<void> {
  await openSettingsSection(page, "表示");
  await page.getByLabel("表示サイズ").selectOption(value);
  await page.keyboard.press("Escape");
}

export async function readDisplayScaleFactor(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--s").trim(),
  );
}

export async function discardCatalogDraftIfShown(page: Page): Promise<void> {
  const discard = page.getByRole("alertdialog", { name: "下書きの確認" });
  if (await discard.isVisible().catch(() => false)) {
    await discard.getByRole("button", { name: "捨てる" }).click();
  }
}

/** Opens a `ColorSelectField` combobox (`#detailColor`, `#bulkColor`, …) and returns option labels. */
export async function readColorSelectOptionLabels(page: Page, triggerId: string): Promise<string[]> {
  await page.locator(`#${triggerId}`).click();
  const labels = await page
    .locator(".color-select-dropdown .color-select-option-text")
    .allTextContents();
  await page.keyboard.press("Escape");
  return labels;
}

export async function chooseColorSelectOption(
  page: Page,
  triggerId: string,
  label: string,
): Promise<void> {
  await page.locator(`#${triggerId}`).click();
  await page
    .locator(".color-select-dropdown [role='option']", { hasText: label })
    .click();
}
