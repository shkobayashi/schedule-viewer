import { CATALOG_EDITOR_SHARED_COPY } from "../model/catalogEditorCopy";

export type CatalogEditorPanelFooterProps = {
  addLabel: string;
  canEditItems: boolean;
  busy: boolean;
  dirty: boolean;
  draftError: string | null;
  addDisabled?: boolean;
  onAdd: () => void;
  onSave: () => void;
  onResetDraft: () => void;
  onExportJson: () => void;
};

export function CatalogEditorPanelFooter({
  addLabel,
  canEditItems,
  busy,
  dirty,
  draftError,
  addDisabled = false,
  onAdd,
  onSave,
  onResetDraft,
  onExportJson,
}: CatalogEditorPanelFooterProps) {
  return (
    <footer className="status-catalog-editor-footer">
      <div className="settings-actions">
        <button
          type="button"
          className="toolbar-btn"
          disabled={!canEditItems || busy || addDisabled}
          onClick={onAdd}
        >
          {addLabel}
        </button>
        <button
          type="button"
          className="toolbar-btn toolbar-btn-primary"
          disabled={!canEditItems || busy || !dirty || draftError != null}
          onClick={onSave}
        >
          {CATALOG_EDITOR_SHARED_COPY.save}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={!dirty || busy}
          onClick={onResetDraft}
        >
          {CATALOG_EDITOR_SHARED_COPY.revertEdits}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={busy || draftError != null || !canEditItems}
          onClick={onExportJson}
        >
          {CATALOG_EDITOR_SHARED_COPY.exportJson}
        </button>
      </div>
    </footer>
  );
}
