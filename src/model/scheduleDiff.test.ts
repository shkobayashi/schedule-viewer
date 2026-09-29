import { describe, expect, it } from "vitest";
import { formatScheduleDiff } from "./scheduleDiff";
import type { Category, Milestone, ScheduleDocument, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
const TASK_C = "00000000-0000-4000-8000-00000000000c";
const TASK_D = "00000000-0000-4000-8000-00000000000d";
const MS_A = "00000000-0000-4000-8000-0000000000a1";
const MS_B = "00000000-0000-4000-8000-0000000000b1";

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

function doc(
  categories: Category[],
  milestones: Milestone[] = [],
  title = "計画",
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestones,
    categories,
  };
}

function design(tasks: Task[], group = "上流"): Category[] {
  return [{ name: "設計", groups: [{ name: group, tasks }] }];
}

describe("formatScheduleDiff", () => {
  it("says there is no difference when the documents match", () => {
    const document = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    expect(formatScheduleDiff(document, document, "plan.json")).toBe(
      ["差分（今の画面 − 開いているファイル）", "ファイル: plan.json", "差はありません"].join("\n"),
    );
  });

  it("shows calendar-day shifts for start and end", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          start: "2026-04-08",
          end: "2026-04-17",
        }),
      ]),
    );
    expect(formatScheduleDiff(screen, file, "plan.json")).toBe(
      [
        "差分（今の画面 − 開いているファイル）",
        "ファイル: plan.json",
        "",
        "変更 基本設計 (00000000-0000-4000-8000-00000000000a)",
        "  場所: 設計 / 上流",
        "  start: 2026-04-01 → 2026-04-08（+7日）",
        "  end: 2026-04-10 → 2026-04-17（+7日）",
      ].join("\n"),
    );
  });

  it("lists every field of an added task and skips sibling order", () => {
    const existing = task({ id: TASK_A, name: "要件整理" });
    const added = task({
      id: TASK_B,
      name: "基本設計",
      assigneeId: "member-1",
      status: "in-progress",
      progress: 20,
      predecessors: [TASK_A],
      milestoneId: MS_A,
      note: "  補足  ",
    });
    const file = doc(design([existing]), [{ id: MS_A, name: "要件確定", date: "2026-04-30" }]);
    const screen = doc(
      design([existing, added]),
      [{ id: MS_A, name: "要件確定", date: "2026-04-30" }],
    );
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 基本設計 (00000000-0000-4000-8000-00000000000b)");
    expect(text).toContain("  場所: 設計 / 上流");
    expect(text).toContain("  name: 基本設計");
    expect(text).toContain("  start: 2026-04-01");
    expect(text).toContain("  end: 2026-04-10");
    expect(text).toContain("  assigneeId: member-1");
    expect(text).toContain("  status: in-progress");
    expect(text).toContain("  progress: 20");
    expect(text).toContain("  confidence: committed");
    const progressAt = text.indexOf("  progress: 20");
    const confidenceAt = text.indexOf("  confidence: committed");
    const predecessorsAt = text.indexOf("  predecessors:");
    expect(progressAt).toBeLessThan(confidenceAt);
    expect(confidenceAt).toBeLessThan(predecessorsAt);
    expect(text).toContain(
      "  predecessors: 要件整理 (00000000-0000-4000-8000-00000000000a)",
    );
    expect(text).toContain(
      "  milestoneId: 要件確定 (00000000-0000-4000-8000-0000000000a1)",
    );
    expect(text).toContain("  note: 補足");
    expect(text).not.toContain("並び");
  });

  it("reports a deleted task and the predecessor dropped from the task that remains", () => {
    const removed = task({ id: TASK_A, name: "要件整理" });
    const kept = task({
      id: TASK_B,
      name: "基本設計",
      predecessors: [TASK_A],
    });
    const file = doc([
      {
        name: "設計",
        groups: [
          { name: "上流", tasks: [removed, kept] },
          { name: "詳細", tasks: [] },
        ],
      },
    ]);
    const screen = doc([
      {
        name: "設計",
        groups: [
          { name: "上流", tasks: [{ ...kept, predecessors: [] }] },
          { name: "詳細", tasks: [] },
        ],
      },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      "変更 基本設計 (00000000-0000-4000-8000-00000000000b)\n  場所: 設計 / 上流\n  predecessors: -要件整理 (00000000-0000-4000-8000-00000000000a)",
    );
    expect(text).toContain("削除 要件整理 (00000000-0000-4000-8000-00000000000a)");
    expect(text).toContain("  場所: 設計 / 上流");
    expect(text).toContain("  predecessors: （なし）");
    expect(text).not.toContain("削除 グループ");
    expect(text).not.toContain("削除 カテゴリ");
    expect(text).not.toContain("並び");
  });

  it("treats the same name with a different id as a delete and an add", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const screen = doc(design([task({ id: TASK_B, name: "基本設計" })]));
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 基本設計 (00000000-0000-4000-8000-00000000000b)");
    expect(text).toContain("削除 基本設計 (00000000-0000-4000-8000-00000000000a)");
    expect(text).not.toContain("変更");
  });

  it("shows file-only edits as the difference from the current file to the screen", () => {
    const screen = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const file = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          start: "2026-04-08",
          end: "2026-04-17",
        }),
      ]),
    );
    expect(formatScheduleDiff(screen, file, "plan.json")).toContain(
      "  start: 2026-04-08 → 2026-04-01（-7日）",
    );
  });

  it("writes an order line only when the remaining ids are reordered", () => {
    const first = task({ id: TASK_A, name: "要件整理" });
    const second = task({ id: TASK_B, name: "基本設計" });
    const third = task({ id: TASK_C, name: "詳細設計" });
    const file = doc(design([first, second, third]));

    const reordered = formatScheduleDiff(doc(design([second, first, third])), file, "plan.json");
    expect(reordered).toContain(
      [
        "並び タスク 設計 / 上流",
        "  要件整理 (00000000-0000-4000-8000-00000000000a), 基本設計 (00000000-0000-4000-8000-00000000000b), 詳細設計 (00000000-0000-4000-8000-00000000000c) → 基本設計 (00000000-0000-4000-8000-00000000000b), 要件整理 (00000000-0000-4000-8000-00000000000a), 詳細設計 (00000000-0000-4000-8000-00000000000c)",
      ].join("\n"),
    );

    const appended = formatScheduleDiff(
      doc(design([first, second, third, task({ id: TASK_D, name: "試験" })])),
      file,
      "plan.json",
    );
    expect(appended).toContain("追加 試験");
    expect(appended).not.toContain("並び");

    const middleRemoved = formatScheduleDiff(doc(design([first, third])), file, "plan.json");
    expect(middleRemoved).toContain("削除 基本設計");
    expect(middleRemoved).not.toContain("並び");
  });

  it("does not treat a category rename as a rename", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc(design([item]));
    const screen = doc([{ name: "詳細設計", groups: [{ name: "上流", tasks: [item] }] }]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 カテゴリ 詳細設計");
    expect(text).toContain("追加 グループ 詳細設計 / 上流");
    expect(text).toContain("  場所: 設計 / 上流 → 詳細設計 / 上流");
    expect(text).toContain("削除 カテゴリ 設計");
    expect(text).toContain("削除 グループ 設計 / 上流");
    expect(text).not.toContain("変更 カテゴリ");
  });

  it("ignores predecessor order when the set is unchanged", () => {
    const first = task({ id: TASK_A, name: "要件整理" });
    const second = task({ id: TASK_B, name: "基本設計" });
    const file = doc(
      design([
        first,
        second,
        task({ id: TASK_C, name: "詳細設計", predecessors: [TASK_A, TASK_B] }),
      ]),
    );
    const screen = doc(
      design([
        first,
        second,
        task({ id: TASK_C, name: "詳細設計", predecessors: [TASK_B, TASK_A] }),
      ]),
    );
    expect(formatScheduleDiff(screen, file, "plan.json")).toContain("差はありません");
  });

  it("shows a milestone date shift and a title change", () => {
    const file = doc([], [{ id: MS_A, name: "要件確定", date: "2026-04-01" }], "旧題");
    const screen = doc([], [{ id: MS_A, name: "要件確定", date: "2026-04-08" }], "新題");
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("title: 旧題 → 新題");
    expect(text).toContain(
      "変更 要件確定 (00000000-0000-4000-8000-0000000000a1)\n  date: 2026-04-01 → 2026-04-08（+7日）",
    );
  });

  it("writes milestone order and category order when the remaining items swap", () => {
    const file = doc(
      [
        { name: "設計", groups: [] },
        { name: "開発", groups: [] },
      ],
      [
        { id: MS_A, name: "要件確定", date: "2026-04-01" },
        { id: MS_B, name: "設計完了", date: "2026-05-01" },
      ],
    );
    const screen = doc(
      [
        { name: "開発", groups: [] },
        { name: "設計", groups: [] },
      ],
      [
        { id: MS_B, name: "設計完了", date: "2026-05-01" },
        { id: MS_A, name: "要件確定", date: "2026-04-01" },
      ],
    );
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("並び カテゴリ\n  設計, 開発 → 開発, 設計");
    expect(text).toContain(
      "並び マイルストン\n  要件確定 (00000000-0000-4000-8000-0000000000a1), 設計完了 (00000000-0000-4000-8000-0000000000b1) → 設計完了 (00000000-0000-4000-8000-0000000000b1), 要件確定 (00000000-0000-4000-8000-0000000000a1)",
    );
  });

  it("writes a group order line when groups in a category swap", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc([
      {
        name: "設計",
        groups: [
          { name: "上流", tasks: [item] },
          { name: "詳細", tasks: [] },
        ],
      },
    ]);
    const screen = doc([
      {
        name: "設計",
        groups: [
          { name: "詳細", tasks: [] },
          { name: "上流", tasks: [item] },
        ],
      },
    ]);
    expect(formatScheduleDiff(screen, file, "plan.json")).toContain(
      "並び グループ 設計\n  上流, 詳細 → 詳細, 上流",
    );
  });

  it("shows a cleared milestone link and the deleted milestone without an order line", () => {
    const linked = task({
      id: TASK_A,
      name: "基本設計",
      milestoneId: MS_A,
    });
    const file = doc(design([linked]), [
      { id: MS_A, name: "要件確定", date: "2026-04-01" },
    ]);
    const screen = doc(design([{ ...linked, milestoneId: null }]), []);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      [
        "変更 基本設計 (00000000-0000-4000-8000-00000000000a)",
        "  場所: 設計 / 上流",
        "  milestoneId: 要件確定 (00000000-0000-4000-8000-0000000000a1) → （なし）",
      ].join("\n"),
    );
    expect(text).toContain(
      [
        "削除 要件確定 (00000000-0000-4000-8000-0000000000a1)",
        "  name: 要件確定",
        "  date: 2026-04-01",
      ].join("\n"),
    );
    expect(text).not.toContain("並び");
  });

  it("does not write a milestone order line when a milestone is appended", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計" })]), [
      { id: MS_A, name: "要件確定", date: "2026-04-01" },
    ]);
    const screen = doc(design([task({ id: TASK_A, name: "基本設計" })]), [
      { id: MS_A, name: "要件確定", date: "2026-04-01" },
      { id: MS_B, name: "設計完了", date: "2026-03-01" },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 設計完了 (00000000-0000-4000-8000-0000000000b1)");
    expect(text).not.toContain("並び");
  });

  it("writes a missing note as （なし）", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計", note: "メモ" })]));
    const screen = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    expect(formatScheduleDiff(screen, file, "plan.json")).toContain("  note: メモ → （なし）");
  });
});
