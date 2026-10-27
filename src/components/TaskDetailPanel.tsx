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
import { StatusOptions } from "./StatusOptions";
import type { StatusItem } from "../model/statusCatalog";
import type { MemberId } from "../model/memberTypes";
import type { TaskEditPatch } from "../model/tasks";
import { validateTaskEdit } from "../model/tasks";
import {
  hasTaskTodos,
  taskTodoCountLabel,
} from "../model/taskTodos";
import { fieldValueDisplayString } from "../model/taskFields";
import {
  UNASSIGNED_LABEL,
  type Milestone,
  type ScheduleFieldDef,
  type ScheduleId,
  type Task,
  type TaskConfidence,
  type TaskStatus,
  type TaskTodoItem,
} from "../model/types";
import { DateInput } from "./DateInput";
import { isDatePopoverTarget } from "./datePopover";
import { MilestoneField } from "./MilestoneField";
import { RelationField } from "./TaskEditDialog";

export type TaskDetailPanelHandle = {
  focusName: () => void;
  focusPanelHeading: () => void;
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
  onUpdateTodos: (items: TaskTodoItem[]) => string | null;
  scheduleFields?: readonly ScheduleFieldDef[];
  onSetTaskField: (fieldKey: string, raw: string) => string | null;
  onEditingChange: (editing: boolean) => void;
  statuses: readonly StatusItem[];
  panelRef?: Ref<TaskDetailPanelHandle>;
};

const TASK_FIELD_NONE_VALUE = "__none__";

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
  onUpdateTodos,
  scheduleFields,
  onSetTaskField,
  onEditingChange,
  statuses,
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
  const [todoItems, setTodoItems] = useState<TaskTodoItem[]>(
    () => task.todos ?? [],
  );
  const [pendingTodoText, setPendingTodoText] = useState("");
  const [showPendingTodo, setShowPendingTodo] = useState(false);
  const [customFieldDrafts, setCustomFieldDrafts] = useState<Record<string, string>>(
    {},
  );
  const tagStatusRef = useRef<string | null>(null);
  const skipPendingTodoBlurRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
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
    setTodoItems(task.todos ?? []);
    setPendingTodoText("");
    setShowPendingTodo(false);
    if (scheduleFields != null) {
      const drafts: Record<string, string> = {};
      for (const field of scheduleFields) {
        drafts[field.key] = fieldValueDisplayString(
          field,
          task.fieldValues?.[field.key],
        );
      }
      setCustomFieldDrafts(drafts);
    } else {
      setCustomFieldDrafts({});
    }
  }, [scheduleFields, successorIds, task]);

  const todosActive = hasTaskTodos(task);
  const todoFraction = taskTodoCountLabel(task);

  const commitTodos = useCallback(
    (items: TaskTodoItem[]) => {
      const saveError = onUpdateTodos(items);
      if (saveError) {
        setFormError(saveError);
        return;
      }
      setFormError(null);
      setTodoItems(items);
    },
    [onUpdateTodos],
  );

  const commitPendingTodo = useCallback(() => {
    const trimmed = pendingTodoText.trim();
    if (trimmed.length === 0) {
      setShowPendingTodo(false);
      setPendingTodoText("");
      return;
    }
    if (/[\r\n]/.test(pendingTodoText)) {
      setFormError("TODOの文に改行は使えません");
      return;
    }
    const next = [...todoItems, { text: trimmed, done: false }];
    commitTodos(next);
    setPendingTodoText("");
    setShowPendingTodo(false);
  }, [commitTodos, pendingTodoText, todoItems]);

  const cancelPendingTodo = useCallback(() => {
    skipPendingTodoBlurRef.current = true;
    setShowPendingTodo(false);
    setPendingTodoText("");
    queueMicrotask(() => {
      skipPendingTodoBlurRef.current = false;
    });
  }, []);

  const handlePendingTodoBlur = useCallback(() => {
    if (skipPendingTodoBlurRef.current) return;
    commitPendingTodo();
  }, [commitPendingTodo]);

  useImperativeHandle(panelRef, () => ({
    focusName: () => {
      const input = nameRef.current;
      if (!input) return;
      input.focus();
      input.select();
    },
    focusPanelHeading: () => {
      panelHeadingRef.current?.focus();
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
    if (
      !hasTaskTodos(task) &&
      Math.round(progress) !== task.progress
    ) {
      patch.progress = progress;
    }
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
    if (isDatePopoverTarget(next)) return;
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
        <h2
          ref={panelHeadingRef}
          className="detail-section-title"
          tabIndex={-1}
        >
          名前とノート
        </h2>
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
            <DateInput
              id="detailStart"
              value={start}
              onChange={(next) => {
                setStart(next);
                commitWith({ start: next });
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="detailEnd">終了</label>
            <DateInput
              id="detailEnd"
              value={end}
              onChange={(next) => {
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
            <StatusOptions statuses={statuses} current={status} />
          </select>
        </div>
        <div className="field">
          <label htmlFor={todosActive ? undefined : "detailProgress"}>
            進捗率
          </label>
          {todosActive ? (
            <div className="detail-progress detail-progress-linked">
              <span
                id="detailProgress"
                className="detail-progress-readonly"
                aria-live="polite"
              >
                {task.progress}%
              </span>
              {todoFraction ? (
                <span className="detail-todo-fraction">{todoFraction}</span>
              ) : null}
            </div>
          ) : (
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
          )}
        </div>
        <div className="field detail-todo-field">
          {todosActive ? (
            <span className="detail-todo-label" id="detailTodoListLabel">
              TODO
            </span>
          ) : null}
          {todosActive ? (
            <ul
              className="detail-todo-list"
              aria-labelledby="detailTodoListLabel"
            >
              {todoItems.map((item, index) => (
                <li key={`todo-${index}`} className="detail-todo-row">
                  <input
                    type="checkbox"
                    checked={item.done}
                    aria-label={`${item.text}を済みにする`}
                    onChange={() => {
                      const next = todoItems.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, done: !row.done }
                          : row,
                      );
                      commitTodos(next);
                    }}
                  />
                  <input
                    type="text"
                    className="detail-todo-text"
                    value={item.text}
                    onChange={(e) => {
                      const next = [...todoItems];
                      next[index] = { ...next[index], text: e.target.value };
                      setTodoItems(next);
                    }}
                    onBlur={() => {
                      const trimmed = todoItems[index].text.trim();
                      if (trimmed.length === 0) {
                        const next = todoItems.filter(
                          (_, rowIndex) => rowIndex !== index,
                        );
                        commitTodos(next);
                        return;
                      }
                      if (/[\r\n]/.test(todoItems[index].text)) {
                        setFormError("TODOの文に改行は使えません");
                        setTodoItems(task.todos ?? []);
                        return;
                      }
                      if (trimmed !== todoItems[index].text) {
                        const next = [...todoItems];
                        next[index] = { ...next[index], text: trimmed };
                        commitTodos(next);
                        return;
                      }
                      if (
                        trimmed !== (task.todos ?? [])[index]?.text ||
                        item.done !== (task.todos ?? [])[index]?.done
                      ) {
                        commitTodos(todoItems);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }}
                  />
                  <button
                    type="button"
                    className="btn detail-todo-remove"
                    aria-label={`${item.text}を削除`}
                    onClick={() => {
                      const next = todoItems.filter(
                        (_, rowIndex) => rowIndex !== index,
                      );
                      commitTodos(next);
                    }}
                  >
                    削除
                  </button>
                </li>
              ))}
              {showPendingTodo ? (
                <li className="detail-todo-row detail-todo-row-pending">
                  <span className="detail-todo-pending-spacer" aria-hidden="true" />
                  <input
                    type="text"
                    className="detail-todo-text"
                    value={pendingTodoText}
                    autoFocus
                    placeholder="TODOの文"
                    aria-label="新しいTODOの文"
                    onChange={(e) => setPendingTodoText(e.target.value)}
                    onBlur={handlePendingTodoBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                        e.preventDefault();
                        commitPendingTodo();
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelPendingTodo();
                      }
                    }}
                  />
                </li>
              ) : null}
            </ul>
          ) : null}
          {showPendingTodo && !todosActive ? (
            <div className="detail-todo-row detail-todo-row-pending">
              <span className="detail-todo-pending-spacer" aria-hidden="true" />
              <input
                type="text"
                className="detail-todo-text"
                value={pendingTodoText}
                autoFocus
                placeholder="TODOの文"
                aria-label="新しいTODOの文"
                onChange={(e) => setPendingTodoText(e.target.value)}
                onBlur={handlePendingTodoBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    e.preventDefault();
                    commitPendingTodo();
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelPendingTodo();
                  }
                }}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="btn detail-todo-add"
            onClick={() => setShowPendingTodo(true)}
          >
            TODOを追加
          </button>
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
          <MilestoneField
            id="detailMilestone"
            milestones={milestones}
            value={milestoneId}
            onChange={(next) => {
              setMilestoneId(next);
              commitWith({ milestoneId: next });
            }}
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
      {scheduleFields != null && scheduleFields.length > 0 ? (
        <section className="detail-section">
          <h2 className="detail-section-title">追加項目</h2>
          {scheduleFields.map((field) => {
            const inputId = `detailField-${field.key}`;
            const draft = customFieldDrafts[field.key] ?? "";
            const commitField = (raw: string) => {
              const saveError = onSetTaskField(field.key, raw);
              if (saveError) {
                setFormError(saveError);
                return;
              }
              setFormError(null);
            };
            if (field.type === "choice") {
              const current = task.fieldValues?.[field.key];
              const selectValue =
                current === undefined ? TASK_FIELD_NONE_VALUE : String(current);
              return (
                <div className="field" key={field.key}>
                  <label htmlFor={inputId}>{field.name}</label>
                  <select
                    id={inputId}
                    value={selectValue}
                    onChange={(e) => {
                      const next = e.target.value;
                      const raw =
                        next === TASK_FIELD_NONE_VALUE ? "" : next;
                      commitField(raw);
                    }}
                  >
                    <option value={TASK_FIELD_NONE_VALUE}>値なし</option>
                    {(field.choices ?? []).map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (field.type === "date") {
              return (
                <div className="field" key={field.key}>
                  <label htmlFor={inputId}>{field.name}</label>
                  <DateInput
                    id={inputId}
                    value={draft}
                    onChange={(next) => {
                      setCustomFieldDrafts((prev) => ({
                        ...prev,
                        [field.key]: next,
                      }));
                      commitField(next);
                    }}
                  />
                </div>
              );
            }
            if (field.type === "number") {
              return (
                <div className="field" key={field.key}>
                  <label htmlFor={inputId}>{field.name}</label>
                  <div className="detail-number-line">
                    <input
                      id={inputId}
                      type="number"
                      value={draft}
                      onChange={(e) => {
                        setCustomFieldDrafts((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                      }}
                      onBlur={() => commitField(draft)}
                    />
                    {field.percent === true ? (
                      <span className="detail-number-suffix">%</span>
                    ) : null}
                  </div>
                </div>
              );
            }
            return (
              <div className="field" key={field.key}>
                <label htmlFor={inputId}>{field.name}</label>
                <input
                  id={inputId}
                  type="text"
                  value={draft}
                  onChange={(e) => {
                    setCustomFieldDrafts((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }));
                  }}
                  onBlur={() => commitField(draft)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    e.preventDefault();
                    commitField(draft);
                  }}
                />
              </div>
            );
          })}
        </section>
      ) : null}
      {formError ? (
        <p className="form-error" role="alert">{formError}</p>
      ) : null}
    </aside>
  );
}
