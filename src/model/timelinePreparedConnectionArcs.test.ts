import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { prepareTimelineConnectionArcs } from "./timelinePreparedConnectionArcs";
import type { Task, VisibleRow } from "./types";

const taskA: Task = {
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

const taskB: Task = {
  ...taskA,
  id: "00000000-0000-4000-8000-000000000002",
  name: "B",
  start: "2026-04-04",
  end: "2026-04-05",
};

const dateToX = (d: Date) =>
  ((d.getTime() - parseDate("2026-04-01").getTime()) / 86400000) * 10;

describe("prepareTimelineConnectionArcs", () => {
  it("returns empty when there are no connections", () => {
    expect(
      prepareTimelineConnectionArcs({
        connections: [],
        visibleRows: [],
        scrollY: 0,
        rowHeight: 24,
        barHeight: 16,
        bodyHeight: 200,
        dateToX,
        pxPerDay: 10,
        liveAnchors: new Map(),
      }),
    ).toEqual([]);
  });

  it("skips arcs when either anchor is missing", () => {
    const rows: VisibleRow[] = [{ type: "task", task: taskA, y: 0 }];
    const prepared = prepareTimelineConnectionArcs({
      connections: [{ taskIds: [taskA.id, taskB.id], label: "x" }],
      visibleRows: rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
      bodyHeight: 200,
      dateToX,
      pxPerDay: 10,
      liveAnchors: new Map([
        [taskA.id, { x: 0, right: 30, y: 12, linkRight: 30 }],
      ]),
    });
    expect(prepared).toHaveLength(0);
  });
});
