import { describe, expect, it } from "vitest";
import { addDays, isoDate, isoDateAtChartX, parseDate, todayIso } from "./dates";

describe("addDays", () => {
  it("steps across US DST end without losing a calendar day", () => {
    const start = parseDate("2026-10-31");
    const next = addDays(start, 1);
    expect(isoDate(next)).toBe("2026-11-01");
  });

  it("supports fractional days for timeline dragging", () => {
    const start = parseDate("2026-01-01");
    const mid = addDays(start, 0.5);
    expect(mid.getTime() - start.getTime()).toBe(43200000);
  });
});

describe("isoDateAtChartX", () => {
  const start = parseDate("2026-01-01");

  it("includes the left edge of a day and excludes the next left edge", () => {
    expect(isoDateAtChartX(start, 0, 10, 0, 10)).toBe("2026-01-01");
    expect(isoDateAtChartX(start, 0, 10, 9.999, 10)).toBe("2026-01-01");
    expect(isoDateAtChartX(start, 0, 10, 10, 10)).toBe("2026-01-02");
  });

  it("uses the day under a scrolled pointer", () => {
    expect(isoDateAtChartX(start, 25, 10, 4.999, 10)).toBe("2026-01-03");
    expect(isoDateAtChartX(start, 25, 10, 5, 10)).toBe("2026-01-04");
  });

  it("keeps the left edge when a day width does not divide evenly", () => {
    const pxPerDay = 22 * 1.4 * 1.4;
    const index = 3;
    const left = index * pxPerDay;
    const nextLeft = (index + 1) * pxPerDay;
    expect(isoDateAtChartX(start, 0, pxPerDay, left, 40)).toBe("2026-01-04");
    expect(isoDateAtChartX(start, 0, pxPerDay, nextLeft - 0.01, 40)).toBe(
      "2026-01-04",
    );
    expect(isoDateAtChartX(start, 0, pxPerDay, nextLeft, 40)).toBe("2026-01-05");
  });

  it("returns null outside the timeline and when a day has no width", () => {
    expect(isoDateAtChartX(start, 0, 10, -0.1, 10)).toBeNull();
    expect(isoDateAtChartX(start, 0, 10, 100, 10)).toBeNull();
    expect(isoDateAtChartX(start, 0, 0, 0, 10)).toBeNull();
  });
});

describe("todayIso", () => {
  it("formats UTC calendar date", () => {
    expect(todayIso(new Date("2026-09-25T15:00:00+09:00"))).toBe("2026-09-25");
  });
});
