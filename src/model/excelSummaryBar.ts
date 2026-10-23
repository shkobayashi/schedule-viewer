import { addDays, isoDate, parseDate } from "./dates";
import type { ChartPalette } from "./palette";
import type { GridTier } from "./timeline";
import type { SummarySpan } from "./summary";
import { spanExclusiveEnd } from "./summary";
import {
  barPixelsInDateColumns,
} from "./excelBar";
import type { ExcelTimeColumn } from "./excelTimeColumns";
import type { ExcelExportShape } from "./exportExcel";

export const EXCEL_SUMMARY_BAR_HEIGHT_PX = 5;

export function excelSummaryBarYOffsetPx(bodyRowHeightPx: number): number {
  return Math.max(
    0,
    Math.round((bodyRowHeightPx - EXCEL_SUMMARY_BAR_HEIGHT_PX) / 2),
  );
}

export type ExcelExportSummaryGapLine = {
  row: number;
  anchorCol: number;
  xOffsetPx: number;
  yOffsetPx: number;
  widthPx: number;
  strokeRgb: string;
};

export type ExcelExportSummaryCap = {
  row: number;
  anchorCol: number;
  xOffsetPx: number;
  yOffsetPx: number;
  sizePx: number;
  side: "left" | "right";
  fillRgb: string;
};

function summaryCapSizePx(barHeightPx: number): number {
  return Math.max(3, Math.round(barHeightPx * 0.9));
}

function shapeForCoveredSpan(
  row: number,
  startIso: string,
  endExclusiveIso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  fillRgb: string,
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
  const yOffsetPx = excelSummaryBarYOffsetPx(bodyRowHeightPx);
  return {
    row,
    anchorCol: leftColCount + bar.anchorColIndex,
    xOffsetPx: bar.xOffsetPx,
    yOffsetPx,
    widthPx: bar.widthPx,
    heightPx: EXCEL_SUMMARY_BAR_HEIGHT_PX,
    fillRgb: fillRgb.replace("#", ""),
    pattern: "solid",
    patternForeRgb: null,
  };
}

function gapLineIfWideEnough(
  row: number,
  startIso: string,
  endExclusiveIso: string,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  strokeRgb: string,
  leftColCount: number,
  dateColumnWidthPx: number,
  bodyRowHeightPx: number,
): ExcelExportSummaryGapLine | null {
  const bar = barPixelsInDateColumns(
    startIso,
    endExclusiveIso,
    columns,
    tier,
    dateColumnWidthPx,
  );
  if (bar.widthPx <= 2) return null;
  const yCenter =
    excelSummaryBarYOffsetPx(bodyRowHeightPx) +
    Math.floor(EXCEL_SUMMARY_BAR_HEIGHT_PX / 2);
  return {
    row,
    anchorCol: leftColCount + bar.anchorColIndex,
    xOffsetPx: bar.xOffsetPx,
    yOffsetPx: yCenter,
    widthPx: bar.widthPx,
    strokeRgb: strokeRgb.replace("#", ""),
  };
}

export function excelSummaryBarDecorations(
  row: number,
  summary: SummarySpan,
  columns: ExcelTimeColumn[],
  tier: GridTier,
  chart: ChartPalette,
  leftColCount: number,
  dateColumnWidthPx: number,
  bodyRowHeightPx: number,
): {
  shapes: ExcelExportShape[];
  gapLines: ExcelExportSummaryGapLine[];
  caps: ExcelExportSummaryCap[];
} {
  const fillRgb = chart.summaryCovered.replace("#", "");
  const gapRgb = chart.summaryGap;
  const sorted = [...summary.covered].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const shapes: ExcelExportShape[] = [];
  for (const span of sorted) {
    shapes.push(
      shapeForCoveredSpan(
        row,
        span.start,
        isoDate(spanExclusiveEnd(span.end)),
        columns,
        tier,
        fillRgb,
        leftColCount,
        dateColumnWidthPx,
        bodyRowHeightPx,
      ),
    );
  }

  const gapLines: ExcelExportSummaryGapLine[] = [];
  let cursor = summary.start;
  for (const span of sorted) {
    if (span.start > cursor) {
      const line = gapLineIfWideEnough(
        row,
        cursor,
        span.start,
        columns,
        tier,
        gapRgb,
        leftColCount,
        dateColumnWidthPx,
        bodyRowHeightPx,
      );
      if (line) gapLines.push(line);
    }
    cursor = span.end > cursor ? span.end : cursor;
  }
  if (cursor < summary.end) {
    const line = gapLineIfWideEnough(
      row,
      cursor,
      isoDate(addDays(parseDate(summary.end), 1)),
      columns,
      tier,
      gapRgb,
      leftColCount,
      dateColumnWidthPx,
      bodyRowHeightPx,
    );
    if (line) gapLines.push(line);
  }

  const cap = summaryCapSizePx(EXCEL_SUMMARY_BAR_HEIGHT_PX);
  const barBottom =
    excelSummaryBarYOffsetPx(bodyRowHeightPx) + EXCEL_SUMMARY_BAR_HEIGHT_PX;
  const endExclusive = isoDate(addDays(parseDate(summary.end), 1));
  const fullBar = barPixelsInDateColumns(
    summary.start,
    endExclusive,
    columns,
    tier,
    dateColumnWidthPx,
  );
  const leftPx =
    fullBar.anchorColIndex * dateColumnWidthPx + fullBar.xOffsetPx;
  const rightPx = leftPx + fullBar.widthPx;
  const toAnchor = (px: number) => {
    const colIndex = Math.floor(px / dateColumnWidthPx);
    const xOffsetPx = px - colIndex * dateColumnWidthPx;
    return { anchorCol: leftColCount + colIndex, xOffsetPx };
  };
  const leftAnchor = toAnchor(leftPx);
  const rightAnchor = toAnchor(Math.max(0, rightPx - cap));

  const caps: ExcelExportSummaryCap[] = [
    {
      row,
      anchorCol: leftAnchor.anchorCol,
      xOffsetPx: leftAnchor.xOffsetPx,
      yOffsetPx: barBottom,
      sizePx: cap,
      side: "left",
      fillRgb,
    },
    {
      row,
      anchorCol: rightAnchor.anchorCol,
      xOffsetPx: rightAnchor.xOffsetPx,
      yOffsetPx: barBottom,
      sizePx: cap,
      side: "right",
      fillRgb,
    },
  ];

  return { shapes, gapLines, caps };
}
