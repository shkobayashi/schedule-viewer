import { describe, expect, it } from "vitest";
import {
  canReorderGroup,
  categoryIdOfGroup,
  groupBand,
  groupIndex,
  groupInsertMarkerY,
  insertIndexForGroupReorder,
  isContentYInGroupBand,
  resolveGroupDropTarget,
  visibleGroupSpans,
} from "./groupOrder";
import { categoryCollapseKey, computeVisibleRows, groupCollapseKey } from "./rows";
import { reorderGroups } from "./tasks";
import type { Category, ScheduleFilters, Task, TaskGroup } from "./types";

const CAT_A = "00000000-0000-4000-8000-000000000001";
const CAT_B = "00000000-0000-4000-8000-000000000002";
const GRP_A = "00000000-0000-4000-8000-000000000011";
const GRP_B = "00000000-0000-4000-8000-000000000012";
const GRP_C = "00000000-0000-4000-8000-000000000013";
const GRP_D = "00000000-0000-4000-8000-000000000014";
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
  tags: [],
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

function group(id: string, name: string, item: Task): TaskGroup {
  return { id, name, tasks: [item] };
}

function sample(): Category[] {
  return [
    {
      id: CAT_A,
      name: "企画",
      groups: [
        group(GRP_A, "調査", task(TASK_A, "A")),
        group(GRP_B, "設計", task(TASK_B, "B")),
        group(GRP_C, "実装", task(TASK_C, "C")),
      ],
    },
    {
      id: CAT_B,
      name: "空",
      groups: [{ id: GRP_D, name: "空", tasks: [] }],
    },
  ];
}

describe("reorderGroups", () => {
  it("moves a group and keeps its tasks", () => {
    const cats = sample();
    const next = reorderGroups(cats, GRP_B, 0);
    expect(next[0].groups.map((item) => item.id)).toEqual([GRP_B, GRP_A, GRP_C]);
    expect(next[0].groups[0].tasks[0].id).toBe(TASK_B);
    expect(cats[0].groups.map((item) => item.id)).toEqual([GRP_A, GRP_B, GRP_C]);
    expect(next[1]).toEqual(cats[1]);
  });

  it("returns the same array when the index is unchanged", () => {
    const cats = sample();
    expect(reorderGroups(cats, GRP_B, 1)).toBe(cats);
  });

  it("places a group at the insert index from the original spans", () => {
    const cats = sample();
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const spans = visibleGroupSpans(cats, CAT_A, rows, 32);
    const index = insertIndexForGroupReorder(40, spans!, GRP_B);
    expect(index).toBe(0);
    const next = reorderGroups(cats, GRP_B, index);
    expect(next[0].groups.map((item) => item.id)).toEqual([GRP_B, GRP_A, GRP_C]);
  });
});

describe("visibleGroupSpans", () => {
  it("returns spans when every sibling group is visible", () => {
    const cats = sample();
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const spans = visibleGroupSpans(cats, CAT_A, rows, 32);
    expect(spans?.map((span) => span.id)).toEqual([GRP_A, GRP_B, GRP_C]);
    expect(spans?.[0]).toEqual({ id: GRP_A, y: 32, endY: 96 });
    expect(spans?.[2].endY).toBe(224);
    expect(canReorderGroup(cats, GRP_B, rows, 32)).toBe(true);
    expect(categoryIdOfGroup(cats, GRP_B)).toBe(CAT_A);
  });

  it("returns spans when a group is collapsed", () => {
    const cats = sample();
    const rows = computeVisibleRows(
      cats,
      filters,
      new Set([groupCollapseKey(GRP_B)]),
      "2026-04-01",
      null,
    );
    const spans = visibleGroupSpans(cats, CAT_A, rows, 32);
    expect(spans?.map((span) => [span.id, span.endY - span.y])).toEqual([
      [GRP_A, 64],
      [GRP_B, 32],
      [GRP_C, 64],
    ]);
  });

  it("returns null when a sibling group is filtered out", () => {
    const cats = sample();
    const rows = computeVisibleRows(
      cats,
      { ...filters, search: "A" },
      new Set(),
      "2026-04-01",
      null,
    );
    expect(visibleGroupSpans(cats, CAT_A, rows, 32)).toBeNull();
    expect(canReorderGroup(cats, GRP_A, rows, 32)).toBe(false);
  });

  it("returns spans when a sibling group has no tasks", () => {
    const cats = sample();
    cats[0].groups[1] = { ...cats[0].groups[1], tasks: [] };
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    expect(visibleGroupSpans(cats, CAT_A, rows, 32)?.map((span) => span.id)).toEqual([
      GRP_A,
      GRP_B,
      GRP_C,
    ]);
  });

  it("returns null when the parent category is collapsed", () => {
    const cats = sample();
    const rows = computeVisibleRows(
      cats,
      filters,
      new Set([categoryCollapseKey(CAT_A)]),
      "2026-04-01",
      null,
    );
    expect(visibleGroupSpans(cats, CAT_A, rows, 32)).toBeNull();
  });
});

describe("insertIndexForGroupReorder", () => {
  const spans = [
    { id: GRP_A, y: 32, endY: 96 },
    { id: GRP_B, y: 96, endY: 160 },
    { id: GRP_C, y: 160, endY: 224 },
  ];

  it("inserts before the first group", () => {
    expect(insertIndexForGroupReorder(40, spans, GRP_B)).toBe(0);
  });

  it("inserts after the last group", () => {
    expect(insertIndexForGroupReorder(200, spans, GRP_B)).toBe(2);
  });

  it("inserts between groups", () => {
    expect(insertIndexForGroupReorder(100, spans, GRP_B)).toBe(1);
  });
});

describe("groupBand", () => {
  it("covers the groups in one category", () => {
    const band = groupBand([
      { id: GRP_A, y: 32, endY: 96 },
      { id: GRP_B, y: 96, endY: 160 },
    ]);
    expect(band).toEqual({ minY: 32, maxY: 160 });
    expect(isContentYInGroupBand(32, band!)).toBe(true);
    expect(isContentYInGroupBand(159, band!)).toBe(true);
    expect(isContentYInGroupBand(160, band!)).toBe(false);
    expect(isContentYInGroupBand(0, band!)).toBe(false);
  });
});

describe("groupInsertMarkerY", () => {
  const spans = [
    { id: GRP_A, y: 32, endY: 96 },
    { id: GRP_B, y: 96, endY: 160 },
  ];

  it("places the marker at the group boundary", () => {
    expect(groupInsertMarkerY(0, spans)).toBe(32);
    expect(groupInsertMarkerY(1, spans)).toBe(96);
    expect(groupInsertMarkerY(2, spans)).toBe(160);
  });
});

describe("groupIndex", () => {
  it("finds the group index in its category", () => {
    expect(groupIndex(sample(), GRP_C)).toBe(2);
    expect(groupIndex(sample(), "missing")).toBeNull();
  });
});

describe("resolveGroupDropTarget", () => {
  it("accepts another category when the name is free and a group remains", () => {
    const cats = sample();
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    expect(resolveGroupDropTarget(260, 32, GRP_A, cats, rows)).toEqual({
      targetCategoryId: CAT_B,
      insertIndex: 0,
    });
  });

  it("rejects a category that already has the same group name", () => {
    const cats = sample();
    cats[1].groups[0] = { ...cats[1].groups[0], name: "調査" };
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    expect(resolveGroupDropTarget(260, 32, GRP_A, cats, rows)).toBeNull();
  });

  it("rejects moving the last group out of its category", () => {
    const cats = sample();
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    expect(resolveGroupDropTarget(40, 32, GRP_D, cats, rows)).toBeNull();
  });
});
