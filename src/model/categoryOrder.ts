import type { Category, ScheduleId, VisibleRow } from "./types";

export type CategorySpan = {
  id: ScheduleId;
  y: number;
  endY: number;
};

/** 絞り込みや系統でカテゴリが隠れていなければ、各カテゴリの縦範囲を文書の順で返す。 */
export function visibleCategorySpans(
  categories: Category[],
  visibleRows: readonly VisibleRow[],
  rowHeight: number,
): CategorySpan[] | null {
  const categoryRows = visibleRows.filter(
    (row): row is Extract<VisibleRow, { type: "category" }> => row.type === "category",
  );
  if (categoryRows.length !== categories.length) return null;
  for (let index = 0; index < categories.length; index += 1) {
    if (categoryRows[index].id !== categories[index].id) return null;
  }
  let contentEnd = 0;
  for (const row of visibleRows) {
    contentEnd = Math.max(contentEnd, row.y + rowHeight);
  }
  return categoryRows.map((row, index) => ({
    id: row.id,
    y: row.y,
    endY: index + 1 < categoryRows.length ? categoryRows[index + 1].y : contentEnd,
  }));
}

export function canReorderCategory(
  categories: Category[],
  categoryId: ScheduleId,
  visibleRows: readonly VisibleRow[],
  rowHeight: number,
): boolean {
  if (!categories.some((category) => category.id === categoryId)) return false;
  return visibleCategorySpans(categories, visibleRows, rowHeight) != null;
}

/** ドラッグ中のカテゴリを除き、内容座標の y から挿入位置を返す。 */
export function insertIndexForCategoryReorder(
  contentY: number,
  spans: readonly CategorySpan[],
  draggedCategoryId: ScheduleId,
): number {
  let insert = 0;
  for (const span of spans) {
    if (span.id === draggedCategoryId) continue;
    const mid = (span.y + span.endY) / 2;
    if (contentY >= mid) insert += 1;
  }
  return insert;
}

export function categoryBand(
  spans: readonly CategorySpan[],
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

export function isContentYInCategoryBand(
  contentY: number,
  band: { minY: number; maxY: number },
): boolean {
  return contentY >= band.minY && contentY < band.maxY;
}

/** 挿入位置にあるカテゴリの上端 y。末尾のときは最後のカテゴリの下端。 */
export function categoryInsertMarkerY(
  insertIndex: number,
  spans: readonly CategorySpan[],
): number | null {
  if (spans.length === 0) return null;
  const ordered = [...spans].sort((a, b) => a.y - b.y);
  if (insertIndex <= 0) return ordered[0].y;
  if (insertIndex >= ordered.length) return ordered[ordered.length - 1].endY;
  return ordered[insertIndex].y;
}

export function categoryIndex(
  categories: Category[],
  categoryId: ScheduleId,
): number | null {
  const index = categories.findIndex((category) => category.id === categoryId);
  return index < 0 ? null : index;
}
