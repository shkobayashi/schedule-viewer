import { addDays, parseDate } from "./dates";

export type DateSpan = {
  start: string;
  end: string;
};

/** 終了日（含む）の翌日。タスクバーと同じ exclusive end。 */
export function spanExclusiveEnd(end: string): Date {
  return addDays(parseDate(end), 1);
}

export function summaryBarWidthPx(
  start: string,
  end: string,
  dateToX: (d: Date) => number,
  minWidth: number,
): { x: number; width: number } {
  const x = dateToX(parseDate(start));
  const width = Math.max(minWidth, dateToX(spanExclusiveEnd(end)) - x);
  return { x, width };
}

export function coveredSpanWidthPx(
  start: string,
  end: string,
  dateToX: (d: Date) => number,
  minWidth: number,
): number {
  return Math.max(
    minWidth,
    dateToX(spanExclusiveEnd(end)) - dateToX(parseDate(start)),
  );
}

export type SummarySpan = {
  start: string;
  end: string;
  /** 子が覆っている区間。隣り合う区間のあいだは空白。 */
  covered: DateSpan[];
};

/** 子の最早開始から最遅終了まで。接している区間はつなぎ、離れている区間は空白として残す。 */
export function summarizeSpans(
  spans: DateSpan[],
): SummarySpan | null {
  if (spans.length === 0) return null;
  const sorted = [...spans].sort((a, b) =>
    a.start < b.start ? -1 : a.start > b.start ? 1 : 0,
  );
  const covered: DateSpan[] = [];
  let current = { start: sorted[0].start, end: sorted[0].end };
  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    const currentExclusiveEnd = spanExclusiveEnd(current.end);
    const nextStart = parseDate(next.start);
    if (nextStart.getTime() <= currentExclusiveEnd.getTime()) {
      if (next.end > current.end) current = { ...current, end: next.end };
    } else {
      covered.push(current);
      current = { start: next.start, end: next.end };
    }
  }
  covered.push(current);
  return {
    start: covered[0].start,
    end: covered[covered.length - 1].end,
    covered,
  };
}
