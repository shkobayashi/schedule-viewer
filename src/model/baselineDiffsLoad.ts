import { formatBaselineDiffsText } from "./baselineDiffs";
import { errorMessage } from "./errors";
import { NO_OPEN_SCHEDULE_FILE_MESSAGE } from "./scheduleDiff";
import {
  isTauri,
  parseScheduleText,
  readOpenScheduleFileViaTauri,
  safeScheduleJsonFilename,
} from "./scheduleFile";
import type { ScheduleFieldDef } from "./types";

export type BaselineDiffsLoadResult =
  | { ok: true; text: string }
  | { ok: false; message: string; isError: boolean };

export async function loadBaselineDiffsText(
  filePath: string | null,
  baselineJson: string,
  screenJson: string,
  fields?: readonly ScheduleFieldDef[],
): Promise<BaselineDiffsLoadResult> {
  const canCompareOnDisk =
    filePath != null &&
    (isTauri() || import.meta.env.MODE === "manual-screenshot");
  if (!canCompareOnDisk) {
    return {
      ok: false,
      message: NO_OPEN_SCHEDULE_FILE_MESSAGE,
      isError: false,
    };
  }
  const filename = safeScheduleJsonFilename(filePath);

  const baselineParsed = parseScheduleText(baselineJson);
  if (!baselineParsed.ok) {
    return {
      ok: false,
      message: baselineParsed.message,
      isError: true,
    };
  }
  const screenParsed = parseScheduleText(screenJson);
  if (!screenParsed.ok) {
    return {
      ok: false,
      message: screenParsed.message,
      isError: true,
    };
  }

  try {
    const contents =
      import.meta.env.MODE === "manual-screenshot"
        ? ((await import("../../scripts/manual-screenshot/tauri-invoke")).manualScreenshotInvoke(
            "read_open_schedule_file",
          ) as Promise<string>)
        : readOpenScheduleFileViaTauri();
    const fileText = await contents;
    const fileParsed = parseScheduleText(fileText);
    if (!fileParsed.ok) {
      return {
        ok: false,
        message: fileParsed.message,
        isError: true,
      };
    }
    return {
      ok: true,
      text: formatBaselineDiffsText(
        baselineParsed.document,
        screenParsed.document,
        fileParsed.document,
        filename,
        fields,
      ),
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: errorMessage(error, "ファイルを読めません。"),
      isError: true,
    };
  }
}
