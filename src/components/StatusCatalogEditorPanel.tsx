import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
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
  createStatusCatalogEditHistory,
  pushStatusCatalogEditHistory,
  redoStatusCatalogEditHistory,
  selectedIndexForSnapshot,
  type StatusCatalogEditSnapshot,
  undoStatusCatalogEditHistory,
} from "../model/statusCatalogEditHistory";
import {
  moveStatusItem,
  newStatusItem,
  removeStatusItem,
  sameStatusItems,
  statusDescriptionErrorAt,
  statusDraftError,
  statusesToJson,
  updateStatusItem,
} from "../model/statusEdit";

export type StatusCatalogEditorPanelHandle = {
  draftJson: () => { contents: string; error: string | null };
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
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

const DESCRIPTION_HINT =
  "この id を選ぶ状態だけを書く。隣の項目と同じ依頼で迷いそうなときだけ、分かれ目を一文足す。扱いと色は書かない。";
const INSTRUCTION_HINT =
  "空でよい。選んだあとに守ることだけを書く。進捗を揃える、移す前に確認する、など。状態は書かない。";

type StatusCatalogEditorItemRowProps = {
  item: StatusItem;
  index: number;
  itemKey: string;
  savedIds: Set<string>;
  canEditItems: boolean;
  busy: boolean;
  draftLength: number;
  selected: boolean;
  onSelectRow: (index: number, focusDescription: boolean) => void;
  onChange: (next: StatusItem[]) => void;
  onLiveChange: (next: StatusItem[]) => void;
  onColorEditStart: () => void;
  onColorEditCommit: () => void;
  draft: readonly StatusItem[];
};

function isRowControlTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest(
      "button, input, textarea, select, label.status-catalog-editor-field, label.status-catalog-editor-role-option, label.status-catalog-editor-color",
    ),
  );
}

function StatusCatalogEditorItemRow({
  item,
  index,
  itemKey,
  savedIds,
  canEditItems,
  busy,
  draftLength,
  selected,
  onSelectRow,
  onChange,
  onLiveChange,
  onColorEditStart,
  onColorEditCommit,
  draft,
}: StatusCatalogEditorItemRowProps) {
  const [previewRole, setPreviewRole] = useState<StatusRole | null>(null);
  const roleGroupLabelId = `status-role-label-${itemKey}`;
  const hintRole = previewRole ?? item.role;

  const changeItem = (patch: Partial<StatusItem>) => {
    onChange(updateStatusItem(draft, index, patch));
  };

  const descriptionPreview = item.description.trim();

  return (
    <li
      className={`status-catalog-editor-item${selected ? " status-catalog-editor-item-selected" : ""}`}
      aria-current={selected ? "true" : undefined}
      onMouseDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (isRowControlTarget(target)) {
          onSelectRow(index, false);
          return;
        }
        event.preventDefault();
        onSelectRow(index, true);
      }}
    >
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
          <p
            className="status-catalog-editor-role-hint"
            aria-live="polite"
            title={STATUS_ROLE_HINTS[hintRole]}
          >
            {STATUS_ROLE_HINTS[hintRole]}
          </p>
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
                onPointerDown={() => onColorEditStart()}
                onBlur={() => onColorEditCommit()}
                onChange={(e) =>
                  onLiveChange(
                    updateStatusItem(draft, index, {
                      color: { [scheme]: { [key]: e.target.value } },
                    }),
                  )
                }
              />
            </label>
          ))}
        </div>
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
      {descriptionPreview ? (
        <p className="status-catalog-editor-item-description" title={item.description}>
          {item.description}
        </p>
      ) : null}
    </li>
  );
}

type StatusCatalogEditorDetailProps = {
  item: StatusItem;
  index: number;
  draft: readonly StatusItem[];
  canEditItems: boolean;
  busy: boolean;
  descriptionError: string | null;
  selectionLiveId: string;
  descriptionHintId: string;
  instructionHintId: string;
  descriptionErrorId: string;
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: StatusItem[]) => void;
};

function StatusCatalogEditorDetail({
  item,
  index,
  draft,
  canEditItems,
  busy,
  descriptionError,
  selectionLiveId,
  descriptionHintId,
  instructionHintId,
  descriptionErrorId,
  descriptionRef,
  onChange,
}: StatusCatalogEditorDetailProps) {
  const changeItem = (patch: Partial<StatusItem>) => {
    onChange(updateStatusItem(draft, index, patch));
  };

  return (
    <aside className="status-catalog-editor-detail" aria-label="説明と指示">
      <p className="status-catalog-editor-detail-title">{item.name}</p>
      <p
        className="status-catalog-editor-selection-live visually-hidden"
        id={selectionLiveId}
        aria-live="polite"
      >
        {item.name}
      </p>
      <label className="status-catalog-editor-detail-field">
        説明
        <span className="status-catalog-editor-field-hint" id={descriptionHintId}>
          {DESCRIPTION_HINT}
        </span>
        <textarea
          ref={descriptionRef}
          className="status-catalog-editor-textarea status-catalog-editor-textarea-description"
          rows={3}
          value={item.description}
          disabled={!canEditItems || busy}
          aria-describedby={descriptionHintId}
          aria-invalid={descriptionError ? true : undefined}
          aria-errormessage={descriptionError ? descriptionErrorId : undefined}
          onChange={(e) => changeItem({ description: e.target.value })}
        />
        {descriptionError ? (
          <span className="status-catalog-editor-field-error" id={descriptionErrorId} role="status">
            {descriptionError}
          </span>
        ) : null}
      </label>
      <label className="status-catalog-editor-detail-field">
        指示
        <span className="status-catalog-editor-field-hint" id={instructionHintId}>
          {INSTRUCTION_HINT}
        </span>
        <textarea
          className="status-catalog-editor-textarea status-catalog-editor-textarea-instruction"
          rows={2}
          value={item.instruction ?? ""}
          disabled={!canEditItems || busy}
          aria-describedby={instructionHintId}
          onChange={(e) => changeItem({ instruction: e.target.value })}
        />
      </label>
    </aside>
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const savedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const dirty = !sameStatusItems(draft, items);
  const error = statusDraftError(draft);
  const canEditItems =
    mode === "workspace"
      ? editingCatalogId === "__workspace__"
      : editingCatalogId != null;

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createStatusCatalogEditHistory());
  const colorDragSnapshotRef = useRef<StatusCatalogEditSnapshot | null>(null);
  const itemsPropRef = useRef(items);
  const draftRef = useRef(draft);
  const selectedIndexRef = useRef(selectedIndex);
  const selectionLiveId = useId();
  const descriptionHintId = useId();
  const instructionHintId = useId();
  const descriptionErrorId = useId();

  draftRef.current = draft;
  selectedIndexRef.current = selectedIndex;

  const safeSelectedIndex =
    draft.length === 0 ? 0 : Math.min(selectedIndex, draft.length - 1);
  const selectedItem = draft[safeSelectedIndex];
  const descriptionError = selectedItem
    ? statusDescriptionErrorAt(draft, safeSelectedIndex)
    : null;

  const snapshotFromState = (
    source: readonly StatusItem[],
    index: number,
  ): StatusCatalogEditSnapshot => ({
    items: source.map((item) => ({
      ...item,
      color: {
        light: { ...item.color.light },
        dark: { ...item.color.dark },
      },
    })),
    selectedId: source[index]?.id ?? null,
  });

  const applySnapshot = (snapshot: StatusCatalogEditSnapshot) => {
    setDraft(snapshot.items);
    setSelectedIndex(selectedIndexForSnapshot(snapshot));
  };

  const commitColorEditHistory = () => {
    const baseline = colorDragSnapshotRef.current;
    if (!baseline) return;
    colorDragSnapshotRef.current = null;
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const pushed = pushStatusCatalogEditHistory(
      historyRef.current,
      baseline,
      current,
    );
    if (pushed) {
      historyRef.current = pushed.history;
    }
  };

  const commitItems = (nextItems: StatusItem[], selectedId: string | null) => {
    commitColorEditHistory();
    onMessage(null);
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const next: StatusCatalogEditSnapshot = { items: nextItems, selectedId };
    const pushed = pushStatusCatalogEditHistory(historyRef.current, current, next);
    if (pushed) {
      historyRef.current = pushed.history;
      if (pushed.applied) {
        applySnapshot(pushed.applied);
        return;
      }
    }
    setDraft(nextItems);
    const index =
      selectedId != null
        ? nextItems.findIndex((item) => item.id === selectedId)
        : -1;
    setSelectedIndex(
      index >= 0 ? index : Math.min(selectedIndexRef.current, nextItems.length - 1),
    );
  };

  useEffect(() => {
    const prev = itemsPropRef.current;
    itemsPropRef.current = items;
    const currentDraft = draftRef.current;
    if (sameStatusItems(items, currentDraft)) return;
    if (sameStatusItems(items, prev)) return;
    historyRef.current = createStatusCatalogEditHistory();
    const prevId = currentDraft[selectedIndexRef.current]?.id;
    const nextDraft = [...items];
    setDraft(nextDraft);
    if (prevId) {
      const idx = nextDraft.findIndex((item) => item.id === prevId);
      setSelectedIndex(idx >= 0 ? idx : 0);
    } else {
      setSelectedIndex(0);
    }
  }, [items]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const undo = useCallback(() => {
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const result = undoStatusCatalogEditHistory(historyRef.current, current);
    if (!result) return false;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    onMessage(null);
    return true;
  }, [onMessage]);

  const redo = useCallback(() => {
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const result = redoStatusCatalogEditHistory(historyRef.current, current);
    if (!result) return false;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    onMessage(null);
    return true;
  }, [onMessage]);

  useImperativeHandle(
    ref,
    () => ({
      draftJson: () => ({
        contents: statusesToJson(draft),
        error,
      }),
      undo,
      redo,
      canUndo: () => historyRef.current.past.length > 0,
      canRedo: () => historyRef.current.future.length > 0,
    }),
    [draft, error, undo, redo],
  );

  const revealRow = (index: number) => {
    const scroll = listScrollRef.current;
    if (!scroll) return;
    const row = scroll.querySelector<HTMLElement>(
      `.status-catalog-editor-item:nth-child(${index + 1})`,
    );
    if (!row) return;
    const scrollRect = scroll.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < scrollRect.top) {
      scroll.scrollTop += rowRect.top - scrollRect.top;
    } else if (rowRect.bottom > scrollRect.bottom) {
      scroll.scrollTop += rowRect.bottom - scrollRect.bottom;
    }
  };

  const selectRow = (index: number, focusDescription: boolean) => {
    setSelectedIndex(index);
    if (focusDescription) {
      requestAnimationFrame(() => {
        revealRow(index);
        descriptionRef.current?.focus();
      });
    }
  };

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
    const selectedId =
      next[safeSelectedIndex]?.id ?? next[0]?.id ?? null;
    commitItems(next, selectedId);
  };

  const applyLiveDraft = (next: StatusItem[]) => {
    setDraft(next);
    onMessage(null);
  };

  const startColorEdit = () => {
    if (colorDragSnapshotRef.current) return;
    colorDragSnapshotRef.current = snapshotFromState(
      draftRef.current,
      selectedIndexRef.current,
    );
  };

  const addItem = () => {
    const next = [...draft, newStatusItem(draft)];
    const index = next.length - 1;
    const selectedId = next[index]?.id ?? null;
    commitItems(next, selectedId);
    requestAnimationFrame(() => {
      revealRow(index);
      descriptionRef.current?.focus();
    });
  };

  const resetDraft = () => {
    commitItems([...items], items[0]?.id ?? null);
  };

  const changeKeepingSelection = (next: StatusItem[], rowIndex: number) => {
    const trackedId = draft[rowIndex]?.id;
    let selectedId = trackedId ?? draft[safeSelectedIndex]?.id ?? null;
    if (next.length < draft.length) {
      const idx = Math.min(rowIndex, next.length - 1);
      selectedId = next[idx]?.id ?? null;
      commitItems(next, selectedId);
      return;
    }
    if (trackedId) {
      const newIndex = next.findIndex((item) => item.id === trackedId);
      if (newIndex >= 0) selectedId = trackedId;
    }
    commitItems(next, selectedId);
  };

  return (
    <>
      <div className="status-catalog-editor-workspace">
        <div className="status-catalog-editor-list-pane">
          <div className="status-catalog-editor-scroll" ref={listScrollRef}>
            <p className="settings-note status-catalog-editor-hint">
              並びは、詳細パネルと絞り込みの選択肢の順です。<code>id</code> は項目を足すときだけ決められます。項目を外しても、その
              <code>id</code> を持つタスクは変わりません。行を選んで、右の説明と指示を書きます。
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
                    selected={index === safeSelectedIndex}
                    onSelectRow={selectRow}
                    onChange={(next) => changeKeepingSelection(next, index)}
                    onLiveChange={applyLiveDraft}
                    onColorEditStart={startColorEdit}
                    onColorEditCommit={commitColorEditHistory}
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
        </div>
        <div className="status-catalog-editor-detail-slot">
          {selectedItem ? (
            <StatusCatalogEditorDetail
              item={selectedItem}
              index={safeSelectedIndex}
              draft={draft}
              canEditItems={canEditItems}
              busy={busy}
              descriptionError={descriptionError}
              selectionLiveId={selectionLiveId}
              descriptionHintId={descriptionHintId}
              instructionHintId={instructionHintId}
              descriptionErrorId={descriptionErrorId}
              descriptionRef={descriptionRef}
              onChange={change}
            />
          ) : null}
        </div>
      </div>
      <footer className="status-catalog-editor-footer">
        <div className="settings-actions">
          <button
            type="button"
            className="toolbar-btn"
            disabled={!canEditItems || busy}
            onClick={addItem}
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
