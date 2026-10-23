import {
  addDays,
  addUtcMonths,
  fmtShort,
  isoDate,
  parseDate,
  utcMonthStart,
} from "./dates";
import { isNonWorkingDay } from "./nonWorkingDay";
import { formatYearMonth } from "./monthHeader";
import type { CalendarDocument } from "./calendarTypes";
import type { GridTier } from "./timeline";

export type ExcelTimeColumn = {
  startIso: string;
  endExclusiveIso: string;
  headerLabel: string;
  nonWorking: boolean;
};

function mondayOnOrBefore(d: Date): Date {
  const day = d.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  return addDays(d, -offset);
}

export function buildExcelTimeColumns(
  timelineStart: Date,
  timelineEnd: Date,
  tier: GridTier,
  calendar: CalendarDocument | null,
): ExcelTimeColumn[] {
  const columns: ExcelTimeColumn[] = [];
  if (tier === "day") {
    let d = timelineStart;
    while (d < timelineEnd) {
      const startIso = isoDate(d);
      const next = addDays(d, 1);
      columns.push({
        startIso,
        endExclusiveIso: isoDate(next),
        headerLabel: fmtShort(d),
        nonWorking: isNonWorkingDay(d, calendar),
      });
      d = next;
    }
    return columns;
  }
  if (tier === "week") {
    let cursor = timelineStart;
    while (cursor < timelineEnd) {
      const weekEnd = addDays(mondayOnOrBefore(cursor), 7);
      const colEnd = weekEnd < timelineEnd ? weekEnd : timelineEnd;
      columns.push({
        startIso: isoDate(cursor),
        endExclusiveIso: isoDate(colEnd),
        headerLabel: fmtShort(cursor),
        nonWorking: false,
      });
      cursor = colEnd;
    }
    return columns;
  }
  let cursor = timelineStart;
  while (cursor < timelineEnd) {
    const monthStart = utcMonthStart(cursor);
    const nextMonth = addUtcMonths(monthStart, 1);
    const colEnd = nextMonth < timelineEnd ? nextMonth : timelineEnd;
    columns.push({
      startIso: isoDate(cursor),
      endExclusiveIso: isoDate(colEnd),
      headerLabel: formatYearMonth(monthStart),
      nonWorking: false,
    });
    cursor = colEnd;
  }
  return columns;
}

export function columnIndexForDate(
  columns: ExcelTimeColumn[],
  iso: string,
): number {
  const time = parseDate(iso).getTime();
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i]!;
    const start = parseDate(col.startIso).getTime();
    const end = parseDate(col.endExclusiveIso).getTime();
    if (time >= start && time < end) return i;
  }
  if (columns.length === 0) return 0;
  const last = columns[columns.length - 1]!;
  if (time >= parseDate(last.endExclusiveIso).getTime()) return columns.length - 1;
  return 0;
}
