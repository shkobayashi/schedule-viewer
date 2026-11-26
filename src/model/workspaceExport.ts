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
  colorsContents: string | null;
  colorsFileName: string | null;
  fieldExtensions: FieldExtensionExportFile[];
  folder?: string | null;
}): Promise<void> {
  if (!isTauri()) return;
  const payload = {
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
    colorsFileName: input.colorsFileName
      ? safeScheduleJsonFilename(input.colorsFileName)
      : null,
    colorsContents: input.colorsContents,
    fieldExtensions: input.fieldExtensions.map((entry) => ({
      fileName: safeScheduleJsonFilename(entry.fileName),
      contents: entry.contents,
    })),
  };
  if (input.folder != null && input.folder.trim().length > 0) {
    await invoke("export_workspace_bundle_at_folder", {
      folder: input.folder.trim(),
      ...payload,
    });
    return;
  }
  await invoke("export_workspace_bundle", payload);
}
