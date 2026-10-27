import { isIsoDateString } from "./dates";
import type { OutlineRoot, ScheduleFieldDef, Task, TaskFieldValues } from "./types";

export function fieldDefinitionKeys(
  fields: readonly ScheduleFieldDef[] | undefined,
): string[] {
  if (fields == null) return [];
  return fields.map((field) => field.key);
}

export function fieldDefByKey(
  fields: readonly ScheduleFieldDef[] | undefined,
  key: string,
): ScheduleFieldDef | undefined {
  return fields?.find((field) => field.key === key);
}

function hasNewline(value: string): boolean {
  return /[\r\n]/.test(value);
}

export function normalizeFieldDefinition(
  field: ScheduleFieldDef,
): ScheduleFieldDef {
  const base: ScheduleFieldDef = {
    key: field.key,
    name: field.name,
    type: field.type,
  };
  const meaning = field.meaning?.trim();
  const instruction = field.instruction?.trim();
  const withMeta =
    meaning && meaning.length > 0 ? { ...base, meaning } : base;
  const withInstruction =
    instruction && instruction.length > 0
      ? { ...withMeta, instruction }
      : withMeta;
  let result: ScheduleFieldDef =
    field.required === true ? { ...withInstruction, required: true } : withInstruction;

  if (field.type === "number" && field.percent === true) {
    result = { ...result, percent: true };
  }

  if (field.type === "choice" && field.choices != null) {
    result = { ...result, choices: [...field.choices] };
  }

  if (field.default !== undefined) {
    if (field.type === "text" && typeof field.default === "string") {
      const trimmed = field.default.trim();
      if (trimmed.length > 0 && !hasNewline(trimmed)) {
        result = { ...result, default: trimmed };
      }
    } else if (field.type === "date" && typeof field.default === "string") {
      if (isIsoDateString(field.default)) {
        result = { ...result, default: field.default };
      }
    } else if (field.type === "number" && typeof field.default === "number") {
      if (Number.isFinite(field.default)) {
        result = { ...result, default: field.default };
      }
    } else if (
      field.type === "choice" &&
      typeof field.default === "string" &&
      field.choices?.includes(field.default)
    ) {
      result = { ...result, default: field.default };
    }
  }

  return result;
}

export function normalizeScheduleFieldDefinitions(
  fields: ScheduleFieldDef[] | undefined,
): ScheduleFieldDef[] | undefined {
  if (fields == null || fields.length === 0) return undefined;
  return fields.map((field) => normalizeFieldDefinition(field));
}

export function normalizeTaskFieldValues(
  task: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
): TaskFieldValues | undefined {
  if (fields == null || fields.length === 0) return undefined;
  const raw = task.fieldValues;
  if (raw == null) return undefined;

  const ordered: TaskFieldValues = {};
  for (const def of fields) {
    const value = raw[def.key];
    if (value === undefined) continue;
    const normalized = normalizeStoredFieldValue(def, value);
    if (normalized !== undefined) {
      ordered[def.key] = normalized;
    }
  }
  return Object.keys(ordered).length > 0 ? ordered : undefined;
}

function normalizeStoredFieldValue(
  def: ScheduleFieldDef,
  value: string | number,
): string | number | undefined {
  switch (def.type) {
    case "text": {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      if (trimmed.length === 0 || hasNewline(value)) return undefined;
      return trimmed;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
      return value;
    }
    case "date": {
      if (typeof value !== "string" || !isIsoDateString(value)) return undefined;
      return value;
    }
    case "choice": {
      if (typeof value !== "string") return undefined;
      if (def.choices == null || !def.choices.includes(value)) return undefined;
      return value;
    }
    default:
      return undefined;
  }
}

export function taskFieldValuesToJson(
  task: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
): TaskFieldValues | undefined {
  return normalizeTaskFieldValues(task, fields);
}

export type ParseTaskFieldInputResult =
  | { ok: true; value: string | number | undefined }
  | { ok: false; message: string };

export function parseTaskFieldInput(
  def: ScheduleFieldDef,
  raw: string,
): ParseTaskFieldInputResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: undefined };
  }
  switch (def.type) {
    case "text": {
      if (hasNewline(raw)) {
        return { ok: false, message: `${def.name}に改行は使えません` };
      }
      return { ok: true, value: trimmed };
    }
    case "number": {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return { ok: false, message: `${def.name}は数値にしてください` };
      }
      return { ok: true, value: parsed };
    }
    case "date": {
      if (!isIsoDateString(trimmed)) {
        return { ok: false, message: `${def.name}は有効な日付にしてください` };
      }
      return { ok: true, value: trimmed };
    }
    case "choice":
      if (def.choices == null || !def.choices.includes(trimmed)) {
        return { ok: false, message: `${def.name}の候補から選んでください` };
      }
      return { ok: true, value: trimmed };
    default:
      return { ok: false, message: `${def.name}を保存できません` };
  }
}

export function applyTaskFieldValue(
  task: Task,
  def: ScheduleFieldDef,
  value: string | number | undefined,
): Task {
  const current = { ...(task.fieldValues ?? {}) };
  if (value === undefined) {
    delete current[def.key];
  } else {
    current[def.key] = value;
  }
  const keys = Object.keys(current);
  if (keys.length === 0) {
    const next = { ...task };
    delete next.fieldValues;
    return next;
  }
  return { ...task, fieldValues: current };
}

export function setTaskFieldValueOnCategories(
  categories: import("./types").Category[],
  taskId: string,
  def: ScheduleFieldDef,
  value: string | number | undefined,
): import("./types").Category[] {
  return categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((task) =>
        task.id === taskId ? applyTaskFieldValue(task, def, value) : task,
      ),
    })),
  }));
}

export function setTaskFieldValueInOutline(
  outline: OutlineRoot,
  taskId: string,
  def: ScheduleFieldDef,
  value: string | number | undefined,
): OutlineRoot {
  return outline.map((node) => {
    if ("start" in node && "end" in node) {
      return node.id === taskId
        ? applyTaskFieldValue(node, def, value)
        : node;
    }
    return {
      ...node,
      children: setTaskFieldValueInOutline(node.children, taskId, def, value),
    };
  });
}

export function fieldValueDisplayString(
  def: ScheduleFieldDef,
  value: string | number | undefined,
): string {
  if (value === undefined) return "";
  if (def.type === "number" && def.percent === true) {
    return String(value);
  }
  return String(value);
}

export type FieldValidationIssue = {
  path: string;
  message: string;
};

export function validateDocumentFieldDefinitions(
  fields: ScheduleFieldDef[] | undefined,
): FieldValidationIssue[] {
  if (fields == null) return [];
  const issues: FieldValidationIssue[] = [];
  if (fields.length === 0) {
    issues.push({ path: "/fields", message: "追加項目の定義は1件以上必要です" });
    return issues;
  }
  const keys = new Set<string>();
  for (let fi = 0; fi < fields.length; fi += 1) {
    const field = fields[fi];
    const base = `/fields/${fi}`;
    const nameIssue = nonEmptyFieldName(field.name, `${base}/name`);
    if (nameIssue) issues.push(nameIssue);
    if (field.key.length === 0) {
      issues.push({ path: `${base}/key`, message: "キーを入力してください" });
    } else if (field.key.trim() !== field.key) {
      issues.push({
        path: `${base}/key`,
        message: "キーの前後に空白は書けません",
      });
    }
    if (keys.has(field.key)) {
      issues.push({ path: `${base}/key`, message: "キーが重複しています" });
    }
    keys.add(field.key);

    if (field.percent === true && field.type !== "number") {
      issues.push({
        path: `${base}/percent`,
        message: "パーセント表示は数値型だけに付けられます",
      });
    }
    if (field.type === "choice") {
      if (field.choices == null || field.choices.length === 0) {
        issues.push({
          path: `${base}/choices`,
          message: "候補型には choices が必要です",
        });
      } else {
        const choiceSeen = new Set<string>();
        for (let ci = 0; ci < field.choices.length; ci += 1) {
          const choice = field.choices[ci];
          const choicePath = `${base}/choices/${ci}`;
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
      if (field.default !== undefined && typeof field.default !== "string") {
        issues.push({
          path: `${base}/default`,
          message: "デフォルトの型が一致しません",
        });
      } else if (
        field.default !== undefined &&
        field.choices != null &&
        !field.choices.includes(field.default)
      ) {
        issues.push({
          path: `${base}/default`,
          message: "デフォルトは候補のいずれかにしてください",
        });
      }
    } else if (field.choices != null) {
      issues.push({
        path: `${base}/choices`,
        message: "候補は候補型だけに書けます",
      });
    }

    if (field.default !== undefined) {
      const defaultIssue = validateDefaultForField(field, `${base}/default`);
      if (defaultIssue) issues.push(defaultIssue);
    }

    if (field.required != null && field.required !== true) {
      issues.push({
        path: `${base}/required`,
        message: "required は true のときだけ書けます",
      });
    }
  }
  return issues;
}

function nonEmptyFieldName(
  value: string,
  path: string,
): FieldValidationIssue | null {
  if (value.trim().length === 0) {
    return { path, message: "名前は空白にできません" };
  }
  return null;
}

function validateDefaultForField(
  field: ScheduleFieldDef,
  path: string,
): FieldValidationIssue | null {
  const value = field.default;
  if (value === undefined) return null;
  switch (field.type) {
    case "text":
      if (typeof value !== "string" || value.trim().length === 0 || hasNewline(value)) {
        return { path, message: "デフォルトの型が一致しません" };
      }
      return null;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { path, message: "デフォルトの型が一致しません" };
      }
      return null;
    case "date":
      if (typeof value !== "string" || !isIsoDateString(value)) {
        return { path, message: "デフォルトの型が一致しません" };
      }
      return null;
    case "choice":
      return null;
    default:
      return { path, message: "デフォルトの型が一致しません" };
  }
}

export function validateTaskFieldValuesSemantics(
  task: Task,
  taskPath: string,
  fields: ScheduleFieldDef[] | undefined,
): FieldValidationIssue[] {
  const issues: FieldValidationIssue[] = [];
  const values = task.fieldValues;
  if (values == null) return issues;
  if (fields == null || fields.length === 0) {
    issues.push({
      path: `${taskPath}/fieldValues`,
      message: "定義の無いファイルに追加項目の値は書けません",
    });
    return issues;
  }
  const defsByKey = new Map(fields.map((field) => [field.key, field]));
  for (const key of Object.keys(values)) {
    const valuePath = `${taskPath}/fieldValues/${key}`;
    const def = defsByKey.get(key);
    if (def == null) {
      issues.push({
        path: valuePath,
        message: "定義に無いキーです",
      });
      continue;
    }
    const normalized = normalizeStoredFieldValue(def, values[key]);
    if (normalized === undefined) {
      issues.push({
        path: valuePath,
        message: "値の型が定義と一致しません",
      });
    }
  }
  return issues;
}

export function normalizeScheduleFieldsForValidation(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...data };
  if (Array.isArray(next.fields)) {
    next.fields = next.fields.map((entry) => {
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
        return entry;
      }
      const field = entry as Record<string, unknown>;
      const cleaned = { ...field };
      for (const key of ["meaning", "instruction"] as const) {
        if (key in cleaned && typeof cleaned[key] === "string") {
          const trimmed = (cleaned[key] as string).trim();
          if (trimmed.length === 0) {
            delete cleaned[key];
          }
        }
      }
      if ("default" in cleaned) {
        const def = cleaned.default;
        if (def === "" || (typeof def === "string" && def.trim().length === 0)) {
          delete cleaned.default;
        }
      }
      if (cleaned.required !== true) {
        delete cleaned.required;
      }
      if (cleaned.percent !== true) {
        delete cleaned.percent;
      }
      return cleaned;
    });
  }
  return normalizeTaskFieldValuesInTree(next);
}

function normalizeTaskFieldValuesInTree(
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (Array.isArray(data.categories)) {
    return {
      ...data,
      categories: data.categories.map((category) =>
        normalizeCategoryFieldValues(category),
      ),
    };
  }
  if (Array.isArray(data.outline)) {
    return {
      ...data,
      outline: data.outline.map((node) => normalizeOutlineFieldValues(node)),
    };
  }
  return data;
}

function normalizeCategoryFieldValues(category: unknown): unknown {
  if (category == null || typeof category !== "object" || Array.isArray(category)) {
    return category;
  }
  const cat = category as Record<string, unknown>;
  if (!Array.isArray(cat.groups)) return category;
  return {
    ...cat,
    groups: cat.groups.map((group) => {
      if (group == null || typeof group !== "object" || Array.isArray(group)) {
        return group;
      }
      const grp = group as Record<string, unknown>;
      if (!Array.isArray(grp.tasks)) return group;
      return {
        ...grp,
        tasks: grp.tasks.map((task) => normalizeTaskFieldValuesRecord(task)),
      };
    }),
  };
}

function normalizeOutlineFieldValues(node: unknown): unknown {
  if (node == null || typeof node !== "object" || Array.isArray(node)) {
    return node;
  }
  const record = node as Record<string, unknown>;
  if ("start" in record && "end" in record) {
    return normalizeTaskFieldValuesRecord(node);
  }
  if (Array.isArray(record.children)) {
    return {
      ...record,
      children: record.children.map((child) => normalizeOutlineFieldValues(child)),
    };
  }
  return node;
}

function normalizeTaskFieldValuesRecord(task: unknown): unknown {
  if (task == null || typeof task !== "object" || Array.isArray(task)) {
    return task;
  }
  const record = task as Record<string, unknown>;
  const fieldValues = record.fieldValues;
  if (fieldValues == null || typeof fieldValues !== "object" || Array.isArray(fieldValues)) {
    return task;
  }
  const keys = Object.keys(fieldValues as Record<string, unknown>);
  if (keys.length === 0) {
    const { fieldValues: _removed, ...rest } = record;
    void _removed;
    return rest;
  }
  return task;
}
