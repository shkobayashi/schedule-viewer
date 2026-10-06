import { describe, expect, it } from "vitest";
import { adjacentVisibleTaskId, visibleTaskIds } from "./taskSelection";
import type { Task, VisibleRow } from "./types";

function task(id: string): Task {
  return {
    id,
    name: id,
    start: "2026-01-01",
    end: "2026-01-02",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

const rows: VisibleRow[] = [
  {
    type: "category",
    id: "c1",
    label: "A",
    y: 0,
    collapsed: false,
    summary: null,
  },
  { type: "task", y: 32, task: task("t1") },
  { type: "task", y: 64, task: task("t2") },
];

describe("taskSelection", () => {
  it("lists only task rows", () => {
    expect(visibleTaskIds(rows)).toEqual(["t1", "t2"]);
  });

  it("moves selection along visible tasks", () => {
    expect(adjacentVisibleTaskId(rows, "t1", "next")).toBe("t2");
    expect(adjacentVisibleTaskId(rows, "t2", "prev")).toBe("t1");
    expect(adjacentVisibleTaskId(rows, "t1", "prev")).toBe("t1");
    expect(adjacentVisibleTaskId(rows, "t2", "next")).toBe("t2");
  });
});
