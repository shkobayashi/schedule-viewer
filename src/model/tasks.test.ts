import { describe, expect, it } from "vitest";
import { categoriesAfterDuplicate } from "./tasks";
import type { Category, Milestone, Task } from "./types";

const OTHER = "00000000-0000-4000-8000-00000000000a";
const SOURCE = "00000000-0000-4000-8000-00000000000b";
const TAIL = "00000000-0000-4000-8000-00000000000c";
const COPY = "00000000-0000-4000-8000-00000000000d";
const MILESTONE = "00000000-0000-4000-8000-0000000000e1";

function task(partial: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    start: "2026-04-01",
    end: "2026-04-05",
    assigneeId: null,
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
              assigneeId: "member-1",
              status: "in-progress",
              progress: 40,
              confidence: "committed",
              predecessors: [OTHER],
              milestoneId: MILESTONE,
              note: "  レビュー待ち  ",
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
        assigneeId: "member-1",
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
        assigneeId: "member-1",
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
      assigneeId: "member-1",
      status: "in-progress",
      progress: 40,
      confidence: "committed",
      predecessors: [OTHER],
      milestoneId: MILESTONE,
      note: "レビュー待ち",
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
        assigneeId: null,
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
        assigneeId: null,
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
});
