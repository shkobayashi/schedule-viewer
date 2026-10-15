import { MCP_SCREEN_CONTEXT_MAX_BYTES } from "./screenContext";
import {
  MAX_SCHEDULE_BYTES,
  parseScheduleText,
} from "./scheduleFile";
import type { ScheduleDocument } from "./types";

export const REPLACE_SCHEDULE_STARTUP_NOT_SETTLED =
  "起動の復旧が終わっていないので、置き換えられません。";

export const REPLACE_SCHEDULE_UI_BUSY =
  "画面の操作が途中なので、置き換えられません。";

export const REPLACE_SCHEDULE_TOO_LARGE =
  "スケジュールが大きすぎるため、置き換えられません。";

export const REPLACE_SCHEDULE_INVALID_JSON =
  "スケジュールの JSON として読めないので、置き換えられません。";

export const REPLACE_SCHEDULE_DIFF_TOO_LARGE =
  "差分が大きすぎるため、差分テキストは返せません。";

export type ReplaceScheduleGateInput = {
  startupSettled: boolean;
  /** 起動復旧の衝突・ファイル無し・不正控えのダイアログが開いている */
  startupRecoveryDialogOpen: boolean;
  uiBlocking: boolean;
};

export type ReplaceScheduleGateResult =
  | { ok: true }
  | { ok: false; message: string };

export function assessReplaceScheduleGate(
  input: ReplaceScheduleGateInput,
): ReplaceScheduleGateResult {
  if (!input.startupSettled || input.startupRecoveryDialogOpen) {
    return { ok: false, message: REPLACE_SCHEDULE_STARTUP_NOT_SETTLED };
  }
  if (input.uiBlocking) {
    return { ok: false, message: REPLACE_SCHEDULE_UI_BUSY };
  }
  return { ok: true };
}

export type ReplaceScheduleDocumentResult =
  | { outcome: "applied"; screenJson: string }
  | { outcome: "unchanged"; screenJson: string }
  | { outcome: "rejected" };

export type ReplaceScheduleParseOk = {
  ok: true;
  document: ScheduleDocument;
  canonicalJson: string;
};

export type ReplaceScheduleParseFail = {
  ok: false;
  message: string;
};

export function replaceScheduleByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function parseReplaceScheduleText(
  text: string,
): ReplaceScheduleParseOk | ReplaceScheduleParseFail {
  const byteLength = replaceScheduleByteLength(text);
  if (byteLength > MAX_SCHEDULE_BYTES) {
    return { ok: false, message: REPLACE_SCHEDULE_TOO_LARGE };
  }
  const normalized = text.replace(/^\uFEFF/, "");
  let data: unknown;
  try {
    data = JSON.parse(normalized);
  } catch {
    return { ok: false, message: REPLACE_SCHEDULE_INVALID_JSON };
  }
  const serialized =
    typeof data === "string" ? data : JSON.stringify(data);
  const parsed = parseScheduleText(serialized);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  return {
    ok: true,
    document: parsed.document,
    canonicalJson: parsed.canonicalJson,
  };
}

/** MCP の `tools/call` はスケジュール JSON 全体を arguments に渡す。 */
export function parseReplaceScheduleArguments(
  argumentsValue: unknown,
): ReplaceScheduleParseOk | ReplaceScheduleParseFail {
  if (argumentsValue == null) {
    return { ok: false, message: REPLACE_SCHEDULE_INVALID_JSON };
  }
  if (typeof argumentsValue === "string") {
    return parseReplaceScheduleText(argumentsValue);
  }
  try {
    return parseReplaceScheduleText(JSON.stringify(argumentsValue));
  } catch {
    return { ok: false, message: REPLACE_SCHEDULE_INVALID_JSON };
  }
}

export function canonicalJsonEqual(a: string, b: string): boolean {
  return a === b;
}

export type ReplaceScheduleDiffCapResult = {
  text: string;
  diffOmitted: boolean;
};

export function capReplaceScheduleDiffText(
  diffText: string,
  maxBytes = MCP_SCREEN_CONTEXT_MAX_BYTES,
): ReplaceScheduleDiffCapResult {
  if (replaceScheduleByteLength(diffText) <= maxBytes) {
    return { text: diffText, diffOmitted: false };
  }
  return { text: REPLACE_SCHEDULE_DIFF_TOO_LARGE, diffOmitted: true };
}
