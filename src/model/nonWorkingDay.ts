import { isoDate, parseDate, addDays } from "./dates";
import { utcWeekdayFromDate } from "./calendarSemantics";
import type { CalendarDocument } from "./calendarTypes";

const DEFAULT_WEEKEND_DOW = new Set([0, 6]);

type CalendarIndex = {
  weekends: Set<string>;
  nonWorking: Set<string>;
  working: Set<string>;
};

const calendarIndexCache = new WeakMap<CalendarDocument, CalendarIndex>();

function isDefaultWeekend(d: Date): boolean {
  return DEFAULT_WEEKEND_DOW.has(d.getUTCDay());
}

function calendarIndex(calendar: CalendarDocument): CalendarIndex {
  const cached = calendarIndexCache.get(calendar);
  if (cached) return cached;
  const index: CalendarIndex = {
    weekends: new Set(calendar.weekends),
    nonWorking: new Set(calendar.nonWorkingDays.map((entry) => entry.date)),
    working: new Set(calendar.workingDays.map((entry) => entry.date)),
  };
  calendarIndexCache.set(calendar, index);
  return index;
}

/** 非稼働日なら true。calendar が null のときは土日のみ非稼働。 */
export function isNonWorkingDay(
  date: Date,
  calendar: CalendarDocument | null,
): boolean {
  const key = isoDate(date);
  if (calendar) {
    const index = calendarIndex(calendar);
    if (index.working.has(key)) return false;
    if (index.nonWorking.has(key)) return true;
    return index.weekends.has(utcWeekdayFromDate(date));
  }
  return isDefaultWeekend(date);
}

export function isNonWorkingIsoDate(
  iso: string,
  calendar: CalendarDocument | null,
): boolean {
  return isNonWorkingDay(parseDate(iso), calendar);
}

export type NonWorkingClipRect = { x: number; width: number };

/** 日表示・週表示用。chartWidth 内にクリップした1日分の帯。 */
export function nonWorkingDayClipRects(
  timelineStart: Date,
  dayIndexStart: number,
  dayIndexEnd: number,
  dateToX: (d: Date) => number,
  pxPerDay: number,
  chartWidth: number,
  calendar: CalendarDocument | null,
  maxDayIndex: number,
): NonWorkingClipRect[] {
  const rects: NonWorkingClipRect[] = [];
  const padStart = Math.max(0, dayIndexStart - 2);
  const padEnd = Math.min(dayIndexEnd + 2, maxDayIndex);
  for (let i = padStart; i <= padEnd; i += 1) {
    const d = addDays(timelineStart, i);
    if (!isNonWorkingDay(d, calendar)) continue;
    const x = dateToX(d);
    const spanRight = x + pxPerDay;
    if (spanRight < 0) continue;
    const clipX = Math.max(0, x);
    const clipRight = Math.min(chartWidth, spanRight);
    const clipW = clipRight - clipX;
    if (clipW > 0) {
      rects.push({ x: clipX, width: clipW });
    }
  }
  return rects;
}
