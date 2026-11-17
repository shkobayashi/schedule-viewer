import type { ColorCatalogInfo, ColorItem } from "../model/colorCatalog";
import { colorCatalogEditorCopy } from "../model/catalogEditorCopy";
import type {
  DiscardPrompt,
  ColorEditorOverlayMode,
} from "../hooks/useColorCatalogEditorOverlay";
import {
  CatalogEditorOverlay,
  type CatalogEditorPanelHandle,
} from "./CatalogEditorOverlay";
import {
  ColorCatalogEditorPanel,
  type ColorCatalogEditorPanelHandle,
} from "./ColorCatalogEditorPanel";
import type { Ref } from "react";

export type ColorCatalogEditorOverlayProps = {
  mode: ColorEditorOverlayMode;
  catalogs: readonly ColorCatalogInfo[];
  editingCatalogId: string | null;
  editingItems: readonly ColorItem[];
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
  editorPanelRef?: Ref<ColorCatalogEditorPanelHandle>;
};

export function ColorCatalogEditorOverlay(props: ColorCatalogEditorOverlayProps) {
  const { editorPanelRef, editingItems, ...rest } = props;
  return (
    <CatalogEditorOverlay<
      ColorItem,
      ColorCatalogInfo,
      ColorCatalogEditorPanelHandle & CatalogEditorPanelHandle
    >
      {...rest}
      copy={colorCatalogEditorCopy}
      editingItems={editingItems}
      editorPanelRef={editorPanelRef}
      panel={(slot) => (
        <ColorCatalogEditorPanel
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
