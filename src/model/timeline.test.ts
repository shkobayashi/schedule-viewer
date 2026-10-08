import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { fitPxPerDayToViewport, resolveTimelineOrigin } from "./timeline";

describe("resolveTimelineOrigin", () => {
  const pinned = parseDate("2026-09-08");
  const pxPerDay = 22;

  it("keeps the origin when a later start would scroll past the left edge", () => {
    const next = resolveTimelineOrigin({
      pinnedStart: pinned,
      dataStart: parseDate("2026-09-12"),
      scrollX: 0,
      pxPerDay,
    });
    expect(next.pinnedStart.getTime()).toBe(pinned.getTime());
    expect(next.scrollX).toBe(0);
  });

  it("adopts a later start when the scroll can keep the same day in place", () => {
    const dataStart = parseDate("2026-09-12");
    const next = resolveTimelineOrigin({
      pinnedStart: pinned,
      dataStart,
      scrollX: 4 * pxPerDay,
      pxPerDay,
    });
    expect(next.pinnedStart.getTime()).toBe(dataStart.getTime());
    expect(next.scrollX).toBe(0);
  });

  it("adopts an earlier start and increases scroll", () => {
    const dataStart = parseDate("2026-09-06");
    const next = resolveTimelineOrigin({
      pinnedStart: pinned,
      dataStart,
      scrollX: 10,
      pxPerDay,
    });
    expect(next.pinnedStart.getTime()).toBe(dataStart.getTime());
    expect(next.scrollX).toBe(10 + 2 * pxPerDay);
  });
});

describe("fitPxPerDayToViewport", () => {
  it("includes extra days when fitting to the viewport width", () => {
    const baseTotalDays = 100;
    const extraForPx = (px: number) => (px < 10 ? 5 : 0);
    const px = fitPxPerDayToViewport(800, 0, baseTotalDays, extraForPx);
    expect(px).toBeCloseTo(800 / (baseTotalDays + 5), 1);
  });

  it("includes prefix days before the data range when fitting", () => {
    const px = fitPxPerDayToViewport(800, 10, 100, () => 0);
    expect(px).toBeCloseTo(800 / 110, 1);
  });
});
