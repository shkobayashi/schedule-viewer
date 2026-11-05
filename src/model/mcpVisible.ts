import { addDays, isoDate, isoDateAtChartX } from "./dates";
import { isOutlineBranch, isTaskNode } from "./hierarchy";
import { layoutStickyHeaders } from "./stickyRows";
import { findTaskOwner } from "./tasks";
import {
  categoryCollapseKey,
  groupCollapseKey,
  hierarchyCollapseKey,
} from "./rows";
import { isExplanationTrialVisibleRow } from "./explainOverlayTrialVisible";
import type { Category, OutlineRoot, ScheduleId, VisibleRow } from "./types";

export type McpVisibleDates = {
  start: string;
  end: string;
};

export type McpVisibleRowKind = "category" | "group" | "heading" | "task";

export type McpVisibleRowEntry = {
  kind: McpVisibleRowKind;
  id: ScheduleId;
  name: string;
  trial?: true;
};

export type McpViewVisible = {
  dates: McpVisibleDates | null;
  rows: McpVisibleRowEntry[];
};

export type McpTaskVisibility = "visible" | "collapsed" | "scrolledOut";

export type McpViewportForReadTools = {
  timelineStart: Date;
  totalDays: number;
  scrollX: number;
  pxPerDay: number;
  chartWidth: number;
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  visibleRows: readonly VisibleRow[];
};

export function rowIntersectsViewport(
  rowY: number,
  rowHeight: number,
  scrollY: number,
  viewportHeight: number,
): boolean {
  if (!(rowHeight > 0) || !(viewportHeight > 0)) return false;
  return rowY + rowHeight > scrollY && rowY < scrollY + viewportHeight;
}

/** チャート横方向に見えている暦日。右端が日境界のときその日は含めない。幅 0 のとき null。 */
export function mcpVisibleDates(input: {
  timelineStart: Date;
  totalDays: number;
  scrollX: number;
  pxPerDay: number;
  chartWidth: number;
}): McpVisibleDates | null {
  const { timelineStart, totalDays, scrollX, pxPerDay, chartWidth } = input;
  if (!(chartWidth > 0) || !(pxPerDay > 0) || !(totalDays > 0)) {
    return null;
  }
  const start = isoDateAtChartX(
    timelineStart,
    scrollX,
    pxPerDay,
    0,
    totalDays,
  );
  if (!start) return null;
  const rightEdge = scrollX + chartWidth;
  const startIndex = Math.floor(scrollX / pxPerDay + 1e-6);
  let endIndex = Math.floor((rightEdge - 1e-9) / pxPerDay);
  const dayAtRight = rightEdge / pxPerDay;
  if (
    Math.abs(dayAtRight - Math.round(dayAtRight)) < 1e-6 &&
    rightEdge > scrollX
  ) {
    endIndex = Math.round(dayAtRight) - 1;
  }
  endIndex = Math.min(endIndex, totalDays);
  if (endIndex < startIndex) return null;
  return { start, end: isoDate(addDays(timelineStart, endIndex)) };
}

function visibleRowEntry(row: VisibleRow): McpVisibleRowEntry {
  switch (row.type) {
    case "category":
      return { kind: "category", id: row.id, name: row.label };
    case "group":
      return { kind: "group", id: row.id, name: row.label };
    case "hierarchy":
      return { kind: "heading", id: row.id, name: row.label };
    case "task":
      return {
        kind: "task",
        id: row.task.id,
        name: row.task.name,
        ...(isExplanationTrialVisibleRow(row) ? { trial: true as const } : {}),
      };
  }
}

/** 縦に掛る行と固定見出し。畳んだ中の行は visibleRows に無い。 */
export function mcpVisibleRows(input: {
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
}): McpVisibleRowEntry[] {
  const { visibleRows, scrollY, rowHeight, bodyHeight } = input;
  if (visibleRows.length === 0) return [];
  const indices = new Set<number>();
  for (let index = 0; index < visibleRows.length; index += 1) {
    const row = visibleRows[index];
    if (rowIntersectsViewport(row.y, rowHeight, scrollY, bodyHeight)) {
      indices.add(index);
    }
  }
  const sticky = layoutStickyHeaders(
    visibleRows,
    scrollY,
    rowHeight,
    bodyHeight,
  );
  for (const draw of sticky.draws) {
    indices.add(draw.index);
  }
  const out: McpVisibleRowEntry[] = [];
  for (let index = 0; index < visibleRows.length; index += 1) {
    if (!indices.has(index)) continue;
    out.push(visibleRowEntry(visibleRows[index]));
  }
  return out;
}

export function buildMcpViewVisible(
  viewport: McpViewportForReadTools,
): McpViewVisible {
  return {
    dates: mcpVisibleDates({
      timelineStart: viewport.timelineStart,
      totalDays: viewport.totalDays,
      scrollX: viewport.scrollX,
      pxPerDay: viewport.pxPerDay,
      chartWidth: viewport.chartWidth,
    }),
    rows: mcpVisibleRows({
      visibleRows: viewport.visibleRows,
      scrollY: viewport.scrollY,
      rowHeight: viewport.rowHeight,
      bodyHeight: viewport.bodyHeight,
    }),
  };
}

function outlineAncestorBranchIds(
  outline: OutlineRoot,
  taskId: ScheduleId,
): ScheduleId[] | null {
  const walk = (
    nodes: OutlineRoot,
    ancestors: ScheduleId[],
  ): ScheduleId[] | null => {
    for (const node of nodes) {
      if (isTaskNode(node)) {
        if (node.id === taskId) return ancestors;
        continue;
      }
      if (!isOutlineBranch(node)) continue;
      const found = walk(node.children, [...ancestors, node.id]);
      if (found) return found;
    }
    return null;
  };
  return walk(outline, []);
}

export function taskHiddenByCollapsedAncestors(
  taskId: ScheduleId,
  categories: Category[],
  outline: OutlineRoot | undefined,
  collapsed: ReadonlySet<string>,
): boolean {
  const owner = findTaskOwner(categories, taskId);
  if (owner) {
    if (collapsed.has(categoryCollapseKey(owner.categoryId))) return true;
    if (collapsed.has(groupCollapseKey(owner.groupId))) return true;
    return false;
  }
  if (outline == null || outline.length === 0) return false;
  const ancestors = outlineAncestorBranchIds(outline, taskId);
  if (ancestors == null) return false;
  for (const id of ancestors) {
    if (collapsed.has(hierarchyCollapseKey(id))) return true;
  }
  return false;
}

export function findTaskRowInVisible(
  visibleRows: readonly VisibleRow[],
  taskId: ScheduleId,
): Extract<VisibleRow, { type: "task" }> | null {
  for (const row of visibleRows) {
    if (row.type === "task" && row.task.id === taskId) return row;
  }
  return null;
}

/** 絞り込みで行が無いときは null。 */
export function mcpTaskVisibility(input: {
  taskId: ScheduleId;
  categories: Category[];
  outline: OutlineRoot | undefined;
  collapsed: ReadonlySet<string>;
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
}): McpTaskVisibility | null {
  if (
    taskHiddenByCollapsedAncestors(
      input.taskId,
      input.categories,
      input.outline,
      input.collapsed,
    )
  ) {
    return "collapsed";
  }
  const row = findTaskRowInVisible(input.visibleRows, input.taskId);
  if (row == null) return null;
  if (
    rowIntersectsViewport(
      row.y,
      input.rowHeight,
      input.scrollY,
      input.bodyHeight,
    )
  ) {
    return "visible";
  }
  return "scrolledOut";
}

export function mcpTaskVisibilityContext(input: {
  categories: Category[];
  outline: OutlineRoot | undefined;
  collapsed: ReadonlySet<string>;
  viewport: McpViewportForReadTools;
}) {
  return {
    categories: input.categories,
    outline: input.outline,
    collapsed: input.collapsed,
    visibleRows: input.viewport.visibleRows,
    scrollY: input.viewport.scrollY,
    rowHeight: input.viewport.rowHeight,
    bodyHeight: input.viewport.bodyHeight,
  };
}
