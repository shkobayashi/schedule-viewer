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
import { exportColorsJson } from "../model/colorAppData";
import type { ColorItem } from "../model/colorCatalog";
import type { ColorEditorOverlayMode } from "../hooks/useColorCatalogEditorOverlay";
import {
  createColorCatalogEditHistory,
  pushColorCatalogEditHistory,
  redoColorCatalogEditHistory,
  selectedIndexForColorSnapshot,
  type ColorCatalogEditSnapshot,
  undoColorCatalogEditHistory,
} from "../model/colorCatalogEditHistory";
import {
  canAddColorItem,
  moveColorItem,
  newColorItem,
  removeColorItem,
  sameColorItems,
  colorDescriptionErrorAt,
  colorDraftError,
  colorsToJson,
  updateColorItem,
} from "../model/colorEdit";

export type ColorCatalogEditorPanelHandle = {
  draftJson: () => { contents: string; error: string | null };
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export type ColorCatalogEditorPanelProps = {
  mode: ColorEditorOverlayMode;
  editingCatalogId: string | null;
  items: readonly ColorItem[];
  busy: boolean;
  onSaveApp: (catalogId: string, contents: string) => Promise<void>;
  onSaveWorkspace: (contents: string) => Promise<void>;
  onMessage: (message: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const COLOR_FIELDS = [
  { scheme: "light", key: "bg", label: "ライト 地" },
  { scheme: "dark", key: "bg", label: "ダーク 地" },
] as const;

const DESCRIPTION_HINT =
  "この id を選ぶ状態だけを書く。色の値は書かない。";

type ColorCatalogEditorItemRowProps = {
  item: ColorItem;
  index: number;
  itemKey: string;
  savedIds: Set<string>;
  canEditItems: boolean;
  busy: boolean;
  draftLength: number;
  selected: boolean;
  onSelectRow: (index: number, focusDescription: boolean) => void;
  onChange: (next: ColorItem[]) => void;
  onLiveChange: (next: ColorItem[]) => void;
  onColorEditStart: () => void;
  onColorEditCommit: () => void;
  draft: readonly ColorItem[];
};

function isRowControlTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest(
      "button, input, textarea, select, label.status-catalog-editor-field, label.status-catalog-editor-role-option, label.status-catalog-editor-color",
    ),
  );
}

function ColorCatalogEditorItemRow({
  item,
  index,
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
}: ColorCatalogEditorItemRowProps) {
  const changeItem = (patch: Partial<ColorItem>) => {
    onChange(updateColorItem(draft, index, patch));
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
                    updateColorItem(draft, index, {
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
            onClick={() => onChange(moveColorItem(draft, index, -1))}
          >
            上へ
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を下へ`}
            disabled={!canEditItems || busy || index === draftLength - 1}
            onClick={() => onChange(moveColorItem(draft, index, 1))}
          >
            下へ
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を削除`}
            disabled={!canEditItems || busy || draftLength <= 1}
            onClick={() => onChange(removeColorItem(draft, index))}
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

type ColorCatalogEditorDetailProps = {
  item: ColorItem;
  index: number;
  draft: readonly ColorItem[];
  canEditItems: boolean;
  busy: boolean;
  descriptionError: string | null;
  selectionLiveId: string;
  descriptionHintId: string;
  descriptionErrorId: string;
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: ColorItem[]) => void;
};

function ColorCatalogEditorDetail({
  item,
  index,
  draft,
  canEditItems,
  busy,
  descriptionError,
  selectionLiveId,
  descriptionHintId,
  descriptionErrorId,
  descriptionRef,
  onChange,
}: ColorCatalogEditorDetailProps) {
  const changeItem = (patch: Partial<ColorItem>) => {
    onChange(updateColorItem(draft, index, patch));
  };

  return (
    <aside className="status-catalog-editor-detail" aria-label="説明">
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
    </aside>
  );
}

export const ColorCatalogEditorPanel = forwardRef<
  ColorCatalogEditorPanelHandle,
  ColorCatalogEditorPanelProps
>(function ColorCatalogEditorPanel(
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
  const [draft, setDraft] = useState<readonly ColorItem[]>(items);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const savedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const dirty = !sameColorItems(draft, items);
  const error = colorDraftError(draft);
  const canEditItems =
    mode === "workspace"
      ? editingCatalogId === "__workspace__"
      : editingCatalogId != null;

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createColorCatalogEditHistory());
  const colorDragSnapshotRef = useRef<ColorCatalogEditSnapshot | null>(null);
  const itemsPropRef = useRef(items);
  const draftRef = useRef(draft);
  const selectedIndexRef = useRef(selectedIndex);
  const selectionLiveId = useId();
  const descriptionHintId = useId();
  const descriptionErrorId = useId();

  draftRef.current = draft;
  selectedIndexRef.current = selectedIndex;

  const safeSelectedIndex =
    draft.length === 0 ? 0 : Math.min(selectedIndex, draft.length - 1);
  const selectedItem = draft[safeSelectedIndex];
  const descriptionError = selectedItem
    ? colorDescriptionErrorAt(draft, safeSelectedIndex)
    : null;

  const snapshotFromState = (
    source: readonly ColorItem[],
    index: number,
  ): ColorCatalogEditSnapshot => ({
    items: source.map((item) => ({
      ...item,
      color: {
        light: { ...item.color.light },
        dark: { ...item.color.dark },
      },
    })),
    selectedId: source[index]?.id ?? null,
  });

  const applySnapshot = (snapshot: ColorCatalogEditSnapshot) => {
    setDraft(snapshot.items);
    setSelectedIndex(selectedIndexForColorSnapshot(snapshot));
  };

  const commitColorEditHistory = () => {
    const baseline = colorDragSnapshotRef.current;
    if (!baseline) return;
    colorDragSnapshotRef.current = null;
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const pushed = pushColorCatalogEditHistory(
      historyRef.current,
      baseline,
      current,
    );
    if (pushed) {
      historyRef.current = pushed.history;
    }
  };

  const commitItems = (nextItems: ColorItem[], selectedId: string | null) => {
    commitColorEditHistory();
    onMessage(null);
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const next: ColorCatalogEditSnapshot = { items: nextItems, selectedId };
    const pushed = pushColorCatalogEditHistory(historyRef.current, current, next);
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
    if (sameColorItems(items, currentDraft)) return;
    if (sameColorItems(items, prev)) return;
    historyRef.current = createColorCatalogEditHistory();
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
    const result = undoColorCatalogEditHistory(historyRef.current, current);
    if (!result) return false;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    onMessage(null);
    return true;
  }, [onMessage]);

  const redo = useCallback(() => {
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const result = redoColorCatalogEditHistory(historyRef.current, current);
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
        contents: colorsToJson(draft),
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
        await onSaveWorkspace(colorsToJson(draft));
        return;
      }
      if (!editingCatalogId || editingCatalogId === "__workspace__") return;
      await onSaveApp(editingCatalogId, colorsToJson(draft));
      onMessage(`「${editingCatalogId}」を保存しました。`);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "保存に失敗しました。");
    }
  };

  const exportJson = async () => {
    if (error) return;
    try {
      const path = await exportColorsJson(
        colorsToJson(draft),
        editingCatalogId === "__workspace__" || editingCatalogId == null
          ? "colors"
          : editingCatalogId,
      );
      onMessage(path ? `${path} に書き出しました。` : null);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "書き出しに失敗しました。");
    }
  };

  const change = (next: ColorItem[]) => {
    const selectedId =
      next[safeSelectedIndex]?.id ?? next[0]?.id ?? null;
    commitItems(next, selectedId);
  };

  const applyLiveDraft = (next: ColorItem[]) => {
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
    const next = [...draft, newColorItem(draft)];
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

  const changeKeepingSelection = (next: ColorItem[], rowIndex: number) => {
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
              並びは、詳細パネルと複製と一括の「色」の順です。<code>id</code> は項目を足すときだけ決められます。項目を外しても、その
              <code>colorId</code> を持つタスクは変わりません。行を選んで、右の説明を書きます。
            </p>
            <ul className="status-catalog-editor-items">
              {draft.map((item, index) => {
                const itemKey = savedIds.has(item.id) ? item.id : `new-${index}`;
                return (
                  <ColorCatalogEditorItemRow
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
            <ColorCatalogEditorDetail
              item={selectedItem}
              index={safeSelectedIndex}
              draft={draft}
              canEditItems={canEditItems}
              busy={busy}
              descriptionError={descriptionError}
              selectionLiveId={selectionLiveId}
              descriptionHintId={descriptionHintId}
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
            disabled={!canEditItems || busy || !canAddColorItem(draft)}
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
