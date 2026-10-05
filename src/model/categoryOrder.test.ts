import { describe, expect, it } from "vitest";
import {
  canReorderCategory,
  categoryBand,
  categoryIndex,
  categoryInsertMarkerY,
  insertIndexForCategoryReorder,
  isContentYInCategoryBand,
  visibleCategorySpans,
} from "./categoryOrder";
import { categoryCollapseKey, computeVisibleRows } from "./rows";
import { reorderCategories } from "./tasks";
import type { Category, ScheduleFilters, Task } from "./types";

const CAT_A = "00000000-0000-4000-8000-000000000001";
const CAT_B = "00000000-0000-4000-8000-000000000002";
const CAT_C = "00000000-0000-4000-8000-000000000003";
const GRP_A = "00000000-0000-4000-8000-000000000011";
const GRP_B = "00000000-0000-4000-8000-000000000012";
const GRP_C = "00000000-0000-4000-8000-000000000013";
const TASK_A = "00000000-0000-4000-8000-00000000000a";
const TASK_B = "00000000-0000-4000-8000-00000000000b";
const TASK_C = "00000000-0000-4000-8000-00000000000c";

const filters: ScheduleFilters = {
  assignee: "all",
  status: "all",
  confidence: "all",
  overdue: "all",
  relation: "all",
  milestone: "all",
  search: "",
  noteSearch: "",
};

function task(id: string, name: string): Task {
  return {
    id,
    name,
    start: "2026-04-01",
    end: "2026-04-05",
    assigneeId: null,
    status: "not-started",
    progress: 0,
    confidence: "committed",
    predecessors: [],
    milestoneId: null,
  };
}

function category(id: string, name: string, groupId: string, item: Task): Category {
  return {
    id,
    name,
    groups: [{ id: groupId, name: "グループ", tasks: [item] }],
  };
}

function sample(): Category[] {
  return [
    category(CAT_A, "企画", GRP_A, task(TASK_A, "A")),
    category(CAT_B, "設計", GRP_B, task(TASK_B, "B")),
    category(CAT_C, "実装", GRP_C, task(TASK_C, "C")),
  ];
}

describe("reorderCategories", () => {
  it("moves a category and keeps its groups", () => {
    const cats = sample();
    const next = reorderCategories(cats, CAT_C, 0);
    expect(next.map((item) => item.id)).toEqual([CAT_C, CAT_A, CAT_B]);
    expect(next[0].groups[0].id).toBe(GRP_C);
    expect(cats.map((item) => item.id)).toEqual([CAT_A, CAT_B, CAT_C]);
  });

  it("returns the same array when the index is unchanged", () => {
    const cats = sample();
    expect(reorderCategories(cats, CAT_B, 1)).toBe(cats);
  });

  it("places a category at the insert index from the original spans", () => {
    const cats = sample();
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const spans = visibleCategorySpans(cats, rows, 32);
    const index = insertIndexForCategoryReorder(200, spans!, CAT_A);
    expect(index).toBe(1);
    const next = reorderCategories(cats, CAT_A, index);
    expect(next.map((item) => item.id)).toEqual([CAT_B, CAT_A, CAT_C]);
  });
});

describe("visibleCategorySpans", () => {
  it("returns spans when every category is visible", () => {
    const cats = sample();
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const spans = visibleCategorySpans(cats, rows, 32);
    expect(spans?.map((span) => span.id)).toEqual([CAT_A, CAT_B, CAT_C]);
    expect(spans?.[0]).toEqual({ id: CAT_A, y: 0, endY: 96 });
    expect(canReorderCategory(cats, CAT_B, rows, 32)).toBe(true);
  });

  it("returns spans when a category is collapsed", () => {
    const cats = sample();
    const rows = computeVisibleRows(
      cats,
      filters,
      new Set([categoryCollapseKey(CAT_B)]),
      "2026-04-01",
      null,
    );
    const spans = visibleCategorySpans(cats, rows, 32);
    expect(spans?.map((span) => [span.id, span.endY - span.y])).toEqual([
      [CAT_A, 96],
      [CAT_B, 32],
      [CAT_C, 96],
    ]);
  });

  it("returns null when a category is filtered out", () => {
    const cats = sample();
    const rows = computeVisibleRows(
      cats,
      { ...filters, search: "A" },
      new Set(),
      "2026-04-01",
      null,
    );
    expect(visibleCategorySpans(cats, rows, 32)).toBeNull();
    expect(canReorderCategory(cats, CAT_A, rows, 32)).toBe(false);
  });

  it("returns null when a category has no tasks", () => {
    const cats = sample();
    cats[1] = { ...cats[1], groups: [{ ...cats[1].groups[0], tasks: [] }] };
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    expect(visibleCategorySpans(cats, rows, 32)).toBeNull();
  });
});

describe("insertIndexForCategoryReorder", () => {
  const spans = [
    { id: CAT_A, y: 0, endY: 96 },
    { id: CAT_B, y: 96, endY: 192 },
    { id: CAT_C, y: 192, endY: 288 },
  ];

  it("inserts before the first category", () => {
    expect(insertIndexForCategoryReorder(10, spans, CAT_B)).toBe(0);
  });

  it("inserts after the last category", () => {
    expect(insertIndexForCategoryReorder(250, spans, CAT_B)).toBe(2);
  });

  it("inserts between categories", () => {
    expect(insertIndexForCategoryReorder(100, spans, CAT_B)).toBe(1);
  });
});

describe("categoryBand", () => {
  it("covers the full category stack", () => {
    const band = categoryBand([
      { id: CAT_A, y: 0, endY: 96 },
      { id: CAT_B, y: 96, endY: 160 },
    ]);
    expect(band).toEqual({ minY: 0, maxY: 160 });
    expect(isContentYInCategoryBand(0, band!)).toBe(true);
    expect(isContentYInCategoryBand(159, band!)).toBe(true);
    expect(isContentYInCategoryBand(160, band!)).toBe(false);
  });
});

describe("categoryInsertMarkerY", () => {
  const spans = [
    { id: CAT_A, y: 0, endY: 96 },
    { id: CAT_B, y: 96, endY: 192 },
  ];

  it("places the marker at the category boundary", () => {
    expect(categoryInsertMarkerY(0, spans)).toBe(0);
    expect(categoryInsertMarkerY(1, spans)).toBe(96);
    expect(categoryInsertMarkerY(2, spans)).toBe(192);
  });
});

describe("categoryIndex", () => {
  it("finds the category index", () => {
    expect(categoryIndex(sample(), CAT_C)).toBe(2);
    expect(categoryIndex(sample(), "missing")).toBeNull();
  });
});
