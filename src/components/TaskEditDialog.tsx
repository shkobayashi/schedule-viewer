import { useEffect, useMemo, useState } from "react";
import type { TaskRef } from "../model/dependencies";
import { isUnassigned, UNASSIGNED_LABEL, type Task, type TaskStatus } from "../model/types";

type TaskEditDialogProps = {
  task: Task | null;
  assignees: string[];
  tasks: TaskRef[];
  successorIds: number[];
  onClose: () => void;
  onSave: (patch: {
    name: string;
    start: string;
    end: string;
    assignee: string;
    status: TaskStatus;
    progress: number;
    predecessors: number[];
    successors: number[];
  }) => boolean;
};

function taskLabel(tasks: TaskRef[], id: number): string {
  const found = tasks.find((task) => task.id === id);
  return found ? `${found.category} / ${found.name}` : `ID ${id}`;
}

export function TaskEditDialog({
  task,
  assignees,
  tasks,
  successorIds,
  onClose,
  onSave,
}: TaskEditDialogProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not-started");
  const [progress, setProgress] = useState(0);
  const [predecessors, setPredecessors] = useState<number[]>([]);
  const [successors, setSuccessors] = useState<number[]>([]);

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setStart(task.start);
    setEnd(task.end);
    setAssignee(isUnassigned(task.assignee) ? "" : task.assignee);
    setStatus(task.status);
    setProgress(task.progress);
    setPredecessors(task.predecessors);
    setSuccessors(successorIds);
  }, [successorIds, task]);

  const candidates = useMemo(
    () => tasks.filter((item) => item.id !== task?.id),
    [task?.id, tasks],
  );

  if (!task) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal editor">
        <h2>タスク編集</h2>
        <div className="field">
          <label htmlFor="fieldName">タスク名</label>
          <input
            id="fieldName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldStart">開始日</label>
          <input
            id="fieldStart"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldEnd">終了日</label>
          <input
            id="fieldEnd"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldAssignee">担当者</label>
          <select
            id="fieldAssignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">{UNASSIGNED_LABEL}</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fieldStatus">ステータス</label>
          <select
            id="fieldStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <option value="not-started">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="done">完了</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fieldProgress">進捗率 (%)</label>
          <input
            id="fieldProgress"
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value) || 0)}
          />
        </div>
        <RelationField
          key={`pred-${task.id}`}
          label="先行タスク"
          selected={predecessors}
          candidates={candidates.filter((item) => !predecessors.includes(item.id))}
          tasks={tasks}
          onAdd={(id) =>
            setPredecessors((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
          onRemove={(id) =>
            setPredecessors((prev) => prev.filter((item) => item !== id))
          }
        />
        <RelationField
          key={`succ-${task.id}`}
          label="後続タスク"
          selected={successors}
          candidates={candidates.filter((item) => !successors.includes(item.id))}
          tasks={tasks}
          onAdd={(id) =>
            setSuccessors((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
          onRemove={(id) =>
            setSuccessors((prev) => prev.filter((item) => item !== id))
          }
        />
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (end < start) {
                window.alert("終了日は開始日以降にしてください");
                return;
              }
              onSave({
                name,
                start,
                end,
                assignee,
                status,
                progress,
                predecessors,
                successors,
              });
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function matchesQuery(item: TaskRef, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return item.name.includes(q) || item.category.includes(q);
}

function RelationField({
  label,
  selected,
  candidates,
  tasks,
  onAdd,
  onRemove,
}: {
  label: string;
  selected: number[];
  candidates: TaskRef[];
  tasks: TaskRef[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const inputId = label === "先行タスク" ? "fieldPredecessors" : "fieldSuccessors";
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const filtered = useMemo(
    () => candidates.filter((item) => matchesQuery(item, query)),
    [candidates, query],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  const add = (id: number) => {
    onAdd(id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {selected.length > 0 ? (
        <ul className="relation-list">
          {selected.map((id) => (
            <li key={id}>
              <span>{taskLabel(tasks, id)}</span>
              <button type="button" onClick={() => onRemove(id)}>
                外す
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="relation-empty">なし</p>
      )}
      <div className="relation-combo">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="名前の一部で検索して追加"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((prev) =>
                Math.min(prev + 1, Math.max(filtered.length - 1, 0)),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = filtered[active];
              if (item) add(item.id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open ? (
          <ul id={listId} className="relation-options" role="listbox">
            {filtered.length > 0 ? (
              filtered.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "active" : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => add(item.id)}
                  >
                    {item.category} / {item.name}
                  </button>
                </li>
              ))
            ) : (
              <li className="relation-none">一致するタスクがありません</li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
