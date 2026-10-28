import { useId, useMemo, useRef } from "react";
import type { ScheduleFieldType } from "../model/types";
import {
  fieldDefinitionCloseIssues,
  fieldDefinitionCloseSummary,
  fieldDefinitionRequiredSavePreview,
  fieldDefinitionValueDropPreview,
  moveFieldDefinitionDraft,
  newChoiceDraftRow,
  newFieldDefinitionDraft,
  removeFieldDefinitionDraft,
  type FieldDefinitionDraft,
} from "../model/fieldDefinitionEdit";
import type { DocumentSnapshot } from "../model/history";
import { isValidPluginOrItemId } from "../model/fieldExtensionMerge";
import { DateInput } from "./DateInput";

const TASK_FIELD_NONE_VALUE = "__none__";

const TYPE_OPTIONS: { value: ScheduleFieldType; label: string }[] = [
  { value: "text", label: "文章" },
  { value: "number", label: "数値" },
  { value: "date", label: "日付" },
  { value: "choice", label: "候補" },
];

function isRowControlTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest(
      "input, select, textarea, button, label, .field-definition-editor-row-controls",
    ),
  );
}

type FieldDefinitionEditorPanelProps = {
  drafts: FieldDefinitionDraft[];
  openingDrafts: FieldDefinitionDraft[];
  documentSnapshot: DocumentSnapshot;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onDraftsChange: (
    drafts: FieldDefinitionDraft[],
    selectIndex?: number,
  ) => void;
  onRequestRemoveField: (index: number) => void;
  onRequestRemoveChoice: (fieldIndex: number, rowId: string, openingText: string) => void;
  footerMessage: string | null;
  firstNameInputRef?: React.RefObject<HTMLInputElement | null>;
  /** 拡張項目の定義だけを直すときは true。スケジュールの値のプレビューを出さない。 */
  extensionEditMode?: boolean;
  extensionOpeningItemIds?: ReadonlySet<string>;
  extensionFooter?: {
    busy: boolean;
    saveDisabled: boolean;
    revertDisabled: boolean;
    exportDisabled: boolean;
    onSave: () => void;
    onRevert: () => void;
    onExport: () => void;
  };
};

export function FieldDefinitionEditorPanel({
  drafts,
  openingDrafts,
  documentSnapshot,
  selectedIndex,
  onSelectIndex,
  onDraftsChange,
  onRequestRemoveField,
  onRequestRemoveChoice,
  footerMessage,
  firstNameInputRef,
  extensionEditMode = false,
  extensionOpeningItemIds,
  extensionFooter,
}: FieldDefinitionEditorPanelProps) {
  const listScrollRef = useRef<HTMLDivElement>(null);
  const meaningHintId = useId();
  const instructionHintId = useId();
  const defaultHintId = useId();

  const safeSelectedIndex =
    selectedIndex >= 0 && selectedIndex < drafts.length ? selectedIndex : -1;
  const selected = safeSelectedIndex >= 0 ? drafts[safeSelectedIndex] : null;

  const dropPreview = useMemo(
    () =>
      extensionEditMode
        ? null
        : fieldDefinitionValueDropPreview(
            documentSnapshot,
            openingDrafts,
            drafts,
          ),
    [documentSnapshot, drafts, extensionEditMode, openingDrafts],
  );

  const requiredSaveBlock = useMemo(
    () =>
      extensionEditMode
        ? null
        : fieldDefinitionRequiredSavePreview(
            documentSnapshot,
            openingDrafts,
            drafts,
          ),
    [documentSnapshot, drafts, extensionEditMode, openingDrafts],
  );

  const closeBlock = useMemo(
    () => fieldDefinitionCloseSummary(fieldDefinitionCloseIssues(drafts)),
    [drafts],
  );

  const statusLine =
    closeBlock ?? requiredSaveBlock ?? dropPreview ?? footerMessage;

  const isItemIdEditable = (draft: FieldDefinitionDraft): boolean => {
    if (!extensionEditMode) return false;
    if (draft.sessionAdded) return true;
    if (extensionOpeningItemIds == null) return false;
    return !extensionOpeningItemIds.has(draft.key);
  };

  const updateDraft = (index: number, patch: Partial<FieldDefinitionDraft>) => {
    onDraftsChange(
      drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  };

  const updateItemId = (index: number, nextId: string) => {
    const trimmed = nextId.trim();
    if (!isValidPluginOrItemId(trimmed)) return;
    if (drafts.some((draft, i) => i !== index && draft.key === trimmed)) {
      return;
    }
    updateDraft(index, { key: trimmed });
  };

  const updateChoiceRow = (
    fieldIndex: number,
    rowId: string,
    value: string,
  ) => {
    const draft = drafts[fieldIndex];
    if (draft == null) return;
    const opening = openingDrafts.find((d) => d.key === draft.key);
    const openingRow = opening?.choiceRows.find((r) => r.rowId === rowId);
    const openingText = openingRow?.value ?? "";
    let defaultText = draft.defaultText;
    if (defaultText === openingText && openingText.length > 0) {
      defaultText = value;
    }
    onDraftsChange(
      drafts.map((item, i) => {
        if (i !== fieldIndex) return item;
        return {
          ...item,
          defaultText,
          choiceRows: item.choiceRows.map((row) =>
            row.rowId === rowId ? { ...row, value } : row,
          ),
        };
      }),
    );
  };

  const handleTypeChange = (index: number, type: ScheduleFieldType) => {
    const draft = drafts[index];
    if (draft == null) return;
    let defaultText = draft.defaultText;
    if (type === "number") {
      const parsed = Number(defaultText.trim());
      if (!Number.isFinite(parsed)) defaultText = "";
    } else if (type === "date" || type === "choice") {
      defaultText = "";
    }
    updateDraft(index, { type, defaultText });
  };

  const addItem = () => {
    const next = [...drafts, newFieldDefinitionDraft(drafts)];
    onDraftsChange(next, next.length - 1);
    requestAnimationFrame(() => {
      const list = listScrollRef.current;
      if (list) list.scrollTop = list.scrollHeight;
      firstNameInputRef?.current?.focus();
    });
  };

  return (
    <div
      className={`field-definition-editor-panel${
        extensionEditMode ? " field-definition-editor-panel-extension" : ""
      }`}
    >
      <div className="field-definition-editor-body">
        <div className="field-definition-editor-workspace">
          <div className="field-definition-editor-list-pane">
            <div className="field-definition-editor-scroll" ref={listScrollRef}>
              <p className="settings-note field-definition-editor-hint">
                並びは、詳細パネルの追加項目の順です。
              </p>
              {drafts.length === 0 ? (
                <p className="muted">追加項目はありません。</p>
              ) : (
                <ul className="field-definition-editor-items">
                  {drafts.map((draft, index) => {
                    const nameId = `field-def-name-${draft.key}`;
                    const selectedRow = index === safeSelectedIndex;
                    const rowKey = isItemIdEditable(draft)
                      ? `new-${index}`
                      : draft.key;
                    return (
                      <li
                        key={rowKey}
                        className={`field-definition-editor-item${
                          selectedRow
                            ? " field-definition-editor-item-selected"
                            : ""
                        }`}
                      >
                        <div
                          className="field-definition-editor-item-main"
                          onClick={(event) => {
                            if (isRowControlTarget(event.target as HTMLElement)) {
                              return;
                            }
                            onSelectIndex(index);
                            requestAnimationFrame(() => {
                              document
                                .getElementById(`field-meaning-${draft.key}`)
                                ?.focus();
                            });
                          }}
                        >
                          <label className="field-definition-editor-field field-definition-editor-field-name">
                            名前
                            <input
                              id={nameId}
                              ref={
                                index === 0 ? firstNameInputRef : undefined
                              }
                              type="text"
                              value={draft.name}
                              onChange={(e) =>
                                updateDraft(index, { name: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          <label className="field-definition-editor-field field-definition-editor-field-type">
                            型
                            <select
                              value={draft.type}
                              onChange={(e) =>
                                handleTypeChange(
                                  index,
                                  e.target.value as ScheduleFieldType,
                                )
                              }
                              onClick={(e) => e.stopPropagation()}
                            >
                              {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label
                            className="field-definition-editor-field field-definition-editor-field-required"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={draft.required}
                              onChange={(e) =>
                                updateDraft(index, {
                                  required: e.target.checked,
                                })
                              }
                            />
                            必須
                          </label>
                          <div
                            className="field-definition-editor-item-actions field-definition-editor-row-controls"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="toolbar-btn"
                              disabled={index === 0}
                              onClick={() =>
                                onDraftsChange(
                                  moveFieldDefinitionDraft(drafts, index, -1),
                                )
                              }
                            >
                              上へ
                            </button>
                            <button
                              type="button"
                              className="toolbar-btn"
                              disabled={index === drafts.length - 1}
                              onClick={() =>
                                onDraftsChange(
                                  moveFieldDefinitionDraft(drafts, index, 1),
                                )
                              }
                            >
                              下へ
                            </button>
                            <button
                              type="button"
                              className="toolbar-btn toolbar-btn-danger"
                              onClick={() => onRequestRemoveField(index)}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="field-definition-editor-detail-slot">
            {selected ? (
              <aside
                className="field-definition-editor-detail"
                aria-label="意味と指示"
              >
                <p className="field-definition-editor-detail-title">
                  {selected.name.trim().length > 0
                    ? selected.name.trim()
                    : "名前なし"}
                </p>
                <label className="field-definition-editor-detail-field">
                  意味
                  <span
                    className="field-definition-editor-field-hint"
                    id={meaningHintId}
                  >
                    この値が何かを書く。いつ更新するかは書かない。
                  </span>
                  <textarea
                    id={`field-meaning-${selected.key}`}
                    className="field-definition-editor-textarea"
                    aria-describedby={meaningHintId}
                    value={selected.meaning}
                    onChange={(e) =>
                      updateDraft(safeSelectedIndex, {
                        meaning: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="field-definition-editor-detail-field">
                  指示
                  <span
                    className="field-definition-editor-field-hint"
                    id={instructionHintId}
                  >
                    空でよい。空でなければ、LLM がいつこの値を更新するかを書く。
                  </span>
                  <textarea
                    className="field-definition-editor-textarea"
                    aria-describedby={instructionHintId}
                    value={selected.instruction}
                    onChange={(e) =>
                      updateDraft(safeSelectedIndex, {
                        instruction: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="field-definition-editor-detail-field">
                  <span className="field-definition-editor-field-label">
                    デフォルト
                  </span>
                  <span
                    className="field-definition-editor-field-hint"
                    id={defaultHintId}
                  >
                    このあと作るタスクに入ります。今ある空欄は埋まりません。
                  </span>
                  {selected.type === "text" ? (
                    <input
                      type="text"
                      className="field-definition-editor-input"
                      aria-describedby={defaultHintId}
                      value={selected.defaultText}
                      onChange={(e) =>
                        updateDraft(safeSelectedIndex, {
                          defaultText: e.target.value,
                        })
                      }
                    />
                  ) : null}
                  {selected.type === "number" ? (
                    <input
                      type="number"
                      className="field-definition-editor-input"
                      aria-describedby={defaultHintId}
                      value={selected.defaultText}
                      onChange={(e) =>
                        updateDraft(safeSelectedIndex, {
                          defaultText: e.target.value,
                        })
                      }
                    />
                  ) : null}
                  {selected.type === "date" ? (
                    <DateInput
                      id={`field-default-${selected.key}`}
                      value={selected.defaultText}
                      onChange={(next) =>
                        updateDraft(safeSelectedIndex, { defaultText: next })
                      }
                    />
                  ) : null}
                  {selected.type === "choice" ? (
                    <select
                      className="field-definition-editor-input"
                      aria-describedby={defaultHintId}
                      value={
                        selected.defaultText.length === 0
                          ? TASK_FIELD_NONE_VALUE
                          : selected.defaultText
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        updateDraft(safeSelectedIndex, {
                          defaultText:
                            next === TASK_FIELD_NONE_VALUE ? "" : next,
                        });
                      }}
                    >
                      <option value={TASK_FIELD_NONE_VALUE}>値なし</option>
                      {selected.choiceRows.map((row) => (
                        <option key={row.rowId} value={row.value}>
                          {row.value.length > 0 ? row.value : "（空）"}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                {selected.type === "number" ? (
                  <label className="field-definition-editor-detail-field field-definition-editor-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selected.percent}
                      onChange={(e) =>
                        updateDraft(safeSelectedIndex, {
                          percent: e.target.checked,
                        })
                      }
                    />
                    パーセント表示
                  </label>
                ) : null}
                {selected.type === "choice" ? (
                  <div className="field-definition-editor-detail-field field-definition-editor-choices">
                    <span className="field-definition-editor-field-label">
                      候補
                    </span>
                    <ul className="field-definition-editor-choice-list">
                      {selected.choiceRows.map((row) => (
                        <li key={row.rowId}>
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) =>
                              updateChoiceRow(
                                safeSelectedIndex,
                                row.rowId,
                                e.target.value,
                              )
                            }
                          />
                          <button
                            type="button"
                            className="toolbar-btn toolbar-btn-danger"
                            onClick={() => {
                              const opening = openingDrafts.find(
                                (d) => d.key === selected.key,
                              );
                              const openingRow = opening?.choiceRows.find(
                                (r) => r.rowId === row.rowId,
                              );
                              if (openingRow == null) {
                                updateDraft(safeSelectedIndex, {
                                  choiceRows: selected.choiceRows.filter(
                                    (r) => r.rowId !== row.rowId,
                                  ),
                                });
                                return;
                              }
                              const openingText = openingRow.value;
                              if (openingText.trim().length === 0) {
                                updateDraft(safeSelectedIndex, {
                                  choiceRows: selected.choiceRows.filter(
                                    (r) => r.rowId !== row.rowId,
                                  ),
                                });
                                return;
                              }
                              onRequestRemoveChoice(
                                safeSelectedIndex,
                                row.rowId,
                                openingText,
                              );
                            }}
                          >
                            削除
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="toolbar-btn"
                      onClick={() =>
                        updateDraft(safeSelectedIndex, {
                          choiceRows: [
                            ...selected.choiceRows,
                            newChoiceDraftRow(),
                          ],
                        })
                      }
                    >
                      候補を足す
                    </button>
                  </div>
                ) : null}
                {extensionEditMode ? (
                  <label className="field-definition-editor-field field-definition-editor-field-id">
                    項目 ID
                    <input
                      type="text"
                      value={selected.key}
                      readOnly={!isItemIdEditable(selected)}
                      onChange={(e) =>
                        updateItemId(safeSelectedIndex, e.target.value)
                      }
                    />
                    <span className="field-definition-editor-field-hint">
                      保存済みの項目 ID は変えられません。名前を変えてもキーは変わりません。
                    </span>
                  </label>
                ) : (
                  <p className="field-definition-editor-key-line">
                    <span className="field-definition-editor-field-label">キー</span>
                    {selected.key}
                    <span className="field-definition-editor-field-hint">
                      名前を変えても変わりません。
                    </span>
                  </p>
                )}
              </aside>
            ) : (
              <p className="muted field-definition-editor-detail-empty">
                項目を足すと、ここに意味と指示が出ます。
              </p>
            )}
          </div>
        </div>
      </div>
      {statusLine ? (
        <p
          className="field-definition-editor-status"
          role={statusLine === requiredSaveBlock ? "alert" : "status"}
        >
          {statusLine}
        </p>
      ) : null}
      <footer
        className={
          extensionFooter
            ? "status-catalog-editor-footer"
            : "field-definition-editor-footer"
        }
      >
        <div className="settings-actions">
          <button
            type="button"
            className="toolbar-btn"
            disabled={extensionFooter?.busy}
            onClick={addItem}
          >
            項目を足す
          </button>
          {extensionFooter ? (
            <>
              <button
                type="button"
                className="toolbar-btn toolbar-btn-primary"
                disabled={extensionFooter.saveDisabled}
                onClick={() => extensionFooter.onSave()}
              >
                保存
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={extensionFooter.revertDisabled}
                onClick={() => extensionFooter.onRevert()}
              >
                編集を戻す
              </button>
              <button
                type="button"
                className="toolbar-btn"
                disabled={extensionFooter.exportDisabled}
                onClick={() => extensionFooter.onExport()}
              >
                JSON を書き出す
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

export { removeFieldDefinitionDraft };
