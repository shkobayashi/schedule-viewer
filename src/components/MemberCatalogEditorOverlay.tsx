import type { Member, MemberCatalogInfo } from "../model/memberTypes";
import { memberCatalogEditorCopy } from "../model/catalogEditorCopy";
import type {
  DiscardPrompt,
  MemberEditorOverlayMode,
} from "../hooks/useMemberCatalogEditorOverlay";
import {
  CatalogEditorOverlay,
  type CatalogEditorPanelHandle,
} from "./CatalogEditorOverlay";
import {
  MemberCatalogEditorPanel,
  type MemberCatalogEditorPanelHandle,
} from "./MemberCatalogEditorPanel";
import type { Ref } from "react";

export type MemberCatalogEditorOverlayProps = {
  mode: MemberEditorOverlayMode;
  catalogs: readonly MemberCatalogInfo[];
  editingCatalogId: string | null;
  editingItems: readonly Member[];
  itemsRevision: number;
  appliedCatalogId: string | null;
  workspaceFileLabel: string | null;
  workspaceAppliedNote: string;
  busy: boolean;
  message: string | null;
  setMessage: (message: string | null) => void;
  onDirtyChange: (dirty: boolean) => void;
  discardPrompt: DiscardPrompt;
  copyConfirmOpen: boolean;
  removeConfirmOpen: boolean;
  dirty: boolean;
  onConfirmDiscard: () => void;
  onCancelDiscard: () => void;
  onConfirmCopy: () => void;
  onCancelCopy: () => void;
  onRequestRemoveCatalog: () => void;
  onConfirmRemoveCatalog: () => void;
  onCancelRemoveCatalog: () => void;
  onSelectCatalog: (catalogId: string) => void;
  onRequestClose: () => void;
  onRequestNewList: () => void;
  onRequestCopyList: (contents: string) => void;
  onSaveApp: (catalogId: string, contents: string) => Promise<void>;
  onSaveWorkspace: (contents: string) => Promise<void>;
  editorPanelRef?: Ref<MemberCatalogEditorPanelHandle>;
};

export function MemberCatalogEditorOverlay(props: MemberCatalogEditorOverlayProps) {
  const { editorPanelRef, editingItems, ...rest } = props;
  return (
    <CatalogEditorOverlay<
      Member,
      MemberCatalogInfo,
      MemberCatalogEditorPanelHandle & CatalogEditorPanelHandle
    >
      {...rest}
      copy={memberCatalogEditorCopy}
      editingItems={editingItems}
      editorPanelRef={editorPanelRef}
      panel={(slot) => (
        <MemberCatalogEditorPanel
          key={slot.key}
          ref={slot.panelRef}
          mode={slot.mode}
          editingCatalogId={slot.editingCatalogId}
          items={slot.items}
          busy={slot.busy}
          onSaveApp={slot.onSaveApp}
          onSaveWorkspace={slot.onSaveWorkspace}
          onMessage={slot.onMessage}
          onDirtyChange={slot.onDirtyChange}
        />
      )}
    />
  );
}
