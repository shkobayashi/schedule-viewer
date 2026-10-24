import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  appendRecentSchedule,
  appendRecentWorkspace,
  type RecentFilesStore,
} from "./recentFiles";

const RECORD_RETRIES = 3;

const EMPTY_STORE: RecentFilesStore = { schedules: [], workspaces: [] };

export async function readRecentFilesViaTauri(): Promise<RecentFilesStore> {
  if (!isTauri()) return EMPTY_STORE;
  return invoke<RecentFilesStore>("read_recent_files");
}

export async function clearRecentFilesViaTauri(): Promise<RecentFilesStore> {
  if (!isTauri()) return EMPTY_STORE;
  return invoke<RecentFilesStore>("clear_recent_files");
}

async function recordRecentStore(next: RecentFilesStore): Promise<RecentFilesStore> {
  if (!isTauri()) return EMPTY_STORE;
  let expected = await readRecentFilesViaTauri();
  for (let attempt = 0; attempt < RECORD_RETRIES; attempt += 1) {
    const result = await invoke<RecentFilesStore>("record_recent_files", {
      expected,
      next,
    });
    if (
      result.schedules.length === next.schedules.length &&
      result.workspaces.length === next.workspaces.length &&
      result.schedules.every((value, index) => value === next.schedules[index]) &&
      result.workspaces.every((value, index) => value === next.workspaces[index])
    ) {
      return result;
    }
    expected = result;
  }
  return expected;
}

export async function recordRecentScheduleViaTauri(
  path: string,
): Promise<RecentFilesStore> {
  const current = await readRecentFilesViaTauri();
  return recordRecentStore(appendRecentSchedule(current, path));
}

export async function recordRecentWorkspaceViaTauri(
  path: string,
): Promise<RecentFilesStore> {
  const current = await readRecentFilesViaTauri();
  return recordRecentStore(appendRecentWorkspace(current, path));
}
