import validateSchema from "./generated/colorsValidator.js";
import {
  COLORS_SCHEMA_VERSION,
  type ColorsDocument,
} from "./colorCatalog";
import {
  formatAjvErrors,
  formatValidationErrors as formatIssues,
} from "./validationMessages";

export type ColorsIssue = { path: string; message: string };

export type ValidateColorsResult =
  | { ok: true; document: ColorsDocument }
  | { ok: false; errors: ColorsIssue[] };

export function validateColorsSemantics(doc: ColorsDocument): ColorsIssue[] {
  const issues: ColorsIssue[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < doc.colors.length; i += 1) {
    const item = doc.colors[i];
    const base = `/colors/${i}`;
    if (item.id.trim().length === 0) {
      issues.push({ path: `${base}/id`, message: "色 ID は空白にできません" });
    }
    if (item.name.trim().length === 0) {
      issues.push({ path: `${base}/name`, message: "名前は空白にできません" });
    }
    if (item.description.trim().length === 0) {
      issues.push({ path: `${base}/description`, message: "説明は空白にできません" });
    }
    if (ids.has(item.id)) {
      issues.push({ path: `${base}/id`, message: "色 ID が重複しています" });
    }
    ids.add(item.id);
  }
  return issues;
}

export function validateColors(data: unknown): ValidateColorsResult {
  if (!validateSchema(data)) {
    return {
      ok: false,
      errors: formatAjvErrors(data, validateSchema.errors),
    };
  }
  const doc = data as ColorsDocument;
  if (doc.schemaVersion !== COLORS_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [{ path: "/schemaVersion", message: "schemaVersion が正しくありません" }],
    };
  }
  const errors = validateColorsSemantics(doc);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, document: doc };
}

export function formatColorsValidationErrors(errors: ColorsIssue[]): string {
  return formatIssues(errors);
}
