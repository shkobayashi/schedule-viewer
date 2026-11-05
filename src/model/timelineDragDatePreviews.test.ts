import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import type { DragBarGeometry } from "./dragDates";
import { buildTimelineDragDatePreviews } from "./timelineDragDatePreviews";
import type { Task, VisibleRow } from "./types";

const task: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "A",
  start: "2026-04-01",
  end: "2026-04-03",
  assigneeIds: [],
  status: "in-progress",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
  note: "",
};

const dateToX = (d: Date) =>
  ((d.getTime() - parseDate("2026-04-01").getTime()) / 86400000) * 10;

describe("buildTimelineDragDatePreviews", () => {
  it("returns null when the task row is missing", () => {
    const geometry: DragBarGeometry = {
      taskId: task.id,
      kind: "move",
      barLeft: 0,
      barWidth: 30,
      barTop: 4,
      originX: 0,
    };
    expect(
      buildTimelineDragDatePreviews({
        geometry,
        visibleRows: [],
        selectedTaskIds: new Set([task.id]),
        timelineStart: parseDate("2026-04-01"),
        xToDate: (x) =>
          new Date(parseDate("2026-04-01").getTime() + (x / 10) * 86400000),
        pxPerDay: 10,
        dateToX,
        scrollY: 0,
        rowHeight: 24,
        barHeight: 16,
      }),
    ).toBeNull();
  });

  it("builds a primary preview for a single selected task move", () => {
    const rows: VisibleRow[] = [{ type: "task", task, y: 12 }];
    const geometry: DragBarGeometry = {
      taskId: task.id,
      kind: "move",
      barLeft: 20,
      barWidth: 30,
      barTop: 4,
      originX: 20,
    };
    const previews = buildTimelineDragDatePreviews({
      geometry,
      visibleRows: rows,
      selectedTaskIds: new Set([task.id]),
      timelineStart: parseDate("2026-04-01"),
      xToDate: (x) =>
        new Date(parseDate("2026-04-01").getTime() + (x / 10) * 86400000),
      pxPerDay: 10,
      dateToX,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
    });
    expect(previews).toHaveLength(1);
    expect(previews![0].barLeft).toBe(20);
    expect(previews![0].taskId).toBe(task.id);
  });
});
