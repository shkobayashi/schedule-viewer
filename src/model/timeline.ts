import { addDays, daysBetween, parseDate } from "./dates";
import { forEachTask } from "./tasks";
import type { Category, Milestone } from "./types";

export const HEADER_HEIGHT = 40;
export const BODY_VIEWPORT_HEIGHT = 400;
export const BAR_HEIGHT = 20;
export const MIN_PX_PER_DAY = 3;
export const MAX_PX_PER_DAY = 90;
export const DEFAULT_PX_PER_DAY = 22;
export const TODAY_ISO = "2026-09-24";

export function gridTier(pxPerDay: number): "day" | "week" | "month" {
  if (pxPerDay >= 40) return "day";
  if (pxPerDay >= 10) return "week";
  return "month";
}

export function tierLabel(tier: ReturnType<typeof gridTier>): string {
  if (tier === "day") return "日表示";
  if (tier === "week") return "週表示";
  return "月表示";
}

export function computeTimelineRange(
  categories: Category[],
  milestones: Milestone[] = [],
): {
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
} {
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  const consider = (date: Date) => {
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;
  };
  forEachTask(categories, (task) => {
    consider(parseDate(task.start));
    consider(parseDate(task.end));
  });
  for (const milestone of milestones) {
    consider(parseDate(milestone.date));
  }
  if (!minDate || !maxDate) {
    const today = parseDate(TODAY_ISO);
    minDate = today;
    maxDate = today;
  }
  const timelineStart = addDays(minDate, -6);
  const timelineEnd = addDays(maxDate, 7);
  const totalDays = daysBetween(timelineStart, timelineEnd);
  return { timelineStart, timelineEnd, totalDays };
}

export function statusColors(status: string): {
  bg: string;
  fill: string | null;
  border: string;
} {
  if (status === "done") {
    return { bg: "#2E9E6C", fill: null, border: "#278A5E" };
  }
  if (status === "in-progress") {
    return { bg: "#DEE3FB", fill: "#4C5FD5", border: "#4C5FD5" };
  }
  return { bg: "#EDEFF3", fill: null, border: "#C4CAD4" };
}

/** 完了以外で、終了日が今日より前のタスク。終了日が今日のタスクは期限当日なので超過にしない。 */
export function isOverdue(
  task: { status: string; end: string },
  today = TODAY_ISO,
): boolean {
  return task.status !== "done" && task.end < today;
}

export function barColors(task: { status: string; end: string }): {
  bg: string;
  fill: string | null;
  border: string;
} {
  if (!isOverdue(task)) return statusColors(task.status);
  if (task.status === "in-progress") {
    return { bg: "#F8D0C8", fill: "#E2542A", border: "#C4351A" };
  }
  return { bg: "#F8D0C8", fill: null, border: "#C4351A" };
}
