import { describe, expect, it } from "vitest";
import { lineageTaskIds } from "./dependencies";
import {
  buildActiveFilterConditions,
  buildFilteredTasksPayload,
  buildScheduleDiffPayload,
  buildScreenContextPayload,
  buildSelectedTaskPayload,
  mcpPayloadToToolBody,
} from "./screenContext";
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

describe("buildFilteredTasksPayload", () => {
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
    const payload = buildFilteredTasksPayload({
      categories,
      filters: brokenFilters,
      lineageTaskId: null,
      hiddenMilestoneGroupIds: [],
      milestoneGroups: [],
      milestones: [],
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds: null,
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
    const payload = buildFilteredTasksPayload({
      categories,
      filters: assigneeFilters,
      lineageTaskId: null,
      hiddenMilestoneGroupIds: ["mg-off"],
      milestoneGroups: [{ id: "mg-off", name: "帯A" }],
      milestones: [],
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds: null,
    });
    expect(payload.tasks).toHaveLength(2);
    expect(payload.activeConditions).toEqual([
      { type: "assignee", id: UNASSIGNED_FILTER, name: "割り当てなし" },
      {
        type: "milestoneBandHidden",
        groups: [{ id: "mg-off", name: "帯A" }],
      },
    ]);
  });

  it("respects lineage in task list", () => {
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
    const payload = buildFilteredTasksPayload({
      categories,
      filters: statusFilters,
      lineageTaskId: a.id,
      hiddenMilestoneGroupIds: [],
      milestoneGroups: [],
      milestones: [],
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds,
    });
    expect(payload.tasks.map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
    expect(payload.activeConditions.map((c) => c.type)).toEqual([
      "status",
      "lineage",
    ]);
  });
});

describe("buildSelectedTaskPayload", () => {
  it("returns selected task outside filter", () => {
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
    const categories = categoryWithTasks([a, c]);
    const statusFilters = { ...filters, status: "not-started" as const };
    const payload = buildSelectedTaskPayload({
      categories,
      filters: statusFilters,
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: c.id,
    });
    expect(payload.selectedTask?.id).toBe(c.id);
  });

  it("returns null when selection is not exactly one task", () => {
    const payload = buildSelectedTaskPayload({
      categories: [],
      filters,
      today: "2026-01-01",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: null,
    });
    expect(payload.selectedTask).toBeNull();
  });
});

describe("buildActiveFilterConditions", () => {
  it("omits default filter values and keeps panel order", () => {
    const conditions = buildActiveFilterConditions({
      filters: {
        ...filters,
        relation: "broken",
        search: "foo",
        noteSearch: "bar",
        tags: ["t1"],
      },
      hiddenMilestoneGroupIds: [],
      milestoneGroups: [],
      milestones: [],
      lineageTaskId: null,
      categories: [],
      memberCatalog: null,
    });
    expect(conditions.map((c) => c.type)).toEqual([
      "relation",
      "tags",
      "searchName",
      "searchNote",
    ]);
  });
});

describe("split MCP payloads", () => {
  it("each tool body contains only its own fields", () => {
    const diff = buildScheduleDiffPayload({
      scheduleDiffText: "差分",
      scheduleDiffIsError: false,
    });
    const diffText = JSON.parse(
      (mcpPayloadToToolBody(diff) as { content: { text: string }[] }).content[0]
        .text,
    );
    expect(diffText).toEqual({ scheduleDiff: { text: "差分", isError: false } });
    expect(diffText).not.toHaveProperty("tasks");
    expect(diffText).not.toHaveProperty("selectedTask");

    const selected = buildSelectedTaskPayload({
      categories: [],
      filters,
      today: "2026-01-01",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: null,
    });
    const selectedText = JSON.parse(
      (mcpPayloadToToolBody(selected) as { content: { text: string }[] })
        .content[0].text,
    );
    expect(selectedText).toHaveProperty("selectedTaskId");
    expect(selectedText).not.toHaveProperty("scheduleDiff");
    expect(selectedText).not.toHaveProperty("activeConditions");
  });
});

describe("buildScreenContextPayload", () => {
  it("still aggregates legacy fields for compatibility", () => {
    const payload = buildScreenContextPayload({
      categories: categoryWithTasks([]),
      filters,
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
    expect(payload.scheduleDiff.text).toBe("差はありません");
    expect(payload.tasks).toEqual([]);
  });
});
