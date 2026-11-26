import { findOutlineTaskOwner, tasksInOutlineParent } from "./outlineTasks";
import { findTaskOwner } from "./tasks";
import type { Category, OutlineRoot, ScheduleId, VisibleRow } from "./types";
import { insertIndexForReorder } from "./taskOrder";

export type TaskDropTarget = {
  targetGroupId: ScheduleId;
  insertIndex: number;
};

function isTaskParentHeader(
  row: VisibleRow,
): row is Extract<VisibleRow, { type: "group" | "hierarchy" }> {
  if (row.type === "group") return true;
  if (row.type !== "hierarchy") return false;
  return row.rowKind === "taskParent" || row.alsoTaskParent === true;
}

function visibleParentTaskRows(
  outline: OutlineRoot,
  levelCount: number,
  parentBranchId: ScheduleId | null,
  visibleRows: readonly VisibleRow[],
): { id: ScheduleId; y: number }[] | null {
  const expected = tasksInOutlineParent(outline, parentBranchId, levelCount).map(
    (task) => task.id,
  );
  const fromVisible: { id: ScheduleId; y: number }[] = [];
  for (const row of visibleRows) {
    if (row.type !== "task") continue;
    const owner = findOutlineTaskOwner(outline, row.task.id, levelCount);
    if (owner?.parentBranchId !== parentBranchId) continue;
    fromVisible.push({ id: row.task.id, y: row.y });
  }
  if (fromVisible.length !== expected.length) return null;
  for (let index = 0; index < expected.length; index += 1) {
    if (fromVisible[index]?.id !== expected[index]) return null;
  }
  return fromVisible;
}

export function canReorderTaskInOutlineParent(
  outline: OutlineRoot,
  levelCount: number,
  taskId: ScheduleId,
  visibleRows: readonly VisibleRow[],
): boolean {
  const owner = findOutlineTaskOwner(outline, taskId, levelCount);
  if (owner == null) return false;
  return (
    visibleParentTaskRows(
      outline,
      levelCount,
      owner.parentBranchId,
      visibleRows,
    ) != null
  );
}

function visibleParentForOutlineDrop(
  outline: OutlineRoot,
  levelCount: number,
  parentBranchId: ScheduleId | null,
  visibleRows: readonly VisibleRow[],
): boolean {
  if (levelCount === 1) {
    return (
      visibleParentTaskRows(outline, levelCount, null, visibleRows) != null
    );
  }
  if (tasksInOutlineParent(outline, parentBranchId, levelCount).length === 0) {
    return visibleRows.some(
      (row) =>
        isTaskParentHeader(row) && !row.collapsed && row.id === parentBranchId,
    );
  }
  return (
    visibleParentTaskRows(outline, levelCount, parentBranchId, visibleRows) !=
    null
  );
}

export function resolveOutlineTaskDropTarget(
  contentY: number,
  rowHeight: number,
  taskId: ScheduleId,
  outline: OutlineRoot,
  levelCount: number,
  visibleRows: readonly VisibleRow[],
  allowCrossParent: boolean,
): TaskDropTarget | null {
  const owner = findOutlineTaskOwner(outline, taskId, levelCount);
  if (owner == null) return null;
  const parentId = owner.parentBranchId;
  if (
    !visibleParentTaskRows(outline, levelCount, parentId, visibleRows)
  ) {
    return null;
  }

  if (levelCount === 1) {
    const groupRows = visibleParentTaskRows(
      outline,
      levelCount,
      null,
      visibleRows,
    );
    if (groupRows == null) return null;
    return {
      targetGroupId: taskId,
      insertIndex: insertIndexForReorder(
        contentY,
        rowHeight,
        groupRows,
        taskId,
      ),
    };
  }

  for (const row of visibleRows) {
    if (contentY < row.y || contentY >= row.y + rowHeight) continue;
    if (isTaskParentHeader(row)) {
      if (row.collapsed) return null;
      if (!visibleParentForOutlineDrop(outline, levelCount, row.id, visibleRows)) {
        return null;
      }
      if (!allowCrossParent && row.id !== parentId && levelCount > 1) {
        return null;
      }
      return { targetGroupId: row.id, insertIndex: 0 };
    }
    if (row.type === "task") {
      const taskOwner = findOutlineTaskOwner(outline, row.task.id, levelCount);
      if (taskOwner == null) return null;
      const targetParent = taskOwner.parentBranchId;
      if (targetParent == null) continue;
      if (
        !visibleParentForOutlineDrop(
          outline,
          levelCount,
          targetParent,
          visibleRows,
        )
      ) {
        return null;
      }
      if (!allowCrossParent && targetParent !== parentId && levelCount > 1) {
        return null;
      }
      const groupRows = visibleParentTaskRows(
        outline,
        levelCount,
        targetParent,
        visibleRows,
      );
      if (groupRows == null) return null;
      if (targetParent === parentId) {
        return {
          targetGroupId: targetParent,
          insertIndex: insertIndexForReorder(
            contentY,
            rowHeight,
            groupRows,
            taskId,
          ),
        };
      }
      const index = groupRows.findIndex((item) => item.id === row.task.id);
      if (index < 0) return null;
      const mid = row.y + rowHeight / 2;
      const insertIndex = contentY < mid ? index : index + 1;
      return { targetGroupId: targetParent, insertIndex };
    }
  }
  return null;
}

/** レガシー categories 用のラッパー。outline が空なら従来の解決へ。 */
export function resolveTaskDropTargetWithOutline(
  contentY: number,
  rowHeight: number,
  taskId: ScheduleId,
  categories: Category[],
  visibleRows: readonly VisibleRow[],
  outline: OutlineRoot | undefined,
  levelCount: number,
  usesOutline: boolean,
  allowCrossParent: boolean,
  legacyResolve: (
    contentY: number,
    rowHeight: number,
    taskId: ScheduleId,
    categories: Category[],
    visibleRows: readonly VisibleRow[],
  ) => TaskDropTarget | null,
): TaskDropTarget | null {
  if (usesOutline && outline != null && outline.length > 0) {
    return resolveOutlineTaskDropTarget(
      contentY,
      rowHeight,
      taskId,
      outline,
      levelCount,
      visibleRows,
      allowCrossParent,
    );
  }
  if (!allowCrossParent) {
    const owner = findTaskOwner(categories, taskId);
    const target = legacyResolve(
      contentY,
      rowHeight,
      taskId,
      categories,
      visibleRows,
    );
    if (target == null || owner == null) return target;
    if (target.targetGroupId !== owner.groupId) return null;
    return target;
  }
  return legacyResolve(
    contentY,
    rowHeight,
    taskId,
    categories,
    visibleRows,
  );
}
