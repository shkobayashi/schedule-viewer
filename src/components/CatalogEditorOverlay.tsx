import { useEffect, useId, useRef, type ReactNode, type Ref } from "react";
import type { CatalogEditorCopy } from "../model/catalogEditorCopy";
import {
  CATALOG_EDITOR_SHARED_COPY,
  catalogAppliedNote,
  catalogRemoveConfirmLines,
  catalogSubtitle,
} from "../model/catalogEditorCopy";
import type { CatalogEditorOverlayMode } from "../model/catalogEditorUi";
import {
  catalogEditorKeyAction,
  type CatalogEditorKeySnapshot,
} from "../model/catalogEditorUi";

export type CatalogEditorPanelHandle = {
  draftJson: () => { contents: string; error: string | null };
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type CatalogPickerItem = { id: string; label: string };

export type CatalogEditorPanelSlot<THandle extends CatalogEditorPanelHandle> = {
  panelRef: Ref<THandle>;
  key: string;
  mode: CatalogEditorOverlayMode;
  editingCatalogId: string | null;
  busy: boolean;
  onSaveApp: (catalogId: string, contents: string) => Promise<void>;
  onSaveWorkspace: (contents: string) => Promise<void>;
  onMessage: (message: string | null) => void;
  onDirtyChange: (dirty: boolean) => void;
};

export type CatalogEditorOverlayBaseProps<
  TItem,
  TCatalog extends CatalogPickerItem,
  THandle extends CatalogEditorPanelHandle,
> = {
  copy: CatalogEditorCopy;
  mode: CatalogEditorOverlayMode;
  catalogs: readonly TCatalog[];
  editingCatalogId: string | null;
  editingItems: readonly TItem[];
  itemsRevision: number;
  appliedCatalogId: string | null;
  workspaceFileLabel: string | null;
  workspaceAppliedNote: string;
  busy: boolean;
  message: string | null;
  setMessage: (message: string | null) => void;
  onDirtyChange: (dirty: boolean) => void;
  discardPrompt: "close" | "switch" | "newList" | null;
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
  editorPanelRef?: Ref<THandle>;
  panel: (slot: CatalogEditorPanelSlot<THandle> & { items: readonly TItem[] }) => ReactNode;
};

export function CatalogEditorOverlay<
  TItem,
  TCatalog extends CatalogPickerItem,
  THandle extends CatalogEditorPanelHandle,
>({
  copy,
  mode,
  catalogs,
  editingCatalogId,
  editingItems,
  itemsRevision,
  appliedCatalogId,
  workspaceFileLabel,
  workspaceAppliedNote,
  busy,
  message,
  setMessage,
  onDirtyChange,
  discardPrompt,
  copyConfirmOpen,
  removeConfirmOpen,
  dirty,
  onConfirmDiscard,
  onCancelDiscard,
  onConfirmCopy,
  onCancelCopy,
  onRequestRemoveCatalog,
  onConfirmRemoveCatalog,
  onCancelRemoveCatalog,
  onSelectCatalog,
  onRequestClose,
  onRequestNewList,
  onRequestCopyList,
  onSaveApp,
  onSaveWorkspace,
  editorPanelRef,
  panel,
}: CatalogEditorOverlayBaseProps<TItem, TCatalog, THandle>) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<THandle | null>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const nodes = [
      ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ].filter((node) => node.offsetParent !== null && !node.closest("[inert]"));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const appliedNote = catalogAppliedNote(copy, {
    mode,
    appliedCatalogId,
    editingCatalogId,
    workspaceAppliedNote,
  });

  const subtitle = catalogSubtitle(copy, {
    mode,
    workspaceFileLabel,
  });

  const handleCopy = () => {
    const draft = editorRef.current?.draftJson();
    if (!draft || draft.error) return;
    onRequestCopyList(draft.contents);
  };

  const removeConfirmLines = catalogRemoveConfirmLines(copy, {
    dirty,
    appliedCatalogId,
    editingCatalogId,
  });

  const modalOpen =
    discardPrompt != null || copyConfirmOpen || removeConfirmOpen;

  const cancelActiveConfirm = () => {
    if (discardPrompt != null) {
      onCancelDiscard();
      return;
    }
    if (copyConfirmOpen) {
      onCancelCopy();
      return;
    }
    if (removeConfirmOpen) {
      onCancelRemoveCatalog();
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const dialog = document.querySelector<HTMLElement>(
      ".status-catalog-discard-dialog[role='alertdialog']",
    );
    const focusTarget =
      dialog?.querySelector<HTMLElement>(FOCUSABLE) ?? dialog;
    focusTarget?.focus();
  }, [discardPrompt, copyConfirmOpen, removeConfirmOpen, modalOpen]);

  const panelKey = `${editingCatalogId ?? "none"}:${itemsRevision}`;

  const assignPanelRef = (handle: THandle | null) => {
    editorRef.current = handle;
    if (editorPanelRef == null) return;
    if (typeof editorPanelRef === "function") {
      editorPanelRef(handle);
    } else {
      editorPanelRef.current = handle;
    }
  };

  return (
    <div
      className="status-catalog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        const snapshot: CatalogEditorKeySnapshot = {
          modalOpen,
          composing:
            event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229,
          key: event.key,
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
        };
        const action = catalogEditorKeyAction(snapshot);
        if (action === "cancel-confirm") {
          event.stopPropagation();
          cancelActiveConfirm();
          return;
        }
        if (action === "ignore") {
          return;
        }
        if (action === "undo") {
          event.preventDefault();
          event.stopPropagation();
          editorRef.current?.undo();
          return;
        }
        if (action === "redo") {
          event.preventDefault();
          event.stopPropagation();
          editorRef.current?.redo();
          return;
        }
        if (action === "close") {
          event.stopPropagation();
          onRequestClose();
          return;
        }
        if (action === "trap-tab") {
          trapTab(event);
        }
      }}
    >
      <div
        ref={panelRef}
        className="status-catalog-overlay-panel"
        tabIndex={-1}
        inert={modalOpen ? true : undefined}
      >
        <header className="status-catalog-overlay-header">
          <div className="status-catalog-overlay-title-row">
            <h2 id={titleId} tabIndex={-1}>
              {copy.overlayTitle}
            </h2>
            <button
              type="button"
              className="toolbar-btn"
              disabled={busy}
              onClick={onRequestClose}
            >
              {CATALOG_EDITOR_SHARED_COPY.close}
            </button>
          </div>
          <p className="settings-note">{subtitle}</p>
          <p className="settings-note status-catalog-overlay-applied">{appliedNote}</p>
        </header>
        {mode === "app" ? (
          <div className="status-catalog-picker-bar">
            <fieldset className="status-catalog-picker">
              <legend>{copy.pickerLegend}</legend>
              <div className="status-catalog-picker-row">
                {catalogs.length === 0 ? (
                  <p className="muted status-catalog-picker-empty">
                    {copy.pickerEmpty}
                  </p>
                ) : (
                  <ul className="status-catalog-picker-list">
                    {catalogs.map((catalog) => (
                      <li key={catalog.id}>
                        <label className="status-catalog-picker-option">
                          <input
                            type="radio"
                            name={copy.radioGroupName}
                            checked={editingCatalogId === catalog.id}
                            disabled={busy}
                            onChange={() => onSelectCatalog(catalog.id)}
                          />
                          <span>{catalog.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="status-catalog-picker-actions settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy}
                    onClick={onRequestNewList}
                  >
                    {copy.newListButton}
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy || editingCatalogId == null}
                    onClick={handleCopy}
                  >
                    {CATALOG_EDITOR_SHARED_COPY.copyList}
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn toolbar-btn-danger"
                    disabled={busy || editingCatalogId == null}
                    onClick={onRequestRemoveCatalog}
                  >
                    {CATALOG_EDITOR_SHARED_COPY.remove}
                  </button>
                </div>
              </div>
            </fieldset>
          </div>
        ) : null}
        <section className="status-catalog-editor-body" aria-label="項目の編集">
          {panel({
            panelRef: assignPanelRef,
            key: panelKey,
            mode,
            editingCatalogId,
            items: editingItems,
            busy,
            onSaveApp,
            onSaveWorkspace,
            onMessage: setMessage,
            onDirtyChange,
          })}
        </section>
        {message ? (
          <p className="settings-message status-catalog-overlay-message" role="status">
            {message}
          </p>
        ) : null}
      </div>
      {modalOpen ? (
        <div
          className="status-catalog-confirm-backdrop"
          aria-hidden="true"
          onClick={cancelActiveConfirm}
        />
      ) : null}
      {discardPrompt ? (
        <div
          className="status-catalog-discard-dialog"
          role="alertdialog"
          aria-label={CATALOG_EDITOR_SHARED_COPY.discardConfirmAria}
        >
          <p>{CATALOG_EDITOR_SHARED_COPY.discardBody}</p>
          <div className="settings-actions">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => void onConfirmDiscard()}
            >
              {CATALOG_EDITOR_SHARED_COPY.discardConfirm}
            </button>
            <button type="button" className="toolbar-btn" onClick={onCancelDiscard}>
              {CATALOG_EDITOR_SHARED_COPY.discardCancel}
            </button>
          </div>
        </div>
      ) : null}
      {copyConfirmOpen ? (
        <div
          className="status-catalog-discard-dialog"
          role="alertdialog"
          aria-label={CATALOG_EDITOR_SHARED_COPY.copyConfirmAria}
        >
          <p>{copy.copyConfirmBody}</p>
          <div className="settings-actions">
            <button type="button" className="toolbar-btn" onClick={onConfirmCopy}>
              {CATALOG_EDITOR_SHARED_COPY.copyConfirmConfirm}
            </button>
            <button type="button" className="toolbar-btn" onClick={onCancelCopy}>
              {CATALOG_EDITOR_SHARED_COPY.copyConfirmCancel}
            </button>
          </div>
        </div>
      ) : null}
      {removeConfirmOpen ? (
        <div
          className="status-catalog-discard-dialog"
          role="alertdialog"
          aria-label={copy.removeConfirmAria}
        >
          {removeConfirmLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="settings-actions">
            <button
              type="button"
              className="toolbar-btn toolbar-btn-danger"
              onClick={() => void onConfirmRemoveCatalog()}
            >
              {CATALOG_EDITOR_SHARED_COPY.remove}
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={onCancelRemoveCatalog}
            >
              {CATALOG_EDITOR_SHARED_COPY.discardCancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
