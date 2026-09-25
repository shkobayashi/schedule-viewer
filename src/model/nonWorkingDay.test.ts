import { describe, expect, it } from "vitest";
import { daysBetween, parseDate } from "./dates";
import { isNonWorkingDay, nonWorkingDayClipRects } from "./nonWorkingDay";
import type { CalendarDocument } from "./calendarTypes";

const sample: CalendarDocument = {
  schemaVersion: 1,
  weekends: ["sat", "sun"],
  nonWorkingDays: [{ date: "2026-01-01", name: "元日" }],
  workingDays: [{ date: "2026-01-03", name: "振替出勤" }],
};

describe("isNonWorkingDay", () => {
  it("defaults to Sat/Sun when calendar is null", () => {
    expect(isNonWorkingDay(parseDate("2026-01-03"), null)).toBe(true);
    expect(isNonWorkingDay(parseDate("2026-01-05"), null)).toBe(false);
  });

  it("respects workingDays override on weekends", () => {
    expect(isNonWorkingDay(parseDate("2026-01-03"), sample)).toBe(false);
    expect(isNonWorkingDay(parseDate("2026-01-04"), sample)).toBe(true);
  });

  it("treats an empty weekends list as no weekday holidays", () => {
    const calendar: CalendarDocument = {
      ...sample,
      weekends: [],
      workingDays: [],
    };
    expect(isNonWorkingDay(parseDate("2026-01-03"), calendar)).toBe(false);
    expect(isNonWorkingDay(parseDate("2026-01-01"), calendar)).toBe(true);
  });

  it("does not paint days past the schedule end", () => {
    const start = parseDate("2026-01-03");
    const rects = nonWorkingDayClipRects(
      start,
      0,
      0,
      (d) => daysBetween(start, d) * 10,
      10,
      1000,
      null,
      0,
    );
    expect(rects).toEqual([{ x: 0, width: 10 }]);
  });

  it("respects nonWorkingDays on weekdays", () => {
    expect(isNonWorkingDay(parseDate("2026-01-01"), sample)).toBe(true);
    expect(isNonWorkingDay(parseDate("2026-01-02"), sample)).toBe(false);
  });
});
