import {
  draftToFieldDef,
  draftsToFieldDefinitions,
  fieldDefinitionCloseIssues,
  fieldDraftsFromFields,
  newFieldDefinitionDraft,
  type FieldDefinitionDraft,
} from "./fieldDefinitionEdit";
import {
  detectExtensionSelectionCollisions,
  extensionItemToScheduleDef,
  isValidPluginOrItemId,
  scheduleDefsFromExtension,
} from "./fieldExtensionMerge";
import type { FieldExtensionDocument } from "./fieldExtensionTypes";
import type { ScheduleFieldDef } from "./types";
import { normalizeFieldDefinition } from "./taskFields";

export function nextFieldExtensionCatalogId(
  existingIds: readonly string[],
): string {
  const used = new Set(existingIds);
  if (!used.has("custom")) return "custom";
  let n = 2;
  while (used.has(`custom-${n}`)) n += 1;
  return `custom-${n}`;
}

export function newEmptyExtensionDocument(
  pluginId: string,
): FieldExtensionDocument {
  const itemId = "field-1";
  return {
    schemaVersion: 1,
    id: pluginId,
    name: "新しい拡張",
    fields: [
      {
        id: itemId,
        name: "項目",
        type: "text",
      },
    ],
  };
}

export function extensionDraftsFromDocument(
  document: FieldExtensionDocument,
): FieldDefinitionDraft[] {
  const defs = scheduleDefsFromExtension(document);
  return fieldDraftsFromFields(defs).map((draft, index) => {
    const item = document.fields[index];
    return item != null ? { ...draft, key: item.id } : draft;
  });
}

export function extensionDocumentFromDrafts(
  pluginId: string,
  displayName: string,
  drafts: readonly FieldDefinitionDraft[],
): { ok: true; document: FieldExtensionDocument } | { ok: false; message: string } {
  const trimmedName = displayName.trim();
  if (trimmedName.length === 0) {
    return { ok: false, message: "拡張の名前が空です。" };
  }
  if (!isValidPluginOrItemId(pluginId)) {
    return {
      ok: false,
      message: "プラグイン ID に空白と _ は使えません。",
    };
  }
  const closeIssues = fieldDefinitionCloseIssues(drafts);
  if (closeIssues.length > 0) {
    return { ok: false, message: closeIssues[0]!.message };
  }
  const fieldDefs = draftsToFieldDefinitions([...drafts]);
  if (fieldDefs == null || fieldDefs.length === 0) {
    return { ok: false, message: "項目は1件以上必要です。" };
  }
  const fields = fieldDefs.map((def, index) => {
    const draft = drafts[index];
    const itemId = draft?.key ?? def.key;
    if (!isValidPluginOrItemId(itemId)) {
      throw new Error("項目 ID に空白と _ は使えません。");
    }
    const item: FieldExtensionDocument["fields"][number] = {
      id: itemId,
      name: def.name,
      type: def.type,
    };
    let result = item;
    if (def.meaning) result = { ...result, meaning: def.meaning };
    if (def.instruction) result = { ...result, instruction: def.instruction };
    if (def.required === true) result = { ...result, required: true };
    if (def.type === "number" && def.percent === true) {
      result = { ...result, percent: true };
    }
    if (def.type === "choice" && def.choices != null) {
      result = { ...result, choices: [...def.choices] };
    }
    if (def.default !== undefined) {
      result = { ...result, default: def.default };
    }
    return result;
  });

  return {
    ok: true,
    document: {
      schemaVersion: 1,
      id: pluginId,
      name: trimmedName,
      fields,
    },
  };
}

export function fieldExtensionDocumentToJson(
  document: FieldExtensionDocument,
): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function collisionAfterExtensionSave(
  document: FieldExtensionDocument,
  otherSelected: readonly FieldExtensionDocument[],
): string | null {
  const others = otherSelected.filter((entry) => entry.id !== document.id);
  const collisions = detectExtensionSelectionCollisions([document, ...others]);
  const hit = collisions[0];
  if (hit == null) return null;
  return `合成キー「${hit.key}」が、選んだ拡張と重なるため保存できません。`;
}

export function scheduleDefsForExtensionItems(
  pluginId: string,
  drafts: readonly FieldDefinitionDraft[],
): ScheduleFieldDef[] {
  return drafts.map((draft) =>
    extensionItemToScheduleDef(pluginId, {
      id: draft.key,
      name: draft.name,
      type: draft.type,
      ...(draft.meaning.trim() ? { meaning: draft.meaning.trim() } : {}),
      ...(draft.instruction.trim()
        ? { instruction: draft.instruction.trim() }
        : {}),
      ...(draft.required ? { required: true as const } : {}),
      ...(draft.type === "number" && draft.percent ? { percent: true as const } : {}),
      ...(draft.type === "choice"
        ? {
            choices: draft.choiceRows.map((row) => row.value.trim()).filter(Boolean),
          }
        : {}),
      ...(draft.defaultText.trim()
        ? { default: draftToFieldDef(draft).default }
        : {}),
    }),
  );
}

export function normalizeExtensionDocument(
  document: FieldExtensionDocument,
): FieldExtensionDocument {
  const defs = scheduleDefsFromExtension(document);
  const normalized = defs.map((def) => normalizeFieldDefinition(def));
  const fields = document.fields.map((item, index) => {
    const def = normalized[index];
    if (def == null) return item;
    return {
      ...item,
      name: def.name,
      type: def.type,
      ...(def.meaning ? { meaning: def.meaning } : {}),
      ...(def.instruction ? { instruction: def.instruction } : {}),
      ...(def.required ? { required: true as const } : {}),
      ...(def.percent ? { percent: true as const } : {}),
      ...(def.choices ? { choices: def.choices } : {}),
      ...(def.default !== undefined ? { default: def.default } : {}),
    };
  });
  return { ...document, fields };
}

export function newExtensionItemDraft(
  existing: readonly FieldDefinitionDraft[],
): FieldDefinitionDraft {
  return newFieldDefinitionDraft(existing);
}
