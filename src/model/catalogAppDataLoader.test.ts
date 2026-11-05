import { describe, expect, it, vi } from "vitest";
import {
  BROWSER_STORAGE_ERROR,
  DUPLICATE_CATALOG_ERROR,
  EMPTY_CATALOG_ID_ERROR,
  createCatalogAppDataAccess,
} from "./catalogAppDataLoader";

describe("catalogAppDataLoader", () => {
  it("exposes C0-pinned catalog import error strings", () => {
    expect(EMPTY_CATALOG_ID_ERROR).toBe("カタログ名が空です。");
    expect(DUPLICATE_CATALOG_ERROR).toBe("同じ名前のカタログが既にあります。");
    expect(BROWSER_STORAGE_ERROR).toBe(
      "ブラウザの保存領域に書けませんでした。",
    );
  });

  it("defaults catalog id from filename", () => {
    const access = createCatalogAppDataAccess({
      browser: {
        catalogs: "schedule-viewer/test/catalogs",
        selected: "schedule-viewer/test/selected",
      },
      tauri: {
        getSettings: "get_test_settings",
        readCatalog: "read_test",
        importCatalog: "import_test",
        deleteCatalog: "delete_test",
        setSelectedCatalog: "set_selected_test",
        saveJson: "save_test_json",
        writeAtPath: "write_test_at_path",
      },
      maxImportBytes: 1024,
      importTooLargeError: "too big",
      defaultIdFromFilename: "fallback",
    });
    expect(access.catalogIdFromFilename("  ")).toBe("fallback");
    expect(access.catalogIdFromFilename("team.json")).toBe("team");
  });

  it("treats empty browser catalog body as missing", async () => {
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    });
    const access = createCatalogAppDataAccess({
      browser: {
        catalogs: "schedule-viewer/test-empty/catalogs",
        selected: "schedule-viewer/test-empty/selected",
      },
      tauri: {
        getSettings: "get_test_settings",
        readCatalog: "read_test",
        importCatalog: "import_test",
        deleteCatalog: "delete_test",
        setSelectedCatalog: "set_selected_test",
        saveJson: "save_test_json",
        writeAtPath: "write_test_at_path",
      },
      maxImportBytes: 1024,
      importTooLargeError: "too big",
      defaultIdFromFilename: "fallback",
    });
    await access.importCatalog("team", "", false);
    await expect(access.readCatalogText("team")).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});
