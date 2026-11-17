import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ColorCatalogInfo, ColorsDocument } from "./colorCatalog";
import {
  formatColorsValidationErrors,
  validateColors,
} from "./validateColors";
import { stripUtf8Bom } from "./memberAppData";
import {
  createCatalogAppDataAccess,
  DESKTOP_ONLY_ERROR,
} from "./catalogAppDataLoader";

export type AppColorsSettings = {
  selectedCatalogId: string | null;
  catalogs: ColorCatalogInfo[];
};

const colorCatalogAccess = createCatalogAppDataAccess({
  browser: {
    catalogs: "schedule-viewer/colors/catalogs",
    selected: "schedule-viewer/colors/selected",
  },
  tauri: {
    getSettings: "get_colors_settings",
    readCatalog: "read_color_catalog",
    importCatalog: "import_color_catalog",
    deleteCatalog: "delete_color_catalog",
    setSelectedCatalog: "set_selected_color_catalog",
    saveJson: "save_colors_json",
    writeAtPath: "write_colors_at_path",
  },
  maxImportBytes: 2 * 1024 * 1024,
  importTooLargeError: "色の一覧ファイルが大きすぎます（上限 2 MB）",
  defaultIdFromFilename: "colors",
});

export async function loadAppColorsSettings(): Promise<AppColorsSettings> {
  return colorCatalogAccess.loadAppSettings() as Promise<AppColorsSettings>;
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
  const text = await colorCatalogAccess.readCatalogText(catalogId);
  if (text == null) return null;
  return parseColorCatalogText(text);
}

export async function importColorCatalog(
  catalogId: string,
  contents: string,
  overwrite: boolean,
): Promise<void> {
  return colorCatalogAccess.importCatalog(catalogId, contents, overwrite);
}

export async function deleteColorCatalog(catalogId: string): Promise<void> {
  return colorCatalogAccess.deleteCatalog(catalogId);
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
  return colorCatalogAccess.setSelectedCatalog(catalogId);
}

export function pickColorsJsonFile(): Promise<{ name: string; contents: string } | null> {
  return colorCatalogAccess.pickJsonFile();
}

export function colorCatalogIdFromFilename(filename: string): string {
  return colorCatalogAccess.catalogIdFromFilename(filename);
}

export async function writeColorsAtPath(
  path: string,
  contents: string,
  workspacePath: string | null,
): Promise<void> {
  return colorCatalogAccess.writeAtPath(path, contents, workspacePath);
}

export async function createWorkspaceColorsCatalog(
  workspacePath: string,
  relativeFileName: string,
  contents: string,
): Promise<void> {
  if (!isTauri()) {
    throw new Error(DESKTOP_ONLY_ERROR);
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
  return colorCatalogAccess.exportJson(contents, suggestedName);
}
