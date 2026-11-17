import type { ReactNode } from "react";
import { Line, Rect } from "react-konva";
import { rowFillForColorId, type ColorItem } from "../../model/colorCatalog";
import type { CalendarDocument } from "../../model/calendarTypes";
import type { ChartPalette, ResolvedColorScheme } from "../../model/palette";
import type { VisibleRow } from "../../model/types";
import { buildTimelineBodyColumnNodes } from "./TimelineBodyGrid";

export function buildTimelineBodyBackgroundContent(input: {
  visibleRows: readonly VisibleRow[];
  stickyHidden: ReadonlySet<number>;
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  width: number;
  tier: "day" | "week" | "month";
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  dayStart: number;
  dayEnd: number;
  dateToX: (d: Date) => number;
  pxPerDay: number;
  calendar: CalendarDocument | null;
  chart: ChartPalette;
  rowColors: readonly ColorItem[] | null;
  colorScheme: ResolvedColorScheme;
}): ReactNode[] {
  const elements: ReactNode[] = [];
  const height = input.bodyHeight;

  for (let index = 0; index < input.visibleRows.length; index += 1) {
    if (input.stickyHidden.has(index)) continue;
    const row = input.visibleRows[index];
    if (row.type !== "task") continue;
    const fill = rowFillForColorId(
      input.rowColors,
      row.task.colorId,
      input.colorScheme,
    );
    if (fill == null) continue;
    const y = row.y - input.scrollY;
    if (y + input.rowHeight < 0 || y > height) continue;
    elements.push(
      <Rect
        key={`row-fill-${row.task.id}`}
        x={0}
        y={y}
        width={input.width}
        height={input.rowHeight}
        fill={fill}
        listening={false}
      />,
    );
  }

  elements.push(
    ...buildTimelineBodyColumnNodes({
      keyPrefix: "",
      width: input.width,
      height,
      tier: input.tier,
      timelineStart: input.timelineStart,
      timelineEnd: input.timelineEnd,
      totalDays: input.totalDays,
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      dateToX: input.dateToX,
      pxPerDay: input.pxPerDay,
      calendar: input.calendar,
      chart: input.chart,
    }),
  );

  for (let index = 0; index < input.visibleRows.length; index += 1) {
    if (input.stickyHidden.has(index)) continue;
    const row = input.visibleRows[index];
    const y = row.y - input.scrollY + input.rowHeight;
    if (y < 0 || y > height) continue;
    elements.push(
      <Line
        key={`hr-${row.y}`}
        points={[0, y, input.width, y]}
        stroke={input.chart.rowBorder}
        strokeWidth={1}
        listening={false}
      />,
    );
  }

  return elements;
}
