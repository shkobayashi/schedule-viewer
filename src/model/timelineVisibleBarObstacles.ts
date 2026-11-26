import { parseDate } from "./dates";
import type { Rect } from "./dragDates";
import { summaryBarWidthPx } from "./summary";
import { taskBarWidthPx } from "./timeline";
import type { ScheduleId, VisibleRow } from "./types";

/** ドラッグ中日付チップの障害物になる、見えているバーの矩形。 */
export function timelineVisibleBarObstacles(input: {
  rows: VisibleRow[];
  scrollY: number;
  rowHeight: number;
  barHeight: number;
  bodyHeight: number;
  dateToX: (d: Date) => number;
  pxPerDay: number;
  skipTaskIds: ReadonlySet<ScheduleId>;
}): Rect[] {
  const {
    rows,
    scrollY,
    rowHeight,
    barHeight,
    bodyHeight,
    dateToX,
    pxPerDay,
    skipTaskIds,
  } = input;
  const rects: Rect[] = [];
  for (const row of rows) {
    const y = row.y - scrollY;
    if (y + rowHeight < 0 || y > bodyHeight) continue;
    if (row.type !== "task") {
      if (row.summary == null) continue;
      const placed = summaryBarWidthPx(
        row.summary.start,
        row.summary.end,
        dateToX,
        6,
      );
      const height = Math.max(4, Math.round(barHeight / 2));
      rects.push({
        x: placed.x,
        y: y + (rowHeight - height) / 2,
        width: placed.width,
        height,
      });
      continue;
    }
    if (skipTaskIds.has(row.task.id)) continue;
    const x = dateToX(parseDate(row.task.start));
    const top = y + (rowHeight - barHeight) / 2;
    rects.push({
      x,
      y: top,
      width: taskBarWidthPx(row.task, dateToX, pxPerDay),
      height: barHeight,
    });
  }
  return rects;
}
