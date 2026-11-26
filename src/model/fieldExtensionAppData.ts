import { invoke, isTauri } from "@tauri-apps/api/core";
import type {
  AppFieldExtensionsSettings,
  FieldExtensionCatalogInfo,
  FieldExtensionDocument,
} from "./fieldExtensionTypes";
import { stripUtf8Bom } from "./memberAppData";
import {
  formatFieldExtensionsValidationErrors,
  validateFieldExtensions,
} from "./validateFieldExtensions";
import { bumpSharedSettingsRevision } from "./sharedSettingsRevision";

const BROWSER_STORAGE_ERROR = "ブラウザの保存領域に書けませんでした。";
const MAX_FIELD_EXTENSIONS_BYTES = 2 * 1024 * 1024;

const LS_CATALOGS = "schedule-viewer/field-extensions/catalogs";
const LS_SELECTED = "schedule-viewer/field-extensions/selected";

function readBrowserCatalogs(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_CATALOGS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeBrowserStorage(write: () => void): void {
  try {
    write();
  } catch {
    throw new Error(BROWSER_STORAGE_ERROR);
  }
}

function writeBrowserCatalogs(catalogs: Record<string, string>): void {
  writeBrowserStorage(() => {
    localStorage.setItem(LS_CATALOGS, JSON.stringify(catalogs));
  });
}

function readBrowserSelected(): string[] {
  try {
    const raw = localStorage.getItem(LS_SELECTED);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function writeBrowserSelected(ids: string[]): void {
  writeBrowserStorage(() => {
    if (ids.length === 0) {
      localStorage.removeItem(LS_SELECTED);
    } else {
      localStorage.setItem(LS_SELECTED, JSON.stringify(ids));
    }
  });
}

function catalogLabelFromDocument(text: string, fallbackId: string): string {
  try {
    const data = JSON.parse(stripUtf8Bom(text)) as { name?: string };
    if (typeof data.name === "string" && data.name.trim().length > 0) {
      return data.name.trim();
    }
  } catch {
    // ignore
  }
  return fallbackId;
}

export async function readFieldExtensionDocumentsForIds(
  catalogIds: readonly string[],
): Promise<FieldExtensionDocument[]> {
  const documents: FieldExtensionDocument[] = [];
  for (const id of catalogIds) {
    const doc = await readFieldExtensionCatalog(id);
    if (doc != null) {
      documents.push(doc);
    }
  }
  return documents;
}

export async function loadAppFieldExtensionsSettings(): Promise<AppFieldExtensionsSettings> {
  if (isTauri()) {
    const result = await invoke<AppFieldExtensionsSettings>(
      "get_field_extensions_settings",
    );
    const catalogs: FieldExtensionCatalogInfo[] = [];
    for (const catalog of result.catalogs) {
      const doc = await readFieldExtensionCatalog(catalog.id);
      catalogs.push({
        id: catalog.id,
        label: doc?.name ?? catalog.label,
      });
    }
    return { ...result, catalogs };
  }
  const stored = readBrowserCatalogs();
  const catalogs: FieldExtensionCatalogInfo[] = Object.keys(stored)
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((id) => ({
      id,
      label: catalogLabelFromDocument(stored[id], id),
    }));
  const selectedRaw = readBrowserSelected();
  const selectedCatalogIds = selectedRaw.filter((id) => stored[id] != null);
  return { selectedCatalogIds, catalogs };
}

export function parseFieldExtensionCatalogText(
  text: string,
): FieldExtensionDocument {
  let data: unknown;
  try {
    data = JSON.parse(stripUtf8Bom(text));
  } catch {
    throw new Error("拡張項目 JSON の形式が正しくありません。");
  }
  const result = validateFieldExtensions(data);
  if (!result.ok) {
    throw new Error(formatFieldExtensionsValidationErrors(result.errors));
  }
  return result.document;
}

export async function readFieldExtensionCatalog(
  catalogId: string,
): Promise<FieldExtensionDocument | null> {
  if (isTauri()) {
    const text = await invoke<string | null>("read_field_extension_catalog", {
      catalogId,
    });
    if (text == null) return null;
    return parseFieldExtensionCatalogText(text);
  }
  const stored = readBrowserCatalogs();
  const text = stored[catalogId];
  if (!text) return null;
  return parseFieldExtensionCatalogText(text);
}

export async function writeFieldExtensionAtPath(
  path: string,
  contents: string,
  workspacePath: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("ブラウザ版では保存できません。");
  }
  await invoke("write_field_extension_at_path", {
    path,
    contents,
    workspacePath,
  });
}

export async function createWorkspaceEditableFieldExtension(
  workspacePath: string,
  relativeFileName: string,
  contents: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("ブラウザ版では作成できません。");
  }
  await invoke("create_workspace_editable_field_extension", {
    workspacePath,
    relativeFileName,
    contents,
  });
}

export async function deleteWorkspaceEditableFieldExtension(
  workspacePath: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("ブラウザ版では削除できません。");
  }
  await invoke("delete_workspace_editable_field_extension", {
    workspacePath,
  });
}

export async function clearWorkspaceEditableFieldExtension(
  workspacePath: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("ブラウザ版では操作できません。");
  }
  await invoke("clear_workspace_editable_field_extension", {
    workspacePath,
  });
}

export type ClaimFieldExtensionEditResult = {
  claimed: boolean;
  holderLabel?: string;
};

export async function claimFieldExtensionEdit(
  editKey: string,
): Promise<ClaimFieldExtensionEditResult> {
  if (!isTauri()) {
    return { claimed: true };
  }
  return invoke<ClaimFieldExtensionEditResult>("claim_field_extension_edit", {
    editKey,
  });
}

export async function releaseFieldExtensionEdit(
  editKey?: string | null,
): Promise<void> {
  if (!isTauri()) return;
  await invoke("release_field_extension_edit", {
    editKey: editKey ?? null,
  });
}

export async function saveFieldExtensionJson(
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  if (!isTauri()) {
    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName;
    anchor.click();
    URL.revokeObjectURL(url);
    return null;
  }
  return invoke<string | null>("save_field_extension_json", {
    contents,
    suggestedName,
  });
}

export async function importFieldExtensionCatalog(
  contents: string,
  overwrite: boolean,
): Promise<string> {
  const body = stripUtf8Bom(contents);
  const document = parseFieldExtensionCatalogText(body);
  const catalogId = document.id;
  if (isTauri()) {
    await invoke("import_field_extension_catalog", {
      catalogId,
      contents: body,
      overwrite,
    });
    return catalogId;
  }
  const stored = readBrowserCatalogs();
  if (!overwrite && stored[catalogId] != null) {
    throw new Error("同じ名前のカタログが既にあります。");
  }
  stored[catalogId] = body;
  writeBrowserCatalogs(stored);
  return catalogId;
}

export async function deleteFieldExtensionCatalog(
  catalogId: string,
): Promise<void> {
  if (isTauri()) {
    await invoke("delete_field_extension_catalog", { catalogId });
    return;
  }
  const stored = readBrowserCatalogs();
  delete stored[catalogId];
  writeBrowserCatalogs(stored);
  const selected = readBrowserSelected().filter((id) => id !== catalogId);
  writeBrowserSelected(selected);
}

export async function setSelectedFieldExtensionCatalogs(
  catalogIds: string[],
): Promise<void> {
  if (isTauri()) {
    await invoke("set_selected_field_extension_catalogs", { catalogIds });
    return;
  }
  writeBrowserSelected(catalogIds);
}

export function pickFieldExtensionsJsonFile(): Promise<{
  name: string;
  contents: string;
} | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      if (file.size > MAX_FIELD_EXTENSIONS_BYTES) {
        cleanup();
        reject(new Error("拡張項目ファイルが大きすぎます（上限 2 MB）"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({
          name: file.name,
          contents: String(reader.result ?? ""),
        });
      };
      reader.onerror = () => {
        cleanup();
        reject(new Error("ファイルを読めませんでした。"));
      };
      reader.readAsText(file);
    });
    input.click();
  });
}

export async function toggleFieldExtensionCatalogSelection(
  catalogId: string,
  selected: boolean,
  currentIds: readonly string[],
): Promise<string[]> {
  const next = selected
    ? [...currentIds, catalogId]
    : currentIds.filter((id) => id !== catalogId);
  await setSelectedFieldExtensionCatalogs(next);
  bumpSharedSettingsRevision();
  return next;
}
