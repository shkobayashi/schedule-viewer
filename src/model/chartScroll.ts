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
