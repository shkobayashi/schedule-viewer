import { invoke, isTauri } from "@tauri-apps/api/core";

export const BROWSER_STORAGE_ERROR = "ブラウザの保存領域に書けませんでした。";
export const EMPTY_CATALOG_ID_ERROR = "カタログ名が空です。";
export const DUPLICATE_CATALOG_ERROR = "同じ名前のカタログが既にあります。";
export const DESKTOP_ONLY_ERROR = "この操作はデスクトップ版だけ使えます。";

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export type CatalogAppDataBrowserKeys = {
  catalogs: string;
  selected: string;
  seedFlag?: string;
};

export type CatalogAppDataTauriCommands = {
  getSettings: string;
  readCatalog: string;
  importCatalog: string;
  deleteCatalog: string;
  setSelectedCatalog: string;
  saveJson: string;
  writeAtPath: string;
};

export type CatalogAppDataAccessConfig = {
  browser: CatalogAppDataBrowserKeys;
  tauri: CatalogAppDataTauriCommands;
  maxImportBytes: number;
  importTooLargeError: string;
  defaultIdFromFilename: string;
};

export type CatalogListEntry = {
  id: string;
  label: string;
};

export type AppCatalogSettings = {
  selectedCatalogId: string | null;
  catalogs: CatalogListEntry[];
};

function readBrowserCatalogs(catalogsKey: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(catalogsKey);
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

export function writeBrowserStorage(write: () => void): void {
  try {
    write();
  } catch {
    throw new Error(BROWSER_STORAGE_ERROR);
  }
}

function writeBrowserCatalogs(
  catalogsKey: string,
  catalogs: Record<string, string>,
): void {
  writeBrowserStorage(() => {
    localStorage.setItem(catalogsKey, JSON.stringify(catalogs));
  });
}

function readBrowserSelected(selectedKey: string): string | null {
  const value = localStorage.getItem(selectedKey);
  return value && value.length > 0 ? value : null;
}

function writeBrowserSelected(selectedKey: string, id: string | null): void {
  writeBrowserStorage(() => {
    if (id == null) {
      localStorage.removeItem(selectedKey);
    } else {
      localStorage.setItem(selectedKey, id);
    }
  });
}

export function createCatalogAppDataAccess(config: CatalogAppDataAccessConfig) {
  const { browser, tauri } = config;

  async function loadAppSettings(): Promise<AppCatalogSettings> {
    if (isTauri()) {
      return invoke<AppCatalogSettings>(tauri.getSettings);
    }
    const stored = readBrowserCatalogs(browser.catalogs);
    const catalogs = Object.keys(stored)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .map((id) => ({ id, label: id }));
    return {
      selectedCatalogId: readBrowserSelected(browser.selected),
      catalogs,
    };
  }

  async function readCatalogText(catalogId: string): Promise<string | null> {
    if (isTauri()) {
      return invoke<string | null>(tauri.readCatalog, { catalogId });
    }
    const stored = readBrowserCatalogs(browser.catalogs);
    const text = stored[catalogId];
    if (!text) return null;
    return text;
  }

  async function importCatalog(
    catalogId: string,
    contents: string,
    overwrite: boolean,
  ): Promise<void> {
    const safeId = catalogId.trim();
    if (!safeId) {
      throw new Error(EMPTY_CATALOG_ID_ERROR);
    }
    const body = stripUtf8Bom(contents);
    if (isTauri()) {
      await invoke(tauri.importCatalog, {
        catalogId: safeId,
        contents: body,
        overwrite,
      });
      return;
    }
    const stored = readBrowserCatalogs(browser.catalogs);
    if (!overwrite && stored[safeId] != null) {
      throw new Error(DUPLICATE_CATALOG_ERROR);
    }
    stored[safeId] = body;
    writeBrowserCatalogs(browser.catalogs, stored);
  }

  async function deleteCatalog(catalogId: string): Promise<void> {
    if (isTauri()) {
      await invoke(tauri.deleteCatalog, { catalogId });
      return;
    }
    const stored = readBrowserCatalogs(browser.catalogs);
    delete stored[catalogId];
    writeBrowserCatalogs(browser.catalogs, stored);
    if (readBrowserSelected(browser.selected) === catalogId) {
      writeBrowserSelected(browser.selected, null);
    }
  }

  async function setSelectedCatalog(catalogId: string | null): Promise<void> {
    if (isTauri()) {
      await invoke(tauri.setSelectedCatalog, { catalogId });
      return;
    }
    writeBrowserSelected(browser.selected, catalogId);
  }

  async function writeAtPath(
    path: string,
    contents: string,
    workspacePath: string | null,
  ): Promise<void> {
    if (!isTauri()) {
      throw new Error(DESKTOP_ONLY_ERROR);
    }
    const body = stripUtf8Bom(contents);
    await invoke(tauri.writeAtPath, {
      path,
      contents: body,
      workspacePath,
    });
  }

  async function exportJson(
    contents: string,
    suggestedName: string,
  ): Promise<string | null> {
    if (isTauri()) {
      return invoke<string | null>(tauri.saveJson, { contents, suggestedName });
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

  function pickJsonFile(): Promise<{ name: string; contents: string } | null> {
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
        if (file.size > config.maxImportBytes) {
          cleanup();
          reject(new Error(config.importTooLargeError));
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

  function catalogIdFromFilename(filename: string): string {
    const base = filename.split(/[/\\]/).pop() ?? filename;
    const stem = base.replace(/\.json$/i, "").trim();
    return stem || config.defaultIdFromFilename;
  }

  function seedFlagIsSet(): boolean {
    const key = browser.seedFlag;
    if (key == null) return false;
    return localStorage.getItem(key) === "1";
  }

  function markSeedFlag(): void {
    const key = browser.seedFlag;
    if (key == null) return;
    writeBrowserStorage(() => {
      localStorage.setItem(key, "1");
    });
  }

  return {
    loadAppSettings,
    readCatalogText,
    importCatalog,
    deleteCatalog,
    setSelectedCatalog,
    writeAtPath,
    exportJson,
    pickJsonFile,
    catalogIdFromFilename,
    seedFlagIsSet,
    markSeedFlag,
  };
}

export type CatalogAppDataAccess = ReturnType<typeof createCatalogAppDataAccess>;

export function createCatalogSeedOnce(
  access: Pick<
    CatalogAppDataAccess,
    "loadAppSettings" | "importCatalog" | "setSelectedCatalog" | "seedFlagIsSet" | "markSeedFlag"
  >,
  inFlight: { current: Promise<void> | null },
): (catalogId: string, contents: string) => Promise<void> {
  return async (catalogId: string, contents: string) => {
    if (access.seedFlagIsSet()) return;
    if (inFlight.current) {
      await inFlight.current;
      return;
    }
    inFlight.current = (async () => {
      if (access.seedFlagIsSet()) return;
      const settings = await access.loadAppSettings();
      if (settings.catalogs.length === 0) {
        await access.importCatalog(catalogId, contents, false);
        await access.setSelectedCatalog(catalogId);
      }
      access.markSeedFlag();
    })();
    try {
      await inFlight.current;
    } finally {
      inFlight.current = null;
    }
  };
}
