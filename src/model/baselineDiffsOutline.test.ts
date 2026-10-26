import { describe, expect, it } from "vitest";
import levels2 from "../../examples/hierarchy/levels-2.schedule.json";
import { assessBaselineMerge } from "./baselineMerge";
import { formatBaselineDiffsText } from "./baselineDiffs";
import type { ScheduleDocument, Task } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

const TASK_A = "e2000001-0000-4000-8000-000000000001";

function outlineDoc(
  outline: ScheduleDocument["outline"],
  levels: ScheduleDocument["levels"],
  mutateTask?: (task: Task) => Task,
): ScheduleDocument {
  const cloned = JSON.parse(JSON.stringify(levels2)) as ScheduleDocument;
  cloned.schemaVersion = SCHEDULE_SCHEMA_VERSION;
  cloned.outline = JSON.parse(JSON.stringify(outline ?? cloned.outline));
  cloned.levels = levels ?? cloned.levels;
  cloned.categories = [];
  if (mutateTask && cloned.outline) {
    const walk = (nodes: ScheduleDocument["outline"]) => {
      if (!nodes) return;
      for (const node of nodes) {
        if ("start" in node && "end" in node && node.id === TASK_A) {
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

describe("outline baseline merge", () => {
  it("classifies file-only task end on outline storage", () => {
    const baseline = outlineDoc(undefined, undefined);
    const screen = baseline;
    const file = outlineDoc(undefined, undefined, (task) => ({
      ...task,
      end: "2026-10-20",
    }));
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("ファイルのみ 変更 調査A");
    expect(text).not.toContain("削除 カテゴリ");
  });

  it("merges file-only task change into outline document", () => {
    const baseline = outlineDoc(undefined, undefined);
    const screen = baseline;
    const file = outlineDoc(undefined, undefined, (task) => ({
      ...task,
      end: "2026-10-20",
    }));
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("mergeable");
    if (result.kind !== "mergeable") return;
    expect(result.document.categories).toEqual([]);
    expect(result.document.outline).toBeDefined();
    expect(result.document.levels).toBeDefined();
    const firstBranch = result.document.outline![0]!;
    expect("children" in firstBranch).toBe(true);
    const mergedTask = (firstBranch as { children: Task[] }).children[0];
    expect(mergedTask.end).toBe("2026-10-20");
  });

  it("blocks when screen adds a level and file changes a task", () => {
    const baseline = outlineDoc(undefined, undefined);
    const screenLevels = [
      ...(baseline.levels ?? []),
      { name: "工程", meaning: "タスクの一つ上" },
    ];
    const screen = outlineDoc(baseline.outline, screenLevels);
    const file = outlineDoc(undefined, undefined, (task) => ({
      ...task,
      end: "2026-10-20",
    }));
    const result = assessBaselineMerge(baseline, screen, file);
    expect(result.kind).toBe("blocked");
    const text = formatBaselineDiffsText(baseline, screen, file, "plan.json");
    expect(text).toContain("階層の入れ子が画面とファイルで違う");
  });
});
