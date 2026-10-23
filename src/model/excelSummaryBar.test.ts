import { describe, expect, it } from "vitest";
import { parseDate } from "./dates";
import { paletteFor } from "./palette";
import { buildExcelTimeColumns } from "./excelTimeColumns";
import {
  EXCEL_SUMMARY_BAR_HEIGHT_PX,
  excelSummaryBarDecorations,
} from "./excelSummaryBar";

describe("excelSummaryBar", () => {
  it("splits covered spans and adds gap lines between them", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-01-01"),
      parseDate("2026-01-20"),
      "day",
      null,
    );
    const { chart } = paletteFor("light");
    const summary = {
      start: "2026-01-01",
      end: "2026-01-15",
      covered: [
        { start: "2026-01-01", end: "2026-01-05" },
        { start: "2026-01-10", end: "2026-01-12" },
      ],
    };
    const deco = excelSummaryBarDecorations(
      3,
      summary,
      columns,
      "day",
      chart,
      4,
      48,
      22,
    );
    expect(deco.shapes).toHaveLength(2);
    expect(deco.shapes.every((s) => s.heightPx === EXCEL_SUMMARY_BAR_HEIGHT_PX)).toBe(
      true,
    );
    const gapWidths = deco.gapLines.map((line) => line.widthPx).sort((a, b) => a - b);
    expect(gapWidths).toEqual([192, 240]);
    expect(deco.caps).toHaveLength(2);
    const rightCap = deco.caps.find((cap) => cap.side === "right");
    expect(rightCap?.xOffsetPx).toBe(43);
    expect(rightCap?.sizePx).toBe(5);
  });
});
