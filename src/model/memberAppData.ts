import { invoke, isTauri } from "@tauri-apps/api/core";
import type { MemberCatalogInfo } from "./memberTypes";
import type { MembersDocument } from "./memberTypes";
import {
  formatMembersValidationErrors,
  validateMembers,
} from "./validateMembers";
import {
  createCatalogAppDataAccess,
  createCatalogSeedOnce,
  stripUtf8Bom,
} from "./catalogAppDataLoader";

export type AppMembersSettings = {
  selectedCatalogId: string | null;
  catalogs: MemberCatalogInfo[];
};

export { stripUtf8Bom };

const memberCatalogAccess = createCatalogAppDataAccess({
  browser: {
    catalogs: "schedule-viewer/members/catalogs",
    selected: "schedule-viewer/members/selected",
    seedFlag: "schedule-viewer/members/sample-seeded",
  },
  tauri: {
    getSettings: "get_members_settings",
    readCatalog: "read_member_catalog",
    importCatalog: "import_member_catalog",
    deleteCatalog: "delete_member_catalog",
    setSelectedCatalog: "set_selected_member_catalog",
    saveJson: "save_members_json",
    writeAtPath: "write_members_at_path",
  },
  maxImportBytes: 2 * 1024 * 1024,
  importTooLargeError: "メンバーファイルが大きすぎます（上限 2 MB）",
  defaultIdFromFilename: "members",
});

const sampleSeedInFlight: { current: Promise<void> | null } = { current: null };

export async function loadAppMembersSettings(): Promise<AppMembersSettings> {
  return memberCatalogAccess.loadAppSettings() as Promise<AppMembersSettings>;
}

export async function readMemberCatalog(
  catalogId: string,
): Promise<MembersDocument | null> {
  const text = await memberCatalogAccess.readCatalogText(catalogId);
  if (text == null) return null;
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
  return memberCatalogAccess.importCatalog(catalogId, contents, overwrite);
}

export async function deleteMemberCatalog(catalogId: string): Promise<void> {
  return memberCatalogAccess.deleteCatalog(catalogId);
}

export async function setSelectedMemberCatalog(
  catalogId: string | null,
): Promise<void> {
  return memberCatalogAccess.setSelectedCatalog(catalogId);
}

export type ClaimMemberCatalogEditResult = {
  claimed: boolean;
  holderLabel?: string;
};

export async function claimMemberCatalogEdit(
  catalogId: string,
): Promise<ClaimMemberCatalogEditResult> {
  if (!isTauri()) {
    return { claimed: true };
  }
  return invoke<ClaimMemberCatalogEditResult>("claim_member_catalog_edit", {
    catalogId,
  });
}

export async function releaseMemberCatalogEdit(
  catalogId?: string | null,
): Promise<void> {
  if (!isTauri()) return;
  await invoke("release_member_catalog_edit", {
    catalogId: catalogId ?? null,
  });
}

export async function writeMembersAtPath(
  path: string,
  contents: string,
  workspacePath: string | null,
): Promise<void> {
  return memberCatalogAccess.writeAtPath(path, contents, workspacePath);
}

export async function exportMembersJson(
  contents: string,
  suggestedName: string,
): Promise<string | null> {
  return memberCatalogAccess.exportJson(contents, suggestedName);
}

export function pickMembersJsonFile(): Promise<{ name: string; contents: string } | null> {
  return memberCatalogAccess.pickJsonFile();
}

export function catalogIdFromFilename(filename: string): string {
  return memberCatalogAccess.catalogIdFromFilename(filename);
}

/** 未使用のアプリデータにだけサンプルを入れる。消したあとは戻さない。 */
export const seedSampleMemberCatalogOnce = createCatalogSeedOnce(
  memberCatalogAccess,
  sampleSeedInFlight,
);
