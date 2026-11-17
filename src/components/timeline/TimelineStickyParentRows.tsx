import type { ReactNode } from "react";
import { Group, Line, Rect } from "react-konva";
import type { CalendarDocument } from "../../model/calendarTypes";
import type { ChartPalette } from "../../model/palette";
import type { StickyLayout } from "../../model/stickyRows";
import type { VisibleRow } from "../../model/types";
import { buildTimelineBodyColumnNodes } from "./TimelineBodyGrid";
import { TimelineSummaryBar as SummaryBar } from "./TimelineSummaryBar";

export function buildTimelineStickyParentRowContent(input: {
  sticky: StickyLayout;
  visibleRows: readonly VisibleRow[];
  width: number;
  bodyHeight: number;
  rowHeight: number;
  barHeight: number;
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
}): ReactNode[] {
  return input.sticky.draws.map((draw) => {
    const row = input.visibleRows[draw.index];
    if (
      row == null ||
      (row.type !== "category" &&
        row.type !== "group" &&
        row.type !== "hierarchy")
    ) {
      return null;
    }
    const clipHeight = draw.clipBottom - draw.clipTop;
    if (clipHeight <= 0) return null;
    const showSummary =
      row.summary != null &&
      (row.type === "category" ||
        row.type === "group" ||
        row.type === "hierarchy");
    return (
      <Group
        key={`sticky-${draw.index}`}
        clipX={0}
        clipY={draw.clipTop}
        clipWidth={input.width}
        clipHeight={clipHeight}
        listening={false}
      >
        <Rect
          x={0}
          y={draw.top}
          width={input.width}
          height={input.rowHeight}
          fill="transparent"
          listening={false}
        />
        {buildTimelineBodyColumnNodes({
          keyPrefix: `s${draw.index}-`,
          width: input.width,
          height: input.bodyHeight,
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
        })}
        <Line
          points={[0, draw.top + input.rowHeight, input.width, draw.top + input.rowHeight]}
          stroke={input.chart.rowBorder}
          strokeWidth={1}
          listening={false}
        />
        {showSummary ? (
          <SummaryBar
            summary={row.summary!}
            y={draw.top}
            rowHeight={input.rowHeight}
            barHeight={input.barHeight}
            dateToX={input.dateToX}
            chart={input.chart}
          />
        ) : null}
      </Group>
    );
  });
}
