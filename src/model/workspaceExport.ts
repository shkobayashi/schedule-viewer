import { invoke, isTauri } from "@tauri-apps/api/core";
import type { FieldExtensionExportFile } from "./workspaceFieldExtensionExport";
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
  fieldExtensions: FieldExtensionExportFile[];
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
    fieldExtensions: input.fieldExtensions.map((entry) => ({
      fileName: safeScheduleJsonFilename(entry.fileName),
      contents: entry.contents,
    })),
  });
}
