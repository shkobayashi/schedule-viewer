import type { Page } from "playwright/test";
import { getKonvaCapability } from "./konva.ts";
import { selectTaskByName } from "./drag.ts";

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

export async function readBarCenterForTask(
  page: Page,
  taskName: string,
): Promise<{ x: number; y: number; width: number } | null> {
  await selectTaskByName(page, taskName);
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  const taskId = await row.getAttribute("data-task-id");
  return page.evaluate(
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
            x: w / 2,
            y: h / 2,
          };
          const clientY = stageRect.top + mid.y;
          const dist = Math.abs(clientY - targetY);
          if (dist > 14) continue;
          const candidate = {
            dist,
            width: w,
            x: stageRect.left + mid.x,
            y: clientY,
          };
          if (!best || candidate.width > best.width) best = candidate;
        }
        if (best) return { x: best.x, y: best.y, width: best.width };
      }
      return null;
    },
    { name: taskName, id: taskId, collector: collectKonvaStagesSource },
  );
}

export async function readMidDragDateTexts(page: Page): Promise<string[]> {
  return page.evaluate((collector) => {
    const stages = eval(collector) as Array<{
      find: (selector: string) => Array<{ text?: () => string; visible?: () => boolean }>;
    }>;
    const texts: string[] = [];
    for (const stage of stages) {
      for (const node of stage.find("Text")) {
        if (node.visible && node.visible() === false) continue;
        const text = node.text?.() ?? "";
        if (/\d+\/\d+/.test(text)) texts.push(text);
      }
    }
    return texts;
  }, collectKonvaStagesSource);
}

export function konvaReadable(): boolean {
  return Boolean(getKonvaCapability()?.readable);
}

export function requireKonva(message = "Konva not readable"): void {
  if (!konvaReadable()) {
    throw new Error(message);
  }
}

/** Konva Text nodes under `.timeline-body` (canvas-only labels such as 休). */
export async function readKonvaTextsInTimelineBody(page: Page): Promise<string[]> {
  return page.evaluate((collector) => {
    const stages = eval(collector) as Array<{
      container?: () => HTMLElement | null;
      find: (selector: string) => Array<{
        text?: () => string;
        visible?: () => boolean;
      }>;
    }>;
    const texts: string[] = [];
    for (const stage of stages) {
      const container = stage.container?.();
      if (!(container instanceof HTMLElement)) continue;
      if (!container.closest(".timeline-body")) continue;
      for (const node of stage.find("Text")) {
        if (node.visible?.() === false) continue;
        const text = node.text?.() ?? "";
        if (text.length > 0) texts.push(text);
      }
    }
    return texts;
  }, collectKonvaStagesSource);
}

export async function pointerOnMilestoneDiamond(
  page: Page,
  name: string,
): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    ({ label, collector }) => {
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          sides?: () => number;
          getAbsolutePosition?: () => { x: number; y: number };
        }>;
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        const stageRect = container.getBoundingClientRect();
        const diamonds = stage.find("RegularPolygon");
        const texts = stage.find("Text");
        const labelIndex = texts.findIndex((node) => {
          const text = (node as { text?: () => string }).text?.() ?? "";
          return text === label || text.includes(label);
        });
        if (labelIndex < 0) continue;
        const text = texts[labelIndex];
        const textPos = text.getAbsolutePosition?.() ?? { x: 0, y: 0 };
        let best: { dist: number; x: number; y: number } | null = null;
        for (const diamond of diamonds) {
          if ((diamond.sides?.() ?? 0) !== 4) continue;
          const pos = diamond.getAbsolutePosition?.() ?? { x: 0, y: 0 };
          const dist = Math.hypot(pos.x - textPos.x, pos.y - textPos.y);
          const candidate = {
            dist,
            x: stageRect.left + pos.x,
            y: stageRect.top + pos.y,
          };
          if (!best || candidate.dist < best.dist) best = candidate;
        }
        if (best) return best;
      }
      return null;
    },
    { label: name, collector: collectKonvaStagesSource },
  );
}

export async function pointerOnMilestoneLabel(
  page: Page,
  name: string,
): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    ({ label, collector }) => {
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          text?: () => string;
          getAbsolutePosition?: () => { x: number; y: number };
          x?: () => number;
          y?: () => number;
        }>;
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        const stageRect = container.getBoundingClientRect();
        for (const node of stage.find("Text")) {
          const text = node.text?.() ?? "";
          if (text !== label && !text.includes(label)) continue;
          const pos = node.getAbsolutePosition?.() ?? {
            x: node.x?.() ?? 0,
            y: node.y?.() ?? 0,
          };
          return { x: stageRect.left + pos.x + 10, y: stageRect.top + pos.y + 10 };
        }
      }
      return null;
    },
    { label: name, collector: collectKonvaStagesSource },
  );
}

export { dragTaskRightEdge as dragBarRightEdge } from "./drag.ts";
