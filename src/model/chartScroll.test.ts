import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { scrollXForToday } from "./chartScroll";

describe("scrollXForToday", () => {
  const start = parseDate("2026-04-01");
  const pxPerDay = 22;
  const width = 200;

  it("scrolls so today sits near the left margin", () => {
    const x = scrollXForToday("2026-04-10", start, 30, pxPerDay, width);
    expect(x).toBe(9 * pxPerDay - 40);
  });

  it("clamps when today is before the range", () => {
    expect(scrollXForToday("2026-03-01", start, 30, pxPerDay, width)).toBe(0);
  });

  it("clamps when today is after the range", () => {
    const max = 30 * pxPerDay - width;
    expect(scrollXForToday("2026-05-15", start, 30, pxPerDay, width)).toBe(max);
  });
});
