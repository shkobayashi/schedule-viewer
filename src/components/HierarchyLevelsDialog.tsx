import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  HIERARCHY_DIALOG_SAVE_MISMATCH_MESSAGE,
  isLevelDraftComplete,
  levelEditorMismatchAlertVisible,
  MAX_LEVEL_COUNT,
  MIN_LEVEL_COUNT,
  normalizeLevelDraft,
  reorderLevelDraft,
} from "../model/hierarchyLevelEdit";
import type { ScheduleLevelDef } from "../model/types";
import type { DocumentSnapshot } from "../model/history";
import { ModalDialog } from "./ModalDialog";
import { UiButton } from "./ui/UiButton";

const MEANING_HINT =
  "この段に何を置くかだけを書く。隣の段にも置けそうなときだけ、分かれ目を一文足す。";
const INSTRUCTION_HINT =
  "空でよい。この段に置いたあとに守ることだけを書く。";

type HierarchyLevelsDialogProps = {
  open: boolean;
  initialLevels: ScheduleLevelDef[];
  hadDocumentLevels: boolean;
  snapshot: DocumentSnapshot;
  onClose: () => void;
  onCommit: (levels: ScheduleLevelDef[]) => void;
};

export function HierarchyLevelsDialog({
  open,
  initialLevels,
  hadDocumentLevels,
  snapshot,
  onClose,
  onCommit,
}: HierarchyLevelsDialogProps) {
  const listId = useId();
  const meaningHintId = useId();
  const instructionHintId = useId();
  const firstNameRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ScheduleLevelDef[]>(initialLevels);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(initialLevels.map((level) => ({ ...level })));
    }
    wasOpenRef.current = open;
  }, [initialLevels, open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => firstNameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const canClose = useMemo(() => isLevelDraftComplete(draft), [draft]);
  const mismatchAlert = useMemo(
    () => levelEditorMismatchAlertVisible(draft, snapshot, hadDocumentLevels),
    [draft, hadDocumentLevels, snapshot],
  );

  if (!open) return null;

  const updateLevel = (
    index: number,
    patch: Partial<ScheduleLevelDef>,
  ) => {
    setDraft((prev) =>
      prev.map((level, i) => (i === index ? { ...level, ...patch } : level)),
    );
  };

  const removeLevel = (index: number) => {
    if (draft.length <= MIN_LEVEL_COUNT) return;
    if (index === draft.length - 1) return;
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const moveLevel = (index: number, direction: -1 | 1) => {
    const next = reorderLevelDraft(draft, index, direction);
    if (next) setDraft(next);
  };

  const addLevel = () => {
    if (draft.length >= MAX_LEVEL_COUNT) return;
    const insertAt = Math.max(0, draft.length - 1);
    const next = [...draft];
    next.splice(insertAt, 0, { name: "", meaning: "" });
    setDraft(next);
  };

  const handleCloseCommit = () => {
    if (!canClose) return;
    onCommit(normalizeLevelDraft(draft));
    onClose();
  };

  const focusLevelField = (
    rowIndex: number,
    field: "name" | "meaning" | "instruction",
  ) => {
    const suffix =
      field === "name" ? "name" : field === "meaning" ? "meaning" : "instruction";
    document.getElementById(`${listId}-${suffix}-${rowIndex}`)?.focus();
  };

  const fieldFromInputId = (id: string): "name" | "meaning" | "instruction" => {
    if (id.includes("-meaning-")) return "meaning";
    if (id.includes("-instruction-")) return "instruction";
    return "name";
  };

  const onLevelFieldKeyDown = (
    rowIndex: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }
    const field = fieldFromInputId(event.currentTarget.id);
    if (event.key === "ArrowDown" && rowIndex < draft.length - 1) {
      event.preventDefault();
      focusLevelField(rowIndex + 1, field);
    }
    if (event.key === "ArrowUp" && rowIndex > 0) {
      event.preventDefault();
      focusLevelField(rowIndex - 1, field);
    }
  };

  const atMaxLevels = draft.length >= MAX_LEVEL_COUNT;
  const showHeadingActions = draft.length > 1;
  const lastHeadingIndex = draft.length - 2;

  return (
    <ModalDialog
      title="階層"
      className="ui-dialog-panel--hierarchy hierarchy-levels-dialog"
      initialFocusRef={firstNameRef}
      onClose={onClose}
    >
      <div className="ui-dialog-body hierarchy-levels-dialog-body">
      <div className="hierarchy-levels-body">
        <div className="hierarchy-levels-list-pane">
          <p className="hierarchy-levels-hints">
            <span>
              <strong>意味</strong>
              {MEANING_HINT}
            </span>
            <span>
              <strong>指示</strong>
              {INSTRUCTION_HINT}
            </span>
          </p>
          <div
            id={listId}
            className="hierarchy-levels-scroll"
            role="list"
            aria-label="階層の段"
          >
            {draft.map((level, index) => {
              const isTaskRow = index === draft.length - 1;
              const nameId = `${listId}-name-${index}`;
              const meaningId = `${listId}-meaning-${index}`;
              const instructionId = `${listId}-instruction-${index}`;
              const canMoveUp =
                showHeadingActions && !isTaskRow && index > 0;
              const canMoveDown =
                showHeadingActions &&
                !isTaskRow &&
                index < lastHeadingIndex;
              return (
                <div
                  key={index}
                  className="hierarchy-levels-row"
                  role="listitem"
                >
                  <span className="hierarchy-levels-index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="hierarchy-levels-fields">
                    <div className="hierarchy-levels-field">
                      <label htmlFor={nameId}>名前</label>
                      <input
                        ref={index === 0 ? firstNameRef : undefined}
                        id={nameId}
                        type="text"
                        className="hierarchy-levels-input"
                        value={level.name}
                        onChange={(event) =>
                          updateLevel(index, { name: event.target.value })
                        }
                        onKeyDown={(event) => onLevelFieldKeyDown(index, event)}
                      />
                    </div>
                    <div className="hierarchy-levels-field">
                      <label htmlFor={meaningId}>意味</label>
                      <input
                        id={meaningId}
                        type="text"
                        className="hierarchy-levels-input"
                        value={level.meaning}
                        aria-describedby={meaningHintId}
                        onChange={(event) =>
                          updateLevel(index, { meaning: event.target.value })
                        }
                        onKeyDown={(event) => onLevelFieldKeyDown(index, event)}
                      />
                    </div>
                    <div className="hierarchy-levels-field">
                      <label htmlFor={instructionId}>指示</label>
                      <input
                        id={instructionId}
                        type="text"
                        className="hierarchy-levels-input"
                        value={level.instruction ?? ""}
                        aria-describedby={instructionHintId}
                        onChange={(event) =>
                          updateLevel(index, {
                            instruction: event.target.value,
                          })
                        }
                        onKeyDown={(event) => onLevelFieldKeyDown(index, event)}
                      />
                    </div>
                  </div>
                  <div className="hierarchy-levels-actions">
                    {isTaskRow ? (
                      <span className="hierarchy-levels-task-badge">タスク</span>
                    ) : showHeadingActions ? (
                      <>
                        <button
                          type="button"
                          className="toolbar-btn hierarchy-levels-move"
                          disabled={!canMoveUp}
                          aria-label="この段を上へ"
                          onClick={() => moveLevel(index, -1)}
                        >
                          上へ
                        </button>
                        <button
                          type="button"
                          className="toolbar-btn hierarchy-levels-move"
                          disabled={!canMoveDown}
                          aria-label="この段を下へ"
                          onClick={() => moveLevel(index, 1)}
                        >
                          下へ
                        </button>
                        <button
                          type="button"
                          className="toolbar-btn toolbar-btn-danger hierarchy-levels-remove"
                          aria-label="この段を削除"
                          onClick={() => removeLevel(index)}
                        >
                          削除
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="visually-hidden" id={meaningHintId}>
            {MEANING_HINT}
          </p>
          <p className="visually-hidden" id={instructionHintId}>
            {INSTRUCTION_HINT}
          </p>
        </div>
        {mismatchAlert ? (
          <p className="hierarchy-levels-alert" role="alert">
            {HIERARCHY_DIALOG_SAVE_MISMATCH_MESSAGE}
          </p>
        ) : null}
      </div>
      <div className="hierarchy-levels-footer">
        <button
          type="button"
          className="toolbar-btn hierarchy-levels-add"
          disabled={atMaxLevels}
          aria-label={
            atMaxLevels ? "段を追加、段は5つまでです" : "段を追加"
          }
          onClick={addLevel}
        >
          段を追加
        </button>
        <UiButton
          variant="primary"
          disabled={!canClose}
          onClick={handleCloseCommit}
        >
          適用
        </UiButton>
      </div>
      </div>
    </ModalDialog>
  );
}
