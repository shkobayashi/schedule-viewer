import { parseDate } from "./dates";
import { taskBarExclusiveEnd, taskBarWidthPx } from "./timeline";
import type { TaskBarAnchor } from "./connections";
import type { Task } from "./types";

export type TaskBarBodyRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** チャート本体 Stage 内のタスク棒矩形（TaskBar と同じ式）。 */
export function taskBarRectInBody(input: {
  task: Task;
  viewportRowTop: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  barLeft?: number;
  barWidth?: number;
  anchor?: Pick<TaskBarAnchor, "x" | "right" | "y">;
}): TaskBarBodyRect {
  const centerY =
    input.anchor?.y ?? input.viewportRowTop + input.rowHeight / 2;
  const barTop = centerY - input.barHeight / 2;
  const start = parseDate(input.task.start);
  const x =
    input.barLeft ?? input.anchor?.x ?? input.dateToX(start);
  const right =
    input.barWidth != null
      ? x + input.barWidth
      : input.anchor?.right ??
        x +
          taskBarWidthPx(input.task, input.dateToX, input.pxPerDay);
  return {
    x,
    y: barTop,
    width: Math.max(1, right - x),
    height: input.barHeight,
  };
}

export function clipTaskBarRectToDate(
  bar: TaskBarBodyRect,
  dateIso: string,
  dateToX: (d: Date) => number,
  pxPerDay: number,
): TaskBarBodyRect {
  const dayStart = dateToX(parseDate(dateIso));
  const dayEnd = dayStart + pxPerDay;
  const x = Math.max(bar.x, dayStart);
  const right = Math.min(bar.x + bar.width, dayEnd);
  return {
    x,
    y: bar.y,
    width: Math.max(1, right - x),
    height: bar.height,
  };
}

export function dateColumnRectInHeader(input: {
  dateIso: string;
  dateToX: (d: Date) => number;
  pxPerDay: number;
  headerHeight: number;
}): TaskBarBodyRect {
  const x = input.dateToX(parseDate(input.dateIso));
  return {
    x,
    y: 0,
    width: input.pxPerDay,
    height: input.headerHeight,
  };
}

export function milestoneDiamondRectInBand(input: {
  dateIso: string;
  dateToX: (d: Date) => number;
  pxPerDay: number;
  centerY: number;
  diamondSize: number;
}): TaskBarBodyRect {
  const dayX = input.dateToX(parseDate(input.dateIso));
  const half = input.diamondSize / 2;
  return {
    x: dayX + input.pxPerDay / 2 - half,
    y: input.centerY - half,
    width: input.diamondSize,
    height: input.diamondSize,
  };
}
