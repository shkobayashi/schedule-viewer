import { describe, expect, it } from "vitest";
import {
  appendMilestone,
  milestoneFilterAfterDelete,
  milestoneLinkedByAnyTask,
  removeMilestone,
  validateNewMilestone,
} from "./milestones";
import { collectScheduleIds, uniqueScheduleId } from "./tasks";
import { NO_MILESTONE_FILTER, type Category, type Milestone, type Task } from "./types";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
const MS_A = "00000000-0000-4000-8000-0000000000a1";
const MS_B = "00000000-0000-4000-8000-0000000000b1";
const MS_C = "00000000-0000-4000-8000-0000000000c1";

function task(overrides: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    start: "2026-04-01",
    end: "2026-04-10",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
    ...overrides,
  };
}

describe("validateNewMilestone", () => {
  it("rejects a blank name and an empty or impossible date", () => {
    expect(validateNewMilestone({ name: "   ", date: "2026-04-01" })).toBe(
      "名前を入力してください",
    );
    expect(validateNewMilestone({ name: "要件確定", date: "" })).toBe(
      "日付を入力してください",
    );
    expect(validateNewMilestone({ name: "要件確定", date: "2026-02-31" })).toBe(
      "日付を入力してください",
    );
  });

  it("accepts a name that is only padded with spaces", () => {
    expect(validateNewMilestone({ name: "  要件確定  ", date: "2026-04-01" })).toBe(
      null,
    );
  });
});

describe("appendMilestone", () => {
  it("appends a milestone without sorting or rejecting duplicates", () => {
    const later: Milestone = { id: MS_A, name: "要件確定", date: "2026-04-01" };
    const earlier: Milestone = { id: MS_B, name: "要件確定", date: "2026-03-01" };
    const same: Milestone = { id: MS_C, name: "要件確定", date: "2026-04-01" };
    const before = [later];
    const next = appendMilestone(appendMilestone(before, earlier), same);
    expect(before).toEqual([later]);
    expect(next).toEqual([later, earlier, same]);
  });
});

describe("removeMilestone", () => {
  it("removes the milestone and clears only matching milestoneId", () => {
    const linked = task({
      id: TASK_A,
      name: "基本設計",
      status: "in-progress",
      progress: 40,
      predecessors: [TASK_B],
      milestoneId: MS_A,
      note: "メモ",
    });
    const other = task({
      id: TASK_B,
      name: "詳細設計",
      milestoneId: MS_B,
    });
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks: [linked] },
          { id: "d1000001-0000-4000-8000-000000000002", name: "空", tasks: [] },
        ],
      },
      {
        id: "c1000001-0000-4000-8000-000000000002",
        name: "開発",
        groups: [{ id: "d1000001-0000-4000-8000-000000000003", name: "実装", tasks: [other] }],
      },
    ];
    const milestones: Milestone[] = [
      { id: MS_A, name: "要件確定", date: "2026-04-01" },
      { id: MS_B, name: "設計完了", date: "2026-05-01" },
    ];
    const next = removeMilestone(categories, milestones, MS_A);
    expect(next.milestones).toEqual([milestones[1]]);
    expect(next.categories).toEqual([
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks: [{ ...linked, milestoneId: null }] },
          { id: "d1000001-0000-4000-8000-000000000002", name: "空", tasks: [] },
        ],
      },
      {
        id: "c1000001-0000-4000-8000-000000000002",
        name: "開発",
        groups: [{ id: "d1000001-0000-4000-8000-000000000003", name: "実装", tasks: [other] }],
      },
    ]);
    expect(categories[0]?.groups[0]?.tasks[0]).toBe(linked);
  });
});

describe("uniqueScheduleId", () => {
  it("skips ids already used by a category, group, task, or milestone", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          { id: "d1000001-0000-4000-8000-000000000001", name: "上流", tasks: [task({ id: TASK_A, name: "基本設計" })] },
        ],
      },
    ];
    const milestones: Milestone[] = [
      { id: MS_A, name: "要件確定", date: "2026-04-01" },
    ];
    const taken = collectScheduleIds(categories, milestones);
    const sequence = [
      MS_A,
      TASK_A,
      "c1000001-0000-4000-8000-000000000001",
      "d1000001-0000-4000-8000-000000000001",
      MS_B,
    ];
    let index = 0;
    expect(uniqueScheduleId(taken, () => sequence[index++] ?? MS_C)).toBe(MS_B);
    expect(index).toBe(5);

    let attempts = 0;
    expect(() =>
      uniqueScheduleId(new Set([MS_A]), () => {
        attempts += 1;
        return MS_A;
      }),
    ).toThrow(/スケジュール ID/);
    expect(attempts).toBe(32);
  });
});

describe("milestoneFilterAfterDelete", () => {
  it("resets the milestone filter only when it is the deleted id", () => {
    expect(milestoneFilterAfterDelete(MS_A, MS_A)).toBe("all");
    expect(milestoneFilterAfterDelete("all", MS_A)).toBe("all");
    expect(milestoneFilterAfterDelete(NO_MILESTONE_FILTER, MS_A)).toBe(
      NO_MILESTONE_FILTER,
    );
    expect(milestoneFilterAfterDelete(MS_B, MS_A)).toBe(MS_B);
  });
});

describe("milestoneLinkedByAnyTask", () => {
  it("reports whether any task points at the milestone", () => {
    const categories: Category[] = [
      {
        id: "c1000001-0000-4000-8000-000000000001",
        name: "設計",
        groups: [
          {
            id: "d1000001-0000-4000-8000-000000000001",
            name: "上流",
            tasks: [task({ id: TASK_A, name: "基本設計", milestoneId: MS_A })],
          },
          { id: "d1000001-0000-4000-8000-000000000002", name: "空", tasks: [] },
        ],
      },
    ];
    expect(milestoneLinkedByAnyTask(categories, MS_A)).toBe(true);
    expect(milestoneLinkedByAnyTask(categories, MS_B)).toBe(false);
    expect(milestoneLinkedByAnyTask([], MS_A)).toBe(false);
  });
});
