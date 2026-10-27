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

export const EXCEL_EXPORT_COLUMNS_LS_KEY =
  "schedule-viewer/excel-export-columns";

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

export function excelLeftHeaders(
  columns: ExcelExportColumnsPreference,
): string[] {
  const headers = ["名前"];
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (columns[id]) {
      headers.push(EXCEL_EXPORT_COLUMN_LABELS[id]);
    }
  }
  return headers;
}

export function excelNoteColumnIndex(
  columns: ExcelExportColumnsPreference,
): number | null {
  let index = 0;
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (columns[id]) {
      index += 1;
      if (id === "note") return index;
    }
  }
  return null;
}

export function excelTodosColumnIndex(
  columns: ExcelExportColumnsPreference,
): number | null {
  let index = 0;
  for (const id of EXCEL_EXPORT_COLUMN_ORDER) {
    if (columns[id]) {
      index += 1;
      if (id === "todos") return index;
    }
  }
  return null;
}
