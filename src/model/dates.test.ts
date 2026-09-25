import { describe, expect, it } from "vitest";
import { addDays, isoDate, parseDate, todayIso } from "./dates";

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

describe("todayIso", () => {
  it("formats UTC calendar date", () => {
    expect(todayIso(new Date("2026-09-25T15:00:00+09:00"))).toBe("2026-09-25");
  });
});
