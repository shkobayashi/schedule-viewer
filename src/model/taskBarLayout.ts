import { parseDate } from "./dates";
import { taskBarWidthPx } from "./timeline";
import type { TaskBarAnchor } from "./connections";
import type { Task } from "./types";

export type TaskBarBodyRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TaskBarAnchorInBody = Pick<TaskBarAnchor, "x" | "right" | "y">;

type TaskBarLayoutInput = {
  task: Task;
  viewportRowTop: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  barLeft?: number;
  barWidth?: number;
  anchor?: Pick<TaskBarAnchor, "x" | "right" | "y">;
};

/** チャート本体 Stage 内のタスク棒矩形（TaskBar と同じ式）。 */
export function taskBarRectInBody(input: TaskBarLayoutInput): TaskBarBodyRect {
  const { x, right, y: centerY } = taskBarAnchorInBody(input);
  return {
    x,
    y: centerY - input.barHeight / 2,
    width: Math.max(1, right - x),
    height: input.barHeight,
  };
}

/** リンク・説明用の棒アンカー（TaskBar の中心と左右端）。 */
export function taskBarAnchorInBody(input: TaskBarLayoutInput): TaskBarAnchorInBody {
  if (input.anchor != null) {
    const x = input.barLeft ?? input.anchor.x;
    const right =
      input.barWidth != null ? x + input.barWidth : input.anchor.right;
    return { x, right, y: input.anchor.y };
  }
  const start = parseDate(input.task.start);
  const x = input.barLeft ?? input.dateToX(start);
  const right =
    input.barWidth != null
      ? x + input.barWidth
      : x + taskBarWidthPx(input.task, input.dateToX, input.pxPerDay);
  const y = input.viewportRowTop + input.rowHeight / 2;
  return { x, right, y };
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

/** マイルストン帯 Stage 内の Group の x（菱形の中心 x と同じ）。 */
export function milestoneMarkGroupX(
  dateIso: string,
  dateToX: (d: Date) => number,
): number {
  return dateToX(parseDate(dateIso));
}

/** ブロック内レーンの中心 y（Group の y と同じ）。 */
export function milestoneMarkLaneCenterY(
  lane: number,
  laneHeight: number,
): number {
  return lane * laneHeight + laneHeight / 2;
}

export function milestoneBandBlockRectInBand(input: {
  offsetY: number;
  height: number;
  timelineWidth: number;
}): TaskBarBodyRect {
  return {
    x: 0,
    y: input.offsetY,
    width: input.timelineWidth,
    height: input.height,
  };
}

export function milestoneDiamondRectInBand(input: {
  dateIso: string;
  dateToX: (d: Date) => number;
  centerY: number;
  diamondSize: number;
}): TaskBarBodyRect {
  const centerX = milestoneMarkGroupX(input.dateIso, input.dateToX);
  const half = input.diamondSize / 2;
  return {
    x: centerX - half,
    y: input.centerY - half,
    width: input.diamondSize,
    height: input.diamondSize,
  };
}
