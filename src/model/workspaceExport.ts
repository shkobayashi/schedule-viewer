import { invoke, isTauri } from "@tauri-apps/api/core";
import { safeScheduleJsonFilename } from "./scheduleFile";

export async function exportWorkspaceBundleViaTauri(input: {
  scheduleContents: string;
  scheduleFileName: string;
  membersContents: string | null;
  membersFileName: string | null;
  calendarContents: string | null;
  calendarFileName: string | null;
  statusesContents: string | null;
  statusesFileName: string | null;
}): Promise<void> {
  if (!isTauri()) return;
  await invoke("export_workspace_bundle", {
    scheduleFileName: safeScheduleJsonFilename(input.scheduleFileName),
    scheduleContents: input.scheduleContents,
    membersFileName: input.membersFileName
      ? safeScheduleJsonFilename(input.membersFileName)
      : null,
    membersContents: input.membersContents,
    calendarFileName: input.calendarFileName
      ? safeScheduleJsonFilename(input.calendarFileName)
      : null,
    calendarContents: input.calendarContents,
    statusesFileName: input.statusesFileName
      ? safeScheduleJsonFilename(input.statusesFileName)
      : null,
    statusesContents: input.statusesContents,
  });
}
