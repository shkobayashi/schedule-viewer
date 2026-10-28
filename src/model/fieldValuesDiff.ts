import type { ScheduleFieldDef, Task, TaskFieldValues } from "./types";

const MISSING_LABEL = "（なし）";

export function formatFieldValueForDiff(
  value: string | number | undefined,
): string {
  if (value === undefined) return MISSING_LABEL;
  return JSON.stringify(value);
}

export function orderedFieldValueKeysForDiff(
  fields: readonly ScheduleFieldDef[] | undefined,
  ...sources: (TaskFieldValues | undefined)[]
): string[] {
  const keys = new Set<string>();
  for (const source of sources) {
    if (source == null) continue;
    for (const key of Object.keys(source)) {
      keys.add(key);
    }
  }
  const known = new Set((fields ?? []).map((field) => field.key));
  const ordered: string[] = [];
  for (const field of fields ?? []) {
    if (keys.has(field.key)) ordered.push(field.key);
  }
  const unknown = [...keys].filter((key) => !known.has(key)).sort();
  ordered.push(...unknown);
  return ordered;
}

function valueAt(values: TaskFieldValues | undefined, key: string): string | number | undefined {
  if (values == null) return undefined;
  return values[key];
}

export function fieldValuesEqualForDiff(a: Task, b: Task): boolean {
  const keys = orderedFieldValueKeysForDiff(undefined, a.fieldValues, b.fieldValues);
  for (const key of keys) {
    if (valueAt(a.fieldValues, key) !== valueAt(b.fieldValues, key)) {
      return false;
    }
  }
  return true;
}

export function fieldValueChangeLinesForDiff(
  fileTask: Task,
  screenTask: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
): string[] {
  const lines: string[] = [];
  for (const key of orderedFieldValueKeysForDiff(
    fields,
    fileTask.fieldValues,
    screenTask.fieldValues,
  )) {
    const fileValue = valueAt(fileTask.fieldValues, key);
    const screenValue = valueAt(screenTask.fieldValues, key);
    if (fileValue === screenValue) continue;
    lines.push(
      `  ${key}: ${formatFieldValueForDiff(fileValue)} → ${formatFieldValueForDiff(screenValue)}`,
    );
  }
  return lines;
}

export function fieldValueSnapshotLinesForDiff(
  task: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
): string[] {
  const lines: string[] = [];
  for (const key of orderedFieldValueKeysForDiff(fields, task.fieldValues)) {
    const value = valueAt(task.fieldValues, key);
    if (value === undefined) continue;
    lines.push(`  ${key}: ${formatFieldValueForDiff(value)}`);
  }
  return lines;
}
