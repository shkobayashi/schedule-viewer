import { describe, expect, it } from "vitest";
import levels5Sample from "../../examples/hierarchy/levels-5.schedule.json";
import { hierarchyLayoutContext } from "./hierarchy";
import type { Category, ScheduleDocument, Task } from "./types";
import {
  computeVisibleRows,
  hierarchyCollapseKey,
  reorderDragBlockRows,
} from "./rows";
import {
  computeVisibleRowGuideDepths,
  hierarchyGuideSpecsForDragBlock,
  hierarchyGuideSpecsForRows,
} from "./hierarchyGuide";

const filters = {
  assignee: "all" as const,
  status: "all" as const,
  confidence: "all" as const,
  overdue: "all" as const,
  relation: "all" as const,
  milestone: "all",
  tags: [] as string[],
  search: "",
  noteSearch: "",
};

const baseTask: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Alpha",
  start: "2026-04-01",
  end: "2026-04-10",
  assigneeIds: [],
  status: "not-started",
  progress: 0,
  confidence: "committed",
  predecessors: [],
  milestoneId: null,
};

describe("hierarchyGuide", () => {
  it("gives a five-level task depth 4 ancestor lines", () => {
    const doc = {
      ...(levels5Sample as unknown as ScheduleDocument),
      categories: (levels5Sample as unknown as ScheduleDocument).categories ?? [],
    };
    const layout = hierarchyLayoutContext(doc);
    const rows = computeVisibleRows(
      [],
      filters,
      new Set(),
      "2026-04-01",
      null,
      32,
      null,
      undefined,
      {
        levels: layout.levels,
        outline: doc.outline,
        useLegacyCategoryRows: layout.useLegacyCategoryRows,
        levelCount: layout.levelCount,
      },
    );
    const specs = hierarchyGuideSpecsForRows(rows);
    let lastTaskIndex = -1;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i]?.type === "task") {
        lastTaskIndex = i;
        break;
      }
    }
    expect(lastTaskIndex).toBeGreaterThan(0);
    const spec = specs[lastTaskIndex];
    expect(spec?.depth).toBe(4);
    expect(spec?.fullVerticals).toEqual([]);
    expect(spec?.halfVerticals).toEqual([0, 1, 2, 3]);
    expect(spec?.elbow).toBe(true);
    expect(spec?.stemAt).toBeNull();
  });

  it("keeps outer verticals full when a deeper sibling follows", () => {
    const catId = "00000000-0000-4000-8000-0000000000a1";
    const groupId = "00000000-0000-4000-8000-0000000000b1";
    const task2: Task = {
      ...baseTask,
      id: "00000000-0000-4000-8000-000000000002",
      name: "Beta",
    };
    const categories: Category[] = [
      {
        id: catId,
        name: "Cat",
        groups: [
          {
            id: groupId,
            name: "G",
            tasks: [baseTask, task2],
          },
        ],
      },
    ];
    const rows = computeVisibleRows(
      categories,
      filters,
      new Set(),
      "2026-04-01",
      null,
    );
    const specs = hierarchyGuideSpecsForRows(rows);
    const firstTask = specs.find((_, i) => rows[i]?.type === "task");
    const lastTask = specs[specs.length - 1];
    expect(firstTask?.depth).toBe(2);
    expect(firstTask?.fullVerticals).toEqual([0, 1]);
    expect(firstTask?.halfVerticals).toEqual([]);
    expect(lastTask?.depth).toBe(2);
    expect(lastTask?.fullVerticals).toEqual([]);
    expect(lastTask?.halfVerticals).toEqual([0, 1]);
  });

  it("stops drag block guides at the middle on the last row", () => {
    const catId = "00000000-0000-4000-8000-0000000000a1";
    const groupId = "00000000-0000-4000-8000-0000000000b1";
    const categories: Category[] = [
      {
        id: catId,
        name: "Cat",
        groups: [{ id: groupId, name: "G", tasks: [baseTask] }],
      },
    ];
    const rows = computeVisibleRows(
      categories,
      filters,
      new Set(),
      "2026-04-01",
      null,
    );
    const block = reorderDragBlockRows(rows, "group", groupId);
    const specs = hierarchyGuideSpecsForDragBlock(block);
    const last = specs[specs.length - 1];
    expect(last?.halfVerticals).toEqual([0]);
    expect(last?.fullVerticals).toEqual([]);
  });

  it("drops stem when a header is collapsed", () => {
    const branchId = "f1000001-0000-4000-8000-000000000001";
    const outline = [
      {
        id: branchId,
        name: "まとまり",
        children: [baseTask],
      },
    ];
    const hierarchy = {
      levels: [
        { name: "まとまり", meaning: "意味" },
        { name: "タスク", meaning: "意味" },
      ],
      outline,
      useLegacyCategoryRows: false,
      levelCount: 2,
    };
    const expanded = computeVisibleRows(
      [],
      filters,
      new Set(),
      "2026-04-01",
      null,
      32,
      null,
      undefined,
      hierarchy,
    );
    expect(expanded.some((row) => row.type === "task")).toBe(true);
    const rows = computeVisibleRows(
      [],
      filters,
      new Set([hierarchyCollapseKey(branchId)]),
      "2026-04-01",
      null,
      32,
      null,
      undefined,
      hierarchy,
    );
    const specs = hierarchyGuideSpecsForRows(rows);
    expect(rows).toHaveLength(1);
    expect(specs[0]?.stemAt).toBeNull();
    expect(rows.some((row) => row.type === "task")).toBe(false);
  });

  it("keeps parent guides when one task remains after filter", () => {
    const catId = "00000000-0000-4000-8000-0000000000a1";
    const groupId = "00000000-0000-4000-8000-0000000000b1";
    const hidden: Task = {
      ...baseTask,
      id: "00000000-0000-4000-8000-000000000002",
      name: "Hidden",
    };
    const categories: Category[] = [
      {
        id: catId,
        name: "Cat",
        groups: [
          {
            id: groupId,
            name: "G",
            tasks: [baseTask, hidden],
          },
        ],
      },
    ];
    const rows = computeVisibleRows(
      categories,
      { ...filters, search: "Alpha" },
      new Set(),
      "2026-04-01",
      null,
    );
    const depths = computeVisibleRowGuideDepths(rows);
    const taskIndex = rows.findIndex((row) => row.type === "task");
    expect(taskIndex).toBeGreaterThan(0);
    expect(depths[taskIndex]).toBe(2);
    expect(rows.some((row) => row.type === "group")).toBe(true);
    expect(rows.some((row) => row.type === "category")).toBe(true);
  });

  it("starts drag block guides at depth 0 without parent category lines", () => {
    const catId = "00000000-0000-4000-8000-0000000000a1";
    const groupId = "00000000-0000-4000-8000-0000000000b1";
    const categories: Category[] = [
      {
        id: catId,
        name: "Cat",
        groups: [{ id: groupId, name: "G", tasks: [baseTask] }],
      },
    ];
    const rows = computeVisibleRows(
      categories,
      filters,
      new Set(),
      "2026-04-01",
      null,
    );
    const block = reorderDragBlockRows(rows, "category", catId);
    const specs = hierarchyGuideSpecsForDragBlock(block);
    expect(specs[0]?.depth).toBe(0);
    expect(specs[0]?.fullVerticals).toEqual([]);
    const groupSpec = specs.find((_, i) => block[i]?.type === "group");
    expect(groupSpec?.depth).toBe(1);
    expect(groupSpec?.fullVerticals).toEqual([0]);
  });

  it("starts group-only drag block at depth 0", () => {
    const catId = "00000000-0000-4000-8000-0000000000a1";
    const groupId = "00000000-0000-4000-8000-0000000000b1";
    const categories: Category[] = [
      {
        id: catId,
        name: "Cat",
        groups: [{ id: groupId, name: "G", tasks: [baseTask] }],
      },
    ];
    const rows = computeVisibleRows(
      categories,
      filters,
      new Set(),
      "2026-04-01",
      null,
    );
    const block = reorderDragBlockRows(rows, "group", groupId);
    const specs = hierarchyGuideSpecsForDragBlock(block);
    expect(specs[0]?.depth).toBe(0);
    expect(specs[0]?.fullVerticals).toEqual([]);
    expect(specs[1]?.depth).toBe(1);
    expect(specs[1]?.halfVerticals).toEqual([0]);
  });
});
