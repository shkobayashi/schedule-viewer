import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { buildTimelineLightningPolyline } from "./timelineLightningPolyline";
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

describe("buildTimelineLightningPolyline", () => {
  it("starts and ends on today x at top and body bottom", () => {
    const todayDate = parseDate("2026-04-01");
    const dateToX = (d: Date) =>
      ((d.getTime() - todayDate.getTime()) / 86400000) * 10;
    const rows: VisibleRow[] = [{ type: "task", task, y: 20 }];
    const points = buildTimelineLightningPolyline({
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      bodyHeight: 200,
      today: "2026-04-01",
      todayDate,
      statuses: [],
      dateToX,
    });
    expect(points[0]).toBe(0);
    expect(points[1]).toBe(0);
    expect(points[points.length - 2]).toBe(0);
    expect(points[points.length - 1]).toBe(200);
  });
});
