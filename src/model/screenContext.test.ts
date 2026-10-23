import { describe, expect, it } from "vitest";
import { lineageTaskIds } from "./dependencies";
import {
  buildActiveFilterConditions,
  buildFilteredTasksPayload,
  statusEntriesForMcp,
  buildScheduleDiffPayload,
  buildScreenContextPayload,
  buildSelectedTaskPayload,
  buildSelectedTasksPayload,
  mcpPayloadToToolBody,
} from "./screenContext";
import { listTasksMatchingFilter } from "./rows";
import { BUILTIN_STATUS_ITEMS, type StatusItem } from "./statusCatalog";
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

function categoryWithTwoGroups(
  firstGroupTasks: Task[],
  secondGroupTasks: Task[],
): Category[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000010",
      name: "Cat",
      groups: [
        {
          id: "00000000-0000-4000-8000-000000000020",
          name: "Grp1",
          tasks: firstGroupTasks,
        },
        {
          id: "00000000-0000-4000-8000-000000000021",
          name: "Grp2",
          tasks: secondGroupTasks,
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

function taskFixture(id: string, name: string): Task {
  return {
    id,
    name,
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

describe("buildSelectedTasksPayload", () => {
  it("returns empty array when nothing is selected", () => {
    const payload = buildSelectedTasksPayload({
      categories: categoryWithTasks([taskFixture("a", "A")]),
      selectedTaskIds: [],
    });
    expect(payload.selectedTasks).toEqual([]);
  });

  it("matches single-task payload for one selection", () => {
    const t = taskFixture(
      "00000000-0000-4000-8000-000000000099",
      "Only",
    );
    const categories = categoryWithTasks([t]);
    const single = buildSelectedTaskPayload({
      categories,
      filters,
      today: "2026-01-15",
      memberCatalog: null,
      lineageIds: null,
      selectedTaskId: t.id,
    });
    const multi = buildSelectedTasksPayload({
      categories,
      selectedTaskIds: [t.id],
    });
    expect(multi.selectedTasks).toEqual([single.selectedTask]);
  });

  it("orders by document order not selection order", () => {
    const inFirst = taskFixture(
      "00000000-0000-4000-8000-000000000001",
      "FirstGrp",
    );
    const inSecond = taskFixture(
      "00000000-0000-4000-8000-000000000002",
      "SecondGrp",
    );
    const categories = categoryWithTwoGroups([inFirst], [inSecond]);
    const payload = buildSelectedTasksPayload({
      categories,
      selectedTaskIds: [inSecond.id, inFirst.id],
    });
    expect(payload.selectedTasks.map((t) => t.id)).toEqual([
      inFirst.id,
      inSecond.id,
    ]);
  });

  it("includes tasks outside any filter because it does not use filters", () => {
    const done = taskFixture("00000000-0000-4000-8000-000000000004", "Done");
    done.status = "done";
    done.progress = 100;
    const categories = categoryWithTasks([done]);
    const statusFilters = { ...filters, status: "not-started" as const };
    expect(
      listTasksMatchingFilter(
        categories,
        statusFilters,
        "2026-01-15",
        null,
        null,
      ),
    ).toHaveLength(0);
    const payload = buildSelectedTasksPayload({
      categories,
      selectedTaskIds: [done.id],
    });
    expect(payload.selectedTasks).toHaveLength(1);
    expect(payload.selectedTasks[0]!.id).toBe(done.id);
  });

  it("omits ids that are not tasks in the document", () => {
    const a = taskFixture("00000000-0000-4000-8000-000000000005", "A");
    const categories = categoryWithTasks([a]);
    const milestoneOnlyId = "00000000-0000-4000-8000-0000000000aa";
    const payload = buildSelectedTasksPayload({
      categories,
      selectedTaskIds: [
        a.id,
        milestoneOnlyId,
        "00000000-0000-4000-8000-0000000000ff",
        "00000000-0000-4000-8000-0000000000ee",
      ],
    });
    expect(payload.selectedTasks.map((t) => t.id)).toEqual([a.id]);
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

    const selectedMany = buildSelectedTasksPayload({
      categories: [],
      selectedTaskIds: [],
    });
    const selectedManyText = JSON.parse(
      (mcpPayloadToToolBody(selectedMany) as { content: { text: string }[] })
        .content[0].text,
    );
    expect(selectedManyText).toEqual({
      statuses: statusEntriesForMcp(BUILTIN_STATUS_ITEMS),
      selectedTasks: [],
    });
    expect(selectedManyText).not.toHaveProperty("selectedTaskId");
    expect(selectedManyText).not.toHaveProperty("scheduleDiff");
  });
});

describe("status catalog in MCP payloads", () => {
  const custom: StatusItem[] = [
    ...BUILTIN_STATUS_ITEMS,
    {
      id: "review",
      name: "確認待ち",
      color: BUILTIN_STATUS_ITEMS[0].color,
      closed: false,
      description: "作業は終わり、確認を待っている。",
    },
  ];

  it("puts the catalog first, once, without colors", () => {
    const payload = buildSelectedTasksPayload({
      categories: [],
      selectedTaskIds: [],
      statuses: custom,
    });
    expect(Object.keys(payload)[0]).toBe("statuses");
    expect(payload.statuses[payload.statuses.length - 1]).toEqual({
      id: "review",
      name: "確認待ち",
      closed: false,
      description: "作業は終わり、確認を待っている。",
    });
    expect(payload.statuses[0]).not.toHaveProperty("color");
  });

  it("names the status filter from the catalog", () => {
    const conditions = buildActiveFilterConditions({
      filters: { ...filters, status: "review" },
      hiddenMilestoneGroupIds: [],
      milestoneGroups: [],
      milestones: [],
      lineageTaskId: null,
      categories: [],
      memberCatalog: null,
      statuses: custom,
    });
    expect(conditions).toContainEqual({
      type: "status",
      value: "review",
      label: "確認待ち",
    });
  });

  it("starts the filtered tasks payload with the catalog", () => {
    const payload = buildFilteredTasksPayload({
      categories: [],
      filters,
      lineageTaskId: null,
      hiddenMilestoneGroupIds: [],
      milestoneGroups: [],
      milestones: [],
      today: "2026-01-01",
      memberCatalog: null,
      lineageIds: null,
      statuses: custom,
    });
    expect(Object.keys(payload)[0]).toBe("statuses");
    expect(payload.statuses).toHaveLength(4);
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
