import { invoke, isTauri } from "@tauri-apps/api/core";
import { fmtMonthDay, isoDate } from "./dates";
import { assigneeExcelCellLabel } from "./assigneeDisplay";
import {
  EXPORT_MAX_ROWS,
  exportHierarchyHeadingIndent,
  exportHierarchyHeadingKind,
  ScheduleExportTooLargeError,
  type ScheduleExportInput,
} from "./exportHtml";
import { scheduleXlsxFilename } from "./exportFilename";
import { isOverdue, taskBarExclusiveEnd } from "./timeline";
import { BUILTIN_STATUS_ITEMS, statusLabel, type StatusItem } from "./statusCatalog";
import { excelRowFillForColorId } from "./colorCatalog";
import type { Milestone, MilestoneGroup, ScheduleId, Task } from "./types";
import type { GridTier } from "./timeline";
import { paletteFor } from "./palette";
import { normalizeTaskNote } from "./taskNote";
import {
  EXCEL_EXPORT_COLUMN_ORDER,
  excelLeftHeaders,
  excelNoteColumnIndex,
  excelTodosColumnIndex,
  type ExcelExportColumnsPreference,
  type ExcelExportFieldColumnsPreference,
  type ExcelLeftColumnLayoutInput,
} from "./excelExportColumns";
import { formatFieldValueForExcel } from "./taskFields";
import type { ScheduleFieldDef } from "./types";
import { formatTaskTodosForExcel } from "./taskTodos";
import {
  EXCEL_DEFAULT_BODY_ROW_HEIGHT_PX,
  excelHeaderRowHeightPx,
} from "./excelLayout";
import {
  barPixelsInDateColumns,
  dateAreaLeftPx,
  dateAreaRightPx,
  excelBarShapePlacement,
  excelTaskBarFillStyle,
} from "./excelBar";
import {
  excelDateColumnsWithBorders,
  type ExcelTimeColumnWithBorder,
} from "./excelDateColumnBorder";
import {
  EXCEL_SHEET_BORDER_RGB,
  EXCEL_SHEET_NON_WORKING_RGB,
  EXCEL_TASK_NAME_RGB,
} from "./excelSheetColors";
import {
  excelSummaryBarDecorations,
  type ExcelExportSummaryCap,
  type ExcelExportSummaryGapLine,
} from "./excelSummaryBar";
import { excelConnectorDescriptor } from "./excelConnector";
import { excelTodayLineDescriptor } from "./excelLightning";
import { excelMilestoneExport } from "./excelMilestone";
import {
  buildExcelTimeColumns,
  type ExcelTimeColumn,
} from "./excelTimeColumns";

export const EXCEL_DATE_COLUMN_WIDTH_PX = 48;
export const EXCEL_DATE_COLUMN_WIDTH_MONTH_PX = 96;
export const EXCEL_ROW_HEIGHT_PX = EXCEL_DEFAULT_BODY_ROW_HEIGHT_PX;
export { EXCEL_BAR_HEIGHT_PX } from "./excelBar";
export { barPixelsInDateColumns } from "./excelBar";
export { buildExcelTimeColumns } from "./excelTimeColumns";
export type { ExcelTimeColumn } from "./excelTimeColumns";
export const EXCEL_MAX_DATE_COLUMNS = 2_000;
export const EXCEL_MAX_SHAPES = 5_000;
export const EXCEL_MAX_BYTES = 10 * 1024 * 1024;

export type ExcelExportShape = {
  row: number;
  anchorCol: number;
  xOffsetPx: number;
  yOffsetPx: number;
  widthPx: number;
  heightPx: number;
  fillRgb: string;
  pattern: "solid" | "tentative";
  patternForeRgb: string | null;
  fillTransparency?: number;
  text?: string;
  textRgb?: string;
};

export type ExcelExportRow = {
  kind: "category" | "group" | "task";
  cells: string[];
  nameOverdue: boolean;
  nameIndent: number;
  nameBold: boolean;
  nameTextRgb: string;
  rowFillRgb?: string;
};

export type ExcelMilestoneRow = {
  name: string;
  marks: { colIndex: number }[];
};

export type ExcelExportConnector = {
  fromShapeIndex: number;
  toShapeIndex: number;
  strokeRgb: string;
  broken: boolean;
  straight: boolean;
  bentAdj1: number;
};

export type ExcelExportTodayLine = {
  row: number;
  anchorCol: number;
  xOffsetPx: number;
  heightPx: number;
  strokeRgb: string;
};

export type ExcelExportPayload = {
  sheetTitle: string;
  preamble: string;
  freezeRow: number;
  freezeCol: number;
  leftHeaders: string[];
  dateColumns: ExcelTimeColumnWithBorder[];
  milestoneRows: ExcelMilestoneRow[];
  rows: ExcelExportRow[];
  shapes: ExcelExportShape[];
  connectors: ExcelExportConnector[];
  todayLine: ExcelExportTodayLine | null;
  milestoneMarks: { row: number; colIndex: number; character: string }[];
  headerGrayRgb: string;
  nonWorkingFillRgb: string;
  categoryHeadingFillRgb: string;
  tableBorderRgb: string;
  summaryGapLines: ExcelExportSummaryGapLine[];
  summaryCaps: ExcelExportSummaryCap[];
  overdueNameRgb: string;
  grayHeaderOnly: boolean;
  noteWrapColumnIndex: number | null;
  todosWrapColumnIndex: number | null;
  dateColumnWidthPx: number;
  bodyRowHeightPx: number;
  headerRowHeightPx: number;
};

export type ScheduleExcelInput = ScheduleExportInput & {
  exportMilestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  taskNames: ReadonlyMap<ScheduleId, string>;
  exportedAtIso: string;
  excelColumns: ExcelExportColumnsPreference;
  fieldDefs: readonly ScheduleFieldDef[];
  excelFieldColumns: ExcelExportFieldColumnsPreference;
};

export function excelDateColumnWidthPx(tier: GridTier): number {
  return tier === "month"
    ? EXCEL_DATE_COLUMN_WIDTH_MONTH_PX
    : EXCEL_DATE_COLUMN_WIDTH_PX;
}

function formatPredecessors(
  task: Task,
  taskNames: ReadonlyMap<ScheduleId, string>,
): string {
  if (task.predecessors.length === 0) return "";
  return task.predecessors
    .map((id) => taskNames.get(id) ?? id)
    .join("、");
}

function excelLeftLayout(input: ScheduleExcelInput): ExcelLeftColumnLayoutInput {
  return {
    excelColumns: input.excelColumns,
    fieldDefs: input.fieldDefs,
    excelFieldColumns: input.excelFieldColumns,
  };
}

function emptyCellsForColumns(layout: ExcelLeftColumnLayoutInput): string[] {
  const count = excelLeftHeaders(layout).length - 1;
  return Array.from({ length: count }, () => "");
}

function taskCellsForColumns(
  task: Task,
  layout: ExcelLeftColumnLayoutInput,
  taskNames: ReadonlyMap<ScheduleId, string>,
  memberCatalog: ScheduleExportInput["memberCatalog"],
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
): string[] {
  const assignee = assigneeExcelCellLabel(task.assigneeIds, memberCatalog);
  const cells: string[] = [];
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (id === "note") continue;
    if (!layout.excelColumns[id]) continue;
    switch (id) {
      case "assignee":
        cells.push(assignee);
        break;
      case "start":
        cells.push(fmtMonthDay(task.start));
        break;
      case "end":
        cells.push(fmtMonthDay(task.end));
        break;
      case "status":
        cells.push(statusLabel(statuses, task.status));
        break;
      case "predecessors":
        cells.push(formatPredecessors(task, taskNames));
        break;
      case "progress":
        cells.push(`${task.progress}%`);
        break;
      case "todos":
        cells.push(formatTaskTodosForExcel(task));
        break;
      default:
        break;
    }
  }
  for (const def of layout.fieldDefs) {
    if (!layout.excelFieldColumns[def.key]) continue;
    cells.push(formatFieldValueForExcel(def, task.fieldValues?.[def.key]));
  }
  if (layout.excelColumns.note) {
    cells.push(normalizeTaskNote(task.note) ?? "");
  }
  return cells;
}

function scopeSentence(input: ScheduleExcelInput): string {
  const exportedAt = input.exportedAtIso.replace("T", " ").slice(0, 19);
  return `絞り込み・折りたたみで見えている行だけを書き出しています。書き出し: ${exportedAt}`;
}

function assertExcelLimits(payload: ExcelExportPayload): void {
  const dataRows =
    payload.rows.length + payload.milestoneRows.length + 1;
  if (dataRows > EXPORT_MAX_ROWS) {
    throw new ScheduleExportTooLargeError(
      `書き出し対象の行数が上限（${EXPORT_MAX_ROWS} 行）を超えています。絞り込みや折りたたみで行数を減らしてください。`,
    );
  }
  if (payload.dateColumns.length > EXCEL_MAX_DATE_COLUMNS) {
    throw new ScheduleExportTooLargeError(
      `日付の列数が上限（${EXCEL_MAX_DATE_COLUMNS} 列）を超えています。表示期間を短くするか、ズームを広げてください。`,
    );
  }
  const drawingCount =
    payload.shapes.length +
    payload.connectors.length +
    (payload.todayLine ? 1 : 0) +
    payload.summaryGapLines.length +
    payload.summaryCaps.length;
  if (drawingCount > EXCEL_MAX_SHAPES) {
    throw new ScheduleExportTooLargeError(
      `図形の数が上限（${EXCEL_MAX_SHAPES} 個）を超えています。絞り込みや折りたたみで行数を減らしてください。`,
    );
  }
}

function shapeForSpan(
  row: number,
  startIso: string,
  endExclusiveIso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  fill: ReturnType<typeof excelTaskBarFillStyle>,
  leftColCount: number,
  dateColumnWidthPx: number,
  bodyRowHeightPx: number,
): ExcelExportShape {
  const bar = barPixelsInDateColumns(
    startIso,
    endExclusiveIso,
    columns,
    tier,
    dateColumnWidthPx,
  );
  const placement = excelBarShapePlacement(
    bar,
    leftColCount,
    bodyRowHeightPx,
  );
  return {
    row,
    anchorCol: placement.anchorCol,
    xOffsetPx: placement.xOffsetPx,
    yOffsetPx: placement.yOffsetPx,
    widthPx: placement.widthPx,
    heightPx: placement.heightPx,
    fillRgb: fill.fillRgb,
    pattern: fill.pattern,
    patternForeRgb: fill.patternForeRgb,
  };
}

export function buildExcelExportPayload(
  input: ScheduleExcelInput,
): ExcelExportPayload {
  const { chart } = paletteFor(input.colorScheme);
  const { css: lightCss } = paletteFor("light");
  const excelGroupNameRgb = lightCss.groupText.replace("#", "");
  const excelOverdueNameRgb = lightCss.dangerText.replace("#", "");
  const leftLayout = excelLeftLayout(input);
  const leftHeaders = excelLeftHeaders(leftLayout);
  const leftColCount = leftHeaders.length;
  const noteWrapColumnIndex = excelNoteColumnIndex(leftLayout);
  const todosWrapColumnIndex = excelTodosColumnIndex(leftLayout);
  const columns = excelDateColumnsWithBorders(
    buildExcelTimeColumns(
      input.timelineStart,
      input.timelineEnd,
      input.tier,
      input.calendar,
    ),
    input.tier,
    chart,
  );
  const dateColumnWidthPx = excelDateColumnWidthPx(input.tier);
  const bodyRowHeightPx = EXCEL_DEFAULT_BODY_ROW_HEIGHT_PX;
  const headerRowHeightPx = excelHeaderRowHeightPx(dateColumnWidthPx);
  const rows: ExcelExportRow[] = [];
  const shapes: ExcelExportShape[] = [];
  const summaryGapLines: ExcelExportSummaryGapLine[] = [];
  const summaryCaps: ExcelExportSummaryCap[] = [];
  const connectors: ExcelExportConnector[] = [];
  const taskShapeIndexById = new Map<ScheduleId, number>();
  const visibleGroupIds = new Set(
    input.milestoneBandLayout.blocks.map((block) => block.group.id),
  );
  const { milestoneRows, milestoneMarks } = excelMilestoneExport(
    input.milestoneGroups,
    input.exportMilestones,
    visibleGroupIds,
    columns,
  );

  const headerRowIndex = 1 + milestoneRows.length;
  const bodyStartRow = headerRowIndex + 1;

  const taskRowById = new Map<ScheduleId, number>();
  const taskById = new Map<ScheduleId, Task>();

  let bodyRow = bodyStartRow;
  let taskNameIndent = 0;
  for (const visible of input.visibleRows) {
    if (visible.type === "category") {
      taskNameIndent = 1;
      rows.push({
        kind: "category",
        cells: [visible.label, ...emptyCellsForColumns(leftLayout)],
        nameOverdue: false,
        nameIndent: 0,
        nameBold: true,
        nameTextRgb: chart.textPrimary.replace("#", ""),
      });
      if (visible.summary) {
        const deco = excelSummaryBarDecorations(
          bodyRow,
          visible.summary,
          columns,
          input.tier,
          chart,
          leftColCount,
          dateColumnWidthPx,
          bodyRowHeightPx,
        );
        shapes.push(...deco.shapes);
        summaryGapLines.push(...deco.gapLines);
        summaryCaps.push(...deco.caps);
      }
      bodyRow += 1;
      continue;
    }
    if (visible.type === "group") {
      taskNameIndent = 2;
      rows.push({
        kind: "group",
        cells: [visible.label, ...emptyCellsForColumns(leftLayout)],
        nameOverdue: false,
        nameIndent: 1,
        nameBold: true,
        nameTextRgb: excelGroupNameRgb,
      });
      if (visible.summary) {
        const deco = excelSummaryBarDecorations(
          bodyRow,
          visible.summary,
          columns,
          input.tier,
          chart,
          leftColCount,
          dateColumnWidthPx,
          bodyRowHeightPx,
        );
        shapes.push(...deco.shapes);
        summaryGapLines.push(...deco.gapLines);
        summaryCaps.push(...deco.caps);
      }
      bodyRow += 1;
      continue;
    }
    if (visible.type === "hierarchy") {
      const indent = exportHierarchyHeadingIndent(visible);
      const kind = exportHierarchyHeadingKind(visible);
      taskNameIndent = indent + 1;
      rows.push({
        kind,
        cells: [visible.label, ...emptyCellsForColumns(leftLayout)],
        nameOverdue: false,
        nameIndent: indent,
        nameBold: true,
        nameTextRgb:
          kind === "category"
            ? chart.textPrimary.replace("#", "")
            : excelGroupNameRgb,
      });
      if (visible.summary) {
        const deco = excelSummaryBarDecorations(
          bodyRow,
          visible.summary,
          columns,
          input.tier,
          chart,
          leftColCount,
          dateColumnWidthPx,
          bodyRowHeightPx,
        );
        shapes.push(...deco.shapes);
        summaryGapLines.push(...deco.gapLines);
        summaryCaps.push(...deco.caps);
      }
      bodyRow += 1;
      continue;
    }
    if (visible.type !== "task") continue;
    const task = visible.task;
    taskRowById.set(task.id, bodyRow);
    taskById.set(task.id, task);
    const overdue = isOverdue(task, input.today, input.statuses);
    const rowFill = excelRowFillForColorId(
      input.colors ?? null,
      task.colorId,
    );
    rows.push({
      kind: "task",
      cells: [
        task.name,
        ...taskCellsForColumns(
          task,
          leftLayout,
          input.taskNames,
          input.memberCatalog,
          input.statuses,
        ),
      ],
      nameOverdue: overdue,
      nameIndent: taskNameIndent,
      nameBold: false,
      nameTextRgb: EXCEL_TASK_NAME_RGB,
      ...(rowFill != null
        ? { rowFillRgb: rowFill.replace("#", "") }
        : {}),
    });
    taskShapeIndexById.set(task.id, shapes.length);
    shapes.push(
      shapeForSpan(
        bodyRow,
        task.start,
        isoDate(taskBarExclusiveEnd(task)),
        columns,
        input.tier,
        excelTaskBarFillStyle(task, input.today, input.colorScheme, input.statuses),
        leftColCount,
        dateColumnWidthPx,
        bodyRowHeightPx,
      ),
    );
    bodyRow += 1;
  }

  for (const link of input.links) {
    const fromRow = taskRowById.get(link.fromId);
    const toRow = taskRowById.get(link.toId);
    const fromTask = taskById.get(link.fromId);
    const toTask = taskById.get(link.toId);
    if (
      fromRow == null ||
      toRow == null ||
      fromTask == null ||
      toTask == null
    ) {
      continue;
    }
    const fromRight = dateAreaRightPx(
      fromTask.start,
      isoDate(taskBarExclusiveEnd(fromTask)),
      columns,
      input.tier,
      dateColumnWidthPx,
    );
    const toLeft = dateAreaLeftPx(
      toTask.start,
      columns,
      input.tier,
      dateColumnWidthPx,
    );
    const fromShapeIndex = taskShapeIndexById.get(link.fromId);
    const toShapeIndex = taskShapeIndexById.get(link.toId);
    if (fromShapeIndex == null || toShapeIndex == null) continue;
    const descriptor = excelConnectorDescriptor(
      link.broken,
      fromRow === toRow,
      fromRight,
      toLeft,
      input.colorScheme,
    );
    connectors.push({
      fromShapeIndex,
      toShapeIndex,
      ...descriptor,
    });
  }

  const todayLine = excelTodayLineDescriptor(
    input.showLightningLine,
    input.today,
    input.timelineStart,
    input.timelineEnd,
    columns,
    input.tier,
    dateColumnWidthPx,
    bodyRowHeightPx,
    rows.length,
    leftColCount,
    bodyStartRow,
    input.colorScheme,
  );

  const payload: ExcelExportPayload = {
    sheetTitle: input.title,
    preamble: scopeSentence(input),
    freezeRow: headerRowIndex + 1,
    freezeCol: leftColCount,
    leftHeaders,
    dateColumns: columns,
    milestoneRows,
    rows,
    shapes,
    connectors,
    todayLine,
    milestoneMarks,
    headerGrayRgb: EXCEL_SHEET_NON_WORKING_RGB,
    nonWorkingFillRgb: EXCEL_SHEET_NON_WORKING_RGB,
    categoryHeadingFillRgb: chart.categoryRow.replace("#", ""),
    tableBorderRgb: EXCEL_SHEET_BORDER_RGB,
    summaryGapLines,
    summaryCaps,
    overdueNameRgb: excelOverdueNameRgb,
    grayHeaderOnly: input.tier === "day",
    noteWrapColumnIndex,
    todosWrapColumnIndex,
    dateColumnWidthPx,
    bodyRowHeightPx,
    headerRowHeightPx,
  };
  assertExcelLimits(payload);
  return payload;
}

export async function exportScheduleExcel(
  input: ScheduleExcelInput,
): Promise<string | null> {
  const payload = buildExcelExportPayload(input);
  const suggestedName = scheduleXlsxFilename(input.title);
  if (!isTauri()) {
    throw new Error("Excel の書き出しはデスクトップ版だけです。");
  }
  return invoke<string | null>("save_excel_export", {
    payload,
    suggestedName,
  });
}
