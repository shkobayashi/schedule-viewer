import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { isNonWorkingDay } from "./nonWorkingDay";
import type { CalendarDocument } from "./calendarTypes";

const sample: CalendarDocument = {
  schemaVersion: 1,
  weekends: ["sat", "sun"],
  nonWorkingDays: [{ date: "2026-01-01", name: "元日" }],
  workingDays: [{ date: "2026-02-23", name: "振替出勤" }],
};

describe("isNonWorkingDay", () => {
  it("defaults to Sat/Sun when calendar is null", () => {
    expect(isNonWorkingDay(parseDate("2026-01-03"), null)).toBe(true);
    expect(isNonWorkingDay(parseDate("2026-01-05"), null)).toBe(false);
  });

  it("respects workingDays override on weekends", () => {
    expect(isNonWorkingDay(parseDate("2026-02-23"), sample)).toBe(false);
  });

  it("respects nonWorkingDays on weekdays", () => {
    expect(isNonWorkingDay(parseDate("2026-01-01"), sample)).toBe(true);
    expect(isNonWorkingDay(parseDate("2026-01-02"), sample)).toBe(false);
  });
});
