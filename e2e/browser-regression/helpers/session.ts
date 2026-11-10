import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright/test";
import { clearScheduleViewerLocalStorageEvaluateSource } from "../../../src/model/devFreshStart.ts";

const helperDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(helperDir, "../../..");
export const smokeSchedulePath = path.join(
  repoRoot,
  "examples/regression/smoke.schedule.json",
);
export const longSchedulePath = path.join(
  repoRoot,
  "examples/regression/long.schedule.json",
);
export const levels5SchedulePath = path.join(
  repoRoot,
  "examples/hierarchy/levels-5.schedule.json",
);
export const membersRegressionPath = path.join(
  repoRoot,
  "examples/regression/members.json",
);
export const fullSchedulePath = path.join(
  repoRoot,
  "examples/regression/full.schedule.json",
);
export const connectionsSchedulePath = path.join(
  repoRoot,
  "examples/connections/schedule.json",
);
export const statusesRegressionPath = path.join(
  repoRoot,
  "examples/regression/statuses.json",
);
export const colorsRegressionPath = path.join(
  repoRoot,
  "examples/regression/colors.json",
);
export const fieldsRegressionPath = path.join(
  repoRoot,
  "examples/regression/fields.json",
);

export async function dismissBlockingUi(page: Page): Promise<void> {
  const firstRunClose = page.locator(".first-run-hint-card .modal-close-btn");
  if (await firstRunClose.isVisible().catch(() => false)) {
    await firstRunClose.click();
    await page.waitForTimeout(200);
  }
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) {
    await closeGuide.click();
  }
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate((body) => {
    const fn = eval(body) as (storage: Storage) => void;
    fn(localStorage);
  }, clearScheduleViewerLocalStorageEvaluateSource());
}

export async function openScheduleFile(page: Page, filePath: string): Promise<void> {
  await page.getByRole("button", { name: "メニュー" }).click();
  const openItem = page
    .getByRole("menuitem")
    .filter({ hasText: /^開く/ })
    .and(page.locator(":not([disabled])"))
    .first();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    openItem.click(),
  ]);
  await fileChooser.setFiles(filePath);
  await page.waitForTimeout(400);
}

export async function openSmokeSchedule(page: Page): Promise<void> {
  await openScheduleFile(page, smokeSchedulePath);
  await waitForTitle(page, "回帰確認");
}

export async function openSmokeScheduleManualScreenshot(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof window.__manualScreenshotApplyOpen === "function",
    null,
    { timeout: 60_000 },
  );
  const contents = fs.readFileSync(smokeSchedulePath, "utf8");
  const mockPath = `/Users/example/Documents/${path.basename(smokeSchedulePath)}`;
  await page.evaluate(
    async ({ pickPath, pickContents }) => {
      const apply = window.__manualScreenshotApplyOpen;
      if (!apply) {
        throw new Error("manual screenshot open bridge is missing");
      }
      await apply({ path: pickPath, contents: pickContents });
    },
    { pickPath: mockPath, pickContents: contents },
  );
  await waitForTitle(page, "回帰確認");
}

export async function openLongSchedule(page: Page): Promise<void> {
  await openScheduleFile(page, longSchedulePath);
  await waitForTitle(page, "長い一覧");
}

export async function waitForTitle(page: Page, title: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  const locator = page.locator(".toolbar-title-text");
  while (Date.now() < deadline) {
    const text = (await locator.textContent())?.trim() ?? "";
    if (text.includes(title)) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`toolbar title did not match ${title} within 60s`);
}

export type BootNormalPageOptions = {
  clearLocalStorage?: boolean;
};

export async function bootNormalPage(
  page: Page,
  port: number,
  options: BootNormalPageOptions = {},
): Promise<void> {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  await dismissBlockingUi(page);
  if (options.clearLocalStorage) {
    await clearLocalStorage(page);
    await page.reload({ waitUntil: "load" });
    await dismissBlockingUi(page);
  }
  await page.waitForSelector(".toolbar", { timeout: 60_000 });
}

export async function readSidebarScrollY(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector(".sidebar-rows");
    if (!el) return 0;
    const transform = getComputedStyle(el).transform;
    if (!transform || transform === "none") return 0;
    const match = transform.match(
      /matrix(?:3d)?\(([^)]+)\)/,
    );
    if (!match) return 0;
    const parts = match[1].split(",").map((part) => part.trim());
    const ty = parts.length === 6 ? parts[5] : parts[13];
    return Math.abs(Number.parseFloat(ty) || 0);
  });
}

const collectKonvaStagesSource = `(() => {
  const globalKonva = window.Konva;
  if (globalKonva && globalKonva.stages && globalKonva.stages.length) {
    return globalKonva.stages;
  }
  const stages = [];
  for (const canvas of document.querySelectorAll("canvas")) {
    if (canvas.konvaStage) stages.push(canvas.konvaStage);
    const internal = canvas._canvas;
    const fromInternal = internal && (internal.getStage ? internal.getStage() : internal.stage);
    if (fromInternal) stages.push(fromInternal);
  }
  return stages;
})()`;

export async function readHeaderGridSpacing(page: Page): Promise<number | null> {
  return page.evaluate((collector) => {
    const stages = eval(collector) as Array<{
      find: (selector: string) => Array<{ points?: () => number[] }>;
    }>;
    for (const stage of stages) {
      const xs: number[] = [];
      for (const node of stage.find("Line")) {
        const points = node.points?.() ?? [];
        if (points.length < 4) continue;
        const x0 = points[0];
        const y0 = points[1];
        const x1 = points[2];
        const y1 = points[3];
        if (Math.abs(x0 - x1) < 0.01 && Math.abs(y1 - y0) > 8) {
          xs.push(x0);
        }
      }
      xs.sort((a, b) => a - b);
      for (let index = 1; index < xs.length; index += 1) {
        const delta = xs[index] - xs[index - 1];
        if (delta >= 3 && delta <= 90) return delta;
      }
    }
    return null;
  }, collectKonvaStagesSource);
}

export async function readMovableHeaderClientX(page: Page): Promise<number | null> {
  return page.evaluate((collector) => {
    const stages = eval(collector) as Array<{
      container?: () => HTMLElement | null;
      find: (selector: string) => Array<{
        text?: () => string;
        x?: () => number;
        getAbsolutePosition?: () => { x: number; y: number };
      }>;
    }>;
    for (const stage of stages) {
      const container = stage.container?.();
      if (!(container instanceof HTMLElement)) continue;
      if (!container.closest(".timeline-header")) continue;
      const stageRect = container.getBoundingClientRect();
      let bestX: number | null = null;
      for (const node of stage.find("Text")) {
        const text = node.text?.() ?? "";
        if (!/^\d{1,2}$/.test(text)) continue;
        const abs = node.getAbsolutePosition?.();
        const x = abs?.x ?? node.x?.() ?? 0;
        const clientX = stageRect.left + x;
        if (bestX == null || clientX > bestX) bestX = clientX;
      }
      return bestX;
    }
    return null;
  }, collectKonvaStagesSource);
}

export async function readChartScrollXProbe(page: Page): Promise<number | null> {
  return page.evaluate((collector) => {
    const stages = eval(collector) as Array<{
      container?: () => HTMLElement | null;
      find: (selector: string) => Array<{ points?: () => number[] }>;
    }>;
    for (const stage of stages) {
      const container = stage.container?.();
      if (!(container instanceof HTMLElement)) continue;
      if (!container.closest(".timeline-header")) continue;
      const xs: number[] = [];
      for (const node of stage.find("Line")) {
        const points = node.points?.() ?? [];
        if (points.length < 4) continue;
        if (Math.abs(points[0] - points[2]) < 0.01) xs.push(points[0]);
      }
      if (xs.length === 0) continue;
      xs.sort((a, b) => a - b);
      return xs[0];
    }
    return null;
  }, collectKonvaStagesSource);
}

export function smokeScheduleTitle(): string {
  const raw = fs.readFileSync(smokeSchedulePath, "utf8");
  const doc = JSON.parse(raw) as { title?: string };
  return doc.title ?? "回帰確認";
}
