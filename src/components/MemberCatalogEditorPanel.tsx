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
import { exportMembersJson } from "../model/memberAppData";
import type { Member } from "../model/memberTypes";
import type { MemberEditorOverlayMode } from "../hooks/useMemberCatalogEditorOverlay";
import {
  createMemberCatalogEditHistory,
  pushMemberCatalogEditHistory,
  redoMemberCatalogEditHistory,
  selectedIndexForMemberSnapshot,
  type MemberCatalogEditSnapshot,
  undoMemberCatalogEditHistory,
} from "../model/memberCatalogEditHistory";
import {
  memberDescriptionErrorAt,
  memberDraftError,
  membersToJson,
  moveMemberItem,
  newMemberItem,
  removeMemberItem,
  sameMemberItems,
  updateMemberItem,
} from "../model/memberEdit";

export type MemberCatalogEditorPanelHandle = {
  draftJson: () => { contents: string; error: string | null };
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

export type MemberCatalogEditorPanelProps = {
  mode: MemberEditorOverlayMode;
  editingCatalogId: string | null;
  items: readonly Member[];
  busy: boolean;
  onSaveApp: (catalogId: string, contents: string) => Promise<void>;
  onSaveWorkspace: (contents: string) => Promise<void>;
  onMessage: (message: string | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const DESCRIPTION_HINT =
  "この id を選ぶ担当だけを書く。表示名は書かない。";

type MemberCatalogEditorItemRowProps = {
  item: Member;
  index: number;
  itemKey: string;
  idReadOnly: boolean;
  canEditItems: boolean;
  busy: boolean;
  draftLength: number;
  selected: boolean;
  onSelectRow: (index: number, focusDescription: boolean) => void;
  onChange: (next: Member[]) => void;
  draft: readonly Member[];
};

function isRowControlTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest(
      "button, input, textarea, select, label.status-catalog-editor-field",
    ),
  );
}

function MemberCatalogEditorItemRow({
  item,
  index,
  idReadOnly,
  canEditItems,
  busy,
  draftLength,
  selected,
  onSelectRow,
  onChange,
  draft,
}: MemberCatalogEditorItemRowProps) {
  const changeItem = (patch: Partial<Member>) => {
    onChange(updateMemberItem(draft, index, patch));
  };

  const descriptionPreview = (item.description ?? "").trim();

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
            readOnly={idReadOnly}
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
        <div className="status-catalog-editor-item-actions">
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を上へ`}
            disabled={!canEditItems || busy || index === 0}
            onClick={() => onChange(moveMemberItem(draft, index, -1))}
          >
            上へ
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を下へ`}
            disabled={!canEditItems || busy || index === draftLength - 1}
            onClick={() => onChange(moveMemberItem(draft, index, 1))}
          >
            下へ
          </button>
          <button
            type="button"
            className="toolbar-btn"
            aria-label={`${item.name}を削除`}
            disabled={!canEditItems || busy}
            onClick={() => onChange(removeMemberItem(draft, index))}
          >
            削除
          </button>
        </div>
      </div>
      {descriptionPreview ? (
        <p
          className="status-catalog-editor-item-description"
          title={item.description ?? ""}
        >
          {item.description}
        </p>
      ) : null}
    </li>
  );
}

type MemberCatalogEditorDetailProps = {
  item: Member;
  index: number;
  draft: readonly Member[];
  canEditItems: boolean;
  busy: boolean;
  descriptionError: string | null;
  selectionLiveId: string;
  descriptionHintId: string;
  descriptionErrorId: string;
  descriptionRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (next: Member[]) => void;
};

function MemberCatalogEditorDetail({
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
}: MemberCatalogEditorDetailProps) {
  const changeItem = (patch: Partial<Member>) => {
    onChange(updateMemberItem(draft, index, patch));
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
          value={item.description ?? ""}
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

export const MemberCatalogEditorPanel = forwardRef<
  MemberCatalogEditorPanelHandle,
  MemberCatalogEditorPanelProps
>(function MemberCatalogEditorPanel(
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
  const [draft, setDraft] = useState<readonly Member[]>(items);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const baselineIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const sessionNewIdsRef = useRef(new Set<string>());
  const dirty = !sameMemberItems(draft, items);
  const error = memberDraftError(draft);
  const canEditItems =
    mode === "workspace"
      ? editingCatalogId === "__workspace__"
      : editingCatalogId != null;

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createMemberCatalogEditHistory());
  const itemsPropRef = useRef(items);
  const draftRef = useRef(draft);
  const selectedIndexRef = useRef(selectedIndex);
  const selectionLiveId = useId();
  const descriptionHintId = useId();
  const descriptionErrorId = useId();

  draftRef.current = draft;
  selectedIndexRef.current = selectedIndex;

  useEffect(() => {
    sessionNewIdsRef.current = new Set();
  }, [items]);

  const isPersistedMemberRow = useCallback(
    (item: Member) =>
      baselineIds.has(item.id) && !sessionNewIdsRef.current.has(item.id),
    [baselineIds],
  );

  const registerSessionNewId = useCallback((id: string) => {
    sessionNewIdsRef.current.add(id);
  }, []);

  const replaceSessionNewId = useCallback((fromId: string, toId: string) => {
    if (!sessionNewIdsRef.current.has(fromId)) return;
    sessionNewIdsRef.current.delete(fromId);
    sessionNewIdsRef.current.add(toId);
  }, []);

  const safeSelectedIndex =
    draft.length === 0 ? 0 : Math.min(selectedIndex, draft.length - 1);
  const selectedItem = draft[safeSelectedIndex];
  const descriptionError = selectedItem
    ? memberDescriptionErrorAt(draft, safeSelectedIndex)
    : null;

  const snapshotFromState = (
    source: readonly Member[],
    index: number,
  ): MemberCatalogEditSnapshot => ({
    items: source.map((item) => ({ ...item })),
    selectedId: source[index]?.id ?? null,
  });

  const applySnapshot = (snapshot: MemberCatalogEditSnapshot) => {
    setDraft(snapshot.items);
    setSelectedIndex(selectedIndexForMemberSnapshot(snapshot));
  };

  const commitItems = (nextItems: Member[], selectedId: string | null) => {
    onMessage(null);
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const next: MemberCatalogEditSnapshot = { items: nextItems, selectedId };
    const pushed = pushMemberCatalogEditHistory(historyRef.current, current, next);
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
      index >= 0 ? index : Math.min(selectedIndexRef.current, Math.max(nextItems.length - 1, 0)),
    );
  };

  useEffect(() => {
    const prev = itemsPropRef.current;
    itemsPropRef.current = items;
    const currentDraft = draftRef.current;
    if (sameMemberItems(items, currentDraft)) return;
    if (sameMemberItems(items, prev)) return;
    historyRef.current = createMemberCatalogEditHistory();
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
    const result = undoMemberCatalogEditHistory(historyRef.current, current);
    if (!result) return false;
    historyRef.current = result.history;
    applySnapshot(result.snapshot);
    onMessage(null);
    return true;
  }, [onMessage]);

  const redo = useCallback(() => {
    const current = snapshotFromState(draftRef.current, selectedIndexRef.current);
    const result = redoMemberCatalogEditHistory(historyRef.current, current);
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
        contents: membersToJson(draft),
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
        await onSaveWorkspace(membersToJson(draft));
        return;
      }
      if (!editingCatalogId || editingCatalogId === "__workspace__") return;
      await onSaveApp(editingCatalogId, membersToJson(draft));
      onMessage(`「${editingCatalogId}」を保存しました。`);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "保存に失敗しました。");
    }
  };

  const exportJson = async () => {
    if (error) return;
    try {
      const path = await exportMembersJson(
        membersToJson(draft),
        editingCatalogId === "__workspace__" || editingCatalogId == null
          ? "members"
          : editingCatalogId,
      );
      onMessage(path ? `${path} に書き出しました。` : null);
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "書き出しに失敗しました。");
    }
  };

  const change = (next: Member[]) => {
    const selectedId =
      next[safeSelectedIndex]?.id ?? next[0]?.id ?? null;
    commitItems(next, selectedId);
  };

  const addItem = () => {
    const next = [...draft, newMemberItem(draft)];
    const index = next.length - 1;
    const selectedId = next[index]?.id ?? null;
    if (selectedId) registerSessionNewId(selectedId);
    commitItems(next, selectedId);
    requestAnimationFrame(() => {
      revealRow(index);
      descriptionRef.current?.focus();
    });
  };

  const resetDraft = () => {
    sessionNewIdsRef.current = new Set();
    commitItems([...items], items[0]?.id ?? null);
  };

  const changeKeepingSelection = (next: Member[], rowIndex: number) => {
    const trackedId = draft[rowIndex]?.id;
    const nextId = next[rowIndex]?.id;
    if (trackedId && nextId && trackedId !== nextId) {
      replaceSessionNewId(trackedId, nextId);
    }
    let selectedId = trackedId ?? draft[safeSelectedIndex]?.id ?? null;
    if (next.length < draft.length) {
      const idx = Math.min(rowIndex, Math.max(next.length - 1, 0));
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
              並びは、詳細パネルと複製と一括の「担当」の順です。<code>id</code> は人を足すときだけ決められます。人を外しても、その
              <code>assigneeId</code> を持つタスクは変わりません。行を選んで、右の説明を書きます。
            </p>
            <ul className="status-catalog-editor-items">
              {draft.map((item, index) => {
                const persisted = isPersistedMemberRow(item);
                const itemKey = persisted ? item.id : `new-${index}`;
                return (
                  <MemberCatalogEditorItemRow
                    key={itemKey}
                    item={item}
                    index={index}
                    itemKey={itemKey}
                    idReadOnly={persisted}
                    canEditItems={canEditItems}
                    busy={busy}
                    draftLength={draft.length}
                    selected={index === safeSelectedIndex}
                    onSelectRow={selectRow}
                    onChange={(next) => changeKeepingSelection(next, index)}
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
            <MemberCatalogEditorDetail
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
            disabled={!canEditItems || busy}
            onClick={addItem}
          >
            人を足す
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
