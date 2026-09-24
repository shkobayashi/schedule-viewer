export type DateSpan = {
  start: string;
  end: string;
};

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
    if (next.start <= current.end) {
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
