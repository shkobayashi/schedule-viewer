import { invoke, isTauri } from "@tauri-apps/api/core";
import { stripUtf8Bom } from "./memberAppData";
import { validateMembers, formatMembersValidationErrors } from "./validateMembers";
import { validateCalendar, formatCalendarValidationErrors } from "./validateCalendar";
import type { Member } from "./memberTypes";
import type { CalendarDocument } from "./calendarTypes";
import {
  parseWorkspaceText,
  resolveWorkspacePaths,
  workspaceSidecarLabel,
} from "./workspaceJson";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "./validateStatuses";
import type {
  WorkspaceCalendarState,
  WorkspaceMemberState,
  WorkspaceStatusesState,
  WorkspaceWindowBinding,
} from "./workspaceTypes";
import {
  MAX_SCHEDULE_BYTES,
  parseScheduleText,
  SCHEDULE_FILE_NOT_FOUND,
  scheduleJsonFilename,
} from "./scheduleFile";
import { schedulePathKey } from "./schedulePathKey";
import { workspaceFileDisplayLabel } from "./workspaceDisplay";
import { classifyOpenedJson } from "./workspaceJson";
import { errorMessage } from "./errors";

export const WORKSPACE_MEMBERS_MAX_BYTES = 2 * 1024 * 1024;
export const WORKSPACE_CALENDAR_MAX_BYTES = 2 * 1024 * 1024;
export const WORKSPACE_STATUSES_MAX_BYTES = 2 * 1024 * 1024;

export const WORKSPACE_STARTUP_FAILED_MESSAGE =
  "設定ファイルを読み込めませんでした。中のスケジュールは開いていません。";

function mapMembersReadError(error: unknown): string {
  const message = errorMessage(error, "メンバー設定を読み込めませんでした。");
  if (message === SCHEDULE_FILE_NOT_FOUND) {
    return "メンバー設定を読み込めませんでした。";
  }
  if (error instanceof SyntaxError) {
    return "メンバー JSON の形式が正しくありません。";
  }
  if (message.startsWith("Unexpected token") || message.startsWith("JSON")) {
    return "メンバー JSON の形式が正しくありません。";
  }
  return message;
}

function mapStatusesReadError(error: unknown): string {
  const message = errorMessage(error, "ステータス設定を読み込めませんでした。");
  if (message === SCHEDULE_FILE_NOT_FOUND) {
    return "ステータス設定を読み込めませんでした。";
  }
  if (error instanceof SyntaxError) {
    return "ステータス JSON の形式が正しくありません。";
  }
  if (message.startsWith("Unexpected token") || message.startsWith("JSON")) {
    return "ステータス JSON の形式が正しくありません。";
  }
  return message;
}

function mapCalendarReadError(error: unknown): string {
  const message = errorMessage(error, "カレンダー設定を読み込めませんでした。");
  if (message === SCHEDULE_FILE_NOT_FOUND) {
    return "カレンダー設定を読み込めませんでした。";
  }
  if (error instanceof SyntaxError) {
    return "カレンダー JSON の形式が正しくありません。";
  }
  if (message.startsWith("Unexpected token") || message.startsWith("JSON")) {
    return "カレンダー JSON の形式が正しくありません。";
  }
  return message;
}

export async function readJsonFileLimitedViaTauri(
  path: string,
  maxBytes: number,
): Promise<string> {
  return invoke<string>("read_json_file_limited", { path, maxBytes });
}

export async function acceptOpenedWorkspaceViaTauri(
  workspacePath: string,
  schedulePath: string,
  scheduleContents: string,
): Promise<void> {
  await invoke("accept_opened_workspace", {
    workspacePath,
    schedulePath,
    scheduleContents,
  });
}

async function loadMembersAtPath(path: string): Promise<WorkspaceMemberState> {
  if (!isTauri()) {
    return { kind: "error", message: "メンバー設定を読み込めませんでした。" };
  }
  try {
    const text = await readJsonFileLimitedViaTauri(
      path,
      WORKSPACE_MEMBERS_MAX_BYTES,
    );
    let data: unknown;
    try {
      data = JSON.parse(stripUtf8Bom(text));
    } catch {
      return {
        kind: "error",
        message: "メンバー JSON の形式が正しくありません。",
      };
    }
    const result = validateMembers(data);
    if (!result.ok) {
      return {
        kind: "error",
        message: formatMembersValidationErrors(result.errors),
      };
    }
    return {
      kind: "loaded",
      label: scheduleJsonFilename(path) ?? path,
      members: result.document.members,
    };
  } catch (error) {
    return {
      kind: "error",
      message: mapMembersReadError(error),
    };
  }
}

async function loadStatusesAtPath(
  path: string,
): Promise<WorkspaceStatusesState> {
  if (!isTauri()) {
    return {
      kind: "error",
      message: "ステータス設定を読み込めませんでした。",
    };
  }
  try {
    const text = await readJsonFileLimitedViaTauri(
      path,
      WORKSPACE_STATUSES_MAX_BYTES,
    );
    let data: unknown;
    try {
      data = JSON.parse(stripUtf8Bom(text));
    } catch {
      return {
        kind: "error",
        message: "ステータス JSON の形式が正しくありません。",
      };
    }
    const result = validateStatuses(data);
    if (!result.ok) {
      return {
        kind: "error",
        message: formatStatusesValidationErrors(result.errors),
      };
    }
    return {
      kind: "loaded",
      label: scheduleJsonFilename(path) ?? path,
      items: result.document.statuses,
    };
  } catch (error) {
    return {
      kind: "error",
      message: mapStatusesReadError(error),
    };
  }
}

async function loadCalendarAtPath(path: string): Promise<WorkspaceCalendarState> {
  if (!isTauri()) {
    return { kind: "error", message: "カレンダー設定を読み込めませんでした。" };
  }
  try {
    const text = await readJsonFileLimitedViaTauri(
      path,
      WORKSPACE_CALENDAR_MAX_BYTES,
    );
    let data: unknown;
    try {
      data = JSON.parse(stripUtf8Bom(text));
    } catch {
      return {
        kind: "error",
        message: "カレンダー JSON の形式が正しくありません。",
      };
    }
    const result = validateCalendar(data);
    if (!result.ok) {
      return {
        kind: "error",
        message: formatCalendarValidationErrors(result.errors),
      };
    }
    return {
      kind: "loaded",
      label: scheduleJsonFilename(path) ?? path,
      document: result.document,
    };
  } catch (error) {
    return {
      kind: "error",
      message: mapCalendarReadError(error),
    };
  }
}

export async function loadWorkspaceBinding(
  workspacePath: string,
  workspaceText: string,
): Promise<
  | { ok: true; binding: WorkspaceWindowBinding }
  | { ok: false; message: string }
> {
  const parsed = parseWorkspaceText(workspaceText);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  const resolved = resolveWorkspacePaths(workspacePath, parsed.document);
  if (!resolved) {
    return { ok: false, message: "設定ファイルのパスを解決できません。" };
  }
  let members: WorkspaceMemberState = { kind: "unset" };
  if (parsed.document.members != null) {
    if (resolved.membersPath) {
      members = await loadMembersAtPath(resolved.membersPath);
    } else {
      members = { kind: "error", message: "メンバー設定を読み込めませんでした。" };
    }
  }
  let calendar: WorkspaceCalendarState = { kind: "unset" };
  if (parsed.document.calendar != null) {
    if (resolved.calendarPath) {
      calendar = await loadCalendarAtPath(resolved.calendarPath);
    } else {
      calendar = { kind: "error", message: "カレンダー設定を読み込めませんでした。" };
    }
  }
  let statuses: WorkspaceStatusesState = { kind: "unset" };
  if (parsed.document.statuses != null) {
    if (resolved.statusesPath) {
      statuses = await loadStatusesAtPath(resolved.statusesPath);
    } else {
      statuses = {
        kind: "error",
        message: "ステータス設定を読み込めませんでした。",
      };
    }
  }
  return {
    ok: true,
    binding: {
      workspacePath,
      document: parsed.document,
      resolved,
      members,
      calendar,
      statuses,
    },
  };
}

export function workspaceMembersForDisplay(
  members: WorkspaceMemberState,
): Member[] | null {
  if (members.kind === "loaded") return members.members;
  return null;
}

export function workspaceMemberCatalogLabel(
  members: WorkspaceMemberState,
): string | null {
  if (members.kind === "loaded") return members.label;
  if (members.kind === "unset") return null;
  return null;
}

export function workspaceCalendarForDisplay(
  calendar: WorkspaceCalendarState,
): CalendarDocument | null {
  if (calendar.kind === "loaded") return calendar.document;
  return null;
}

export function workspaceMemberError(members: WorkspaceMemberState): string | null {
  return members.kind === "error" ? members.message : null;
}

export function workspaceCalendarError(
  calendar: WorkspaceCalendarState,
): string | null {
  return calendar.kind === "error" ? calendar.message : null;
}

export function workspaceStatusesForDisplay(
  statuses: WorkspaceStatusesState,
): import("./statusCatalog").StatusItem[] | null {
  if (statuses.kind === "loaded") return [...statuses.items];
  return null;
}

export function workspaceStatusesCatalogLabel(
  statuses: WorkspaceStatusesState,
): string | null {
  if (statuses.kind === "loaded") return statuses.label;
  if (statuses.kind === "unset") return null;
  return null;
}

export function workspaceStatusesError(
  statuses: WorkspaceStatusesState,
): string | null {
  return statuses.kind === "error" ? statuses.message : null;
}

export type WorkspaceOpened = {
  binding: WorkspaceWindowBinding;
  schedulePath: string;
  scheduleContents: string;
};

export async function reloadWorkspaceFromDisk(
  workspacePath: string,
  currentSchedulePath: string | null,
): Promise<
  | { kind: "bindingOnly"; binding: WorkspaceWindowBinding }
  | { kind: "scheduleChange"; opened: WorkspaceOpened }
  | { kind: "error"; message: string }
> {
  try {
    const text = await readJsonFileLimitedViaTauri(workspacePath, 64 * 1024);
    const opened = await openWorkspaceFromFile(workspacePath, text);
    if (!opened.ok) {
      return { kind: "error", message: opened.message };
    }
    const same =
      currentSchedulePath != null &&
      schedulePathKey(currentSchedulePath) ===
        schedulePathKey(opened.schedulePath);
    if (same) {
      return { kind: "bindingOnly", binding: opened.binding };
    }
    return { kind: "scheduleChange", opened };
  } catch (error) {
    return {
      kind: "error",
      message: errorMessage(error, "設定ファイルを読み込めませんでした。"),
    };
  }
}

export async function openWorkspaceFromFile(
  workspacePath: string,
  workspaceText: string,
): Promise<
  | {
      ok: true;
      binding: WorkspaceWindowBinding;
      schedulePath: string;
      scheduleContents: string;
    }
  | { ok: false; message: string }
> {
  let data: unknown;
  try {
    data = JSON.parse(stripUtf8Bom(workspaceText));
  } catch {
    return { ok: false, message: "JSON の形式が正しくありません。" };
  }
  if (classifyOpenedJson(data) !== "workspace") {
    return { ok: false, message: "設定ファイルの形式が正しくありません。" };
  }
  const loaded = await loadWorkspaceBinding(workspacePath, workspaceText);
  if (!loaded.ok) {
    return loaded;
  }
  const schedulePath = loaded.binding.resolved.schedulePath;
  try {
    const scheduleContents = await readJsonFileLimitedViaTauri(
      schedulePath,
      MAX_SCHEDULE_BYTES,
    );
    const parsed = parseScheduleText(scheduleContents);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    return {
      ok: true,
      binding: loaded.binding,
      schedulePath,
      scheduleContents,
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "スケジュールを開けませんでした。"),
    };
  }
}

export const WORKSPACE_DESKTOP_ONLY_MESSAGE =
  "設定ファイルはデスクトップ版で開いてください。\n今の画面はそのままです。";

export const WORKSPACE_DESKTOP_ONLY_DIALOG_TITLE = "設定ファイルは開けません";

export function workspaceBindingSummary(binding: WorkspaceWindowBinding): {
  membersLabel: string;
  calendarLabel: string;
  statusesLabel: string;
} {
  const membersLabel =
    binding.members.kind === "loaded" && binding.resolved.membersPath
      ? workspaceFileDisplayLabel(binding.resolved.membersPath)
      : binding.members.kind === "loaded"
        ? binding.members.label
        : binding.document.members == null
          ? "未選択"
          : workspaceSidecarLabel(binding.document.members);
  const calendarLabel =
    binding.calendar.kind === "loaded" && binding.resolved.calendarPath
      ? workspaceFileDisplayLabel(binding.resolved.calendarPath)
      : binding.calendar.kind === "loaded"
        ? binding.calendar.label
        : binding.document.calendar == null
          ? "未設定（土日を塗る）"
          : workspaceSidecarLabel(binding.document.calendar);
  const statusesLabel =
    binding.statuses.kind === "loaded" && binding.resolved.statusesPath
      ? workspaceFileDisplayLabel(binding.resolved.statusesPath)
      : binding.statuses.kind === "loaded"
        ? binding.statuses.label
        : binding.document.statuses == null
          ? "組み込みの三件"
          : workspaceSidecarLabel(binding.document.statuses);
  return { membersLabel, calendarLabel, statusesLabel };
}
