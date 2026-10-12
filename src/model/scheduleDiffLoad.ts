import { errorMessage } from "./errors";
import {
  NO_OPEN_SCHEDULE_FILE_MESSAGE,
  formatScheduleDiff,
} from "./scheduleDiff";
import {
  isTauri,
  parseScheduleText,
  readOpenScheduleFileViaTauri,
  safeScheduleJsonFilename,
} from "./scheduleFile";

export type ScheduleDiffLoadResult =
  | { ok: true; text: string }
  | { ok: false; message: string; isError: boolean };

export async function loadScheduleDiffText(
  filePath: string | null,
  screenJson: string,
): Promise<ScheduleDiffLoadResult> {
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
    const screenParsed = parseScheduleText(screenJson);
    if (!screenParsed.ok) {
      return {
        ok: false,
        message: screenParsed.message,
        isError: true,
      };
    }
    return {
      ok: true,
      text: formatScheduleDiff(
        screenParsed.document,
        fileParsed.document,
        filename,
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
