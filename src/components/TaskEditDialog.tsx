import { StatusOptions } from "./StatusOptions";
import {
  COLOR_NONE_VALUE,
  colorSelectOptionsForTask,
} from "./ColorOptions";
import { ColorSelectField } from "./ColorSelectField";
import type { ResolvedColorScheme } from "../model/palette";
import { defaultStatusId, type StatusItem } from "../model/statusCatalog";
import type { ColorItem } from "../model/colorCatalog";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TaskRef } from "../model/dependencies";
import { AssigneeListField } from "./AssigneeListField";
import type { Member } from "../model/memberTypes";
import type { MemberId } from "../model/memberTypes";
import { validateTaskEdit } from "../model/tasks";
import { MilestoneField } from "./MilestoneField";
import { DateInput } from "./DateInput";
import { ModalDialog } from "./ModalDialog";
import {
  type Milestone,
  type ScheduleId,
  type Task,
  type TaskConfidence,
  type TaskStatus,
} from "../model/types";

type TaskEditDialogProps = {
  mode?: "edit" | "duplicate";
  task: Task;
  members: Member[];
  memberCatalog: Map<MemberId, Member> | null;
  tasks: TaskRef[];
  milestones: Milestone[];
  successorIds: ScheduleId[];
  /** 候補から除く ID。複製では元タスクも候補に残すため null。 */
  excludeTaskId?: ScheduleId | null;
  statuses: readonly StatusItem[];
  colors?: readonly ColorItem[] | null;
  colorScheme: ResolvedColorScheme;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    start: string;
    end: string;
    assigneeIds: MemberId[];
    status: TaskStatus;
    progress: number;
    confidence: TaskConfidence;
    predecessors: ScheduleId[];
    successors: ScheduleId[];
    milestoneId: ScheduleId | null;
    note: string;
    colorId?: string | null;
  }) => string | null;
};

export function taskRelationLabel(
  tasks: TaskRef[],
  id: ScheduleId,
): { title: string; ancestors: string | null; leaf: string } {
  const found = tasks.find((task) => task.id === id);
  if (!found) {
    const title = `ID ${id}`;
    return { title, ancestors: null, leaf: title };
  }
  return {
    title: `${found.category} / ${found.group} / ${found.name}`,
    ancestors: `${found.category} / ${found.group}`,
    leaf: found.name,
  };
}

export function TaskEditDialog({
  mode = "edit",
  task,
  members,
  memberCatalog,
  tasks,
  milestones,
  successorIds,
  excludeTaskId,
  statuses,
  colors = null,
  colorScheme,
  onClose,
  onSave,
}: TaskEditDialogProps) {
  const [name, setName] = useState(task.name);
  const [start, setStart] = useState(task.start);
  const [end, setEnd] = useState(task.end);
  const [assigneeIds, setAssigneeIds] = useState<MemberId[]>(() => [
    ...task.assigneeIds,
  ]);
  const [status, setStatus] = useState<TaskStatus>(() =>
    mode === "duplicate" ? defaultStatusId(statuses) : task.status,
  );
  const [colorId, setColorId] = useState<string | null>(() =>
    task.colorId ?? null,
  );
  const [progress, setProgress] = useState(() =>
    mode === "duplicate" ? 0 : task.progress,
  );
  const [confidence, setConfidence] = useState<TaskConfidence>(task.confidence);
  const [predecessors, setPredecessors] = useState<ScheduleId[]>(() =>
    mode === "duplicate" ? [] : task.predecessors,
  );
  const [successors, setSuccessors] = useState<ScheduleId[]>(() =>
    mode === "duplicate" ? [] : successorIds,
  );
  const [milestoneId, setMilestoneId] = useState<ScheduleId | null>(
    task.milestoneId,
  );
  const [note, setNote] = useState(task.note ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const omittedId = excludeTaskId === undefined ? task.id : excludeTaskId;

  useEffect(() => {
    if (mode !== "duplicate") return;
    const frame = requestAnimationFrame(() => {
      const input = nameRef.current;
      if (!input) return;
      input.focus();
      input.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  const candidates = useMemo(
    () => tasks.filter((item) => item.id !== omittedId),
    [omittedId, tasks],
  );

  return (
    <ModalDialog
      title={mode === "duplicate" ? "タスクを複製" : "タスク編集"}
      onClose={onClose}
      className="modal editor"
    >
        <div className="field">
          <label htmlFor="fieldName">タスク名</label>
          <input
            ref={nameRef}
            id="fieldName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldNote">ノート</label>
          <textarea
            id="fieldNote"
            className="note-textarea"
            rows={4}
            value={note}
            placeholder="補足説明（任意）"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldStart">開始日</label>
          <DateInput
            id="fieldStart"
            value={start}
            onChange={setStart}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldEnd">終了日（この日を含む）</label>
          <DateInput
            id="fieldEnd"
            value={end}
            onChange={setEnd}
          />
        </div>
        <div className="field">
          <span className="field-label" id="fieldAssigneeLabel">
            担当者
          </span>
          <AssigneeListField
            idPrefix="field"
            assigneeIds={assigneeIds}
            members={members}
            memberCatalog={memberCatalog}
            onChange={setAssigneeIds}
          />
        </div>
        <div className="field">
          <label htmlFor="fieldStatus">ステータス</label>
          <select
            id="fieldStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            <StatusOptions statuses={statuses} current={status} />
          </select>
        </div>
        {colors != null ? (
          <div className="field">
            <label htmlFor="fieldColor">色</label>
            <ColorSelectField
              id="fieldColor"
              value={colorId ?? COLOR_NONE_VALUE}
              options={colorSelectOptionsForTask(colors, colorId, colorScheme)}
              onChange={(next) =>
                setColorId(
                  next === COLOR_NONE_VALUE ? null : next,
                )
              }
            />
          </div>
        ) : null}
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
          <label htmlFor="fieldConfidence">確度</label>
          <select
            id="fieldConfidence"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as TaskConfidence)}
          >
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fieldMilestone">対応マイルストン</label>
          <MilestoneField
            id="fieldMilestone"
            milestones={milestones}
            value={milestoneId}
            onChange={setMilestoneId}
          />
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
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
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
                assigneeIds: [...assigneeIds],
                status,
                progress: roundedProgress,
                confidence,
                predecessors,
                successors,
                milestoneId,
                note,
                ...(colors != null ? { colorId } : {}),
              });
              if (saveError) {
                setFormError(saveError);
                return;
              }
              setFormError(null);
              onClose();
            }}
          >
            {mode === "duplicate" ? "追加" : "保存"}
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

export function RelationField({
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
          {selected.map((id) => {
            const label = taskRelationLabel(tasks, id);
            return (
              <li key={id}>
                <span className="relation-label" title={label.title}>
                  {label.ancestors ? (
                    <span className="relation-ancestors">{label.ancestors}</span>
                  ) : null}
                  <span className="relation-leaf">{label.leaf}</span>
                </span>
                <button type="button" onClick={() => onRemove(id)}>
                  外す
                </button>
              </li>
            );
          })}
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
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              const item = shown[active];
              if (item) add(item.id);
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
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
