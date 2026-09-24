const DAY_MS = 86400000;

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
