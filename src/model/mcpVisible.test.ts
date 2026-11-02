import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import {
  buildMcpViewVisible,
  mcpTaskVisibility,
  mcpVisibleDates,
  mcpVisibleRows,
  rowIntersectsViewport,
  taskHiddenByCollapsedAncestors,
} from "./mcpVisible";
import { categoryCollapseKey, groupCollapseKey, hierarchyCollapseKey } from "./rows";
import type { OutlineRoot, Task, VisibleRow } from "./types";

const timelineStart = parseDate("2026-01-01");

function taskRow(id: string, name: string, y: number): VisibleRow {
  return {
    type: "task",
    y,
    task: {
      id,
      name,
      start: "2026-01-05",
      end: "2026-01-10",
      assigneeIds: [],
      status: "not-started",
      progress: 0,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
      tags: [],
    } satisfies Task,
  };
}

describe("mcpVisibleDates", () => {
  it("includes the left edge day and excludes the day at an exact right boundary", () => {
    expect(
      mcpVisibleDates({
        timelineStart,
        totalDays: 30,
        scrollX: 0,
        pxPerDay: 10,
        chartWidth: 70,
      }),
    ).toEqual({ start: "2026-01-01", end: "2026-01-07" });
  });

  it("returns null when chart width is zero", () => {
    expect(
      mcpVisibleDates({
        timelineStart,
        totalDays: 30,
        scrollX: 0,
        pxPerDay: 10,
        chartWidth: 0,
      }),
    ).toBeNull();
  });

  it("includes the day under the left edge after horizontal scroll", () => {
    expect(
      mcpVisibleDates({
        timelineStart,
        totalDays: 30,
        scrollX: 25,
        pxPerDay: 10,
        chartWidth: 50,
      }),
    ).toEqual({ start: "2026-01-03", end: "2026-01-08" });
  });

  it("does not extend dates past the timeline when the chart is wider than content", () => {
    expect(
      mcpVisibleDates({
        timelineStart,
        totalDays: 30,
        scrollX: 0,
        pxPerDay: 10,
        chartWidth: 400,
      }),
    ).toEqual({ start: "2026-01-01", end: "2026-01-31" });
  });
});

describe("mcpVisibleRows", () => {
  const rows: VisibleRow[] = [
    {
      type: "category",
      id: "c1",
      label: "Cat",
      y: 0,
      collapsed: false,
      summary: null,
      rollupPercent: null,
    },
    taskRow("t1", "Visible", 32),
    taskRow("t2", "Below", 400),
  ];

  it("lists rows that intersect the vertical viewport", () => {
    expect(
      mcpVisibleRows({
        visibleRows: rows,
        scrollY: 0,
        rowHeight: 32,
        bodyHeight: 100,
      }),
    ).toEqual([
      { kind: "category", id: "c1", name: "Cat" },
      { kind: "task", id: "t1", name: "Visible" },
    ]);
  });

  it("includes sticky header rows that stay pinned above the viewport", () => {
    const manyRows: VisibleRow[] = [
      {
        type: "category",
        id: "c1",
        label: "Cat",
        y: 0,
        collapsed: false,
        summary: null,
        rollupPercent: null,
      },
      {
        type: "group",
        id: "g1",
        categoryId: "c1",
        category: "Cat",
        label: "Grp",
        y: 32,
        collapsed: false,
        summary: null,
        rollupPercent: null,
      },
      ...Array.from({ length: 20 }, (_, index) =>
        taskRow(`t${index}`, `Task ${index}`, 64 + index * 32),
      ),
    ];
    const visible = mcpVisibleRows({
      visibleRows: manyRows,
      scrollY: 64 + 18 * 32,
      rowHeight: 32,
      bodyHeight: 96,
    });
    expect(visible.some((row) => row.kind === "category" && row.id === "c1")).toBe(
      true,
    );
    expect(visible.some((row) => row.kind === "group" && row.id === "g1")).toBe(
      true,
    );
  });
});

describe("mcpTaskVisibility", () => {
  const categories = [
    {
      id: "00000000-0000-4000-8000-000000000010",
      name: "Cat",
      groups: [
        {
          id: "00000000-0000-4000-8000-000000000020",
          name: "Grp",
          tasks: [
            {
              id: "00000000-0000-4000-8000-000000000030",
              name: "Task",
              start: "2026-01-05",
              end: "2026-01-10",
              assigneeIds: [],
              status: "not-started",
              progress: 0,
              confidence: "committed",
              predecessors: [],
              milestoneId: null,
              tags: [],
            } satisfies Task,
          ],
        },
      ],
    },
  ];
  const taskId = "00000000-0000-4000-8000-000000000030";
  const catId = "00000000-0000-4000-8000-000000000010";

  it("marks a task visible when its row intersects the viewport", () => {
    expect(
      mcpTaskVisibility({
        taskId,
        categories,
        outline: undefined,
        collapsed: new Set(),
        visibleRows: [taskRow(taskId, "Task", 0)],
        scrollY: 0,
        rowHeight: 32,
        bodyHeight: 200,
      }),
    ).toBe("visible");
  });

  it("prefers collapsed when ancestors are folded", () => {
    expect(
      mcpTaskVisibility({
        taskId,
        categories,
        outline: undefined,
        collapsed: new Set([categoryCollapseKey(catId)]),
        visibleRows: [taskRow(taskId, "Task", 0)],
        scrollY: 0,
        rowHeight: 32,
        bodyHeight: 200,
      }),
    ).toBe("collapsed");
  });

  it("prefers collapsed for a folded outline heading even when the task row is in the viewport", () => {
    const headingId = "00000000-0000-4000-8000-0000000000h1";
    const outlineTaskId = "00000000-0000-4000-8000-0000000000h2";
    const outline: OutlineRoot = [
      {
        id: headingId,
        name: "Heading",
        children: [
          {
            id: outlineTaskId,
            name: "Under heading",
            start: "2026-01-05",
            end: "2026-01-10",
            assigneeIds: [],
            status: "not-started",
            progress: 0,
            confidence: "committed",
            predecessors: [],
            milestoneId: null,
            tags: [],
          },
        ],
      },
    ];
    expect(
      mcpTaskVisibility({
        taskId: outlineTaskId,
        categories: [],
        outline,
        collapsed: new Set([hierarchyCollapseKey(headingId)]),
        visibleRows: [taskRow(outlineTaskId, "Under heading", 0)],
        scrollY: 0,
        rowHeight: 32,
        bodyHeight: 200,
      }),
    ).toBe("collapsed");
  });

  it("marks scrolledOut when the row exists but is outside the viewport", () => {
    expect(
      mcpTaskVisibility({
        taskId,
        categories,
        outline: undefined,
        collapsed: new Set(),
        visibleRows: [taskRow(taskId, "Task", 500)],
        scrollY: 0,
        rowHeight: 32,
        bodyHeight: 200,
      }),
    ).toBe("scrolledOut");
  });

  it("omits visibility when the task has no visible row and is not collapsed", () => {
    expect(
      mcpTaskVisibility({
        taskId,
        categories,
        outline: undefined,
        collapsed: new Set(),
        visibleRows: [],
        scrollY: 0,
        rowHeight: 32,
        bodyHeight: 200,
      }),
    ).toBeNull();
  });
});

describe("buildMcpViewVisible", () => {
  it("combines dates and rows for the viewport", () => {
    const view = buildMcpViewVisible({
      timelineStart,
      totalDays: 30,
      scrollX: 0,
      pxPerDay: 10,
      chartWidth: 50,
      scrollY: 0,
      rowHeight: 32,
      bodyHeight: 64,
      visibleRows: [taskRow("t1", "One", 0), taskRow("t2", "Two", 32)],
    });
    expect(view.dates).toEqual({ start: "2026-01-01", end: "2026-01-05" });
    expect(view.rows).toHaveLength(2);
  });
});

describe("rowIntersectsViewport", () => {
  it("returns false when the viewport height is zero", () => {
    expect(rowIntersectsViewport(0, 32, 0, 0)).toBe(false);
  });
});

describe("taskHiddenByCollapsedAncestors", () => {
  it("detects a collapsed group", () => {
    const grpId = "00000000-0000-4000-8000-000000000020";
    const taskId = "00000000-0000-4000-8000-000000000030";
    expect(
      taskHiddenByCollapsedAncestors(
        taskId,
        [
          {
            id: "00000000-0000-4000-8000-000000000010",
            name: "Cat",
            groups: [
              {
                id: grpId,
                name: "Grp",
                tasks: [
                  {
                    id: taskId,
                    name: "T",
                    start: "2026-01-01",
                    end: "2026-01-02",
                    assigneeIds: [],
                    status: "not-started",
                    progress: 0,
                    confidence: "committed",
                    predecessors: [],
                    milestoneId: null,
                    tags: [],
                  },
                ],
              },
            ],
          },
        ],
        undefined,
        new Set([groupCollapseKey(grpId)]),
      ),
    ).toBe(true);
  });
});
