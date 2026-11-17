import type { ChartTaskAnchor } from "./chartHitTest";
import type { DragDatePreview } from "./dragDates";
import { taskBarAnchorInBody } from "./taskBarLayout";
import type { ScheduleId, Task, VisibleRow } from "./types";

export type TimelineLiveAnchor = ChartTaskAnchor & { linkRight: number };

function anchorWithLinkRight(anchor: ChartTaskAnchor): TimelineLiveAnchor {
  return {
    ...anchor,
    linkRight: Math.max(anchor.x + 6, anchor.right),
  };
}

/** ドラッグプレビューなしのタスク棒アンカー（チャート本体座標）。 */
export function buildTimelineTaskAnchors(input: {
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  skipRow?: (row: VisibleRow) => boolean;
}): Map<ScheduleId, TimelineLiveAnchor> {
  const byId = new Map<ScheduleId, TimelineLiveAnchor>();
  for (const row of input.visibleRows) {
    if (row.type !== "task") continue;
    if (input.skipRow?.(row)) continue;
    const anchor = taskBarAnchorInBody({
      task: row.task,
      viewportRowTop: row.y - input.scrollY,
      rowHeight: input.rowHeight,
      barHeight: input.barHeight,
      pxPerDay: input.pxPerDay,
      dateToX: input.dateToX,
    });
    byId.set(row.task.id, anchorWithLinkRight(anchor));
  }
  return byId;
}

/** ドラッグ中のプレビュー位置で上書きした live アンカー。 */
export function applyDragPreviewsToTimelineAnchors(input: {
  taskAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
  dragPreviews: readonly DragDatePreview[] | null;
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
}): Map<ScheduleId, TimelineLiveAnchor> {
  if (input.dragPreviews == null || input.dragPreviews.length === 0) {
    return new Map(input.taskAnchors);
  }
  const next = new Map(input.taskAnchors);
  for (const preview of input.dragPreviews) {
    const row = input.visibleRows.find(
      (r): r is VisibleRow & { type: "task" } =>
        r.type === "task" && r.task.id === preview.taskId,
    );
    if (row == null) continue;
    const anchor = taskBarAnchorInBody({
      task: row.task as Task,
      viewportRowTop: row.y - input.scrollY,
      rowHeight: input.rowHeight,
      barHeight: input.barHeight,
      pxPerDay: input.pxPerDay,
      dateToX: input.dateToX,
      barLeft: preview.barLeft,
      barWidth: preview.barWidth,
    });
    next.set(preview.taskId, anchorWithLinkRight(anchor));
  }
  return next;
}
