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
const CAT_A = "c1000001-0000-4000-8000-000000000001";
const CAT_B = "c1000001-0000-4000-8000-000000000002";
const GRP_A = "d1000001-0000-4000-8000-000000000001";
const GRP_B = "d1000001-0000-4000-8000-000000000002";

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

function milestone(
  overrides: Partial<Milestone> & Pick<Milestone, "id" | "name" | "date">,
): Milestone {
  return { confidence: "committed", ...overrides };
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
  return [{ id: CAT_A, name: "設計", groups: [{ id: GRP_A, name: group, tasks }] }];
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
    const file = doc(design([existing]), [milestone({ id: MS_A, name: "要件確定", date: "2026-04-30" })]);
    const screen = doc(
      design([existing, added]),
      [milestone({ id: MS_A, name: "要件確定", date: "2026-04-30" })],
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
        id: CAT_A,
        name: "設計",
        groups: [
          { id: GRP_A, name: "上流", tasks: [removed, kept] },
          { id: GRP_B, name: "詳細", tasks: [] },
        ],
      },
    ]);
    const screen = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [
          { id: GRP_A, name: "上流", tasks: [{ ...kept, predecessors: [] }] },
          { id: GRP_B, name: "詳細", tasks: [] },
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

  it("shows task order when a new task is inserted before the end", () => {
    const first = task({ id: TASK_A, name: "要件整理" });
    const second = task({ id: TASK_B, name: "基本設計" });
    const third = task({ id: TASK_C, name: "詳細設計" });
    const file = doc(design([first, second, third]));
    const inserted = task({ id: TASK_D, name: "試験" });
    const screen = doc(design([first, inserted, second, third]));
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 試験");
    expect(text).toContain(
      [
        "並び タスク 設計 / 上流",
        "  要件整理 (00000000-0000-4000-8000-00000000000a), 基本設計 (00000000-0000-4000-8000-00000000000b), 詳細設計 (00000000-0000-4000-8000-00000000000c) → 要件整理 (00000000-0000-4000-8000-00000000000a), 試験 (00000000-0000-4000-8000-00000000000d), 基本設計 (00000000-0000-4000-8000-00000000000b), 詳細設計 (00000000-0000-4000-8000-00000000000c)",
      ].join("\n"),
    );
  });

  it("omits task order for trailing append when existing order is unchanged", () => {
    const first = task({ id: TASK_A, name: "要件整理" });
    const second = task({ id: TASK_B, name: "基本設計" });
    const file = doc(design([first, second]));
    const screen = doc(
      design([first, second, task({ id: TASK_C, name: "詳細設計" })]),
    );
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 詳細設計");
    expect(text).not.toContain("並び タスク");
  });

  it("excludes trailing new tasks from the order line when reorder and append happen together", () => {
    const first = task({ id: TASK_A, name: "要件整理" });
    const second = task({ id: TASK_B, name: "基本設計" });
    const third = task({ id: TASK_C, name: "詳細設計" });
    const file = doc(design([first, second, third]));
    const screen = doc(
      design([
        second,
        first,
        third,
        task({ id: TASK_D, name: "試験" }),
      ]),
    );
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 試験");
    expect(text).toContain(
      [
        "並び タスク 設計 / 上流",
        "  要件整理 (00000000-0000-4000-8000-00000000000a), 基本設計 (00000000-0000-4000-8000-00000000000b), 詳細設計 (00000000-0000-4000-8000-00000000000c) → 基本設計 (00000000-0000-4000-8000-00000000000b), 要件整理 (00000000-0000-4000-8000-00000000000a), 詳細設計 (00000000-0000-4000-8000-00000000000c)",
      ].join("\n"),
    );
    const orderLine = text
      .split("\n\n")
      .find((block) => block.startsWith("並び タスク"));
    expect(orderLine).toBeDefined();
    expect(orderLine).not.toContain("試験 (00000000-0000-4000-8000-00000000000d)");
  });

  it("shows a task place change when it moves to another group", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [
          { id: GRP_A, name: "上流", tasks: [item] },
          { id: GRP_B, name: "詳細", tasks: [] },
        ],
      },
    ]);
    const screen = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [
          { id: GRP_A, name: "上流", tasks: [] },
          { id: GRP_B, name: "詳細", tasks: [item] },
        ],
      },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      "変更 基本設計 (00000000-0000-4000-8000-00000000000a)\n  場所: 設計 / 上流 → 設計 / 詳細",
    );
    expect(text).not.toContain("追加 グループ");
    expect(text).not.toContain("削除");
    expect(text).not.toContain("変更 グループ");
  });

  it("treats a group that moves to another category as a place change", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [{ id: GRP_A, name: "上流", tasks: [item] }],
      },
      {
        id: CAT_B,
        name: "開発",
        groups: [{ id: GRP_B, name: "実装", tasks: [] }],
      },
    ]);
    const screen = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [{ id: GRP_B, name: "実装", tasks: [] }],
      },
      {
        id: CAT_B,
        name: "開発",
        groups: [{ id: GRP_A, name: "下流", tasks: [item] }],
      },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      [
        `変更 グループ 設計 / 実装 (${GRP_B})`,
        "  場所: 開発 / 実装 → 設計 / 実装",
      ].join("\n"),
    );
    expect(text).toContain(
      [
        `変更 グループ 開発 / 下流 (${GRP_A})`,
        "  場所: 設計 / 上流 → 開発 / 下流",
        "  name: 上流 → 下流",
      ].join("\n"),
    );
    expect(text).toContain(
      "変更 基本設計 (00000000-0000-4000-8000-00000000000a)\n  場所: 設計 / 上流 → 開発 / 下流",
    );
    expect(text).not.toContain("追加 グループ");
    expect(text).not.toContain("削除 グループ");
  });

  it("treats a group rename as a name change and leaves tasks in place", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc(design([item]));
    const screen = doc([
      { id: CAT_A, name: "設計", groups: [{ id: GRP_A, name: "下流", tasks: [item] }] },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      `変更 グループ 設計 / 下流 (${GRP_A})\n  name: 上流 → 下流`,
    );
    expect(text).not.toContain("場所:");
    expect(text).not.toContain("削除 グループ");
  });

  it("treats a category rename as a name change", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc(design([item]));
    const screen = doc([
      { id: CAT_A, name: "詳細設計", groups: [{ id: GRP_A, name: "上流", tasks: [item] }] },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      `変更 カテゴリ 詳細設計 (${CAT_A})\n  name: 設計 → 詳細設計`,
    );
    expect(text).not.toContain("追加 カテゴリ");
    expect(text).not.toContain("削除 カテゴリ");
    expect(text).not.toContain("場所:");
  });

  it("treats the same category name with a different id as a delete and an add", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc(design([item]));
    const screen = doc([
      { id: CAT_B, name: "設計", groups: [{ id: GRP_B, name: "上流", tasks: [item] }] },
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(`追加 カテゴリ 設計 (${CAT_B})`);
    expect(text).toContain(`削除 カテゴリ 設計 (${CAT_A})`);
    expect(text).toContain(`追加 グループ 設計 / 上流 (${GRP_B})`);
    expect(text).toContain(`削除 グループ 設計 / 上流 (${GRP_A})`);
    expect(text).toContain("  場所: 設計 / 上流 → 設計 / 上流");
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
    const file = doc([], [milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" })], "旧題");
    const screen = doc([], [milestone({ id: MS_A, name: "要件確定", date: "2026-04-08" })], "新題");
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("title: 旧題 → 新題");
    expect(text).toContain(
      "変更 要件確定 (00000000-0000-4000-8000-0000000000a1)\n  date: 2026-04-01 → 2026-04-08（+7日）",
    );
  });

  it("writes milestone order and category order when the remaining items swap", () => {
    const file = doc(
      [
        { id: CAT_A, name: "設計", groups: [] },
        { id: CAT_B, name: "開発", groups: [] },
      ],
      [
        milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
        milestone({ id: MS_B, name: "設計完了", date: "2026-05-01" }),
      ],
    );
    const screen = doc(
      [
        { id: CAT_B, name: "開発", groups: [] },
        { id: CAT_A, name: "設計", groups: [] },
      ],
      [
        milestone({ id: MS_B, name: "設計完了", date: "2026-05-01" }),
        milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
      ],
    );
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      `並び カテゴリ\n  設計 (${CAT_A}), 開発 (${CAT_B}) → 開発 (${CAT_B}), 設計 (${CAT_A})`,
    );
    expect(text).toContain(
      "並び マイルストン\n  要件確定 (00000000-0000-4000-8000-0000000000a1), 設計完了 (00000000-0000-4000-8000-0000000000b1) → 設計完了 (00000000-0000-4000-8000-0000000000b1), 要件確定 (00000000-0000-4000-8000-0000000000a1)",
    );
  });

  it("writes a group order line when groups in a category swap", () => {
    const item = task({ id: TASK_A, name: "基本設計" });
    const file = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [
          { id: GRP_A, name: "上流", tasks: [item] },
          { id: GRP_B, name: "詳細", tasks: [] },
        ],
      },
    ]);
    const screen = doc([
      {
        id: CAT_A,
        name: "設計",
        groups: [
          { id: GRP_B, name: "詳細", tasks: [] },
          { id: GRP_A, name: "上流", tasks: [item] },
        ],
      },
    ]);
    expect(formatScheduleDiff(screen, file, "plan.json")).toContain(
      `並び グループ 設計\n  上流 (${GRP_A}), 詳細 (${GRP_B}) → 詳細 (${GRP_B}), 上流 (${GRP_A})`,
    );
  });

  it("shows a cleared milestone link and the deleted milestone without an order line", () => {
    const linked = task({
      id: TASK_A,
      name: "基本設計",
      milestoneId: MS_A,
    });
    const file = doc(design([linked]), [
      milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
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
      milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
    ]);
    const screen = doc(design([task({ id: TASK_A, name: "基本設計" })]), [
      milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" }),
      milestone({ id: MS_B, name: "設計完了", date: "2026-03-01" }),
    ]);
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain("追加 設計完了 (00000000-0000-4000-8000-0000000000b1)");
    expect(text).not.toContain("並び");
  });

  it("shows a milestone confidence change after the date", () => {
    const file = doc([], [milestone({ id: MS_A, name: "要件確定", date: "2026-04-01" })]);
    const screen = doc(
      [],
      [
        milestone({
          id: MS_A,
          name: "要件確定",
          date: "2026-04-01",
          confidence: "tentative",
        }),
      ],
    );
    const text = formatScheduleDiff(screen, file, "plan.json");
    expect(text).toContain(
      "変更 要件確定 (00000000-0000-4000-8000-0000000000a1)\n  confidence: committed → tentative",
    );
    expect(text).not.toContain("  date:");
  });

  it("writes a missing note as （なし）", () => {
    const file = doc(design([task({ id: TASK_A, name: "基本設計", note: "メモ" })]));
    const screen = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    expect(formatScheduleDiff(screen, file, "plan.json")).toContain("  note: メモ → （なし）");
  });
});
