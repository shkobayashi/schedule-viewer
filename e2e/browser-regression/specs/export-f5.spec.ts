import fs from "node:fs";
import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { filterTasksByName } from "../helpers/diff.ts";
import {
  exportWithFormat,
  openExportDialog,
  readExportFile,
  readSmokeScheduleBytesOnDisk,
  unlinkExportFile,
} from "../helpers/export.ts";
import {
  importJsonInOpenSettings,
  openSettingsSection,
} from "../helpers/settings.ts";
import {
  bootNormalPage,
  connectionsSchedulePath,
  fieldsRegressionPath,
  fullSchedulePath,
  levels3SchedulePath,
  longSchedulePath,
  manualColorsSchedulePath,
  openScheduleFile,
  openSmokeSchedule,
  smokeSchedulePath,
  waitForFitToWidthSettled,
  waitForTitle,
} from "../helpers/session.ts";
import { selectTaskByName } from "../helpers/drag.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
});

test("downloads HTML and SVG of the smoke schedule and opens the HTML", async ({
  page,
  context,
}) => {
  const beforeBytes = await readSmokeScheduleBytesOnDisk(smokeSchedulePath);
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  const htmlPath = await exportWithFormat(page, "html");
  const svgPath = await exportWithFormat(page, "svg");
  const html = readExportFile(htmlPath);
  const svg = readExportFile(svgPath);
  expect(html).toContain("調査");
  expect(svg).toContain("調査");
  const htmlPage = await context.newPage();
  await htmlPage.setContent(html, { waitUntil: "load" });
  await expect(htmlPage.getByText("調査", { exact: true }).first()).toBeVisible();
  await htmlPage.close();
  const afterBytes = fs.readFileSync(smokeSchedulePath);
  expect(Buffer.compare(beforeBytes, afterBytes)).toBe(0);
  unlinkExportFile(htmlPath);
  unlinkExportFile(svgPath);
});

test("exports only the rows left by the name filter, including rows below the viewport", async ({
  page,
}) => {
  await openScheduleFile(page, longSchedulePath);
  await waitForTitle(page, "回帰の長い一覧");
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await filterTasksByName(page, "行40");
  await expect(page.locator(".sidebar-row.task", { hasText: "行40" }).first()).toBeVisible();
  const htmlPath = await exportWithFormat(page, "html");
  const html = readExportFile(htmlPath);
  expect(html).toContain("行40");
  expect(html).not.toContain(">行01<");
  unlinkExportFile(htmlPath);
});

test("matches exported summary bars, hollow milestones, and hatches to the screen", async ({
  page,
}) => {
  await openScheduleFile(page, levels3SchedulePath);
  await waitForTitle(page, "階層サンプル（3段）");
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await waitForFitToWidthSettled(page);
  const htmlPath = await exportWithFormat(page, "html");
  const html = readExportFile(htmlPath);
  expect(html).toMatch(/stroke-dasharray="4 3"|<polygon points=/);
  unlinkExportFile(htmlPath);

  await openScheduleFile(page, manualColorsSchedulePath);
  await page.getByRole("button", { name: "全体", exact: true }).click();
  const svgPath = await exportWithFormat(page, "svg");
  const svg = readExportFile(svgPath);
  expect(svg).toContain('fill="none"');
  expect(svg).toMatch(/次の節目|未確定/);
  unlinkExportFile(svgPath);

  await openSmokeSchedule(page);
  const smokeHtmlPath = await exportWithFormat(page, "html");
  const smokeHtml = readExportFile(smokeHtmlPath);
  expect(smokeHtml).toMatch(/pattern|hatch/i);
  expect(smokeHtml).toContain("設計");
  unlinkExportFile(smokeHtmlPath);
});

test("shows todo column off until enabled", async ({ page }) => {
  await openSmokeSchedule(page);
  await openExportDialog(page);
  const todoLabels = page.getByText("TODO", { exact: true });
  await expect(todoLabels).toHaveCount(0);
  const todosDefault = await page.evaluate(() => {
    const raw = localStorage.getItem("schedule-viewer/excel-export-columns");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { todos?: boolean };
    return parsed.todos ?? null;
  });
  expect(todosDefault).not.toBe(true);
  await page.getByRole("button", { name: "キャンセル" }).click();
});

test("matches sidebar column visibility in the HTML export", async ({ page }) => {
  await openSmokeSchedule(page);
  await openSettingsSection(page, "表示");
  const settings = page.getByRole("dialog", { name: "設定" });
  const startToggle = settings.getByLabel("開始");
  if (!(await startToggle.isChecked())) {
    await startToggle.check();
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar-col.start").first()).toBeVisible();
  const htmlPath = await exportWithFormat(page, "html");
  const html = readExportFile(htmlPath);
  expect(html).toContain("調査");
  await expect(page.locator(".sidebar-col.start").first()).toBeVisible();
  unlinkExportFile(htmlPath);
});

test("keeps connection arcs and labels out of HTML and SVG downloads", async ({ page }) => {
  await openScheduleFile(page, connectionsSchedulePath);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "全体", exact: true }).click();
  const htmlPath = await exportWithFormat(page, "html");
  const svgPath = await exportWithFormat(page, "svg");
  const html = readExportFile(htmlPath);
  const svg = readExportFile(svgPath);
  expect(html).not.toContain("相談");
  expect(svg).not.toContain("相談");
  unlinkExportFile(htmlPath);
  unlinkExportFile(svgPath);
});

test("shows the Excel desktop-only message in the export dialog", async ({ page }) => {
  await openSmokeSchedule(page);
  await openExportDialog(page);
  await expect(page.getByRole("radio", { name: "Excel" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "HTML" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "SVG" })).toBeVisible();
  await page.getByRole("button", { name: "キャンセル" }).click();
});

test("filters extra fields by type and keeps them out of HTML and SVG exports", async ({
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
  await page.locator("#detailField-sample_memo").fill("回帰メモ");
  await page.locator("#detailField-sample_score").fill("12");
  await selectTaskByName(page, "設計");
  await page.locator("#detailField-sample_score").fill("5");
  await selectTaskByName(page, "調査");
  await page.locator("#detailField-sample_memo").fill("");
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  const panel = page.locator(".filter-panel");
  const fieldSearch = panel.getByPlaceholder("項目名で検索");
  await fieldSearch.fill("点数");
  await fieldSearch.press("ArrowDown");
  await fieldSearch.press("Enter");
  await panel.getByLabel("点数 以上").fill("10");
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar-row.task", { hasText: "拡張あり" })).toBeVisible();
  await expect(page.locator(".sidebar-row.task", { hasText: "設計" })).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task", { hasText: "調査" })).toHaveCount(0);
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await panel.getByRole("button", { name: "点数 の条件を外す" }).click();
  await fieldSearch.fill("メモ");
  await fieldSearch.press("ArrowDown");
  await fieldSearch.press("Enter");
  await panel.getByLabel("メモ を含む").fill("回帰メモ");
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar-row.task", { hasText: "拡張あり" })).toBeVisible();
  await expect(page.locator(".sidebar-row.task", { hasText: "調査" })).toHaveCount(0);
  const htmlPath = await exportWithFormat(page, "html");
  const svgPath = await exportWithFormat(page, "svg");
  const html = readExportFile(htmlPath);
  const svg = readExportFile(svgPath);
  expect(html).not.toContain("sample_memo");
  expect(html).not.toContain("sample_score");
  expect(html).not.toContain("回帰メモ");
  expect(svg).not.toContain("sample_memo");
  expect(svg).not.toContain("sample_score");
  expect(svg).not.toContain("回帰メモ");
  const fieldColumns = await page.evaluate(() => {
    const raw = localStorage.getItem("schedule-viewer/excel-export-field-columns");
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  });
  expect(fieldColumns.sample_memo).not.toBe(true);
  expect(fieldColumns.sample_score).not.toBe(true);
  unlinkExportFile(htmlPath);
  unlinkExportFile(svgPath);
});
