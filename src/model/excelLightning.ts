import { parseDate } from "./dates";
import { paletteFor, type ResolvedColorScheme } from "./palette";
import type { ExcelTimeColumn } from "./excelTimeColumns";
import type { GridTier } from "./timeline";
import { dateAreaLeftPx } from "./excelBar";

export type ExcelTodayLineDescriptor = {
  row: number;
  anchorCol: number;
  xOffsetPx: number;
  heightPx: number;
  strokeRgb: string;
};

function shapeAnchorAtDateAreaPx(
  xDateArea: number,
  yDateArea: number,
  leftColCount: number,
  bodyStartRow: number,
  dateColumnWidthPx: number,
  bodyRowHeightPx: number,
): { row: number; anchorCol: number; xOffsetPx: number; yOffsetPx: number } {
  const rowOffset = Math.max(0, Math.floor(yDateArea / bodyRowHeightPx));
  const row = bodyStartRow + rowOffset;
  const yOffsetPx = Math.max(
    0,
    Math.round(yDateArea - rowOffset * bodyRowHeightPx),
  );
  const colOffset = Math.max(0, Math.floor(xDateArea / dateColumnWidthPx));
  const anchorCol = leftColCount + colOffset;
  const xOffsetPx = Math.max(
    0,
    Math.round(xDateArea - colOffset * dateColumnWidthPx),
  );
  return { row, anchorCol, xOffsetPx, yOffsetPx };
}

export function excelTodayLineDescriptor(
  showLightningLine: boolean,
  todayIso: string,
  timelineStart: Date,
  timelineEnd: Date,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  dateColumnWidthPx: number,
  bodyRowHeightPx: number,
  bodyRowCount: number,
  leftColCount: number,
  bodyStartRow: number,
  colorScheme: ResolvedColorScheme,
): ExcelTodayLineDescriptor | null {
  if (!showLightningLine || bodyRowCount === 0) return null;
  const todayTime = parseDate(todayIso).getTime();
  const rangeStart = timelineStart.getTime();
  const rangeEnd = timelineEnd.getTime();
  if (todayTime < rangeStart || todayTime >= rangeEnd) return null;

  const x = dateAreaLeftPx(todayIso, columns, tier, dateColumnWidthPx);
  const heightPx = bodyRowCount * bodyRowHeightPx;
  const anchor = shapeAnchorAtDateAreaPx(
    x,
    0,
    leftColCount,
    bodyStartRow,
    dateColumnWidthPx,
    bodyRowHeightPx,
  );
  const { chart } = paletteFor(colorScheme);
  return {
    row: anchor.row,
    anchorCol: anchor.anchorCol,
    xOffsetPx: anchor.xOffsetPx,
    heightPx,
    strokeRgb: chart.lightning.replace("#", ""),
  };
}
