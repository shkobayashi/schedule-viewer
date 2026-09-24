import { useEffect, useState } from "react";
import type { Task, TaskStatus } from "../model/types";

type TaskEditDialogProps = {
  task: Task | null;
  assignees: string[];
  onClose: () => void;
  onSave: (patch: {
    name: string;
    start: string;
    end: string;
    assignee: string;
    status: TaskStatus;
    progress: number;
  }) => boolean;
};

export function TaskEditDialog({
  task,
  assignees,
  onClose,
  onSave,
}: TaskEditDialogProps) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not-started");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setStart(task.start);
    setEnd(task.end);
    setAssignee(task.assignee);
    setStatus(task.status);
    setProgress(task.progress);
  }, [task]);

  if (!task) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
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
