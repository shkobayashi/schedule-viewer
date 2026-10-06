import { describe, expect, it } from "vitest";
import { computeVisibleRows } from "./rows";
import { groupCollapseKey } from "./rows";
import {
  canReorderTaskInGroup,
  classifyRowDrag,
  groupTaskBand,
  insertIndexForReorder,
  insertMarkerY,
  isContentYInGroupTaskBand,
  resolveTaskDropTarget,
  taskIndexInGroup,
  visibleGroupTaskRows,
} from "./taskOrder";
import { reorderTaskInGroup } from "./tasks";
import type { Category, ScheduleFilters, Task } from "./types";

const CAT = "00000000-0000-4000-8000-000000000001";
const GRP = "00000000-0000-4000-8000-000000000002";
const GRP_OTHER = "00000000-0000-4000-8000-000000000003";
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

function categories(tasks: Task[]): Category[] {
  return [
    {
      id: CAT,
      name: "設計",
      groups: [{ id: GRP, name: "上流", tasks }],
    },
  ];
}

describe("classifyRowDrag", () => {
  it("stays pending until one axis passes the threshold", () => {
    expect(classifyRowDrag(2, 1, true, true)).toBe("pending");
    expect(classifyRowDrag(3, 3, true, true)).toBe("pending");
    expect(classifyRowDrag(4, 4, true, true)).toBe("pending");
  });

  it("slides when horizontal movement is first and the name overflows", () => {
    expect(classifyRowDrag(8, 2, true, true)).toBe("slide");
  });

  it("ignores a horizontal-first drag when the name fits", () => {
    expect(classifyRowDrag(8, 2, false, true)).toBe("ignore");
  });

  it("reorders when vertical movement is greater", () => {
    expect(classifyRowDrag(2, 8, true, true)).toBe("reorder");
  });

  it("stays pending when vertical movement is greater but siblings are hidden", () => {
    expect(classifyRowDrag(2, 8, true, false)).toBe("pending");
  });
});

describe("reorderTaskInGroup", () => {
  it("moves a task within its group", () => {
    const cats = categories([task(TASK_A, "A"), task(TASK_B, "B"), task(TASK_C, "C")]);
    const next = reorderTaskInGroup(cats, TASK_C, 0);
    expect(next[0].groups[0].tasks.map((item) => item.id)).toEqual([
      TASK_C,
      TASK_A,
      TASK_B,
    ]);
  });

  it("returns the same array when the index is unchanged", () => {
    const cats = categories([task(TASK_A, "A"), task(TASK_B, "B")]);
    const next = reorderTaskInGroup(cats, TASK_B, 1);
    expect(next).toBe(cats);
  });

  it("places a task at the insert index from the original row positions", () => {
    const cats = categories([task(TASK_A, "A"), task(TASK_B, "B"), task(TASK_C, "C")]);
    const groupRows = [
      { id: TASK_A, y: 64 },
      { id: TASK_B, y: 96 },
      { id: TASK_C, y: 128 },
    ];
    const index = insertIndexForReorder(120, 32, groupRows, TASK_A);
    expect(index).toBe(1);
    const next = reorderTaskInGroup(cats, TASK_A, index);
    expect(next[0].groups[0].tasks.map((item) => item.id)).toEqual([
      TASK_B,
      TASK_A,
      TASK_C,
    ]);
  });
});

describe("visibleGroupTaskRows", () => {
  it("returns rows when every sibling is visible", () => {
    const cats = categories([task(TASK_A, "A"), task(TASK_B, "B")]);
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const groupRows = visibleGroupTaskRows(cats, GRP, rows);
    expect(groupRows?.map((row) => row.id)).toEqual([TASK_A, TASK_B]);
  });

  it("returns null when a sibling is filtered out", () => {
    const cats = categories([task(TASK_A, "A"), task(TASK_B, "B")]);
    const rows = computeVisibleRows(
      cats,
      { ...filters, search: "A" },
      new Set(),
      "2026-04-01",
      null,
    );
    expect(visibleGroupTaskRows(cats, GRP, rows)).toBeNull();
    expect(canReorderTaskInGroup(cats, TASK_A, rows)).toBe(false);
  });
});

describe("insertIndexForReorder", () => {
  const groupRows = [
    { id: TASK_A, y: 64 },
    { id: TASK_B, y: 96 },
    { id: TASK_C, y: 128 },
  ];

  it("inserts before the first row", () => {
    expect(insertIndexForReorder(50, 32, groupRows, TASK_B)).toBe(0);
  });

  it("inserts after the last row", () => {
    expect(insertIndexForReorder(200, 32, groupRows, TASK_B)).toBe(2);
  });

  it("inserts between rows", () => {
    expect(insertIndexForReorder(100, 32, groupRows, TASK_B)).toBe(1);
  });
});

describe("groupTaskBand", () => {
  it("covers the full task row span", () => {
    const band = groupTaskBand([{ id: TASK_A, y: 64 }, { id: TASK_B, y: 96 }], 32);
    expect(band).toEqual({ minY: 64, maxY: 128 });
    expect(isContentYInGroupTaskBand(64, band!)).toBe(true);
    expect(isContentYInGroupTaskBand(127, band!)).toBe(true);
    expect(isContentYInGroupTaskBand(128, band!)).toBe(false);
  });
});

describe("insertMarkerY", () => {
  it("places the marker at the preview gap", () => {
    expect(insertMarkerY(0, 32, [{ y: 64 }, { y: 96 }])).toBe(64);
    expect(insertMarkerY(2, 32, [{ y: 64 }, { y: 96 }])).toBe(128);
  });
});

describe("taskIndexInGroup", () => {
  it("finds the task index", () => {
    const cats = categories([task(TASK_A, "A"), task(TASK_B, "B")]);
    expect(taskIndexInGroup(cats, TASK_B)).toBe(1);
  });
});

describe("resolveTaskDropTarget", () => {
  it("places a downward move at the index after the dragged task is removed", () => {
    const cats = categories([
      task(TASK_A, "A"),
      task(TASK_B, "B"),
      task(TASK_C, "C"),
    ]);
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const target = resolveTaskDropTarget(120, 32, TASK_A, cats, rows);
    expect(target).toEqual({ targetGroupId: GRP, insertIndex: 1 });
    const next = reorderTaskInGroup(cats, TASK_A, target!.insertIndex);
    expect(next[0].groups[0].tasks.map((item) => item.id)).toEqual([
      TASK_B,
      TASK_A,
      TASK_C,
    ]);
  });

  it("inserts at the start of another group", () => {
    const cats: Category[] = [
      {
        id: CAT,
        name: "設計",
        groups: [
          {
            id: GRP,
            name: "上流",
            tasks: [task(TASK_A, "A"), task(TASK_B, "B")],
          },
          { id: GRP_OTHER, name: "詳細", tasks: [task(TASK_C, "C")] },
        ],
      },
    ];
    const rows = computeVisibleRows(cats, filters, new Set(), "2026-04-01", null);
    const onTask = resolveTaskDropTarget(168, 32, TASK_A, cats, rows);
    expect(onTask).toEqual({ targetGroupId: GRP_OTHER, insertIndex: 0 });
    const onGroup = resolveTaskDropTarget(129, 32, TASK_A, cats, rows);
    expect(onGroup).toEqual({ targetGroupId: GRP_OTHER, insertIndex: 0 });
  });

  it("does not drop into a collapsed group", () => {
    const cats: Category[] = [
      {
        id: CAT,
        name: "設計",
        groups: [
          { id: GRP, name: "上流", tasks: [task(TASK_A, "A")] },
          { id: GRP_OTHER, name: "空", tasks: [] },
        ],
      },
    ];
    const rows = computeVisibleRows(
      cats,
      filters,
      new Set([groupCollapseKey(GRP_OTHER)]),
      "2026-04-01",
      null,
    );
    const empty = rows.find(
      (row) => row.type === "group" && row.id === GRP_OTHER,
    );
    expect(empty?.type === "group" && empty.collapsed).toBe(true);
    expect(
      resolveTaskDropTarget((empty?.y ?? 0) + 1, 32, TASK_A, cats, rows),
    ).toBeNull();
  });
});
