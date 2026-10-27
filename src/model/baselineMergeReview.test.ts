import { describe, expect, it } from "vitest";
import levels2 from "../../examples/hierarchy/levels-2.schedule.json";
import { collectBaselineClassificationLines } from "./baselineDiffs";
import { buildBaselineMergeReview } from "./baselineMergeReview";
import type { Category, ScheduleDocument, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
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

function review(
  baseline: ScheduleDocument,
  screen: ScheduleDocument,
  file: ScheduleDocument,
) {
  const lines = collectBaselineClassificationLines(baseline, screen, file);
  return buildBaselineMergeReview(baseline, screen, file, lines);
}

describe("buildBaselineMergeReview", () => {
  it("puts screen name and file end in separate sections", () => {
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
    const view = review(baseline, screen, file);
    expect(view.screen?.count).toBe(1);
    expect(view.file?.count).toBe(1);
    const screenBlock = view.screen?.blocks[0];
    const fileBlock = view.file?.blocks[0];
    expect(screenBlock?.kind).toBe("change");
    if (screenBlock?.kind === "change") {
      expect(screenBlock.fields.some((f) => f.label === "名前")).toBe(true);
    }
    if (fileBlock?.kind === "change") {
      const endField = fileBlock.fields.find((f) => f.label === "終了");
      expect(endField?.visible).toContain("2026-04-17");
      expect(endField?.visible).toContain("+7日");
    }
  });

  it("matches file-only name change by task id", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "画面名" })]));
    const screen = baseline;
    const file = doc(design([task({ id: TASK_A, name: "ファイル名" })]));
    const view = review(baseline, screen, file);
    const block = view.file?.blocks[0];
    expect(block?.visibleHeadline).toContain("画面名");
    if (block?.kind === "change") {
      const nameField = block.fields.find((f) => f.label === "名前");
      expect(nameField?.visible).toContain("ファイル名");
    }
  });

  it("wraps add blocks in detail lines", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "要件整理" })]));
    const added = task({ id: TASK_B, name: "基本設計" });
    const screen = doc(design([baseline.categories[0]!.groups[0]!.tasks[0], added]));
    const file = baseline;
    const view = review(baseline, screen, file);
    const block = view.screen?.blocks.find((entry) => entry.kind === "add");
    expect(block?.kind).toBe("add");
    if (block?.kind === "add") {
      expect(block.detailLines.length).toBeGreaterThan(0);
      expect(block.detailLines.some((line) => line.label === "開始")).toBe(true);
    }
  });

  it("deduplicates plain location subheadings within a section", () => {
    const t1 = task({ id: TASK_A, name: "要件整理" });
    const t2 = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([t1, t2]));
    const screen = doc(
      design([
        task({ id: TASK_A, name: "要件整理rev" }),
        task({ id: TASK_B, name: "基本設計rev" }),
      ]),
    );
    const file = baseline;
    const view = review(baseline, screen, file);
    const subheadings = view.screen?.blocks.filter(
      (block) => block.kind === "change" && block.locationSubheading,
    );
    expect(subheadings?.length).toBe(1);
  });

  it("lists same changes without field lines", () => {
    const baseline = doc(design([task({ id: TASK_A, name: "基本設計" })]));
    const changed = doc(
      design([
        task({ id: TASK_A, name: "基本設計", end: "2026-04-17" }),
      ]),
    );
    const view = review(baseline, changed, changed);
    expect(view.same?.count).toBeGreaterThan(0);
    expect(view.screen).toBeUndefined();
    expect(view.file).toBeUndefined();
  });

  it("shows order preview when diff has order body", () => {
    const a = task({ id: TASK_A, name: "要件整理" });
    const b = task({ id: TASK_B, name: "基本設計" });
    const baseline = doc(design([a, b]));
    const screen = doc(design([b, a]));
    const file = baseline;
    const view = review(baseline, screen, file);
    const block = view.screen?.blocks[0];
    expect(block?.kind).toBe("order");
    if (block?.kind === "order") {
      expect(block.preview).toContain("→");
    }
  });

  it("strips uuid from visible text and localizes assignee and status", () => {
    const baseline = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          assigneeId: null,
          status: "not-started",
        }),
      ]),
    );
    const screen = doc(
      design([
        task({
          id: TASK_A,
          name: "基本設計",
          assigneeId: "member-1",
          status: "in-progress",
        }),
      ]),
    );
    const file = baseline;
    const view = review(baseline, screen, file);
    const block = view.screen?.blocks[0];
    if (block?.kind === "change") {
      const assignee = block.fields.find((f) => f.label === "担当者");
      expect(assignee?.visible).toContain("割り当てなし");
      const status = block.fields.find((f) => f.label === "ステータス");
      expect(status?.visible).toContain("未着手");
      expect(status?.visible).toContain("進行中");
    }
    expect(block?.visibleHeadline).not.toMatch(/[0-9a-f-]{36}/i);
    expect(block?.accessibleHeadline).toContain(TASK_A);
  });
});

const OUTLINE_TASK_A = "e2000001-0000-4000-8000-000000000001";

function outlineReviewDoc(mutateTask?: (task: Task) => Task): ScheduleDocument {
  const cloned = JSON.parse(JSON.stringify(levels2)) as ScheduleDocument;
  cloned.schemaVersion = SCHEDULE_SCHEMA_VERSION;
  cloned.categories = [];
  if (mutateTask && cloned.outline) {
    const walk = (nodes: ScheduleDocument["outline"]) => {
      if (!nodes) return;
      for (const node of nodes) {
        if ("start" in node && "end" in node && node.id === OUTLINE_TASK_A) {
          Object.assign(node, mutateTask(node as Task));
        } else if ("children" in node) {
          walk(node.children);
        }
      }
    };
    walk(cloned.outline);
  }
  return cloned;
}

describe("buildBaselineMergeReview outline storage", () => {
  it("shows todo fields for screen-only outline change", () => {
    const baseline = outlineReviewDoc();
    const screen = outlineReviewDoc((task) => ({
      ...task,
      todos: [{ text: "項目", done: false }],
      progress: 0,
    }));
    const file = baseline;
    const view = review(baseline, screen, file);
    expect(view.screen?.count).toBe(1);
    const block = view.screen?.blocks[0];
    expect(block?.kind).toBe("change");
    if (block?.kind === "change") {
      const todoField = block.fields.find((field) => field.label === "TODO");
      expect(todoField?.visible).toContain("[ ] 項目");
    }
  });

  it("shows conflicting todo values in screen and file sections", () => {
    const baseline = outlineReviewDoc();
    const screen = outlineReviewDoc((task) => ({
      ...task,
      todos: [{ text: "画面側", done: false }],
      progress: 0,
    }));
    const file = outlineReviewDoc((task) => ({
      ...task,
      todos: [{ text: "ファイル側", done: false }],
      progress: 0,
    }));
    const lines = collectBaselineClassificationLines(baseline, screen, file);
    const conflict = lines.find((line) => line.label === "異なる");
    expect(conflict?.headline).toContain("調査A");
    const view = review(baseline, screen, file);
    expect(view.screen).toBeUndefined();
    expect(view.file).toBeUndefined();
  });
});
