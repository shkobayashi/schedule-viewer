import { describe, expect, it } from "vitest";
import {
  barPixelsInDateColumns,
  buildExcelExportPayload,
  buildExcelTimeColumns,
  assertExcelLimits,
  EXCEL_DATE_COLUMN_WIDTH_MONTH_PX,
  EXCEL_DATE_COLUMN_WIDTH_PX,
  EXCEL_MAX_SHAPES,
  excelDateColumnWidthPx,
  type ScheduleExcelInput,
} from "./exportExcel";
import { DEFAULT_EXCEL_EXPORT_COLUMNS } from "./excelExportColumns";
import {
  EXCEL_SHEET_BORDER_RGB,
  EXCEL_SHEET_NON_WORKING_RGB,
} from "./excelSheetColors";
import type { ScheduleExportInput } from "./exportHtml";
import { assigneeExcelCellLabel, memberMapFromList } from "./assigneeDisplay";
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
      assigneeIds: [],
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
    milestoneGuideLineIds: new Set(),
  };
  return {
    ...exportBase,
    exportMilestones: [],
    milestoneGroups: [],
    taskNames: new Map([["t1", "設計"]]),
    exportedAtIso: "2026-01-07T12:00:00.000Z",
    excelColumns: DEFAULT_EXCEL_EXPORT_COLUMNS,
    fieldDefs: [],
    excelFieldColumns: {},
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
        assigneeIds: [],
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
      rollupPercent: 50,
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
      rollupPercent: null,
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

  it("uses light group and overdue name colors on a white sheet", () => {
    const lightPalette = paletteFor("light").css;
    const group: VisibleRow = {
      type: "group",
      y: 0,
      id: "g1",
      categoryId: "c1",
      category: "要件",
      label: "設計",
      collapsed: false,
      summary: null,
      rollupPercent: 30,
    };
    const overdueTask: VisibleRow = {
      type: "task",
      y: 28,
      task: {
        id: "t1",
        name: "遅れ",
        start: "2026-01-06",
        end: "2026-01-06",
        assigneeIds: [],
        status: "in-progress",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        milestoneId: null,
      },
    };
    const input = baseInput();
    input.today = "2026-01-10";
    input.visibleRows = [group, overdueTask];
    const dark = buildExcelExportPayload({ ...input, colorScheme: "dark" });
    expect(dark.rows[0]?.nameTextRgb).toBe(
      lightPalette.groupText.replace("#", ""),
    );
    expect(dark.overdueNameRgb).toBe(lightPalette.dangerText.replace("#", ""));
    expect(dark.rows[1]?.nameOverdue).toBe(true);
  });

  const summarySpan = {
    start: "2026-01-07",
    end: "2026-01-08",
    covered: [{ start: "2026-01-07", end: "2026-01-08" }],
  };

  it("keeps task indent 0 for task-only visible rows", () => {
    const payload = buildExcelExportPayload(baseInput());
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]?.nameIndent).toBe(0);
    expect(payload.rows[0]?.kind).toBe("task");
    expect(payload.summaryCaps).toHaveLength(0);
  });

  it("indents two-level hierarchy like top heading and task", () => {
    const heading: VisibleRow = {
      type: "hierarchy",
      id: "h0",
      label: "まとまり",
      y: 0,
      collapsed: false,
      summary: summarySpan,
      rollupPercent: 50,
      levelIndex: 0,
      depth: 0,
      rowKind: "top",
      ancestorIds: [],
      alsoTaskParent: true,
    };
    const input = baseInput();
    input.visibleRows = [heading, input.visibleRows[0]!];
    const payload = buildExcelExportPayload(input);
    expect(payload.rows[0]?.kind).toBe("category");
    expect(payload.rows[0]?.nameIndent).toBe(0);
    expect(payload.rows[1]?.nameIndent).toBe(1);
    expect(payload.summaryCaps.length).toBeGreaterThan(0);
  });

  it("indents five-level hierarchy through depth 4 on tasks", () => {
    const mkHeading = (
      levelIndex: number,
      depth: number,
      rowKind: "top" | "middle" | "taskParent",
      y: number,
      ancestorIds: string[],
    ): VisibleRow => ({
      type: "hierarchy",
      id: `h-${levelIndex}`,
      label: `L${levelIndex}`,
      y,
      collapsed: false,
      summary: summarySpan,
      rollupPercent: 10,
      levelIndex,
      depth,
      rowKind,
      ancestorIds,
    });
    const headings = [
      mkHeading(0, 0, "top", 0, []),
      mkHeading(1, 1, "middle", 28, ["h-0"]),
      mkHeading(2, 2, "middle", 56, ["h-0", "h-1"]),
      mkHeading(3, 3, "taskParent", 84, ["h-0", "h-1", "h-2"]),
    ];
    const input = baseInput();
    input.visibleRows[0]!.y = 112;
    input.visibleRows = [...headings, input.visibleRows[0]!];
    const payload = buildExcelExportPayload(input);
    expect(payload.rows.map((row) => row.nameIndent)).toEqual([0, 1, 2, 3, 4]);
    expect(payload.rows[0]?.kind).toBe("category");
    expect(payload.rows[3]?.kind).toBe("group");
    expect(payload.summaryCaps.length).toBeGreaterThan(2);
  });

  it("matches legacy category group task indents for three-level outline headings", () => {
    const top: VisibleRow = {
      type: "hierarchy",
      id: "h0",
      label: "工程",
      y: 0,
      collapsed: false,
      summary: summarySpan,
      rollupPercent: 40,
      levelIndex: 0,
      depth: 0,
      rowKind: "top",
      ancestorIds: [],
    };
    const parent: VisibleRow = {
      type: "hierarchy",
      id: "h1",
      label: "機能",
      y: 28,
      collapsed: false,
      summary: summarySpan,
      rollupPercent: 30,
      levelIndex: 1,
      depth: 1,
      rowKind: "taskParent",
      ancestorIds: ["h0"],
    };
    const input = baseInput();
    input.visibleRows[0]!.y = 56;
    input.visibleRows = [top, parent, input.visibleRows[0]!];
    const payload = buildExcelExportPayload(input);
    expect(payload.rows.map((row) => row.nameIndent)).toEqual([0, 1, 2]);
    expect(payload.rows[0]?.kind).toBe("category");
    expect(payload.rows[1]?.kind).toBe("group");
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

  it("leaves field columns off by default", () => {
    const input = baseInput();
    input.fieldDefs = [
      { key: "score", name: "点数", type: "number" },
      { key: "memo", name: "メモ", type: "text" },
    ];
    input.excelFieldColumns = { score: false, memo: false };
    const taskRow = input.visibleRows[0];
    if (taskRow.type === "task") {
      taskRow.task.fieldValues = { score: 10, memo: "hi" };
    }
    const payload = buildExcelExportPayload(input);
    expect(payload.leftHeaders).toEqual(["名前", "開始", "終了", "ノート"]);
    expect(payload.rows[0]?.cells).toEqual(["設計", "01/07", "01/08", ""]);
  });

  it("formats enabled field columns before note", () => {
    const input = baseInput();
    input.fieldDefs = [
      { key: "score", name: "点数", type: "number" },
      { key: "ratio", name: "消化率", type: "number", percent: true },
      { key: "due", name: "確認日", type: "date" },
      { key: "lane", name: "区分", type: "choice", choices: ["内製"] },
      { key: "memo", name: "メモ", type: "text" },
    ];
    input.excelFieldColumns = {
      score: true,
      ratio: true,
      due: true,
      lane: true,
      memo: true,
    };
    const taskRow = input.visibleRows[0];
    if (taskRow.type === "task") {
      taskRow.task.fieldValues = {
        score: 3,
        ratio: 30,
        due: "2026-03-01",
        lane: "内製",
        memo: "本文",
      };
    }
    const payload = buildExcelExportPayload(input);
    expect(payload.leftHeaders).toEqual([
      "名前",
      "開始",
      "終了",
      "点数",
      "消化率",
      "確認日",
      "区分",
      "メモ",
      "ノート",
    ]);
    expect(payload.rows[0]?.cells).toEqual([
      "設計",
      "01/07",
      "01/08",
      "3",
      "30%",
      "2026-03-01",
      "内製",
      "本文",
      "",
    ]);
  });

  it("puts full assignee text in one column for tasks and leaves headings empty", () => {
    const members = [
      { id: "sato", name: "佐藤" },
      { id: "tanaka", name: "田中" },
    ];
    const catalog = memberMapFromList(members);
    const excelColumns = {
      ...DEFAULT_EXCEL_EXPORT_COLUMNS,
      assignee: true,
    };
    const category: VisibleRow = {
      type: "category",
      y: 0,
      id: "c1",
      label: "要件定義",
      collapsed: false,
      summary: summarySpan,
      rollupPercent: 50,
    };
    const heading: VisibleRow = {
      type: "hierarchy",
      id: "h0",
      label: "まとまり",
      y: 0,
      collapsed: false,
      summary: summarySpan,
      rollupPercent: 50,
      levelIndex: 0,
      depth: 0,
      rowKind: "top",
      ancestorIds: [],
      alsoTaskParent: true,
    };
    const inputMulti = baseInput();
    inputMulti.excelColumns = excelColumns;
    inputMulti.memberCatalog = catalog;
    const taskRow = inputMulti.visibleRows[0]!;
    if (taskRow.type === "task") {
      taskRow.task.assigneeIds = ["sato", "tanaka"];
    }
    inputMulti.visibleRows = [category, heading, taskRow];
    const payloadMulti = buildExcelExportPayload(inputMulti);
    expect(payloadMulti.leftHeaders.filter((h) => h === "担当")).toEqual([
      "担当",
    ]);
    const assigneeIndex = payloadMulti.leftHeaders.indexOf("担当");
    expect(assigneeIndex).toBe(1);
    expect(payloadMulti.rows[0]?.kind).toBe("category");
    expect(payloadMulti.rows[0]?.cells[assigneeIndex]).toBe("");
    expect(payloadMulti.rows[1]?.cells[assigneeIndex]).toBe("");
    const taskCells = payloadMulti.rows[2]?.cells;
    expect(taskCells?.[assigneeIndex]).toBe(
      assigneeExcelCellLabel(["sato", "tanaka"], catalog),
    );

    const inputOne = baseInput();
    inputOne.excelColumns = excelColumns;
    inputOne.memberCatalog = catalog;
    const oneTask = inputOne.visibleRows[0]!;
    if (oneTask.type === "task") {
      oneTask.task.assigneeIds = ["sato"];
    }
    const payloadOne = buildExcelExportPayload(inputOne);
    expect(payloadMulti.rows.length).toBe(payloadOne.rows.length + 2);
    expect(payloadMulti.shapes.length).toBeGreaterThan(payloadOne.shapes.length);

    const inputMultiTaskOnly = baseInput();
    inputMultiTaskOnly.excelColumns = excelColumns;
    inputMultiTaskOnly.memberCatalog = catalog;
    const multiTask = inputMultiTaskOnly.visibleRows[0]!;
    if (multiTask.type === "task") {
      multiTask.task.assigneeIds = ["sato", "tanaka"];
    }
    const payloadMultiTaskOnly = buildExcelExportPayload(inputMultiTaskOnly);
    expect(payloadMultiTaskOnly.rows.length).toBe(payloadOne.rows.length);
    expect(payloadMultiTaskOnly.shapes.length).toBe(payloadOne.shapes.length);
  });

  it("does not add assignee cells on milestone rows when the column is on", () => {
    const input = baseInput();
    input.excelColumns = {
      ...DEFAULT_EXCEL_EXPORT_COLUMNS,
      assignee: true,
    };
    input.memberCatalog = memberMapFromList([{ id: "sato", name: "佐藤" }]);
    const taskRow = input.visibleRows[0]!;
    if (taskRow.type === "task") {
      taskRow.task.assigneeIds = ["sato"];
    }
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
    const assigneeIndex = payload.leftHeaders.indexOf("担当");
    expect(payload.rows[0]?.cells[assigneeIndex]).toBe("佐藤");
    expect(
      payload.milestoneMarks.every((mark) => !mark.character.includes("佐藤")),
    ).toBe(true);
  });

  it("includes row fill rgb for colored tasks", () => {
    const input = baseInput();
    const row = input.visibleRows[0];
    if (row?.type !== "task") throw new Error("expected task row");
    input.visibleRows = [
      {
        ...row,
        task: { ...row.task, colorId: "focus" },
      },
    ];
    input.colors = [
      {
        id: "focus",
        name: "注力",
        description: "x",
        color: {
          light: { bg: "#FEF3C7" },
          dark: { bg: "#78350F" },
        },
      },
    ];
    const payload = buildExcelExportPayload(input);
    expect(payload.rows[0]?.rowFillRgb).toBe("FEF3C7");
    const darkPayload = buildExcelExportPayload({
      ...input,
      colorScheme: "dark",
    });
    expect(darkPayload.rows[0]?.rowFillRgb).toBe("FEF3C7");
  });

  it("puts connection curves into the payload", () => {
    const task2: VisibleRow = {
      type: "task",
      y: 28,
      task: {
        id: "t2",
        name: "実装",
        start: "2026-01-08",
        end: "2026-01-09",
        assigneeIds: [],
        status: "in-progress",
        progress: 0,
        confidence: "committed",
        predecessors: [],
        milestoneId: null,
      },
    };
    const input = baseInput();
    input.visibleRows = [input.visibleRows[0]!, task2];
    input.connections = [
      { taskIds: ["t1", "t2"], label: "関係" },
    ];
    const payload = buildExcelExportPayload(input);
    expect(payload.connectionCurves).toEqual([
      {
        fromShapeIndex: 0,
        toShapeIndex: 1,
        strokeRgb: "0369A1",
        label: "関係",
        labelTextRgb: "075985",
      },
    ]);
  });

  it("leaves dependency connectors unchanged when a connection is present", () => {
    const task2: VisibleRow = {
      type: "task",
      y: 28,
      task: {
        id: "t2",
        name: "実装",
        start: "2026-01-08",
        end: "2026-01-09",
        assigneeIds: [],
        status: "in-progress",
        progress: 0,
        confidence: "committed",
        predecessors: ["t1"],
        milestoneId: null,
      },
    };
    const input = baseInput();
    input.visibleRows = [input.visibleRows[0]!, task2];
    input.links = [{ fromId: "t1", toId: "t2", broken: false }];
    input.connections = [
      { taskIds: ["t1", "t2"], label: "関係" },
    ];
    input.colorScheme = "dark";
    const payload = buildExcelExportPayload(input);
    expect(payload.connectors).toHaveLength(1);
    expect(payload.connectors[0]?.straight).toBe(false);
    expect(payload.connectors[0]?.strokeRgb).toBe(
      paletteFor("dark").chart.linkOk.replace("#", ""),
    );
    expect(payload.connectionCurves).toHaveLength(1);
  });

  it("counts connection labels toward the drawing limit", () => {
    const payload = buildExcelExportPayload(baseInput());
    const drawingCount =
      payload.shapes.length +
      payload.connectors.length +
      payload.connectionCurves.length * 2 +
      (payload.todayLine ? 1 : 0) +
      payload.summaryGapLines.length +
      payload.summaryCaps.length;
    const extraCurves = Math.floor((EXCEL_MAX_SHAPES - drawingCount + 1) / 2);
    expect(() =>
      assertExcelLimits({
        ...payload,
        connectionCurves: Array.from({ length: extraCurves }, () => ({
          fromShapeIndex: 0,
          toShapeIndex: 0,
          strokeRgb: "0369A1",
          label: "関係",
          labelTextRgb: "075985",
        })),
      }),
    ).toThrow(/図形の数が上限/);
  });
});
