export type RowDensity = "comfortable" | "compact";

export type SidebarColumnId = "start" | "end" | "duration" | "progress";

export type SidebarColumnsPreference = Record<SidebarColumnId, boolean>;

export const ROW_DENSITY_LS_KEY = "schedule-viewer/row-density";
export const SHOW_LIGHTNING_LS_KEY = "schedule-viewer/show-lightning";
export const SIDEBAR_COLUMNS_LS_KEY = "schedule-viewer/sidebar-columns";

export const SIDEBAR_COLUMN_LABELS: Record<SidebarColumnId, string> = {
  start: "開始",
  end: "終了",
  duration: "日数",
  progress: "進捗",
};

export const DEFAULT_SIDEBAR_COLUMNS: SidebarColumnsPreference = {
  start: false,
  end: false,
  duration: false,
  progress: false,
};

export function parseRowDensity(raw: string | null): RowDensity {
  if (raw === "compact") return "compact";
  return "comfortable";
}

export function readRowDensity(): RowDensity {
  try {
    return parseRowDensity(localStorage.getItem(ROW_DENSITY_LS_KEY));
  } catch {
    return "comfortable";
  }
}

export function writeRowDensity(value: RowDensity): void {
  try {
    localStorage.setItem(ROW_DENSITY_LS_KEY, value);
  } catch {
    // ignore
  }
}

export function parseShowLightning(raw: string | null): boolean {
  if (raw == null || raw === "") return true;
  return raw !== "0" && raw !== "false";
}

export function readShowLightning(): boolean {
  try {
    return parseShowLightning(localStorage.getItem(SHOW_LIGHTNING_LS_KEY));
  } catch {
    return true;
  }
}

export function writeShowLightning(value: boolean): void {
  try {
    localStorage.setItem(SHOW_LIGHTNING_LS_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
}

export function parseSidebarColumns(raw: string | null): SidebarColumnsPreference {
  if (raw == null || raw.trim() === "") return { ...DEFAULT_SIDEBAR_COLUMNS };
  try {
    const parsed = JSON.parse(raw) as Partial<SidebarColumnsPreference>;
    return {
      start: parsed.start === true,
      end: parsed.end === true,
      duration: parsed.duration === true,
      progress: parsed.progress === true,
    };
  } catch {
    return { ...DEFAULT_SIDEBAR_COLUMNS };
  }
}

export function readSidebarColumns(): SidebarColumnsPreference {
  try {
    return parseSidebarColumns(localStorage.getItem(SIDEBAR_COLUMNS_LS_KEY));
  } catch {
    return { ...DEFAULT_SIDEBAR_COLUMNS };
  }
}

export function writeSidebarColumns(value: SidebarColumnsPreference): void {
  try {
    localStorage.setItem(SIDEBAR_COLUMNS_LS_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}
