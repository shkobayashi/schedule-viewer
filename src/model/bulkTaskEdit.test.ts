import { describe, expect, it } from "vitest";
import { applyBulkTaskEdit, applyBulkTaskEditOutline } from "./bulkTaskEdit";
import { findTaskById } from "./rows";
import { findTaskInOutline } from "./outlineTasks";
import { primarySelectedTaskId } from "./taskSelection";
import type { Category, Milestone, OutlineRoot, Task } from "./types";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    name: id,
    start: "2026-01-01",
    end: "2026-01-05",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "tentative",
    predecessors: [],
    milestoneId: null,
    ...overrides,
  };
}

const categories: Category[] = [
  {
    id: "c1",
    name: "C",
    groups: [
      {
        id: "g1",
        name: "G",
        tasks: [task("a"), task("b", { start: "2026-01-10", end: "2026-01-12" })],
      },
    ],
  },
];

const milestones: Milestone[] = [];

describe("applyBulkTaskEdit", () => {
  it("applies status to all selected tasks", () => {
    const result = applyBulkTaskEdit(categories, milestones, "t", ["a", "b"], {
      status: "done",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.categories[0]!.groups[0]!.tasks[0]!;
    const b = result.categories[0]!.groups[0]!.tasks[1]!;
    expect(a.status).toBe("done");
    expect(b.status).toBe("done");
  });

  it("rejects when end is before start for any task and leaves categories", () => {
    const result = applyBulkTaskEdit(categories, milestones, "t", ["a", "b"], {
      start: "2026-01-20",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("終了日は開始日以降");
    expect(applyBulkTaskEdit(categories, milestones, "t", ["a"], { status: "done" }).ok).toBe(
      true,
    );
  });

  it("rejects draft with end before start using the first task name", () => {
    const result = applyBulkTaskEdit(categories, milestones, "t", ["a", "b"], {
      start: "2026-02-01",
      end: "2026-01-01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("終了日は開始日以降にしてください");
    expect(result.message).toContain("（a）");
  });

  it("skips existing predecessor links", () => {
    const withPred: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [
              task("a"),
              task("b", { predecessors: ["a"] }),
            ],
          },
        ],
      },
    ];
    const result = applyBulkTaskEdit(withPred, milestones, "t", ["b"], {
      addPredecessorIds: ["a"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe(
      "選択中のタスクには、すでにこの前後関係があります。",
    );
  });

  it("rejects when all tasks already have the tag", () => {
    const withTags: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [
              task("a", { tags: ["x"] }),
              task("b", { tags: ["x"] }),
            ],
          },
        ],
      },
    ];
    const result = applyBulkTaskEdit(withTags, milestones, "t", ["a", "b"], {
      addTags: ["x"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe("選択中のタスクには、すでにこのタグがあります。");
  });

  it("adds tag only to tasks that do not have it", () => {
    const withTags: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [
              task("a", { tags: ["x"] }),
              task("b"),
            ],
          },
        ],
      },
    ];
    const result = applyBulkTaskEdit(withTags, milestones, "t", ["a", "b"], {
      addTags: ["x"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.categories[0]!.groups[0]!.tasks[0]!;
    const b = result.categories[0]!.groups[0]!.tasks[1]!;
    expect(a.tags).toEqual(["x"]);
    expect(b.tags).toEqual(["x"]);
  });

  it("rejects a cycle for the whole apply", () => {
    const cyclic: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [task("a"), task("b", { predecessors: ["a"] })],
          },
        ],
      },
    ];
    const result = applyBulkTaskEdit(cyclic, milestones, "t", ["a"], {
      addPredecessorIds: ["b"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message.length).toBeGreaterThan(0);
    expect(findTaskById(cyclic, "a")?.predecessors).toEqual([]);
  });

  it("replaces assigneeIds on all selected tasks including empty", () => {
    const withAssignee: Category[] = [
      {
        id: "c1",
        name: "C",
        groups: [
          {
            id: "g1",
            name: "G",
            tasks: [
              task("a", { assigneeIds: ["x"] }),
              task("b", { assigneeIds: ["y", "z"] }),
            ],
          },
        ],
      },
    ];
    const replaced = applyBulkTaskEdit(withAssignee, milestones, "t", ["a", "b"], {
      assigneeIds: ["m1", "m2"],
    });
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.categories[0]!.groups[0]!.tasks[0]!.assigneeIds).toEqual([
      "m1",
      "m2",
    ]);
    expect(replaced.categories[0]!.groups[0]!.tasks[1]!.assigneeIds).toEqual([
      "m1",
      "m2",
    ]);
    const cleared = applyBulkTaskEdit(withAssignee, milestones, "t", ["a", "b"], {
      assigneeIds: [],
    });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.categories[0]!.groups[0]!.tasks[0]!.assigneeIds).toEqual([]);
  });
});

const outlineWithAssignees: OutlineRoot = [
  {
    id: "branch-1",
    name: "G",
    children: [
      task("a", { assigneeIds: ["x"] }),
      task("b", { assigneeIds: ["y", "z"] }),
    ],
  },
];

describe("applyBulkTaskEditOutline assigneeIds", () => {
  it("replaces assigneeIds on selected outline tasks", () => {
    const result = applyBulkTaskEditOutline(
      outlineWithAssignees,
      milestones,
      "t",
      ["a", "b"],
      { assigneeIds: ["m1", "m2"] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findTaskInOutline(result.outline, "a")!.assigneeIds).toEqual([
      "m1",
      "m2",
    ]);
    expect(findTaskInOutline(result.outline, "b")!.assigneeIds).toEqual([
      "m1",
      "m2",
    ]);
  });
});

describe("primarySelectedTaskId", () => {
  it("returns null when two tasks are selected", () => {
    expect(
      primarySelectedTaskId({
        ids: ["a", "b"],
        anchorId: "a",
        activeId: "b",
      }),
    ).toBeNull();
  });
});
