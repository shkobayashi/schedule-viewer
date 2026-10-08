import { addDays, clamp, daysBetween, parseDate, todayIso } from "./dates";
import { paletteFor, type ChartPalette, type ResolvedColorScheme } from "./palette";
import { forEachTask } from "./tasks";
import type { Category, Milestone } from "./types";

export {
  LAYOUT_BAR_HEIGHT,
  LAYOUT_HEADER_HEIGHT,
  LAYOUT_ROW_HEIGHT,
} from "./layoutSizes";
export const MIN_PX_PER_DAY = 3;
export const MAX_PX_PER_DAY = 90;
export const DEFAULT_PX_PER_DAY = 22;

/** 終了日（含む）の翌日の左端までバーを伸ばす。 */
export function taskBarExclusiveEnd(task: { end: string }): Date {
  return addDays(parseDate(task.end), 1);
}

export function taskBarWidthPx(
  task: { start: string; end: string },
  dateToX: (d: Date) => number,
  pxPerDay: number,
): number {
  const startX = dateToX(parseDate(task.start));
  const endX = dateToX(taskBarExclusiveEnd(task));
  return Math.max(pxPerDay, endX - startX);
}

export type GridTier = "day" | "week" | "month";

export function gridTier(pxPerDay: number): GridTier {
  if (pxPerDay >= 40) return "day";
  if (pxPerDay >= 10) return "week";
  return "month";
}

export const TIER_PX_PER_DAY: Record<ReturnType<typeof gridTier>, number> = {
  day: 40,
  week: DEFAULT_PX_PER_DAY,
  month: 8,
};

export function pxPerDayForTier(tier: ReturnType<typeof gridTier>): number {
  return TIER_PX_PER_DAY[tier];
}

export function tierLabel(tier: ReturnType<typeof gridTier>): string {
  if (tier === "day") return "日表示";
  if (tier === "week") return "週表示";
  return "月表示";
}

export function computeTimelineRange(
  categories: Category[],
  milestones: Milestone[] = [],
  today = todayIso(),
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
    const todayDate = parseDate(today);
    minDate = todayDate;
    maxDate = todayDate;
  }
  const timelineStart = addDays(minDate, -6);
  const timelineEnd = addDays(maxDate, 7);
  const totalDays = daysBetween(timelineStart, timelineEnd);
  return { timelineStart, timelineEnd, totalDays };
}

/** 右余白を含む日数で、ビューポート幅に収まる 1 日あたりの幅を求める。 */
export function fitPxPerDayToViewport(
  viewportWidth: number,
  prefixDays: number,
  baseTotalDays: number,
  extraDaysForPx: (px: number) => number,
): number {
  const span = prefixDays + baseTotalDays;
  if (viewportWidth <= 0 || span <= 0) return DEFAULT_PX_PER_DAY;
  let px = clamp(viewportWidth / span, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
  for (let i = 0; i < 12; i += 1) {
    const extra = extraDaysForPx(px);
    const total = prefixDays + baseTotalDays + extra;
    const next = clamp(viewportWidth / total, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
    if (Math.abs(next - px) < 0.001) return next;
    px = next;
  }
  return px;
}

/**
 * データの開始が動いたとき、同じ日が同じ位置に残る原点とスクロールを返す。
 * 左端より前には戻せないので、そのときは原点を据え置く。
 */
export function resolveTimelineOrigin(input: {
  pinnedStart: Date;
  dataStart: Date;
  scrollX: number;
  pxPerDay: number;
}): { pinnedStart: Date; scrollX: number } {
  if (input.pinnedStart.getTime() === input.dataStart.getTime()) {
    return { pinnedStart: input.pinnedStart, scrollX: input.scrollX };
  }
  const deltaDays = daysBetween(input.pinnedStart, input.dataStart);
  const desired = input.scrollX - deltaDays * input.pxPerDay;
  if (desired < 0) {
    return { pinnedStart: input.pinnedStart, scrollX: input.scrollX };
  }
  return { pinnedStart: input.dataStart, scrollX: desired };
}

export function statusColors(
  status: string,
  chart: ChartPalette = paletteFor("light").chart,
): {
  bg: string;
  fill: string | null;
  border: string;
} {
  if (status === "done") return chart.statusDone;
  if (status === "in-progress") return chart.statusInProgress;
  return chart.statusNotStarted;
}

/**
 * 本日線を折る日付。進捗率は見ない。
 * 期限超過は終了日（本日より左）。着手済みで開始日が今日より後なら、その開始日（右）まで伸ばす。
 */
export function lightningDate(
  task: { status: string; start: string; end: string },
  today: string,
): string {
  if (isOverdue(task, today)) return task.end;
  if (task.status !== "not-started" && task.start > today) return task.start;
  return today;
}

/** 完了以外で、終了日が今日より前のタスク。終了日が今日のタスクは期限当日なので超過にしない。 */
export function isOverdue(
  task: { status: string; end: string },
  today: string,
): boolean {
  return task.status !== "done" && task.end < today;
}

export function barColors(
  task: { status: string; end: string },
  today: string,
  scheme: ResolvedColorScheme = "light",
): {
  bg: string;
  fill: string | null;
  border: string;
} {
  const chart = paletteFor(scheme).chart;
  if (!isOverdue(task, today)) return statusColors(task.status, chart);
  if (task.status === "in-progress") return chart.overdueInProgress;
  return chart.overdueOther;
}

/** バー内ラベルの文字色。 */
export function barLabelFill(
  task: { status: string; end: string },
  today: string,
  scheme: ResolvedColorScheme = "light",
): string {
  const chart = paletteFor(scheme).chart;
  if (task.status === "done") return chart.barLabelOnFill;
  if (isOverdue(task, today)) return chart.barLabelOnFill;
  if (task.status === "in-progress") return chart.barLabelMuted;
  return chart.barLabelMuted;
}
