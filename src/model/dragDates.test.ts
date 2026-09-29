import { describe, expect, it } from "vitest";
import { addDays, parseDate } from "./dates";
import {
  datesMovedBy,
  datesResizedFromEnd,
  datesResizedFromStart,
  dragDateChipSize,
  dragDateRectsClear,
  dragMoveDeltaDays,
  layoutDragDateChips,
  previewDatesForDrag,
  previewLinkBroken,
  resizeEndIso,
  type Rect,
} from "./dragDates";

const gap = 4;

function assertClearOfBar(start: Rect, end: Rect, bar: Rect) {
  expect(dragDateRectsClear(start, end, gap)).toBe(true);
  expect(dragDateRectsClear(start, bar, gap)).toBe(true);
  expect(dragDateRectsClear(end, bar, gap)).toBe(true);
}

function assertInside(
  box: Rect,
  viewport: { width: number; height: number },
) {
  expect(box.x).toBeGreaterThanOrEqual(-0.01);
  expect(box.y).toBeGreaterThanOrEqual(-0.01);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.01);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.01);
}

describe("layoutDragDateChips", () => {
  const viewport = { width: 400, height: 300 };
  const chip = { width: 40, height: 16 };

  it("places both dates above the ends when the bar is long enough", () => {
    const bar = { x: 80, y: 90, width: 160, height: 20 };
    const layout = layoutDragDateChips({
      bar,
      start: chip,
      end: chip,
      viewport,
      gap,
    });
    assertClearOfBar(layout.start, layout.end, bar);
    assertInside(layout.start, viewport);
    assertInside(layout.end, viewport);
    expect(layout.start.x + layout.start.width / 2).toBeCloseTo(bar.x, 0);
    expect(layout.end.x + layout.end.width / 2).toBeCloseTo(bar.x + bar.width, 0);
    expect(layout.start.y + layout.start.height + gap).toBeLessThanOrEqual(bar.y + 0.01);
    expect(layout.end.y + layout.end.height + gap).toBeLessThanOrEqual(bar.y + 0.01);
  });

  it("separates the chips when the bar is shorter than the labels", () => {
    const bar = { x: 180, y: 100, width: 8, height: 20 };
    const wide = { width: 80, height: 30 };
    const layout = layoutDragDateChips({
      bar,
      start: wide,
      end: wide,
      viewport,
      gap: 8,
    });
    expect(dragDateRectsClear(layout.start, layout.end, 8)).toBe(true);
    expect(dragDateRectsClear(layout.start, bar, 8)).toBe(true);
    expect(dragDateRectsClear(layout.end, bar, 8)).toBe(true);
    assertInside(layout.start, viewport);
    assertInside(layout.end, viewport);
  });

  it("shifts a chip inward when the end is at the screen edge", () => {
    const bar = { x: 150, y: 80, width: 40, height: 20 };
    const narrow = { width: 200, height: 300 };
    const layout = layoutDragDateChips({
      bar,
      start: chip,
      end: chip,
      viewport: narrow,
      gap,
    });
    assertClearOfBar(layout.start, layout.end, bar);
    assertInside(layout.start, narrow);
    assertInside(layout.end, narrow);
  });

  it("moves dates off the bar when the row is at the top of the chart", () => {
    const bar = { x: 120, y: 2, width: 80, height: 20 };
    const layout = layoutDragDateChips({
      bar,
      start: chip,
      end: chip,
      viewport,
      gap,
    });
    assertClearOfBar(layout.start, layout.end, bar);
    assertInside(layout.start, viewport);
    assertInside(layout.end, viewport);
    expect(layout.start.y + layout.start.height).toBeGreaterThan(bar.y);
  });

  it("keeps chips off the handle padding", () => {
    const bar = { x: 120, y: 0, width: 80, height: 20 };
    const avoid = { x: 116, y: 0, width: 88, height: 20 };
    const layout = layoutDragDateChips({
      bar,
      avoid,
      start: chip,
      end: { width: 36, height: 16 },
      viewport,
      gap,
    });
    expect(dragDateRectsClear(layout.start, avoid, gap)).toBe(true);
    expect(dragDateRectsClear(layout.end, avoid, gap)).toBe(true);
    expect(dragDateRectsClear(layout.start, layout.end, gap)).toBe(true);
    assertInside(layout.start, viewport);
    assertInside(layout.end, viewport);
  });

  it("avoids another bar when a clear slot exists", () => {
    const bar = { x: 100, y: 80, width: 120, height: 20 };
    const obstacle = { x: 40, y: 40, width: 240, height: 24 };
    const layout = layoutDragDateChips({
      bar,
      start: chip,
      end: chip,
      viewport,
      gap,
      obstacles: [obstacle],
    });
    assertClearOfBar(layout.start, layout.end, bar);
    expect(dragDateRectsClear(layout.start, obstacle, gap)).toBe(true);
    expect(dragDateRectsClear(layout.end, obstacle, gap)).toBe(true);
    expect(layout.start.x + layout.start.width + gap).toBeLessThanOrEqual(bar.x + 0.01);
    expect(layout.end.x).toBeGreaterThanOrEqual(bar.x + bar.width - 0.01);
  });
});

describe("dragDateChipSize", () => {
  it("sizes the date chip from the display font, not the timeline zoom", () => {
    const at11 = dragDateChipSize("12/31", 11, 4, 2);
    const at22 = dragDateChipSize("12/31", 22, 8, 4);
    expect(at22.width).toBeGreaterThan(at11.width * 1.5);
    expect(at22.height).toBeGreaterThan(at11.height);
  });
});

describe("previewDatesForDrag", () => {
  const timelineStart = parseDate("2026-09-01");
  const xToDate = (x: number) => addDays(timelineStart, x / 10);
  const task = { start: "2026-09-14", end: "2026-09-19" };

  it("moves start and end by the same rounded day count", () => {
    expect(dragMoveDeltaDays(0, 20, 10)).toBe(2);
    expect(datesMovedBy(task, 2)).toEqual({
      start: "2026-09-16",
      end: "2026-09-21",
    });
    expect(
      previewDatesForDrag(
        task,
        { kind: "move", barLeft: 20, barWidth: 50, originX: 0 },
        timelineStart,
        xToDate,
        10,
      ),
    ).toEqual({ start: "2026-09-16", end: "2026-09-21" });
  });

  it("snaps a resized end to the inclusive day and stops at the start", () => {
    expect(resizeEndIso(timelineStart, xToDate, 0, 30)).toBe("2026-09-03");
    expect(
      datesResizedFromEnd(task, timelineStart, xToDate, 130, 40),
    ).toEqual({ start: "2026-09-14", end: "2026-09-17" });
    expect(
      datesResizedFromEnd(
        { start: "2026-09-10" },
        timelineStart,
        xToDate,
        0,
        10,
      ),
    ).toEqual({ start: "2026-09-10", end: "2026-09-10" });
  });

  it("stops a resized start from passing the end", () => {
    expect(
      datesResizedFromStart({ end: "2026-09-03" }, timelineStart, xToDate, 50),
    ).toEqual({ start: "2026-09-06", end: "2026-09-06" });
  });
});

describe("previewLinkBroken", () => {
  const tasks = new Map([
    ["a", { start: "2026-09-01", end: "2026-09-05" }],
    ["b", { start: "2026-09-10", end: "2026-09-12" }],
  ]);
  const link = { fromId: "a", toId: "b", broken: false };

  it("recolors only the link touched by the dragged task", () => {
    expect(
      previewLinkBroken(link, tasks, {
        taskId: "a",
        start: "2026-09-06",
        end: "2026-09-10",
      }),
    ).toBe(false);
    expect(
      previewLinkBroken(link, tasks, {
        taskId: "a",
        start: "2026-09-07",
        end: "2026-09-11",
      }),
    ).toBe(true);
    expect(
      previewLinkBroken(
        { fromId: "a", toId: "b", broken: true },
        tasks,
        { taskId: "c", start: "2026-01-01", end: "2026-01-02" },
      ),
    ).toBe(true);
    expect(previewLinkBroken(link, tasks, null)).toBe(false);
  });

  it("uses the successor start when that task is dragged", () => {
    expect(
      previewLinkBroken(link, tasks, {
        taskId: "b",
        start: "2026-09-05",
        end: "2026-09-07",
      }),
    ).toBe(false);
    expect(
      previewLinkBroken(link, tasks, {
        taskId: "b",
        start: "2026-09-04",
        end: "2026-09-06",
      }),
    ).toBe(true);
  });
});
