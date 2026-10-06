import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { scrollXForToday, scrollXToRevealTask } from "./chartScroll";

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

describe("scrollXToRevealTask", () => {
  const start = parseDate("2026-04-01");
  const pxPerDay = 22;
  const width = 200;
  const totalDays = 30;

  it("keeps scroll when the bar intersects the viewport", () => {
    const taskStart = parseDate("2026-04-05");
    const barWidth = 5 * pxPerDay;
    const scrollX = 2 * pxPerDay;
    expect(
      scrollXToRevealTask(
        taskStart,
        barWidth,
        scrollX,
        start,
        totalDays,
        pxPerDay,
        width,
      ),
    ).toBe(scrollX);
  });

  it("scrolls toward the start when the bar is off screen", () => {
    const taskStart = parseDate("2026-04-20");
    const barWidth = 3 * pxPerDay;
    const scrollX = 0;
    expect(
      scrollXToRevealTask(
        taskStart,
        barWidth,
        scrollX,
        start,
        totalDays,
        pxPerDay,
        width,
      ),
    ).toBe(19 * pxPerDay - 40);
  });
});
