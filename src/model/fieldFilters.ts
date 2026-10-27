import { isIsoDateString } from "./dates";
import type { ScheduleFieldDef, ScheduleFilters, Task } from "./types";

export type FieldFilterEmptyMode = "any" | "keep" | "exclude";

export type FieldFilterCondition = {
  empty: FieldFilterEmptyMode;
  text?: string;
  min?: number;
  max?: number;
  from?: string;
  to?: string;
  choice?: string;
};

export type FieldFiltersState = Record<string, FieldFilterCondition>;

export const DEFAULT_FIELD_FILTER_EMPTY: FieldFilterEmptyMode = "any";

export function emptyFieldFiltersState(): FieldFiltersState {
  return {};
}

export function defaultFieldFilterCondition(): FieldFilterCondition {
  return { empty: DEFAULT_FIELD_FILTER_EMPTY };
}

function taskFieldValue(task: Task, key: string): string | number | undefined {
  return task.fieldValues?.[key];
}

function taskHasFieldValue(task: Task, key: string): boolean {
  return task.fieldValues?.[key] !== undefined;
}

function trimmedTextQuery(condition: FieldFilterCondition): string {
  return condition.text?.trim() ?? "";
}

function hasValueCondition(
  def: ScheduleFieldDef,
  condition: FieldFilterCondition,
): boolean {
  switch (def.type) {
    case "text":
      return trimmedTextQuery(condition).length > 0;
    case "number": {
      const hasMin = condition.min !== undefined && Number.isFinite(condition.min);
      const hasMax = condition.max !== undefined && Number.isFinite(condition.max);
      return hasMin || hasMax;
    }
    case "date": {
      const from = condition.from?.trim() ?? "";
      const to = condition.to?.trim() ?? "";
      const hasFrom = from.length > 0 && isIsoDateString(from);
      const hasTo = to.length > 0 && isIsoDateString(to);
      return hasFrom || hasTo;
    }
    case "choice": {
      const choice = condition.choice?.trim() ?? "";
      return choice.length > 0;
    }
    default:
      return false;
  }
}

function hasEmptyCondition(condition: FieldFilterCondition): boolean {
  return condition.empty === "keep" || condition.empty === "exclude";
}

export function isFieldFilterActive(
  def: ScheduleFieldDef,
  condition: FieldFilterCondition | undefined,
): boolean {
  if (!condition) return false;
  return hasValueCondition(def, condition) || hasEmptyCondition(condition);
}

function valueMatchesText(task: Task, key: string, query: string): boolean {
  const raw = taskFieldValue(task, key);
  if (typeof raw !== "string") return false;
  return raw.includes(query);
}

function valueMatchesNumber(
  task: Task,
  key: string,
  min: number | undefined,
  max: number | undefined,
): boolean {
  const raw = taskFieldValue(task, key);
  if (typeof raw !== "number" || !Number.isFinite(raw)) return false;
  if (min !== undefined && Number.isFinite(min) && raw < min) return false;
  if (max !== undefined && Number.isFinite(max) && raw > max) return false;
  if (
    min !== undefined &&
    max !== undefined &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min > max
  ) {
    return false;
  }
  return true;
}

function valueMatchesDate(
  task: Task,
  key: string,
  from: string | undefined,
  to: string | undefined,
): boolean {
  const raw = taskFieldValue(task, key);
  if (typeof raw !== "string" || !isIsoDateString(raw)) return false;
  const hasFrom = from != null && from.length > 0 && isIsoDateString(from);
  const hasTo = to != null && to.length > 0 && isIsoDateString(to);
  if (hasFrom && hasTo && from > to) return false;
  if (hasFrom && raw < from) return false;
  if (hasTo && raw > to) return false;
  return true;
}

function valueMatchesChoice(task: Task, key: string, choice: string): boolean {
  const raw = taskFieldValue(task, key);
  return raw === choice;
}

function taskMatchesValueCondition(
  task: Task,
  def: ScheduleFieldDef,
  condition: FieldFilterCondition,
): boolean {
  if (!hasValueCondition(def, condition)) return false;
  switch (def.type) {
    case "text":
      return valueMatchesText(task, def.key, trimmedTextQuery(condition));
    case "number":
      return valueMatchesNumber(task, def.key, condition.min, condition.max);
    case "date":
      return valueMatchesDate(task, def.key, condition.from, condition.to);
    case "choice":
      return valueMatchesChoice(task, def.key, condition.choice!.trim());
    default:
      return false;
  }
}

export function taskMatchesFieldFilter(
  task: Task,
  def: ScheduleFieldDef,
  condition: FieldFilterCondition | undefined,
): boolean {
  if (!condition || !isFieldFilterActive(def, condition)) return true;
  const hasValue = hasValueCondition(def, condition);
  const emptyMode = condition.empty;
  const hasValueOnTask = taskHasFieldValue(task, def.key);
  const valueOk = hasValue && taskMatchesValueCondition(task, def, condition);

  if (hasValue) {
    if (emptyMode === "keep") {
      return valueOk || !hasValueOnTask;
    }
    return valueOk;
  }

  if (emptyMode === "keep") {
    return !hasValueOnTask;
  }
  if (emptyMode === "exclude") {
    return hasValueOnTask;
  }
  return true;
}

export function applyFieldFilterPatch(
  filters: Pick<ScheduleFilters, "fieldFilters">,
  def: ScheduleFieldDef,
  patch: Partial<FieldFilterCondition>,
): FieldFiltersState {
  const current =
    filters.fieldFilters?.[def.key] ?? defaultFieldFilterCondition();
  const next: FieldFilterCondition = { ...current, ...patch };
  const merged = { ...(filters.fieldFilters ?? {}), [def.key]: next };
  if (!isFieldFilterActive(def, next)) {
    const rest = { ...merged };
    delete rest[def.key];
    return rest;
  }
  return merged;
}

export function taskMatchesFieldFilters(
  task: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
  fieldFilters: FieldFiltersState,
): boolean {
  if (fields == null || fields.length === 0) return true;
  for (const def of fields) {
    const condition = fieldFilters[def.key];
    if (!taskMatchesFieldFilter(task, def, condition)) return false;
  }
  return true;
}

export function activeFieldFilterCount(
  fields: readonly ScheduleFieldDef[] | undefined,
  fieldFilters: FieldFiltersState,
): number {
  if (fields == null || fields.length === 0) return 0;
  let count = 0;
  for (const def of fields) {
    if (isFieldFilterActive(def, fieldFilters[def.key])) count += 1;
  }
  return count;
}

function formatNumberPart(value: number, percent: boolean): string {
  const text = String(value);
  return percent ? `${text}%` : text;
}

export function fieldFilterChipLabel(
  def: ScheduleFieldDef,
  condition: FieldFilterCondition,
): string | null {
  if (!isFieldFilterActive(def, condition)) return null;
  const name = def.name;
  const hasValue = hasValueCondition(def, condition);
  const emptyMode = condition.empty;
  const parts: string[] = [];

  if (hasValue) {
    switch (def.type) {
      case "text": {
        const q = trimmedTextQuery(condition);
        parts.push(`「${q}」を含む`);
        break;
      }
      case "number": {
        const percent = def.percent === true;
        const min = condition.min;
        const max = condition.max;
        const hasMin = min !== undefined && Number.isFinite(min);
        const hasMax = max !== undefined && Number.isFinite(max);
        if (hasMin && hasMax) {
          parts.push(
            `${formatNumberPart(min, percent)} 以上 ${formatNumberPart(max, percent)} 以下`,
          );
        } else if (hasMin) {
          parts.push(`${formatNumberPart(min, percent)} 以上`);
        } else if (hasMax) {
          parts.push(`${formatNumberPart(max, percent)} 以下`);
        }
        break;
      }
      case "date": {
        const from = condition.from?.trim() ?? "";
        const to = condition.to?.trim() ?? "";
        const hasFrom = from.length > 0 && isIsoDateString(from);
        const hasTo = to.length > 0 && isIsoDateString(to);
        if (hasFrom) parts.push(`${from} から`);
        if (hasTo) parts.push(`${to} まで`);
        break;
      }
      case "choice":
        parts.push(String(condition.choice?.trim() ?? ""));
        break;
      default:
        break;
    }
  } else if (emptyMode === "keep") {
    parts.push("値が無いものを残す");
  } else if (emptyMode === "exclude") {
    parts.push("値が無いものを除く");
  }

  if (parts.length === 0) return null;

  let label = `${name}: ${parts.join(" ")}`;
  if (hasValue && emptyMode === "keep") {
    label += "、値が無いものも残す";
  }
  return label;
}

export function clearFieldFilterPatch(
  key: string,
): { fieldFilters: FieldFiltersState } {
  return {
    fieldFilters: { [key]: defaultFieldFilterCondition() },
  };
}

export function parseFieldFilterCondition(
  def: ScheduleFieldDef,
  raw: unknown,
): FieldFilterCondition | null {
  if (typeof raw !== "object" || raw == null) return null;
  const record = raw as Record<string, unknown>;
  const empty = record.empty;
  if (empty !== "any" && empty !== "keep" && empty !== "exclude") return null;
  const base: FieldFilterCondition = { empty };

  switch (def.type) {
    case "text": {
      const text = record.text;
      if (text !== undefined && typeof text !== "string") return null;
      if (text !== undefined) base.text = text;
      return base;
    }
    case "number": {
      const min = record.min;
      const max = record.max;
      if (min !== undefined && typeof min !== "number") return null;
      if (max !== undefined && typeof max !== "number") return null;
      if (min !== undefined && !Number.isFinite(min)) return null;
      if (max !== undefined && !Number.isFinite(max)) return null;
      if (min !== undefined) base.min = min;
      if (max !== undefined) base.max = max;
      return base;
    }
    case "date": {
      const from = record.from;
      const to = record.to;
      if (from !== undefined && typeof from !== "string") return null;
      if (to !== undefined && typeof to !== "string") return null;
      if (from !== undefined && from.length > 0 && !isIsoDateString(from)) {
        return null;
      }
      if (to !== undefined && to.length > 0 && !isIsoDateString(to)) return null;
      if (from !== undefined) base.from = from;
      if (to !== undefined) base.to = to;
      return base;
    }
    case "choice": {
      const choice = record.choice;
      if (choice !== undefined && typeof choice !== "string") return null;
      if (choice !== undefined && choice.length > 0) {
        if (!def.choices?.includes(choice)) return null;
        base.choice = choice;
      }
      return base;
    }
    default:
      return null;
  }
}

export function parseFieldFiltersRecord(
  fields: readonly ScheduleFieldDef[] | undefined,
  raw: unknown,
): FieldFiltersState | null {
  if (fields == null || fields.length === 0) {
    return emptyFieldFiltersState();
  }
  if (raw === undefined) return emptyFieldFiltersState();
  if (typeof raw !== "object" || raw == null) return null;
  const record = raw as Record<string, unknown>;
  const result: FieldFiltersState = {};
  for (const def of fields) {
    const entry = record[def.key];
    if (entry === undefined) continue;
    const parsed = parseFieldFilterCondition(def, entry);
    if (!parsed) continue;
    if (isFieldFilterActive(def, parsed)) {
      result[def.key] = parsed;
    }
  }
  return result;
}

export function fieldFilterConditionsEqual(
  def: ScheduleFieldDef,
  a: FieldFilterCondition,
  b: FieldFilterCondition,
): boolean {
  if (a.empty !== b.empty) return false;
  switch (def.type) {
    case "text":
      return (a.text ?? "") === (b.text ?? "");
    case "number":
      return a.min === b.min && a.max === b.max;
    case "date":
      return (a.from ?? "") === (b.from ?? "") && (a.to ?? "") === (b.to ?? "");
    case "choice":
      return (a.choice ?? "") === (b.choice ?? "");
    default:
      return false;
  }
}

/** タスク名の検索と同じく、前後の空白を除いた文字を含む名前だけを、定義の順で返す。 */
export function filterFieldsByQuery(
  fieldsInDefinitionOrder: readonly ScheduleFieldDef[],
  query: string,
): ScheduleFieldDef[] {
  const needle = query.trim();
  if (needle.length === 0) {
    return [...fieldsInDefinitionOrder];
  }
  return fieldsInDefinitionOrder.filter((def) => def.name.includes(needle));
}

export function pruneFieldFilters(
  fields: readonly ScheduleFieldDef[] | undefined,
  fieldFilters: FieldFiltersState,
): FieldFiltersState {
  if (fields == null || fields.length === 0) return emptyFieldFiltersState();
  const next: FieldFiltersState = {};
  for (const def of fields) {
    const condition = fieldFilters[def.key];
    if (!condition) continue;
    const parsed = parseFieldFilterCondition(def, condition);
    if (!parsed || !isFieldFilterActive(def, parsed)) continue;
    if (fieldFilterConditionsEqual(def, condition, parsed)) {
      next[def.key] = condition;
    } else {
      next[def.key] = parsed;
    }
  }
  const keys = Object.keys(fieldFilters);
  const nextKeys = Object.keys(next);
  if (
    keys.length === nextKeys.length &&
    nextKeys.every((key) => fieldFilters[key] === next[key])
  ) {
    return fieldFilters;
  }
  return next;
}

export function fieldFiltersHideTask(
  task: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
  fieldFilters: FieldFiltersState,
): boolean {
  if (fields == null || fields.length === 0) return false;
  return !taskMatchesFieldFilters(task, fields, fieldFilters);
}

export function relaxFieldFiltersForNewTask(
  fieldFilters: FieldFiltersState,
  fields: readonly ScheduleFieldDef[] | undefined,
  task: Task,
): FieldFiltersState {
  if (fields == null || fields.length === 0) return fieldFilters;
  let changed = false;
  const next = { ...fieldFilters };
  for (const def of fields) {
    const condition = fieldFilters[def.key];
    if (!condition || !isFieldFilterActive(def, condition)) continue;
    if (!fieldFiltersHideTask(task, fields, { [def.key]: condition })) continue;
    next[def.key] = defaultFieldFilterCondition();
    changed = true;
  }
  return changed ? next : fieldFilters;
}

export function serializeFieldFiltersForPersistence(
  fields: readonly ScheduleFieldDef[] | undefined,
  fieldFilters: FieldFiltersState,
): FieldFiltersState | undefined {
  const pruned = pruneFieldFilters(fields, fieldFilters);
  if (Object.keys(pruned).length === 0) return undefined;
  return pruned;
}

export function parseFieldFiltersFromPersistence(
  raw: unknown,
): FieldFiltersState | null {
  if (raw === undefined) return emptyFieldFiltersState();
  if (typeof raw !== "object" || raw == null) return null;
  const record = raw as Record<string, unknown>;
  const result: FieldFiltersState = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry !== "object" || entry == null) return null;
    const item = entry as Record<string, unknown>;
    const empty = item.empty;
    if (empty !== "any" && empty !== "keep" && empty !== "exclude") return null;
    const condition: FieldFilterCondition = { empty };
    if (item.text !== undefined) {
      if (typeof item.text !== "string") return null;
      condition.text = item.text;
    }
    if (item.min !== undefined) {
      if (typeof item.min !== "number" || !Number.isFinite(item.min)) return null;
      condition.min = item.min;
    }
    if (item.max !== undefined) {
      if (typeof item.max !== "number" || !Number.isFinite(item.max)) return null;
      condition.max = item.max;
    }
    if (item.from !== undefined) {
      if (typeof item.from !== "string") return null;
      condition.from = item.from;
    }
    if (item.to !== undefined) {
      if (typeof item.to !== "string") return null;
      condition.to = item.to;
    }
    if (item.choice !== undefined) {
      if (typeof item.choice !== "string") return null;
      condition.choice = item.choice;
    }
    result[key] = condition;
  }
  return result;
}
