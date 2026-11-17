import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import type { DragDatePreview } from "./dragDates";
import {
  applyDragPreviewsToTimelineAnchors,
  buildTimelineTaskAnchors,
} from "./timelineLiveAnchors";
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

describe("timelineLiveAnchors", () => {
  it("adds linkRight at least six px past the bar left", () => {
    const rows: VisibleRow[] = [{ type: "task", task, y: 0 }];
    const anchors = buildTimelineTaskAnchors({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
      pxPerDay: 10,
      dateToX,
    });
    const anchor = anchors.get(task.id)!;
    expect(anchor.linkRight).toBeGreaterThanOrEqual(anchor.x + 6);
  });

  it("overrides anchor geometry while dragging", () => {
    const rows: VisibleRow[] = [{ type: "task", task, y: 0 }];
    const base = buildTimelineTaskAnchors({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
      pxPerDay: 10,
      dateToX,
    });
    const preview: DragDatePreview = {
      taskId: task.id,
      kind: "move",
      start: task.start,
      end: task.end,
      barLeft: 50,
      barWidth: 40,
      barTop: 4,
    };
    const live = applyDragPreviewsToTimelineAnchors({
      taskAnchors: base,
      dragPreviews: [preview],
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
      pxPerDay: 10,
      dateToX,
    });
    expect(live.get(task.id)!.x).toBe(50);
  });
});
