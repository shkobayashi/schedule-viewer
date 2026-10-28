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
import {
  formatColorsValidationErrors,
  validateColors,
} from "./validateColors";
import {
  formatFieldExtensionsValidationErrors,
  validateFieldExtensions,
} from "./validateFieldExtensions";
import type {
  WorkspaceCalendarState,
  WorkspaceColorsState,
  WorkspaceEditableFieldExtensionState,
  WorkspaceFieldExtensionsState,
  WorkspaceMemberState,
  WorkspaceStatusesState,
  WorkspaceWindowBinding,
} from "./workspaceTypes";
import type { FieldExtensionDocument } from "./fieldExtensionTypes";
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
export const WORKSPACE_COLORS_MAX_BYTES = 2 * 1024 * 1024;
export const WORKSPACE_FIELD_EXTENSIONS_MAX_BYTES = 2 * 1024 * 1024;

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

function mapColorsReadError(error: unknown): string {
  const message = errorMessage(error, "色の一覧を読み込めませんでした。");
  if (message === SCHEDULE_FILE_NOT_FOUND) {
    return "色の一覧を読み込めませんでした。";
  }
  if (error instanceof SyntaxError) {
    return "色の一覧 JSON の形式が正しくありません。";
  }
  if (message.startsWith("Unexpected token") || message.startsWith("JSON")) {
    return "色の一覧 JSON の形式が正しくありません。";
  }
  return message;
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

async function loadColorsAtPath(path: string): Promise<WorkspaceColorsState> {
  if (!isTauri()) {
    return {
      kind: "error",
      message: "色の一覧を読み込めませんでした。",
    };
  }
  try {
    const text = await readJsonFileLimitedViaTauri(
      path,
      WORKSPACE_COLORS_MAX_BYTES,
    );
    let data: unknown;
    try {
      data = JSON.parse(stripUtf8Bom(text));
    } catch {
      return {
        kind: "error",
        message: "色の一覧 JSON の形式が正しくありません。",
      };
    }
    const result = validateColors(data);
    if (!result.ok) {
      return {
        kind: "error",
        message: formatColorsValidationErrors(result.errors),
      };
    }
    return {
      kind: "loaded",
      label: scheduleJsonFilename(path) ?? path,
      items: result.document.colors,
    };
  } catch (error) {
    return {
      kind: "error",
      message: mapColorsReadError(error),
    };
  }
}

async function loadFieldExtensionsAtPaths(
  paths: readonly string[],
): Promise<WorkspaceFieldExtensionsState> {
  if (paths.length === 0) {
    return { kind: "unset" };
  }
  if (!isTauri()) {
    return {
      kind: "error",
      message: "拡張項目を読み込めませんでした。",
    };
  }
  const documents: FieldExtensionDocument[] = [];
  const loadedPaths: string[] = [];
  const seenPluginIds = new Set<string>();
  try {
    for (const path of paths) {
      const text = await readJsonFileLimitedViaTauri(
        path,
        WORKSPACE_FIELD_EXTENSIONS_MAX_BYTES,
      );
      let data: unknown;
      try {
        data = JSON.parse(stripUtf8Bom(text));
      } catch {
        return {
          kind: "error",
          message: "拡張項目 JSON の形式が正しくありません。",
        };
      }
      const result = validateFieldExtensions(data);
      if (!result.ok) {
        return {
          kind: "error",
          message: formatFieldExtensionsValidationErrors(result.errors),
        };
      }
      if (seenPluginIds.has(result.document.id)) {
        return {
          kind: "error",
          message: "設定ファイルに同じプラグイン ID の拡張が複数あります。",
        };
      }
      seenPluginIds.add(result.document.id);
      documents.push(result.document);
      loadedPaths.push(path);
    }
    return { kind: "loaded", documents, paths: loadedPaths };
  } catch (error) {
    return {
      kind: "error",
      message: errorMessage(error, "拡張項目を読み込めませんでした。"),
    };
  }
}

async function loadSingleFieldExtensionAtPath(
  path: string,
): Promise<
  | { ok: true; document: FieldExtensionDocument }
  | { ok: false; message: string }
> {
  if (!isTauri()) {
    return { ok: false, message: "拡張項目を読み込めませんでした。" };
  }
  try {
    const text = await readJsonFileLimitedViaTauri(
      path,
      WORKSPACE_FIELD_EXTENSIONS_MAX_BYTES,
    );
    let data: unknown;
    try {
      data = JSON.parse(stripUtf8Bom(text));
    } catch {
      return {
        ok: false,
        message: "拡張項目 JSON の形式が正しくありません。",
      };
    }
    const result = validateFieldExtensions(data);
    if (!result.ok) {
      return {
        ok: false,
        message: formatFieldExtensionsValidationErrors(result.errors),
      };
    }
    return { ok: true, document: result.document };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error, "拡張項目を読み込めませんでした。"),
    };
  }
}

async function loadEditableFieldExtension(
  path: string,
  relativePath: string,
  pinnedPluginIds: ReadonlySet<string>,
): Promise<WorkspaceEditableFieldExtensionState> {
  const loaded = await loadSingleFieldExtensionAtPath(path);
  if (!loaded.ok) {
    return { kind: "error", message: loaded.message };
  }
  if (pinnedPluginIds.has(loaded.document.id)) {
    return {
      kind: "error",
      message:
        "編集用の拡張のプラグイン ID が、ピン留めの拡張と重なっています。",
    };
  }
  return {
    kind: "loaded",
    document: loaded.document,
    path,
    relativePath,
  };
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
  let colors: WorkspaceColorsState = { kind: "unset" };
  if (parsed.document.colors != null) {
    if (resolved.colorsPath) {
      colors = await loadColorsAtPath(resolved.colorsPath);
    } else {
      colors = {
        kind: "error",
        message: "色の一覧を読み込めませんでした。",
      };
    }
  }
  let fieldExtensions: WorkspaceFieldExtensionsState = { kind: "unset" };
  if (
    parsed.document.fieldExtensions != null &&
    parsed.document.fieldExtensions.length > 0
  ) {
    fieldExtensions = await loadFieldExtensionsAtPaths(
      resolved.fieldExtensionPaths,
    );
  }
  const pinnedPluginIds = new Set<string>(
    fieldExtensions.kind === "loaded"
      ? fieldExtensions.documents.map((doc) => doc.id)
      : [],
  );
  let editableFieldExtension: WorkspaceEditableFieldExtensionState = {
    kind: "unset",
  };
  if (parsed.document.editableFieldExtension != null) {
    if (resolved.editableFieldExtensionPath) {
      editableFieldExtension = await loadEditableFieldExtension(
        resolved.editableFieldExtensionPath,
        parsed.document.editableFieldExtension,
        pinnedPluginIds,
      );
    } else {
      editableFieldExtension = {
        kind: "error",
        message: "拡張項目を読み込めませんでした。",
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
      colors,
      fieldExtensions,
      editableFieldExtension,
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

export function workspaceColorsForDisplay(
  colors: WorkspaceColorsState,
): import("./colorCatalog").ColorItem[] | null {
  if (colors.kind === "loaded") return [...colors.items];
  return null;
}

export function workspaceColorsCatalogLabel(
  colors: WorkspaceColorsState,
): string | null {
  if (colors.kind === "loaded") return colors.label;
  if (colors.kind === "unset") return null;
  return null;
}

export function workspaceColorsError(
  colors: WorkspaceColorsState,
): string | null {
  return colors.kind === "error" ? colors.message : null;
}

export function workspaceFieldExtensionsForDisplay(
  fieldExtensions: WorkspaceFieldExtensionsState,
): FieldExtensionDocument[] | null {
  if (fieldExtensions.kind === "loaded") return [...fieldExtensions.documents];
  return null;
}

export function workspaceMergedFieldExtensionsForDisplay(
  fieldExtensions: WorkspaceFieldExtensionsState,
  editable: WorkspaceEditableFieldExtensionState,
): FieldExtensionDocument[] {
  const pinned = workspaceFieldExtensionsForDisplay(fieldExtensions) ?? [];
  if (editable.kind === "loaded") {
    return [...pinned, editable.document];
  }
  return pinned;
}

export function workspaceFieldExtensionsError(
  fieldExtensions: WorkspaceFieldExtensionsState,
): string | null {
  return fieldExtensions.kind === "error" ? fieldExtensions.message : null;
}

export function workspaceEditableFieldExtensionError(
  editable: WorkspaceEditableFieldExtensionState,
): string | null {
  return editable.kind === "error" ? editable.message : null;
}

export function workspacePinnedFieldExtensionPluginIds(
  fieldExtensions: WorkspaceFieldExtensionsState,
): readonly string[] {
  if (fieldExtensions.kind !== "loaded") return [];
  return fieldExtensions.documents.map((doc) => doc.id);
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
  fieldExtensionsLabel: string;
  editableFieldExtensionLabel: string;
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
  const fieldExtensionsLabel =
    binding.fieldExtensions.kind === "loaded"
      ? binding.fieldExtensions.documents.map((doc) => doc.name).join("、")
      : binding.document.fieldExtensions == null ||
          binding.document.fieldExtensions.length === 0
        ? "なし"
        : binding.document.fieldExtensions
            .map((relative) => workspaceSidecarLabel(relative))
            .join("、");
  const editableFieldExtensionLabel =
    binding.editableFieldExtension.kind === "loaded"
      ? binding.editableFieldExtension.document.name
      : binding.document.editableFieldExtension == null
        ? "未作成"
        : workspaceSidecarLabel(binding.document.editableFieldExtension);
  return {
    membersLabel,
    calendarLabel,
    statusesLabel,
    fieldExtensionsLabel,
    editableFieldExtensionLabel,
  };
}
