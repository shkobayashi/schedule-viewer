import { addDays, clamp, daysBetween, parseDate, todayIso } from "./dates";
import { paletteFor, type ChartPalette, type ResolvedColorScheme } from "./palette";
import { collectTasksFromDocument } from "./hierarchy";
import {
  BUILTIN_STATUS_ITEMS,
  labelColorOn,
  statusColorFor,
  statusRoleFor,
  type StatusItem,
  type StatusRole,
} from "./statusCatalog";
import type { Category, Milestone, OutlineRoot } from "./types";

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
  outline?: OutlineRoot,
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
  for (const task of collectTasksFromDocument({
    schemaVersion: 8,
    title: "",
    milestoneGroups: [],
    milestones: [],
    categories,
    outline,
  })) {
    consider(parseDate(task.start));
    consider(parseDate(task.end));
  }
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

export type FitViewAfterOpen = {
  pxPerDay: number;
  scrollX: number;
  scrollY: number;
};

/** ファイルを開いた直後の Fit。前の原点の空き日は含めない。 */
export function fitViewAfterOpen(
  viewportWidth: number,
  baseTotalDays: number,
  extraDaysForPx: (px: number) => number,
): FitViewAfterOpen | null {
  if (viewportWidth <= 0 || baseTotalDays <= 0) return null;
  const pxPerDay = fitPxPerDayToViewport(
    viewportWidth,
    0,
    baseTotalDays,
    extraDaysForPx,
  );
  return { pxPerDay, scrollX: 0, scrollY: 0 };
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

export type StatusBarColors = {
  bg: string;
  fill: string | null;
  border: string;
};

/**
 * 一覧の色から引く。進捗の帯は枠と同じ色で、どのステータスでも出す。
 * 超過でも地と帯は置き換えず、枠だけを超過の色にする。
 */
export function statusColors(
  status: string,
  chart: ChartPalette = paletteFor("light").chart,
  scheme: ResolvedColorScheme = "light",
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
): StatusBarColors {
  void chart;
  const color = statusColorFor(statuses, status, scheme);
  return { bg: color.bg, fill: color.border, border: color.border };
}

type TaskDates = { status: string; start: string; end: string };

function taskDatePeriod(
  task: TaskDates,
  today: string,
): "beforeStart" | "inRange" | "afterEnd" {
  if (today < task.start) return "beforeStart";
  if (task.end < today) return "afterEnd";
  return "inRange";
}

function lightningDateForRole(
  role: StatusRole | null,
  task: TaskDates,
  today: string,
): string {
  if (role === null || role === "unmanaged") return today;
  const period = taskDatePeriod(task, today);
  if (role === "not-started") {
    if (period === "beforeStart") return today;
    if (period === "inRange") return task.start;
    return task.end;
  }
  if (role === "started") {
    if (period === "beforeStart") return task.start;
    if (period === "inRange") return today;
    return task.end;
  }
  if (period === "beforeStart" || period === "inRange") return task.end;
  return today;
}

/**
 * 本日線を折る日付。進捗率は見ない。一覧の扱いと日付から決める。
 */
export function lightningDate(
  task: TaskDates,
  today: string,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
): string {
  const role = statusRoleFor(statuses, task.status);
  return lightningDateForRole(role, task, today);
}

/** 未着手と着手済みで、終了日が今日より前のタスク。一覧に無い id と管理外は超過にしない。 */
export function isOverdue(
  task: { status: string; end: string },
  today: string,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
): boolean {
  if (task.end >= today) return false;
  const role = statusRoleFor(statuses, task.status);
  if (role === null || role === "unmanaged") return false;
  return role === "not-started" || role === "started";
}

export function barColors(
  task: { status: string; end: string },
  today: string,
  scheme: ResolvedColorScheme = "light",
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
): StatusBarColors {
  const chart = paletteFor(scheme).chart;
  const colors = statusColors(task.status, chart, scheme, statuses);
  if (!isOverdue(task, today, statuses)) return colors;
  return { ...colors, border: chart.overdueOther.border };
}

/** バー内ラベルの文字色。地の色に合わせて白か暗色を選ぶ。 */
export function barLabelFill(
  task: { status: string; end: string },
  today: string,
  scheme: ResolvedColorScheme = "light",
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
): string {
  void today;
  const chart = paletteFor(scheme).chart;
  const bg = statusColorFor(statuses, task.status, scheme).bg;
  return labelColorOn(bg, chart.barLabelOnFill, chart.barLabelMuted);
}
