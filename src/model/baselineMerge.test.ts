import { describe, expect, it } from "vitest";
import { assessBaselineMerge } from "./baselineMerge";
import type { Category, ScheduleDocument, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
const TASK_C = "00000000-0000-4000-8000-00000000000c";
const CAT_A = "c1000001-0000-4000-8000-000000000001";
const GRP_A = "d1000001-0000-4000-8000-000000000001";

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

function doc(categories: Category[], title = "計画"): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestoneGroups: [],
    milestones: [],
    categories,
  };
}

function design(tasks: Task[]): Category[] {
  return [{ id: CAT_A, name: "設計", groups: [{ id: GRP_A, name: "上流", tasks }] }];
}

describe("assessBaselineMerge", () => {
  it("merges screen name and file end on different tasks", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([a, b]));
    const screen = doc(
      design([
        task({ id: TASK_A, name: "要件整理rev" }),
        b,
      ]),
    );
    const file = doc(
      design([
        a,
        task({ id: TASK_B, name: "基本設計", end: "2026-04-17" }),
      ]),
    );
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("mergeable");
    if (result.kind !== "mergeable") return;
    const mergedA = result.document.categories[0]!.groups[0]!.tasks.find(
      (t) => t.id === TASK_A,
    );
    const mergedB = result.document.categories[0]!.groups[0]!.tasks.find(
      (t) => t.id === TASK_B,
    );
    expect(mergedA?.name).toBe("要件整理rev");
    expect(mergedB?.end).toBe("2026-04-17");
  });

  it("blocks same task with screen name and file end", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(design([task({ id: TASK_A, name: "基本設計rev" })]));
    const file = doc(
      design([task({ id: TASK_A, name: "基本設計", end: "2026-04-17" })]),
    );
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("blocked");
  });

  it("blocks different trailing appends on both sides", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const c = task({ id: TASK_C, name: "詳細設計" });
    const baseline = doc(design([a]));
    const screen = doc(design([a, b]));
    const file = doc(design([a, c]));
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("blocked");
  });

  it("merges screen-only task reorder", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([a, b]));
    const screen = doc(design([b, a]));
    const file = baseline;
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("mergeable");
    if (result.kind !== "mergeable") return;
    const ids = result.document.categories[0]!.groups[0]!.tasks.map((t) => t.id);
    expect(ids).toEqual([TASK_B, TASK_A]);
  });

  it("returns sameOnly when both sides made the same end date change", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const changed = doc(
      design([
        task({ id: TASK_A, name: "基本設計", end: "2026-04-17" }),
      ]),
    );
    const result = assessBaselineMerge(baseline, changed, changed);
    expect(result.kind).toBe("sameOnly");
  });

  it("blocks screen delete and file change on the same id", () => {
    const target = task({ id: TASK_A, name: "基本設計" });
    const baseline = doc(design([target]));
    const screen = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [{ id: GRP_A, name: "上流", tasks: [] }],
      },
    ]);
    const file = doc(
      design([task({ id: TASK_A, name: "基本設計", end: "2026-04-20" })]),
    );
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("blocked");
  });
});
