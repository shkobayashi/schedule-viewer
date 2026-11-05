import { useCallback, useMemo } from "react";
import type { AppStatusesSettings } from "../model/statusAppData";
import {
  claimStatusCatalogEdit,
  readStatusCatalog,
  releaseStatusCatalogEdit,
  writeStatusesAtPath,
} from "../model/statusAppData";
import { BUILTIN_STATUS_ITEMS, type StatusItem } from "../model/statusCatalog";
import {
  overlayReactionToCatalogChange,
  shouldReloadEditingCatalogItems,
} from "../model/statusCatalogEditSession";
import { nextStatusCatalogId, statusesToJson } from "../model/statusEdit";
import {
  useCatalogEditorOverlayCore,
  type CatalogDiscardPrompt,
  type CatalogEditorOverlayMode,
} from "./useCatalogEditorOverlayCore";

export type WorkspaceStatusEditTarget = {
  statusesPath: string;
  workspacePath: string;
  items: readonly StatusItem[];
  fileLabel: string;
};

type UseStatusCatalogEditorOverlayArgs = {
  settings: AppStatusesSettings;
  appliedCatalogId: string | null;
  saveCatalog: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  removeCatalog: (catalogId: string) => Promise<void>;
  workspaceTarget: WorkspaceStatusEditTarget | null;
  onWorkspaceStatusesWritten: () => Promise<void>;
  onRemovedWhileEditing: () => void;
};

export type StatusEditorOverlayMode = CatalogEditorOverlayMode;

export type DiscardPrompt = CatalogDiscardPrompt;

const STATUS_OVERLAY_MESSAGES = {
  fileClaimedElsewhere: "別のウィンドウで同じファイルを編集しています。",
  catalogClaimedElsewhere: "別のウィンドウで同じ一覧を編集しています。",
  created: (catalogId: string) => `「${catalogId}」を作りました。`,
  createFailed: "作成に失敗しました。",
  removed: (catalogId: string) => `「${catalogId}」を外しました。`,
  removeFailed: "一覧を外せませんでした。",
  workspaceSaved: "ステータスを保存しました。",
  saveFailed: "保存に失敗しました。",
  workspaceAppliedNote:
    "このウィンドウのチャートは、設定ファイルのステータスを使っています。",
} as const;

export function useStatusCatalogEditorOverlay({
  settings,
  appliedCatalogId,
  saveCatalog,
  removeCatalog,
  workspaceTarget,
  onWorkspaceStatusesWritten,
  onRemovedWhileEditing,
}: UseStatusCatalogEditorOverlayArgs) {
  const loadCatalogItems = useCallback(async (catalogId: string) => {
    const doc = await readStatusCatalog(catalogId);
    return doc?.statuses ?? BUILTIN_STATUS_ITEMS;
  }, []);

  const workspaceTargetForCore = useMemo(() => {
    if (!workspaceTarget) return null;
    return {
      path: workspaceTarget.statusesPath,
      workspacePath: workspaceTarget.workspacePath,
      items: workspaceTarget.items,
      fileLabel: workspaceTarget.fileLabel,
    };
  }, [workspaceTarget]);

  return useCatalogEditorOverlayCore({
    catalogs: settings.catalogs,
    appliedCatalogId,
    saveCatalog,
    removeCatalog,
    workspaceTarget: workspaceTargetForCore,
    onWorkspaceWritten: onWorkspaceStatusesWritten,
    onRemovedWhileEditing,
    emptyItems: BUILTIN_STATUS_ITEMS,
    loadCatalogItems,
    claimEdit: claimStatusCatalogEdit,
    releaseEdit: releaseStatusCatalogEdit,
    nextCatalogId: nextStatusCatalogId,
    newListContents: () => statusesToJson(BUILTIN_STATUS_ITEMS),
    writeWorkspace: writeStatusesAtPath,
    reactToExternalChange: overlayReactionToCatalogChange,
    shouldReloadItems: shouldReloadEditingCatalogItems,
    reloadWorkspaceOnlyWhenItemsDiffer: false,
    resetPromptsBeforeForceClose: false,
    messages: STATUS_OVERLAY_MESSAGES,
  });
}
