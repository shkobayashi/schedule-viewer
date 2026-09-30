import { invoke, isTauri } from "@tauri-apps/api/core";
import type { MemberCatalogInfo } from "./memberTypes";
import type { MembersDocument } from "./memberTypes";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "./validateMembers";

export type AppMembersSettings = {
  selectedCatalogId: string | null;
  catalogs: MemberCatalogInfo[];
};

const BROWSER_STORAGE_ERROR = "ブラウザの保存領域に書けませんでした。";
const MAX_MEMBERS_BYTES = 2 * 1024 * 1024;

const LS_CATALOGS = "schedule-viewer/members/catalogs";
const LS_SELECTED = "schedule-viewer/members/selected";
const LS_SAMPLE_SEEDED = "schedule-viewer/members/sample-seeded";

let sampleSeedInFlight: Promise<void> | null = null;

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

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

export async function loadAppMembersSettings(): Promise<AppMembersSettings> {
  if (isTauri()) {
    return invoke<AppMembersSettings>("get_members_settings");
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

export async function readMemberCatalog(
  catalogId: string,
): Promise<MembersDocument | null> {
  if (isTauri()) {
    const text = await invoke<string | null>("read_member_catalog", {
      catalogId,
    });
    if (text == null) return null;
    return parseMemberCatalogText(text);
  }
  const stored = readBrowserCatalogs();
  const text = stored[catalogId];
  if (!text) return null;
  return parseMemberCatalogText(text);
}

function parseMemberCatalogText(text: string): MembersDocument {
  let data: unknown;
  try {
    data = JSON.parse(stripUtf8Bom(text));
  } catch {
    throw new Error("メンバー JSON の形式が正しくありません。");
  }
  const result = validateMembers(data);
  if (!result.ok) {
    throw new Error(formatMembersValidationErrors(result.errors));
  }
  return result.document;
}

export async function importMemberCatalog(
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
    await invoke("import_member_catalog", {
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

export async function deleteMemberCatalog(catalogId: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_member_catalog", { catalogId });
    return;
  }
  const stored = readBrowserCatalogs();
  delete stored[catalogId];
  writeBrowserCatalogs(stored);
  if (readBrowserSelected() === catalogId) {
    writeBrowserSelected(null);
  }
}

export async function setSelectedMemberCatalog(
  catalogId: string | null,
): Promise<void> {
  if (isTauri()) {
    await invoke("set_selected_member_catalog", { catalogId });
    return;
  }
  writeBrowserSelected(catalogId);
}

export function pickMembersJsonFile(): Promise<{ name: string; contents: string } | null> {
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
      if (file.size > MAX_MEMBERS_BYTES) {
        cleanup();
        reject(new Error("メンバーファイルが大きすぎます（上限 2 MB）"));
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

export function catalogIdFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const stem = base.replace(/\.json$/i, "").trim();
  return stem || "members";
}

/** 未使用のアプリデータにだけサンプルを入れる。消したあとは戻さない。 */
export async function seedSampleMemberCatalogOnce(
  catalogId: string,
  contents: string,
): Promise<void> {
  if (localStorage.getItem(LS_SAMPLE_SEEDED) === "1") return;
  if (sampleSeedInFlight) {
    await sampleSeedInFlight;
    return;
  }
  sampleSeedInFlight = (async () => {
    if (localStorage.getItem(LS_SAMPLE_SEEDED) === "1") return;
    const settings = await loadAppMembersSettings();
    if (settings.catalogs.length === 0) {
      await importMemberCatalog(catalogId, contents, false);
      await setSelectedMemberCatalog(catalogId);
    }
    writeBrowserStorage(() => {
      localStorage.setItem(LS_SAMPLE_SEEDED, "1");
    });
  })();
  try {
    await sampleSeedInFlight;
  } finally {
    sampleSeedInFlight = null;
  }
}
