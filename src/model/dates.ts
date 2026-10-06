const DAY_MS = 86400000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 実在する暦日の YYYY-MM-DD か（内部は UTC 暦日として保持）。 */
export function isIsoDateString(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return value === isoDate(parsed);
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isoDate(d: Date): string {
  return (
    d.getUTCFullYear() +
    "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

/** 実行時の本日（実行環境のローカル暦日、YYYY-MM-DD）。 */
export function todayIso(now: Date = new Date()): string {
  return isoDate(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function addUtcMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

export function addDays(d: Date, n: number): Date {
  if (Number.isInteger(n)) {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n),
    );
  }
  return new Date(d.getTime() + n * DAY_MS);
}

export function fmtShort(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 左一覧の列。YYYY-MM-DD の月日を `09/19` にする。 */
export function fmtMonthDay(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function fmtWeekday(d: Date): string {
  return WEEKDAY_LABELS[d.getUTCDay()] ?? "";
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function roundToDay(timelineStart: Date, d: Date): Date {
  return addDays(timelineStart, daysBetween(timelineStart, d));
}

/**
 * チャート上の横位置が含まれる暦日。日の左端を含み、次の日の左端は含まない。
 * 日インデックスが 0 未満、または totalDays 以上、pxPerDay が 0 以下なら null。
 */
export function isoDateAtChartX(
  timelineStart: Date,
  scrollX: number,
  pxPerDay: number,
  chartX: number,
  totalDays: number,
): string | null {
  if (!(pxPerDay > 0) || !Number.isFinite(chartX) || !Number.isFinite(scrollX)) {
    return null;
  }
  // 日幅が割り切れないとき、左端の商が整数の直前まで落ちることがある。
  const dayIndex = Math.floor((chartX + scrollX) / pxPerDay + 1e-6);
  if (dayIndex < 0 || dayIndex >= totalDays) return null;
  return isoDate(addDays(timelineStart, dayIndex));
}
