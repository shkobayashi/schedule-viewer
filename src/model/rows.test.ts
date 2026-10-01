import { describe, expect, it } from "vitest";
import { relaxFiltersForNewTask, taskMatchesFilter } from "./rows";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  type ScheduleFilters,
  type Task,
} from "./types";

const baseTask: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Alpha",
  start: "2026-01-01",
  end: "2026-01-02",
  assigneeId: null,
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
};

const milestoneId = "00000000-0000-4000-8000-000000000099";

const filters: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
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

describe("taskMatchesFilter confidence", () => {
  it("keeps only the selected confidence", () => {
    expect(
      taskMatchesFilter(
        { ...baseTask, confidence: "tentative" },
        { ...filters, confidence: "tentative" },
        "2026-01-01",
        null,
      ),
    ).toBe(true);
    expect(
      taskMatchesFilter(
        baseTask,
        { ...filters, confidence: "tentative" },
        "2026-01-01",
        null,
      ),
    ).toBe(false);
    expect(
      taskMatchesFilter(
        baseTask,
        { ...filters, confidence: "committed" },
        "2026-01-01",
        null,
      ),
    ).toBe(true);
  });
});

const addedTask: Task = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "新しい作業",
  start: "2026-09-30",
  end: "2026-10-01",
  assigneeId: null,
  status: "not-started",
  progress: 0,
  confidence: "tentative",
  predecessors: [],
  milestoneId: null,
};

describe("relaxFiltersForNewTask", () => {
  it("relaxes filters that would hide a newly added task", () => {
    const next = relaxFiltersForNewTask(
      {
        assignee: "member-1",
        status: "done",
        confidence: "committed",
        overdue: "overdue",
        relation: "broken",
        milestone: milestoneId,
        search: " 別の名前",
        noteSearch: "メモ",
      },
      addedTask,
      "2026-09-30",
      null,
    );
    expect(next).toEqual({
      assignee: "all",
      status: "all",
      confidence: "all",
      overdue: "all",
      relation: "all",
      milestone: "all",
      search: "",
      noteSearch: "",
    });
    expect(
      relaxFiltersForNewTask(
        { ...filters, status: "in-progress" },
        addedTask,
        "2026-09-30",
        null,
      ).status,
    ).toBe("all");
  });

  it("keeps a search when only surrounding spaces differ", () => {
    expect(
      relaxFiltersForNewTask(
        { ...filters, search: "  新しい  " },
        addedTask,
        "2026-09-30",
        null,
      ).search,
    ).toBe("  新しい  ");
  });

  it("keeps filters that still show a newly added task", () => {
    const kept: ScheduleFilters = {
      assignee: UNASSIGNED_FILTER,
      status: "not-started",
      confidence: "tentative",
      overdue: "all",
      relation: "all",
      milestone: NO_MILESTONE_FILTER,
      search: "新しい",
      noteSearch: "",
    };
    expect(
      relaxFiltersForNewTask(kept, addedTask, "2026-09-30", null),
    ).toEqual(kept);
    expect(
      relaxFiltersForNewTask(
        { ...filters, status: "not-done", overdue: "overdue" },
        { ...addedTask, end: "2026-09-01" },
        "2026-09-30",
        null,
      ),
    ).toMatchObject({ status: "not-done", overdue: "overdue" });
  });

  it("keeps filters that match the duplicated task", () => {
    const copy: Task = {
      ...addedTask,
      name: "確定の複製",
      assigneeId: "member-1",
      status: "in-progress",
      confidence: "committed",
      milestoneId,
      note: "引き継ぎ",
      end: "2026-09-01",
    };
    const kept: ScheduleFilters = {
      assignee: "member-1",
      status: "in-progress",
      confidence: "committed",
      overdue: "overdue",
      relation: "broken",
      milestone: milestoneId,
      search: "複製",
      noteSearch: "引き継",
    };
    expect(
      relaxFiltersForNewTask(
        kept,
        copy,
        "2026-09-30",
        null,
        new Set([copy.id]),
      ),
    ).toEqual(kept);
    expect(
      relaxFiltersForNewTask(
        { ...filters, confidence: "tentative", noteSearch: "無い" },
        copy,
        "2026-09-30",
        null,
      ),
    ).toMatchObject({ confidence: "all", noteSearch: "" });
  });
});
