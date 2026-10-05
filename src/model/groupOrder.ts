import { canMoveGroupToCategory } from "./tasks";
import type { Category, ScheduleId, VisibleRow } from "./types";

export type GroupSpan = {
  id: ScheduleId;
  y: number;
  endY: number;
};

export function categoryIdOfGroup(
  categories: Category[],
  groupId: ScheduleId,
): ScheduleId | null {
  for (const category of categories) {
    if (category.groups.some((group) => group.id === groupId)) return category.id;
  }
  return null;
}

export function groupIndex(
  categories: Category[],
  groupId: ScheduleId,
): number | null {
  for (const category of categories) {
    const index = category.groups.findIndex((group) => group.id === groupId);
    if (index >= 0) return index;
  }
  return null;
}

/** 絞り込みや系統で同じカテゴリのグループが隠れていなければ、各グループの縦範囲を文書の順で返す。 */
export function visibleGroupSpans(
  categories: Category[],
  categoryId: ScheduleId,
  visibleRows: readonly VisibleRow[],
  rowHeight: number,
): GroupSpan[] | null {
  const category = categories.find((item) => item.id === categoryId);
  if (category == null) return null;
  const groupRows = visibleRows.filter(
    (row): row is Extract<VisibleRow, { type: "group" }> =>
      row.type === "group" && row.categoryId === categoryId,
  );
  if (groupRows.length !== category.groups.length) return null;
  for (let index = 0; index < category.groups.length; index += 1) {
    if (groupRows[index].id !== category.groups[index].id) return null;
  }
  const boundary = categoryGroupBoundary(categoryId, visibleRows, rowHeight);
  return groupRows.map((row, index) => ({
    id: row.id,
    y: row.y,
    endY: index + 1 < groupRows.length ? groupRows[index + 1].y : boundary,
  }));
}

function categoryGroupBoundary(
  categoryId: ScheduleId,
  visibleRows: readonly VisibleRow[],
  rowHeight: number,
): number {
  let contentEnd = 0;
  for (const row of visibleRows) {
    contentEnd = Math.max(contentEnd, row.y + rowHeight);
  }
  const categoryIndex = visibleRows.findIndex(
    (row) => row.type === "category" && row.id === categoryId,
  );
  if (categoryIndex < 0) return contentEnd;
  for (let index = categoryIndex + 1; index < visibleRows.length; index += 1) {
    const row = visibleRows[index];
    if (row.type === "category") return row.y;
  }
  return contentEnd;
}

export function canReorderGroup(
  categories: Category[],
  groupId: ScheduleId,
  visibleRows: readonly VisibleRow[],
  rowHeight: number,
): boolean {
  const categoryId = categoryIdOfGroup(categories, groupId);
  if (categoryId == null) return false;
  return visibleGroupSpans(categories, categoryId, visibleRows, rowHeight) != null;
}

export type GroupDropTarget = {
  targetCategoryId: ScheduleId;
  insertIndex: number;
};

export function resolveGroupDropTarget(
  contentY: number,
  rowHeight: number,
  draggedGroupId: ScheduleId,
  categories: Category[],
  visibleRows: readonly VisibleRow[],
): GroupDropTarget | null {
  const sourceCategoryId = categoryIdOfGroup(categories, draggedGroupId);
  if (sourceCategoryId == null) return null;
  if (!visibleGroupSpans(categories, sourceCategoryId, visibleRows, rowHeight)) {
    return null;
  }
  for (const category of categories) {
    const spans = visibleGroupSpans(
      categories,
      category.id,
      visibleRows,
      rowHeight,
    );
    if (spans == null) continue;
    const band = groupBand(spans);
    if (band == null || !isContentYInGroupBand(contentY, band)) continue;
    if (!canMoveGroupToCategory(categories, draggedGroupId, category.id)) {
      return null;
    }
    const insertIndex = insertIndexForGroupReorder(
      contentY,
      spans,
      draggedGroupId,
    );
    return { targetCategoryId: category.id, insertIndex };
  }
  return null;
}

/** ドラッグ中のグループを除き、内容座標の y から挿入位置を返す。 */
export function insertIndexForGroupReorder(
  contentY: number,
  spans: readonly GroupSpan[],
  draggedGroupId: ScheduleId,
): number {
  let insert = 0;
  for (const span of spans) {
    if (span.id === draggedGroupId) continue;
    const mid = (span.y + span.endY) / 2;
    if (contentY >= mid) insert += 1;
  }
  return insert;
}

export function groupBand(
  spans: readonly GroupSpan[],
): { minY: number; maxY: number } | null {
  if (spans.length === 0) return null;
  let minY = spans[0].y;
  let maxY = spans[0].endY;
  for (const span of spans) {
    minY = Math.min(minY, span.y);
    maxY = Math.max(maxY, span.endY);
  }
  return { minY, maxY };
}

export function isContentYInGroupBand(
  contentY: number,
  band: { minY: number; maxY: number },
): boolean {
  return contentY >= band.minY && contentY < band.maxY;
}

/** 挿入位置にあるグループの上端 y。末尾のときは最後のグループの下端。 */
export function groupInsertMarkerY(
  insertIndex: number,
  spans: readonly GroupSpan[],
): number | null {
  if (spans.length === 0) return null;
  const ordered = [...spans].sort((a, b) => a.y - b.y);
  if (insertIndex <= 0) return ordered[0].y;
  if (insertIndex >= ordered.length) return ordered[ordered.length - 1].endY;
  return ordered[insertIndex].y;
}
