import type { FieldExtensionDocument, FieldExtensionItemDef } from "./fieldExtensionTypes";
import type { ScheduleFieldDef } from "./types";

const PLUGIN_OR_ITEM_ID_PATTERN = /^[^\s_]+$/;

export function isValidPluginOrItemId(id: string): boolean {
  return id.length > 0 && PLUGIN_OR_ITEM_ID_PATTERN.test(id);
}

export function compositeFieldKey(pluginId: string, itemId: string): string {
  return `${pluginId}_${itemId}`;
}

export function extensionItemToScheduleDef(
  pluginId: string,
  item: FieldExtensionItemDef,
): ScheduleFieldDef {
  const base: ScheduleFieldDef = {
    key: compositeFieldKey(pluginId, item.id),
    name: item.name,
    type: item.type,
  };
  let result: ScheduleFieldDef = base;
  const meaning = item.meaning?.trim();
  const instruction = item.instruction?.trim();
  if (meaning && meaning.length > 0) {
    result = { ...result, meaning };
  }
  if (instruction && instruction.length > 0) {
    result = { ...result, instruction };
  }
  if (item.required === true) {
    result = { ...result, required: true };
  }
  if (item.type === "number" && item.percent === true) {
    result = { ...result, percent: true };
  }
  if (item.type === "choice" && item.choices != null) {
    result = { ...result, choices: [...item.choices] };
  }
  if (item.default !== undefined) {
    result = { ...result, default: item.default };
  }
  return result;
}

export function scheduleDefsFromExtension(
  document: FieldExtensionDocument,
): ScheduleFieldDef[] {
  return document.fields.map((item) =>
    extensionItemToScheduleDef(document.id, item),
  );
}

export function mergeExtensionFieldDefs(
  documents: readonly FieldExtensionDocument[],
): ScheduleFieldDef[] {
  const merged: ScheduleFieldDef[] = [];
  for (const doc of documents) {
    merged.push(...scheduleDefsFromExtension(doc));
  }
  return merged;
}

export function mergeEffectiveFieldDefinitions(
  extensionFields: readonly ScheduleFieldDef[],
): ScheduleFieldDef[] {
  return [...extensionFields];
}

export type FieldKeyCollision = {
  kind: "extension";
  key: string;
  pluginIds: string[];
};

export function formatFieldKeyCollisionMessage(
  collision: FieldKeyCollision,
): string {
  return `合成キー「${collision.key}」が、選んだ拡張と重なるため選べません。`;
}

export function firstFieldKeyCollision(
  documents: readonly FieldExtensionDocument[],
): FieldKeyCollision | null {
  const collisions = detectExtensionSelectionCollisions(documents);
  return collisions[0] ?? null;
}

export function detectExtensionSelectionCollisions(
  documents: readonly FieldExtensionDocument[],
): FieldKeyCollision[] {
  const collisions: FieldKeyCollision[] = [];
  const seenExtensionKeys = new Map<string, string>();

  for (const doc of documents) {
    for (const item of doc.fields) {
      const key = compositeFieldKey(doc.id, item.id);
      const prev = seenExtensionKeys.get(key);
      if (prev != null && prev !== doc.id) {
        const existing = collisions.find(
          (c) => c.kind === "extension" && c.key === key,
        );
        if (existing && existing.kind === "extension") {
          if (!existing.pluginIds.includes(doc.id)) {
            existing.pluginIds.push(doc.id);
          }
        } else {
          collisions.push({ kind: "extension", key, pluginIds: [prev, doc.id] });
        }
      }
      seenExtensionKeys.set(key, doc.id);
    }
  }
  return collisions;
}

export function knownFieldKeysFromDefs(
  defs: readonly ScheduleFieldDef[],
): Set<string> {
  return new Set(defs.map((def) => def.key));
}

export function orphanFieldValues(
  fieldValues: Record<string, string | number> | undefined,
  knownKeys: ReadonlySet<string>,
): Record<string, string | number> {
  if (fieldValues == null) return {};
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    if (!knownKeys.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

export function hasOrphanFieldValuesInTasks(
  tasks: readonly { fieldValues?: Record<string, string | number> }[],
  knownKeys: ReadonlySet<string>,
): boolean {
  for (const task of tasks) {
    if (task.fieldValues == null) continue;
    for (const key of Object.keys(task.fieldValues)) {
      if (!knownKeys.has(key)) return true;
    }
  }
  return false;
}
