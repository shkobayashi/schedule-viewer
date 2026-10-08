import validateSchema from "./generated/scheduleValidator.js";
import {
  fillMissingMilestoneConfidence,
  migrateScheduleToV2,
  migrateScheduleV3ToV4,
  migrateScheduleV4ToV5,
  migrateScheduleV5ToV6,
  migrateScheduleV6ToV7,
} from "./scheduleMigrate";
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

export type ValidateScheduleResult =
  | { ok: true; document: ScheduleDocument }
  | { ok: false; errors: ValidationIssue[] };

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
            "schemaVersion 2（担当者名 assignee）は読み込めません。assigneeId と confidence を使う schemaVersion 7 に更新してください。",
        },
      ],
    };
  }

  const migrated = migrateScheduleV6ToV7(
    migrateScheduleV5ToV6(
      fillMissingMilestoneConfidence(
        migrateScheduleV4ToV5(migrateScheduleV3ToV4(afterV1)),
      ),
    ),
  );

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
