import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, type Page } from "playwright/test";

export async function openExportDialog(page: Page): Promise<void> {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: /^書き出し/ }).click();
  await expect(page.getByRole("dialog", { name: "書き出し" })).toBeVisible();
}

export async function exportWithFormat(
  page: Page,
  format: "html" | "svg",
): Promise<string> {
  await openExportDialog(page);
  await page.getByRole("radio", { name: format.toUpperCase() }).check();
  const ext = format === "svg" ? ".svg" : ".html";
  const outPath = path.join(os.tmpdir(), `regression-export-${Date.now()}${ext}`);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "書き出す" }).click(),
  ]);
  await download.saveAs(outPath);
  await expect(page.getByRole("dialog", { name: "書き出し" })).toHaveCount(0);
  return outPath;
}

export function readExportFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function unlinkExportFile(filePath: string): void {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export async function readSmokeScheduleBytesOnDisk(schedulePath: string): Promise<Buffer> {
  return fs.readFileSync(schedulePath);
}
