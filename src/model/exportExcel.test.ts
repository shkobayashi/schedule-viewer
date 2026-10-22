import { describe, expect, it } from "vitest";
import {
  barPixelsInDateColumns,
  buildExcelExportPayload,
  buildExcelTimeColumns,
  EXCEL_LEFT_COLUMNS,
  type ScheduleExcelInput,
} from "./exportExcel";
import type { ScheduleExportInput } from "./exportHtml";
import { parseDate } from "./dates";
import type { VisibleRow } from "./types";

function baseInput(): ScheduleExcelInput {
  const timelineStart = parseDate("2026-01-06");
  const timelineEnd = parseDate("2026-01-10");
  const taskRow: VisibleRow = {
    type: "task",
    y: 0,
    task: {
      id: "t1",
      name: "設計",
      start: "2026-01-07",
      end: "2026-01-08",
      assigneeId: null,
      status: "in-progress",
      progress: 30,
      confidence: "committed",
      predecessors: [],
      milestoneId: null,
    },
  };
  const exportBase: ScheduleExportInput = {
    title: "Sample",
    tierLabel: "日表示",
    lineageName: null,
    visibleRows: [taskRow],
    milestones: [],
    milestoneBandLayout: {
      blocks: [],
      totalHeight: 0,
      centerYById: new Map(),
      displayLabels: new Map(),
    },
    links: [],
    timelineStart,
    timelineEnd,
    totalDays: 4,
    pxPerDay: 40,
    tier: "day",
    headerHeight: 40,
    rowHeight: 28,
    barHeight: 16,
    milestoneBandHeight: 0,
    milestoneLaneHeight: 20,
    milestoneDiamondSize: 10,
    milestoneFontSize: 11,
    labelScale: 1,
    today: "2026-01-07",
    memberCatalog: null,
    calendar: null,
    filterSummary: "",
    colorScheme: "light",
    showLightningLine: false,
  };
  return {
    ...exportBase,
    exportMilestones: [],
    milestoneGroups: [],
    taskNames: new Map([["t1", "設計"]]),
    exportedAtIso: "2026-01-07T12:00:00.000Z",
  };
}

describe("exportExcel", () => {
  it("builds day columns for each day in the span", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-01-06"),
      parseDate("2026-01-09"),
      "day",
      null,
    );
    expect(columns).toHaveLength(3);
    expect(columns[0]?.headerLabel).toBe("1/6");
  });

  it("spans a task bar across start and end day columns in day view", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-01-06"),
      parseDate("2026-01-10"),
      "day",
      null,
    );
    const bar = barPixelsInDateColumns(
      "2026-01-07",
      "2026-01-09",
      columns,
      "day",
    );
    expect(bar.anchorColIndex).toBe(1);
    expect(bar.widthPx).toBe(96);
  });

  it("puts visible task rows and shapes into the payload", () => {
    const payload = buildExcelExportPayload(baseInput());
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]?.cells[0]).toBe("設計");
    expect(payload.shapes).toHaveLength(1);
    expect(payload.shapes[0]?.anchorCol).toBe(EXCEL_LEFT_COLUMNS + 1);
    expect(payload.preamble).toContain("見えている行だけ");
  });
});
