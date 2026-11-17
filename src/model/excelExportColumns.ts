import type { ScheduleExportFormat } from "./exportHtml";
import type { ScheduleFieldDef } from "./types";

export type ExcelExportColumnId =
  | "assignee"
  | "start"
  | "end"
  | "status"
  | "predecessors"
  | "progress"
  | "todos"
  | "note";

export type ExcelExportColumnsPreference = Record<
  ExcelExportColumnId,
  boolean
>;

export type ExcelExportFieldColumnsPreference = Record<string, boolean>;

export const EXCEL_EXPORT_COLUMNS_LS_KEY =
  "schedule-viewer/excel-export-columns";

export const EXCEL_EXPORT_FIELD_COLUMNS_LS_KEY =
  "schedule-viewer/excel-export-field-columns";

export const EXCEL_EXPORT_COLUMN_LABELS: Record<ExcelExportColumnId, string> =
  {
    assignee: "担当",
    start: "開始",
    end: "終了",
    status: "ステータス",
    predecessors: "先行",
    progress: "進捗",
    todos: "TODO",
    note: "ノート",
  };

export const EXCEL_EXPORT_COLUMN_ORDER: readonly ExcelExportColumnId[] = [
  "assignee",
  "start",
  "end",
  "status",
  "predecessors",
  "progress",
  "todos",
  "note",
];

export const DEFAULT_EXCEL_EXPORT_COLUMNS: ExcelExportColumnsPreference = {
  assignee: false,
  start: true,
  end: true,
  status: false,
  predecessors: false,
  progress: false,
  todos: false,
  note: true,
};

function parseExcelExportColumns(
  raw: string | null,
): ExcelExportColumnsPreference {
  if (!raw) return { ...DEFAULT_EXCEL_EXPORT_COLUMNS };
  try {
    const parsed = JSON.parse(raw) as Partial<ExcelExportColumnsPreference>;
    const next = { ...DEFAULT_EXCEL_EXPORT_COLUMNS };
    for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
      if (typeof parsed[id] === "boolean") {
        next[id] = parsed[id]!;
      }
    }
    return next;
  } catch {
    return { ...DEFAULT_EXCEL_EXPORT_COLUMNS };
  }
}

export function readExcelExportColumns(): ExcelExportColumnsPreference {
  try {
    return parseExcelExportColumns(
      localStorage.getItem(EXCEL_EXPORT_COLUMNS_LS_KEY),
    );
  } catch {
    return { ...DEFAULT_EXCEL_EXPORT_COLUMNS };
  }
}

export function writeExcelExportColumns(
  value: ExcelExportColumnsPreference,
): void {
  try {
    localStorage.setItem(EXCEL_EXPORT_COLUMNS_LS_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function defaultExcelExportFieldColumns(
  fieldKeys: readonly string[],
): ExcelExportFieldColumnsPreference {
  const next: ExcelExportFieldColumnsPreference = {};
  for (const key of fieldKeys) {
    next[key] = false;
  }
  return next;
}

function parseExcelExportFieldColumns(
  raw: string | null,
  fieldKeys: readonly string[],
): ExcelExportFieldColumnsPreference {
  const next = defaultExcelExportFieldColumns(fieldKeys);
  if (!raw) return next;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const key of fieldKeys) {
      if (typeof parsed[key] === "boolean") {
        next[key] = parsed[key] as boolean;
      }
    }
    return next;
  } catch {
    return next;
  }
}

export function readExcelExportFieldColumns(
  fieldDefs: readonly Pick<ScheduleFieldDef, "key">[],
): ExcelExportFieldColumnsPreference {
  const keys = fieldDefs.map((field) => field.key);
  try {
    return parseExcelExportFieldColumns(
      localStorage.getItem(EXCEL_EXPORT_FIELD_COLUMNS_LS_KEY),
      keys,
    );
  } catch {
    return defaultExcelExportFieldColumns(keys);
  }
}

export function writeExcelExportFieldColumns(
  value: ExcelExportFieldColumnsPreference,
): void {
  try {
    localStorage.setItem(
      EXCEL_EXPORT_FIELD_COLUMNS_LS_KEY,
      JSON.stringify(value),
    );
  } catch {
    // ignore
  }
}

export function excelFieldHeaderLabel(
  field: { key: string; name: string },
  duplicateNames: ReadonlySet<string>,
): string {
  if (duplicateNames.has(field.name)) {
    return `${field.name} (${field.key})`;
  }
  return field.name;
}

export function excelDuplicateFieldNames(
  fieldDefs: readonly { key: string; name: string }[],
  excelFieldColumns: ExcelExportFieldColumnsPreference,
): Set<string> {
  const counts = new Map<string, number>();
  for (const field of fieldDefs) {
    if (!excelFieldColumns[field.key]) continue;
    counts.set(field.name, (counts.get(field.name) ?? 0) + 1);
  }
  const duplicates = new Set<string>();
  for (const [name, count] of counts) {
    if (count > 1) duplicates.add(name);
  }
  return duplicates;
}

export type ExcelLeftColumnLayoutInput = {
  excelColumns: ExcelExportColumnsPreference;
  fieldDefs: readonly ScheduleFieldDef[];
  excelFieldColumns: ExcelExportFieldColumnsPreference;
};

export function excelLeftHeaders(input: ExcelLeftColumnLayoutInput): string[] {
  const duplicateNames = excelDuplicateFieldNames(
    input.fieldDefs,
    input.excelFieldColumns,
  );
  const headers = ["名前"];
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (id === "note") continue;
    if (input.excelColumns[id]) {
      headers.push(EXCEL_EXPORT_COLUMN_LABELS[id]);
    }
  }
  for (const field of input.fieldDefs) {
    if (input.excelFieldColumns[field.key]) {
      headers.push(excelFieldHeaderLabel(field, duplicateNames));
    }
  }
  if (input.excelColumns.note) {
    headers.push(EXCEL_EXPORT_COLUMN_LABELS.note);
  }
  return headers;
}

export function excelLeftColumnCount(input: ExcelLeftColumnLayoutInput): number {
  return excelLeftHeaders(input).length;
}

export function excelNoteColumnIndex(
  input: ExcelLeftColumnLayoutInput,
): number | null {
  if (!input.excelColumns.note) return null;
  let index = 0;
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (id === "note") break;
    if (input.excelColumns[id]) index += 1;
  }
  for (const field of input.fieldDefs) {
    if (input.excelFieldColumns[field.key]) index += 1;
  }
  index += 1;
  return index;
}

const EXCEL_EXPORT_COLUMN_ID_SET = new Set<string>(EXCEL_EXPORT_COLUMN_ORDER);

export function mergeExcelExportColumnsPreference(
  base: ExcelExportColumnsPreference,
  overlay: Partial<ExcelExportColumnsPreference>,
): ExcelExportColumnsPreference {
  const next = { ...base };
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (typeof overlay[id] === "boolean") {
      next[id] = overlay[id]!;
    }
  }
  return next;
}

export function mergeExcelExportFieldColumnsPreference(
  base: ExcelExportFieldColumnsPreference,
  overlay: ExcelExportFieldColumnsPreference,
): ExcelExportFieldColumnsPreference {
  const next = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (typeof value === "boolean") {
      next[key] = value;
    }
  }
  return next;
}

function parseMcpExcelColumnsPatch(
  value: unknown,
):
  | { ok: true; patch: Partial<ExcelExportColumnsPreference> }
  | { ok: false; message: string } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      message:
        "excelColumns はオブジェクトで、各列 id を true か false で指定してください。",
    };
  }
  const record = value as Record<string, unknown>;
  const patch: Partial<ExcelExportColumnsPreference> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!EXCEL_EXPORT_COLUMN_ID_SET.has(key)) {
      return {
        ok: false,
        message: `excelColumns に未知の列があります: ${key}`,
      };
    }
    if (typeof raw !== "boolean") {
      return {
        ok: false,
        message: `excelColumns の ${key} は true か false だけにしてください。`,
      };
    }
    patch[key as ExcelExportColumnId] = raw;
  }
  return { ok: true, patch };
}

function parseMcpExcelFieldColumnsPatch(
  value: unknown,
  fieldKeys: ReadonlySet<string>,
):
  | { ok: true; patch: ExcelExportFieldColumnsPreference }
  | { ok: false; message: string } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      message:
        "excelFieldColumns はオブジェクトで、各追加項目の key を true か false で指定してください。",
    };
  }
  const record = value as Record<string, unknown>;
  const patch: ExcelExportFieldColumnsPreference = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!fieldKeys.has(key)) {
      return {
        ok: false,
        message: `excelFieldColumns に未知の追加項目があります: ${key}`,
      };
    }
    if (typeof raw !== "boolean") {
      return {
        ok: false,
        message: `excelFieldColumns の ${key} は true か false だけにしてください。`,
      };
    }
    patch[key] = raw;
  }
  return { ok: true, patch };
}

export type ResolveFileActionExportColumnsInput = {
  format: ScheduleExportFormat;
  excelColumns: unknown;
  excelFieldColumns: unknown;
  fieldDefs: readonly Pick<ScheduleFieldDef, "key">[];
  savedExcelColumns: ExcelExportColumnsPreference;
  savedExcelFieldColumns: ExcelExportFieldColumnsPreference;
};

export type ResolveFileActionExportColumnsResult =
  | {
      ok: true;
      excelColumns?: ExcelExportColumnsPreference;
      excelFieldColumns?: ExcelExportFieldColumnsPreference;
    }
  | { ok: false; message: string };

/**
 * MCP / CLI の file_action export 向け。省略時は保存済みの書き出し列設定を使う。
 * 渡した項目だけがその 1 回の書き出しを上書きし、localStorage は変えない。
 */
export function resolveFileActionExportColumns(
  input: ResolveFileActionExportColumnsInput,
): ResolveFileActionExportColumnsResult {
  const hasFixed = input.excelColumns !== undefined;
  const hasField = input.excelFieldColumns !== undefined;

  if (input.format !== "xlsx") {
    if (hasFixed || hasField) {
      return {
        ok: false,
        message:
          "html または svg の書き出しでは excelColumns と excelFieldColumns は使えません。",
      };
    }
    return { ok: true };
  }

  const fieldKeys = new Set(input.fieldDefs.map((field) => field.key));
  let excelColumns = input.savedExcelColumns;
  let excelFieldColumns = input.savedExcelFieldColumns;

  if (hasFixed) {
    const parsed = parseMcpExcelColumnsPatch(input.excelColumns);
    if (!parsed.ok) return parsed;
    excelColumns = mergeExcelExportColumnsPreference(
      input.savedExcelColumns,
      parsed.patch,
    );
  }

  if (hasField) {
    const parsed = parseMcpExcelFieldColumnsPatch(
      input.excelFieldColumns,
      fieldKeys,
    );
    if (!parsed.ok) return parsed;
    excelFieldColumns = mergeExcelExportFieldColumnsPreference(
      input.savedExcelFieldColumns,
      parsed.patch,
    );
  }

  return { ok: true, excelColumns, excelFieldColumns };
}

export function excelTodosColumnIndex(
  input: ExcelLeftColumnLayoutInput,
): number | null {
  if (!input.excelColumns.todos) return null;
  let index = 0;
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (id === "note") break;
    if (input.excelColumns[id]) {
      index += 1;
      if (id === "todos") return index;
    }
  }
  return index;
}
