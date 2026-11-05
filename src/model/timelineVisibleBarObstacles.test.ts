import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { timelineVisibleBarObstacles } from "./timelineVisibleBarObstacles";
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
  end: "2026-04-02",
};

const dateToX = (d: Date) => (d.getTime() - parseDate("2026-04-01").getTime()) / 86400000 * 10;

describe("timelineVisibleBarObstacles", () => {
  it("skips rows outside the viewport and skipped task ids", () => {
    const rows: VisibleRow[] = [
      { type: "task", task: taskA, y: 500 },
      { type: "task", task: taskB, y: 20 },
    ];
    const obstacles = timelineVisibleBarObstacles({
      rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
      bodyHeight: 200,
      dateToX,
      pxPerDay: 10,
      skipTaskIds: new Set([taskB.id]),
    });
    expect(obstacles).toHaveLength(0);
  });

  it("includes visible task bars and summary bars with layout coordinates", () => {
    const rows: VisibleRow[] = [
      { type: "task", task: taskA, y: 10 },
      {
        type: "group",
        id: "g1",
        categoryId: "c1",
        category: "Cat",
        label: "Grp",
        y: 40,
        collapsed: false,
        summary: {
          start: "2026-04-01",
          end: "2026-04-05",
          covered: [{ start: "2026-04-01", end: "2026-04-05" }],
        },
        rollupPercent: 50,
      },
      {
        type: "category",
        id: "c2",
        label: "Empty",
        y: 70,
        collapsed: false,
        summary: null,
        rollupPercent: null,
      },
    ];
    const obstacles = timelineVisibleBarObstacles({
      rows,
      scrollY: 0,
      rowHeight: 24,
      barHeight: 16,
      bodyHeight: 72,
      dateToX,
      pxPerDay: 10,
      skipTaskIds: new Set(),
    });
    expect(obstacles).toHaveLength(2);
    expect(obstacles[0]).toEqual({
      x: 0,
      y: 10 + (24 - 16) / 2,
      width: 30,
      height: 16,
    });
    expect(obstacles[1]).toEqual({
      x: 0,
      y: 40 + (24 - 8) / 2,
      width: 50,
      height: 8,
    });
  });
});
