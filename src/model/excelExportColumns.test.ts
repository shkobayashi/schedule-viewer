import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXCEL_EXPORT_COLUMNS,
  excelDuplicateFieldNames,
  excelFieldHeaderLabel,
  excelLeftHeaders,
  excelNoteColumnIndex,
  readExcelExportFieldColumns,
} from "./excelExportColumns";

function layout(
  excelColumns = DEFAULT_EXCEL_EXPORT_COLUMNS,
  fieldDefs: import("./types").ScheduleFieldDef[] = [],
  excelFieldColumns: Record<string, boolean> = {},
) {
  return { excelColumns, fieldDefs, excelFieldColumns };
}

describe("excelExportColumns", () => {
  it("uses default columns when storage is empty", () => {
    expect(excelLeftHeaders(layout())).toEqual(["名前", "開始", "終了", "ノート"]);
    expect(excelNoteColumnIndex(layout())).toBe(3);
  });

  it("parses stored preferences", () => {
    const parsed = JSON.parse(
      JSON.stringify({
        ...DEFAULT_EXCEL_EXPORT_COLUMNS,
        assignee: true,
        note: false,
      }),
    );
    expect(excelLeftHeaders(layout(parsed))).toEqual([
      "名前",
      "担当",
      "開始",
      "終了",
    ]);
    expect(excelNoteColumnIndex(layout(parsed))).toBeNull();
  });

  it("defaults field columns to off", () => {
    const prefs = readExcelExportFieldColumns([{ key: "score" }]);
    expect(prefs).toEqual({ score: false });
  });

  it("inserts enabled field columns before note", () => {
    const headers = excelLeftHeaders(
      layout(DEFAULT_EXCEL_EXPORT_COLUMNS, [
        { key: "a", name: "A", type: "text" },
        { key: "b", name: "B", type: "text" },
      ], { a: true, b: false }),
    );
    expect(headers).toEqual(["名前", "開始", "終了", "A", "ノート"]);
    expect(
      excelNoteColumnIndex(
        layout(
          DEFAULT_EXCEL_EXPORT_COLUMNS,
          [{ key: "a", name: "A", type: "text" }],
          { a: true },
        ),
      ),
    ).toBe(4);
  });

  it("disambiguates duplicate names only among enabled field columns", () => {
    const defs = [
      { key: "a", name: "メモ", type: "text" as const },
      { key: "b", name: "メモ", type: "text" as const },
    ];
    const bothOn = { a: true, b: true };
    expect(excelLeftHeaders(layout(DEFAULT_EXCEL_EXPORT_COLUMNS, defs, bothOn))).toEqual([
      "名前",
      "開始",
      "終了",
      "メモ (a)",
      "メモ (b)",
      "ノート",
    ]);
    expect(excelLeftHeaders(layout(DEFAULT_EXCEL_EXPORT_COLUMNS, defs, { a: true, b: false }))).toEqual([
      "名前",
      "開始",
      "終了",
      "メモ",
      "ノート",
    ]);
    expect(excelDuplicateFieldNames(defs, bothOn)).toEqual(new Set(["メモ"]));
    expect(excelDuplicateFieldNames(defs, { a: true, b: false })).toEqual(new Set());
    expect(excelFieldHeaderLabel(defs[0]!, excelDuplicateFieldNames(defs, { a: true, b: false }))).toBe("メモ");
  });
});
