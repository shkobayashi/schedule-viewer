import { useEffect, useMemo, useRef, useState } from "react";
import type { TaskRef } from "../model/dependencies";
import type { ScheduleId } from "../model/types";
import { ModalDialog } from "./ModalDialog";
import { taskRelationLabel } from "./TaskEditDialog";

const RELATION_CANDIDATE_LIMIT = 50;

function matchesQuery(item: TaskRef, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return (
    item.name.includes(q) ||
    item.category.includes(q) ||
    item.group.includes(q)
  );
}

type AddConnectionDialogProps = {
  anchorTaskId: ScheduleId;
  anchorTaskName: string;
  candidates: TaskRef[];
  tasks: TaskRef[];
  onConfirm: (otherTaskId: ScheduleId, label: string) => string | null;
  onClose: () => void;
};

export function AddConnectionDialog({
  anchorTaskId,
  anchorTaskName,
  candidates,
  tasks,
  onConfirm,
  onClose,
}: AddConnectionDialogProps) {
  const [otherTaskId, setOtherTaskId] = useState<ScheduleId | null>(null);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const announceFormError = (message: string) => {
    if (formErrorRef.current === message) {
      setFormError(null);
      queueMicrotask(() => setFormError(message));
      return;
    }
    setFormError(message);
  };
  const searchId = "addConnectionOther";
  const listId = `${searchId}-list`;

  const filtered = useMemo(
    () => candidates.filter((item) => matchesQuery(item, query)),
    [candidates, query],
  );
  const shown = filtered.slice(0, RELATION_CANDIDATE_LIMIT);
  const truncated = filtered.length > RELATION_CANDIDATE_LIMIT;

  useEffect(() => {
    formErrorRef.current = formError;
  }, [formError]);

  const pickOther = (id: ScheduleId) => {
    setOtherTaskId(id);
    setQuery("");
    setListOpen(false);
    setFormError(null);
  };

  const tryConfirm = () => {
    if (otherTaskId == null) {
      announceFormError("相手のタスクを選んでください。");
      return;
    }
    if (!tasks.some((task) => task.id === otherTaskId)) {
      setOtherTaskId(null);
      announceFormError("相手のタスクが見つかりません。");
      return;
    }
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      announceFormError("繋がりの言葉を入力してください。");
      return;
    }
    const error = onConfirm(otherTaskId, trimmed);
    if (error) {
      announceFormError(error);
      return;
    }
    onClose();
  };

  const selectedLabel =
    otherTaskId != null ? taskRelationLabel(tasks, otherTaskId) : null;

  return (
    <ModalDialog title="繋がりを足す" onClose={onClose} initialFocusRef={labelRef}>
      <p className="connection-add-anchor">
        このタスク: {anchorTaskName}
      </p>
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor={searchId}>相手タスク</label>
        {otherTaskId != null && selectedLabel ? (
          <div className="connection-add-selected">
            <span className="relation-label" title={selectedLabel.title}>
              {selectedLabel.ancestors ? (
                <span className="relation-ancestors">
                  {selectedLabel.ancestors}
                </span>
              ) : null}
              <span className="relation-leaf">{selectedLabel.leaf}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setOtherTaskId(null);
                setFormError(null);
              }}
            >
              選び直す
            </button>
          </div>
        ) : null}
        <div className="relation-combo">
          <input
            id={searchId}
            type="text"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder="名前の一部で検索して追加"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onBlur={() => setListOpen(false)}
            onKeyDown={(e) => {
              const composing =
                e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
              if (e.key === "ArrowDown") {
                if (composing) return;
                e.preventDefault();
                setListOpen(true);
                setActive((prev) =>
                  Math.min(prev + 1, Math.max(shown.length - 1, 0)),
                );
              } else if (e.key === "ArrowUp") {
                if (composing) return;
                e.preventDefault();
                setActive((prev) => Math.max(prev - 1, 0));
              } else if (e.key === "Enter") {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                e.preventDefault();
                const item = shown[active];
                if (item && item.id !== anchorTaskId) pickOther(item.id);
              } else if (e.key === "Escape" && listOpen) {
                e.preventDefault();
                e.stopPropagation();
                setListOpen(false);
              }
            }}
          />
          {listOpen ? (
            <ul id={listId} className="relation-options" role="listbox">
              {shown.length > 0 ? (
                shown.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      className={index === active ? "active" : undefined}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => pickOther(item.id)}
                    >
                      {item.category} / {item.group} / {item.name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="relation-none">一致するタスクがありません</li>
              )}
              {truncated ? (
                <li className="relation-none">さらに絞り込んでください</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="field">
        <label htmlFor="addConnectionLabel">繋がりの言葉</label>
        <input
          ref={labelRef}
          id="addConnectionLabel"
          type="text"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setFormError(null);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Enter") {
              e.preventDefault();
              tryConfirm();
            }
          }}
        />
      </div>
      <div className="modal-actions">
        <button type="button" onClick={tryConfirm}>
          足す
        </button>
        <button type="button" className="toolbar-btn" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </ModalDialog>
  );
}
