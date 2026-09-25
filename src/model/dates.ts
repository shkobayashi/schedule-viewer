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

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function roundToDay(timelineStart: Date, d: Date): Date {
  return addDays(timelineStart, daysBetween(timelineStart, d));
}
