import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { paletteFor } from "./palette";
import { buildExcelTimeColumns } from "./excelTimeColumns";
import { excelDateColumnsWithBorders } from "./excelDateColumnBorder";
import { EXCEL_SHEET_BORDER_RGB } from "./excelSheetColors";

describe("excelDateColumnBorder", () => {
  it("uses one light border color for all tiers", () => {
    const dayColumns = buildExcelTimeColumns(
      parseDate("2026-01-05"),
      parseDate("2026-01-08"),
      "day",
      null,
    );
    const monthColumns = buildExcelTimeColumns(
      parseDate("2026-09-01"),
      parseDate("2026-11-01"),
      "month",
      null,
    );
    const { chart } = paletteFor("light");
    const dayWithBorder = excelDateColumnsWithBorders(dayColumns, "day", chart);
    const monthWithBorder = excelDateColumnsWithBorders(
      monthColumns,
      "month",
      chart,
    );
    expect(dayWithBorder[0]?.leftBorderRgb).toBe(EXCEL_SHEET_BORDER_RGB);
    expect(dayWithBorder[1]?.leftBorderRgb).toBe(EXCEL_SHEET_BORDER_RGB);
    expect(monthWithBorder[0]?.leftBorderRgb).toBe(EXCEL_SHEET_BORDER_RGB);
  });
});
