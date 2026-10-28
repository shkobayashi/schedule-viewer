import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ColorCatalogInfo, ColorsDocument } from "./colorCatalog";
import {
  formatColorsValidationErrors,
  validateColors,
} from "./validateColors";
import { stripUtf8Bom } from "./memberAppData";

export type AppColorsSettings = {
  selectedCatalogId: string | null;
  catalogs: ColorCatalogInfo[];
};

const BROWSER_STORAGE_ERROR = "ブラウザの保存領域に書けませんでした。";
const MAX_COLORS_BYTES = 2 * 1024 * 1024;

const LS_CATALOGS = "schedule-viewer/colors/catalogs";
const LS_SELECTED = "schedule-viewer/colors/selected";

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

function readBrowserSelected(): string | null {
  const value = localStorage.getItem(LS_SELECTED);
  return value && value.length > 0 ? value : null;
}

function writeBrowserSelected(id: string | null): void {
  writeBrowserStorage(() => {
    if (id == null) {
      localStorage.removeItem(LS_SELECTED);
    } else {
      localStorage.setItem(LS_SELECTED, id);
    }
  });
}

export async function loadAppColorsSettings(): Promise<AppColorsSettings> {
  if (isTauri()) {
    return invoke<AppColorsSettings>("get_colors_settings");
  }
  const stored = readBrowserCatalogs();
  const catalogs = Object.keys(stored)
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((id) => ({ id, label: id }));
  return {
    selectedCatalogId: readBrowserSelected(),
    catalogs,
  };
}

function parseColorCatalogText(text: string): ColorsDocument {
  let data: unknown;
  try {
    data = JSON.parse(stripUtf8Bom(text));
  } catch {
    throw new Error("色の一覧 JSON の形式が正しくありません。");
  }
  const result = validateColors(data);
  if (!result.ok) {
    throw new Error(formatColorsValidationErrors(result.errors));
  }
  return result.document;
}

export async function readColorCatalog(
  catalogId: string,
): Promise<ColorsDocument | null> {
  if (isTauri()) {
    const text = await invoke<string | null>("read_color_catalog", {
      catalogId,
    });
    if (text == null) return null;
    return parseColorCatalogText(text);
  }
  const stored = readBrowserCatalogs();
  const text = stored[catalogId];
  if (!text) return null;
  return parseColorCatalogText(text);
}

export async function importColorCatalog(
  catalogId: string,
  contents: string,
  overwrite: boolean,
): Promise<void> {
  const safeId = catalogId.trim();
  if (!safeId) {
    throw new Error("カタログ名が空です。");
  }
  const body = stripUtf8Bom(contents);
  if (isTauri()) {
    await invoke("import_color_catalog", {
      catalogId: safeId,
      contents: body,
      overwrite,
    });
    return;
  }
  const stored = readBrowserCatalogs();
  if (!overwrite && stored[safeId] != null) {
    throw new Error("同じ名前のカタログが既にあります。");
  }
  stored[safeId] = body;
  writeBrowserCatalogs(stored);
}

export async function deleteColorCatalog(catalogId: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_color_catalog", { catalogId });
    return;
  }
  const stored = readBrowserCatalogs();
  delete stored[catalogId];
  writeBrowserCatalogs(stored);
  if (readBrowserSelected() === catalogId) {
    writeBrowserSelected(null);
  }
}

export type ClaimColorCatalogEditResult = {
  claimed: boolean;
  holderLabel?: string;
};

export async function claimColorCatalogEdit(
  catalogId: string,
): Promise<ClaimColorCatalogEditResult> {
  if (!isTauri()) {
    return { claimed: true };
  }
  return invoke<ClaimColorCatalogEditResult>("claim_color_catalog_edit", {
    catalogId,
  });
}

export async function releaseColorCatalogEdit(
  catalogId?: string | null,
): Promise<void> {
  if (!isTauri()) return;
  await invoke("release_color_catalog_edit", {
    catalogId: catalogId ?? null,
  });
}

export async function setSelectedColorCatalog(
  catalogId: string | null,
): Promise<void> {
  if (isTauri()) {
    await invoke("set_selected_color_catalog", { catalogId });
    return;
  }
  writeBrowserSelected(catalogId);
}

export function pickColorsJsonFile(): Promise<{ name: string; contents: string } | null> {
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
      if (file.size > MAX_COLORS_BYTES) {
        cleanup();
        reject(new Error("色の一覧ファイルが大きすぎます（上限 2 MB）"));
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
        resolve(null);
      };
      reader.readAsText(file);
    });
    input.addEventListener("cancel", () => {
      cleanup();
      resolve(null);
    });
    input.click();
  });
}

export function colorCatalogIdFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const stem = base.replace(/\.json$/i, "").trim();
  return stem || "colors";
}

export async function writeColorsAtPath(
  path: string,
  contents: string,
  workspacePath: string | null,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("この操作はデスクトップ版だけ使えます。");
  }
  const body = stripUtf8Bom(contents);
  await invoke("write_colors_at_path", {
    path,
    contents: body,
    workspacePath,
  });
}

export async function createWorkspaceColorsCatalog(
  workspacePath: string,
  relativeFileName: string,
  contents: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("この操作はデスクトップ版だけ使えます。");
  }
  await invoke("create_workspace_colors_catalog", {
    workspacePath,
    relativeFileName,
    contents,
  });
}

export async function exportColorsJson(
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  if (isTauri()) {
    return invoke<string | null>("save_colors_json", { contents, suggestedName });
  }
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${suggestedName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return null;
}
