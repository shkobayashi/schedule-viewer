import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import type { VisibleRow } from "./types";
import {
  buildExplanationOverlayGeometry,
  buildTaskBarAnchorsForOverlay,
  explanationMarkVisibleInViewport,
  planExplanationOverlayScroll,
} from "./explainOverlayLayout";
import type { ExplanationMark } from "./explainOverlay";

const timelineStart = parseDate("2026-01-01");
const pxPerDay = 20;
const scrollX = 100;

const dateToX = (d: Date) =>
  Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) * pxPerDay -
  scrollX;

const taskRow = (
  id: string,
  y: number,
  start = "2026-01-05",
  end = "2026-01-10",
): Extract<VisibleRow, { type: "task" }> => ({
  type: "task",
  y,
  task: {
    id,
    name: id,
    start,
    end,
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    tags: [],
  },
});

describe("buildExplanationOverlayGeometry", () => {
  it("cuts task bar and sidebar row for task mark", () => {
    const rows = [taskRow("t1", 40)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      dateToX,
      pxPerDay,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [{ taskId: "t1", kind: "change", label: "move" }],
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 200,
      headerHeight: 30,
      milestoneBandHeight: 0,
      timelineWidth: 400,
      sidebarWidth: 120,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
    });
    expect(geo.timelineHoles.length).toBeGreaterThan(0);
    expect(geo.sidebarHoles.length).toBe(1);
    expect(geo.sidebarHoles[0]?.y).toBe(40);
    expect(geo.timelineBalloons[0]?.placement).toBeDefined();
    expect(geo.timelineBalloons[0]?.maxWidth).toBe(160);
  });

  it("buildExplanationOverlayGeometry_clipsTaskBarToDate", () => {
    const rows = [taskRow("t1", 40)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      dateToX,
      pxPerDay,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [
        {
          taskId: "t1",
          date: "2026-01-06",
          kind: "change",
          label: "day",
        },
      ],
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 200,
      headerHeight: 30,
      milestoneBandHeight: 0,
      timelineWidth: 400,
      sidebarWidth: 120,
      liveAnchors,
      milestones: [],
      milestoneCenterYById: new Map(),
      milestoneDiamondSize: 11,
    });
    const hole = geo.timelineHoles[0]!;
    expect(hole.width).toBeLessThanOrEqual(pxPerDay + 1);
  });
});

describe("planExplanationOverlayScroll", () => {
  it("reveals first task mark when off screen vertically", () => {
    const rows = [taskRow("t1", 400)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      dateToX,
      pxPerDay,
    });
    const marks: ExplanationMark[] = [
      { taskId: "t1", kind: "ask", label: "?" },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: rows,
      dateToX,
      pxPerDay,
      scrollX: 0,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 400,
      timelineStart,
      totalDays: 60,
      liveAnchors,
    });
    expect(plan).not.toBeNull();
    expect(plan!.scrollY).toBeGreaterThan(0);
  });

  it("planExplanationOverlayScroll_dateOnlyAdjustsHorizontal", () => {
    const marks: ExplanationMark[] = [
      { date: "2026-01-20", kind: "ask", label: "?" },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: [],
      dateToX,
      pxPerDay,
      scrollX: 0,
      scrollY: 50,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 400,
      timelineStart,
      totalDays: 60,
      liveAnchors: new Map(),
    });
    expect(plan).not.toBeNull();
    expect(plan!.scrollX).toBeGreaterThan(0);
    expect(plan!.scrollY).toBe(50);
  });

  it("planExplanationOverlayScroll_firstMarkUsesTaskDate", () => {
    const rows = [taskRow("t1", 0, "2026-01-05", "2026-01-20")];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      dateToX: (d) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay,
      pxPerDay,
    });
    const marks: ExplanationMark[] = [
      {
        taskId: "t1",
        date: "2026-01-15",
        kind: "change",
        label: "x",
      },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: rows,
      dateToX: (d) =>
        Math.floor((d.getTime() - timelineStart.getTime()) / 86400000) *
          pxPerDay,
      pxPerDay,
      scrollX: 0,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 80,
      timelineStart,
      totalDays: 60,
      liveAnchors,
    });
    expect(plan).not.toBeNull();
    const day15Scroll =
      Math.floor(
        (parseDate("2026-01-15").getTime() - timelineStart.getTime()) /
          86400000,
      ) * pxPerDay;
    expect(plan!.scrollX).toBeGreaterThanOrEqual(day15Scroll - 40);
  });
});

describe("explanationMarkVisibleInViewport", () => {
  it("is false when task row is scrolled out", () => {
    const rows = [taskRow("t1", 400)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      dateToX,
      pxPerDay,
    });
    expect(
      explanationMarkVisibleInViewport({
        mark: { taskId: "t1", kind: "change", label: "x" },
        visibleRows: rows,
        pxPerDay,
        scrollX: 0,
        scrollY: 0,
        rowHeight: 24,
        bodyHeight: 120,
        chartWidth: 400,
        timelineStart,
        liveAnchors,
      }),
    ).toBe(false);
  });

  it("explanationMarkVisibleInViewport_trueWhenScrolledIntoView", () => {
    const rows = [taskRow("t1", 400)];
    const liveAnchors = buildTaskBarAnchorsForOverlay({
      visibleRows: rows,
      scrollY: 350,
      rowHeight: 24,
      dateToX,
      pxPerDay,
    });
    expect(
      explanationMarkVisibleInViewport({
        mark: { taskId: "t1", kind: "change", label: "x" },
        visibleRows: rows,
        pxPerDay,
        scrollX,
        scrollY: 350,
        rowHeight: 24,
        bodyHeight: 120,
        chartWidth: 400,
        timelineStart,
        liveAnchors,
      }),
    ).toBe(true);
  });
});
