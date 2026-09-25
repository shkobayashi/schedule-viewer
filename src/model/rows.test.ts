import { describe, expect, it } from "vitest";
import { taskMatchesFilter } from "./rows";
import { NO_MILESTONE_FILTER, type ScheduleFilters, type Task } from "./types";

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

const milestoneId = "00000000-0000-4000-8000-000000000099";

const filters: ScheduleFilters = {
  assignee: "all",
  status: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
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

describe("taskMatchesFilter milestone", () => {
  it("matches task linked to selected milestone id", () => {
    const task = { ...baseTask, milestoneId };
    expect(
      taskMatchesFilter(
        task,
        { ...filters, milestone: milestoneId },
        "2026-01-01",
        null,
      ),
    ).toBe(true);
    expect(
      taskMatchesFilter(
        baseTask,
        { ...filters, milestone: milestoneId },
        "2026-01-01",
        null,
      ),
    ).toBe(false);
  });

  it("keeps only tasks without milestone when filter is none", () => {
    expect(
      taskMatchesFilter(
        baseTask,
        { ...filters, milestone: NO_MILESTONE_FILTER },
        "2026-01-01",
        null,
      ),
    ).toBe(true);
    expect(
      taskMatchesFilter(
        { ...baseTask, milestoneId },
        { ...filters, milestone: NO_MILESTONE_FILTER },
        "2026-01-01",
        null,
      ),
    ).toBe(false);
  });
});
