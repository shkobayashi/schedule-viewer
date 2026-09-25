import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../docs/schedule.schema.json";
import { migrateScheduleToV2 } from "./scheduleMigrate";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
  validateScheduleSemantics,
  type ValidationIssue,
} from "./scheduleSemantics";
import type { ScheduleDocument } from "./types";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
  humanizeInstancePath,
} from "./validationMessages";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

export type ValidateScheduleResult =
  | { ok: true; document: ScheduleDocument }
  | { ok: false; errors: ValidationIssue[] };

export function validateSchedule(data: unknown): ValidateScheduleResult {
  const migrated = migrateScheduleToV2(data);
  if (
    migrated != null &&
    typeof migrated === "object" &&
    !Array.isArray(migrated) &&
    (migrated as Record<string, unknown>).schemaVersion === 2
  ) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message:
            "schemaVersion 2（担当者名 assignee）は読み込めません。assigneeId を使う schemaVersion 3 に更新してください。",
        },
      ],
    };
  }

  if (!validateSchema(migrated)) {
    return {
      ok: false,
      errors: formatAjvErrors(migrated, validateSchema.errors),
    };
  }

  const document = migrated as ScheduleDocument;
  const errors = [
    ...validateScheduleSemantics(document),
    ...validatePredecessorRefs(document),
    ...validateDependencyCycles(document),
  ];
  if (errors.length > 0) {
    return {
      ok: false,
      errors: errors.map((issue) => ({
        ...issue,
        path: humanizeInstancePath(migrated, issue.path),
      })),
    };
  }
  return { ok: true, document };
}

export function formatValidationErrors(errors: ValidationIssue[]): string {
  return formatIssues(errors);
}
