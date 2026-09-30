import { describe, expect, it } from "vitest";
import { cloneCategories, mapTasks } from "./tasks";
import { sampleCategories } from "../sample/schedule";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
} from "./scheduleSemantics";
import { SCHEDULE_SCHEMA_VERSION, type ScheduleDocument } from "./types";

function docWithCategories(categories: ScheduleDocument["categories"]): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: "t",
    categories,
    milestones: [],
  };
}

describe("task edit dependency validation", () => {
  it("detects indirect cycles", () => {
    const categories = cloneCategories(sampleCategories);
    const tasks = categories.flatMap((c) =>
      c.groups.flatMap((g) => g.tasks),
    );
    const a = tasks[0]!;
    const b = tasks[1]!;
    const c = tasks[2]!;
    const patched = mapTasks(categories, (task) => {
      if (task.id === a.id) return { ...task, predecessors: [c.id] };
      if (task.id === b.id) return { ...task, predecessors: [a.id] };
      if (task.id === c.id) return { ...task, predecessors: [b.id] };
      return task;
    });
    const doc = docWithCategories(patched);
    const issues = validateDependencyCycles(doc);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.message).toContain("循環");
  });

  it("detects a direct cycle", () => {
    const categories = cloneCategories(sampleCategories);
    const tasks = categories.flatMap((c) =>
      c.groups.flatMap((g) => g.tasks),
    );
    const a = tasks[0]!;
    const b = tasks[1]!;
    const patched = mapTasks(categories, (task) => {
      if (task.id === a.id) return { ...task, predecessors: [b.id] };
      if (task.id === b.id) return { ...task, predecessors: [a.id] };
      return task;
    });
    const issues = validateDependencyCycles(docWithCategories(patched));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.message).toContain(a.name);
    expect(issues[0]?.message).toContain(b.name);
    expect(issues[0]?.message).not.toContain(a.id);
    expect(issues[0]?.path).toMatch(/^\/categories\/\d+\/groups\/\d+\/tasks\/\d+$/);
  });

  it("clears a cycle once the closing predecessor is removed", () => {
    const categories = cloneCategories(sampleCategories);
    const tasks = categories.flatMap((c) =>
      c.groups.flatMap((g) => g.tasks),
    );
    const a = tasks[0]!;
    const b = tasks[1]!;
    const cyclic = mapTasks(categories, (task) => {
      if (task.id === a.id) return { ...task, predecessors: [b.id] };
      if (task.id === b.id) return { ...task, predecessors: [a.id] };
      return task;
    });
    expect(
      validateDependencyCycles(docWithCategories(cyclic)).length,
    ).toBeGreaterThan(0);
    const resolved = mapTasks(cyclic, (task) => {
      if (task.id === a.id) return { ...task, predecessors: [] };
      return task;
    });
    expect(validateDependencyCycles(docWithCategories(resolved))).toEqual([]);
  });

  it("accepts acyclic edits", () => {
    const categories = cloneCategories(sampleCategories);
    const tasks = categories.flatMap((c) =>
      c.groups.flatMap((g) => g.tasks),
    );
    const a = tasks[0]!;
    const b = tasks[1]!;
    const patched = mapTasks(categories, (task) => {
      if (task.id === b.id) return { ...task, predecessors: [a.id] };
      return task;
    });
    const doc = docWithCategories(patched);
    expect(validateDependencyCycles(doc)).toEqual([]);
    expect(validatePredecessorRefs(doc)).toEqual([]);
  });
});
