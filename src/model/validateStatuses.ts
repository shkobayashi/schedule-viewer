import validateSchema from "./generated/statusesValidator.js";
import {
  STATUSES_SCHEMA_VERSION,
  type StatusesDocument,
} from "./statusCatalog";
import { migrateStatusesV1ToV2 } from "./statusesMigrate";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
} from "./validationMessages";

export type StatusesIssue = { path: string; message: string };

export type ValidateStatusesResult =
  | { ok: true; document: StatusesDocument }
  | { ok: false; errors: StatusesIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** schemaVersion 2 の項目に `closed` が残っていないか。 */
function rejectClosedInV2(data: unknown): StatusesIssue[] | null {
  if (!isRecord(data) || data.schemaVersion !== 2 || !Array.isArray(data.statuses)) {
    return null;
  }
  for (let i = 0; i < data.statuses.length; i += 1) {
    const item = data.statuses[i];
    if (isRecord(item) && "closed" in item) {
      return [
        {
          path: `/statuses/${i}/closed`,
          message: "schemaVersion 2 の項目には closed を書けません。role を使います。",
        },
      ];
    }
  }
  return null;
}

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

function validateV2Document(document: StatusesDocument): ValidateStatusesResult {
  const errors = validateStatusesSemantics(document);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, document };
}

export function validateStatuses(data: unknown): ValidateStatusesResult {
  if (isRecord(data) && data.schemaVersion === 1) {
    const migrated = migrateStatusesV1ToV2(data);
    if (!migrated) {
      return {
        ok: false,
        errors: [
          {
            path: "/",
            message: "ステータス JSON（schemaVersion 1）を読み取れませんでした。",
          },
        ],
      };
    }
    if (!validateSchema(migrated)) {
      return { ok: false, errors: formatAjvErrors(migrated, validateSchema.errors) };
    }
    return validateV2Document(migrated as StatusesDocument);
  }

  const closedIssue = rejectClosedInV2(data);
  if (closedIssue) {
    return { ok: false, errors: closedIssue };
  }

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
  return validateV2Document(document);
}

export function formatStatusesValidationErrors(errors: StatusesIssue[]): string {
  return formatIssues(errors);
}
