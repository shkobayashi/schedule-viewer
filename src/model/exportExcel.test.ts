import { describe, expect, it } from "vitest";
import {
  barPixelsInDateColumns,
  buildExcelExportPayload,
  buildExcelTimeColumns,
  EXCEL_DATE_COLUMN_WIDTH_MONTH_PX,
  EXCEL_DATE_COLUMN_WIDTH_PX,
  excelDateColumnWidthPx,
  type ScheduleExcelInput,
} from "./exportExcel";
import { DEFAULT_EXCEL_EXPORT_COLUMNS } from "./excelExportColumns";
import {
  EXCEL_SHEET_BORDER_RGB,
  EXCEL_SHEET_NON_WORKING_RGB,
} from "./excelSheetColors";
import type { ScheduleExportInput } from "./exportHtml";
import { parseDate } from "./dates";
import { paletteFor } from "./palette";
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
    excelColumns: DEFAULT_EXCEL_EXPORT_COLUMNS,
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
      EXCEL_DATE_COLUMN_WIDTH_PX,
    );
    expect(bar.anchorColIndex).toBe(1);
    expect(bar.widthPx).toBe(2 * EXCEL_DATE_COLUMN_WIDTH_PX);
  });

  it("puts visible task rows and shapes into the payload", () => {
    const payload = buildExcelExportPayload(baseInput());
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]?.cells[0]).toBe("設計");
    expect(payload.shapes).toHaveLength(1);
    expect(payload.freezeCol).toBe(4);
    expect(payload.shapes[0]?.anchorCol).toBe(5);
    expect(payload.preamble).toContain("見えている行だけ");
    expect(payload.dateColumnWidthPx).toBe(EXCEL_DATE_COLUMN_WIDTH_PX);
    expect(payload.bodyRowHeightPx).toBe(22);
    expect(payload.headerRowHeightPx).toBe(22);
  });

  it("uses 28px header and 22px body rows for month export columns", () => {
    const input = baseInput();
    input.tier = "month";
    input.timelineStart = parseDate("2026-09-01");
    input.timelineEnd = parseDate("2026-11-01");
    const payload = buildExcelExportPayload(input);
    expect(payload.dateColumnWidthPx).toBe(EXCEL_DATE_COLUMN_WIDTH_MONTH_PX);
    expect(payload.headerRowHeightPx).toBe(28);
    expect(payload.bodyRowHeightPx).toBe(22);
  });

  it("offsets bars within equal-width month columns", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-09-01"),
      parseDate("2026-11-01"),
      "month",
      null,
    );
    const width = EXCEL_DATE_COLUMN_WIDTH_MONTH_PX;
    const bar = barPixelsInDateColumns(
      "2026-09-15",
      "2026-10-01",
      columns,
      "month",
      width,
    );
    expect(bar.anchorColIndex).toBe(0);
    expect(bar.xOffsetPx).toBeGreaterThan(0);
    expect(bar.xOffsetPx).toBeLessThan(width);
  });

  it("puts dependency connectors and today line into the payload", () => {
    const task2: VisibleRow = {
      type: "task",
      y: 28,
      task: {
        id: "t2",
        name: "実装",
        start: "2026-01-09",
        end: "2026-01-09",
        assigneeId: null,
        status: "not-started",
        progress: 0,
        confidence: "committed",
        predecessors: ["t1"],
        milestoneId: null,
      },
    };
    const input = baseInput();
    input.visibleRows = [input.visibleRows[0]!, task2];
    input.links = [{ fromId: "t1", toId: "t2", broken: false }];
    input.showLightningLine = true;
    const payload = buildExcelExportPayload(input);
    expect(payload.shapes).toHaveLength(2);
    expect(payload.connectors).toHaveLength(1);
    expect(payload.connectors[0]?.fromShapeIndex).toBe(0);
    expect(payload.connectors[0]?.toShapeIndex).toBe(1);
    expect(payload.connectors[0]?.straight).toBe(false);
    expect(payload.shapes.some((s) => s.text === "▶")).toBe(false);
    expect(payload.todayLine).not.toBeNull();
    expect(payload.todayLine?.strokeRgb).toMatch(/^[0-9A-Fa-f]{6}$/);
  });

  it("assigns name indent and summary decorations by row kind", () => {
    const category: VisibleRow = {
      type: "category",
      y: 0,
      id: "c1",
      label: "要件定義",
      collapsed: false,
      summary: {
        start: "2026-01-07",
        end: "2026-01-08",
        covered: [{ start: "2026-01-07", end: "2026-01-08" }],
      },
    };
    const group: VisibleRow = {
      type: "group",
      y: 28,
      id: "g1",
      categoryId: "c1",
      category: "要件定義",
      label: "設計",
      collapsed: false,
      summary: null,
    };
    const input = baseInput();
    input.visibleRows = [category, group, input.visibleRows[0]!];
    const payload = buildExcelExportPayload(input);
    expect(payload.rows[0]?.nameIndent).toBe(0);
    expect(payload.rows[0]?.nameBold).toBe(true);
    expect(payload.rows[1]?.nameIndent).toBe(1);
    expect(payload.rows[2]?.nameIndent).toBe(2);
    expect(payload.rows[2]?.nameBold).toBe(false);
    expect(payload.summaryCaps.length).toBe(2);
    expect(payload.dateColumns[0]?.leftBorderRgb).toBe(EXCEL_SHEET_BORDER_RGB);
    expect(payload.nonWorkingFillRgb).toBe(EXCEL_SHEET_NON_WORKING_RGB);
    expect(payload.tableBorderRgb).toBe(EXCEL_SHEET_BORDER_RGB);
  });

  it("uses black task names and group-row gray for holidays", () => {
    const groupRow = paletteFor("light").chart.groupRow.replace("#", "");
    const light = buildExcelExportPayload(baseInput());
    const dark = buildExcelExportPayload({
      ...baseInput(),
      colorScheme: "dark",
    });
    expect(groupRow).toBe("F3F5F8");
    expect(light.rows[0]?.nameTextRgb).toBe("000000");
    expect(dark.rows[0]?.nameTextRgb).toBe("000000");
    expect(light.nonWorkingFillRgb).toBe(groupRow);
    expect(dark.nonWorkingFillRgb).toBe(groupRow);
    expect(light.headerGrayRgb).toBe(groupRow);
    expect(dark.headerGrayRgb).toBe(groupRow);
  });

  it("uses milestone group name on milestone rows", () => {
    const input = baseInput();
    input.tier = "month";
    input.timelineStart = parseDate("2026-09-01");
    input.timelineEnd = parseDate("2026-11-01");
    input.milestoneGroups = [{ id: "mg1", name: "リリース" }];
    input.exportMilestones = [
      {
        id: "m1",
        name: "α版",
        date: "2026-10-01",
        confidence: "committed",
        groupId: "mg1",
      },
      {
        id: "m2",
        name: "本番",
        date: "2026-10-15",
        confidence: "committed",
        groupId: "mg1",
      },
    ];
    input.milestoneBandLayout = {
      blocks: [
        {
          group: { id: "mg1", name: "リリース" },
          offsetY: 0,
          height: 20,
          milestones: input.exportMilestones,
          lanes: new Map(),
          displayLabels: new Map(),
          centerYById: new Map(),
        },
      ],
      totalHeight: 20,
      centerYById: new Map(),
      displayLabels: new Map(),
    };
    const payload = buildExcelExportPayload(input);
    expect(payload.milestoneRows).toHaveLength(1);
    expect(payload.milestoneRows[0]?.name).toBe("リリース");
    expect(payload.dateColumnWidthPx).toBe(
      excelDateColumnWidthPx("month"),
    );
  });
});
