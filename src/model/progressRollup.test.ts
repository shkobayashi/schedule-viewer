import { describe, expect, it } from "vitest";
import {
  averageTaskProgress,
  categoryRollupPercent,
  groupRollupPercent,
  taskProgressForRollup,
} from "./progressRollup";
import type { Category, Task, TaskGroup } from "./types";

const baseTask: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "T",
  start: "2026-01-01",
  end: "2026-01-02",
  assigneeId: null,
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
};

function task(overrides: Partial<Task>): Task {
  return { ...baseTask, ...overrides, id: overrides.id ?? baseTask.id };
}

function group(id: string, tasks: Task[]): TaskGroup {
  return { id, name: id, tasks };
}

function category(id: string, groups: TaskGroup[]): Category {
  return { id, name: id, groups };
}

describe("taskProgressForRollup", () => {
  it("counts done as 100 without changing stored progress", () => {
    const t = task({ status: "done", progress: 0 });
    expect(taskProgressForRollup(t)).toBe(100);
    expect(t.progress).toBe(0);
  });

  it("uses not-started progress as-is", () => {
    expect(taskProgressForRollup(task({ status: "not-started", progress: 40 }))).toBe(
      40,
    );
  });

  it("uses in-progress progress from the field", () => {
    expect(
      taskProgressForRollup(task({ status: "in-progress", progress: 30 })),
    ).toBe(30);
  });
});

describe("averageTaskProgress", () => {
  it("does not weight by schedule duration", () => {
    const short = task({
      id: "s",
      start: "2026-01-01",
      end: "2026-01-01",
      progress: 0,
    });
    const long = task({
      id: "l",
      start: "2026-01-01",
      end: "2026-01-10",
      status: "in-progress",
      progress: 100,
    });
    expect(averageTaskProgress([short, long])).toBe(50);
  });

  it("rounds to an integer and keeps zero", () => {
    expect(averageTaskProgress([task({ progress: 0 }), task({ progress: 1 })])).toBe(
      1,
    );
    expect(
      averageTaskProgress([
        task({ id: "a", progress: 0 }),
        task({ id: "b", progress: 0 }),
        task({ id: "c", progress: 1 }),
      ]),
    ).toBe(0);
    expect(
      averageTaskProgress([
        task({ id: "a", progress: 0 }),
        task({ id: "b", status: "in-progress", progress: 100 }),
        task({ id: "c", status: "in-progress", progress: 100 }),
      ]),
    ).toBe(67);
  });

  it("returns null when there are no tasks", () => {
    expect(averageTaskProgress([])).toBeNull();
  });
});

describe("groupRollupPercent", () => {
  it("returns null for an empty group", () => {
    expect(groupRollupPercent(group("g", []))).toBeNull();
  });
});

describe("categoryRollupPercent", () => {
  it("averages tasks not group percents", () => {
    const cat = category("c", [
      group("g1", [task({ id: "t1", progress: 0 })]),
      group("g2", [
        task({ id: "t2", status: "in-progress", progress: 100 }),
        task({ id: "t3", status: "in-progress", progress: 100 }),
      ]),
    ]);
    expect(categoryRollupPercent(cat)).toBe(67);
    expect(groupRollupPercent(cat.groups[0]!)).toBe(0);
    expect(groupRollupPercent(cat.groups[1]!)).toBe(100);
    const groupPercentAverage = Math.round(
      (groupRollupPercent(cat.groups[0]!)! +
        groupRollupPercent(cat.groups[1]!)!) /
        2,
    );
    expect(groupPercentAverage).toBe(50);
  });

  it("includes tasks in groups that would not appear as rows", () => {
    const hiddenTask = task({
      id: "hidden",
      name: "HiddenOnly",
      status: "in-progress",
      progress: 100,
    });
    const cat = category("c", [
      group("g1", [task({ id: "t1", name: "Visible", progress: 0 })]),
      group("g2", [hiddenTask]),
    ]);
    expect(categoryRollupPercent(cat)).toBe(50);
  });
});
