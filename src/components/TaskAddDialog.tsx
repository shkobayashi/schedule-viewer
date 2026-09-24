import { useState } from "react";
import { addDays, isoDate, parseDate } from "../model/dates";
import { validateNewTask } from "../model/tasks";
import type { Category } from "../model/types";

type TaskAddDialogProps = {
  categories: Category[];
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
  }) => void;
};

export function TaskAddDialog({
  categories,
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
  const [error, setError] = useState<string | null>(null);
  const groups =
    categories.find((category) => category.name === categoryName)?.groups ??
    [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>タスク追加</h2>
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
        <div className="field">
          <label htmlFor="addTaskName">タスク名</label>
          <input
            id="addTaskName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <label htmlFor="addTaskEnd">終了日</label>
          <input
            id="addTaskEnd"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
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
            }}
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
