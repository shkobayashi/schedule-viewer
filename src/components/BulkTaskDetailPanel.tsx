import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TaskRef } from "../model/dependencies";
import {
  duplicateMemberNames,
  memberOptionLabel,
} from "../model/assigneeDisplay";
import {
  commonMilestoneId,
  commonStringField,
  type BulkTaskDraft,
} from "../model/bulkTaskEdit";
import { daysBetween, parseDate } from "../model/dates";
import type { Member } from "../model/memberTypes";
import type { MemberId } from "../model/memberTypes";
import {
  UNASSIGNED_LABEL,
  type Milestone,
  type ScheduleId,
  type Task,
  type TaskConfidence,
  type TaskStatus,
} from "../model/types";
import { MilestoneField } from "./MilestoneField";
import { RelationField } from "./TaskEditDialog";

/** select の「変更しない」。空文字は割り当てなし用に残す。 */
const UNCHANGED = "__unchanged__";

type LocalDraft = {
  start?: string;
  end?: string;
  assignee: string;
  status: TaskStatus | "";
  confidence: TaskConfidence | "";
  milestone: ScheduleId | null | "unchanged";
  addPredecessors: ScheduleId[];
  addSuccessors: ScheduleId[];
  addTags: string[];
};

function emptyLocalDraft(): LocalDraft {
  return {
    assignee: UNCHANGED,
    status: "",
    confidence: "",
    milestone: "unchanged",
    addPredecessors: [],
    addSuccessors: [],
    addTags: [],
  };
}

function setDraftDateField(
  field: "start" | "end",
  value: string,
  common: string | "mixed",
  prev: LocalDraft,
): LocalDraft {
  const commonValue = common === "mixed" ? "" : common;
  const touched = field === "start" ? prev.start !== undefined : prev.end !== undefined;
  if (!touched && value === commonValue) return prev;
  if (value === commonValue) {
    const next = { ...prev };
    if (field === "start") delete next.start;
    else delete next.end;
    return next;
  }
  return { ...prev, [field]: value };
}

function buildBulkDraft(local: LocalDraft): BulkTaskDraft | null {
  const draft: BulkTaskDraft = {};
  if (local.start !== undefined && local.start !== "") draft.start = local.start;
  if (local.end !== undefined && local.end !== "") draft.end = local.end;
  if (local.assignee !== UNCHANGED) {
    draft.assigneeId =
      local.assignee === "" ? null : (local.assignee as MemberId);
  }
  if (local.status !== "") draft.status = local.status;
  if (local.confidence !== "") draft.confidence = local.confidence;
  if (local.milestone !== "unchanged") {
    draft.milestoneId = local.milestone;
  }
  if (local.addPredecessors.length > 0) {
    draft.addPredecessorIds = local.addPredecessors;
  }
  if (local.addSuccessors.length > 0) {
    draft.addSuccessorIds = local.addSuccessors;
  }
  if (local.addTags.length > 0) draft.addTags = local.addTags;
  if (Object.keys(draft).length === 0) return null;
  return draft;
}

const FIELD_LABELS: Record<string, string> = {
  start: "開始",
  end: "終了",
  assigneeId: "担当者",
  status: "ステータス",
  confidence: "確度",
  milestoneId: "対応マイルストン",
  addPredecessorIds: "先行",
  addSuccessorIds: "後続",
  addTags: "タグ",
};

function draftFieldLabels(draft: BulkTaskDraft): string {
  const names: string[] = [];
  if (draft.start !== undefined) names.push(FIELD_LABELS.start);
  if (draft.end !== undefined) names.push(FIELD_LABELS.end);
  if (draft.assigneeId !== undefined) names.push(FIELD_LABELS.assigneeId);
  if (draft.status !== undefined) names.push(FIELD_LABELS.status);
  if (draft.confidence !== undefined) names.push(FIELD_LABELS.confidence);
  if (draft.milestoneId !== undefined) names.push(FIELD_LABELS.milestoneId);
  if (draft.addPredecessorIds?.length) names.push(FIELD_LABELS.addPredecessorIds);
  if (draft.addSuccessorIds?.length) names.push(FIELD_LABELS.addSuccessorIds);
  if (draft.addTags?.length) names.push(FIELD_LABELS.addTags);
  return names.join("、");
}

type BulkTaskDetailPanelProps = {
  tasks: Task[];
  selectedIds: readonly ScheduleId[];
  members: Member[];
  taskRefs: TaskRef[];
  milestones: Milestone[];
  documentTags: string[];
  onApply: (taskIds: readonly ScheduleId[], draft: BulkTaskDraft) => string | null;
  onEditingChange: (editing: boolean) => void;
  onPanelFocus?: () => void;
};

export function BulkTaskDetailPanel({
  tasks,
  selectedIds,
  members,
  taskRefs,
  milestones,
  documentTags,
  onApply,
  onEditingChange,
  onPanelFocus,
}: BulkTaskDetailPanelProps) {
  const [local, setLocal] = useState<LocalDraft>(() => emptyLocalDraft());
  const [formError, setFormError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  const commonStart = commonStringField(tasks, (t) => t.start);
  const commonEnd = commonStringField(tasks, (t) => t.end);
  const commonMilestone = commonMilestoneId(tasks);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const candidates = useMemo(
    () => taskRefs.filter((item) => !selectedSet.has(item.id)),
    [selectedSet, taskRefs],
  );

  const duplicateNames = useMemo(
    () => duplicateMemberNames(members),
    [members],
  );

  const bulkDraft = useMemo(() => buildBulkDraft(local), [local]);
  const canApply = bulkDraft != null;

  const displayStart =
    local.start !== undefined
      ? local.start
      : commonStart === "mixed"
        ? ""
        : commonStart;
  const displayEnd =
    local.end !== undefined
      ? local.end
      : commonEnd === "mixed"
        ? ""
        : commonEnd;

  const milestoneMixed =
    commonMilestone === "mixed" && local.milestone === "unchanged";

  const milestoneValue =
    local.milestone === "unchanged"
      ? commonMilestone === "mixed"
        ? null
        : commonMilestone
      : local.milestone;

  const durationDays =
    displayStart && displayEnd
      ? daysBetween(parseDate(displayStart), parseDate(displayEnd)) + 1
      : null;

  useEffect(
    () => () => {
      onEditingChange(false);
    },
    [onEditingChange],
  );

  const clearDraft = useCallback(() => {
    setLocal(emptyLocalDraft());
    setTagInput("");
    setFormError(null);
  }, []);

  const onFocusIn = () => {
    onPanelFocus?.();
    onEditingChange(true);
  };
  const onFocusOut = (event: React.FocusEvent) => {
    const root = rootRef.current;
    const next = event.relatedTarget;
    if (root && next instanceof Node && root.contains(next)) return;
    onEditingChange(bulkDraft != null);
  };

  const apply = () => {
    if (!bulkDraft) return;
    const message = onApply(selectedIds, bulkDraft);
    if (message) {
      setFormError(message);
      return;
    }
    setFormError(null);
    clearDraft();
  };

  useEffect(() => {
    onEditingChange(bulkDraft != null);
  }, [bulkDraft, onEditingChange]);

  return (
    <aside
      ref={rootRef}
      className="detail-panel detail-panel-bulk"
      aria-label={`${selectedIds.length}件の一括編集`}
      onFocusCapture={onFocusIn}
      onBlurCapture={onFocusOut}
    >
      <h2
        ref={headingRef}
        className="detail-bulk-heading"
        tabIndex={-1}
        role="status"
        aria-live="polite"
      >
        {selectedIds.length}件を選択中
      </h2>
      <p className="detail-bulk-intro">
        適用した項目だけが、選択中のすべてに入ります。空欄と「変更しない」は、今の値のままです。
      </p>
      <p className="detail-bulk-intro">
        名前、ノート、進捗率は出せません。1件を選ぶと、今までの詳細パネルに戻ります。
      </p>

      <section className="detail-section">
        <h2 className="detail-section-title">期間</h2>
        <div className="detail-date-row">
          <div className="field">
            <label htmlFor="bulkStart">開始</label>
            <input
              id="bulkStart"
              type="date"
              value={displayStart}
              onChange={(e) =>
                setLocal((prev) =>
                  setDraftDateField("start", e.target.value, commonStart, prev),
                )
              }
            />
            {commonStart === "mixed" && local.start === undefined ? (
              <p className="detail-mixed-hint">複数の値</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="bulkEnd">終了</label>
            <input
              id="bulkEnd"
              type="date"
              value={displayEnd}
              onChange={(e) =>
                setLocal((prev) =>
                  setDraftDateField("end", e.target.value, commonEnd, prev),
                )
              }
            />
            {commonEnd === "mixed" && local.end === undefined ? (
              <p className="detail-mixed-hint">複数の値</p>
            ) : null}
          </div>
        </div>
        {durationDays != null ? (
          <p className="detail-duration">{durationDays}日</p>
        ) : null}
        <p className="detail-bulk-hint">
          入れた日だけを、選択中のタスクに書きます。空欄の側は、各タスクの日のままです。
        </p>
      </section>

      <section className="detail-section">
        <h2 className="detail-section-title">担当・状態</h2>
        <div className="field">
          <label htmlFor="bulkAssignee">担当者</label>
          <select
            id="bulkAssignee"
            value={local.assignee}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, assignee: e.target.value }))
            }
          >
            <option value={UNCHANGED}>変更しない</option>
            <option value="">{UNASSIGNED_LABEL}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {memberOptionLabel(member, duplicateNames)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bulkStatus">ステータス</label>
          <select
            id="bulkStatus"
            value={local.status}
            onChange={(e) =>
              setLocal((prev) => ({
                ...prev,
                status: e.target.value as TaskStatus | "",
              }))
            }
          >
            <option value="">変更しない</option>
            <option value="not-started">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="done">完了</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="bulkConfidence">確度</label>
          <select
            id="bulkConfidence"
            value={local.confidence}
            onChange={(e) =>
              setLocal((prev) => ({
                ...prev,
                confidence: e.target.value as TaskConfidence | "",
              }))
            }
          >
            <option value="">変更しない</option>
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </div>
      </section>

      <section className="detail-section">
        <h2 className="detail-section-title">マイルストンと前後関係</h2>
        <div className="field">
          <label htmlFor="bulkMilestone">対応マイルストン</label>
          <MilestoneField
            id="bulkMilestone"
            milestones={milestones}
            value={milestoneValue}
            blankClosedDisplay={milestoneMixed}
            onChange={(next) =>
              setLocal((prev) => {
                if (prev.milestone !== "unchanged") {
                  const commonId =
                    commonMilestone === "mixed" ? null : commonMilestone;
                  if (next === commonId) {
                    return { ...prev, milestone: "unchanged" };
                  }
                  return { ...prev, milestone: next };
                }
                if (
                  commonMilestone !== "mixed" &&
                  next === commonMilestone
                ) {
                  return prev;
                }
                return { ...prev, milestone: next };
              })
            }
          />
          {milestoneMixed ? (
            <p className="detail-mixed-hint">複数の値</p>
          ) : null}
        </div>
        <RelationField
          label="先行タスク"
          selected={local.addPredecessors}
          candidates={candidates.filter(
            (item) => !local.addSuccessors.includes(item.id),
          )}
          tasks={taskRefs}
          onAdd={(id) =>
            setLocal((prev) => ({
              ...prev,
              addPredecessors: prev.addPredecessors.includes(id)
                ? prev.addPredecessors
                : [...prev.addPredecessors, id],
            }))
          }
          onRemove={(id) =>
            setLocal((prev) => ({
              ...prev,
              addPredecessors: prev.addPredecessors.filter((x) => x !== id),
            }))
          }
        />
        <p className="detail-bulk-hint">
          選択中のタスクは候補に出ません。すでにある先行と後続は残し、選んだ相手を足します。
        </p>
        <RelationField
          label="後続タスク"
          selected={local.addSuccessors}
          candidates={candidates.filter(
            (item) => !local.addPredecessors.includes(item.id),
          )}
          tasks={taskRefs}
          onAdd={(id) =>
            setLocal((prev) => ({
              ...prev,
              addSuccessors: prev.addSuccessors.includes(id)
                ? prev.addSuccessors
                : [...prev.addSuccessors, id],
            }))
          }
          onRemove={(id) =>
            setLocal((prev) => ({
              ...prev,
              addSuccessors: prev.addSuccessors.filter((x) => x !== id),
            }))
          }
        />
      </section>

      <section className="detail-section">
        <h2 className="detail-section-title">タグ</h2>
        <p className="detail-bulk-hint">
          すでにあるタグは残し、入力したタグを足します。
        </p>
        {local.addTags.length > 0 ? (
          <div className="detail-tag-list">
            {local.addTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="filter-chip"
                aria-label={`追加するタグ ${tag} を外す`}
                onClick={() =>
                  setLocal((prev) => ({
                    ...prev,
                    addTags: prev.addTags.filter((t) => t !== tag),
                  }))
                }
              >
                {tag}
                <span className="filter-chip-x" aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="bulkTagInput">タグ</label>
          <input
            id="bulkTagInput"
            type="text"
            list={documentTags.length > 0 ? "bulkTagSuggestions" : undefined}
            value={tagInput}
            placeholder="タグを入力して Enter"
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              const trimmed = tagInput.trim();
              if (!trimmed) return;
              setLocal((prev) =>
                prev.addTags.includes(trimmed)
                  ? prev
                  : { ...prev, addTags: [...prev.addTags, trimmed] },
              );
              setTagInput("");
            }}
          />
          {documentTags.length > 0 ? (
            <datalist id="bulkTagSuggestions">
              {documentTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          ) : null}
        </div>
      </section>

      {bulkDraft ? (
        <p className="detail-bulk-apply-preview">
          適用する項目: {draftFieldLabels(bulkDraft)}
        </p>
      ) : (
        <p className="detail-bulk-apply-preview">変更する項目はありません</p>
      )}
      <div className="detail-bulk-actions">
        <button type="button" disabled={!canApply} onClick={apply}>
          {selectedIds.length}件に適用
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!canApply}
          onClick={clearDraft}
        >
          入力をクリア
        </button>
      </div>
      {formError ? (
        <p className="form-error" role="alert">{formError}</p>
      ) : null}
    </aside>
  );
}
