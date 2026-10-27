import { tryAddPredecessorLink } from "./dependencies";
import {
  findTaskInOutline,
  mapAllTasksInOutline,
  tryAddPredecessorLinkInOutline,
} from "./outlineTasks";
import { findTaskById } from "./rows";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
} from "./scheduleSemantics";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import { formatValidationErrors } from "./validateSchedule";
import type { MemberId } from "./memberTypes";
import { applyTaskTags } from "./taskTags";
import { mapTasks } from "./tasks";
import type {
  Category,
  Milestone,
  OutlineRoot,
  ScheduleDocument,
  ScheduleId,
  Task,
  TaskConfidence,
  TaskStatus,
} from "./types";

export type BulkFieldAssignee = MemberId | null | "unchanged";
export type BulkFieldMilestone = ScheduleId | null | "unchanged";

export type BulkTaskDraft = {
  start?: string;
  end?: string;
  assigneeId?: BulkFieldAssignee;
  status?: TaskStatus;
  confidence?: TaskConfidence;
  milestoneId?: BulkFieldMilestone;
  addPredecessorIds?: ScheduleId[];
  addSuccessorIds?: ScheduleId[];
  addTags?: string[];
};

export type BulkApplyResult =
  | { ok: true; categories: Category[] }
  | { ok: false; message: string };

export type BulkApplyOutlineResult =
  | { ok: true; outline: OutlineRoot }
  | { ok: false; message: string };

function rejectGraph(
  categories: Category[],
  milestones: Milestone[],
  title: string,
): string | null {
  const candidate: ScheduleDocument = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestoneGroups: [],
    categories,
    milestones,
  };
  const issues = [
    ...validateDependencyCycles(candidate),
    ...validatePredecessorRefs(candidate),
  ];
  if (issues.length === 0) return null;
  return formatValidationErrors(issues);
}

function taskAfterScalarDraft(
  task: Task,
  draft: BulkTaskDraft,
): { task: Task; error: string | null } {
  let start = task.start;
  let end = task.end;
  if (draft.start !== undefined) start = draft.start;
  if (draft.end !== undefined) end = draft.end;
  if (end < start) {
    return {
      task,
      error: `終了日は開始日以降にしてください（${task.name}）`,
    };
  }
  let next: Task = { ...task, start, end };
  if (draft.assigneeId !== undefined && draft.assigneeId !== "unchanged") {
    next = { ...next, assigneeId: draft.assigneeId };
  }
  if (draft.status !== undefined) next = { ...next, status: draft.status };
  if (draft.confidence !== undefined) {
    next = { ...next, confidence: draft.confidence };
  }
  if (draft.milestoneId !== undefined && draft.milestoneId !== "unchanged") {
    next = { ...next, milestoneId: draft.milestoneId };
  }
  if (draft.addTags && draft.addTags.length > 0) {
    let tags = next.tags ?? [];
    for (const tag of draft.addTags) {
      if (!tags.includes(tag)) tags = [...tags, tag];
    }
    next = applyTaskTags(next, tags);
  }
  return { task: next, error: null };
}

export function applyBulkTaskEdit(
  categories: Category[],
  milestones: Milestone[],
  title: string,
  taskIds: readonly ScheduleId[],
  draft: BulkTaskDraft,
): BulkApplyResult {
  if (taskIds.length === 0) {
    return { ok: false, message: "タスクが選択されていません。" };
  }
  if (
    draft.start !== undefined &&
    draft.end !== undefined &&
    draft.end < draft.start
  ) {
    const first = findTaskById(categories, taskIds[0]!);
    const suffix = first ? `（${first.name}）` : "";
    return {
      ok: false,
      message: `終了日は開始日以降にしてください${suffix}`,
    };
  }

  const idSet = new Set(taskIds);
  const beforeKey = JSON.stringify(categories);
  let next = categories;
  for (const taskId of taskIds) {
    const task = findTaskById(next, taskId);
    if (!task) {
      return { ok: false, message: "選択したタスクがありません。" };
    }
    const { task: patched, error } = taskAfterScalarDraft(task, draft);
    if (error) return { ok: false, message: error };
    next = mapTasks(next, (item) => (item.id === taskId ? patched : item));
  }

  const milestoneIdSet = new Set(milestones.map((m) => m.id));
  if (draft.milestoneId !== undefined && draft.milestoneId !== "unchanged") {
    const mid = draft.milestoneId;
    next = mapTasks(next, (task) => {
      if (!idSet.has(task.id)) return task;
      return {
        ...task,
        milestoneId:
          mid != null && milestoneIdSet.has(mid) ? mid : null,
      };
    });
  }

  const preds = draft.addPredecessorIds ?? [];
  for (const taskId of taskIds) {
    for (const predId of preds) {
      const successor = findTaskById(next, taskId);
      if (!successor) {
        return { ok: false, message: "選択したタスクがありません。" };
      }
      if (successor.predecessors.includes(predId)) continue;
      const result = tryAddPredecessorLink(next, predId, taskId);
      if (!result.ok) return { ok: false, message: result.message };
      next = result.categories;
    }
  }

  const succs = draft.addSuccessorIds ?? [];
  for (const succId of succs) {
    for (const taskId of taskIds) {
      const successor = findTaskById(next, succId);
      if (!successor) {
        return { ok: false, message: "後続のタスクがありません。" };
      }
      if (successor.predecessors.includes(taskId)) continue;
      const result = tryAddPredecessorLink(next, taskId, succId);
      if (!result.ok) return { ok: false, message: result.message };
      next = result.categories;
    }
  }

  const graphMessage = rejectGraph(next, milestones, title);
  if (graphMessage) return { ok: false, message: graphMessage };

  if (JSON.stringify(next) === beforeKey) {
    if (draft.addTags && draft.addTags.length > 0) {
      return {
        ok: false,
        message: "選択中のタスクには、すでにこのタグがあります。",
      };
    }
    if (preds.length > 0 || succs.length > 0) {
      return {
        ok: false,
        message: "選択中のタスクには、すでにこの前後関係があります。",
      };
    }
    return { ok: false, message: "変更する項目がありません。" };
  }

  return { ok: true, categories: next };
}

function rejectOutlineGraph(
  outline: OutlineRoot,
  milestones: Milestone[],
  title: string,
): string | null {
  const candidate: ScheduleDocument = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestoneGroups: [],
    milestones,
    categories: [],
    outline,
  };
  const issues = [
    ...validateDependencyCycles(candidate),
    ...validatePredecessorRefs(candidate),
  ];
  if (issues.length === 0) return null;
  return formatValidationErrors(issues);
}

export function applyBulkTaskEditOutline(
  outline: OutlineRoot,
  milestones: Milestone[],
  title: string,
  taskIds: readonly ScheduleId[],
  draft: BulkTaskDraft,
): BulkApplyOutlineResult {
  if (taskIds.length === 0) {
    return { ok: false, message: "タスクが選択されていません。" };
  }
  if (
    draft.start !== undefined &&
    draft.end !== undefined &&
    draft.end < draft.start
  ) {
    const first = findTaskInOutline(outline, taskIds[0]!);
    const suffix = first ? `（${first.name}）` : "";
    return {
      ok: false,
      message: `終了日は開始日以降にしてください${suffix}`,
    };
  }

  const idSet = new Set(taskIds);
  const beforeKey = JSON.stringify(outline);
  let next = outline;
  for (const taskId of taskIds) {
    const task = findTaskInOutline(next, taskId);
    if (!task) {
      return { ok: false, message: "選択したタスクがありません。" };
    }
    const { task: patched, error } = taskAfterScalarDraft(task, draft);
    if (error) return { ok: false, message: error };
    next = mapAllTasksInOutline(next, (item) =>
      item.id === taskId ? patched : item,
    );
  }

  const milestoneIdSet = new Set(milestones.map((m) => m.id));
  if (draft.milestoneId !== undefined && draft.milestoneId !== "unchanged") {
    const mid = draft.milestoneId;
    next = mapAllTasksInOutline(next, (task) => {
      if (!idSet.has(task.id)) return task;
      return {
        ...task,
        milestoneId:
          mid != null && milestoneIdSet.has(mid) ? mid : null,
      };
    });
  }

  const preds = draft.addPredecessorIds ?? [];
  for (const taskId of taskIds) {
    for (const predId of preds) {
      const successor = findTaskInOutline(next, taskId);
      if (!successor) {
        return { ok: false, message: "選択したタスクがありません。" };
      }
      if (successor.predecessors.includes(predId)) continue;
      const result = tryAddPredecessorLinkInOutline(
        next,
        milestones,
        title,
        predId,
        taskId,
      );
      if (!result.ok) return { ok: false, message: result.message };
      next = result.outline;
    }
  }

  const succs = draft.addSuccessorIds ?? [];
  for (const succId of succs) {
    for (const taskId of taskIds) {
      const successor = findTaskInOutline(next, succId);
      if (!successor) {
        return { ok: false, message: "後続のタスクがありません。" };
      }
      if (successor.predecessors.includes(taskId)) continue;
      const result = tryAddPredecessorLinkInOutline(
        next,
        milestones,
        title,
        taskId,
        succId,
      );
      if (!result.ok) return { ok: false, message: result.message };
      next = result.outline;
    }
  }

  const graphMessage = rejectOutlineGraph(next, milestones, title);
  if (graphMessage) return { ok: false, message: graphMessage };

  if (JSON.stringify(next) === beforeKey) {
    if (draft.addTags && draft.addTags.length > 0) {
      return {
        ok: false,
        message: "選択中のタスクには、すでにこのタグがあります。",
      };
    }
    if (preds.length > 0 || succs.length > 0) {
      return {
        ok: false,
        message: "選択中のタスクには、すでにこの前後関係があります。",
      };
    }
    return { ok: false, message: "変更する項目がありません。" };
  }

  return { ok: true, outline: next };
}

export function commonStringField(
  tasks: readonly Task[],
  read: (task: Task) => string,
): string | "mixed" {
  if (tasks.length === 0) return "mixed";
  const first = read(tasks[0]!);
  for (let i = 1; i < tasks.length; i++) {
    if (read(tasks[i]!) !== first) return "mixed";
  }
  return first;
}

export function commonAssigneeId(
  tasks: readonly Task[],
): MemberId | null | "mixed" {
  if (tasks.length === 0) return "mixed";
  const first = tasks[0]!.assigneeId ?? null;
  for (let i = 1; i < tasks.length; i++) {
    if ((tasks[i]!.assigneeId ?? null) !== first) return "mixed";
  }
  return first;
}

export function commonMilestoneId(
  tasks: readonly Task[],
): ScheduleId | null | "mixed" {
  if (tasks.length === 0) return "mixed";
  const first = tasks[0]!.milestoneId ?? null;
  for (let i = 1; i < tasks.length; i++) {
    if ((tasks[i]!.milestoneId ?? null) !== first) return "mixed";
  }
  return first;
}

export function commonStatus(
  tasks: readonly Task[],
): TaskStatus | "mixed" {
  return commonStringField(tasks, (t) => t.status) as TaskStatus | "mixed";
}

export function commonConfidence(
  tasks: readonly Task[],
): TaskConfidence | "mixed" {
  return commonStringField(tasks, (t) => t.confidence) as
    | TaskConfidence
    | "mixed";
}
