import {
  buildMoveDragPreviews,
  previewDatesForDrag,
  type DragBarGeometry,
  type DragDatePreview,
} from "./dragDates";
import { taskBarWidthPx } from "./timeline";
import type { ScheduleId, VisibleRow } from "./types";

/** TaskBar / ResizeHandles のドラッジ幾何から、表示する日付チップ用プレビュー列。 */
export function buildTimelineDragDatePreviews(input: {
  geometry: DragBarGeometry;
  visibleRows: readonly VisibleRow[];
  selectedTaskIds: ReadonlySet<ScheduleId>;
  timelineStart: Date;
  xToDate: (x: number) => Date;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  scrollY: number;
  rowHeight: number;
  barHeight: number;
}): DragDatePreview[] | null {
  const row = input.visibleRows.find(
    (item) => item.type === "task" && item.task.id === input.geometry.taskId,
  );
  if (!row || row.type !== "task") return null;
  const dates = previewDatesForDrag(
    row.task,
    input.geometry,
    input.timelineStart,
    input.xToDate,
    input.pxPerDay,
  );
  const primary: DragDatePreview = {
    taskId: input.geometry.taskId,
    kind: input.geometry.kind,
    start: dates.start,
    end: dates.end,
    barLeft: input.geometry.barLeft,
    barWidth: input.geometry.barWidth,
    barTop: input.geometry.barTop,
  };
  const taskRows = input.visibleRows.filter(
    (item): item is VisibleRow & { type: "task" } => item.type === "task",
  );
  const multi = buildMoveDragPreviews(
    input.geometry,
    taskRows,
    input.selectedTaskIds,
    input.pxPerDay,
    input.dateToX,
    input.scrollY,
    input.rowHeight,
    input.barHeight,
    (task) => taskBarWidthPx(task, input.dateToX, input.pxPerDay),
  );
  return multi.length > 0 ? multi : [primary];
}
