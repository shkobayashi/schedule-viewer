import { invoke, isTauri } from "@tauri-apps/api/core";
import type { StatusCatalogInfo, StatusesDocument } from "./statusCatalog";
import {
  formatStatusesValidationErrors,
  validateStatuses,
} from "./validateStatuses";
import { stripUtf8Bom } from "./memberAppData";
import {
  createCatalogAppDataAccess,
  createCatalogSeedOnce,
} from "./catalogAppDataLoader";

export type AppStatusesSettings = {
  selectedCatalogId: string | null;
  catalogs: StatusCatalogInfo[];
};

const statusCatalogAccess = createCatalogAppDataAccess({
  browser: {
    catalogs: "schedule-viewer/statuses/catalogs",
    selected: "schedule-viewer/statuses/selected",
    seedFlag: "schedule-viewer/statuses/builtin-seeded",
  },
  tauri: {
    getSettings: "get_statuses_settings",
    readCatalog: "read_status_catalog",
    importCatalog: "import_status_catalog",
    deleteCatalog: "delete_status_catalog",
    setSelectedCatalog: "set_selected_status_catalog",
    saveJson: "save_statuses_json",
    writeAtPath: "write_statuses_at_path",
  },
  maxImportBytes: 2 * 1024 * 1024,
  importTooLargeError: "ステータスファイルが大きすぎます（上限 2 MB）",
  defaultIdFromFilename: "statuses",
});

const builtinSeedInFlight: { current: Promise<void> | null } = { current: null };

export async function loadAppStatusesSettings(): Promise<AppStatusesSettings> {
  return statusCatalogAccess.loadAppSettings() as Promise<AppStatusesSettings>;
}

export async function readStatusCatalog(
  catalogId: string,
): Promise<StatusesDocument | null> {
  const text = await statusCatalogAccess.readCatalogText(catalogId);
  if (text == null) return null;
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
  return statusCatalogAccess.importCatalog(catalogId, contents, overwrite);
}

export async function deleteStatusCatalog(catalogId: string): Promise<void> {
  return statusCatalogAccess.deleteCatalog(catalogId);
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
  return statusCatalogAccess.setSelectedCatalog(catalogId);
}

export function pickStatusesJsonFile(): Promise<{ name: string; contents: string } | null> {
  return statusCatalogAccess.pickJsonFile();
}

export function statusCatalogIdFromFilename(filename: string): string {
  return statusCatalogAccess.catalogIdFromFilename(filename);
}

/** 未使用のアプリデータにだけ組み込みの一覧を入れる。消したあとは戻さない。 */
export const seedBuiltinStatusCatalogOnce = createCatalogSeedOnce(
  statusCatalogAccess,
  builtinSeedInFlight,
);

export async function writeStatusesAtPath(
  path: string,
  contents: string,
  workspacePath: string | null,
): Promise<void> {
  return statusCatalogAccess.writeAtPath(path, contents, workspacePath);
}

export async function exportStatusesJson(
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  return statusCatalogAccess.exportJson(contents, suggestedName);
}
