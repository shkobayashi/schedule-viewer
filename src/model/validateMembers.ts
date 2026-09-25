import validateSchema from "./generated/membersValidator.js";
import {
  validateMembersSemantics,
  type ValidationIssue,
} from "./membersSemantics";
import type { MembersDocument } from "./memberTypes";
import { MEMBERS_SCHEMA_VERSION } from "./memberTypes";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
} from "./validationMessages";

export type ValidateMembersResult =
  | { ok: true; document: MembersDocument }
  | { ok: false; errors: ValidationIssue[] };

export function validateMembers(data: unknown): ValidateMembersResult {
  if (!validateSchema(data)) {
    return {
      ok: false,
      errors: formatAjvErrors(data, validateSchema.errors),
    };
  }
  const document = data as MembersDocument;
  if (document.schemaVersion !== MEMBERS_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          message: `メンバー JSON の schemaVersion は ${MEMBERS_SCHEMA_VERSION} である必要があります`,
        },
      ],
    };
  }
  const errors = validateMembersSemantics(document);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, document };
}

export function formatMembersValidationErrors(errors: ValidationIssue[]): string {
  return formatIssues(errors);
}
