import { describe, expect, it } from "vitest";
import { categoriesAfterDuplicate, categoriesAfterTaskEdit } from "./tasks";
import {
  findTaskInOutline,
  outlineAfterDuplicate,
  outlineAfterTaskEdit,
} from "./outlineTasks";
import type { Category, Milestone, OutlineRoot, Task } from "./types";

const OTHER = "00000000-0000-4000-8000-00000000000a";
const SOURCE = "00000000-0000-4000-8000-00000000000b";
const TAIL = "00000000-0000-4000-8000-00000000000c";
const COPY = "00000000-0000-4000-8000-00000000000d";
const MILESTONE = "00000000-0000-4000-8000-0000000000e1";

function task(partial: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    start: "2026-04-01",
    end: "2026-04-05",
    assigneeIds: [],
    status: "not-started",
    progress: 0,
    confidence: "tentative",
    predecessors: [],
    milestoneId: null,
    ...partial,
  };
}

function categories(): Category[] {
  return [
    {
      id: "c1000001-0000-4000-8000-000000000001",
      name: "設計",
      groups: [
        {
          id: "d1000001-0000-4000-8000-000000000001",
          name: "上流",
          tasks: [
            task({ id: OTHER, name: "要件整理" }),
            task({
              id: SOURCE,
              name: "基本設計",
              assigneeIds: ["member-1"],
              status: "in-progress",
              progress: 40,
              confidence: "committed",
              predecessors: [OTHER],
              milestoneId: MILESTONE,
              note: "  レビュー待ち  ",
              tags: ["共有"],
            }),
            task({ id: TAIL, name: "詳細設計", predecessors: [SOURCE] }),
          ],
        },
      ],
    },
  ];
}

const milestones: Milestone[] = [
  {
    id: MILESTONE,
    name: "設計完了",
    date: "2026-04-10",
    confidence: "committed",
    groupId: "e1000001-0000-4000-8000-000000000001",
  },
];

describe("categoriesAfterDuplicate", () => {
  it("inserts the copy immediately after the source", () => {
    const current = categories();
    const result = categoriesAfterDuplicate(
      current,
      milestones,
      "工程",
      SOURCE,
      COPY,
      {
        name: "基本設計の続き",
        start: "2026-04-01",
        end: "2026-04-05",
        assigneeIds: ["member-1"],
        status: "in-progress",
        progress: 40,
        confidence: "committed",
        predecessors: [OTHER],
        successors: [],
        milestoneId: MILESTONE,
        note: "  レビュー待ち  ",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const names = result.categories[0]?.groups[0]?.tasks.map((item) => item.name);
    expect(names).toEqual([
      "要件整理",
      "基本設計",
      "基本設計の続き",
      "詳細設計",
    ]);
    expect(current[0]?.groups[0]?.tasks).toHaveLength(3);
  });

  it("does not copy predecessors or progress when patch starts fresh", () => {
    const result = categoriesAfterDuplicate(
      categories(),
      milestones,
      "工程",
      SOURCE,
      COPY,
      {
        name: "基本設計のコピー",
        start: "2026-04-01",
        end: "2026-04-05",
        assigneeIds: ["member-1"],
        status: "not-started",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        successors: [],
        milestoneId: MILESTONE,
        note: "レビュー待ち",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tasks = result.categories[0]?.groups[0]?.tasks ?? [];
    const copy = tasks[2];
    expect(copy).toMatchObject({
      id: COPY,
      name: "基本設計のコピー",
      status: "not-started",
      progress: 0,
      predecessors: [],
      milestoneId: MILESTONE,
      tags: ["共有"],
    });
    expect(tasks[1]?.predecessors).toEqual([OTHER]);
    expect(tasks[3]?.predecessors).toEqual([SOURCE]);
  });

  it("copies fields and predecessors without changing successors", () => {
    const result = categoriesAfterDuplicate(
      categories(),
      milestones,
      "工程",
      SOURCE,
      COPY,
      {
        name: "  基本設計  ",
        start: "2026-04-02",
        end: "2026-04-06",
        assigneeIds: ["member-1"],
        status: "in-progress",
        progress: 40.2,
        confidence: "committed",
        predecessors: [OTHER, OTHER],
        successors: [],
        milestoneId: MILESTONE,
        note: "  レビュー待ち  ",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tasks = result.categories[0]?.groups[0]?.tasks ?? [];
    const copy = tasks[2];
    expect(copy).toMatchObject({
      id: COPY,
      name: "基本設計",
      start: "2026-04-02",
      end: "2026-04-06",
      assigneeIds: ["member-1"],
      status: "in-progress",
      progress: 40,
      confidence: "committed",
      predecessors: [OTHER],
      milestoneId: MILESTONE,
      note: "レビュー待ち",
      tags: ["共有"],
    });
    expect(tasks[0]?.predecessors).toEqual([]);
    expect(tasks[1]?.predecessors).toEqual([OTHER]);
    expect(tasks[3]?.predecessors).toEqual([SOURCE]);
  });

  it("rejects a cycle created by a successor link", () => {
    const current = categories();
    const result = categoriesAfterDuplicate(
      current,
      milestones,
      "工程",
      SOURCE,
      COPY,
      {
        name: "循環",
        start: "2026-04-01",
        end: "2026-04-05",
        assigneeIds: [],
        status: "not-started",
        progress: 0,
        confidence: "tentative",
        predecessors: [OTHER],
        successors: [OTHER],
        milestoneId: null,
        note: "",
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("循環");
    expect(current[0]?.groups[0]?.tasks).toHaveLength(3);
    expect(current[0]?.groups[0]?.tasks[0]?.predecessors).toEqual([]);
  });

  it("reports a missing source", () => {
    const result = categoriesAfterDuplicate(
      categories(),
      milestones,
      "工程",
      "00000000-0000-4000-8000-0000000000ff",
      COPY,
      {
        name: "無い",
        start: "2026-04-01",
        end: "2026-04-05",
        assigneeIds: [],
        status: "not-started",
        progress: 0,
        confidence: "tentative",
        predecessors: [],
        successors: [],
        milestoneId: null,
        note: "",
      },
    );
    expect(result).toEqual({
      ok: false,
      message: "複製元のタスクがありません。",
    });
  });

  it("uses patch colorId when present", () => {
    const current = categories();
    current[0]!.groups[0]!.tasks[1]!.colorId = "focus";
    const result = categoriesAfterDuplicate(
      current,
      milestones,
      "工程",
      SOURCE,
      COPY,
      {
        name: "色付きコピー",
        start: "2026-04-01",
        end: "2026-04-05",
        assigneeIds: ["member-1"],
        status: "not-started",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        successors: [],
        milestoneId: MILESTONE,
        note: "",
        colorId: "wait",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const copy = result.categories[0]!.groups[0]!.tasks[2];
    expect(copy?.colorId).toBe("wait");
  });

  it("clears colorId when patch sets null", () => {
    const current = categories();
    current[0]!.groups[0]!.tasks[1]!.colorId = "focus";
    const result = categoriesAfterDuplicate(
      current,
      milestones,
      "工程",
      SOURCE,
      COPY,
      {
        name: "色なしコピー",
        start: "2026-04-01",
        end: "2026-04-05",
        assigneeIds: ["member-1"],
        status: "not-started",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        successors: [],
        milestoneId: MILESTONE,
        note: "",
        colorId: null,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const copy = result.categories[0]!.groups[0]!.tasks[2];
    expect(copy?.colorId).toBeUndefined();
  });
});

describe("categoriesAfterTaskEdit colorId", () => {
  it("sets and clears colorId without changing other tasks", () => {
    const current = categories();
    const basePatch = {
      name: "基本設計",
      start: "2026-04-01",
      end: "2026-04-05",
      assigneeIds: ["member-1"] as const,
      status: "in-progress" as const,
      progress: 40,
      confidence: "committed" as const,
      predecessors: [OTHER],
      successors: [TAIL],
      milestoneId: MILESTONE,
      note: "レビュー待ち",
    };
    const set = categoriesAfterTaskEdit(
      current,
      milestones,
      "工程",
      SOURCE,
      { ...basePatch, assigneeIds: [...basePatch.assigneeIds], colorId: "focus" },
    );
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    expect(set.categories[0]!.groups[0]!.tasks[1]!.colorId).toBe("focus");
    const cleared = categoriesAfterTaskEdit(
      set.categories,
      milestones,
      "工程",
      SOURCE,
      {
        ...basePatch,
        assigneeIds: [...basePatch.assigneeIds],
        colorId: null,
      },
    );
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.categories[0]!.groups[0]!.tasks[1]!.colorId).toBeUndefined();
  });
});

const outlineTwoLevels: OutlineRoot = [
  {
    id: "c1000001-0000-4000-8000-000000000001",
    name: "G",
    children: [
      task({ id: SOURCE, name: "基本設計", status: "in-progress" }),
      task({ id: OTHER, name: "詳細", status: "not-started" }),
    ],
  },
];

const outlineLevels = [
  { name: "段", meaning: "見出し" },
  { name: "作業", meaning: "タスク" },
];

describe("outlineAfterTaskEdit colorId", () => {
  it("sets and clears colorId without changing other outline tasks", () => {
    const basePatch = {
      name: "基本設計",
      start: "2026-04-01",
      end: "2026-04-05",
      assigneeIds: ["member-1"] as const,
      status: "in-progress" as const,
      progress: 40,
      confidence: "committed" as const,
      predecessors: [],
      successors: [],
      milestoneId: null,
      note: "レビュー待ち",
    };
    const set = outlineAfterTaskEdit(
      outlineTwoLevels,
      milestones,
      "工程",
      SOURCE,
      { ...basePatch, assigneeIds: [...basePatch.assigneeIds], colorId: "focus" },
    );
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    expect(findTaskInOutline(set.outline, SOURCE)?.colorId).toBe("focus");
    const cleared = outlineAfterTaskEdit(
      set.outline,
      milestones,
      "工程",
      SOURCE,
      {
        ...basePatch,
        assigneeIds: [...basePatch.assigneeIds],
        colorId: null,
      },
    );
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(findTaskInOutline(cleared.outline, SOURCE)?.colorId).toBeUndefined();
    expect(findTaskInOutline(cleared.outline, OTHER)?.colorId).toBeUndefined();
  });
});

describe("outlineAfterDuplicate colorId", () => {
  it("uses patch colorId and copies source when patch omits colorId", () => {
    const branch = outlineTwoLevels[0]!;
    if (!("children" in branch)) {
      throw new Error("expected outline branch");
    }
    const withColor: OutlineRoot = [
      {
        ...branch,
        children: branch.children.map((node) =>
          "id" in node && node.id === SOURCE
            ? { ...node, colorId: "focus" }
            : node,
        ),
      },
    ];
    const dupPatch = {
      name: "色付きコピー",
      start: "2026-04-01",
      end: "2026-04-05",
      assigneeIds: ["member-1"],
      status: "not-started" as const,
      progress: 0,
      confidence: "committed" as const,
      predecessors: [],
      successors: [],
      milestoneId: null,
      note: "",
      colorId: "wait",
    };
    const copied = outlineAfterDuplicate(
      withColor,
      milestones,
      "工程",
      SOURCE,
      COPY,
      dupPatch,
      outlineLevels.length,
    );
    expect(copied.ok).toBe(true);
    if (!copied.ok) return;
    expect(findTaskInOutline(copied.outline, COPY)?.colorId).toBe("wait");

    const noColorPatch = { ...dupPatch, colorId: null };
    const clearedCopy = outlineAfterDuplicate(
      withColor,
      milestones,
      "工程",
      SOURCE,
      "00000000-0000-4000-8000-00000000000f",
      noColorPatch,
      outlineLevels.length,
    );
    expect(clearedCopy.ok).toBe(true);
    if (!clearedCopy.ok) return;
    expect(
      findTaskInOutline(clearedCopy.outline, "00000000-0000-4000-8000-00000000000f")
        ?.colorId,
    ).toBeUndefined();

    const { colorId, ...patchWithoutColor } = dupPatch;
    void colorId;
    const inherited = outlineAfterDuplicate(
      withColor,
      milestones,
      "工程",
      SOURCE,
      "00000000-0000-4000-8000-000000000010",
      patchWithoutColor,
      outlineLevels.length,
    );
    expect(inherited.ok).toBe(true);
    if (!inherited.ok) return;
    expect(
      findTaskInOutline(inherited.outline, "00000000-0000-4000-8000-000000000010")
        ?.colorId,
    ).toBe("focus");
  });
});
