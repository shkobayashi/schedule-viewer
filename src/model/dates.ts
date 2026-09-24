const DAY_MS = 86400000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 実在する暦日の YYYY-MM-DD か。 */
export function isIsoDateString(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return value === `${parsed.getFullYear()}-${month}-${day}`;
}

export function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export function isoDate(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function fmtShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function roundToDay(timelineStart: Date, d: Date): Date {
  return addDays(timelineStart, daysBetween(timelineStart, d));
}
