import { describe, expect, it } from "vitest";
import { addDays, parseDate } from "./dates";
import {
  computeTimelineRange,
  fitPxPerDayToViewport,
  fitViewAfterOpen,
  resolveTimelineOrigin,
} from "./timeline";
import type { Milestone, OutlineRoot } from "./types";

describe("computeTimelineRange", () => {
  const ms: Milestone = {
    id: "b1000001-0000-4000-8000-000000000001",
    name: "中間確認",
    date: "2026-10-20",
    confidence: "committed",
    groupId: "a1000001-0000-4000-8000-000000000001",
  };

  it("uses outline task dates when categories are empty", () => {
    const outline: OutlineRoot = [
      {
        id: "f2000001-0000-4000-8000-000000000001",
        name: "北",
        children: [
          {
            id: "e2000001-0000-4000-8000-000000000001",
            name: "早い",
            start: "2026-10-01",
            end: "2026-10-04",
            assigneeIds: [],
            status: "in-progress",
            progress: 0,
            confidence: "committed",
            predecessors: [],
            milestoneId: null,
          },
          {
            id: "e2000001-0000-4000-8000-000000000006",
            name: "遅い",
            start: "2026-10-19",
            end: "2026-11-05",
            assigneeIds: [],
            status: "in-progress",
            progress: 0,
            confidence: "committed",
            predecessors: [],
            milestoneId: null,
          },
        ],
      },
    ];
    const range = computeTimelineRange([], [ms], "2026-10-15", outline);
    expect(range.timelineStart).toEqual(addDays(parseDate("2026-10-01"), -6));
    expect(range.timelineEnd).toEqual(addDays(parseDate("2026-11-05"), 7));
  });
});

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

describe("fitViewAfterOpen", () => {
  it("returns null when viewport width is zero or negative", () => {
    expect(fitViewAfterOpen(0, 100, () => 0)).toBeNull();
    expect(fitViewAfterOpen(-1, 100, () => 0)).toBeNull();
  });

  it("fits with zero prefix days and resets scroll positions", () => {
    const baseTotalDays = 100;
    const fit = fitViewAfterOpen(800, baseTotalDays, () => 0);
    expect(fit).not.toBeNull();
    expect(fit!.scrollX).toBe(0);
    expect(fit!.scrollY).toBe(0);
    expect(fit!.pxPerDay).toBeCloseTo(800 / baseTotalDays, 1);
  });

  it("does not include prefix days unlike fit with a positive prefix", () => {
    const baseTotalDays = 100;
    const withPrefix = fitPxPerDayToViewport(800, 10, baseTotalDays, () => 0);
    const afterOpen = fitViewAfterOpen(800, baseTotalDays, () => 0);
    expect(afterOpen!.pxPerDay).toBeGreaterThan(withPrefix);
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
