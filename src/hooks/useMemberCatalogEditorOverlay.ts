import { useCallback, useMemo } from "react";
import {
  claimMemberCatalogEdit,
  readMemberCatalog,
  releaseMemberCatalogEdit,
  writeMembersAtPath,
  type AppMembersSettings,
} from "../model/memberAppData";
import type { Member } from "../model/memberTypes";
import {
  overlayReactionToMemberCatalogChange,
  shouldReloadEditingMemberCatalogItems,
} from "../model/memberCatalogEditSession";
import { emptyMembersDocumentJson, nextMemberCatalogId } from "../model/memberEdit";
import {
  useCatalogEditorOverlayCore,
  type CatalogDiscardPrompt,
  type CatalogEditorOverlayMode,
} from "./useCatalogEditorOverlayCore";

export type WorkspaceMemberEditTarget = {
  membersPath: string;
  workspacePath: string;
  items: readonly Member[];
  fileLabel: string;
};

type UseMemberCatalogEditorOverlayArgs = {
  settings: AppMembersSettings;
  appliedCatalogId: string | null;
  saveCatalog: (catalogId: string, contents: string, overwrite: boolean) => Promise<void>;
  removeCatalog: (catalogId: string) => Promise<void>;
  workspaceTarget: WorkspaceMemberEditTarget | null;
  onWorkspaceMembersWritten: () => Promise<void>;
  onRemovedWhileEditing: () => void;
};

export type MemberEditorOverlayMode = CatalogEditorOverlayMode;

export type DiscardPrompt = CatalogDiscardPrompt;

const EMPTY_MEMBER_ITEMS: readonly Member[] = [];

const MEMBER_OVERLAY_MESSAGES = {
  fileClaimedElsewhere: "別のウィンドウで同じファイルを編集しています。",
  catalogClaimedElsewhere: "別のウィンドウで同じ一覧を編集しています。",
  created: (catalogId: string) => `「${catalogId}」を作りました。`,
  createFailed: "作成に失敗しました。",
  removed: (catalogId: string) => `「${catalogId}」を外しました。`,
  removeFailed: "一覧を外せませんでした。",
  workspaceSaved: "メンバーのカタログを保存しました。",
  saveFailed: "保存に失敗しました。",
  workspaceAppliedNote:
    "このウィンドウのチャートは、設定ファイルのメンバーのカタログを使っています。",
} as const;

export function useMemberCatalogEditorOverlay({
  settings,
  appliedCatalogId,
  saveCatalog,
  removeCatalog,
  workspaceTarget,
  onWorkspaceMembersWritten,
  onRemovedWhileEditing,
}: UseMemberCatalogEditorOverlayArgs) {
  const loadCatalogItems = useCallback(async (catalogId: string) => {
    const doc = await readMemberCatalog(catalogId);
    return doc?.members ?? EMPTY_MEMBER_ITEMS;
  }, []);

  const workspaceTargetForCore = useMemo(() => {
    if (!workspaceTarget) return null;
    return {
      path: workspaceTarget.membersPath,
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
    onWorkspaceWritten: onWorkspaceMembersWritten,
    onRemovedWhileEditing,
    emptyItems: EMPTY_MEMBER_ITEMS,
    loadCatalogItems,
    claimEdit: claimMemberCatalogEdit,
    releaseEdit: releaseMemberCatalogEdit,
    nextCatalogId: nextMemberCatalogId,
    newListContents: emptyMembersDocumentJson,
    writeWorkspace: writeMembersAtPath,
    reactToExternalChange: overlayReactionToMemberCatalogChange,
    shouldReloadItems: shouldReloadEditingMemberCatalogItems,
    reloadWorkspaceOnlyWhenItemsDiffer: true,
    resetPromptsBeforeForceClose: true,
    messages: MEMBER_OVERLAY_MESSAGES,
  });
}
