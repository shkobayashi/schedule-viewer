import { useEffect, useId, useRef, type Ref } from "react";
import type { Member, MemberCatalogInfo } from "../model/memberTypes";
import type {
  DiscardPrompt,
  MemberEditorOverlayMode,
} from "../hooks/useMemberCatalogEditorOverlay";
import {
  MemberCatalogEditorPanel,
  type MemberCatalogEditorPanelHandle,
} from "./MemberCatalogEditorPanel";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

export function MemberCatalogEditorOverlay({
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
}: MemberCatalogEditorOverlayProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MemberCatalogEditorPanelHandle>(null);

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

  const appliedNote =
    mode === "workspace"
      ? workspaceAppliedNote
      : appliedCatalogId != null && appliedCatalogId === editingCatalogId
        ? "このウィンドウのチャートは、このカタログを使っています。"
        : appliedCatalogId != null
          ? "このウィンドウのチャートは、別のカタログを使っています。"
          : "このウィンドウのチャートは、メンバーのカタログを使っていません。";

  const subtitle =
    mode === "workspace"
      ? `設定ファイルのメンバー（${workspaceFileLabel ?? ""}）の項目を編集します。`
      : "アプリに取り込んだカタログの項目を編集します。";

  const handleCopy = () => {
    const draft = editorRef.current?.draftJson();
    if (!draft || draft.error) return;
    onRequestCopyList(draft.contents);
  };

  const removeConfirmLines = [
    "このカタログをアプリから外しますか。",
    ...(dirty ? ["下書きは保存しません。"] : []),
    ...(appliedCatalogId != null && appliedCatalogId === editingCatalogId
      ? ["チャートで使っているカタログです。外すと、担当の候補が無くなります。"]
      : []),
  ];

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

  return (
    <div
      className="status-catalog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (modalOpen) {
          if (event.key === "Escape") {
            event.stopPropagation();
            cancelActiveConfirm();
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
            if (event.shiftKey) editorRef.current?.redo();
            else editorRef.current?.undo();
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
            editorRef.current?.redo();
            return;
          }
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          onRequestClose();
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
            <h2 id={titleId} tabIndex={-1}>
              メンバーの項目を編集
            </h2>
            <button
              type="button"
              className="toolbar-btn"
              disabled={busy}
              onClick={onRequestClose}
            >
              閉じる
            </button>
          </div>
          <p className="settings-note">{subtitle}</p>
          <p className="settings-note status-catalog-overlay-applied">{appliedNote}</p>
        </header>
        {mode === "app" ? (
          <div className="status-catalog-picker-bar">
            <fieldset className="status-catalog-picker">
              <legend>編集するカタログ</legend>
              <div className="status-catalog-picker-row">
                {catalogs.length === 0 ? (
                  <p className="muted status-catalog-picker-empty">
                    取り込み済みのカタログはありません。
                  </p>
                ) : (
                  <ul className="status-catalog-picker-list">
                    {catalogs.map((catalog) => (
                      <li key={catalog.id}>
                        <label className="status-catalog-picker-option">
                          <input
                            type="radio"
                            name="memberCatalogEdit"
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
                    新しいカタログ
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={busy || editingCatalogId == null}
                    onClick={handleCopy}
                  >
                    コピーして作る
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn toolbar-btn-danger"
                    disabled={busy || editingCatalogId == null}
                    onClick={onRequestRemoveCatalog}
                  >
                    外す
                  </button>
                </div>
              </div>
            </fieldset>
          </div>
        ) : null}
        <section className="status-catalog-editor-body" aria-label="項目の編集">
          <MemberCatalogEditorPanel
            ref={(handle) => {
              editorRef.current = handle;
              if (typeof editorPanelRef === "function") {
                editorPanelRef(handle);
              } else if (editorPanelRef) {
                editorPanelRef.current = handle;
              }
            }}
            key={`${editingCatalogId ?? "none"}:${itemsRevision}`}
            mode={mode}
            editingCatalogId={editingCatalogId}
            items={editingItems}
            busy={busy}
            onSaveApp={onSaveApp}
            onSaveWorkspace={onSaveWorkspace}
            onMessage={setMessage}
            onDirtyChange={onDirtyChange}
          />
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
          aria-label="下書きの確認"
        >
          <p>編集を保存していません。下書きを捨てますか。</p>
          <div className="settings-actions">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => void onConfirmDiscard()}
            >
              捨てる
            </button>
            <button type="button" className="toolbar-btn" onClick={onCancelDiscard}>
              やめる
            </button>
          </div>
        </div>
      ) : null}
      {copyConfirmOpen ? (
        <div
          className="status-catalog-discard-dialog"
          role="alertdialog"
          aria-label="コピーの確認"
        >
          <p>元のカタログには保存しません。この内容でコピーを作りますか。</p>
          <div className="settings-actions">
            <button type="button" className="toolbar-btn" onClick={onConfirmCopy}>
              作る
            </button>
            <button type="button" className="toolbar-btn" onClick={onCancelCopy}>
              やめる
            </button>
          </div>
        </div>
      ) : null}
      {removeConfirmOpen ? (
        <div
          className="status-catalog-discard-dialog"
          role="alertdialog"
          aria-label="カタログを外す確認"
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
              外す
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={onCancelRemoveCatalog}
            >
              やめる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
