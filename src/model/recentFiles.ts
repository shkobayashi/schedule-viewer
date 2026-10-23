import { scheduleJsonFilename, scheduleParentDirectory } from "./scheduleFile";
import { schedulePathKey } from "./schedulePathKey";

export const RECENT_FILES_MAX = 5;

export function isAbsoluteSchedulePath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\\\")) {
    return true;
  }
  return trimmed.startsWith("/");
}

/** 壊れた JSON や上限超過は空配列にする。 */
export function parseRecentFilesJson(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(data) || data.length > RECENT_FILES_MAX) {
    return [];
  }
  const result: string[] = [];
  for (const item of data) {
    if (typeof item !== "string" || !isAbsoluteSchedulePath(item)) {
      return [];
    }
    result.push(item);
  }
  return result;
}

export function serializeRecentFiles(paths: string[]): string {
  return JSON.stringify(paths);
}

export function appendRecentFile(paths: string[], openedPath: string): string[] {
  if (!isAbsoluteSchedulePath(openedPath)) return paths;
  const key = schedulePathKey(openedPath);
  const without = paths.filter((p) => schedulePathKey(p) !== key);
  return [openedPath, ...without].slice(0, RECENT_FILES_MAX);
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
