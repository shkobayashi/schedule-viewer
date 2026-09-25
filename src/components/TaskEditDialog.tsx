import { useMemo, useState } from "react";
import type { TaskRef } from "../model/dependencies";
import {
  duplicateMemberNames,
  formatUnknownAssigneeOption,
  isUnknownAssignee,
  memberOptionLabel,
} from "../model/assigneeDisplay";
import type { Member } from "../model/memberTypes";
import type { MemberId } from "../model/memberTypes";
import { validateTaskEdit } from "../model/tasks";
import { ModalDialog } from "./ModalDialog";
import {
  UNASSIGNED_LABEL,
  type Milestone,
  type ScheduleId,
  type Task,
  type TaskStatus,
} from "../model/types";

type TaskEditDialogProps = {
  task: Task;
  members: Member[];
  memberCatalog: Map<MemberId, Member> | null;
  tasks: TaskRef[];
  milestones: Milestone[];
  successorIds: ScheduleId[];
  onClose: () => void;
  onSave: (patch: {
    name: string;
    start: string;
    end: string;
    assigneeId: MemberId | null;
    status: TaskStatus;
    progress: number;
    predecessors: ScheduleId[];
    successors: ScheduleId[];
    milestoneId: ScheduleId | null;
  }) => string | null;
};

function taskLabel(tasks: TaskRef[], id: ScheduleId): string {
  const found = tasks.find((task) => task.id === id);
  return found
    ? `${found.category} / ${found.group} / ${found.name}`
    : `ID ${id}`;
}

export function TaskEditDialog({
  task,
  members,
  memberCatalog,
  tasks,
  milestones,
  successorIds,
  onClose,
  onSave,
}: TaskEditDialogProps) {
  const [name, setName] = useState(task.name);
  const [start, setStart] = useState(task.start);
  const [end, setEnd] = useState(task.end);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [progress, setProgress] = useState(task.progress);
  const [predecessors, setPredecessors] = useState<ScheduleId[]>(
    task.predecessors,
  );
  const [successors, setSuccessors] = useState<ScheduleId[]>(successorIds);
  const [milestoneId, setMilestoneId] = useState<ScheduleId | null>(
    task.milestoneId,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const candidates = useMemo(
    () => tasks.filter((item) => item.id !== task.id),
    [task.id, tasks],
  );

  const duplicateNames = useMemo(
    () => duplicateMemberNames(members),
    [members],
  );
  const showUnknownOption = isUnknownAssignee(task.assigneeId, memberCatalog);

  return (
    <ModalDialog title="タスク編集" onClose={onClose} className="modal editor">
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
          <label htmlFor="fieldEnd">終了日（この日を含む）</label>
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
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">{UNASSIGNED_LABEL}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {memberOptionLabel(member, duplicateNames)}
              </option>
            ))}
            {showUnknownOption && task.assigneeId ? (
              <option value={task.assigneeId}>
                {formatUnknownAssigneeOption(task.assigneeId)}
              </option>
            ) : null}
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
        <div className="field">
          <label htmlFor="fieldMilestone">対応マイルストン</label>
          <select
            id="fieldMilestone"
            value={
              milestoneId != null &&
              milestones.some((milestone) => milestone.id === milestoneId)
                ? String(milestoneId)
                : ""
            }
            onChange={(e) =>
              setMilestoneId(e.target.value === "" ? null : e.target.value)
            }
          >
            <option value="">なし</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}（{milestone.date}）
              </option>
            ))}
          </select>
        </div>
        <RelationField
          key={`pred-${task.id}`}
          label="先行タスク"
          selected={predecessors}
          candidates={candidates.filter(
            (item) =>
              !predecessors.includes(item.id) && !successors.includes(item.id),
          )}
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
          candidates={candidates.filter(
            (item) =>
              !successors.includes(item.id) && !predecessors.includes(item.id),
          )}
          tasks={tasks}
          onAdd={(id) =>
            setSuccessors((prev) => (prev.includes(id) ? prev : [...prev, id]))
          }
          onRemove={(id) =>
            setSuccessors((prev) => prev.filter((item) => item !== id))
          }
        />
        {formError ? <p className="form-error">{formError}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const roundedProgress = Math.round(progress);
              const err = validateTaskEdit({
                name,
                start,
                end,
                progress: roundedProgress,
              });
              if (err) {
                setFormError(err);
                return;
              }
              const saveError = onSave({
                name,
                start,
                end,
                assigneeId: assigneeId === "" ? null : assigneeId,
                status,
                progress: roundedProgress,
                predecessors,
                successors,
                milestoneId,
              });
              if (saveError) {
                setFormError(saveError);
                return;
              }
              setFormError(null);
              onClose();
            }}
          >
            保存
          </button>
        </div>
    </ModalDialog>
  );
}

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

function RelationField({
  label,
  selected,
  candidates,
  tasks,
  onAdd,
  onRemove,
}: {
  label: string;
  selected: ScheduleId[];
  candidates: TaskRef[];
  tasks: TaskRef[];
  onAdd: (id: ScheduleId) => void;
  onRemove: (id: ScheduleId) => void;
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
  const shown = filtered.slice(0, RELATION_CANDIDATE_LIMIT);
  const truncated = filtered.length > RELATION_CANDIDATE_LIMIT;

  const add = (id: ScheduleId) => {
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
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((prev) =>
                Math.min(prev + 1, Math.max(shown.length - 1, 0)),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = shown[active];
              if (item) add(item.id);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open ? (
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
                    onClick={() => add(item.id)}
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
  );
}
