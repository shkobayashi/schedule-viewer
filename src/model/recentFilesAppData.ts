import { invoke, isTauri } from "@tauri-apps/api/core";
import { appendRecentFile } from "./recentFiles";

const RECORD_RETRIES = 3;

export async function readRecentFilesViaTauri(): Promise<string[]> {
  if (!isTauri()) return [];
  return invoke<string[]>("read_recent_files");
}

export async function clearRecentFilesViaTauri(): Promise<string[]> {
  if (!isTauri()) return [];
  return invoke<string[]>("clear_recent_files");
}

export async function recordRecentFileViaTauri(path: string): Promise<string[]> {
  if (!isTauri()) return [];
  let expected = await readRecentFilesViaTauri();
  for (let attempt = 0; attempt < RECORD_RETRIES; attempt += 1) {
    const next = appendRecentFile(expected, path);
    const result = await invoke<string[]>("record_recent_files", {
      expectedPaths: expected,
      nextPaths: next,
    });
    if (
      result.length === next.length &&
      result.every((value, index) => value === next[index])
    ) {
      return result;
    }
    expected = result;
  }
  return expected;
}
