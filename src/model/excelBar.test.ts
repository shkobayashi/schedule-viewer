import { describe, expect, it } from "vitest";
import {
  barPixelsInDateColumns,
  excelBarShapePlacement,
  excelBarYOffsetPx,
  excelTaskBarFillStyle,
} from "./excelBar";
import { buildExcelTimeColumns } from "./excelTimeColumns";
import { parseDate } from "./dates";

describe("excelBar", () => {
  const columns = buildExcelTimeColumns(
    parseDate("2026-01-06"),
    parseDate("2026-01-10"),
    "day",
    null,
  );

  it("scales bar width with date column width", () => {
    const narrow = barPixelsInDateColumns(
      "2026-01-07",
      "2026-01-09",
      columns,
      "day",
      40,
    );
    const wide = barPixelsInDateColumns(
      "2026-01-07",
      "2026-01-09",
      columns,
      "day",
      80,
    );
    expect(wide.widthPx / narrow.widthPx).toBe(2);
    expect(wide.anchorColIndex).toBe(narrow.anchorColIndex);
    expect(wide.xOffsetPx).toBe(narrow.xOffsetPx);
  });

  it("centers bar vertically from body row height only", () => {
    expect(excelBarYOffsetPx(22)).toBe(4);
    expect(excelBarYOffsetPx(30)).toBe(8);
  });

  it("uses solid fill for committed tasks", () => {
    const task = {
      id: "t1",
      name: "A",
      start: "2026-01-07",
      end: "2026-01-08",
      assigneeId: null,
      status: "in-progress" as const,
      progress: 0,
      confidence: "committed" as const,
      predecessors: [],
      milestoneId: null,
    };
    const fill = excelTaskBarFillStyle(task, "2026-01-07", "light");
    expect(fill).toEqual({
      fillRgb: "DEE3FB",
      pattern: "solid",
      patternForeRgb: null,
    });
  });

  it("uses hatch foreground for tentative tasks", () => {
    const task = {
      id: "t1",
      name: "A",
      start: "2026-01-07",
      end: "2026-01-08",
      assigneeId: null,
      status: "in-progress" as const,
      progress: 0,
      confidence: "tentative" as const,
      predecessors: [],
      milestoneId: null,
    };
    const fill = excelTaskBarFillStyle(task, "2026-01-07", "light");
    expect(fill.pattern).toBe("tentative");
    expect(fill.patternForeRgb).toBe("818492");
    expect(fill.fillRgb).toBe("DEE3FB");
  });

  it("changes fill with status, overdue, and color scheme", () => {
    const base = {
      id: "t1",
      name: "A",
      assigneeId: null,
      progress: 0,
      predecessors: [],
      milestoneId: null,
      confidence: "committed" as const,
    };
    const inProgress = excelTaskBarFillStyle(
      { ...base, start: "2026-01-07", end: "2026-01-08", status: "in-progress" },
      "2026-01-07",
      "light",
    );
    const done = excelTaskBarFillStyle(
      { ...base, start: "2026-01-01", end: "2026-01-05", status: "done" },
      "2026-01-07",
      "light",
    );
    const overdue = excelTaskBarFillStyle(
      { ...base, start: "2026-01-01", end: "2026-01-05", status: "not-started" },
      "2026-01-07",
      "light",
    );
    const dark = excelTaskBarFillStyle(
      { ...base, start: "2026-01-07", end: "2026-01-08", status: "in-progress" },
      "2026-01-07",
      "dark",
    );
    expect(inProgress.fillRgb).toBe("DEE3FB");
    expect(done.fillRgb).toBe("247A55");
    expect(overdue.fillRgb).toBe("E2E6ED");
    expect(dark.fillRgb).toBe("2e3344");
  });

  it("does not change fill when only dates change", () => {
    const base = {
      id: "t1",
      name: "A",
      assigneeId: null,
      status: "in-progress" as const,
      progress: 0,
      confidence: "committed" as const,
      predecessors: [],
      milestoneId: null,
    };
    const a = excelTaskBarFillStyle(
      { ...base, start: "2026-01-07", end: "2026-01-08" },
      "2026-01-07",
      "light",
    );
    const b = excelTaskBarFillStyle(
      { ...base, start: "2026-01-08", end: "2026-01-09" },
      "2026-01-07",
      "light",
    );
    expect(a).toEqual(b);
  });

  it("places shape from bar pixels and left column count", () => {
    const bar = barPixelsInDateColumns(
      "2026-01-07",
      "2026-01-09",
      columns,
      "day",
      48,
    );
    const placement = excelBarShapePlacement(bar, 4, 22);
    expect(placement.anchorCol).toBe(4 + bar.anchorColIndex);
    expect(placement.widthPx).toBe(2 * 48);
  });
});
