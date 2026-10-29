import { stripUtf8Bom } from "./memberAppData";
import {
  formatWorkspaceValidationErrors,
  validateWorkspace,
} from "./validateWorkspace";
import type { WorkspaceDocument, WorkspaceResolvedPaths } from "./workspaceTypes";
import { resolveWorkspaceRelativePath } from "./workspacePath";
import { scheduleJsonFilename } from "./scheduleFile";

export type OpenedJsonKind = "workspace" | "schedule" | "unsupported";

export function classifyOpenedJson(data: unknown): OpenedJsonKind {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return "unsupported";
  }
  const record = data as Record<string, unknown>;
  if ("categories" in record || "milestones" in record || "milestoneGroups" in record) {
    return "schedule";
  }
  if (Array.isArray(record.members)) return "unsupported";
  if (Array.isArray(record.statuses)) return "unsupported";
  if (Array.isArray(record.colors)) return "unsupported";
  if (Array.isArray(record.weekends)) return "unsupported";
  if (
    record.schemaVersion === 1 &&
    typeof record.id === "string" &&
    Array.isArray(record.fields)
  ) {
    return "unsupported";
  }
  if (
    record.schemaVersion === 1 &&
    typeof record.schedule === "string" &&
    !("categories" in record)
  ) {
    return "workspace";
  }
  if (typeof record.schemaVersion === "number" && record.schemaVersion >= 3) {
    return "schedule";
  }
  return "unsupported";
}

export type ParseWorkspaceResult =
  | { ok: true; document: WorkspaceDocument }
  | { ok: false; message: string };

export function parseWorkspaceText(text: string): ParseWorkspaceResult {
  const normalized = stripUtf8Bom(text);
  let data: unknown;
  try {
    data = JSON.parse(normalized);
  } catch {
    return { ok: false, message: "JSON の形式が正しくありません。" };
  }
  if (classifyOpenedJson(data) !== "workspace") {
    return { ok: false, message: "設定ファイルの形式が正しくありません。" };
  }
  const result = validateWorkspace(data);
  if (!result.ok) {
    return {
      ok: false,
      message: formatWorkspaceValidationErrors(result.errors),
    };
  }
  return { ok: true, document: result.document };
}

export function resolveWorkspacePaths(
  workspaceFilePath: string,
  document: WorkspaceDocument,
): WorkspaceResolvedPaths | null {
  const schedulePath = resolveWorkspaceRelativePath(
    workspaceFilePath,
    document.schedule,
  );
  if (!schedulePath) return null;
  const membersPath =
    document.members != null
      ? resolveWorkspaceRelativePath(workspaceFilePath, document.members)
      : null;
  if (document.members != null && !membersPath) return null;
  const calendarPath =
    document.calendar != null
      ? resolveWorkspaceRelativePath(workspaceFilePath, document.calendar)
      : null;
  if (document.calendar != null && !calendarPath) return null;
  const statusesPath =
    document.statuses != null
      ? resolveWorkspaceRelativePath(workspaceFilePath, document.statuses)
      : null;
  if (document.statuses != null && !statusesPath) return null;
  const colorsPath =
    document.colors != null
      ? resolveWorkspaceRelativePath(workspaceFilePath, document.colors)
      : null;
  if (document.colors != null && !colorsPath) return null;
  const fieldExtensionPaths: string[] = [];
  if (document.fieldExtensions != null) {
    for (const relative of document.fieldExtensions) {
      const absolute = resolveWorkspaceRelativePath(workspaceFilePath, relative);
      if (!absolute) return null;
      fieldExtensionPaths.push(absolute);
    }
  }
  let editableFieldExtensionPath: string | null = null;
  if (document.editableFieldExtension != null) {
    editableFieldExtensionPath = resolveWorkspaceRelativePath(
      workspaceFilePath,
      document.editableFieldExtension,
    );
    if (!editableFieldExtensionPath) return null;
  }
  return {
    schedulePath,
    membersPath,
    calendarPath,
    statusesPath,
    colorsPath,
    fieldExtensionPaths,
    editableFieldExtensionPath,
  };
}

export function workspaceSidecarLabel(relativePath: string): string {
  return scheduleJsonFilename(relativePath) ?? relativePath;
}

export function serializeWorkspaceDocument(
  document: WorkspaceDocument,
): string {
  const payload: WorkspaceDocument = {
    schemaVersion: 1,
    schedule: document.schedule,
  };
  if (document.members != null) payload.members = document.members;
  if (document.calendar != null) payload.calendar = document.calendar;
  if (document.statuses != null) payload.statuses = document.statuses;
  if (document.colors != null) payload.colors = document.colors;
  if (document.fieldExtensions != null && document.fieldExtensions.length > 0) {
    payload.fieldExtensions = document.fieldExtensions;
  }
  if (document.editableFieldExtension != null) {
    payload.editableFieldExtension = document.editableFieldExtension;
  }
  return `${JSON.stringify(payload, null, 2)}\n`;
}
