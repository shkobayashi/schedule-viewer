import { invoke, isTauri } from "@tauri-apps/api/core";
import type { StatusCatalogInfo, StatusesDocument } from "./statusCatalog";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "./validateStatuses";
import { stripUtf8Bom } from "./memberAppData";

export type AppStatusesSettings = {
  selectedCatalogId: string | null;
  catalogs: StatusCatalogInfo[];
};

const BROWSER_STORAGE_ERROR = "ブラウザの保存領域に書けませんでした。";
const MAX_STATUSES_BYTES = 2 * 1024 * 1024;

const LS_CATALOGS = "schedule-viewer/statuses/catalogs";
const LS_SELECTED = "schedule-viewer/statuses/selected";
const LS_BUILTIN_SEEDED = "schedule-viewer/statuses/builtin-seeded";

let builtinSeedInFlight: Promise<void> | null = null;

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

function catalogLabelFromId(id: string): string {
  return id;
}

export async function loadAppStatusesSettings(): Promise<AppStatusesSettings> {
  if (isTauri()) {
    return invoke<AppStatusesSettings>("get_statuses_settings");
  }
  const stored = readBrowserCatalogs();
  const catalogs = Object.keys(stored)
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((id) => ({ id, label: catalogLabelFromId(id) }));
  return {
    selectedCatalogId: readBrowserSelected(),
    catalogs,
  };
}

export async function readStatusCatalog(
  catalogId: string,
): Promise<StatusesDocument | null> {
  if (isTauri()) {
    const text = await invoke<string | null>("read_status_catalog", {
      catalogId,
    });
    if (text == null) return null;
    return parseStatusCatalogText(text);
  }
  const stored = readBrowserCatalogs();
  const text = stored[catalogId];
  if (!text) return null;
  return parseStatusCatalogText(text);
}

function parseStatusCatalogText(text: string): StatusesDocument {
  let data: unknown;
  try {
    data = JSON.parse(stripUtf8Bom(text));
  } catch {
    throw new Error("ステータス JSON の形式が正しくありません。");
  }
  const result = validateStatuses(data);
  if (!result.ok) {
    throw new Error(formatStatusesValidationErrors(result.errors));
  }
  return result.document;
}

export async function importStatusCatalog(
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
    await invoke("import_status_catalog", {
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

export async function deleteStatusCatalog(catalogId: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_status_catalog", { catalogId });
    return;
  }
  const stored = readBrowserCatalogs();
  delete stored[catalogId];
  writeBrowserCatalogs(stored);
  if (readBrowserSelected() === catalogId) {
    writeBrowserSelected(null);
  }
}

export type ClaimStatusCatalogEditResult = {
  claimed: boolean;
  holderLabel?: string;
};

export async function claimStatusCatalogEdit(
  catalogId: string,
): Promise<ClaimStatusCatalogEditResult> {
  if (!isTauri()) {
    return { claimed: true };
  }
  return invoke<ClaimStatusCatalogEditResult>("claim_status_catalog_edit", {
    catalogId,
  });
}

export async function releaseStatusCatalogEdit(
  catalogId?: string | null,
): Promise<void> {
  if (!isTauri()) return;
  await invoke("release_status_catalog_edit", {
    catalogId: catalogId ?? null,
  });
}

export async function setSelectedStatusCatalog(
  catalogId: string | null,
): Promise<void> {
  if (isTauri()) {
    await invoke("set_selected_status_catalog", { catalogId });
    return;
  }
  writeBrowserSelected(catalogId);
}

export function pickStatusesJsonFile(): Promise<{ name: string; contents: string } | null> {
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
      if (file.size > MAX_STATUSES_BYTES) {
        cleanup();
        reject(new Error("ステータスファイルが大きすぎます（上限 2 MB）"));
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

export function statusCatalogIdFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const stem = base.replace(/\.json$/i, "").trim();
  return stem || "statuses";
}

/** 未使用のアプリデータにだけ組み込みの一覧を入れる。消したあとは戻さない。 */
export async function seedBuiltinStatusCatalogOnce(
  catalogId: string,
  contents: string,
): Promise<void> {
  if (localStorage.getItem(LS_BUILTIN_SEEDED) === "1") return;
  if (builtinSeedInFlight) {
    await builtinSeedInFlight;
    return;
  }
  builtinSeedInFlight = (async () => {
    if (localStorage.getItem(LS_BUILTIN_SEEDED) === "1") return;
    const settings = await loadAppStatusesSettings();
    if (settings.catalogs.length === 0) {
      await importStatusCatalog(catalogId, contents, false);
      await setSelectedStatusCatalog(catalogId);
    }
    writeBrowserStorage(() => {
      localStorage.setItem(LS_BUILTIN_SEEDED, "1");
    });
  })();
  try {
    await builtinSeedInFlight;
  } finally {
    builtinSeedInFlight = null;
  }
}

/** 一覧を JSON として書き出す。デスクトップ版は保存ダイアログ、ブラウザ版はダウンロード。キャンセルは null。 */
export async function writeStatusesAtPath(
  path: string,
  contents: string,
  workspacePath: string | null,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("この操作はデスクトップ版だけ使えます。");
  }
  const body = stripUtf8Bom(contents);
  await invoke("write_statuses_at_path", {
    path,
    contents: body,
    workspacePath,
  });
}

export async function exportStatusesJson(
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  if (isTauri()) {
    return invoke<string | null>("save_statuses_json", { contents, suggestedName });
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
