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
      kind: "openSaved";
      path: string;
      document: ScheduleDocument;
      baselineJson: string;
      diskContents: string;
      ignoredDraft: boolean;
    }
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
  | { kind: "missingNotice"; path: string; ignoredDraft: boolean }
  | {
      kind: "missingWithEdits";
      path: string;
      document: ScheduleDocument;
      baselineJson: string;
    }
  | {
      kind: "invalidDisk";
      message: string;
      path: string;
      ignoredDraft: boolean;
    };

export function actionIgnoresDraft(action: RecoveryStartupAction): boolean {
  return "ignoredDraft" in action && action.ignoredDraft;
}

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

function isDiskMissing(
  diskContents: string | null,
  diskReadError: string | null,
): boolean {
  if (diskReadError != null) {
    return (
      diskReadError.includes(SCHEDULE_FILE_NOT_FOUND) ||
      diskReadError.includes("見つかりません")
    );
  }
  return diskContents == null;
}

export function decideRecoveryStartup(
  lastPath: string | null,
  draftText: string | null,
  diskContents: string | null,
  diskReadError: string | null,
): RecoveryStartupAction {
  const hasDraftText = draftText != null && draftText.length > 0;
  let draft: ScheduleRecoveryDraft | null = null;
  if (hasDraftText) {
    const parsedDraft = parseRecoveryDraft(draftText);
    if (!parsedDraft.ok) {
      return { kind: "invalidDraft", message: parsedDraft.message };
    }
    draft = parsedDraft.draft;
  }

  const remembered =
    lastPath != null && lastPath.trim().length > 0 ? lastPath : null;
  let ignoredDraft = false;
  let path = remembered;
  if (path == null) {
    if (draft == null) return { kind: "none" };
    path = draft.path;
  } else if (draft != null && draft.path !== path) {
    ignoredDraft = true;
    draft = null;
  }

  if (diskReadError != null && !isDiskMissing(diskContents, diskReadError)) {
    return {
      kind: "invalidDisk",
      message: diskReadError,
      path,
      ignoredDraft,
    };
  }

  if (isDiskMissing(diskContents, diskReadError)) {
    if (draft == null) {
      return { kind: "missingNotice", path, ignoredDraft };
    }
    const docParsed = parseScheduleText(draft.documentJson);
    if (!docParsed.ok) {
      return { kind: "invalidDraft", message: docParsed.message };
    }
    const baselineParsed = parseScheduleText(draft.baselineJson);
    if (!baselineParsed.ok) {
      return { kind: "invalidDraft", message: baselineParsed.message };
    }
    return {
      kind: "missingWithEdits",
      path,
      document: docParsed.document,
      baselineJson: baselineParsed.canonicalJson,
    };
  }

  const diskParsed = parseScheduleText(diskContents ?? "");
  if (!diskParsed.ok) {
    return {
      kind: "invalidDisk",
      message: diskParsed.message,
      path,
      ignoredDraft,
    };
  }

  if (draft == null) {
    return {
      kind: "openSaved",
      path,
      document: diskParsed.document,
      baselineJson: diskParsed.canonicalJson,
      diskContents: diskContents ?? "",
      ignoredDraft,
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
      path,
      document: docParsed.document,
      baselineJson: canonicalDraft.baselineJson,
      diskContents: diskContents ?? "",
    };
  }

  return {
    kind: "conflict",
    path,
    diskContents: diskContents ?? "",
    draft: canonicalDraft,
    document: docParsed.document,
  };
}

export function serializeRecoveryDraft(draft: ScheduleRecoveryDraft): string {
  return JSON.stringify(draft);
}
