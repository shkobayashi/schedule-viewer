import { useCallback, useMemo } from "react";
import type { AppColorsSettings } from "../model/colorAppData";
import {
  claimColorCatalogEdit,
  readColorCatalog,
  releaseColorCatalogEdit,
  writeColorsAtPath,
} from "../model/colorAppData";
import { starterColorCatalogDocument, type ColorItem } from "../model/colorCatalog";
import {
  overlayReactionToColorCatalogChange,
  shouldReloadEditingColorCatalogItems,
} from "../model/colorCatalogEditSession";
import { colorsToJson, nextColorCatalogId } from "../model/colorEdit";
import {
  useCatalogEditorOverlayCore,
  type CatalogDiscardPrompt,
  type CatalogEditorOverlayMode,
} from "./useCatalogEditorOverlayCore";

export type WorkspaceColorEditTarget = {
  colorsPath: string;
  workspacePath: string;
  items: readonly ColorItem[];
  fileLabel: string;
};

type UseColorCatalogEditorOverlayArgs = {
  settings: AppColorsSettings;
  appliedCatalogId: string | null;
  saveCatalog: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  removeCatalog: (catalogId: string) => Promise<void>;
  workspaceTarget: WorkspaceColorEditTarget | null;
  onWorkspaceColorsWritten: () => Promise<void>;
  onRemovedWhileEditing: () => void;
};

export type ColorEditorOverlayMode = CatalogEditorOverlayMode;

export type DiscardPrompt = CatalogDiscardPrompt;

const EMPTY_COLOR_ITEMS: readonly ColorItem[] = [];

const COLOR_OVERLAY_MESSAGES = {
  fileClaimedElsewhere: "別のウィンドウで同じファイルを編集しています。",
  catalogClaimedElsewhere: "別のウィンドウで同じ一覧を編集しています。",
  created: (catalogId: string) => `「${catalogId}」を作りました。`,
  createFailed: "作成に失敗しました。",
  removed: (catalogId: string) => `「${catalogId}」を外しました。`,
  removeFailed: "一覧を外せませんでした。",
  workspaceSaved: "色の一覧を保存しました。",
  saveFailed: "保存に失敗しました。",
  workspaceAppliedNote:
    "このウィンドウのチャートは、設定ファイルの色の一覧を使っています。",
} as const;

export function useColorCatalogEditorOverlay({
  settings,
  appliedCatalogId,
  saveCatalog,
  removeCatalog,
  workspaceTarget,
  onWorkspaceColorsWritten,
  onRemovedWhileEditing,
}: UseColorCatalogEditorOverlayArgs) {
  const loadCatalogItems = useCallback(async (catalogId: string) => {
    const doc = await readColorCatalog(catalogId);
    return doc?.colors ?? EMPTY_COLOR_ITEMS;
  }, []);

  const workspaceTargetForCore = useMemo(() => {
    if (!workspaceTarget) return null;
    return {
      path: workspaceTarget.colorsPath,
      workspacePath: workspaceTarget.workspacePath,
      items: workspaceTarget.items,
      fileLabel: workspaceTarget.fileLabel,
    };
  }, [workspaceTarget]);

  const newListContents = useCallback(
    () => colorsToJson(starterColorCatalogDocument().colors),
    [],
  );

  return useCatalogEditorOverlayCore({
    catalogs: settings.catalogs,
    appliedCatalogId,
    saveCatalog,
    removeCatalog,
    workspaceTarget: workspaceTargetForCore,
    onWorkspaceWritten: onWorkspaceColorsWritten,
    onRemovedWhileEditing,
    emptyItems: EMPTY_COLOR_ITEMS,
    loadCatalogItems,
    claimEdit: claimColorCatalogEdit,
    releaseEdit: releaseColorCatalogEdit,
    nextCatalogId: nextColorCatalogId,
    newListContents,
    writeWorkspace: writeColorsAtPath,
    reactToExternalChange: overlayReactionToColorCatalogChange,
    shouldReloadItems: shouldReloadEditingColorCatalogItems,
    reloadWorkspaceOnlyWhenItemsDiffer: true,
    resetPromptsBeforeForceClose: true,
    messages: COLOR_OVERLAY_MESSAGES,
  });
}
