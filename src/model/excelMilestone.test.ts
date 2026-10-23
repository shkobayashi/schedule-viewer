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
    expect(milestoneMarks[0]?.character).toBe("◆");
    expect(milestoneMarks[0]?.colIndex).toBe(expectedCol);
    expect(milestoneRows[0]?.marks[0]?.colIndex).toBe(expectedCol);
  });
});
