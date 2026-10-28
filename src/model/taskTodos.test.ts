import { describe, expect, it } from "vitest";
import { parseScheduleText } from "./scheduleFile";
import { scheduleToJson } from "./serialize";
import type { Category, ScheduleDocument, Task } from "./types";
import {
  applyTaskTodosToTask,
  progressFromTodoItems,
  normalizeScheduleDocument,
  normalizeTaskWithTodos,
  formatTaskTodosForExcel,
} from "./taskTodos";
import { isOutlineBranch, isTaskNode } from "./hierarchy";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "T",
    start: "2026-01-01",
    end: "2026-01-01",
    assigneeIds: [],
    status: "not-started",
    progress: 50,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    ...overrides,
  };
}

describe("progressFromTodoItems", () => {
  it("returns 0 for 0/1", () => {
    expect(progressFromTodoItems([{ text: "a", done: false }])).toBe(0);
  });

  it("returns 100 only when all done", () => {
    expect(progressFromTodoItems([{ text: "a", done: true }])).toBe(100);
    expect(
      progressFromTodoItems([
        { text: "a", done: true },
        { text: "b", done: true },
        { text: "c", done: true },
        { text: "d", done: true },
        { text: "e", done: true },
        { text: "f", done: true },
      ]),
    ).toBe(100);
  });

  it("floors fractional progress", () => {
    expect(
      progressFromTodoItems([
        { text: "a", done: true },
        { text: "b", done: false },
        { text: "c", done: false },
      ]),
    ).toBe(33);
    expect(
      progressFromTodoItems([
        { text: "a", done: true },
        { text: "b", done: true },
        { text: "c", done: false },
      ]),
    ).toBe(66);
    expect(
      progressFromTodoItems([
        { text: "a", done: true },
        { text: "b", done: true },
        { text: "c", done: true },
        { text: "d", done: true },
        { text: "e", done: true },
        { text: "f", done: false },
      ]),
    ).toBe(83);
  });
});

describe("normalizeTaskWithTodos", () => {
  it("overwrites mismatched progress when todos exist", () => {
    const normalized = normalizeTaskWithTodos(
      task({
        progress: 99,
        todos: [{ text: "a", done: false }],
      }),
    );
    expect(normalized.progress).toBe(0);
  });

  it("keeps progress when todos are absent", () => {
    expect(normalizeTaskWithTodos(task({ progress: 42 })).progress).toBe(42);
  });
});

describe("applyTaskTodosToTask", () => {
  it("removes todos and keeps progress when last item removed", () => {
    const withTodos = task({
      progress: 50,
      todos: [{ text: "a", done: true }],
    });
    const next = applyTaskTodosToTask(withTodos, []);
    expect(next.todos).toBeUndefined();
    expect(next.progress).toBe(50);
  });
});

describe("normalizeScheduleDocument todos", () => {
  it("canonicalizes progress from todo count for outline-only tasks", () => {
    const taskId = "00000000-0000-4000-8000-000000000002";
    const doc: ScheduleDocument = {
      schemaVersion: 8,
      title: "outline",
      categories: [],
      milestoneGroups: [],
      milestones: [],
      levels: [
        { name: "まとまり", meaning: "上" },
        { name: "タスク", meaning: "下" },
      ],
      outline: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "ブロック",
          children: [
            task({
              id: taskId,
              progress: 80,
              todos: [{ text: "a", done: false }],
            }),
          ],
        },
      ],
    };
    const normalized = normalizeScheduleDocument(doc);
    const root = normalized.outline?.[0];
    const outlineTask =
      root && isOutlineBranch(root)
        ? root.children.find((node) => isTaskNode(node))
        : undefined;
    expect(outlineTask && "progress" in outlineTask ? outlineTask.progress : null).toBe(
      0,
    );
  });
});

describe("parseScheduleText todos", () => {
  const categories: Category[] = [
    {
      id: "c1000001-0000-4000-8000-000000000001",
      name: "C",
      groups: [
        {
          id: "d1000001-0000-4000-8000-000000000001",
          name: "G",
          tasks: [
            task({
              progress: 80,
              todos: [{ text: "a", done: false }],
            }),
          ],
        },
      ],
    },
  ];
  const json = JSON.stringify(scheduleToJson("P", categories, [], []));
  it("canonicalizes progress from todo count on load", () => {
    const parsed = parseScheduleText(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.categories[0].groups[0].tasks[0].progress).toBe(0);
    expect(parsed.canonicalJson).toContain('"progress": 0');
  });
});

describe("formatTaskTodosForExcel", () => {
  it("uses plain markers and newlines, separate from note", () => {
    const text = formatTaskTodosForExcel(
      task({
        todos: [
          { text: "one", done: true },
          { text: "two", done: false },
        ],
        note: "memo",
      }),
    );
    expect(text).toBe("[x] one\n[ ] two");
    expect(text).not.toContain("memo");
  });
});
