import { clamp } from "./dates";
import { cloneOutlineRoot, isOutlineBranch, isTaskNode } from "./hierarchy";
import {
  validateDependencyCycles,
  validatePredecessorRefs,
} from "./scheduleSemantics";
import { formatValidationErrors } from "./validateSchedule";
import { applyTaskNote } from "./taskNote";
import { applyTaskTags } from "./taskTags";
import type {
  Milestone,
  OutlineBranch,
  OutlineChild,
  OutlineRoot,
  ScheduleDocument,
  ScheduleId,
  Task,
} from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";
import type { TaskEditPatch } from "./tasks";

export function collectOutlineIds(outline: OutlineRoot): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  const walk = (nodes: OutlineRoot) => {
    for (const node of nodes) {
      if (isTaskNode(node)) {
        ids.add(node.id);
        continue;
      }
      ids.add(node.id);
      walk(node.children);
    }
  };
  walk(outline);
  return ids;
}

export function findTaskInOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
): Task | null {
  for (const node of outline) {
    const found = findTaskInOutlineChild(node, taskId);
    if (found) return found;
  }
  return null;
}

function findTaskInOutlineChild(
  node: OutlineChild,
  taskId: ScheduleId,
): Task | null {
  if (isTaskNode(node)) {
    return node.id === taskId ? node : null;
  }
  for (const child of node.children) {
    const found = findTaskInOutlineChild(child, taskId);
    if (found) return found;
  }
  return null;
}

export type OutlineTaskPlace = {
  parentBranchId: ScheduleId | null;
};

export function findOutlineTaskOwner(
  outline: OutlineRoot,
  taskId: ScheduleId,
  levelCount: number,
): { parentBranchId: ScheduleId | null } | null {
  if (levelCount === 1) {
    return outline.some((node) => isTaskNode(node) && node.id === taskId)
      ? { parentBranchId: null }
      : null;
  }
  return searchOwner(outline, taskId, null);
}

function searchOwner(
  nodes: OutlineRoot,
  taskId: ScheduleId,
  parentId: ScheduleId | null,
): { parentBranchId: ScheduleId | null } | null {
  for (const node of nodes) {
    if (isTaskNode(node)) {
      if (node.id === taskId) return { parentBranchId: parentId };
      continue;
    }
    for (const child of node.children) {
      if (isTaskNode(child) && child.id === taskId) {
        return { parentBranchId: node.id };
      }
    }
    const nested = searchOwner(
      node.children.filter(isOutlineBranch),
      taskId,
      node.id,
    );
    if (nested) return nested;
  }
  return null;
}

export function insertTaskInOutline(
  outline: OutlineRoot,
  task: Task,
  parentBranchId: ScheduleId | null,
  levelCount: number,
): OutlineRoot {
  const cloned = cloneOutlineRoot(outline);
  if (levelCount === 1) {
    return [...cloned, task];
  }
  if (parentBranchId == null) return outline;
  appendTaskToBranch(cloned, parentBranchId, task);
  return cloned;
}

function appendTaskToBranch(
  nodes: OutlineRoot,
  branchId: ScheduleId,
  task: Task,
): boolean {
  for (const node of nodes) {
    if (!isOutlineBranch(node)) continue;
    if (node.id === branchId) {
      const last = node.children[node.children.length - 1];
      if (last != null && isTaskNode(last)) {
        node.children.push(task);
        return true;
      }
      node.children.push(task);
      return true;
    }
    if (appendTaskToBranch(node.children, branchId, task)) return true;
  }
  return false;
}

export function removeTaskFromOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
): OutlineRoot {
  return filterOutline(cloneOutlineRoot(outline), taskId);
}

function filterOutline(nodes: OutlineRoot, taskId: ScheduleId): OutlineRoot {
  const result: OutlineRoot = [];
  for (const node of nodes) {
    if (isTaskNode(node)) {
      if (node.id !== taskId) result.push(node);
      continue;
    }
    const children = filterOutlineChildren(node.children, taskId);
    result.push({ ...node, children });
  }
  return result;
}

function filterOutlineChildren(
  children: OutlineChild[],
  taskId: ScheduleId,
): OutlineChild[] {
  const result: OutlineChild[] = [];
  for (const child of children) {
    if (isTaskNode(child)) {
      if (child.id !== taskId) result.push(child);
      continue;
    }
    result.push({
      ...child,
      children: filterOutlineChildren(child.children, taskId),
    });
  }
  return result;
}

export function updateTaskInOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
  update: (task: Task) => Task,
): OutlineRoot {
  return cloneOutlineRoot(outline).map((node) => mapOutlineChild(node, taskId, update));
}

function mapOutlineChild(
  node: OutlineChild,
  taskId: ScheduleId,
  update: (task: Task) => Task,
): OutlineChild {
  if (isTaskNode(node)) {
    return node.id === taskId ? update(node) : node;
  }
  return {
    ...node,
    children: node.children.map((child) => mapOutlineChild(child, taskId, update)),
  };
}

export function mapAllTasksInOutline(
  outline: OutlineRoot,
  update: (task: Task) => Task,
): OutlineRoot {
  return outline.map((node) => mapOutlineChildForAll(node, update));
}

function mapOutlineChildForAll(
  node: OutlineChild,
  update: (task: Task) => Task,
): OutlineChild {
  if (isTaskNode(node)) return update(node);
  return {
    ...node,
    children: node.children.map((child) => mapOutlineChildForAll(child, update)),
  };
}

export function applyTaskEditInOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
  patch: TaskEditPatch,
  milestoneIds: ReadonlySet<ScheduleId>,
): OutlineRoot {
  const progress = clamp(Math.round(patch.progress), 0, 100);
  const predecessors = [
    ...new Set(patch.predecessors.filter((id) => id !== taskId)),
  ];
  const successors = new Set(
    patch.successors.filter((id) => id !== taskId),
  );
  return mapAllTasksInOutline(outline, (task) => {
    if (task.id === taskId) {
      return applyTaskNote(
        {
          ...task,
          name: patch.name.trim(),
          start: patch.start,
          end: patch.end,
          assigneeId: patch.assigneeId,
          status: patch.status,
          progress,
          confidence: patch.confidence,
          predecessors,
          milestoneId:
            patch.milestoneId != null && milestoneIds.has(patch.milestoneId)
              ? patch.milestoneId
              : null,
        },
        patch.note,
      );
    }
    const withoutSelf = task.predecessors.filter((id) => id !== taskId);
    if (!successors.has(task.id)) {
      return { ...task, predecessors: withoutSelf };
    }
    const prevIndex = task.predecessors.indexOf(taskId);
    if (prevIndex >= 0) {
      const nextPreds = [...withoutSelf];
      nextPreds.splice(Math.min(prevIndex, nextPreds.length), 0, taskId);
      return { ...task, predecessors: nextPreds };
    }
    return { ...task, predecessors: [...withoutSelf, taskId] };
  });
}

function rejectOutlineTaskGraph(
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

export type OutlineTaskGraphResult =
  | { ok: true; outline: OutlineRoot }
  | { ok: false; message: string };

export function outlineAfterTaskEdit(
  outline: OutlineRoot,
  milestones: Milestone[],
  title: string,
  taskId: ScheduleId,
  patch: TaskEditPatch,
): OutlineTaskGraphResult {
  const next = applyTaskEditInOutline(
    outline,
    taskId,
    patch,
    new Set(milestones.map((milestone) => milestone.id)),
  );
  const message = rejectOutlineTaskGraph(next, milestones, title);
  if (message) return { ok: false, message };
  return { ok: true, outline: next };
}

export function tasksInOutlineParent(
  outline: OutlineRoot,
  parentBranchId: ScheduleId | null,
  levelCount: number,
): Task[] {
  if (levelCount === 1) {
    return outline.filter(isTaskNode);
  }
  const branch = findBranchById(outline, parentBranchId);
  if (branch == null) return [];
  return branch.children.filter(isTaskNode);
}

function findBranchById(
  nodes: OutlineRoot,
  branchId: ScheduleId | null,
): OutlineBranch | null {
  if (branchId == null) return null;
  for (const node of nodes) {
    if (!isOutlineBranch(node)) continue;
    if (node.id === branchId) return node;
    const nested = findBranchById(node.children, branchId);
    if (nested) return nested;
  }
  return null;
}

export function reorderTaskInOutlineParent(
  outline: OutlineRoot,
  taskId: ScheduleId,
  insertIndex: number,
  levelCount: number,
): OutlineRoot {
  const owner = findOutlineTaskOwner(outline, taskId, levelCount);
  if (owner == null) return outline;
  const siblings = tasksInOutlineParent(
    outline,
    owner.parentBranchId,
    levelCount,
  );
  const from = siblings.findIndex((task) => task.id === taskId);
  if (from < 0) return outline;
  const cloned = cloneOutlineRoot(outline);
  const list = tasksInOutlineParent(cloned, owner.parentBranchId, levelCount);
  const [moved] = list.splice(from, 1);
  if (moved == null) return outline;
  const clamped = Math.max(0, Math.min(insertIndex, list.length));
  list.splice(clamped, 0, moved);
  return replaceTasksInParent(
    cloned,
    owner.parentBranchId,
    list,
    levelCount,
  );
}

function replaceTasksInParent(
  outline: OutlineRoot,
  parentBranchId: ScheduleId | null,
  tasks: Task[],
  levelCount: number,
): OutlineRoot {
  if (levelCount === 1) {
    const branches = outline.filter(isOutlineBranch);
    return [...tasks, ...branches];
  }
  return replaceTasksInBranch(outline, parentBranchId, tasks);
}

function replaceTasksInBranch(
  nodes: OutlineRoot,
  branchId: ScheduleId | null,
  tasks: Task[],
): OutlineRoot {
  if (branchId == null) return nodes;
  return nodes.map((node) => {
    if (!isOutlineBranch(node)) return node;
    if (node.id === branchId) {
      const branches = node.children.filter(isOutlineBranch);
      return { ...node, children: [...tasks, ...branches] };
    }
    return {
      ...node,
      children: replaceTasksInBranch(node.children, branchId, tasks),
    };
  });
}

export function moveTaskToOutlineParent(
  outline: OutlineRoot,
  taskId: ScheduleId,
  targetParentBranchId: ScheduleId,
  insertIndex: number,
  levelCount: number,
): OutlineRoot {
  const owner = findOutlineTaskOwner(outline, taskId, levelCount);
  if (owner == null) return outline;
  if (owner.parentBranchId === targetParentBranchId) {
    return reorderTaskInOutlineParent(outline, taskId, insertIndex, levelCount);
  }
  const task = findTaskInOutline(outline, taskId);
  if (task == null) return outline;
  const without = removeTaskFromOutline(outline, taskId);
  const inserted = insertTaskInOutline(
    without,
    task,
    targetParentBranchId,
    levelCount,
  );
  const ownerAfter = findOutlineTaskOwner(inserted, taskId, levelCount);
  if (ownerAfter?.parentBranchId !== targetParentBranchId) return inserted;
  return reorderTaskInOutlineParent(
    inserted,
    taskId,
    insertIndex,
    levelCount,
  );
}

export function insertTaskAfterInOutline(
  outline: OutlineRoot,
  task: Task,
  afterId: ScheduleId,
  levelCount: number,
): OutlineRoot | null {
  const owner = findOutlineTaskOwner(outline, afterId, levelCount);
  if (owner == null) return null;
  const siblings = tasksInOutlineParent(outline, owner.parentBranchId, levelCount);
  const index = siblings.findIndex((item) => item.id === afterId);
  if (index < 0) return null;
  const nextSiblings = siblings.map((item) => ({
    ...item,
    predecessors: [...item.predecessors],
  }));
  nextSiblings.splice(index + 1, 0, {
    ...task,
    predecessors: [...task.predecessors],
  });
  return replaceTasksInParent(
    cloneOutlineRoot(outline),
    owner.parentBranchId,
    nextSiblings,
    levelCount,
  );
}

export function outlineAfterDuplicate(
  outline: OutlineRoot,
  milestones: Milestone[],
  title: string,
  sourceId: ScheduleId,
  newId: ScheduleId,
  patch: TaskEditPatch,
  levelCount: number,
): OutlineTaskGraphResult {
  const source = findTaskInOutline(outline, sourceId);
  if (source == null) {
    return { ok: false, message: "複製元のタスクがありません。" };
  }
  const inserted = insertTaskAfterInOutline(
    outline,
    {
      id: newId,
      name: patch.name.trim(),
      start: patch.start,
      end: patch.end,
      assigneeId: patch.assigneeId,
      status: patch.status,
      progress: patch.progress,
      confidence: patch.confidence,
      predecessors: [],
      milestoneId: null,
      ...(source.tags ? { tags: [...source.tags] } : {}),
    },
    sourceId,
    levelCount,
  );
  if (inserted == null) {
    return { ok: false, message: "複製元のタスクがありません。" };
  }
  return outlineAfterTaskEdit(inserted, milestones, title, newId, patch);
}

export type OutlinePredecessorLinkResult =
  | { ok: true; outline: OutlineRoot }
  | { ok: false; message: string };

export function tryAddPredecessorLinkInOutline(
  outline: OutlineRoot,
  milestones: Milestone[],
  title: string,
  predecessorId: ScheduleId,
  successorId: ScheduleId,
): OutlinePredecessorLinkResult {
  if (findTaskInOutline(outline, successorId) == null) {
    return { ok: false, message: "後続のタスクがありません。" };
  }
  const next = mapAllTasksInOutline(outline, (task) => {
    if (task.id !== successorId) return task;
    if (task.predecessors.includes(predecessorId)) return task;
    return { ...task, predecessors: [...task.predecessors, predecessorId] };
  });
  const message = rejectOutlineTaskGraph(next, milestones, title);
  if (message) return { ok: false, message };
  return { ok: true, outline: next };
}

export function dropPredecessorLinkInOutline(
  outline: OutlineRoot,
  predecessorId: ScheduleId,
  successorId: ScheduleId,
): OutlineRoot {
  return mapAllTasksInOutline(outline, (task) => {
    if (task.id !== successorId) return task;
    if (!task.predecessors.includes(predecessorId)) return task;
    return {
      ...task,
      predecessors: task.predecessors.filter((id) => id !== predecessorId),
    };
  });
}

export function addTaskTagInOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
  rawTag: string,
): { outline: OutlineRoot; duplicate: boolean } {
  const trimmed = rawTag.trim();
  if (trimmed.length === 0) {
    return { outline, duplicate: false };
  }
  let duplicate = false;
  const next = mapAllTasksInOutline(outline, (task) => {
    if (task.id !== taskId) return task;
    const existing = task.tags ?? [];
    if (existing.includes(trimmed)) {
      duplicate = true;
      return task;
    }
    return applyTaskTags(task, [...existing, trimmed]);
  });
  return { outline: next, duplicate };
}

export function removeTaskTagInOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
  tag: string,
): OutlineRoot {
  return mapAllTasksInOutline(outline, (task) => {
    if (task.id !== taskId) return task;
    const existing = task.tags;
    if (!existing?.includes(tag)) return task;
    return applyTaskTags(task, existing.filter((item) => item !== tag));
  });
}
