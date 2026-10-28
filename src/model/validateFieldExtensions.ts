import type { ValidationIssue } from "./membersSemantics";
import {
  isValidPluginOrItemId,
  compositeFieldKey,
} from "./fieldExtensionMerge";
import type { FieldExtensionDocument } from "./fieldExtensionTypes";
import { formatAjvErrors } from "./validationMessages";
import validateSchema from "./generated/fieldExtensionsValidator.js";

export type ValidateFieldExtensionsResult =
  | { ok: true; document: FieldExtensionDocument }
  | { ok: false; errors: ValidationIssue[] };

function schemaIssues(data: unknown): ValidationIssue[] {
  if (validateSchema(data)) return [];
  return formatAjvErrors(data, validateSchema.errors);
}

function hasNewline(value: string): boolean {
  return /[\r\n]/.test(value);
}

export function validateFieldExtensionsSemantics(
  doc: FieldExtensionDocument,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const base = "";
  if (!isValidPluginOrItemId(doc.id)) {
    issues.push({
      path: `${base}/id`,
      message: "プラグイン ID に空白と _ は使えません",
    });
  } else if (doc.id.trim() !== doc.id) {
    issues.push({
      path: `${base}/id`,
      message: "プラグイン ID の前後に空白は書けません",
    });
  }
  if (doc.name.trim().length === 0) {
    issues.push({ path: `${base}/name`, message: "名前は空白にできません" });
  }

  const itemIds = new Set<string>();
  const compositeKeys = new Set<string>();
  for (let fi = 0; fi < doc.fields.length; fi += 1) {
    const field = doc.fields[fi];
    const fieldBase = `/fields/${fi}`;
    if (field.name.trim().length === 0) {
      issues.push({
        path: `${fieldBase}/name`,
        message: "名前は空白にできません",
      });
    }
    if (!isValidPluginOrItemId(field.id)) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "項目 ID に空白と _ は使えません",
      });
    } else if (field.id.trim() !== field.id) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "項目 ID の前後に空白は書けません",
      });
    }
    if (itemIds.has(field.id)) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "項目 ID が重複しています",
      });
    }
    itemIds.add(field.id);

    const composite = compositeFieldKey(doc.id, field.id);
    if (compositeKeys.has(composite)) {
      issues.push({
        path: `${fieldBase}/id`,
        message: "合成キーが重複しています",
      });
    }
    compositeKeys.add(composite);

    if (field.percent === true && field.type !== "number") {
      issues.push({
        path: `${fieldBase}/percent`,
        message: "パーセント表示は数値型だけに付けられます",
      });
    }
    if (field.type === "choice") {
      if (field.choices == null || field.choices.length === 0) {
        issues.push({
          path: `${fieldBase}/choices`,
          message: "候補型には choices が必要です",
        });
      } else {
        const choiceSeen = new Set<string>();
        for (let ci = 0; ci < field.choices.length; ci += 1) {
          const choice = field.choices[ci];
          const choicePath = `${fieldBase}/choices/${ci}`;
          if (choice.length === 0) {
            issues.push({ path: choicePath, message: "候補は空白にできません" });
          } else if (choice.trim() !== choice) {
            issues.push({
              path: choicePath,
              message: "候補の前後に空白は書けません",
            });
          }
          if (choiceSeen.has(choice)) {
            issues.push({ path: choicePath, message: "候補が重複しています" });
          }
          choiceSeen.add(choice);
        }
      }
      if (
        field.default !== undefined &&
        typeof field.default === "string" &&
        field.choices != null &&
        !field.choices.includes(field.default)
      ) {
        issues.push({
          path: `${fieldBase}/default`,
          message: "デフォルトは候補のいずれかにしてください",
        });
      }
    } else if (field.choices != null) {
      issues.push({
        path: `${fieldBase}/choices`,
        message: "候補は候補型だけに書けます",
      });
    }

    if (field.default !== undefined) {
      const def = field.default;
      switch (field.type) {
        case "text":
          if (
            typeof def !== "string" ||
            def.trim().length === 0 ||
            hasNewline(def)
          ) {
            issues.push({
              path: `${fieldBase}/default`,
              message: "デフォルトの型が一致しません",
            });
          }
          break;
        case "number":
          if (typeof def !== "number" || !Number.isFinite(def)) {
            issues.push({
              path: `${fieldBase}/default`,
              message: "デフォルトの型が一致しません",
            });
          }
          break;
        case "date":
          if (typeof def !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(def)) {
            issues.push({
              path: `${fieldBase}/default`,
              message: "デフォルトの型が一致しません",
            });
          }
          break;
        default:
          break;
      }
    }

    if (field.required != null && field.required !== true) {
      issues.push({
        path: `${fieldBase}/required`,
        message: "required は true のときだけ書けます",
      });
    }
  }
  return issues;
}

export function validateFieldExtensions(
  data: unknown,
): ValidateFieldExtensionsResult {
  const schemaErrors = schemaIssues(data);
  if (schemaErrors.length > 0) {
    return { ok: false, errors: schemaErrors };
  }
  const doc = data as FieldExtensionDocument;
  const semantic = validateFieldExtensionsSemantics(doc);
  if (semantic.length > 0) {
    return { ok: false, errors: semantic };
  }
  return { ok: true, document: doc };
}

export function formatFieldExtensionsValidationErrors(
  errors: ValidationIssue[],
): string {
  if (errors.length === 0) {
    return "拡張項目 JSON の形式が正しくありません。";
  }
  return errors[0].message;
}
