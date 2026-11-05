import type { StatusCatalogInfo, StatusItem } from "../model/statusCatalog";
import { statusCatalogEditorCopy } from "../model/catalogEditorCopy";
import type {
  DiscardPrompt,
  StatusEditorOverlayMode,
} from "../hooks/useStatusCatalogEditorOverlay";
import {
  CatalogEditorOverlay,
  type CatalogEditorPanelHandle,
} from "./CatalogEditorOverlay";
import {
  StatusCatalogEditorPanel,
  type StatusCatalogEditorPanelHandle,
} from "./StatusCatalogEditorPanel";
import type { Ref } from "react";

export type StatusCatalogEditorOverlayProps = {
  mode: StatusEditorOverlayMode;
  catalogs: readonly StatusCatalogInfo[];
  editingCatalogId: string | null;
  editingItems: readonly StatusItem[];
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
  editorPanelRef?: Ref<StatusCatalogEditorPanelHandle>;
};

export function StatusCatalogEditorOverlay(props: StatusCatalogEditorOverlayProps) {
  const { editorPanelRef, editingItems, ...rest } = props;
  return (
    <CatalogEditorOverlay<
      StatusItem,
      StatusCatalogInfo,
      StatusCatalogEditorPanelHandle & CatalogEditorPanelHandle
    >
      {...rest}
      copy={statusCatalogEditorCopy}
      editingItems={editingItems}
      editorPanelRef={editorPanelRef}
      panel={(slot) => (
        <StatusCatalogEditorPanel
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
