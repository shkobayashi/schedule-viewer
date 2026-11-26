import { isIsoDateString } from "./dates";
import {
  cloneOutlineRoot,
  findTaskInDocument,
  hierarchyLayoutContext,
  scheduleStoresTasksInOutline,
} from "./hierarchy";
import { parseScheduleText } from "./scheduleFile";
import {
  findOutlineTaskOwner,
  mapAllTasksInOutline,
  moveTaskToOutlineParent,
  reorderTaskInOutlineParent,
  tasksInOutlineParent,
} from "./outlineTasks";
import {
  canReorderTaskInGroup,
  visibleGroupForTaskDrop,
} from "./taskOrder";
import {
  canDeleteCategory,
  canDeleteGroup,
  canMoveGroupToCategory,
  findTaskOwner,
  moveGroupToCategory,
  moveTaskToGroup,
  removeCategory,
  removeGroup,
  removeTask,
  reorderCategories,
  reorderGroups,
  reorderTaskInGroup,
} from "./tasks";
import {
  canDeleteOutlineBranch,
  removeOutlineBranch,
} from "./outlineCrud";
import { removeTaskFromOutline } from "./outlineTasks";
import { cloneCategories } from "./tasks";
import { cloneConnections } from "./connections";
import type {
  Category,
  OutlineRoot,
  ScheduleDocument,
  ScheduleId,
  Task,
  VisibleRow,
} from "./types";

function usesOutlineDocument(document: ScheduleDocument): boolean {
  return scheduleStoresTasksInOutline(document);
}

/** outline 保存の文書では categories を空に揃える。 */
export function coerceOutlineStorageDocument(
  document: ScheduleDocument,
): ScheduleDocument {
  if (!usesOutlineDocument(document)) {
    return document;
  }
  return { ...document, categories: [] };
}

function categoriesForTaskLookup(document: ScheduleDocument): Category[] {
  return usesOutlineDocument(document) ? [] : document.categories;
}

/** edit_plan が documentRef を書き換えないよう、編集前に複製する。 */
export function cloneDocumentForMcpEditPlan(
  document: ScheduleDocument,
): ScheduleDocument {
  return coerceOutlineStorageDocument({
    ...document,
    categories: cloneCategories(document.categories ?? []),
    milestoneGroups: document.milestoneGroups.map((group) => ({ ...group })),
    milestones: document.milestones.map((milestone) => ({ ...milestone })),
    connections: cloneConnections(document.connections),
    levels: document.levels?.map((level) => ({ ...level })),
    outline:
      document.outline != null ? cloneOutlineRoot(document.outline) : undefined,
  });
}

function findTaskForMcpEditPlan(
  document: ScheduleDocument,
  taskId: ScheduleId,
): Task | null {
  return findTaskInDocument(
    categoriesForTaskLookup(document),
    document.outline,
    taskId,
  );
}

/** MCP edit_plan と current_schedule が同じ正規化結果になるようにする。 */
export function scheduleDocumentForMcpEditPlan(
  canonicalJson: string,
): { ok: true; document: ScheduleDocument } | { ok: false; message: string } {
  const parsed = parseScheduleText(canonicalJson);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }
  return { ok: true, document: coerceOutlineStorageDocument(parsed.document) };
}

function outlineLevelCount(document: ScheduleDocument): number {
  return hierarchyLayoutContext(document).levelCount;
}

export type McpMoveTaskResult =
  | {
      ok: true;
      document: ScheduleDocument;
      movedTo: { targetGroupId: ScheduleId; insertIndex: number };
    }
  | { ok: false; message: string };

function taskCountInGroup(categories: Category[], groupId: ScheduleId): number {
  for (const category of categories) {
    for (const group of category.groups) {
      if (group.id === groupId) return group.tasks.length;
    }
  }
  return 0;
}

function maxInsertIndexForTaskMove(
  categories: Category[],
  taskId: ScheduleId,
  targetGroupId: ScheduleId,
): number | null {
  const owner = findTaskOwner(categories, taskId);
  if (owner == null) return null;
  const count = taskCountInGroup(categories, targetGroupId);
  if (owner.groupId === targetGroupId) {
    return Math.max(0, count - 1);
  }
  return count;
}

export function tryMcpMoveTaskInCategories(
  categories: Category[],
  visibleRows: readonly VisibleRow[],
  taskId: ScheduleId,
  targetGroupId: ScheduleId,
  insertIndex: number,
): McpMoveTaskResult {
  if (!canReorderTaskInGroup(categories, taskId, visibleRows)) {
    return { ok: false, message: "今の並べ替え条件では、タスクを動かせません。" };
  }
  if (!visibleGroupForTaskDrop(categories, targetGroupId, visibleRows)) {
    return { ok: false, message: "置けない位置です。" };
  }
  const maxIndex = maxInsertIndexForTaskMove(categories, taskId, targetGroupId);
  if (maxIndex == null) {
    return { ok: false, message: "タスクが見つかりません。" };
  }
  if (insertIndex < 0 || insertIndex > maxIndex) {
    return { ok: false, message: "置けない位置です。" };
  }
  const owner = findTaskOwner(categories, taskId);
  if (owner == null) {
    return { ok: false, message: "タスクが見つかりません。" };
  }
  const nextCategories =
    owner.groupId === targetGroupId
      ? reorderTaskInGroup(categories, taskId, insertIndex)
      : moveTaskToGroup(categories, taskId, targetGroupId, insertIndex);
  if (nextCategories === categories) {
    return { ok: false, message: "並びは変わりません。" };
  }
  return {
    ok: true,
    document: { categories: nextCategories } as ScheduleDocument,
    movedTo: { targetGroupId, insertIndex },
  };
}

export function tryMcpMoveTaskInOutline(
  document: ScheduleDocument,
  _visibleRows: readonly VisibleRow[],
  taskId: ScheduleId,
  targetParentBranchId: ScheduleId | null,
  insertIndex: number,
): McpMoveTaskResult {
  const outline = document.outline;
  if (outline == null || outline.length === 0) {
    return { ok: false, message: "見出しの並べ替えは、outline がある文書だけです。" };
  }
  if (findTaskForMcpEditPlan(document, taskId) == null) {
    return { ok: false, message: "タスクが見つかりません。" };
  }
  const levelCount = outlineLevelCount(document);
  const siblings = tasksInOutlineParent(outline, targetParentBranchId, levelCount);
  const owner = findOutlineTaskOwner(outline, taskId, levelCount);
  const sameParent = owner?.parentBranchId === targetParentBranchId;
  const maxIndex = sameParent
    ? Math.max(0, siblings.length - 1)
    : siblings.length;
  if (insertIndex < 0 || insertIndex > maxIndex) {
    return { ok: false, message: "置けない位置です。" };
  }
  const reordered = reorderTaskInOutlineParent(
    outline,
    taskId,
    insertIndex,
    levelCount,
  );
  let nextOutline: OutlineRoot = reordered;
  if (reordered === outline) {
    const owner = findOutlineTaskOwner(outline, taskId, levelCount);
    if (owner == null) {
      return { ok: false, message: "タスクが見つかりません。" };
    }
    if (
      targetParentBranchId != null &&
      owner.parentBranchId !== targetParentBranchId
    ) {
      nextOutline = moveTaskToOutlineParent(
        outline,
        taskId,
        targetParentBranchId,
        insertIndex,
        levelCount,
      );
    } else {
      return { ok: false, message: "置けない位置です。" };
    }
    if (nextOutline === outline) {
      return { ok: false, message: "置けない位置です。" };
    }
  }
  return {
    ok: true,
    document: { ...document, outline: nextOutline },
    movedTo: {
      targetGroupId: targetParentBranchId ?? taskId,
      insertIndex,
    },
  };
}

export function tryMcpSetTaskDates(
  document: ScheduleDocument,
  taskId: ScheduleId,
  start: string,
  end: string,
): { ok: true; document: ScheduleDocument } | { ok: false; message: string } {
  if (!isIsoDateString(start) || !isIsoDateString(end)) {
    return { ok: false, message: "日付の形式が正しくありません。" };
  }
  if (end < start) {
    return { ok: false, message: "終了日は開始日以降にしてください。" };
  }
  if (findTaskForMcpEditPlan(document, taskId) == null) {
    return { ok: false, message: "タスクが見つかりません。" };
  }
  if (usesOutlineDocument(document)) {
    return {
      ok: true,
      document: {
        ...document,
        outline: mapAllTasksInOutline(document.outline ?? [], (t) =>
          t.id === taskId ? { ...t, start, end } : t,
        ),
      },
    };
  }
  const categories = document.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((t) =>
        t.id === taskId ? { ...t, start, end } : t,
      ),
    })),
  }));
  return { ok: true, document: { ...document, categories } };
}

export function tryMcpSetAssigneeIds(
  document: ScheduleDocument,
  taskId: ScheduleId,
  assigneeIds: readonly ScheduleId[],
): { ok: true; document: ScheduleDocument } | { ok: false; message: string } {
  if (findTaskForMcpEditPlan(document, taskId) == null) {
    return { ok: false, message: "タスクが見つかりません。" };
  }
  const patch = (t: Task): Task => ({
    ...t,
    assigneeIds: [...assigneeIds],
  });
  if (usesOutlineDocument(document)) {
    return {
      ok: true,
      document: {
        ...document,
        outline: mapAllTasksInOutline(document.outline ?? [], (t) =>
          t.id === taskId ? patch(t) : t,
        ),
      },
    };
  }
  const categories = document.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((t) => (t.id === taskId ? patch(t) : t)),
    })),
  }));
  return { ok: true, document: { ...document, categories } };
}

export function tryMcpSetPredecessors(
  document: ScheduleDocument,
  taskId: ScheduleId,
  predecessors: readonly ScheduleId[],
): { ok: true; document: ScheduleDocument } | { ok: false; message: string } {
  if (findTaskForMcpEditPlan(document, taskId) == null) {
    return { ok: false, message: "タスクが見つかりません。" };
  }
  if (predecessors.includes(taskId)) {
    return { ok: false, message: "自分自身を先行に指定できません" };
  }
  const filtered = [...new Set(predecessors.filter((id) => id !== taskId))];
  for (const id of filtered) {
    if (findTaskForMcpEditPlan(document, id) == null) {
      return { ok: false, message: "先行タスクが見つかりません。" };
    }
  }
  const patch = (t: Task): Task => ({ ...t, predecessors: filtered });
  if (usesOutlineDocument(document)) {
    return {
      ok: true,
      document: {
        ...document,
        outline: mapAllTasksInOutline(document.outline ?? [], (t) =>
          t.id === taskId ? patch(t) : t,
        ),
      },
    };
  }
  const categories = document.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((t) => (t.id === taskId ? patch(t) : t)),
    })),
  }));
  return { ok: true, document: { ...document, categories } };
}

export type McpEditPlanMoveTaskOp = {
  type: "moveTask";
  taskId: ScheduleId;
  targetGroupId: ScheduleId;
  insertIndex: number;
};

export type McpEditPlanMoveCategoryOp = {
  type: "moveCategory";
  categoryId: ScheduleId;
  insertIndex: number;
};

export type McpEditPlanMoveGroupOp = {
  type: "moveGroup";
  groupId: ScheduleId;
  targetCategoryId: ScheduleId;
  insertIndex: number;
};

export type McpEditPlanDeleteOp =
  | { type: "deleteTask"; taskId: ScheduleId }
  | { type: "deleteCategory"; categoryId: ScheduleId }
  | { type: "deleteGroup"; groupId: ScheduleId }
  | { type: "deleteOutlineHeading"; branchId: ScheduleId };

export type McpEditPlanOp =
  | { type: "setTaskDates"; taskId: ScheduleId; start: string; end: string }
  | { type: "setAssigneeIds"; taskId: ScheduleId; assigneeIds: ScheduleId[] }
  | { type: "setPredecessors"; taskId: ScheduleId; predecessors: ScheduleId[] }
  | McpEditPlanMoveTaskOp
  | McpEditPlanMoveCategoryOp
  | McpEditPlanMoveGroupOp
  | McpEditPlanDeleteOp;

export type McpEditPlanApplyResult =
  | { ok: true; document: ScheduleDocument; movedTo?: string }
  | { ok: false; message: string };

export function tryMcpDeleteInDocument(
  document: ScheduleDocument,
  op: McpEditPlanDeleteOp,
): McpEditPlanApplyResult {
  if (op.type === "deleteTask") {
    const task = findTaskForMcpEditPlan(document, op.taskId);
    if (task == null) {
      return { ok: false, message: "タスクが見つかりません。" };
    }
    if (usesOutlineDocument(document)) {
      return {
        ok: true,
        document: {
          ...document,
          categories: [],
          outline: removeTaskFromOutline(document.outline ?? [], op.taskId),
        },
      };
    }
    return {
      ok: true,
      document: { ...document, categories: removeTask(document.categories, op.taskId) },
    };
  }
  if (op.type === "deleteCategory") {
    if (!canDeleteCategory(document.categories, op.categoryId)) {
      return { ok: false, message: "空でないカテゴリは削除できません。" };
    }
    return {
      ok: true,
      document: {
        ...document,
        categories: removeCategory(document.categories, op.categoryId),
      },
    };
  }
  if (op.type === "deleteGroup") {
    if (!canDeleteGroup(document.categories, op.groupId)) {
      return { ok: false, message: "空でないグループは削除できません。" };
    }
    return {
      ok: true,
      document: { ...document, categories: removeGroup(document.categories, op.groupId) },
    };
  }
  const outline = document.outline;
  if (outline == null) {
    return { ok: false, message: "見出しは outline がある文書だけです。" };
  }
  if (!canDeleteOutlineBranch(outline, op.branchId)) {
    return { ok: false, message: "空でない見出しは削除できません。" };
  }
  return {
    ok: true,
    document: { ...document, outline: removeOutlineBranch(outline, op.branchId) },
  };
}

export function tryMcpMoveCategoryInDocument(
  document: ScheduleDocument,
  categoryId: ScheduleId,
  insertIndex: number,
): McpEditPlanApplyResult {
  const maxIndex = Math.max(0, document.categories.length - 1);
  if (insertIndex < 0 || insertIndex > maxIndex) {
    return { ok: false, message: "置けない位置です。" };
  }
  const next = reorderCategories(document.categories, categoryId, insertIndex);
  if (next === document.categories) {
    return { ok: false, message: "並びは変わりません。" };
  }
  return {
    ok: true,
    document: { ...document, categories: next },
    movedTo: `category:${insertIndex}`,
  };
}

export function tryMcpMoveGroupInDocument(
  document: ScheduleDocument,
  groupId: ScheduleId,
  targetCategoryId: ScheduleId,
  insertIndex: number,
): McpEditPlanApplyResult {
  if (!canMoveGroupToCategory(document.categories, groupId, targetCategoryId)) {
    return { ok: false, message: "置けない位置です。" };
  }
  const targetCat = document.categories.find((c) => c.id === targetCategoryId);
  if (targetCat == null) {
    return { ok: false, message: "グループが見つかりません。" };
  }
  const ownerCat = document.categories.find((c) =>
    c.groups.some((g) => g.id === groupId),
  );
  if (ownerCat == null) {
    return { ok: false, message: "グループが見つかりません。" };
  }
  const inSameCat = ownerCat.id === targetCategoryId;
  let next: ScheduleDocument["categories"];
  if (inSameCat) {
    const maxIndex = Math.max(0, targetCat.groups.length - 1);
    if (insertIndex < 0 || insertIndex > maxIndex) {
      return { ok: false, message: "置けない位置です。" };
    }
    next = reorderGroups(document.categories, groupId, insertIndex);
  } else {
    const maxIndex = targetCat.groups.length;
    if (insertIndex < 0 || insertIndex > maxIndex) {
      return { ok: false, message: "置けない位置です。" };
    }
    next = moveGroupToCategory(
      document.categories,
      groupId,
      targetCategoryId,
      insertIndex,
    );
  }
  if (next === document.categories) {
    return { ok: false, message: "並びは変わりません。" };
  }
  return {
    ok: true,
    document: { ...document, categories: next },
    movedTo: `group:${targetCategoryId}:${insertIndex}`,
  };
}

export function applyMcpEditPlanOps(
  document: ScheduleDocument,
  ops: readonly McpEditPlanOp[],
  visibleRows: readonly VisibleRow[],
): { ok: true; document: ScheduleDocument; movedTo?: string } | { ok: false; message: string } {
  let current = cloneDocumentForMcpEditPlan(document);
  let movedTo: string | undefined;
  for (const op of ops) {
    let result: McpEditPlanApplyResult;
    switch (op.type) {
      case "setTaskDates":
        result = tryMcpSetTaskDates(current, op.taskId, op.start, op.end);
        break;
      case "setAssigneeIds":
        result = tryMcpSetAssigneeIds(current, op.taskId, op.assigneeIds);
        break;
      case "setPredecessors":
        result = tryMcpSetPredecessors(current, op.taskId, op.predecessors);
        break;
      case "deleteTask":
      case "deleteCategory":
      case "deleteGroup":
      case "deleteOutlineHeading":
        result = tryMcpDeleteInDocument(current, op);
        break;
      case "moveCategory":
        result = tryMcpMoveCategoryInDocument(current, op.categoryId, op.insertIndex);
        break;
      case "moveGroup":
        result = tryMcpMoveGroupInDocument(
          current,
          op.groupId,
          op.targetCategoryId,
          op.insertIndex,
        );
        break;
      case "moveTask": {
        if (scheduleStoresTasksInOutline(current)) {
          const outlineResult = tryMcpMoveTaskInOutline(
            current,
            visibleRows,
            op.taskId,
            op.targetGroupId,
            op.insertIndex,
          );
          result = outlineResult.ok
            ? {
                ok: true,
                document: outlineResult.document,
                movedTo: `task:${op.targetGroupId}:${op.insertIndex}`,
              }
            : outlineResult;
        } else {
          const catResult = tryMcpMoveTaskInCategories(
            current.categories,
            visibleRows,
            op.taskId,
            op.targetGroupId,
            op.insertIndex,
          );
          result = catResult.ok
            ? {
                ok: true,
                document: {
                  ...current,
                  categories: catResult.document.categories,
                },
                movedTo: `task:${catResult.movedTo.targetGroupId}:${catResult.movedTo.insertIndex}`,
              }
            : catResult;
        }
        break;
      }
      default:
        result = { ok: false, message: "未知の計画の操作です。" };
    }
    if (!result.ok) return result;
    current = coerceOutlineStorageDocument(result.document);
    if (result.movedTo != null) movedTo = result.movedTo;
  }
  return { ok: true, document: coerceOutlineStorageDocument(current), movedTo };
}

export function parseMcpEditPlanOps(
  envelope: Record<string, unknown>,
): { ok: true; ops: McpEditPlanOp[] } | { ok: false; message: string } {
  const raw = envelope.ops;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, message: "ops に計画の操作を配列で渡してください。" };
  }
  const ops: McpEditPlanOp[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, message: "ops の各要素はオブジェクトにしてください。" };
    }
    const op = item as Record<string, unknown>;
    const type = op.type;
    if (type === "setTaskDates") {
      if (
        typeof op.taskId !== "string" ||
        typeof op.start !== "string" ||
        typeof op.end !== "string"
      ) {
        return {
          ok: false,
          message: "setTaskDates には taskId、start、end が要ります。",
        };
      }
      ops.push({ type, taskId: op.taskId, start: op.start, end: op.end });
    } else if (type === "setAssigneeIds") {
      if (typeof op.taskId !== "string" || !Array.isArray(op.assigneeIds)) {
        return {
          ok: false,
          message: "setAssigneeIds には taskId と assigneeIds が要ります。",
        };
      }
      ops.push({
        type,
        taskId: op.taskId,
        assigneeIds: op.assigneeIds.filter(
          (id): id is string => typeof id === "string",
        ),
      });
    } else if (type === "setPredecessors") {
      if (typeof op.taskId !== "string" || !Array.isArray(op.predecessors)) {
        return {
          ok: false,
          message: "setPredecessors には taskId と predecessors が要ります。",
        };
      }
      ops.push({
        type,
        taskId: op.taskId,
        predecessors: op.predecessors.filter(
          (id): id is string => typeof id === "string",
        ),
      });
    } else if (type === "moveTask") {
      if (
        typeof op.taskId !== "string" ||
        typeof op.targetGroupId !== "string" ||
        typeof op.insertIndex !== "number" ||
        !Number.isInteger(op.insertIndex)
      ) {
        return {
          ok: false,
          message: "moveTask には taskId、targetGroupId、insertIndex が要ります。",
        };
      }
      ops.push({
        type,
        taskId: op.taskId,
        targetGroupId: op.targetGroupId,
        insertIndex: op.insertIndex,
      });
    } else if (type === "moveCategory") {
      if (
        typeof op.categoryId !== "string" ||
        typeof op.insertIndex !== "number" ||
        !Number.isInteger(op.insertIndex)
      ) {
        return {
          ok: false,
          message: "moveCategory には categoryId と insertIndex が要ります。",
        };
      }
      ops.push({ type, categoryId: op.categoryId, insertIndex: op.insertIndex });
    } else if (type === "moveGroup") {
      if (
        typeof op.groupId !== "string" ||
        typeof op.targetCategoryId !== "string" ||
        typeof op.insertIndex !== "number" ||
        !Number.isInteger(op.insertIndex)
      ) {
        return {
          ok: false,
          message: "moveGroup には groupId、targetCategoryId、insertIndex が要ります。",
        };
      }
      ops.push({
        type,
        groupId: op.groupId,
        targetCategoryId: op.targetCategoryId,
        insertIndex: op.insertIndex,
      });
    } else if (
      type === "deleteTask" ||
      type === "deleteCategory" ||
      type === "deleteGroup"
    ) {
      const idKey =
        type === "deleteTask"
          ? "taskId"
          : type === "deleteCategory"
            ? "categoryId"
            : "groupId";
      if (typeof op[idKey] !== "string") {
        return { ok: false, message: `${type} には ${idKey} が要ります。` };
      }
      ops.push({ type, [idKey]: op[idKey] } as McpEditPlanDeleteOp);
    } else if (type === "deleteOutlineHeading") {
      if (typeof op.branchId !== "string") {
        return {
          ok: false,
          message: "deleteOutlineHeading には branchId が要ります。",
        };
      }
      ops.push({ type, branchId: op.branchId });
    } else {
      return { ok: false, message: "未知の計画の操作です。" };
    }
  }
  return { ok: true, ops };
}
