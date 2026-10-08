import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type Ref,
} from "react";
import type { TaskRef } from "../model/dependencies";
import {
  duplicateMemberNames,
  formatUnknownAssigneeOption,
  isUnknownAssignee,
  memberOptionLabel,
} from "../model/assigneeDisplay";
import { daysBetween, parseDate } from "../model/dates";
import type { Member } from "../model/memberTypes";
import type { MemberId } from "../model/memberTypes";
import type { TaskEditPatch } from "../model/tasks";
import { validateTaskEdit } from "../model/tasks";
import {
  UNASSIGNED_LABEL,
  type Milestone,
  type ScheduleId,
  type Task,
  type TaskConfidence,
  type TaskStatus,
} from "../model/types";
import { RelationField } from "./TaskEditDialog";

export type TaskDetailPanelHandle = {
  focusName: () => void;
};

type TaskDetailPanelProps = {
  task: Task;
  members: Member[];
  memberCatalog: Map<MemberId, Member> | null;
  tasks: TaskRef[];
  milestones: Milestone[];
  successorIds: ScheduleId[];
  onPatch: (patch: TaskEditPatch) => string | null;
  documentTags: string[];
  onAddTag: (tag: string) => string | null;
  onRemoveTag: (tag: string) => void;
  onEditingChange: (editing: boolean) => void;
  panelRef?: Ref<TaskDetailPanelHandle>;
};

export function TaskDetailPanel({
  task,
  members,
  memberCatalog,
  tasks,
  milestones,
  successorIds,
  onPatch,
  documentTags,
  onAddTag,
  onRemoveTag,
  onEditingChange,
  panelRef,
}: TaskDetailPanelProps) {
  const [name, setName] = useState(task.name);
  const [note, setNote] = useState(task.note ?? "");
  const [start, setStart] = useState(task.start);
  const [end, setEnd] = useState(task.end);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [progress, setProgress] = useState(task.progress);
  const [confidence, setConfidence] = useState<TaskConfidence>(task.confidence);
  const [predecessors, setPredecessors] = useState<ScheduleId[]>(
    task.predecessors,
  );
  const [successors, setSuccessors] = useState<ScheduleId[]>(successorIds);
  const [milestoneId, setMilestoneId] = useState<ScheduleId | null>(
    task.milestoneId,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagStatus, setTagStatus] = useState<string | null>(null);
  const tagStatusRef = useRef<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  const announceTagStatus = useCallback((message: string) => {
    if (tagStatusRef.current === message) {
      setTagStatus(null);
      queueMicrotask(() => setTagStatus(message));
      return;
    }
    setTagStatus(message);
  }, []);

  useEffect(() => {
    tagStatusRef.current = tagStatus;
  }, [tagStatus]);

  useEffect(
    () => () => {
      onEditingChange(false);
    },
    [onEditingChange],
  );

  useEffect(() => {
    setName(task.name);
    setNote(task.note ?? "");
    setStart(task.start);
    setEnd(task.end);
    setAssigneeId(task.assigneeId ?? "");
    setStatus(task.status);
    setProgress(task.progress);
    setConfidence(task.confidence);
    setPredecessors(task.predecessors);
    setSuccessors(successorIds);
    setMilestoneId(task.milestoneId);
    setFormError(null);
    setTagInput("");
    setTagStatus(null);
  }, [successorIds, task]);

  useImperativeHandle(panelRef, () => ({
    focusName: () => {
      const input = nameRef.current;
      if (!input) return;
      input.focus();
      input.select();
    },
  }));

  const duplicateNames = useMemo(
    () => duplicateMemberNames(members),
    [members],
  );
  const showUnknownOption = isUnknownAssignee(task.assigneeId, memberCatalog);
  const candidates = useMemo(
    () => tasks.filter((item) => item.id !== task.id),
    [task.id, tasks],
  );
  const tagSuggestions = useMemo(() => {
    const taskTags = task.tags ?? [];
    return documentTags.filter((tag) => !taskTags.includes(tag));
  }, [documentTags, task.tags]);

  const durationDays =
    daysBetween(parseDate(start), parseDate(end)) + 1;

  const documentPatch = useCallback((): TaskEditPatch => {
    return {
      name: task.name,
      start: task.start,
      end: task.end,
      assigneeId: task.assigneeId ?? null,
      status: task.status,
      progress: task.progress,
      confidence: task.confidence,
      predecessors: task.predecessors,
      successors: successorIds,
      milestoneId: task.milestoneId,
      note: task.note ?? "",
    };
  }, [successorIds, task]);

  const commitWith = useCallback(
    (overrides: Partial<TaskEditPatch>) => {
      const patch = { ...documentPatch(), ...overrides };
      const fieldError = validateTaskEdit({
        name: patch.name,
        start: patch.start,
        end: patch.end,
        progress: patch.progress,
      });
      if (fieldError) {
        setFormError(fieldError);
        return;
      }
      const saveError = onPatch(patch);
      if (saveError) {
        setFormError(saveError);
        return;
      }
      setFormError(null);
    },
    [documentPatch, onPatch],
  );

  const dirtyPatch = useCallback((): Partial<TaskEditPatch> | null => {
    const patch: Partial<TaskEditPatch> = {};
    const trimmedName = name.trim();
    if (trimmedName !== task.name.trim()) patch.name = name;
    const noteValue = note.trim();
    const taskNote = (task.note ?? "").trim();
    if (noteValue !== taskNote) patch.note = note;
    const nextAssignee = assigneeId === "" ? null : assigneeId;
    if (nextAssignee !== (task.assigneeId ?? null)) {
      patch.assigneeId = nextAssignee;
    }
    if (status !== task.status) patch.status = status;
    if (Math.round(progress) !== task.progress) patch.progress = progress;
    if (confidence !== task.confidence) patch.confidence = confidence;
    if (milestoneId !== task.milestoneId) patch.milestoneId = milestoneId;
    const predKey = [...predecessors].sort().join("\0");
    const taskPredKey = [...task.predecessors].sort().join("\0");
    if (predKey !== taskPredKey) patch.predecessors = predecessors;
    const succKey = [...successors].sort().join("\0");
    const taskSuccKey = [...successorIds].sort().join("\0");
    if (succKey !== taskSuccKey) patch.successors = successors;
    return Object.keys(patch).length > 0 ? patch : null;
  }, [
    assigneeId,
    confidence,
    milestoneId,
    name,
    note,
    predecessors,
    progress,
    status,
    successorIds,
    successors,
    task,
  ]);

  const commitNameIfDirty = useCallback(() => {
    const trimmedName = name.trim();
    if (trimmedName !== task.name.trim()) commitWith({ name });
  }, [commitWith, name, task.name]);

  const commitNoteIfDirty = useCallback(() => {
    const noteValue = note.trim();
    const taskNote = (task.note ?? "").trim();
    if (noteValue !== taskNote) commitWith({ note });
  }, [commitWith, note, task.note]);

  const commitProgressIfDirty = useCallback(() => {
    const rounded = Math.round(progress);
    if (rounded !== task.progress) commitWith({ progress });
  }, [commitWith, progress, task.progress]);

  const onFocusIn = () => onEditingChange(true);
  const onFocusOut = (event: FocusEvent) => {
    const root = rootRef.current;
    const next = event.relatedTarget;
    if (root && next instanceof Node && root.contains(next)) return;
    onEditingChange(false);
    const overrides = dirtyPatch();
    if (overrides) commitWith(overrides);
  };

  return (
    <aside
      ref={rootRef}
      className="detail-panel"
      aria-label="タスクの詳細"
      onFocusCapture={onFocusIn}
      onBlurCapture={onFocusOut}
    >
      <section className="detail-section">
        <h2 className="detail-section-title">名前とノート</h2>
        <div className="field">
          <label htmlFor="detailName">タスク名</label>
          <input
            ref={nameRef}
            id="detailName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => commitNameIfDirty()}
          />
        </div>
        <div className="field">
          <label htmlFor="detailNote">ノート</label>
          <textarea
            id="detailNote"
            className="note-textarea"
            rows={4}
            value={note}
            placeholder="補足説明（任意）"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => commitNoteIfDirty()}
          />
        </div>
        <div className="field">
          <label htmlFor="detailTagInput">タグ</label>
          {(task.tags ?? []).length > 0 ? (
            <div className="detail-tag-list">
              {(task.tags ?? []).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="filter-chip"
                  aria-label={`タグ ${tag} を外す`}
                  onClick={() => onRemoveTag(tag)}
                >
                  {tag}
                  <span className="filter-chip-x" aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}
          <input
            id="detailTagInput"
            type="text"
            list={tagSuggestions.length > 0 ? "detailTagSuggestions" : undefined}
            value={tagInput}
            placeholder="タグを入力して Enter"
            onChange={(e) => {
              setTagInput(e.target.value);
              if (tagStatus) setTagStatus(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              const message = onAddTag(tagInput);
              if (message) {
                announceTagStatus(message);
                return;
              }
              setTagInput("");
              setTagStatus(null);
            }}
          />
          {tagSuggestions.length > 0 ? (
            <datalist id="detailTagSuggestions">
              {tagSuggestions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          ) : null}
          {tagStatus ? (
            <p className="form-error" role="alert">{tagStatus}</p>
          ) : null}
        </div>
      </section>
      <section className="detail-section">
        <h2 className="detail-section-title">期間</h2>
        <div className="detail-date-row">
          <div className="field">
            <label htmlFor="detailStart">開始</label>
            <input
              id="detailStart"
              type="date"
              value={start}
              onChange={(e) => {
                const next = e.target.value;
                setStart(next);
                commitWith({ start: next });
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="detailEnd">終了</label>
            <input
              id="detailEnd"
              type="date"
              value={end}
              onChange={(e) => {
                const next = e.target.value;
                setEnd(next);
                commitWith({ end: next });
              }}
            />
          </div>
        </div>
        <p className="detail-duration">{durationDays}日</p>
      </section>
      <section className="detail-section">
        <h2 className="detail-section-title">担当・状態</h2>
        <div className="field">
          <label htmlFor="detailAssignee">担当者</label>
          <select
            id="detailAssignee"
            value={assigneeId}
            onChange={(e) => {
              const next = e.target.value;
              setAssigneeId(next);
              commitWith({ assigneeId: next === "" ? null : next });
            }}
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
          <label htmlFor="detailStatus">ステータス</label>
          <select
            id="detailStatus"
            value={status}
            onChange={(e) => {
              const next = e.target.value as TaskStatus;
              setStatus(next);
              commitWith({ status: next });
            }}
          >
            <option value="not-started">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="done">完了</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="detailProgress">進捗率</label>
          <div className="detail-progress">
            <input
              id="detailProgress"
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onMouseUp={() => commitProgressIfDirty()}
              onPointerUp={() => commitProgressIfDirty()}
              onBlur={() => commitProgressIfDirty()}
            />
            <input
              type="number"
              min={0}
              max={100}
              className="detail-progress-num"
              value={progress}
              onChange={(e) => {
                setProgress(Number(e.target.value) || 0);
              }}
              onBlur={() => commitProgressIfDirty()}
            />
            <span>%</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="detailConfidence">確度</label>
          <select
            id="detailConfidence"
            value={confidence}
            onChange={(e) => {
              const next = e.target.value as TaskConfidence;
              setConfidence(next);
              commitWith({ confidence: next });
            }}
          >
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </div>
      </section>
      <section className="detail-section">
        <h2 className="detail-section-title">マイルストンと前後関係</h2>
        <div className="field">
          <label htmlFor="detailMilestone">対応マイルストン</label>
          <select
            id="detailMilestone"
            value={
              milestoneId != null &&
              milestones.some((milestone) => milestone.id === milestoneId)
                ? String(milestoneId)
                : ""
            }
            onChange={(e) => {
              const next = e.target.value === "" ? null : e.target.value;
              setMilestoneId(next);
              commitWith({ milestoneId: next });
            }}
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
          onAdd={(id) => {
            setPredecessors((prev) => {
              const next = prev.includes(id) ? prev : [...prev, id];
              commitWith({ predecessors: next });
              return next;
            });
          }}
          onRemove={(id) => {
            setPredecessors((prev) => {
              const next = prev.filter((item) => item !== id);
              commitWith({ predecessors: next });
              return next;
            });
          }}
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
          onAdd={(id) => {
            setSuccessors((prev) => {
              const next = prev.includes(id) ? prev : [...prev, id];
              commitWith({ successors: next });
              return next;
            });
          }}
          onRemove={(id) => {
            setSuccessors((prev) => {
              const next = prev.filter((item) => item !== id);
              commitWith({ successors: next });
              return next;
            });
          }}
        />
      </section>
      {formError ? (
        <p className="form-error" role="alert">{formError}</p>
      ) : null}
    </aside>
  );
}
