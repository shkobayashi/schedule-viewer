import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, isoDate, parseDate } from "../model/dates";
import { validateNewTask } from "../model/tasks";
import { ModalDialog } from "./ModalDialog";
import type { Category, ScheduleId } from "../model/types";

type TaskAddDialogProps = {
  categories: Category[];
  parentBranches?: { id: ScheduleId; name: string }[];
  initialParentBranchId?: ScheduleId | null;
  initialCategory: string;
  initialGroup: string;
  initialStart: string;
  initialEnd: string;
  onClose: () => void;
  onSave: (input: {
    name: string;
    start: string;
    end: string;
    category: string;
    group: string;
    parentBranchId?: ScheduleId;
  }) => void;
};

export function TaskAddDialog({
  categories,
  parentBranches,
  initialParentBranchId,
  initialCategory,
  initialGroup,
  initialStart,
  initialEnd,
  onClose,
  onSave,
}: TaskAddDialogProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(
    initialEnd > initialStart
      ? initialEnd
      : isoDate(addDays(parseDate(initialStart), 1)),
  );
  const [categoryName, setCategoryName] = useState(initialCategory);
  const [groupName, setGroupName] = useState(initialGroup);
  const [parentBranchId, setParentBranchId] = useState(
    initialParentBranchId ?? parentBranches?.[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const groups =
    categories.find((category) => category.name === categoryName)?.groups ??
    [];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      nameRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const trySave = useCallback(() => {
    if (parentBranches != null && parentBranches.length > 0) {
      if (!name.trim()) {
        setError("タスク名を入力してください");
        return;
      }
      if (!parentBranchId) {
        setError("追加先を選んでください");
        return;
      }
      onSave({
        name: name.trim(),
        start,
        end,
        category: categoryName,
        group: groupName,
        parentBranchId,
      });
      return;
    }
    const message = validateNewTask(
      { name, start, end, category: categoryName, group: groupName },
      categories,
    );
    if (message) {
      setError(message);
      return;
    }
    onSave({
      name: name.trim(),
      start,
      end,
      category: categoryName,
      group: groupName,
    });
  }, [
    categories,
    categoryName,
    end,
    groupName,
    name,
    onSave,
    parentBranchId,
    parentBranches,
    start,
  ]);

  return (
    <ModalDialog title="タスク追加" onClose={onClose}>
        {parentBranches != null && parentBranches.length > 0 ? (
          <div className="field">
            <label htmlFor="addTaskParent">追加先</label>
            <select
              id="addTaskParent"
              value={parentBranchId}
              onChange={(e) => setParentBranchId(e.target.value)}
            >
              {parentBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {parentBranches == null || parentBranches.length === 0 ? (
          <>
            <div className="field">
              <label htmlFor="addTaskCategory">カテゴリ</label>
              <select
                id="addTaskCategory"
                value={categoryName}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  const nextGroups =
                    categories.find((category) => category.name === nextCategory)
                      ?.groups ?? [];
                  setCategoryName(nextCategory);
                  setGroupName(nextGroups[0]?.name ?? "");
                }}
              >
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="addTaskGroup">グループ</label>
              <select
                id="addTaskGroup"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              >
                {groups.map((group) => (
                  <option key={group.name} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
        <div className="field">
          <label htmlFor="addTaskName">タスク名</label>
          <input
            ref={nameRef}
            id="addTaskName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.shiftKey
              ) {
                return;
              }
              if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
                return;
              }
              event.preventDefault();
              trySave();
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="addTaskStart">開始日</label>
          <input
            id="addTaskStart"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="addTaskEnd">終了日（この日を含む）</label>
          <input
            id="addTaskEnd"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="btn primary" onClick={trySave}>
            追加
          </button>
        </div>
    </ModalDialog>
  );
}
