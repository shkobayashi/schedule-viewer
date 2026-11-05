import { describe, expect, it } from "vitest";
import { mapAllTasksInOutline } from "./outlineTaskMap";
import type { OutlineRoot, Task } from "./types";

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

describe("outlineTaskMap", () => {
  it("maps all tasks in outline", () => {
    const outline: OutlineRoot = [task];
    const next = mapAllTasksInOutline(outline, (t) =>
      t.id === task.id ? { ...t, name: "B" } : t,
    );
    expect(next[0].name).toBe("B");
  });
});
