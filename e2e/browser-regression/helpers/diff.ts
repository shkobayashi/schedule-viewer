import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, type Page } from "playwright/test";
import {
  formatScheduleDiff,
  SCHEDULE_DIFF_NO_CHANGES,
} from "../../../src/model/scheduleDiff.ts";
import { parseScheduleText } from "../../../src/model/scheduleFile.ts";
import { selectTaskByName } from "./drag.ts";
import { BROWSER_DIFF_REGRESSION_PORT, repoRoot } from "./session.ts";
import { taskSearchBox } from "./sidebar.ts";

export async function openDiffFromHandle(page: Page): Promise<void> {
  const handle = page.locator(".diff-strip-handle");
  await expect(handle).toBeVisible({ timeout: 15_000 });
  await handle.click();
  await expect(page.getByRole("region", { name: "差分" })).toBeVisible({ timeout: 15_000 });
}

export async function collapseDiffToHandle(page: Page): Promise<void> {
  await page.getByRole("button", { name: "畳む", exact: true }).click();
  await expect(page.locator(".diff-strip-handle")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("listbox", { name: "差分の一覧" })).toHaveCount(0);
}

export async function selectTaskViaSearch(page: Page, taskName: string): Promise<void> {
  const box = taskSearchBox(page);
  await box.fill(taskName);
  await expect.poll(async () => (await box.inputValue()) === taskName).toBe(true);
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.click();
  await page.getByRole("complementary", { name: "タスクの詳細" }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await expect(page.locator("#detailName")).toHaveValue(taskName);
}

export async function editTaskEndDate(
  page: Page,
  taskName: string,
  end: string,
  options?: { viaSearch?: boolean },
): Promise<void> {
  if (options?.viaSearch) {
    await selectTaskViaSearch(page, taskName);
  } else {
    await selectTaskByName(page, taskName);
  }
  await page.locator("#detailEnd").fill(end);
  await page.locator("#detailEnd").press("Enter");
  await expect.poll(async () => page.locator("#detailEnd").inputValue()).toBe(end);
  if (options?.viaSearch) {
    await taskSearchBox(page).fill("");
  }
}

export async function saveScheduleDownload(page: Page, port = 5173): Promise<string | null> {
  await page.getByRole("button", { name: "メニュー" }).click();
  const saveItem = page
    .getByRole("menuitem")
    .filter({ hasText: /^保存/ })
    .and(page.locator(":not([disabled])"))
    .first();
  if (port === BROWSER_DIFF_REGRESSION_PORT) {
    await saveItem.click();
    await expect(page.getByRole("button", { name: /未保存/ })).toHaveCount(0, { timeout: 15_000 });
    return null;
  }
  const savedPath = path.join(os.tmpdir(), `regression-diff-save-${Date.now()}.schedule.json`);
  const [download] = await Promise.all([page.waitForEvent("download"), saveItem.click()]);
  await download.saveAs(savedPath);
  return savedPath;
}

export async function openScheduleDiffFromMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: /差分を表示/ }).click();
  await expect(page.getByRole("region", { name: "差分" })).toBeVisible({ timeout: 15_000 });
}

export async function readChartScrollProbe(page: Page): Promise<number> {
  return page.evaluate(() => {
    const host = document.querySelector(".timeline-body");
  if (!host) return 0;
    const canvas = host.querySelector("canvas");
    const stage = canvas && (canvas as { konvaStage?: { x?: () => number } }).konvaStage;
    if (stage && typeof stage.x === "function") return stage.x() ?? 0;
    return 0;
  });
}

export async function diffListScrollTop(page: Page): Promise<number> {
  return page.locator(".diff-strip-list").evaluate((el) => el.scrollTop);
}

export async function editLongScheduleRowsThrough40(page: Page): Promise<void> {
  for (let index = 1; index <= 40; index += 1) {
    const label = `行${String(index).padStart(2, "0")}`;
    await editTaskEndDate(page, label, "2026-04-03");
  }
}

export async function filterTasksByName(page: Page, query: string): Promise<void> {
  await taskSearchBox(page).fill(query);
  await expect.poll(async () => (await taskSearchBox(page).inputValue()) === query).toBe(true);
}

export function unlinkTempFile(filePath: string): void {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export async function readOpenScheduleDiskViaInvoke(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const global = (window as Record<string, unknown>).__manualScreenshotOpenScheduleDisk;
    if (typeof global === "string") return global;
    const { invoke } = await import("@tauri-apps/api/core");
    return (await invoke("read_open_schedule_file")) as string;
  });
}

export function runCheckStatuses(filePath: string): void {
  execSync(`npm run check:statuses -- ${JSON.stringify(filePath)}`, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

export function assertScheduleFilesMatch(screenJson: string, fileJson: string, filename: string): void {
  const screenParsed = parseScheduleText(screenJson);
  const fileParsed = parseScheduleText(fileJson);
  if (!screenParsed.ok) throw new Error(screenParsed.message);
  if (!fileParsed.ok) throw new Error(fileParsed.message);
  const text = formatScheduleDiff(screenParsed.document, fileParsed.document, filename);
  expect(text).toContain(SCHEDULE_DIFF_NO_CHANGES);
}

export async function diskScheduleIncludesTaskEnd(
  page: Page,
  taskName: string,
  end: string,
): Promise<boolean> {
  return page.evaluate(
    async ({ name, expectedEnd }) => {
      try {
        const global = (window as Record<string, unknown>).__manualScreenshotOpenScheduleDisk;
        let raw =
          typeof global === "string"
            ? global
            : ((await import("@tauri-apps/api/core").then((m) =>
                m.invoke("read_open_schedule_file"),
              )) as string);
        return raw.includes(`"name": "${name}"`) && raw.includes(expectedEnd);
      } catch {
        return false;
      }
    },
    { name: taskName, expectedEnd: end },
  );
}

export function readTaskEndFromScheduleJson(
  raw: string,
  taskName: string,
): string | null {
  const fromDocument = (document: {
    categories: Array<{
      groups: Array<{ tasks: Array<{ name: string; end?: string | null }> }>;
    }>;
  }): string | null => {
    for (const category of document.categories) {
      for (const group of category.groups) {
        for (const task of group.tasks) {
          if (task.name === taskName) return task.end ?? null;
        }
      }
    }
    return null;
  };
  const parsed = parseScheduleText(raw);
  if (parsed.ok) {
    return fromDocument(parsed.document);
  }
  try {
    const loose = JSON.parse(raw) as Parameters<typeof fromDocument>[0];
    return fromDocument(loose);
  } catch {
    return null;
  }
}
