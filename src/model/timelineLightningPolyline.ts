import { parseDate } from "./dates";
import { isExplanationTrialVisibleRow } from "./explainOverlayPatterns";
import { lightningDate } from "./timeline";
import type { StatusItem } from "./statusCatalog";
import type { VisibleRow } from "./types";

/** イナズマ線の Konva polyline 用座標列（x,y 交互）。 */
export function buildTimelineLightningPolyline(input: {
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  today: string;
  todayDate: Date;
  statuses: readonly StatusItem[];
  dateToX: (d: Date) => number;
}): number[] {
  const tx = input.dateToX(input.todayDate);
  const points = [tx, 0];
  for (const row of input.visibleRows) {
    if (row.type === "task" && isExplanationTrialVisibleRow(row)) continue;
    const y = row.y - input.scrollY + input.rowHeight / 2;
    const x =
      row.type === "task"
        ? input.dateToX(parseDate(lightningDate(row.task, input.today, input.statuses)))
        : tx;
    points.push(x, y);
  }
  points.push(tx, input.bodyHeight);
  return points;
}
