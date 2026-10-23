import { describe, expect, it } from "vitest";
import { excelMilestoneExport } from "./excelMilestone";
import {
  buildExcelTimeColumns,
  columnIndexForDate,
} from "./excelTimeColumns";
import { parseDate } from "./dates";

describe("excelMilestone", () => {
  it("puts group name and diamond column", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-09-01"),
      parseDate("2026-11-01"),
      "month",
      null,
    );
    const expectedCol = columnIndexForDate(columns, "2026-10-15");
    const { milestoneRows, milestoneMarks } = excelMilestoneExport(
      [{ id: "mg1", name: "リリース" }],
      [
        {
          id: "m1",
          name: "α",
          date: "2026-10-15",
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      new Set(["mg1"]),
      columns,
    );
    expect(milestoneRows).toHaveLength(1);
    expect(milestoneRows[0]?.name).toBe("リリース");
    expect(milestoneMarks[0]?.character).toBe("◆ α");
    expect(milestoneMarks[0]?.colIndex).toBe(expectedCol);
    expect(milestoneRows[0]?.marks[0]?.colIndex).toBe(expectedCol);
  });

  it("joins same-day milestones in one cell", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-09-01"),
      parseDate("2026-11-01"),
      "day",
      null,
    );
    const date = "2026-10-15";
    const col = columnIndexForDate(columns, date);
    const { milestoneMarks } = excelMilestoneExport(
      [{ id: "mg1", name: "デモ" }],
      [
        {
          id: "m1",
          name: "A",
          date,
          confidence: "committed",
          groupId: "mg1",
        },
        {
          id: "m2",
          name: "B",
          date,
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      new Set(["mg1"]),
      columns,
    );
    expect(milestoneMarks).toHaveLength(1);
    expect(milestoneMarks[0]?.colIndex).toBe(col);
    expect(milestoneMarks[0]?.character).toBe("◆ A、B");
  });

  it("keeps same-day milestone names in document order", () => {
    const columns = buildExcelTimeColumns(
      parseDate("2026-09-01"),
      parseDate("2026-11-01"),
      "day",
      null,
    );
    const date = "2026-10-15";
    const { milestoneMarks } = excelMilestoneExport(
      [{ id: "mg1", name: "デモ" }],
      [
        {
          id: "m-z",
          name: "先",
          date,
          confidence: "committed",
          groupId: "mg1",
        },
        {
          id: "m-a",
          name: "後",
          date,
          confidence: "committed",
          groupId: "mg1",
        },
      ],
      new Set(["mg1"]),
      columns,
    );
    expect(milestoneMarks[0]?.character).toBe("◆ 先、後");
  });
});
