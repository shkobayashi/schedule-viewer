import validateSchema from "./generated/calendarValidator.js";
import { validateCalendarSemantics } from "./calendarSemantics";
import type { CalendarDocument } from "./calendarTypes";
import { CALENDAR_SCHEMA_VERSION } from "./calendarTypes";
import type { ValidationIssue } from "./membersSemantics";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
} from "./validationMessages";

export type ValidateCalendarResult =
  | { ok: true; document: CalendarDocument }
  | { ok: false; errors: ValidationIssue[] };

export function validateCalendar(data: unknown): ValidateCalendarResult {
  if (!validateSchema(data)) {
    return {
      ok: false,
      errors: formatAjvErrors(data, validateSchema.errors),
    };
  }
  const document = data as CalendarDocument;
  if (document.schemaVersion !== CALENDAR_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: `カレンダー JSON の schemaVersion は ${CALENDAR_SCHEMA_VERSION} である必要があります`,
        },
      ],
    };
  }
  const errors = validateCalendarSemantics(document);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document };
}

export function formatCalendarValidationErrors(
  errors: ValidationIssue[],
): string {
  return formatIssues(errors);
}
