import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { exportStatusesJson } from "../model/statusAppData";
import type { StatusItem } from "../model/statusCatalog";
import type { StatusEditorOverlayMode } from "../hooks/useStatusCatalogEditorOverlay";
import {
  moveStatusItem,
  newStatusItem,
  removeStatusItem,
  sameStatusItems,
  statusDraftError,
  statusesToJson,
  updateStatusItem,
} from "../model/statusEdit";

export type StatusCatalogEditorPanelHandle = {
  draftJson: () => { contents: string; error: string | null };
};

export type StatusCatalogEditorPanelProps = {
  mode: StatusEditorOverlayMode;
  editingCatalogId: string | null;
  items: readonly StatusItem[];
  busy: boolean;
  onSaveApp: (catalogId: string, contents: string) => Promise<void>;
  onSaveWorkspace: (contents: string) => Promise<void>;
  onMessage: (message: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const COLOR_FIELDS = [
  { scheme: "light", key: "bg", label: "ライト 地" },
  { scheme: "light", key: "border", label: "ライト 枠" },
  { scheme: "dark", key: "bg", label: "ダーク 地" },
  { scheme: "dark", key: "border", label: "ダーク 枠" },
] as const;

export const StatusCatalogEditorPanel = forwardRef<
  StatusCatalogEditorPanelHandle,
  StatusCatalogEditorPanelProps
>(function StatusCatalogEditorPanel(
  {
    mode,
    editingCatalogId,
    items,
    busy,
    onSaveApp,
    onSaveWorkspace,
    onMessage,
    onDirtyChange,
  },
  ref,
) {
  const [draft, setDraft] = useState<readonly StatusItem[]>(items);
  const savedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const dirty = !sameStatusItems(draft, items);
  const error = statusDraftError(draft);
  const canEditItems =
    mode === "workspace"
      ? editingCatalogId === "__workspace__"
      : editingCatalogId != null;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useImperativeHandle(
    ref,
    () => ({
      draftJson: () => ({
        contents: statusesToJson(draft),
        error,
      }),
    }),
    [draft, error],
  );

  const save = async () => {
    if (error) return;
    try {
      if (mode === "workspace") {
        await onSaveWorkspace(statusesToJson(draft));
        return;
      }
      if (!editingCatalogId || editingCatalogId === "__workspace__") return;
      await onSaveApp(editingCatalogId, statusesToJson(draft));
      onMessage(`「${editingCatalogId}」を保存しました。`);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "保存に失敗しました。");
    }
  };

  const exportJson = async () => {
    if (error) return;
    try {
      const path = await exportStatusesJson(
        statusesToJson(draft),
        editingCatalogId === "__workspace__" || editingCatalogId == null
          ? "statuses"
          : editingCatalogId,
      );
      onMessage(path ? `${path} に書き出しました。` : null);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "書き出しに失敗しました。");
    }
  };

  const change = (next: StatusItem[]) => {
    setDraft(next);
    onMessage(null);
  };

  const resetDraft = () => {
    setDraft([...items]);
    onMessage(null);
  };

  return (
    <>
      <div className="status-catalog-editor-scroll">
        <p className="settings-note status-catalog-editor-hint">
          並びは、詳細パネルと絞り込みの選択肢の順です。<code>id</code> は項目を足すときだけ決められます。項目を外しても、その
          <code>id</code> を持つタスクは変わりません。
        </p>
        <ul className="status-catalog-editor-items">
          {draft.map((item, index) => (
            <li
              key={savedIds.has(item.id) ? item.id : `new-${index}`}
              className="status-catalog-editor-item"
            >
              <div className="status-catalog-editor-item-main">
                <label className="status-catalog-editor-field status-catalog-editor-field-id">
                  id
                  <input
                    type="text"
                    value={item.id}
                    readOnly={savedIds.has(item.id)}
                    disabled={!canEditItems || busy}
                    onChange={(e) =>
                      change(updateStatusItem(draft, index, { id: e.target.value }))
                    }
                  />
                </label>
                <label className="status-catalog-editor-field status-catalog-editor-field-name">
                  表示名
                  <input
                    type="text"
                    value={item.name}
                    disabled={!canEditItems || busy}
                    onChange={(e) =>
                      change(updateStatusItem(draft, index, { name: e.target.value }))
                    }
                  />
                </label>
                <label className="settings-status-closed status-catalog-editor-closed">
                  <input
                    type="checkbox"
                    checked={item.closed}
                    disabled={!canEditItems || busy}
                    onChange={(e) =>
                      change(
                        updateStatusItem(draft, index, { closed: e.target.checked }),
                      )
                    }
                  />
                  完了
                </label>
                <div className="status-catalog-editor-colors">
                  {COLOR_FIELDS.map(({ scheme, key, label }) => (
                    <label key={`${scheme}-${key}`} className="status-catalog-editor-color">
                      <span className="status-catalog-editor-color-label">{label}</span>
                      <input
                        type="color"
                        value={item.color[scheme][key]}
                        disabled={!canEditItems || busy}
                        aria-label={`${item.name} ${label}`}
                        onChange={(e) =>
                          change(
                            updateStatusItem(draft, index, {
                              color: { [scheme]: { [key]: e.target.value } },
                            }),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="status-catalog-editor-field status-catalog-editor-field-desc">
                  説明
                  <input
                    type="text"
                    value={item.description}
                    disabled={!canEditItems || busy}
                    onChange={(e) =>
                      change(
                        updateStatusItem(draft, index, {
                          description: e.target.value,
                        }),
                      )
                    }
                  />
                </label>
                <div className="status-catalog-editor-item-actions">
                  <button
                    type="button"
                    className="toolbar-btn"
                    aria-label={`${item.name}を上へ`}
                    disabled={!canEditItems || busy || index === 0}
                    onClick={() => change(moveStatusItem(draft, index, -1))}
                  >
                    上へ
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    aria-label={`${item.name}を下へ`}
                    disabled={!canEditItems || busy || index === draft.length - 1}
                    onClick={() => change(moveStatusItem(draft, index, 1))}
                  >
                    下へ
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    aria-label={`${item.name}を削除`}
                    disabled={!canEditItems || busy || draft.length <= 1}
                    onClick={() => change(removeStatusItem(draft, index))}
                  >
                    削除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {error && dirty ? (
          <p className="settings-message" role="status">
            {error}
          </p>
        ) : null}
      </div>
      <footer className="status-catalog-editor-footer">
        <div className="settings-actions">
          <button
            type="button"
            className="toolbar-btn"
            disabled={!canEditItems || busy}
            onClick={() => change([...draft, newStatusItem(draft)])}
          >
            項目を足す
          </button>
          <button
            type="button"
            className="toolbar-btn toolbar-btn-primary"
            disabled={!canEditItems || busy || !dirty || error != null}
            onClick={() => void save()}
          >
            保存
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={!dirty || busy}
            onClick={resetDraft}
          >
            編集を戻す
          </button>
          <button
            type="button"
            className="toolbar-btn"
            disabled={busy || error != null || !canEditItems}
            onClick={() => void exportJson()}
          >
            JSON を書き出す
          </button>
        </div>
      </footer>
    </>
  );
});
