import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { exportStatusesJson } from "../model/statusAppData";
import {
  STATUS_ROLE_HINTS,
  STATUS_ROLE_LABELS,
  type StatusItem,
  type StatusRole,
} from "../model/statusCatalog";
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

const STATUS_ROLES: readonly StatusRole[] = [
  "not-started",
  "started",
  "done",
  "unmanaged",
];

const COLOR_FIELDS = [
  { scheme: "light", key: "bg", label: "ライト 地" },
  { scheme: "light", key: "border", label: "ライト 枠" },
  { scheme: "dark", key: "bg", label: "ダーク 地" },
  { scheme: "dark", key: "border", label: "ダーク 枠" },
] as const;

type StatusCatalogEditorItemRowProps = {
  item: StatusItem;
  index: number;
  itemKey: string;
  savedIds: Set<string>;
  canEditItems: boolean;
  busy: boolean;
  draftLength: number;
  onChange: (next: StatusItem[]) => void;
  draft: readonly StatusItem[];
};

function StatusCatalogEditorItemRow({
  item,
  index,
  itemKey,
  savedIds,
  canEditItems,
  busy,
  draftLength,
  onChange,
  draft,
}: StatusCatalogEditorItemRowProps) {
  const [previewRole, setPreviewRole] = useState<StatusRole | null>(null);
  const roleGroupLabelId = `status-role-label-${itemKey}`;
  const hintRole = previewRole ?? item.role;

  const changeItem = (patch: Partial<StatusItem>) => {
    onChange(updateStatusItem(draft, index, patch));
  };

  return (
    <li className="status-catalog-editor-item">
      <div className="status-catalog-editor-item-main">
        <label className="status-catalog-editor-field status-catalog-editor-field-id">
          id
          <input
            type="text"
            value={item.id}
            readOnly={savedIds.has(item.id)}
            disabled={!canEditItems || busy}
            onChange={(e) => changeItem({ id: e.target.value })}
          />
        </label>
        <label className="status-catalog-editor-field status-catalog-editor-field-name">
          表示名
          <input
            type="text"
            value={item.name}
            disabled={!canEditItems || busy}
            onChange={(e) => changeItem({ name: e.target.value })}
          />
        </label>
        <div className="status-catalog-editor-field status-catalog-editor-field-role">
          <span className="status-catalog-editor-field-label" id={roleGroupLabelId}>
            扱い
          </span>
          <div
            className="status-catalog-editor-role-options"
            role="radiogroup"
            aria-labelledby={roleGroupLabelId}
            onMouseLeave={() => setPreviewRole(null)}
          >
            {STATUS_ROLES.map((role) => (
              <label
                key={role}
                className="status-catalog-editor-role-option"
                onMouseEnter={() => setPreviewRole(role)}
              >
                <input
                  type="radio"
                  name={`status-role-${itemKey}`}
                  checked={item.role === role}
                  disabled={!canEditItems || busy}
                  aria-label={`${STATUS_ROLE_LABELS[role]}。${STATUS_ROLE_HINTS[role]}`}
                  onChange={() => changeItem({ role })}
                  onFocus={() => setPreviewRole(role)}
                  onBlur={(e) => {
                    const group = e.currentTarget.closest('[role="radiogroup"]');
                    if (group?.contains(e.relatedTarget)) return;
                    setPreviewRole(null);
                  }}
                />
                {STATUS_ROLE_LABELS[role]}
              </label>
            ))}
          </div>
        </div>
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
                  changeItem({
                    color: { [scheme]: { [key]: e.target.value } },
                  })
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
            onChange={(e) => changeItem({ description: e.target.value })}
          />
        </label>
        <div className="status-catalog-editor-item-actions">
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を上へ`}
            disabled={!canEditItems || busy || index === 0}
            onClick={() => onChange(moveStatusItem(draft, index, -1))}
          >
            上へ
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を下へ`}
            disabled={!canEditItems || busy || index === draftLength - 1}
            onClick={() => onChange(moveStatusItem(draft, index, 1))}
          >
            下へ
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を削除`}
            disabled={!canEditItems || busy || draftLength <= 1}
            onClick={() => onChange(removeStatusItem(draft, index))}
          >
            削除
          </button>
        </div>
      </div>
      <p className="status-catalog-editor-role-hint" aria-live="polite">
        {STATUS_ROLE_HINTS[hintRole]}
      </p>
    </li>
  );
}

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
          {draft.map((item, index) => {
            const itemKey = savedIds.has(item.id) ? item.id : `new-${index}`;
            return (
              <StatusCatalogEditorItemRow
                key={itemKey}
                item={item}
                index={index}
                itemKey={itemKey}
                savedIds={savedIds}
                canEditItems={canEditItems}
                busy={busy}
                draftLength={draft.length}
                onChange={change}
                draft={draft}
              />
            );
          })}
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
