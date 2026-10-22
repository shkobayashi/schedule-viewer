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

export const EXCEL_LEFT_COLUMNS = 7;
export const EXCEL_DATE_COLUMN_WIDTH_PX = 48;
export const EXCEL_ROW_HEIGHT_PX = 22;
export const EXCEL_BAR_HEIGHT_PX = 14;
export const EXCEL_MAX_DATE_COLUMNS = 2_000;
export const EXCEL_MAX_SHAPES = 5_000;
export const EXCEL_MAX_BYTES = 10 * 1024 * 1024;

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  "not-started": "未着手",
  "in-progress": "進行中",
  done: "完了",
};

const LEFT_HEADERS = [
  "名前",
  "担当",
  "開始",
  "終了",
  "ステータス",
  "先行",
  "進捗",
] as const;

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
  milestoneMarks: { row: number; colIndex: number; character: string }[];
  headerGrayRgb: string;
  nonWorkingFillRgb: string;
  headingFillRgb: string;
  overdueNameRgb: string;
  grayHeaderOnly: boolean;
};

export type ScheduleExcelInput = ScheduleExportInput & {
  exportMilestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  taskNames: ReadonlyMap<ScheduleId, string>;
  exportedAtIso: string;
};

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
): { anchorColIndex: number; xOffsetPx: number; widthPx: number } {
  const colWidth = EXCEL_DATE_COLUMN_WIDTH_PX;
  if (columns.length === 0) {
    return { anchorColIndex: 0, xOffsetPx: 0, widthPx: colWidth };
  }
  const start = parseDate(startIso);
  const endExclusive = parseDate(endExclusiveIso);
  if (tier === "day") {
    const startIdx = columnIndexForDate(columns, startIso);
    const endIdx = columnIndexForDate(columns, isoDate(addDays(endExclusive, -1)));
    const widthPx = Math.max(colWidth, (endIdx - startIdx + 1) * colWidth);
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
  const startPos = posMs(start);
  const endPos = posMs(endExclusive);
  const chartWidth = (totalMs / (totalMs || 1)) * columns.length * colWidth;
  const leftPx = (startPos / (totalMs || 1)) * chartWidth;
  const rightPx = (endPos / (totalMs || 1)) * chartWidth;
  const widthPx = Math.max(1, rightPx - leftPx);
  let anchorColIndex = 0;
  let walked = 0;
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i]!;
    const colWidthPx =
      ((parseDate(col.endExclusiveIso).getTime() -
        parseDate(col.startIso).getTime()) /
        (totalMs || 1)) *
      chartWidth;
    if (leftPx < walked + colWidthPx) {
      anchorColIndex = i;
      return {
        anchorColIndex,
        xOffsetPx: Math.max(0, Math.round(leftPx - walked)),
        widthPx: Math.max(1, Math.round(widthPx)),
      };
    }
    walked += colWidthPx;
  }
  return {
    anchorColIndex: columns.length - 1,
    xOffsetPx: 0,
    widthPx: Math.max(1, Math.round(widthPx)),
  };
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
  if (payload.shapes.length > EXCEL_MAX_SHAPES) {
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
): ExcelExportShape {
  const bar = barPixelsInDateColumns(startIso, endExclusiveIso, columns, tier);
  const yOffsetPx = Math.max(
    0,
    Math.round((EXCEL_ROW_HEIGHT_PX - EXCEL_BAR_HEIGHT_PX) / 2),
  );
  const tentative = confidence === "tentative";
  return {
    row,
    anchorCol: EXCEL_LEFT_COLUMNS + bar.anchorColIndex,
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
  const columns = buildExcelTimeColumns(
    input.timelineStart,
    input.timelineEnd,
    input.tier,
    input.calendar,
  );
  const rows: ExcelExportRow[] = [];
  const shapes: ExcelExportShape[] = [];
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
      name: groupMilestones.map((m) => m.name).join("、"),
      marks,
    });
    milestoneRowIndex += 1;
  }

  const headerRowIndex = 1 + milestoneRows.length;
  const bodyStartRow = headerRowIndex + 1;

  let bodyRow = bodyStartRow;
  for (const visible of input.visibleRows) {
    if (visible.type === "category") {
      rows.push({
        kind: "category",
        cells: [visible.label, "", "", "", "", "", ""],
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
          ),
        );
      }
      bodyRow += 1;
      continue;
    }
    if (visible.type === "group") {
      rows.push({
        kind: "group",
        cells: [visible.label, "", "", "", "", "", ""],
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
          ),
        );
      }
      bodyRow += 1;
      continue;
    }
    const task = visible.task;
    const assignee = assigneeSidebarLabel(
      resolveAssigneeDisplay(task.assigneeId, input.memberCatalog),
    );
    const overdue = isOverdue(task, input.today);
    rows.push({
      kind: "task",
      cells: [
        task.name,
        assignee,
        fmtMonthDay(task.start),
        fmtMonthDay(task.end),
        TASK_STATUS_LABEL[task.status],
        formatPredecessors(task, input.taskNames),
        `${task.progress}%`,
      ],
      nameOverdue: overdue,
    });
    const colors = barColors(task, input.today, input.colorScheme);
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
      ),
    );
    bodyRow += 1;
  }

  const payload: ExcelExportPayload = {
    sheetTitle: input.title,
    preamble: scopeSentence(input),
    freezeRow: headerRowIndex + 1,
    freezeCol: EXCEL_LEFT_COLUMNS,
    leftHeaders: [...LEFT_HEADERS],
    dateColumns: columns,
    milestoneRows,
    rows,
    shapes,
    milestoneMarks,
    headerGrayRgb: chart.nonWorking.replace("#", ""),
    nonWorkingFillRgb: chart.nonWorking.replace("#", ""),
    headingFillRgb: chart.categoryRow.replace("#", ""),
    overdueNameRgb: css.dangerText.replace("#", ""),
    grayHeaderOnly: input.tier === "day",
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
