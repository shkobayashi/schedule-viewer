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
