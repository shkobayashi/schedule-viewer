import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EXCEL_EXPORT_COLUMNS,
  EXCEL_EXPORT_COLUMNS_LS_KEY,
  EXCEL_EXPORT_FIELD_COLUMNS_LS_KEY,
  excelDuplicateFieldNames,
  excelFieldHeaderLabel,
  excelLeftHeaders,
  excelNoteColumnIndex,
  readExcelExportFieldColumns,
  resolveFileActionExportColumns,
  writeExcelExportColumns,
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

describe("resolveFileActionExportColumns", () => {
  const fieldDefs = [{ key: "score", name: "点数", type: "number" as const }];
  const savedFixed = {
    ...DEFAULT_EXCEL_EXPORT_COLUMNS,
    assignee: true,
    note: false,
  };
  const savedField = { score: true };

  it("rejects excelColumns on html export", () => {
    expect(
      resolveFileActionExportColumns({
        format: "html",
        excelColumns: { assignee: true },
        excelFieldColumns: undefined,
        fieldDefs,
        savedExcelColumns: savedFixed,
        savedExcelFieldColumns: savedField,
      }),
    ).toEqual({
      ok: false,
      message:
        "html または svg の書き出しでは excelColumns と excelFieldColumns は使えません。",
    });
  });

  it("rejects string array excelColumns as invalid shape", () => {
    expect(
      resolveFileActionExportColumns({
        format: "xlsx",
        excelColumns: ["assignee", "start"],
        excelFieldColumns: undefined,
        fieldDefs,
        savedExcelColumns: savedFixed,
        savedExcelFieldColumns: savedField,
      }).ok,
    ).toBe(false);
  });

  it("merges sparse excelColumns patch onto saved preferences for one export", () => {
    const resolved = resolveFileActionExportColumns({
      format: "xlsx",
      excelColumns: { progress: true },
      excelFieldColumns: undefined,
      fieldDefs,
      savedExcelColumns: savedFixed,
      savedExcelFieldColumns: savedField,
    });
    expect(resolved).toEqual({
      ok: true,
      excelColumns: {
        ...savedFixed,
        progress: true,
      },
      excelFieldColumns: savedField,
    });
  });

  it("rejects unknown excelFieldColumns key before export", () => {
    expect(
      resolveFileActionExportColumns({
        format: "xlsx",
        excelColumns: undefined,
        excelFieldColumns: { unknown: true },
        fieldDefs,
        savedExcelColumns: savedFixed,
        savedExcelFieldColumns: savedField,
      }),
    ).toEqual({
      ok: false,
      message: "excelFieldColumns に未知の追加項目があります: unknown",
    });
  });

  it("uses saved preferences when column options are omitted", () => {
    expect(
      resolveFileActionExportColumns({
        format: "xlsx",
        excelColumns: undefined,
        excelFieldColumns: undefined,
        fieldDefs,
        savedExcelColumns: savedFixed,
        savedExcelFieldColumns: savedField,
      }),
    ).toEqual({
      ok: true,
      excelColumns: savedFixed,
      excelFieldColumns: savedField,
    });
  });
});

describe("resolveFileActionExportColumns with localStorage", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });
    writeExcelExportColumns({
      ...DEFAULT_EXCEL_EXPORT_COLUMNS,
      todos: true,
    });
  });

  afterEach(() => {
    memory.clear();
    vi.unstubAllGlobals();
  });

  it("resolveFileActionExportColumns does not write export overrides to localStorage", () => {
    const beforeFixed = memory.get(EXCEL_EXPORT_COLUMNS_LS_KEY);
    const beforeField = memory.get(EXCEL_EXPORT_FIELD_COLUMNS_LS_KEY);
    resolveFileActionExportColumns({
      format: "xlsx",
      excelColumns: { note: false, todos: false },
      excelFieldColumns: undefined,
      fieldDefs: [],
      savedExcelColumns: {
        ...DEFAULT_EXCEL_EXPORT_COLUMNS,
        todos: true,
      },
      savedExcelFieldColumns: {},
    });
    expect(memory.get(EXCEL_EXPORT_COLUMNS_LS_KEY)).toBe(beforeFixed);
    expect(memory.get(EXCEL_EXPORT_FIELD_COLUMNS_LS_KEY)).toBe(beforeField);
  });
});
