import validateSchema from "./generated/workspaceValidator.js";
import type { WorkspaceDocument } from "./workspaceTypes";
import type { ValidationIssue } from "./membersSemantics";
import { isWorkspaceRelativePath } from "./workspacePath";
import { formatAjvErrors } from "./validationMessages";

export type ValidateWorkspaceResult =
  | { ok: true; document: WorkspaceDocument }
  | { ok: false; errors: ValidationIssue[] };

function schemaIssues(data: unknown): ValidationIssue[] {
  if (validateSchema(data)) return [];
  return formatAjvErrors(data, validateSchema.errors);
}

function relativePathIssues(
  value: string,
  field: "schedule" | "members" | "calendar" | "statuses",
): ValidationIssue | null {
  if (!isWorkspaceRelativePath(value)) {
    return {
      path: `/${field}`,
      message: "相対パスを指定してください",
    };
  }
  return null;
}

export function validateWorkspace(data: unknown): ValidateWorkspaceResult {
  const schemaErrors = schemaIssues(data);
  if (schemaErrors.length > 0) {
    return { ok: false, errors: schemaErrors };
  }
  const doc = data as WorkspaceDocument;
  const errors: ValidationIssue[] = [];
  const scheduleIssue = relativePathIssues(doc.schedule, "schedule");
  if (scheduleIssue) errors.push(scheduleIssue);
  if (doc.members != null) {
    const membersIssue = relativePathIssues(doc.members, "members");
    if (membersIssue) errors.push(membersIssue);
  }
  if (doc.calendar != null) {
    const calendarIssue = relativePathIssues(doc.calendar, "calendar");
    if (calendarIssue) errors.push(calendarIssue);
  }
  if (doc.statuses != null) {
    const statusesIssue = relativePathIssues(doc.statuses, "statuses");
    if (statusesIssue) errors.push(statusesIssue);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document: doc };
}

export function formatWorkspaceValidationErrors(
  errors: ValidationIssue[],
): string {
  if (errors.length === 0) return "設定ファイルの形式が正しくありません。";
  const first = errors[0];
  return first.message;
}
