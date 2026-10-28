import { describe, expect, it } from "vitest";
import { formatBaselineDiffsText } from "./baselineDiffs";
import type { Category, ScheduleDocument, ScheduleFieldDef, Task } from "./types";
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

describe("formatBaselineDiffsText", () => {
  it("reports no changes when baseline, screen, and file match", () => {
    const document = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const text = formatBaselineDiffsText(document, document, document, "plan.json");
    expect(text).toContain("画面:\n\n差はありません");
    expect(text).toContain("ファイル: plan.json\n\n差はありません");
    expect(text).toContain("分類:\n差はありません");
  });

  it("classifies screen-only name change", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(design([task({ id: TASK_A, name: "基本設計rev" })]));
    const file = baseline;
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("name: 基本設計 → 基本設計rev");
    expect(text).toContain("画面のみ 変更 基本設計rev");
    expect(text).toContain("ファイル: plan.json\n\n差はありません");
  });

  const fieldDefs: ScheduleFieldDef[] = [
    { key: "demo_score", name: "点数", type: "number" },
  ];

  it("classifies file-only fieldValues change", () => {
    const baseline = doc(
      design([task({ id: TASK_A, name: "基本設計", fieldValues: { demo_score: 1 } })]),
    );
    const screen = baseline;
    const file = doc(
      design([task({ id: TASK_A, name: "基本設計", fieldValues: { demo_score: 2 } })]),
    );
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json", fieldDefs);
    expect(text).toContain("画面:\n\n差はありません");
    expect(text).toContain("  demo_score: 1 → 2");
    expect(text).toContain("ファイルのみ 変更 基本設計");
  });

  it("classifies conflicting fieldValues as 異なる", () => {
    const baseline = doc(
      design([task({ id: TASK_A, name: "基本設計", fieldValues: { demo_score: 1 } })]),
    );
    const screen = doc(
      design([task({ id: TASK_A, name: "基本設計", fieldValues: { demo_score: 2 } })]),
    );
    const file = doc(
      design([task({ id: TASK_A, name: "基本設計", fieldValues: { demo_score: 3 } })]),
    );
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json", fieldDefs);
    expect(text).toContain("異なる 変更 基本設計");
    expect(text).toContain("  demo_score: 1 → 2");
    expect(text).toContain("  demo_score: 1 → 3");
  });

  it("classifies file-only end date change", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = baseline;
    const file = doc(
      design([
        task({ id: TASK_A, name: "基本設計", end: "2026-04-17" }),
      ]),
    );
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("画面:\n\n差はありません");
    expect(text).toContain("end: 2026-04-10 → 2026-04-17");
    expect(text).toContain("ファイルのみ 変更 基本設計");
  });

  it("classifies the same end date change on both sides", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const changed = doc(
      design([
        task({ id: TASK_A, name: "基本設計", end: "2026-04-17" }),
      ]),
    );
    const text = formatBaselineDiffsText(baseline, changed, changed, "plan.json");
    expect(text).toContain("同じ 変更 基本設計");
  });

  it("classifies different end dates on both sides as 異なる", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(
      design([task({ id: TASK_A, name: "基本設計", end: "2026-04-17" })]),
    );
    const file = doc(
      design([task({ id: TASK_A, name: "基本設計", end: "2026-04-20" })]),
    );
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("異なる 変更 基本設計");
  });

  it("classifies screen name and file end on the same task as one 異なる line", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(design([task({ id: TASK_A, name: "基本設計rev" })]));
    const file = doc(
      design([task({ id: TASK_A, name: "基本設計", end: "2026-04-17" })]),
    );
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("name: 基本設計 → 基本設計rev");
    expect(text).toContain("end: 2026-04-10 → 2026-04-17");
    expect(text).toMatch(/異なる 変更 基本設計rev/);
    expect(text).not.toMatch(/画面のみ 変更/);
    expect(text).not.toMatch(/ファイルのみ 変更/);
  });

  it("classifies predecessor set differences as 異なる on the task", () => {
    const existing = task({ id: TASK_A, name: "要件整理" });
    const kept = task({ id: TASK_B, name: "基本設計", predecessors: [] });
    const baseline = doc(design([existing, kept]));
    const screen = doc(
      design([
        existing,
        task({ id: TASK_B, name: "基本設計", predecessors: [TASK_A] }),
      ]),
    );
    const file = doc(
      design([
        existing,
        task({ id: TASK_B, name: "基本設計", predecessors: [TASK_C] }),
      ]),
    );
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("異なる 変更 基本設計");
    expect(text).not.toContain("追加と削除");
  });

  it("classifies both deletes as 同じ", () => {
    const removed = task({ id: TASK_A, name: "要件整理" });
    const kept = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([removed, kept]));
    const screen = doc(design([kept]));
    const file = doc(design([kept]));
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("同じ 削除 要件整理");
  });

  it("classifies screen delete and file change on the same id as 削除と変更", () => {
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
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("削除と変更 変更 基本設計");
    expect(text).not.toMatch(/異なる 変更 基本設計/);
  });

  it("classifies identical adds as 同じ and different adds as 異なる", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "要件整理" })]));
    const added = task({ id: TASK_B, name: "基本設計" });
    const sameBoth = doc(design([task({ id: TASK_A, name: "要件整理" }), added]));
    const textSame = formatBaselineDiffsText(baseline, sameBoth, sameBoth, "plan.json");
    expect(textSame).toContain("同じ 追加 基本設計");

    const fileAdded = doc(
      design([
        task({ id: TASK_A, name: "要件整理" }),
        task({ id: TASK_B, name: "基本設計", end: "2026-04-20" }),
      ]),
    );
    const textDiff = formatBaselineDiffsText(baseline, sameBoth, fileAdded, "plan.json");
    expect(textDiff).toContain("異なる 追加 基本設計");
  });

  it("classifies screen-only task reorder", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([a, b]));
    const screen = doc(design([b, a]));
    const file = baseline;
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("画面のみ 並び タスク 設計 / 上流");
  });

  it("classifies trailing append in classification when diff body omits order", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([a]));
    const screen = doc(design([a, b]));
    const file = baseline;
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    const screenSection = text.split("ファイル:")[0] ?? "";
    expect(screenSection).not.toContain("並び タスク");
    expect(text).toContain("画面のみ 並び タスク 設計 / 上流");
    expect(text).toContain("画面のみ 追加 基本設計");
  });

  it("classifies different trailing appends on both sides", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const c = task({ id: TASK_C, name: "詳細設計" });
    const baseline = doc(design([a]));
    const screen = doc(design([a, b]));
    const file = doc(design([a, c]));
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("画面のみ 追加 基本設計");
    expect(text).toContain("ファイルのみ 追加 詳細設計");
    expect(text).toContain("異なる 並び タスク 設計 / 上流");
  });
});
