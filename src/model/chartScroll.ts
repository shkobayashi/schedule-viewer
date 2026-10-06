import { clamp, daysBetween, parseDate } from "./dates";

/** 今日の日付がチャートの左寄りに見える横スクロール位置。期間外は端で止める。 */
export function scrollXForToday(
  todayIso: string,
  timelineStart: Date,
  totalDays: number,
  pxPerDay: number,
  viewportWidth: number,
): number {
  const maxScrollX = Math.max(0, totalDays * pxPerDay - viewportWidth);
  if (maxScrollX <= 0 || pxPerDay <= 0) return 0;
  const dayIdx = daysBetween(timelineStart, parseDate(todayIso));
  if (dayIdx < 0) return 0;
  if (dayIdx >= totalDays) return maxScrollX;
  const x = dayIdx * pxPerDay;
  return clamp(x - 40, 0, maxScrollX);
}

/** タスクバーが横に見えているときは scrollX を変えない。見えないときは開始付近へ寄せる。 */
export function scrollXToRevealTask(
  taskStart: Date,
  barWidthPx: number,
  currentScrollX: number,
  timelineStart: Date,
  totalDays: number,
  pxPerDay: number,
  viewportWidth: number,
): number {
  const maxScrollX = Math.max(0, totalDays * pxPerDay - viewportWidth);
  if (maxScrollX <= 0 || pxPerDay <= 0) return 0;
  const barLeft = daysBetween(timelineStart, taskStart) * pxPerDay;
  const barRight = barLeft + barWidthPx;
  const viewLeft = currentScrollX;
  const viewRight = currentScrollX + viewportWidth;
  if (barRight > viewLeft && barLeft < viewRight) {
    return currentScrollX;
  }
  return clamp(barLeft - 40, 0, maxScrollX);
}
