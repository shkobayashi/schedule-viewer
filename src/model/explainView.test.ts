import { describe, expect, it } from "vitest";
import {
  displayedCollapsedSet,
  explainTaskIdsForFilter,
  explainViewApplySuccessText,
  explainViewClearSuccessText,
  explanationViewActive,
  orderedExplainTaskIdsForRead,
  parseExplainViewRequest,
  type ExplanationViewState,
} from "./explainView";
import { categoryCollapseKey } from "./rows";
import type { Category } from "./types";

const categories: Category[] = [
  {
    id: "c1",
    name: "Cat",
    groups: [
      {
        id: "g1",
        name: "Grp",
        tasks: [
          {
            id: "t1",
            name: "One",
            start: "2026-01-01",
            end: "2026-01-02",
            assigneeIds: [],
            status: "todo",
            progress: 0,
            confidence: "committed",
            predecessors: [],
            milestoneId: null,
          },
          {
            id: "t2",
            name: "Two",
            start: "2026-01-03",
            end: "2026-01-04",
            assigneeIds: [],
            status: "todo",
            progress: 0,
            confidence: "committed",
            predecessors: [],
            milestoneId: null,
          },
        ],
      },
    ],
  },
];

const doc = { categories, outline: undefined };

describe("parseExplainViewRequest", () => {
  it("parseExplainView_acceptsTaskIdsAndCollapse", () => {
    const parsed = parseExplainViewRequest(
      { taskIds: ["t2"], collapsedCategoryIds: ["c1"] },
      doc,
      null,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.kind !== "apply") return;
    expect(parsed.state.taskIds?.has("t2")).toBe(true);
    expect(parsed.state.collapseOverride?.has(categoryCollapseKey("c1"))).toBe(
      true,
    );
    expect(parsed.clearSelection).toBe(true);
  });

  it("parseExplainView_rejectsEmptyTaskIds", () => {
    const parsed = parseExplainViewRequest({ taskIds: [] }, doc, null);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toBe(
      "説明のための絞り込みに、タスクを 1 件以上指定してください。",
    );
  });

  it("parseExplainView_rejectsUnknownTaskId", () => {
    const parsed = parseExplainViewRequest({ taskIds: ["missing"] }, doc, null);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toBe("説明に指定したタスクが見つかりません。");
  });

  it("parseExplainView_rejectsUnknownCollapseId", () => {
    const parsed = parseExplainViewRequest(
      { collapsedCategoryIds: ["missing"] },
      doc,
      null,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toBe("説明に指定した折りたたみが見つかりません。");
  });

  it("parseExplainView_rejectsTagsAndColorId", () => {
    const parsed = parseExplainViewRequest({ tags: ["x"] }, doc, null);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toBe("説明に使えない項目があります。");
  });

  it("parseExplainView_rejectsClearWithOtherFields", () => {
    const parsed = parseExplainViewRequest(
      { clear: true, taskIds: ["t1"] },
      doc,
      null,
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toBe("clear と他の項目は同時に渡せません。");
  });

  it("parseExplainView_rejectsEmptyRequest", () => {
    const parsed = parseExplainViewRequest({}, doc, null);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toBe("説明の指定がありません。");
  });

  it("parseExplainView_clearWhenInactive", () => {
    const parsed = parseExplainViewRequest({ clear: true }, doc, null);
    expect(parsed).toEqual({ ok: true, kind: "clear" });
    expect(explainViewClearSuccessText(false)).toBe("説明は掛かっていません。");
  });
});

describe("applyExplainView selection", () => {
  it("applyExplainView_clearsSelectionWhenTaskIdsChange", () => {
    const prev: ExplanationViewState = {
      taskIds: new Set(["t1"]),
      collapseOverride: null,
    };
    const parsed = parseExplainViewRequest({ taskIds: ["t2"] }, doc, prev);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.kind !== "apply") return;
    expect(parsed.clearSelection).toBe(true);
  });

  it("applyExplainView_keepsSelectionForCollapseOnly", () => {
    const parsed = parseExplainViewRequest(
      { collapsedCategoryIds: ["c1"] },
      doc,
      null,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.kind !== "apply") return;
    expect(parsed.clearSelection).toBe(false);
  });
});

describe("displayedCollapsedSet", () => {
  it("composeDisplayedCollapse_usesOverrideOrUserSet", () => {
    const user = new Set([categoryCollapseKey("c1")]);
    const override = new Set<string>();
    const state: ExplanationViewState = {
      taskIds: null,
      collapseOverride: override,
    };
    expect(displayedCollapsedSet(user, state)).toBe(override);
    expect(displayedCollapsedSet(user, null)).toBe(user);
  });
});

describe("explainTaskIdsForFilter", () => {
  it("composeDisplayedRows_replaceKeepsTaskOutsideUserFilter", () => {
    const state: ExplanationViewState = {
      taskIds: new Set(["t2"]),
      collapseOverride: null,
    };
    expect(explainTaskIdsForFilter(state)?.has("t2")).toBe(true);
  });
});

describe("read payload helpers", () => {
  it("explanationRead_includesTaskIdsAndBaseCollapsed", () => {
    const ordered = orderedExplainTaskIdsForRead(doc, new Set(["t2", "t1"]));
    expect(ordered).toEqual(["t1", "t2"]);
  });

  it("explainViewApplySuccessText", () => {
    expect(explainViewApplySuccessText()).toBe("説明のための見え方にしました。");
    expect(explanationViewActive(null)).toBe(false);
    expect(
      explanationViewActive({ taskIds: new Set(["t1"]), collapseOverride: null }),
    ).toBe(true);
  });

  it("explainView_rejectsTranslucentKey", () => {
    expect(parseExplainViewRequest({ translucent: true }, doc, null)).toEqual({
      ok: false,
      message: "説明に使えない項目があります。",
    });
  });
});
