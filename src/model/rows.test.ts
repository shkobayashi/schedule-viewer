import { describe, expect, it } from "vitest";
import { taskMatchesFilter } from "./rows";
import type { ScheduleFilters, Task } from "./types";

const baseTask: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Alpha",
  start: "2026-01-01",
  end: "2026-01-02",
  assigneeId: null,
  status: "not-started",
  progress: 0,
  predecessors: [],
  milestoneId: null,
};

const filters: ScheduleFilters = {
  assignee: "all",
  status: "all",
  overdue: "all",
  relation: "all",
  search: "",
  noteSearch: "",
};

describe("taskMatchesFilter noteSearch", () => {
  it("matches note substring independently of name", () => {
    const task = { ...baseTask, note: "補足のキーワード" };
    expect(
      taskMatchesFilter(
        task,
        { ...filters, noteSearch: "キーワード" },
        "2026-01-01",
        null,
      ),
    ).toBe(true);
    expect(
      taskMatchesFilter(
        task,
        { ...filters, noteSearch: "キーワード", search: "nomatch" },
        "2026-01-01",
        null,
      ),
    ).toBe(false);
  });

  it("excludes tasks without note when noteSearch is set", () => {
    expect(
      taskMatchesFilter(
        baseTask,
        { ...filters, noteSearch: "x" },
        "2026-01-01",
        null,
      ),
    ).toBe(false);
  });
});
