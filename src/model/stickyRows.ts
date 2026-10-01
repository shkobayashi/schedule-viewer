import type { VisibleRow } from "./types";

/** 固定段に描く1行。`top` はビューポート上端で、負になることがある。 */
export type StickyDraw = {
  index: number;
  top: number;
  clipTop: number;
  clipBottom: number;
};

/** スクロール層から外す行と、その下を描き始める y。 */
export type StickyLayout = {
  draws: StickyDraw[];
  hiddenIndexes: number[];
  clipTop: number;
};

const EMPTY_LAYOUT: StickyLayout = {
  draws: [],
  hiddenIndexes: [],
  clipTop: 0,
};

type CategorySpan = {
  index: number;
  y: number;
  /** 次のカテゴリ行の添え字。末尾なら行数。 */
  end: number;
};

type GroupSpan = {
  index: number;
  y: number;
  lastTaskBottom: number;
};

/**
 * 展開中で配下がまだ下に残るカテゴリとグループを、上端へ最大2行残す。
 * 行が画面に収まるときと、残す行が無いときは描かない。
 */
export function layoutStickyHeaders(
  rows: readonly VisibleRow[],
  scrollY: number,
  rowHeight: number,
  viewportHeight: number,
): StickyLayout {
  if (rows.length === 0 || rowHeight <= 0) return EMPTY_LAYOUT;
  const contentHeight = rows[rows.length - 1].y + rowHeight;
  if (contentHeight <= viewportHeight) return EMPTY_LAYOUT;

  const category = currentCategory(rows, scrollY, rowHeight);
  if (category == null) return EMPTY_LAYOUT;

  const draws: StickyDraw[] = [];
  const hiddenIndexes: number[] = [];
  const nextCategory = nextExpandedCategory(rows, category.index);
  if (nextCategory != null) {
    const nextTop = nextCategory.y - scrollY;
    if (nextTop > 0 && nextTop < rowHeight) {
      draws.push({
        index: category.index,
        top: nextTop - rowHeight,
        clipTop: 0,
        clipBottom: nextTop,
      });
      draws.push({
        index: nextCategory.index,
        top: nextTop,
        clipTop: nextTop,
        clipBottom: rowHeight,
      });
      hiddenIndexes.push(category.index, nextCategory.index);
    } else {
      pushSlot(draws, hiddenIndexes, category.index, 0, rowHeight);
    }
  } else {
    pushSlot(draws, hiddenIndexes, category.index, 0, rowHeight);
  }

  const group = currentGroup(rows, category, scrollY, rowHeight);
  if (group != null) {
    const nextGroup = nextCandidateGroup(rows, category, group.index, rowHeight);
    if (nextGroup != null) {
      const nextTop = nextGroup.y - scrollY;
      if (nextTop > rowHeight && nextTop < rowHeight * 2) {
        draws.push({
          index: group.index,
          top: nextTop - rowHeight,
          clipTop: rowHeight,
          clipBottom: nextTop,
        });
        draws.push({
          index: nextGroup.index,
          top: nextTop,
          clipTop: nextTop,
          clipBottom: nextTop + rowHeight,
        });
        hiddenIndexes.push(group.index, nextGroup.index);
      } else {
        pushSlot(draws, hiddenIndexes, group.index, rowHeight, rowHeight * 2);
      }
    } else {
      pushSlot(draws, hiddenIndexes, group.index, rowHeight, rowHeight * 2);
    }
  }

  const clipTop = draws.reduce((max, draw) => Math.max(max, draw.clipBottom), 0);
  return { draws, hiddenIndexes, clipTop };
}

/**
 * タスクの上端が固定段の下に来る scrollY。
 * 収まる一覧では taskY を返す。0 未満にはしない。
 */
export function scrollYToRevealTask(
  rows: readonly VisibleRow[],
  taskY: number,
  rowHeight: number,
  viewportHeight: number,
): number {
  let scrollY = taskY;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const layout = layoutStickyHeaders(rows, scrollY, rowHeight, viewportHeight);
    if (taskY - scrollY >= layout.clipTop) return scrollY;
    scrollY = Math.max(0, taskY - layout.clipTop);
  }
  return scrollY;
}

function pushSlot(
  draws: StickyDraw[],
  hiddenIndexes: number[],
  index: number,
  top: number,
  bottom: number,
) {
  draws.push({ index, top, clipTop: top, clipBottom: bottom });
  hiddenIndexes.push(index);
}

function sectionEnd(rows: readonly VisibleRow[], categoryIndex: number): number {
  for (let index = categoryIndex + 1; index < rows.length; index += 1) {
    if (rows[index].type === "category") return index;
  }
  return rows.length;
}

function currentCategory(
  rows: readonly VisibleRow[],
  scrollY: number,
  rowHeight: number,
): CategorySpan | null {
  let found: CategorySpan | null = null;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.type !== "category" || row.collapsed) continue;
    const end = sectionEnd(rows, index);
    const lastBottom = rows[end - 1].y + rowHeight;
    if (lastBottom <= scrollY) continue;
    if (row.y > scrollY) break;
    if (row.y < scrollY || scrollY > 0) {
      found = { index, y: row.y, end };
    }
  }
  return found;
}

function nextExpandedCategory(
  rows: readonly VisibleRow[],
  afterIndex: number,
): { index: number; y: number } | null {
  for (let index = afterIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.type !== "category" || row.collapsed) continue;
    return { index, y: row.y };
  }
  return null;
}

function candidateGroups(
  rows: readonly VisibleRow[],
  start: number,
  end: number,
  rowHeight: number,
): GroupSpan[] {
  const groups: GroupSpan[] = [];
  for (let index = start; index < end; index += 1) {
    const row = rows[index];
    if (row.type !== "group" || row.collapsed) continue;
    const lastTaskBottom = lastTaskBottomInGroup(rows, index, end, rowHeight);
    if (lastTaskBottom == null) continue;
    groups.push({ index, y: row.y, lastTaskBottom });
  }
  return groups;
}

function lastTaskBottomInGroup(
  rows: readonly VisibleRow[],
  groupIndex: number,
  sectionEndIndex: number,
  rowHeight: number,
): number | null {
  let last: number | null = null;
  for (let index = groupIndex + 1; index < sectionEndIndex; index += 1) {
    const row = rows[index];
    if (row.type === "group" || row.type === "category") break;
    if (row.type === "task") last = row.y + rowHeight;
  }
  return last;
}

function currentGroup(
  rows: readonly VisibleRow[],
  category: CategorySpan,
  scrollY: number,
  rowHeight: number,
): GroupSpan | null {
  const groups = candidateGroups(rows, category.index + 1, category.end, rowHeight);
  const slotTop = scrollY + rowHeight;
  let found: GroupSpan | null = null;
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const hasNext = index + 1 < groups.length;
    if (hasNext && group.lastTaskBottom <= slotTop) continue;
    if (group.y > slotTop) break;
    if (group.y < slotTop || scrollY > 0) found = group;
  }
  return found;
}

function nextCandidateGroup(
  rows: readonly VisibleRow[],
  category: CategorySpan,
  afterIndex: number,
  rowHeight: number,
): GroupSpan | null {
  const groups = candidateGroups(rows, category.index + 1, category.end, rowHeight);
  return groups.find((group) => group.index > afterIndex) ?? null;
}
