import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  addDays,
  addUtcMonths,
  fmtMonthDay,
  fmtShort,
  isoDate,
  parseDate,
  utcMonthStart,
} from "./dates";
import { assigneeSidebarLabel, resolveAssigneeDisplay } from "./assigneeDisplay";
import { hatchStripeColor } from "./hatch";
import { isNonWorkingDay } from "./nonWorkingDay";
import { formatYearMonth } from "./monthHeader";
import {
  EXPORT_MAX_ROWS,
  ScheduleExportTooLargeError,
  type ScheduleExportInput,
} from "./exportHtml";
import { scheduleXlsxFilename } from "./exportFilename";
import { barColors, isOverdue, taskBarExclusiveEnd } from "./timeline";
import type { CalendarDocument } from "./calendarTypes";
import type {
  Milestone,
  MilestoneGroup,
  ScheduleId,
  Task,
  TaskStatus,
} from "./types";
import type { GridTier } from "./timeline";
import { paletteFor } from "./palette";
import { normalizeTaskNote } from "./taskNote";
import {
  EXCEL_EXPORT_COLUMN_ORDER,
  excelLeftHeaders,
  excelNoteColumnIndex,
  type ExcelExportColumnsPreference,
} from "./excelExportColumns";

export const EXCEL_DATE_COLUMN_WIDTH_PX = 48;
export const EXCEL_DATE_COLUMN_WIDTH_MONTH_PX = 96;
export const EXCEL_ROW_HEIGHT_PX = 22;
export const EXCEL_BAR_HEIGHT_PX = 14;
export const EXCEL_MAX_DATE_COLUMNS = 2_000;
export const EXCEL_MAX_SHAPES = 5_000;
const EXCEL_LINK_ELBOW_PX = 12;
export const EXCEL_MAX_BYTES = 10 * 1024 * 1024;

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "未着手",
  "in-progress": "進行中",
  done: "完了",
};

export type ExcelTimeColumn = {
  startIso: string;
  endExclusiveIso: string;
  headerLabel: string;
  nonWorking: boolean;
};

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
  /** bentConnector3 の adj1（幅に対する千分率一パーセント、0〜100000） */
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
  dateColumns: ExcelTimeColumn[];
  milestoneRows: ExcelMilestoneRow[];
  rows: ExcelExportRow[];
  shapes: ExcelExportShape[];
  connectors: ExcelExportConnector[];
  todayLine: ExcelExportTodayLine | null;
  milestoneMarks: { row: number; colIndex: number; character: string }[];
  headerGrayRgb: string;
  nonWorkingFillRgb: string;
  categoryHeadingFillRgb: string;
  groupHeadingFillRgb: string;
  headingTextRgb: string;
  overdueNameRgb: string;
  grayHeaderOnly: boolean;
  noteWrapColumnIndex: number | null;
  dateColumnWidthPx: number;
};

export type ScheduleExcelInput = ScheduleExportInput & {
  exportMilestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  taskNames: ReadonlyMap<ScheduleId, string>;
  exportedAtIso: string;
  excelColumns: ExcelExportColumnsPreference;
};

export function excelDateColumnWidthPx(tier: GridTier): number {
  return tier === "month"
    ? EXCEL_DATE_COLUMN_WIDTH_MONTH_PX
    : EXCEL_DATE_COLUMN_WIDTH_PX;
}

function mondayOnOrBefore(d: Date): Date {
  const day = d.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  return addDays(d, -offset);
}

export function buildExcelTimeColumns(
  timelineStart: Date,
  timelineEnd: Date,
  tier: GridTier,
  calendar: CalendarDocument | null,
): ExcelTimeColumn[] {
  const columns: ExcelTimeColumn[] = [];
  if (tier === "day") {
    let d = timelineStart;
    while (d < timelineEnd) {
      const startIso = isoDate(d);
      const next = addDays(d, 1);
      columns.push({
        startIso,
        endExclusiveIso: isoDate(next),
        headerLabel: fmtShort(d),
        nonWorking: isNonWorkingDay(d, calendar),
      });
      d = next;
    }
    return columns;
  }
  if (tier === "week") {
    let cursor = timelineStart;
    while (cursor < timelineEnd) {
      const weekEnd = addDays(mondayOnOrBefore(cursor), 7);
      const colEnd = weekEnd < timelineEnd ? weekEnd : timelineEnd;
      columns.push({
        startIso: isoDate(cursor),
        endExclusiveIso: isoDate(colEnd),
        headerLabel: fmtShort(cursor),
        nonWorking: false,
      });
      cursor = colEnd;
    }
    return columns;
  }
  let cursor = timelineStart;
  while (cursor < timelineEnd) {
    const monthStart = utcMonthStart(cursor);
    const nextMonth = addUtcMonths(monthStart, 1);
    const colEnd = nextMonth < timelineEnd ? nextMonth : timelineEnd;
    columns.push({
      startIso: isoDate(cursor),
      endExclusiveIso: isoDate(colEnd),
      headerLabel: formatYearMonth(monthStart),
      nonWorking: false,
    });
    cursor = colEnd;
  }
  return columns;
}

function columnIndexForDate(columns: ExcelTimeColumn[], iso: string): number {
  const time = parseDate(iso).getTime();
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i]!;
    const start = parseDate(col.startIso).getTime();
    const end = parseDate(col.endExclusiveIso).getTime();
    if (time >= start && time < end) return i;
  }
  if (columns.length === 0) return 0;
  const last = columns[columns.length - 1]!;
  if (time >= parseDate(last.endExclusiveIso).getTime()) return columns.length - 1;
  return 0;
}

/** 期間の左端と幅を、日付列のピクセル座標で返す。 */
export function barPixelsInDateColumns(
  startIso: string,
  endExclusiveIso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  dateColumnWidthPx: number,
): { anchorColIndex: number; xOffsetPx: number; widthPx: number } {
  if (columns.length === 0) {
    return { anchorColIndex: 0, xOffsetPx: 0, widthPx: dateColumnWidthPx };
  }
  if (tier === "day") {
    const startIdx = columnIndexForDate(columns, startIso);
    const endExclusive = parseDate(endExclusiveIso);
    const endIdx = columnIndexForDate(
      columns,
      isoDate(addDays(endExclusive, -1)),
    );
    const widthPx = Math.max(
      dateColumnWidthPx,
      (endIdx - startIdx + 1) * dateColumnWidthPx,
    );
    return { anchorColIndex: startIdx, xOffsetPx: 0, widthPx };
  }
  const totalMs = columns.reduce(
    (sum, col) =>
      sum +
      parseDate(col.endExclusiveIso).getTime() -
      parseDate(col.startIso).getTime(),
    0,
  );
  const posMs = (date: Date) => {
    let offset = 0;
    for (const col of columns) {
      const colStart = parseDate(col.startIso);
      const colEnd = parseDate(col.endExclusiveIso);
      if (date <= colStart) return offset;
      if (date >= colEnd) {
        offset += colEnd.getTime() - colStart.getTime();
        continue;
      }
      return offset + (date.getTime() - colStart.getTime());
    }
    return totalMs;
  };
  const startPos = posMs(parseDate(startIso));
  const endPos = posMs(parseDate(endExclusiveIso));
  const chartWidth = columns.length * dateColumnWidthPx;
  const leftPx = (startPos / (totalMs || 1)) * chartWidth;
  const rightPx = (endPos / (totalMs || 1)) * chartWidth;
  const widthPx = Math.max(1, rightPx - leftPx);
  let walked = 0;
  for (let i = 0; i < columns.length; i += 1) {
    if (leftPx < walked + dateColumnWidthPx) {
      return {
        anchorColIndex: i,
        xOffsetPx: Math.max(0, Math.round(leftPx - walked)),
        widthPx: Math.max(1, Math.round(widthPx)),
      };
    }
    walked += dateColumnWidthPx;
  }
  return {
    anchorColIndex: columns.length - 1,
    xOffsetPx: 0,
    widthPx: Math.max(1, Math.round(widthPx)),
  };
}

function dateAreaLeftPx(
  iso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  dateColumnWidthPx: number,
): number {
  const next = isoDate(addDays(parseDate(iso), 1));
  const bar = barPixelsInDateColumns(
    iso,
    next,
    columns,
    tier,
    dateColumnWidthPx,
  );
  return bar.anchorColIndex * dateColumnWidthPx + bar.xOffsetPx;
}

function dateAreaRightPx(
  startIso: string,
  endExclusiveIso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  dateColumnWidthPx: number,
): number {
  const bar = barPixelsInDateColumns(
    startIso,
    endExclusiveIso,
    columns,
    tier,
    dateColumnWidthPx,
  );
  return (
    bar.anchorColIndex * dateColumnWidthPx + bar.xOffsetPx + bar.widthPx
  );
}

function shapeAnchorAtDateAreaPx(
  xDateArea: number,
  yDateArea: number,
  leftColCount: number,
  bodyStartRow: number,
  dateColumnWidthPx: number,
): { row: number; anchorCol: number; xOffsetPx: number; yOffsetPx: number } {
  const rowOffset = Math.max(0, Math.floor(yDateArea / EXCEL_ROW_HEIGHT_PX));
  const row = bodyStartRow + rowOffset;
  const yOffsetPx = Math.max(
    0,
    Math.round(yDateArea - rowOffset * EXCEL_ROW_HEIGHT_PX),
  );
  const colOffset = Math.max(0, Math.floor(xDateArea / dateColumnWidthPx));
  const anchorCol = leftColCount + colOffset;
  const xOffsetPx = Math.max(
    0,
    Math.round(xDateArea - colOffset * dateColumnWidthPx),
  );
  return { row, anchorCol, xOffsetPx, yOffsetPx };
}

function bentConnectorAdj1(fromRight: number, toLeft: number): number {
  const left = Math.min(fromRight, toLeft);
  const right = Math.max(fromRight, toLeft);
  const width = Math.max(1, right - left);
  let elbowX: number;
  if (toLeft - fromRight >= EXCEL_LINK_ELBOW_PX) {
    elbowX = Math.min(fromRight + EXCEL_LINK_ELBOW_PX, toLeft);
  } else {
    elbowX = left + width / 2;
  }
  return Math.round(((elbowX - left) / width) * 100_000);
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

function emptyCellsForColumns(
  excelColumns: ExcelExportColumnsPreference,
): string[] {
  return EXCEL_EXPORT_COLUMN_ORDER.filter((id) => excelColumns[id]).map(
    () => "",
  );
}

function taskCellsForColumns(
  task: Task,
  excelColumns: ExcelExportColumnsPreference,
  taskNames: ReadonlyMap<ScheduleId, string>,
  memberCatalog: ScheduleExportInput["memberCatalog"],
): string[] {
  const assignee = assigneeSidebarLabel(
    resolveAssigneeDisplay(task.assigneeId, memberCatalog),
  );
  const cells: string[] = [];
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (!excelColumns[id]) continue;
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
        cells.push(TASK_STATUS_LABEL[task.status]);
        break;
      case "predecessors":
        cells.push(formatPredecessors(task, taskNames));
        break;
      case "progress":
        cells.push(`${task.progress}%`);
        break;
      case "note":
        cells.push(normalizeTaskNote(task.note) ?? "");
        break;
      default:
        break;
    }
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
    (payload.todayLine ? 1 : 0);
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
  fillRgb: string,
  pattern: "solid" | "tentative",
  patternForeRgb: string | null,
  colorScheme: ScheduleExportInput["colorScheme"],
  confidence: "tentative" | "committed",
  leftColCount: number,
  dateColumnWidthPx: number,
): ExcelExportShape {
  const bar = barPixelsInDateColumns(
    startIso,
    endExclusiveIso,
    columns,
    tier,
    dateColumnWidthPx,
  );
  const yOffsetPx = Math.max(
    0,
    Math.round((EXCEL_ROW_HEIGHT_PX - EXCEL_BAR_HEIGHT_PX) / 2),
  );
  const tentative = confidence === "tentative";
  return {
    row,
    anchorCol: leftColCount + bar.anchorColIndex,
    xOffsetPx: bar.xOffsetPx,
    yOffsetPx,
    widthPx: bar.widthPx,
    heightPx: EXCEL_BAR_HEIGHT_PX,
    fillRgb,
    pattern: tentative ? "tentative" : pattern,
    patternForeRgb: tentative ? hatchStripeColor(fillRgb, colorScheme) : patternForeRgb,
  };
}

export function buildExcelExportPayload(
  input: ScheduleExcelInput,
): ExcelExportPayload {
  const { chart, css } = paletteFor(input.colorScheme);
  const leftHeaders = excelLeftHeaders(input.excelColumns);
  const leftColCount = leftHeaders.length;
  const noteWrapColumnIndex = excelNoteColumnIndex(input.excelColumns);
  const columns = buildExcelTimeColumns(
    input.timelineStart,
    input.timelineEnd,
    input.tier,
    input.calendar,
  );
  const dateColumnWidthPx = excelDateColumnWidthPx(input.tier);
  const rows: ExcelExportRow[] = [];
  const shapes: ExcelExportShape[] = [];
  const connectors: ExcelExportConnector[] = [];
  const taskShapeIndexById = new Map<ScheduleId, number>();
  const milestoneMarks: ExcelExportPayload["milestoneMarks"] = [];
  const visibleGroupIds = new Set(
    input.milestoneBandLayout.blocks.map((block) => block.group.id),
  );
  const milestoneRows: ExcelMilestoneRow[] = [];
  let milestoneRowIndex = 1;
  for (const group of input.milestoneGroups) {
    if (!visibleGroupIds.has(group.id)) continue;
    const groupMilestones = input.exportMilestones.filter(
      (m) => m.groupId === group.id,
    );
    if (groupMilestones.length === 0) continue;
    const marks = groupMilestones.map((milestone) => ({
      colIndex: columnIndexForDate(columns, milestone.date),
    }));
    for (const milestone of groupMilestones) {
      milestoneMarks.push({
        row: milestoneRowIndex,
        colIndex: columnIndexForDate(columns, milestone.date),
        character: "◆",
      });
    }
    milestoneRows.push({
      name: group.name,
      marks,
    });
    milestoneRowIndex += 1;
  }

  const headerRowIndex = 1 + milestoneRows.length;
  const bodyStartRow = headerRowIndex + 1;

  const taskRowById = new Map<ScheduleId, number>();
  const taskById = new Map<ScheduleId, Task>();

  let bodyRow = bodyStartRow;
  for (const visible of input.visibleRows) {
    if (visible.type === "category") {
      rows.push({
        kind: "category",
        cells: [visible.label, ...emptyCellsForColumns(input.excelColumns)],
        nameOverdue: false,
      });
      if (visible.summary) {
        shapes.push(
          shapeForSpan(
            bodyRow,
            visible.summary.start,
            isoDate(addDays(parseDate(visible.summary.end), 1)),
            columns,
            input.tier,
            chart.summaryCovered,
            "solid",
            null,
            input.colorScheme,
            "committed",
            leftColCount,
            dateColumnWidthPx,
          ),
        );
      }
      bodyRow += 1;
      continue;
    }
    if (visible.type === "group") {
      rows.push({
        kind: "group",
        cells: [visible.label, ...emptyCellsForColumns(input.excelColumns)],
        nameOverdue: false,
      });
      if (visible.summary) {
        shapes.push(
          shapeForSpan(
            bodyRow,
            visible.summary.start,
            isoDate(addDays(parseDate(visible.summary.end), 1)),
            columns,
            input.tier,
            chart.summaryCovered,
            "solid",
            null,
            input.colorScheme,
            "committed",
            leftColCount,
            dateColumnWidthPx,
          ),
        );
      }
      bodyRow += 1;
      continue;
    }
    const task = visible.task;
    taskRowById.set(task.id, bodyRow);
    taskById.set(task.id, task);
    const overdue = isOverdue(task, input.today);
    rows.push({
      kind: "task",
      cells: [
        task.name,
        ...taskCellsForColumns(
          task,
          input.excelColumns,
          input.taskNames,
          input.memberCatalog,
        ),
      ],
      nameOverdue: overdue,
    });
    const colors = barColors(task, input.today, input.colorScheme);
    taskShapeIndexById.set(task.id, shapes.length);
    shapes.push(
      shapeForSpan(
        bodyRow,
        task.start,
        isoDate(taskBarExclusiveEnd(task)),
        columns,
        input.tier,
        colors.bg,
        "solid",
        null,
        input.colorScheme,
        task.confidence,
        leftColCount,
        dateColumnWidthPx,
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
    const strokeRgb = (link.broken ? chart.linkBroken : chart.linkOk).replace(
      "#",
      "",
    );
    const straight = fromRow === toRow;
    connectors.push({
      fromShapeIndex,
      toShapeIndex,
      strokeRgb,
      broken: link.broken,
      straight,
      bentAdj1: straight
        ? 50_000
        : bentConnectorAdj1(fromRight, toLeft),
    });
  }

  let todayLine: ExcelExportTodayLine | null = null;
  if (input.showLightningLine && rows.length > 0) {
    const todayTime = parseDate(input.today).getTime();
    const rangeStart = input.timelineStart.getTime();
    const rangeEnd = input.timelineEnd.getTime();
    if (todayTime >= rangeStart && todayTime < rangeEnd) {
      const x = dateAreaLeftPx(
        input.today,
        columns,
        input.tier,
        dateColumnWidthPx,
      );
      const heightPx = rows.length * EXCEL_ROW_HEIGHT_PX;
      const anchor = shapeAnchorAtDateAreaPx(
        x,
        0,
        leftColCount,
        bodyStartRow,
        dateColumnWidthPx,
      );
      todayLine = {
        row: anchor.row,
        anchorCol: anchor.anchorCol,
        xOffsetPx: anchor.xOffsetPx,
        heightPx,
        strokeRgb: chart.lightning.replace("#", ""),
      };
    }
  }

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
    headerGrayRgb: chart.nonWorking.replace("#", ""),
    nonWorkingFillRgb: chart.nonWorking.replace("#", ""),
    categoryHeadingFillRgb: chart.categoryRow.replace("#", ""),
    groupHeadingFillRgb: chart.groupRow.replace("#", ""),
    headingTextRgb: chart.textPrimary.replace("#", ""),
    overdueNameRgb: css.dangerText.replace("#", ""),
    grayHeaderOnly: input.tier === "day",
    noteWrapColumnIndex,
    dateColumnWidthPx,
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
