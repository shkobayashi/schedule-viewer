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

const dateToX = (d: Date) =>
  Math.floor((d.getTime() - parseDate("2026-01-01").getTime()) / 86400000) * 20;

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
      pxPerDay: 20,
    });
    const geo = buildExplanationOverlayGeometry({
      marks: [{ taskId: "t1", kind: "change", label: "move" }],
      visibleRows: rows,
      dateToX,
      pxPerDay: 20,
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
      pxPerDay: 20,
    });
    const marks: ExplanationMark[] = [
      { taskId: "t1", kind: "ask", label: "?" },
    ];
    const plan = planExplanationOverlayScroll({
      marks,
      visibleRows: rows,
      dateToX,
      pxPerDay: 20,
      scrollX: 0,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 14,
      bodyHeight: 120,
      chartWidth: 400,
      timelineStart: parseDate("2026-01-01"),
      totalDays: 60,
      liveAnchors,
    });
    expect(plan).not.toBeNull();
    expect(plan!.scrollY).toBeGreaterThan(0);
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
      pxPerDay: 20,
    });
    expect(
      explanationMarkVisibleInViewport({
        mark: { taskId: "t1", kind: "change", label: "x" },
        visibleRows: rows,
        dateToX,
        pxPerDay: 20,
        scrollY: 0,
        rowHeight: 24,
        bodyHeight: 120,
        chartWidth: 400,
        headerHeight: 30,
        milestoneBandHeight: 0,
        liveAnchors,
      }),
    ).toBe(false);
  });
});
