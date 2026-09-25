import type { ScheduleDocument } from "./types";
import {
  parseScheduleText,
  SCHEDULE_FILE_NOT_FOUND,
  type ScheduleRecoveryDraft,
} from "./scheduleFile";

export type ParsedRecoveryDraft =
  | { ok: true; draft: ScheduleRecoveryDraft }
  | { ok: false; message: string };

export type RecoveryStartupAction =
  | { kind: "none" }
  | {
      kind: "restore";
      path: string;
      document: ScheduleDocument;
      baselineJson: string;
      diskContents: string;
    }
  | {
      kind: "conflict";
      path: string;
      diskContents: string;
      draft: ScheduleRecoveryDraft;
      document: ScheduleDocument;
    }
  | { kind: "invalidDraft"; message: string }
  | { kind: "diskMissing"; path: string }
  | { kind: "invalidDisk"; message: string; path: string };

export function parseRecoveryDraft(text: string): ParsedRecoveryDraft {
  const normalized = text.replace(/^\uFEFF/, "");
  let data: unknown;
  try {
    data = JSON.parse(normalized);
  } catch {
    return { ok: false, message: "復旧用の控えの形式が正しくありません。" };
  }
  if (typeof data !== "object" || data == null) {
    return { ok: false, message: "復旧用の控えの形式が正しくありません。" };
  }
  const record = data as Record<string, unknown>;
  const path = record.path;
  const baselineJson = record.baselineJson;
  const documentJson = record.documentJson;
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.trim().length === 0 ||
    typeof baselineJson !== "string" ||
    typeof documentJson !== "string"
  ) {
    return { ok: false, message: "復旧用の控えの形式が正しくありません。" };
  }
  const docParsed = parseScheduleText(documentJson);
  if (!docParsed.ok) {
    return {
      ok: false,
      message: `復旧用の控えの内容が検証できません。${docParsed.message}`,
    };
  }
  const baselineParsed = parseScheduleText(baselineJson);
  if (!baselineParsed.ok) {
    return {
      ok: false,
      message: `復旧用の控えの基準が検証できません。${baselineParsed.message}`,
    };
  }
  return {
    ok: true,
    draft: { path, baselineJson, documentJson },
  };
}

export function decideRecoveryStartup(
  draftText: string | null,
  diskContents: string | null,
  diskReadError: string | null,
): RecoveryStartupAction {
  if (draftText == null || draftText.length === 0) {
    return { kind: "none" };
  }
  const parsedDraft = parseRecoveryDraft(draftText);
  if (!parsedDraft.ok) {
    return { kind: "invalidDraft", message: parsedDraft.message };
  }
  const { draft } = parsedDraft;

  if (diskReadError != null) {
    if (
      diskReadError.includes(SCHEDULE_FILE_NOT_FOUND) ||
      diskReadError.includes("見つかりません")
    ) {
      return { kind: "diskMissing", path: draft.path };
    }
    return { kind: "invalidDisk", message: diskReadError, path: draft.path };
  }
  if (diskContents == null) {
    return { kind: "diskMissing", path: draft.path };
  }

  const diskParsed = parseScheduleText(diskContents);
  if (!diskParsed.ok) {
    return {
      kind: "invalidDisk",
      message: diskParsed.message,
      path: draft.path,
    };
  }

  const docParsed = parseScheduleText(draft.documentJson);
  if (!docParsed.ok) {
    return { kind: "invalidDraft", message: docParsed.message };
  }
  const baselineParsed = parseScheduleText(draft.baselineJson);
  if (!baselineParsed.ok) {
    return { kind: "invalidDraft", message: baselineParsed.message };
  }

  const canonicalDraft: ScheduleRecoveryDraft = {
    path: draft.path,
    baselineJson: baselineParsed.canonicalJson,
    documentJson: docParsed.canonicalJson,
  };

  if (diskParsed.canonicalJson === baselineParsed.canonicalJson) {
    return {
      kind: "restore",
      path: draft.path,
      document: docParsed.document,
      baselineJson: canonicalDraft.baselineJson,
      diskContents,
    };
  }

  return {
    kind: "conflict",
    path: draft.path,
    diskContents,
    draft: canonicalDraft,
    document: docParsed.document,
  };
}

export function serializeRecoveryDraft(draft: ScheduleRecoveryDraft): string {
  return JSON.stringify(draft);
}
