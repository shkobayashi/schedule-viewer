import { scheduleJsonFilename, scheduleParentDirectory } from "./scheduleFile";
import { schedulePathKey } from "./schedulePathKey";

export const RECENT_FILES_MAX = 5;

export type RecentFilesStore = {
  schedules: string[];
  workspaces: string[];
};

export function isAbsoluteSchedulePath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\\\")) {
    return true;
  }
  return trimmed.startsWith("/");
}

function parsePathList(data: unknown): string[] | null {
  if (!Array.isArray(data) || data.length > RECENT_FILES_MAX) {
    return null;
  }
  const result: string[] = [];
  for (const item of data) {
    if (typeof item !== "string" || !isAbsoluteSchedulePath(item)) {
      return null;
    }
    result.push(item);
  }
  return result;
}

/** 壊れた JSON や上限超過は空にする。旧形式の配列は schedules だけに読む。 */
export function parseRecentFilesStore(text: string): RecentFilesStore {
  const empty: RecentFilesStore = { schedules: [], workspaces: [] };
  const trimmed = text.trim();
  if (!trimmed) return empty;
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return empty;
  }
  if (Array.isArray(data)) {
    const schedules = parsePathList(data);
    return schedules ? { schedules, workspaces: [] } : empty;
  }
  if (data == null || typeof data !== "object") return empty;
  const record = data as Record<string, unknown>;
  const schedules = parsePathList(record.schedules);
  const workspaces = parsePathList(record.workspaces);
  if (!schedules || !workspaces) return empty;
  return { schedules, workspaces };
}

/** @deprecated parseRecentFilesStore を使う */
export function parseRecentFilesJson(text: string): string[] {
  return parseRecentFilesStore(text).schedules;
}

export function serializeRecentFilesStore(store: RecentFilesStore): string {
  return JSON.stringify(store);
}

/** @deprecated serializeRecentFilesStore を使う */
export function serializeRecentFiles(paths: string[]): string {
  return serializeRecentFilesStore({ schedules: paths, workspaces: [] });
}

function appendPath(paths: string[], openedPath: string): string[] {
  if (!isAbsoluteSchedulePath(openedPath)) return paths;
  const key = schedulePathKey(openedPath);
  const without = paths.filter((p) => schedulePathKey(p) !== key);
  return [openedPath, ...without].slice(0, RECENT_FILES_MAX);
}

export function appendRecentSchedule(
  store: RecentFilesStore,
  openedPath: string,
): RecentFilesStore {
  return {
    ...store,
    schedules: appendPath(store.schedules, openedPath),
  };
}

export function appendRecentWorkspace(
  store: RecentFilesStore,
  openedPath: string,
): RecentFilesStore {
  return {
    ...store,
    workspaces: appendPath(store.workspaces, openedPath),
  };
}

/** @deprecated appendRecentSchedule を使う */
export function appendRecentFile(paths: string[], openedPath: string): string[] {
  return appendRecentSchedule(
    { schedules: paths, workspaces: [] },
    openedPath,
  ).schedules;
}

export type RecentFileMenuEntry = {
  path: string;
  label: string;
};

function parentFolderName(path: string): string | null {
  const parent = scheduleParentDirectory(path);
  if (!parent) return null;
  const name = scheduleJsonFilename(parent);
  if (!name || name.includes("/") || name.includes("\\")) return null;
  return name;
}

export function recentFileMenuEntries(paths: string[]): RecentFileMenuEntry[] {
  const filenames = paths.map((p) => scheduleJsonFilename(p) ?? p);
  const counts = new Map<string, number>();
  for (const name of filenames) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return paths.map((path) => {
    const filename = scheduleJsonFilename(path) ?? path;
    const duplicate = (counts.get(filename) ?? 0) > 1;
    if (!duplicate) {
      return { path, label: filename };
    }
    const parentName = parentFolderName(path);
    if (!parentName) {
      return { path, label: filename };
    }
    return { path, label: `${filename}（${parentName}）` };
  });
}

export function recentFileCommandPaletteLabel(menuLabel: string): string {
  return `最近開いたファイル ${menuLabel}`;
}
