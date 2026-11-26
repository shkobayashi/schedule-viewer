import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { useFieldExtensionEditorOverlay } from "../hooks/useFieldExtensionEditorOverlay";
import {
  FieldDefinitionEditorPanel,
  removeFieldDefinitionDraft,
} from "./FieldDefinitionEditorPanel";
import {
  cloneFieldDefinitionDrafts,
  type FieldDefinitionDraft,
} from "../model/fieldDefinitionEdit";
import { extensionDocumentFromDrafts } from "../model/fieldExtensionEdit";
import {
  createFieldDefinitionEditHistory,
  pushFieldDefinitionEditHistory,
  redoFieldDefinitionEditHistory,
  type FieldDefinitionEditSnapshot,
  undoFieldDefinitionEditHistory,
} from "../model/fieldDefinitionEditHistory";

type OverlayState = ReturnType<typeof useFieldExtensionEditorOverlay>;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const emptySnapshot = {
  title: "",
  categories: [],
  milestoneGroups: [],
  milestones: [],
};

export type FieldExtensionEditorOverlayHandle = {
  undo: () => void;
  redo: () => void;
};

function snapshotMatchesOpening(
  snapshot: FieldDefinitionEditSnapshot,
  opening: {
    drafts: readonly FieldDefinitionDraft[];
    displayName: string;
    pluginId: string;
  },
): boolean {
  return (
    JSON.stringify(snapshot.drafts) === JSON.stringify(opening.drafts) &&
    snapshot.displayName === opening.displayName &&
    (snapshot.pluginId ?? opening.pluginId) === opening.pluginId
  );
}

export const FieldExtensionEditorOverlay = forwardRef<
  FieldExtensionEditorOverlayHandle,
  { state: OverlayState }
>(function FieldExtensionEditorOverlay({ state }, ref) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createFieldDefinitionEditHistory());

  useEffect(() => {
    if (!state.open) return;
    historyRef.current = createFieldDefinitionEditHistory();
    panelRef.current?.focus();
  }, [state.editingCatalogId, state.open]);

  const modalOpen = state.discardPrompt != null;

  const currentSnapshot = (): FieldDefinitionEditSnapshot => ({
    drafts: state.drafts,
    selectedIndex: state.selectedIndex,
    displayName: state.displayName,
    pluginId: state.pluginId,
  });

  const applySnapshot = (snapshot: FieldDefinitionEditSnapshot) => {
    state.setDrafts(cloneFieldDefinitionDrafts(snapshot.drafts));
    state.setSelectedIndex(snapshot.selectedIndex);
    state.setDisplayName(snapshot.displayName);
    if (snapshot.pluginId !== undefined) {
      state.setPluginId(snapshot.pluginId);
    }
    const matches = snapshotMatchesOpening(snapshot, {
      drafts: state.openingDrafts,
      displayName: state.openingDisplayName,
      pluginId: state.openingPluginId,
    });
    state.setDirty(!matches);
  };

  const pushSnapshot = (next: FieldDefinitionEditSnapshot) => {
    const pushed = pushFieldDefinitionEditHistory(
      historyRef.current,
      currentSnapshot(),
      next,
    );
    if (pushed) historyRef.current = pushed.history;
    applySnapshot(next);
  };

  const commitDrafts = (
    next: typeof state.drafts,
    nextIndex?: number,
  ) => {
    const resolvedIndex =
      nextIndex ??
      (next.length === 0
        ? -1
        : Math.min(Math.max(0, state.selectedIndex), next.length - 1));
    pushSnapshot({
      drafts: cloneFieldDefinitionDrafts(next),
      selectedIndex: resolvedIndex,
      displayName: state.displayName,
      pluginId: state.pluginId,
    });
  };

  const commitDisplayName = (displayName: string) => {
    pushSnapshot({
      drafts: cloneFieldDefinitionDrafts(state.drafts),
      selectedIndex: state.selectedIndex,
      displayName,
      pluginId: state.pluginId,
    });
  };

  const commitPluginId = (pluginId: string) => {
    pushSnapshot({
      drafts: cloneFieldDefinitionDrafts(state.drafts),
      selectedIndex: state.selectedIndex,
      displayName: state.displayName,
      pluginId,
    });
  };

  const undo = useCallback(() => {
    const result = undoFieldDefinitionEditHistory(
      historyRef.current,
      currentSnapshot(),
    );
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
  }, [state]);

  const redo = useCallback(() => {
    const result = redoFieldDefinitionEditHistory(
      historyRef.current,
      currentSnapshot(),
    );
    if (!result) return;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
  }, [state]);

  useImperativeHandle(ref, () => ({ undo, redo }), [redo, undo]);

  const builtDocument = useMemo(() => {
    if (state.editingCatalogId == null && state.mode !== "workspace") {
      return null;
    }
    return extensionDocumentFromDrafts(
      state.pluginId,
      state.displayName,
      state.drafts,
    );
  }, [state.drafts, state.displayName, state.editingCatalogId, state.mode, state.pluginId]);

  const documentInvalid =
    builtDocument != null && !builtDocument.ok ? builtDocument.message : null;

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

  useEffect(() => {
    if (!modalOpen) return;
    const dialog = document.querySelector<HTMLElement>(
      ".status-catalog-discard-dialog[role='alertdialog']",
    );
    const focusTarget =
      dialog?.querySelector<HTMLElement>(FOCUSABLE) ?? dialog;
    focusTarget?.focus();
  }, [modalOpen]);

  if (!state.open) return null;

  const subtitle =
    state.mode === "workspace"
      ? "設定ファイルの編集用拡張を編集します。"
      : "取り込んだ拡張の定義を編集します。";

  return (
    <div
      className="status-catalog-overlay field-definition-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (modalOpen) {
          if (event.key === "Escape") {
            event.stopPropagation();
            state.cancelDiscard();
          }
          return;
        }
        const composing =
          event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
        if (!composing) {
          const mod = event.metaKey || event.ctrlKey;
          if (mod && event.key === "z" && !event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            if (event.shiftKey) redo();
            else undo();
            return;
          }
          if (
            event.key === "y" &&
            event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.altKey
          ) {
            event.preventDefault();
            event.stopPropagation();
            redo();
            return;
          }
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          state.requestClose();
          return;
        }
        trapTab(event);
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
            <h2 id={titleId} tabIndex={-1}>拡張項目</h2>
            <button
              type="button"
              className="toolbar-btn"
              disabled={state.busy}
              onClick={() => state.requestClose()}
            >
              閉じる
            </button>
          </div>
          <p className="settings-note">{subtitle}</p>
        </header>
        {state.mode === "app" ? (
          <div className="status-catalog-picker-bar">
            <fieldset className="status-catalog-picker">
              <legend>編集する拡張</legend>
              <div className="status-catalog-picker-row">
                {state.settings.catalogs.length === 0 ? (
                  <p className="muted status-catalog-picker-empty">
                    取り込み済みの拡張はありません。
                  </p>
                ) : (
                  <ul className="status-catalog-picker-list">
                    {state.settings.catalogs.map((catalog) => (
                      <li key={catalog.id}>
                        <label className="status-catalog-picker-option">
                          <input
                            type="radio"
                            name="fieldExtensionEdit"
                            checked={state.editingCatalogId === catalog.id}
                            disabled={state.busy}
                            onChange={() => void state.selectCatalog(catalog.id)}
                          />
                          <span>
                            {catalog.label}（{catalog.id}）
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="status-catalog-picker-actions settings-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={state.busy}
                    onClick={() => state.createNew()}
                  >
                    新しい拡張
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={state.busy || state.editingCatalogId == null}
                    onClick={() => state.copyNew()}
                  >
                    コピーして作る
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn toolbar-btn-danger"
                    disabled={state.busy || state.editingCatalogId == null}
                    onClick={() => void state.removeCurrent()}
                  >
                    外す
                  </button>
                </div>
              </div>
            </fieldset>
          </div>
        ) : null}
        <section className="status-catalog-editor-body" aria-label="項目の編集">
          <div className="field-extension-meta-row">
            <label className="field-extension-display-name">
              拡張の名前
              <input
                type="text"
                value={state.displayName}
                disabled={state.busy}
                onChange={(e) => commitDisplayName(e.target.value)}
              />
            </label>
            <label className="field-extension-display-name">
              プラグイン ID
              <input
                type="text"
                value={state.pluginId}
                disabled={state.busy}
                onChange={(e) => commitPluginId(e.target.value)}
              />
            </label>
          </div>
          <p className="settings-note field-extension-id-note">
            プラグイン ID と項目 ID を変えると、スケジュール上の既存の値は未登録の追加項目として残ります。
          </p>
          <FieldDefinitionEditorPanel
            drafts={state.drafts}
            openingDrafts={state.openingDrafts}
            documentSnapshot={emptySnapshot}
            selectedIndex={state.selectedIndex}
            onSelectIndex={state.setSelectedIndex}
            extensionEditMode
            extensionOpeningItemIds={state.openingItemIds}
            onDraftsChange={(next, selectIndex) => commitDrafts(next, selectIndex)}
            onRequestRemoveField={(index) => {
              const next = removeFieldDefinitionDraft(state.drafts, index);
              commitDrafts(next, Math.min(index, next.length - 1));
            }}
            onRequestRemoveChoice={(fieldIndex, rowId) => {
              const next = state.drafts.map((draft, i) => {
                if (i !== fieldIndex) return draft;
                return {
                  ...draft,
                  choiceRows: draft.choiceRows.filter((row) => row.rowId !== rowId),
                };
              });
              commitDrafts(next);
            }}
            footerMessage={documentInvalid}
            extensionFooter={{
              busy: state.busy,
              saveDisabled:
                state.busy || !state.dirty || documentInvalid != null,
              revertDisabled: state.busy || !state.dirty,
              exportDisabled: state.busy || documentInvalid != null,
              onSave: () => void state.save(),
              onRevert: () => state.revertDrafts(),
              onExport: () => void state.exportDocument(),
            }}
          />
        </section>
        {state.message ? (
          <p
            className="settings-message status-catalog-overlay-message"
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </div>
      {modalOpen ? (
        <div
          className="status-catalog-confirm-backdrop"
          aria-hidden="true"
          onClick={() => state.cancelDiscard()}
        />
      ) : null}
      {state.discardPrompt ? (
        <div
          className="status-catalog-discard-dialog"
          role="alertdialog"
          aria-label="下書きの確認"
        >
          <p>下書きを捨てますか？</p>
          <div className="settings-actions">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => state.confirmDiscard()}
            >
              捨てる
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => state.cancelDiscard()}
            >
              続ける
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
