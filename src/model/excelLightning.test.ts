import { describe, expect, it } from "vitest";
import { buildExcelTimeColumns } from "./excelTimeColumns";
import { parseDate } from "./dates";
import { excelTodayLineDescriptor } from "./excelLightning";

describe("excelLightning", () => {
  const columns = buildExcelTimeColumns(
    parseDate("2026-01-06"),
    parseDate("2026-01-10"),
    "day",
    null,
  );
  const timelineStart = parseDate("2026-01-06");
  const timelineEnd = parseDate("2026-01-10");

  it("returns null when the lightning line is off", () => {
    expect(
      excelTodayLineDescriptor(
        false,
        "2026-01-07",
        timelineStart,
        timelineEnd,
        columns,
        "day",
        48,
        22,
        1,
        4,
        2,
        "light",
      ),
    ).toBeNull();
  });

  it("returns null when today is outside the timeline", () => {
    expect(
      excelTodayLineDescriptor(
        true,
        "2026-01-20",
        timelineStart,
        timelineEnd,
        columns,
        "day",
        48,
        22,
        1,
        4,
        2,
        "light",
      ),
    ).toBeNull();
  });

  it("returns null when there are no body rows", () => {
    expect(
      excelTodayLineDescriptor(
        true,
        "2026-01-07",
        timelineStart,
        timelineEnd,
        columns,
        "day",
        48,
        22,
        0,
        4,
        2,
        "light",
      ),
    ).toBeNull();
  });

  it("places today line on the today column with lightning color", () => {
    const line = excelTodayLineDescriptor(
      true,
      "2026-01-07",
      timelineStart,
      timelineEnd,
      columns,
      "day",
      48,
      22,
      1,
      4,
      2,
      "light",
    );
    expect(line).toEqual({
      row: 2,
      anchorCol: 5,
      xOffsetPx: 0,
      heightPx: 22,
      strokeRgb: "E07B20",
    });
  });

  it("scales height with body row count and row height only", () => {
    const tall = excelTodayLineDescriptor(
      true,
      "2026-01-07",
      timelineStart,
      timelineEnd,
      columns,
      "day",
      48,
      30,
      2,
      4,
      2,
      "light",
    );
    const short = excelTodayLineDescriptor(
      true,
      "2026-01-07",
      timelineStart,
      timelineEnd,
      columns,
      "day",
      48,
      22,
      2,
      4,
      2,
      "light",
    );
    expect(tall?.heightPx).toBe(60);
    expect(short?.heightPx).toBe(44);
    expect(tall?.anchorCol).toBe(short?.anchorCol);
    expect(tall?.strokeRgb).toBe(short?.strokeRgb);
  });
});
