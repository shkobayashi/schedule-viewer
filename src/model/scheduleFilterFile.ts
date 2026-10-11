import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./scheduleFile";

export async function readScheduleFilterViaTauri(
  path?: string,
): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>("read_schedule_filter", { path: path ?? null });
}

export async function writeScheduleFilterViaTauri(
  contents: string,
): Promise<void> {
  if (!isTauri()) return;
  await invoke("write_schedule_filter", { contents });
}

export async function deleteScheduleFilterViaTauri(path: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("delete_schedule_filter", { path });
}

export async function releaseScheduleFilterViaTauri(path: string): Promise<void> {
  if (!isTauri()) return;
  await invoke("release_schedule_filter", { path });
}
