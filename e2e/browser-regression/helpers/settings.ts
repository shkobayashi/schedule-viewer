import type { Page } from "playwright/test";

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
  await page.waitForTimeout(400);
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
