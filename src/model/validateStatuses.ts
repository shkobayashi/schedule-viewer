import validateSchema from "./generated/statusesValidator.js";
import {
  STATUSES_SCHEMA_VERSION,
  type StatusesDocument,
} from "./statusCatalog";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
} from "./validationMessages";

export type StatusesIssue = { path: string; message: string };

export type ValidateStatusesResult =
  | { ok: true; document: StatusesDocument }
  | { ok: false; errors: StatusesIssue[] };

export function validateStatusesSemantics(doc: StatusesDocument): StatusesIssue[] {
  const issues: StatusesIssue[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < doc.statuses.length; i += 1) {
    const item = doc.statuses[i];
    const base = `/statuses/${i}`;
    if (item.id.trim().length === 0) {
      issues.push({ path: `${base}/id`, message: "ステータス ID は空白にできません" });
    }
    if (item.name.trim().length === 0) {
      issues.push({ path: `${base}/name`, message: "ステータス名は空白にできません" });
    }
    if (item.description.trim().length === 0) {
      issues.push({ path: `${base}/description`, message: "説明は空白にできません" });
    }
    if (ids.has(item.id)) {
      issues.push({ path: `${base}/id`, message: "ステータス ID が重複しています" });
    }
    ids.add(item.id);
  }
  return issues;
}

export function validateStatuses(data: unknown): ValidateStatusesResult {
  if (!validateSchema(data)) {
    return { ok: false, errors: formatAjvErrors(data, validateSchema.errors) };
  }
  const document = data as StatusesDocument;
  if (document.schemaVersion !== STATUSES_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: `ステータス JSON の schemaVersion は ${STATUSES_SCHEMA_VERSION} である必要があります`,
        },
      ],
    };
  }
  const errors = validateStatusesSemantics(document);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, document };
}

export function formatStatusesValidationErrors(errors: StatusesIssue[]): string {
  return formatIssues(errors);
}
