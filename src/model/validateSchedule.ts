import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../../docs/schedule.schema.json";
import {
  validatePredecessorRefs,
  validateScheduleSemantics,
  type ValidationIssue,
} from "./scheduleSemantics";
import type { ScheduleDocument } from "./types";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function formatAjvErrors(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  if (!errors) return [];
  return errors.map((error) => ({
    path: error.instancePath || "/",
    message: error.message ?? "スキーマ違反",
  }));
}

export type ValidateScheduleResult =
  | { ok: true; document: ScheduleDocument }
  | { ok: false; errors: ValidationIssue[] };

export function validateSchedule(data: unknown): ValidateScheduleResult {
  if (!validateSchema(data)) {
    return { ok: false, errors: formatAjvErrors(validateSchema.errors) };
  }

  const document = data as ScheduleDocument;
  const errors = [
    ...validateScheduleSemantics(document),
    ...validatePredecessorRefs(document),
  ];
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document };
}

export function formatValidationErrors(errors: ValidationIssue[]): string {
  return errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
}
