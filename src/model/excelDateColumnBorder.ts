import type { ChartPalette } from "./palette";
import type { GridTier } from "./timeline";
import type { ExcelTimeColumn } from "./excelTimeColumns";
import { EXCEL_SHEET_BORDER_RGB } from "./excelSheetColors";

export type ExcelTimeColumnWithBorder = ExcelTimeColumn & {
  leftBorderRgb: string;
};

export function excelDateColumnsWithBorders(
  columns: ExcelTimeColumn[],
  tier: GridTier,
  chart: ChartPalette,
): ExcelTimeColumnWithBorder[] {
  void tier;
  void chart;
  return columns.map((column) => ({
    ...column,
    leftBorderRgb: EXCEL_SHEET_BORDER_RGB,
  }));
}
