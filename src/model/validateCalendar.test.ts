import { describe, expect, it } from "vitest";
import { validateCalendar } from "./validateCalendar";

describe("validateCalendar", () => {
  it("rejects the same date in nonWorkingDays and workingDays", () => {
    const result = validateCalendar({
      schemaVersion: 1,
      weekends: ["sat", "sun"],
      nonWorkingDays: [{ date: "2026-01-01" }],
      workingDays: [{ date: "2026-01-01" }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a duplicate date inside nonWorkingDays", () => {
    const result = validateCalendar({
      schemaVersion: 1,
      weekends: [],
      nonWorkingDays: [{ date: "2026-01-01" }, { date: "2026-01-01" }],
      workingDays: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate weekends", () => {
    const result = validateCalendar({
      schemaVersion: 1,
      weekends: ["sat", "sat"],
      nonWorkingDays: [],
      workingDays: [],
    });
    expect(result.ok).toBe(false);
  });
});
