import { collectTasksFromDocument } from "./hierarchy";
import type { DocumentSnapshot } from "./history";
import { mapAllTasksInOutline } from "./outlineTasks";
import {
  assessRequiredFieldValuesSave,
  normalizeFieldDefinition,
  normalizeStoredFieldValue,
} from "./taskFields";
import { mapTasks } from "./tasks";
import type {
  ScheduleDocument,
  ScheduleFieldDef,
  ScheduleFieldType,
  Task,
  TaskFieldValues,
} from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

function documentForTaskWalk(doc: DocumentSnapshot): ScheduleDocument {
  return { ...doc, schemaVersion: SCHEDULE_SCHEMA_VERSION };
}

export type FieldChoiceDraftRow = {
  rowId: string;
  value: string;
};

export type FieldDefinitionDraft = {
  key: string;
  name: string;
  type: ScheduleFieldType;
  meaning: string;
  instruction: string;
  required: boolean;
  defaultText: string;
  percent: boolean;
  choiceRows: FieldChoiceDraftRow[];
  /** この覆いを開いてから足した項目。値あり削除の確認を出さない。 */
  sessionAdded: boolean;
};

export type FieldDefinitionCloseIssue = {
  fieldKey: string;
  message: string;
};

let choiceRowIdCounter = 0;

function nextChoiceRowId(): string {
  choiceRowIdCounter += 1;
  return `choice-row-${choiceRowIdCounter}`;
}

export function fieldDraftsFromFields(
  fields: readonly ScheduleFieldDef[] | undefined,
): FieldDefinitionDraft[] {
  if (fields == null || fields.length === 0) return [];
  return fields.map((field) => draftFromFieldDef(field, false));
}

function draftFromFieldDef(
  field: ScheduleFieldDef,
  sessionAdded: boolean,
): FieldDefinitionDraft {
  const defaultText =
    field.default === undefined ? "" : String(field.default);
  return {
    key: field.key,
    name: field.name,
    type: field.type,
    meaning: field.meaning ?? "",
    instruction: field.instruction ?? "",
    required: field.required === true,
    defaultText,
    percent: field.percent === true,
    choiceRows: (field.choices ?? []).map((value, index) => ({
      rowId: `choice-${field.key}-${index}`,
      value,
    })),
    sessionAdded,
  };
}

export function newFieldDefinitionKey(
  existing: readonly FieldDefinitionDraft[],
): string {
  const used = new Set(existing.map((item) => item.key));
  let n = 1;
  while (used.has(`field-${n}`)) n += 1;
  return `field-${n}`;
}

export function newFieldDefinitionDraft(
  existing: readonly FieldDefinitionDraft[],
): FieldDefinitionDraft {
  const key = newFieldDefinitionKey(existing);
  return {
    key,
    name: "",
    type: "text",
    meaning: "",
    instruction: "",
    required: false,
    defaultText: "",
    percent: false,
    choiceRows: [],
    sessionAdded: true,
  };
}

export function newChoiceDraftRow(): FieldChoiceDraftRow {
  return { rowId: nextChoiceRowId(), value: "" };
}

export function moveFieldDefinitionDraft(
  drafts: readonly FieldDefinitionDraft[],
  index: number,
  delta: -1 | 1,
): FieldDefinitionDraft[] {
  const to = index + delta;
  if (to < 0 || to >= drafts.length) return [...drafts];
  const next = [...drafts];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next;
}

export function removeFieldDefinitionDraft(
  drafts: readonly FieldDefinitionDraft[],
  index: number,
): FieldDefinitionDraft[] {
  return drafts.filter((_, i) => i !== index);
}

function trimChoiceValue(value: string): string {
  return value.trim();
}

function parseDefaultFromDraft(
  draft: FieldDefinitionDraft,
  def: ScheduleFieldDef,
): string | number | undefined {
  const raw = draft.defaultText.trim();
  if (raw.length === 0) return undefined;
  if (def.type === "number") {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return undefined;
    return parsed;
  }
  return raw;
}

/** 下書きを保存用の定義に直す。検証は別途。 */
export function draftToFieldDef(draft: FieldDefinitionDraft): ScheduleFieldDef {
  const choices =
    draft.type === "choice"
      ? draft.choiceRows.map((row) => trimChoiceValue(row.value))
      : undefined;
  let base: ScheduleFieldDef = {
    key: draft.key,
    name: draft.name,
    type: draft.type,
  };
  const meaning = draft.meaning.trim();
  const instruction = draft.instruction.trim();
  if (meaning.length > 0) base = { ...base, meaning };
  if (instruction.length > 0) base = { ...base, instruction };
  if (draft.required) base = { ...base, required: true };
  if (draft.type === "number" && draft.percent) {
    base = { ...base, percent: true };
  }
  if (draft.type === "choice" && choices != null) {
    base = { ...base, choices };
  }
  const withDefault = parseDefaultFromDraft(draft, base);
  if (withDefault !== undefined) {
    base = { ...base, default: withDefault };
  }
  return normalizeFieldDefinition(base);
}

export function draftsToFieldDefinitions(
  drafts: readonly FieldDefinitionDraft[],
): ScheduleFieldDef[] | undefined {
  if (drafts.length === 0) return undefined;
  return drafts.map((draft) => draftToFieldDef(draft));
}

function displayNameForIssue(draft: FieldDefinitionDraft): string {
  const trimmed = draft.name.trim();
  return trimmed.length > 0 ? trimmed : "（名前なし）";
}

export function fieldDefinitionCloseIssues(
  drafts: readonly FieldDefinitionDraft[],
): FieldDefinitionCloseIssue[] {
  const issues: FieldDefinitionCloseIssue[] = [];
  for (const draft of drafts) {
    const label = displayNameForIssue(draft);
    if (draft.name.trim().length === 0) {
      issues.push({
        fieldKey: draft.key,
        message: "名前が空の項目があります。",
      });
      continue;
    }
    if (draft.type === "choice") {
      if (draft.choiceRows.length === 0) {
        issues.push({
          fieldKey: draft.key,
          message: `「${label}」の候補がありません。`,
        });
        continue;
      }
      const seen = new Set<string>();
      for (const row of draft.choiceRows) {
        const trimmed = trimChoiceValue(row.value);
        if (trimmed.length === 0) {
          issues.push({
            fieldKey: draft.key,
            message: `「${label}」の候補が空です。`,
          });
          break;
        }
        if (row.value !== trimmed) {
          issues.push({
            fieldKey: draft.key,
            message: `「${label}」の候補の前後に空白があります。`,
          });
          break;
        }
        if (seen.has(trimmed)) {
          issues.push({
            fieldKey: draft.key,
            message: `「${label}」の候補が重複しています。`,
          });
          break;
        }
        seen.add(trimmed);
      }
    }
    const def = draftToFieldDef(draft);
    if (draft.defaultText.trim().length > 0) {
      if (def.type === "number") {
        const parsed = Number(draft.defaultText.trim());
        if (!Number.isFinite(parsed)) {
          issues.push({
            fieldKey: draft.key,
            message: `「${label}」のデフォルトは数値にしてください。`,
          });
        }
      } else if (def.type === "date") {
        const normalized = normalizeStoredFieldValue(def, draft.defaultText.trim());
        if (normalized === undefined) {
          issues.push({
            fieldKey: draft.key,
            message: `「${label}」のデフォルトは有効な日付にしてください。`,
          });
        }
      } else if (def.type === "text") {
        if (/[\r\n]/.test(draft.defaultText)) {
          issues.push({
            fieldKey: draft.key,
            message: `「${label}」のデフォルトに改行は使えません。`,
          });
        }
      }
    }
  }
  return issues;
}

export function fieldDefinitionCloseSummary(
  issues: readonly FieldDefinitionCloseIssue[],
): string | null {
  if (issues.length === 0) return null;
  const first = issues[0]!.message;
  if (issues.length === 1) return first;
  return `${first}ほかに ${issues.length - 1} 件あります。`;
}

export function countTasksWithFieldValue(
  doc: DocumentSnapshot,
  key: string,
): number {
  return collectTasksFromDocument(documentForTaskWalk(doc)).filter(
    (task) => task.fieldValues?.[key] !== undefined,
  ).length;
}

type OpeningChoiceSnapshot = Map<string, string>;

function openingChoiceSnapshots(
  openingDrafts: readonly FieldDefinitionDraft[],
): Map<string, OpeningChoiceSnapshot> {
  const byKey = new Map<string, OpeningChoiceSnapshot>();
  for (const draft of openingDrafts) {
    if (draft.type !== "choice") continue;
    const rows = new Map<string, string>();
    for (const row of draft.choiceRows) {
      rows.set(row.rowId, row.value);
    }
    byKey.set(draft.key, rows);
  }
  return byKey;
}

function choiceValueChanges(
  openingDrafts: readonly FieldDefinitionDraft[],
  closingDrafts: readonly FieldDefinitionDraft[],
): {
  renames: Map<string, { from: string; to: string }[]>;
  dropValues: Map<string, Set<string>>;
} {
  const renames = new Map<string, { from: string; to: string }[]>();
  const dropValues = new Map<string, Set<string>>();
  const openingByKey = new Map(openingDrafts.map((d) => [d.key, d]));
  const openingChoices = openingChoiceSnapshots(openingDrafts);

  for (const closing of closingDrafts) {
    if (closing.type !== "choice") continue;
    const opening = openingByKey.get(closing.key);
    const openingRows = openingChoices.get(closing.key);
    if (opening == null || openingRows == null) continue;

    const closingRowIds = new Set(closing.choiceRows.map((r) => r.rowId));
    const keyRenames: { from: string; to: string }[] = [];
    const keyDrops = new Set<string>();

    for (const [rowId, openText] of openingRows) {
      const trimmedOpen = trimChoiceValue(openText);
      if (!closingRowIds.has(rowId)) {
        if (trimmedOpen.length > 0) keyDrops.add(trimmedOpen);
        continue;
      }
      const closingRow = closing.choiceRows.find((r) => r.rowId === rowId);
      if (closingRow == null) continue;
      const trimmedClose = trimChoiceValue(closingRow.value);
      if (
        trimmedOpen.length > 0 &&
        trimmedClose.length > 0 &&
        trimmedOpen !== trimmedClose
      ) {
        keyRenames.push({ from: trimmedOpen, to: trimmedClose });
      }
    }

    if (keyRenames.length > 0) renames.set(closing.key, keyRenames);
    if (keyDrops.size > 0) dropValues.set(closing.key, keyDrops);
  }

  return { renames, dropValues };
}

function applyChoiceRename(value: string, renames: { from: string; to: string }[]): string {
  const direct = renames.find((pair) => pair.from === value);
  return direct != null ? direct.to : value;
}

function applyFieldValuesTransform(
  task: Task,
  finalDefs: readonly ScheduleFieldDef[],
  removedKeys: Set<string>,
  choiceRenames: Map<string, { from: string; to: string }[]>,
  choiceDrops: Map<string, Set<string>>,
): Task {
  const raw = task.fieldValues;
  if (raw == null) return task;
  const defsByKey = new Map(finalDefs.map((def) => [def.key, def]));
  const next: TaskFieldValues = {};

  for (const key of Object.keys(raw)) {
    if (removedKeys.has(key)) continue;
    const def = defsByKey.get(key);
    if (def == null) continue;

    let value = raw[key];
    if (def.type === "choice" && typeof value === "string") {
      const renames = choiceRenames.get(key);
      if (renames != null) {
        value = applyChoiceRename(value, renames);
      }
      const drops = choiceDrops.get(key);
      if (drops != null && drops.has(value)) {
        continue;
      }
    }

    const normalized = normalizeStoredFieldValue(def, value);
    if (normalized !== undefined) {
      next[key] = normalized;
    }
  }

  if (Object.keys(next).length === 0) {
    const { fieldValues: _removed, ...rest } = task;
    void _removed;
    return rest;
  }
  return { ...task, fieldValues: next };
}

export function fieldNamesWithDroppedValues(
  doc: DocumentSnapshot,
  openingDrafts: readonly FieldDefinitionDraft[],
  closingDrafts: readonly FieldDefinitionDraft[],
): string[] {
  const committed = applyFieldDefinitionEditorCommit(
    doc,
    openingDrafts,
    closingDrafts,
  );
  const nameByKey = new Map<string, string>();
  for (const def of draftsToFieldDefinitions(openingDrafts) ?? []) {
    nameByKey.set(def.key, def.name);
  }
  for (const def of draftsToFieldDefinitions(closingDrafts) ?? []) {
    nameByKey.set(def.key, def.name);
  }
  const afterById = new Map(
    collectTasksFromDocument(documentForTaskWalk(committed)).map((task) => [
      task.id,
      task,
    ]),
  );
  const names = new Set<string>();
  for (const task of collectTasksFromDocument(documentForTaskWalk(doc))) {
    const beforeFv = task.fieldValues;
    if (beforeFv == null) continue;
    const afterFv = afterById.get(task.id)?.fieldValues;
    for (const key of Object.keys(beforeFv)) {
      if (beforeFv[key] === afterFv?.[key]) continue;
      names.add(nameByKey.get(key) ?? key);
    }
  }
  return [...names];
}

export function fieldDefinitionRequiredSavePreview(
  doc: DocumentSnapshot,
  openingDrafts: readonly FieldDefinitionDraft[],
  closingDrafts: readonly FieldDefinitionDraft[],
): string | null {
  const committed = applyFieldDefinitionEditorCommit(
    doc,
    openingDrafts,
    closingDrafts,
  );
  const defs = draftsToFieldDefinitions(closingDrafts) ?? [];
  const gate = assessRequiredFieldValuesSave(committed, defs);
  return gate.ok ? null : gate.message;
}

export function fieldDefinitionValueDropPreview(
  doc: DocumentSnapshot,
  openingDrafts: readonly FieldDefinitionDraft[],
  closingDrafts: readonly FieldDefinitionDraft[],
): string | null {
  const unique = fieldNamesWithDroppedValues(doc, openingDrafts, closingDrafts);
  if (unique.length === 0) return null;
  const shown = unique
    .slice(0, 3)
    .map((name) => `「${name}」`)
    .join("");
  const rest = unique.length > 3 ? `ほか ${unique.length - 3} 件` : "";
  return `閉じると、${shown}の合わない値が外れます。${rest}`.trim();
}

export function applyFieldDefinitionEditorCommit<T extends DocumentSnapshot>(
  doc: T,
  openingDrafts: readonly FieldDefinitionDraft[],
  closingDrafts: readonly FieldDefinitionDraft[],
): T {
  const finalFields = draftsToFieldDefinitions(closingDrafts);
  const finalDefs = finalFields ?? [];
  const finalKeys = new Set(finalDefs.map((def) => def.key));
  const openingDefs = draftsToFieldDefinitions(openingDrafts) ?? [];
  const removedKeys = new Set(
    openingDefs.map((def) => def.key).filter((key) => !finalKeys.has(key)),
  );
  const { renames, dropValues } = choiceValueChanges(openingDrafts, closingDrafts);

  const transform = (task: Task) =>
    applyFieldValuesTransform(task, finalDefs, removedKeys, renames, dropValues);

  const categories = mapTasks(doc.categories, transform);
  let outline = doc.outline;
  if (outline != null) {
    outline = mapAllTasksInOutline(outline, transform);
  }

  return {
    ...doc,
    categories,
    outline,
  } as T;
}

export function defaultFieldValuesForNewTask(
  fields: readonly ScheduleFieldDef[] | undefined,
): TaskFieldValues | undefined {
  if (fields == null || fields.length === 0) return undefined;
  const values: TaskFieldValues = {};
  for (const def of fields) {
    if (def.default === undefined) continue;
    const normalized = normalizeStoredFieldValue(def, def.default);
    if (normalized !== undefined) {
      values[def.key] = normalized;
    }
  }
  return Object.keys(values).length > 0 ? values : undefined;
}

export function cloneFieldDefinitionDrafts(
  drafts: readonly FieldDefinitionDraft[],
): FieldDefinitionDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    choiceRows: draft.choiceRows.map((row) => ({ ...row })),
  }));
}
