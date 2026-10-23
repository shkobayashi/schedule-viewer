import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXCEL_EXPORT_COLUMNS,
  excelLeftHeaders,
  excelNoteColumnIndex,
} from "./excelExportColumns";

describe("excelExportColumns", () => {
  it("uses default columns when storage is empty", () => {
    expect(
      excelLeftHeaders(DEFAULT_EXCEL_EXPORT_COLUMNS),
    ).toEqual(["名前", "開始", "終了", "ノート"]);
    expect(excelNoteColumnIndex(DEFAULT_EXCEL_EXPORT_COLUMNS)).toBe(3);
  });

  it("parses stored preferences", () => {
    const parsed = JSON.parse(
      JSON.stringify({
        ...DEFAULT_EXCEL_EXPORT_COLUMNS,
        assignee: true,
        note: false,
      }),
    );
    expect(excelLeftHeaders(parsed)).toEqual([
      "名前",
      "担当",
      "開始",
      "終了",
    ]);
    expect(excelNoteColumnIndex(parsed)).toBeNull();
  });
});
