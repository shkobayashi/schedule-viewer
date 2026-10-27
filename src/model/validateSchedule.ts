import validateSchema from "./generated/scheduleValidator.js";
import {
  fillMissingMilestoneConfidence,
  migrateScheduleToV2,
  migrateScheduleV3ToV4,
  migrateScheduleV4ToV5,
  migrateScheduleV5ToV6,
  migrateScheduleV6ToV7,
  migrateScheduleV7ToV8,
} from "./scheduleMigrate";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
  validateScheduleSemantics,
  type ValidationIssue,
} from "./scheduleSemantics";
import {
  normalizeScheduleFieldDefinitions,
  normalizeScheduleFieldsForValidation,
} from "./taskFields";
import { normalizeScheduleDocument } from "./taskTodos";
import type { ScheduleDocument } from "./types";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
  humanizeInstancePath,
} from "./validationMessages";

export type ValidateScheduleResult =
  | { ok: true; document: ScheduleDocument }
  | { ok: false; errors: ValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** 空や空白だけの `instruction` を外してからスキーマ検証する。 */
function normalizeScheduleLevelsInputForSchema(data: unknown): unknown {
  if (!isRecord(data) || !Array.isArray(data.levels)) return data;
  const levels = data.levels.map((entry) => {
    if (!isRecord(entry) || !("instruction" in entry)) return entry;
    const instruction = entry.instruction;
    if (typeof instruction !== "string" || instruction.trim().length > 0) {
      return entry;
    }
    const { instruction: _removed, ...rest } = entry;
    void _removed;
    return rest;
  });
  return { ...data, levels };
}

export function validateSchedule(data: unknown): ValidateScheduleResult {
  const afterV1 = migrateScheduleToV2(data);
  if (
    afterV1 != null &&
    typeof afterV1 === "object" &&
    !Array.isArray(afterV1) &&
    (afterV1 as Record<string, unknown>).schemaVersion === 2
  ) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message:
            "schemaVersion 2（担当者名 assignee）は読み込めません。assigneeId と confidence を使う schemaVersion 8 に更新してください。",
        },
      ],
    };
  }

  const migrated = migrateScheduleV7ToV8(
    migrateScheduleV6ToV7(
      migrateScheduleV5ToV6(
        fillMissingMilestoneConfidence(
          migrateScheduleV4ToV5(migrateScheduleV3ToV4(afterV1)),
        ),
      ),
    ),
  );

  const forSchema = normalizeScheduleFieldsForValidation(
    normalizeScheduleLevelsInputForSchema(migrated) as Record<string, unknown>,
  );

  if (!validateSchema(forSchema)) {
    return {
      ok: false,
      errors: formatAjvErrors(forSchema, validateSchema.errors),
    };
  }

  const raw = forSchema as ScheduleDocument;
  const document: ScheduleDocument = {
    ...raw,
    categories: raw.categories ?? [],
    fields: normalizeScheduleFieldDefinitions(raw.fields),
  };
  const semanticsInput: ScheduleDocument = {
    ...document,
    fields: raw.fields,
  };
  const errors = [
    ...validateScheduleSemantics(semanticsInput),
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
  return { ok: true, document: normalizeScheduleDocument(document) };
}

export function formatValidationErrors(errors: ValidationIssue[]): string {
  return formatIssues(errors);
}
