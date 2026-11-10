import { expect, type Page } from "playwright/test";
import { readHeaderGridSpacing } from "./session.ts";

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

export async function selectTaskByName(page: Page, taskName: string): Promise<void> {
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  await row.click();
  await page.getByRole("complementary", { name: "タスクの詳細" }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await expect(page.locator("#detailName")).toBeVisible();
}

export async function readDetailDates(page: Page): Promise<{ start: string; end: string }> {
  const start = await page.locator("#detailStart").inputValue();
  const end = await page.locator("#detailEnd").inputValue();
  return { start, end };
}

export async function pointerOnTaskBar(
  page: Page,
  taskName: string,
): Promise<{ x: number; y: number }> {
  await selectTaskByName(page, taskName);
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  const taskId = await row.getAttribute("data-task-id");
  const pointer = await page.evaluate(
    ({ name, id, collector }) => {
      const rowEl = id
        ? document.querySelector(`[data-task-id="${id}"]`)
        : [...document.querySelectorAll(".sidebar-row.task")].find((el) =>
            el.textContent?.includes(name),
          );
      if (!rowEl) return null;
      const rowRect = rowEl.getBoundingClientRect();
      const targetY = rowRect.top + rowRect.height / 2;
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          x?: () => number;
          y?: () => number;
          width?: () => number;
          height?: () => number;
          getAbsoluteTransform?: () => {
            point: (pt: { x: number; y: number }) => { x: number; y: number };
          };
        }>;
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-body")) continue;
        const stageRect = container.getBoundingClientRect();
        let best: { dist: number; width: number; x: number; y: number } | null = null;
        for (const rect of stage.find("Rect")) {
          const w = rect.width?.() ?? 0;
          const h = rect.height?.() ?? 0;
          if (w < 12 || h < 4 || h > 28) continue;
          const mid = rect.getAbsoluteTransform?.().point({ x: w / 2, y: h / 2 }) ?? {
            x: (rect.x?.() ?? 0) + w / 2,
            y: (rect.y?.() ?? 0) + h / 2,
          };
          const clientY = stageRect.top + mid.y;
          const dist = Math.abs(clientY - targetY);
          if (dist > 14) continue;
          const candidate = {
            dist,
            width: w,
            x: stageRect.left + mid.x,
            y: targetY,
          };
          if (
            !best ||
            candidate.width > best.width ||
            (candidate.width === best.width && candidate.dist < best.dist)
          ) {
            best = candidate;
          }
        }
        if (best) return { x: best.x, y: best.y, usedFallback: false };
      }
      return {
        x: rowRect.right + 120,
        y: targetY,
        usedFallback: true,
      };
    },
    { name: taskName, id: taskId, collector: collectKonvaStagesSource },
  );
  if (!pointer) throw new Error(`could not find chart bar for ${taskName}`);
  if ("usedFallback" in pointer && pointer.usedFallback) {
    throw new Error(`Konva bar not found for ${taskName}; refusing fallback coordinates`);
  }
  return { x: pointer.x, y: pointer.y };
}

export async function dragTaskBar(
  page: Page,
  taskName: string,
  deltaPx: number,
): Promise<void> {
  const { x, y } = await pointerOnTaskBar(page, taskName);
  await dragFromClientPoint(page, x, y, deltaPx);
}

export async function dragFromClientPoint(
  page: Page,
  x: number,
  y: number,
  deltaPx: number,
): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaPx, y, { steps: 12 });
}

export async function releaseTaskBarDrag(page: Page): Promise<void> {
  await page.mouse.up();
}

export async function cancelTaskBarDrag(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.mouse.up();
}

export async function dragTaskBarByDays(
  page: Page,
  taskName: string,
  dayDelta: number,
): Promise<void> {
  const tier = page.getByRole("group", { name: "表示の切り替え" });
  await tier.getByRole("button", { name: "週", exact: true }).click();
  await expect(tier.getByRole("button", { name: "週", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const pxPerDay = (await readHeaderGridSpacing(page)) ?? 22;
  const deltaPx = Math.round(dayDelta * pxPerDay);
  await dragTaskBar(page, taskName, deltaPx);
}

export async function clickUndoOnce(page: Page): Promise<void> {
  const undo = page.getByRole("button", { name: "取り消し" });
  await undo.waitFor({ state: "visible" });
  await undo.click();
}

export async function isDetailNameFocused(page: Page): Promise<boolean> {
  return page.evaluate(() => document.activeElement?.id === "detailName");
}

async function resolveRightEdgePointer(
  page: Page,
  taskName: string,
): Promise<{ x: number; y: number }> {
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  const taskId = await row.getAttribute("data-task-id");
  const pointer = await page.evaluate(
    ({ name, id, collector }) => {
      const rowEl = id
        ? document.querySelector(`[data-task-id="${id}"]`)
        : [...document.querySelectorAll(".sidebar-row.task")].find((el) =>
            el.textContent?.includes(name),
          );
      if (!rowEl) return null;
      const rowRect = rowEl.getBoundingClientRect();
      const targetY = rowRect.top + rowRect.height / 2;
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          width?: () => number;
          getAbsoluteTransform?: () => {
            point: (pt: { x: number; y: number }) => { x: number; y: number };
          };
        }>;
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-body")) continue;
        const stageRect = container.getBoundingClientRect();
        let handleX: number | null = null;
        let barRightX: number | null = null;
        let barDist = Number.POSITIVE_INFINITY;
        for (const rect of stage.find("Rect")) {
          const w = rect.width?.() ?? 0;
          const h = rect.height?.() ?? 0;
          const mid = rect.getAbsoluteTransform?.().point({ x: w / 2, y: h / 2 }) ?? {
            x: w / 2,
            y: h / 2,
          };
          const clientY = stageRect.top + mid.y;
          const yDist = Math.abs(clientY - targetY);
          if (yDist > 16) continue;
          if (w >= 6 && w <= 14 && h >= 6 && h <= 26) {
            const right = rect.getAbsoluteTransform?.().point({ x: w - 1, y: h / 2 }) ?? {
              x: w - 1,
              y: h / 2,
            };
            handleX = stageRect.left + right.x;
          }
          if (w >= 20 && h >= 4 && h <= 28) {
            const right = rect.getAbsoluteTransform?.().point({ x: w - 2, y: h / 2 }) ?? {
              x: w - 2,
              y: h / 2,
            };
            const candidateX = stageRect.left + right.x;
            if (yDist < barDist) {
              barDist = yDist;
              barRightX = candidateX;
            }
          }
        }
        if (handleX != null) return { x: handleX, y: targetY };
        if (barRightX != null) return { x: barRightX, y: targetY };
      }
      return { x: rowRect.right + 80, y: targetY };
    },
    { name: taskName, id: taskId, collector: collectKonvaStagesSource },
  );
  if (!pointer) throw new Error(`edge pointer missing for ${taskName}`);
  return { x: pointer.x, y: pointer.y };
}

export async function clickPeriodEdgeWithoutSelecting(
  page: Page,
  taskName: string,
): Promise<{ x: number; y: number }> {
  const pointer = await resolveRightEdgePointer(page, taskName);
  await page.mouse.click(pointer.x, pointer.y);
  return pointer;
}

export async function dragTaskRightEdge(
  page: Page,
  taskName: string,
  deltaPx: number,
): Promise<void> {
  await selectTaskByName(page, taskName);
  const tier = page.getByRole("group", { name: "表示の切り替え" });
  await tier.getByRole("button", { name: "日", exact: true }).click();
  await expect(tier.getByRole("button", { name: "日", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const pointer = await resolveRightEdgePointer(page, taskName);
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await page.mouse.move(pointer.x + deltaPx, pointer.y, { steps: 12 });
  await page.mouse.up();
}
