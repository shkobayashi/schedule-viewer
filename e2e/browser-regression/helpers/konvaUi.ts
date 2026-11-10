import type { Page } from "playwright/test";
import { isOverdue, lightningDate } from "../../../src/model/timeline.ts";
import { paletteFor } from "../../../src/model/palette.ts";
import { BUILTIN_STATUS_ITEMS } from "../../../src/model/statusCatalog.ts";
import { todayIso } from "../../../src/model/dates.ts";
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

const lightChart = paletteFor("light").chart;
export const LIGHT_CHART = {
  linkOk: lightChart.linkOk,
  linkBroken: lightChart.linkBroken,
  connectionArc: lightChart.connectionArc,
} as const;

export type KonvaStrokeInfo = {
  className: string;
  stroke: string;
  strokeWidth: number;
  points: number[];
};

function normalizeHex(color: string): string {
  return color.trim().toLowerCase();
}

function cssColorToHex(color: string): string {
  const parsed = parseCssColor(color);
  if (!parsed) return normalizeHex(color);
  return `#${parsed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

async function rowMidClientY(page: Page, taskName: string): Promise<number> {
  const row = page.locator(".sidebar-row", { hasText: taskName }).first();
  const box = await row.boundingBox();
  if (!box) throw new Error(`row missing for ${taskName}`);
  return box.y + box.height / 2;
}

export async function readKonvaStrokesInTimelineBody(page: Page): Promise<KonvaStrokeInfo[]> {
  return page.evaluate((collector) => {
    const stages = eval(collector) as Array<{
      container?: () => HTMLElement | null;
      find: (selector: string) => Array<{
        getClassName?: () => string;
        stroke?: () => string;
        strokeWidth?: () => number;
        points?: () => number[];
        visible?: () => boolean;
      }>;
    }>;
    const out: {
      className: string;
      stroke: string;
      strokeWidth: number;
      points: number[];
    }[] = [];
    for (const stage of stages) {
      const container = stage.container?.();
      if (!(container instanceof HTMLElement)) continue;
      if (!container.closest(".timeline-body")) continue;
      for (const selector of ["Arrow", "Line"] as const) {
        for (const node of stage.find(selector)) {
          if (node.visible?.() === false) continue;
          const stroke = node.stroke?.() ?? "";
          if (!stroke) continue;
          out.push({
            className: node.getClassName?.() ?? selector,
            stroke,
            strokeWidth: node.strokeWidth?.() ?? 0,
            points: node.points?.() ?? [],
          });
        }
      }
    }
    return out;
  }, collectKonvaStagesSource);
}

export async function countKonvaArrowsInTimelineBody(page: Page): Promise<number> {
  const strokes = await readKonvaStrokesInTimelineBody(page);
  return strokes.filter((stroke) => stroke.className === "Arrow").length;
}

export async function pointerOnPredecessorLink(
  page: Page,
  fromName: string,
  toName: string,
): Promise<{ x: number; y: number }> {
  const fromY = await rowMidClientY(page, fromName);
  const toY = await rowMidClientY(page, toName);
  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);
  const point = await page.evaluate(
    ({ collector, minY, maxY }) => {
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          getClassName?: () => string;
          points?: () => number[];
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
        for (const node of stage.find("Arrow")) {
          if ((node.getClassName?.() ?? "") !== "Arrow") continue;
          const pts = node.points?.() ?? [];
          if (pts.length < 4) continue;
          const transform = node.getAbsoluteTransform?.();
          let bestClient: { x: number; y: number } | null = null;
          for (let index = 0; index + 1 < pts.length / 2; index += 1) {
            const lx = pts[index * 2];
            const ly = pts[index * 2 + 1];
            const client = transform
              ? transform.point({ x: lx, y: ly })
              : { x: lx, y: ly };
            const clientY = stageRect.top + client.y;
            if (clientY >= minY - 24 && clientY <= maxY + 24) {
              const clientX = stageRect.left + client.x;
              if (!bestClient) bestClient = { x: clientX, y: clientY };
            }
          }
          if (bestClient) {
            const pts = node.points?.() ?? [];
            if (pts.length >= 4) {
              const midIndex = Math.floor(pts.length / 4) * 2;
              const local = { x: pts[midIndex] ?? 0, y: pts[midIndex + 1] ?? 0 };
              const transformed = node.getAbsoluteTransform?.().point(local) ?? local;
              const container = stage.container?.();
              const stageRect =
                container instanceof HTMLElement ? container.getBoundingClientRect() : { left: 0, top: 0 };
              return { x: stageRect.left + transformed.x, y: stageRect.top + transformed.y };
            }
            return bestClient;
          }
        }
      }
      return null;
    },
    { collector: collectKonvaStagesSource, minY, maxY },
  );
  if (!point) throw new Error(`predecessor link not found: ${fromName} -> ${toName}`);
  return point;
}

export async function pointerOnConnectionArc(
  page: Page,
  label: string,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ connectionLabel, collector }) => {
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          text?: () => string;
          getAbsolutePosition?: () => { x: number; y: number };
        }>;
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-body")) continue;
        const stageRect = container.getBoundingClientRect();
        const textNode = stage.find("Text").find((node) => node.text?.() === connectionLabel);
        if (!textNode) continue;
        const pos = textNode.getAbsolutePosition?.() ?? { x: 0, y: 0 };
        return { x: stageRect.left + pos.x, y: stageRect.top + pos.y };
      }
      throw new Error(`connection label missing: ${connectionLabel}`);
    },
    { connectionLabel: label, collector: collectKonvaStagesSource },
  );
}

export async function readMilestoneDiamondFill(
  page: Page,
  milestoneName: string,
): Promise<{ fill: string | null; stroke: string }> {
  return page.evaluate(
    ({ label, collector }) => {
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          sides?: () => number;
          fill?: () => string | undefined;
          stroke?: () => string;
          getAbsolutePosition?: () => { x: number; y: number };
        } & { text?: () => string }>[];
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        const texts = stage.find("Text");
        const labelIndex = texts.findIndex((node) => {
          const text = node.text?.() ?? "";
          return text === label || text.includes(label);
        });
        if (labelIndex < 0) continue;
        const textPos = texts[labelIndex]!.getAbsolutePosition?.() ?? { x: 0, y: 0 };
        let best: { dist: number; fill: string | null; stroke: string } | null = null;
        for (const diamond of stage.find("RegularPolygon")) {
          if ((diamond.sides?.() ?? 0) !== 4) continue;
          const pos = diamond.getAbsolutePosition?.() ?? { x: 0, y: 0 };
          const dist = Math.hypot(pos.x - textPos.x, pos.y - textPos.y);
          const fillRaw = diamond.fill?.();
          const fill =
            fillRaw == null || fillRaw === "" || fillRaw === "transparent"
              ? null
              : String(fillRaw);
          const stroke = diamond.stroke?.() ?? "";
          const candidate = { dist, fill, stroke };
          if (!best || candidate.dist < best.dist) best = candidate;
        }
        if (best) return { fill: best.fill, stroke: best.stroke };
      }
      throw new Error(`milestone diamond missing: ${label}`);
    },
    { label: milestoneName, collector: collectKonvaStagesSource },
  );
}

export async function hasSummaryBarNearRow(page: Page, rowLabel: string): Promise<boolean> {
  const targetY = await page.evaluate((label) => {
    const row = [...document.querySelectorAll(".sidebar-row")].find((el) =>
      el.textContent?.includes(label),
    );
    if (!row) return null;
    const box = row.getBoundingClientRect();
    return box.y + box.height / 2;
  }, rowLabel);
  if (targetY == null) throw new Error(`row missing: ${rowLabel}`);
  return page.evaluate(
    ({ collector, yMid }) => {
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
        for (const rect of stage.find("Rect")) {
          const w = rect.width?.() ?? 0;
          const h = rect.height?.() ?? 0;
          if (w < 16 || h < 2 || h > 12) continue;
          const mid = rect.getAbsoluteTransform?.().point({ x: w / 2, y: h / 2 }) ?? {
            x: w / 2,
            y: h / 2,
          };
          const clientY = stageRect.top + mid.y;
          if (Math.abs(clientY - yMid) <= 12) return true;
        }
      }
      return false;
    },
    { collector: collectKonvaStagesSource, yMid: targetY },
  );
}

export function strokeMatches(color: string, expected: string): boolean {
  return cssColorToHex(color) === cssColorToHex(expected);
}

export async function probeDeleteWithHover(
  page: Page,
  predicate: (stroke: KonvaStrokeInfo) => boolean,
): Promise<void> {
  const points = await page.evaluate(
    ({ collector, minY, maxY }) => {
      void minY;
      void maxY;
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          getClassName?: () => string;
          stroke?: () => string;
          points?: () => number[];
          getAbsoluteTransform?: () => {
            point: (pt: { x: number; y: number }) => { x: number; y: number };
          };
        }>;
      }>;
      const mids: { x: number; y: number; stroke: string; kind: string }[] = [];
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-body")) continue;
        const stageRect = container.getBoundingClientRect();
        for (const kind of ["Arrow", "Line"] as const) {
          for (const node of stage.find(kind)) {
            const pts = node.points?.() ?? [];
            if (pts.length < 4) continue;
            const transform = node.getAbsoluteTransform?.();
            for (let index = 0; index + 1 < pts.length / 2; index += 1) {
              const local = { x: pts[index * 2] ?? 0, y: pts[index * 2 + 1] ?? 0 };
              const transformed = transform?.point(local) ?? local;
              mids.push({
                kind,
                stroke: node.stroke?.() ?? "",
                x: stageRect.left + transformed.x,
                y: stageRect.top + transformed.y,
              });
            }
          }
        }
      }
      return mids;
    },
    { collector: collectKonvaStagesSource, minY: 0, maxY: 0 },
  );
  const undo = page.getByRole("button", { name: "取り消し" });
  for (const point of points) {
    if (!predicate({ className: point.kind, stroke: point.stroke, strokeWidth: 0, points: [] })) {
      continue;
    }
    await page.mouse.move(point.x, point.y);
    await page.keyboard.press("Delete");
    if (await undo.isEnabled()) return;
  }
  throw new Error("Delete hover did not remove a matching link");
}

export async function readDiamondFillAtPointer(
  page: Page,
  clientX: number,
  clientY: number,
): Promise<{ fill: string | null; stroke: string }> {
  return page.evaluate(
    ({ x, y, collector }) => {
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          sides?: () => number;
          fill?: () => string | undefined;
          stroke?: () => string;
          getAbsolutePosition?: () => { x: number; y: number };
        }>;
      }>;
      let best: { dist: number; fill: string | null; stroke: string } | null = null;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        const stageRect = container.getBoundingClientRect();
        for (const diamond of stage.find("RegularPolygon")) {
          if ((diamond.sides?.() ?? 0) !== 4) continue;
          const pos = diamond.getAbsolutePosition?.() ?? { x: 0, y: 0 };
          const clientDiamondX = stageRect.left + pos.x;
          const clientDiamondY = stageRect.top + pos.y;
          const dist = Math.hypot(clientDiamondX - x, clientDiamondY - y);
          const fillRaw = diamond.fill?.();
          const fill =
            fillRaw == null || fillRaw === "" || fillRaw === "transparent"
              ? null
              : String(fillRaw);
          const stroke = diamond.stroke?.() ?? "";
          const candidate = { dist, fill, stroke };
          if (!best || candidate.dist < best.dist) best = candidate;
        }
      }
      if (!best || best.dist > 40) {
        throw new Error("milestone diamond missing at pointer");
      }
      return { fill: best.fill, stroke: best.stroke };
    },
    { x: clientX, y: clientY, collector: collectKonvaStagesSource },
  );
}

export type TaskBarKonvaInfo = {
  fill: string | null;
  stroke: string;
  strokeWidth: number;
  hasPattern: boolean;
  progressFill: string | null;
};

export async function readTaskBarKonvaForRow(
  page: Page,
  taskName: string,
): Promise<TaskBarKonvaInfo | null> {
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
          fill?: () => string;
          stroke?: () => string;
          strokeWidth?: () => number;
          fillPatternImage?: () => unknown;
          fillPriority?: () => string;
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
        const rects = stage.find("Rect");
        let bar: {
          width: number;
          stroke: string;
          strokeWidth: number;
          fill: string | null;
          hasPattern: boolean;
          progressFill: string | null;
          dist: number;
        } | null = null;
        for (const rect of rects) {
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
          const fillRaw = rect.fill?.();
          const fill =
            fillRaw == null || fillRaw === "" || fillRaw === "transparent"
              ? null
              : String(fillRaw);
          const hasPattern =
            rect.fillPriority?.() === "pattern" || Boolean(rect.fillPatternImage?.());
          const stroke = rect.stroke?.() ?? "";
          const strokeWidth = rect.strokeWidth?.() ?? 0;
          const candidate = {
            width: w,
            stroke,
            strokeWidth,
            fill,
            hasPattern,
            progressFill: null as string | null,
            dist,
          };
          if (
            !bar ||
            candidate.strokeWidth > bar.strokeWidth ||
            (candidate.strokeWidth === bar.strokeWidth && candidate.width > bar.width)
          ) {
            bar = candidate;
          }
        }
        if (!bar) continue;
        for (const rect of rects) {
          const w = rect.width?.() ?? 0;
          const h = rect.height?.() ?? 0;
          if (w < 4 || h < 4 || h > 28) continue;
          const fillRaw = rect.fill?.();
          if (!fillRaw || fillRaw === bar.fill) continue;
          const mid = rect.getAbsoluteTransform?.().point({ x: w / 2, y: h / 2 }) ?? {
            x: w / 2,
            y: h / 2,
          };
          if (Math.abs(stageRect.top + mid.y - targetY) > 14) continue;
          if (w < bar.width * 0.95) {
            bar.progressFill = String(fillRaw);
            break;
          }
        }
        return {
          fill: bar.fill,
          stroke: bar.stroke,
          strokeWidth: bar.strokeWidth,
          hasPattern: bar.hasPattern,
          progressFill: bar.progressFill,
        };
      }
      return null;
    },
    { name: taskName, id: taskId, collector: collectKonvaStagesSource },
  );
}

export async function readLightningFoldClientX(
  page: Page,
  taskName: string,
): Promise<number | null> {
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
          points?: () => number[];
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
        let bestX: number | null = null;
        for (const line of stage.find("Line")) {
          const pts = line.points?.() ?? [];
          if (pts.length < 4) continue;
          const transform = line.getAbsoluteTransform?.();
          for (let index = 0; index < pts.length; index += 2) {
            const local = { x: pts[index] ?? 0, y: pts[index + 1] ?? 0 };
            const client = transform?.point(local) ?? local;
            const clientY = stageRect.top + client.y;
            if (Math.abs(clientY - targetY) > 12) continue;
            if (pts.length >= 4 && Math.abs((pts[1] ?? 0) - (pts[3] ?? 0)) < 0.01) {
              const x = stageRect.left + client.x;
              if (bestX == null || x > bestX) bestX = x;
            }
          }
        }
        if (bestX != null) return bestX;
      }
      return null;
    },
    { name: taskName, id: taskId, collector: collectKonvaStagesSource },
  );
}

function parseCssColor(css: string): [number, number, number] | null {
  const trimmed = css.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = trimmed.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]!.split(",").map((p) => Number.parseFloat(p.trim()));
  if (parts.length < 3) return null;
  return [parts[0]!, parts[1]!, parts[2]!];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const linear = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(fgCss: string, bgCss: string): number {
  const fg = parseCssColor(fgCss);
  const bg = parseCssColor(bgCss);
  if (!fg || !bg) return 0;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export async function readComputedContrast(
  page: Page,
  selector: string,
): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return 0;
    const fg = getComputedStyle(el).color;
    let node: HTMLElement | null = el.parentElement;
    let bg = "rgb(255, 255, 255)";
    while (node) {
      const surface = getComputedStyle(node).backgroundColor;
      if (surface && surface !== "rgba(0, 0, 0, 0)" && surface !== "transparent") {
        bg = surface;
        break;
      }
      node = node.parentElement;
    }
    return { fg, bg };
  }, selector).then(({ fg, bg }) => contrastRatio(fg, bg));
}

export function expectOverdueBorder(stroke: string, scheme: "light" | "dark" = "light"): boolean {
  const border = paletteFor(scheme).chart.overdueOther.border;
  return strokeMatches(stroke, border);
}

export async function rowHasOverdueKonvaStroke(
  page: Page,
  taskName: string,
  scheme: "light" | "dark" = "light",
): Promise<boolean> {
  const border = paletteFor(scheme).chart.overdueOther.border;
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  const taskId = await row.getAttribute("data-task-id");
  return page.evaluate(
    ({ name, id, expectedBorder, collector }) => {
      const rowEl = id
        ? document.querySelector(`[data-task-id="${id}"]`)
        : [...document.querySelectorAll(".sidebar-row.task")].find((el) =>
            el.textContent?.includes(name),
          );
      if (!rowEl) return false;
      const targetY = rowEl.getBoundingClientRect().top + rowEl.getBoundingClientRect().height / 2;
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          stroke?: () => string;
          strokeWidth?: () => number;
          getAbsoluteTransform?: () => {
            point: (pt: { x: number; y: number }) => { x: number; y: number };
          };
          width?: () => number;
          height?: () => number;
          points?: () => number[];
        }>;
      }>;
      const match = (stroke: string) => {
        const a = stroke.trim().toLowerCase();
        const b = expectedBorder.trim().toLowerCase();
        if (a === b) return true;
        return a.replace(/\s/g, "") === b.replace(/\s/g, "");
      };
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-body")) continue;
        const stageRect = container.getBoundingClientRect();
        for (const rect of stage.find("Rect")) {
          const w = rect.width?.() ?? 0;
          const h = rect.height?.() ?? 0;
          if (w < 8 || h < 4) continue;
          const mid = rect.getAbsoluteTransform?.().point({ x: w / 2, y: h / 2 }) ?? { x: 0, y: 0 };
          if (Math.abs(stageRect.top + mid.y - targetY) > 14) continue;
          const stroke = rect.stroke?.() ?? "";
          const strokeWidth = rect.strokeWidth?.() ?? 0;
          if (strokeWidth >= 1 && match(stroke)) return true;
        }
        for (const line of stage.find("Line")) {
          const pts = line.points?.() ?? [];
          if (pts.length < 4) continue;
          const transform = line.getAbsoluteTransform?.();
          const y = pts[1] ?? 0;
          const client = transform?.point({ x: 0, y }) ?? { x: 0, y };
          if (Math.abs(stageRect.top + client.y - targetY) > 14) continue;
          const stroke = line.stroke?.() ?? "";
          if (match(stroke)) return true;
        }
      }
      return false;
    },
    { name: taskName, id: taskId, expectedBorder: border, collector: collectKonvaStagesSource },
  );
}

export async function readAppTodayIso(page: Page): Promise<string> {
  const today = await page.evaluate(() => {
    const chip = document.querySelector(".toolbar-today-chip");
    return chip?.getAttribute("data-today") ?? null;
  });
  return today ?? todayIso();
}

export async function evaluateOverdueForTask(
  page: Page,
  task: { status: string; end: string },
  statuses = BUILTIN_STATUS_ITEMS,
): Promise<boolean> {
  const todayStr = await readAppTodayIso(page);
  return isOverdue(task, todayStr, statuses);
}

export async function evaluateLightningIsoForTask(
  page: Page,
  task: { start: string; end: string; status: string },
  statuses = BUILTIN_STATUS_ITEMS,
): Promise<string> {
  const todayStr = await readAppTodayIso(page);
  return lightningDate(task, todayStr, statuses);
}

export function fillMatches(color: string, expected: string): boolean {
  return strokeMatches(color, expected);
}

/** Konva Text nodes on the chart row aligned with the named task. */
export async function readKonvaTextsNearTaskRow(
  page: Page,
  taskName: string,
): Promise<string[]> {
  const row = page.locator(".sidebar-row.task", { hasText: taskName }).first();
  const taskId = await row.getAttribute("data-task-id");
  return page.evaluate(
    ({ name, id, collector }) => {
      const rowEl = id
        ? document.querySelector(`[data-task-id="${id}"]`)
        : [...document.querySelectorAll(".sidebar-row.task")].find((el) =>
            el.textContent?.includes(name),
          );
      if (!rowEl) return [];
      const targetY = rowEl.getBoundingClientRect().top + rowEl.getBoundingClientRect().height / 2;
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          text?: () => string;
          visible?: () => boolean;
          getAbsoluteTransform?: () => {
            point: (pt: { x: number; y: number }) => { x: number; y: number };
          };
        }>;
      }>;
      const texts: string[] = [];
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-body")) continue;
        const stageRect = container.getBoundingClientRect();
        for (const node of stage.find("Text")) {
          if (node.visible?.() === false) continue;
          const body = node.text?.() ?? "";
          if (!body) continue;
          const mid = node.getAbsoluteTransform?.().point({ x: 0, y: 0 }) ?? { x: 0, y: 0 };
          const clientY = stageRect.top + mid.y;
          if (Math.abs(clientY - targetY) > 16) continue;
          texts.push(body);
        }
      }
      return texts;
    },
    { name: taskName, id: taskId, collector: collectKonvaStagesSource },
  );
}

/** Vertical non-working bands in the chart header (day view). */
export async function readNonWorkingHeaderBandFillCount(
  page: Page,
  expectedFill: string,
): Promise<number> {
  return page.evaluate(
    ({ collector, expected }) => {
      const norm = (value: string) => value.trim().toLowerCase().replace(/\s/g, "");
      const target = norm(expected);
      let count = 0;
      const stages = eval(collector) as Array<{
        container?: () => HTMLElement | null;
        find: (selector: string) => Array<{
          fill?: () => string;
          width?: () => number;
          height?: () => number;
        }>;
      }>;
      for (const stage of stages) {
        const container = stage.container?.();
        if (!(container instanceof HTMLElement)) continue;
        if (!container.closest(".timeline-header")) continue;
        for (const rect of stage.find("Rect")) {
          const fill = rect.fill?.() ?? "";
          const w = rect.width?.() ?? 0;
          const h = rect.height?.() ?? 0;
          if (w < 2 || h < 4) continue;
          if (norm(fill) === target) count += 1;
        }
      }
      return count;
    },
    { collector: collectKonvaStagesSource, expected: expectedFill },
  );
}
