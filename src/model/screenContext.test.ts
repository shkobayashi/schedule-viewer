import { describe, expect, it } from "vitest";
import { lineageTaskIds } from "./dependencies";
import { buildScreenContextPayload } from "./screenContext";
import { listTasksMatchingFilter } from "./rows";
import {
  UNASSIGNED_FILTER,
  type Category,
  type ScheduleFilters,
  type Task,
} from "./types";

const filters: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
  tags: [],
  search: "",
  noteSearch: "",
};

function categoryWithTasks(tasks: Task[]): Category[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000010",
      name: "Cat",
      groups: [
        {
          id: "00000000-0000-4000-8000-000000000020",
          name: "Grp",
          tasks,
        },
      ],
    },
  ];
}

describe("buildScreenContextPayload", () => {
  it("keeps broken-link endpoints only when relation is broken", () => {
    const pred: Task = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Pred",
      start: "2026-01-05",
      end: "2026-01-10",
      assigneeId: null,
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    };
    const succ: Task = {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Succ",
      start: "2026-01-01",
      end: "2026-01-03",
      assigneeId: null,
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [pred.id],
      milestoneId: null,
    };
    const categories = categoryWithTasks([pred, succ]);
    const brokenFilters = { ...filters, relation: "broken" as const };
    const payload = buildScreenContextPayload({
      categories,
      filters: brokenFilters,
      searchField: "name",
      lineageTaskId: null,
      hiddenMilestoneGroupIds: [],
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: null,
      scheduleDiffText: "差はありません",
      scheduleDiffIsError: false,
    });
    expect(payload.tasks.map((t) => t.id).sort()).toEqual(
      [pred.id, succ.id].sort(),
    );
    expect(
      listTasksMatchingFilter(
        categories,
        filters,
        "2026-01-15",
        null,
        null,
      ).length,
    ).toBe(2);
  });

  it("keeps unassigned and unknown assignee when assignee filter is unassigned", () => {
    const unknown: Task = {
      id: "00000000-0000-4000-8000-000000000003",
      name: "Unknown",
      start: "2026-01-01",
      end: "2026-01-02",
      assigneeId: "missing-member",
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    };
    const categories = categoryWithTasks([
      {
        id: "00000000-0000-4000-8000-000000000004",
        name: "Free",
        start: "2026-01-01",
        end: "2026-01-02",
        assigneeId: null,
        status: "not-started",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        milestoneId: null,
      },
      unknown,
    ]);
    const assigneeFilters = { ...filters, assignee: UNASSIGNED_FILTER };
    const payload = buildScreenContextPayload({
      categories,
      filters: assigneeFilters,
      searchField: "name",
      lineageTaskId: null,
      hiddenMilestoneGroupIds: ["mg-off"],
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: null,
      scheduleDiffText: "",
      scheduleDiffIsError: false,
    });
    expect(payload.tasks).toHaveLength(2);
    expect(payload.filterState.hiddenMilestoneGroupIds).toEqual(["mg-off"]);
  });

  it("respects lineage and still returns selected task outside filter", () => {
    const a: Task = {
      id: "00000000-0000-4000-8000-000000000005",
      name: "A",
      start: "2026-01-01",
      end: "2026-01-02",
      assigneeId: null,
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    };
    const b: Task = {
      id: "00000000-0000-4000-8000-000000000006",
      name: "B",
      start: "2026-01-03",
      end: "2026-01-04",
      assigneeId: null,
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [a.id],
      milestoneId: null,
    };
    const c: Task = {
      id: "00000000-0000-4000-8000-000000000007",
      name: "C",
      start: "2026-01-05",
      end: "2026-01-06",
      assigneeId: null,
      status: "done",
      progress: 100,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    };
    const categories = categoryWithTasks([a, b, c]);
    const lineageIds = lineageTaskIds(categories, a.id);
    const statusFilters = { ...filters, status: "not-started" as const };
    const payload = buildScreenContextPayload({
      categories,
      filters: statusFilters,
      searchField: "name",
      lineageTaskId: a.id,
      hiddenMilestoneGroupIds: [],
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds,
      selectedTaskId: c.id,
      scheduleDiffText: "差分",
      scheduleDiffIsError: false,
    });
    expect(payload.tasks.map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
    expect(payload.selectedTask?.id).toBe(c.id);
  });
});
