import { findTaskOwner } from "./tasks";
import type { Category, ScheduleId, VisibleRow } from "./types";

export type TaskDropTarget = {
  targetGroupId: ScheduleId;
  insertIndex: number;
};

export const REORDER_DRAG_THRESHOLD_PX = 3;

export type HandleDragGesture = "pending" | "reorder" | "ignore";

/** 握りの移動で、まだ動かない・並べ替え・無視のどれにするかを返す。 */
export function classifyHandleDrag(
  dx: number,
  dy: number,
  canReorder: boolean,
): HandleDragGesture {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx <= REORDER_DRAG_THRESHOLD_PX && ady <= REORDER_DRAG_THRESHOLD_PX) {
    return "pending";
  }
  return canReorder ? "reorder" : "ignore";
}

/** 絞り込みや系統で兄弟が隠れていなければ、グループ内のタスク行を返す。 */
export function visibleGroupTaskRows(
  categories: Category[],
  groupId: ScheduleId,
  visibleRows: readonly VisibleRow[],
): { id: ScheduleId; y: number }[] | null {
  let expected: ScheduleId[] | null = null;
  for (const category of categories) {
    for (const group of category.groups) {
      if (group.id !== groupId) continue;
      expected = group.tasks.map((task) => task.id);
    }
  }
  if (expected == null) return null;

  const fromVisible: { id: ScheduleId; y: number }[] = [];
  for (const row of visibleRows) {
    if (row.type !== "task") continue;
    const owner = findTaskOwner(categories, row.task.id);
    if (owner?.groupId !== groupId) continue;
    fromVisible.push({ id: row.task.id, y: row.y });
  }
  if (fromVisible.length !== expected.length) return null;
  for (let index = 0; index < expected.length; index += 1) {
    if (fromVisible[index].id !== expected[index]) return null;
  }
  return fromVisible;
}

export function canReorderTaskInGroup(
  categories: Category[],
  taskId: ScheduleId,
  visibleRows: readonly VisibleRow[],
): boolean {
  const owner = findTaskOwner(categories, taskId);
  if (owner == null) return false;
  return visibleGroupTaskRows(categories, owner.groupId, visibleRows) != null;
}

function groupTaskCount(categories: Category[], groupId: ScheduleId): number {
  for (const category of categories) {
    for (const group of category.groups) {
      if (group.id === groupId) return group.tasks.length;
    }
  }
  return 0;
}

/** タスクの移動先として選べるグループが、行にすべて出ているか。 */
export function visibleGroupForTaskDrop(
  categories: Category[],
  groupId: ScheduleId,
  visibleRows: readonly VisibleRow[],
): boolean {
  if (groupTaskCount(categories, groupId) === 0) {
    return visibleRows.some(
      (row) => row.type === "group" && row.id === groupId,
    );
  }
  return visibleGroupTaskRows(categories, groupId, visibleRows) != null;
}

export function resolveTaskDropTarget(
  contentY: number,
  rowHeight: number,
  taskId: ScheduleId,
  categories: Category[],
  visibleRows: readonly VisibleRow[],
): TaskDropTarget | null {
  const owner = findTaskOwner(categories, taskId);
  if (owner == null) return null;
  if (!visibleGroupTaskRows(categories, owner.groupId, visibleRows)) return null;

  for (const row of visibleRows) {
    if (contentY < row.y || contentY >= row.y + rowHeight) continue;
    if (row.type === "group") {
      if (row.collapsed) return null;
      if (!visibleGroupForTaskDrop(categories, row.id, visibleRows)) return null;
      return { targetGroupId: row.id, insertIndex: 0 };
    }
    if (row.type === "task") {
      const taskOwner = findTaskOwner(categories, row.task.id);
      if (taskOwner == null) return null;
      if (!visibleGroupForTaskDrop(categories, taskOwner.groupId, visibleRows)) {
        return null;
      }
      const groupRows = visibleGroupTaskRows(
        categories,
        taskOwner.groupId,
        visibleRows,
      );
      if (groupRows == null) return null;
      if (taskOwner.groupId === owner.groupId) {
        return {
          targetGroupId: taskOwner.groupId,
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
      return { targetGroupId: taskOwner.groupId, insertIndex };
    }
  }
  return null;
}

/** ドラッグ中のタスクを除き、内容座標の y から挿入位置を返す。 */
export function insertIndexForReorder(
  contentY: number,
  rowHeight: number,
  groupRows: readonly { id: ScheduleId; y: number }[],
  draggedTaskId: ScheduleId,
): number {
  const others = groupRows
    .filter((row) => row.id !== draggedTaskId)
    .sort((a, b) => a.y - b.y);
  let insert = 0;
  for (const row of others) {
    if (contentY >= row.y + rowHeight / 2) insert += 1;
  }
  return insert;
}

export function groupTaskBand(
  groupRows: readonly { id: ScheduleId; y: number }[],
  rowHeight: number,
): { minY: number; maxY: number } | null {
  if (groupRows.length === 0) return null;
  const ys = groupRows.map((row) => row.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minY, maxY: maxY + rowHeight };
}

export function isContentYInGroupTaskBand(
  contentY: number,
  band: { minY: number; maxY: number },
): boolean {
  return contentY >= band.minY && contentY < band.maxY;
}

/** 挿入位置の上端 y（プレビュー用の線）。 */
export function insertMarkerY(
  insertIndex: number,
  rowHeight: number,
  previewGroupRows: readonly { y: number }[],
): number | null {
  const ordered = [...previewGroupRows].sort((a, b) => a.y - b.y);
  if (ordered.length === 0) return null;
  if (insertIndex <= 0) return ordered[0].y;
  if (insertIndex >= ordered.length) {
    return ordered[ordered.length - 1].y + rowHeight;
  }
  return ordered[insertIndex].y;
}

export function taskIndexInGroup(
  categories: Category[],
  taskId: ScheduleId,
): number | null {
  const owner = findTaskOwner(categories, taskId);
  if (owner == null) return null;
  for (const category of categories) {
    if (category.id !== owner.categoryId) continue;
    for (const group of category.groups) {
      if (group.id !== owner.groupId) continue;
      const index = group.tasks.findIndex((task) => task.id === taskId);
      return index < 0 ? null : index;
    }
  }
  return null;
}
