import { addDays, isoDate, parseDate } from "./dates";
import { hatchStripeColor } from "./hatch";
import type { StatusItem } from "./statusCatalog";
import { barColors } from "./timeline";
import type { ResolvedColorScheme } from "./palette";
import type { Task } from "./types";
import type { GridTier } from "./timeline";
import type { ExcelTimeColumn } from "./excelTimeColumns";
import { columnIndexForDate } from "./excelTimeColumns";

export const EXCEL_BAR_HEIGHT_PX = 14;

export type BarPixelsInColumns = {
  anchorColIndex: number;
  xOffsetPx: number;
  widthPx: number;
};

/** 期間の左端と幅を、日付列のピクセル座標で返す。 */
export function barPixelsInDateColumns(
  startIso: string,
  endExclusiveIso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  dateColumnWidthPx: number,
): BarPixelsInColumns {
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

export function dateAreaLeftPx(
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

export function dateAreaRightPx(
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

export function excelBarYOffsetPx(bodyRowHeightPx: number): number {
  return Math.max(
    0,
    Math.round((bodyRowHeightPx - EXCEL_BAR_HEIGHT_PX) / 2),
  );
}

export type ExcelBarFillStyle = {
  fillRgb: string;
  pattern: "solid" | "tentative";
  patternForeRgb: string | null;
};

export function excelTaskBarFillStyle(
  task: Task,
  today: string,
  colorScheme: ResolvedColorScheme,
  statuses?: readonly StatusItem[],
): ExcelBarFillStyle {
  const colors = barColors(task, today, colorScheme, statuses);
  const tentative = task.confidence === "tentative";
  return {
    fillRgb: colors.bg.replace("#", ""),
    pattern: tentative ? "tentative" : "solid",
    patternForeRgb: tentative
      ? hatchStripeColor(colors.bg, colorScheme).replace("#", "")
      : null,
  };
}

export function excelSummaryBarFillRgb(summaryRgb: string): ExcelBarFillStyle {
  return {
    fillRgb: summaryRgb.replace("#", ""),
    pattern: "solid",
    patternForeRgb: null,
  };
}

export type ExcelBarShapePlacement = {
  anchorCol: number;
  xOffsetPx: number;
  yOffsetPx: number;
  widthPx: number;
  heightPx: number;
};

export function excelBarShapePlacement(
  bar: BarPixelsInColumns,
  leftColCount: number,
  bodyRowHeightPx: number,
): ExcelBarShapePlacement {
  return {
    anchorCol: leftColCount + bar.anchorColIndex,
    xOffsetPx: bar.xOffsetPx,
    yOffsetPx: excelBarYOffsetPx(bodyRowHeightPx),
    widthPx: bar.widthPx,
    heightPx: EXCEL_BAR_HEIGHT_PX,
  };
}
