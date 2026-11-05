import type { ReactNode } from "react";
import { Line, Rect } from "react-konva";
import { addDays, addUtcMonths, utcMonthStart } from "../../model/dates";
import type { CalendarDocument } from "../../model/calendarTypes";
import { nonWorkingDayClipRects } from "../../model/nonWorkingDay";
import type { ChartPalette } from "../../model/palette";

export type TimelineBodyGridInput = {
  keyPrefix: string;
  width: number;
  height: number;
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
};

/** チャート本体と固定行の背景グリッド（非稼働日帯と縦線）。 */
export function buildTimelineBodyColumnNodes(
  input: TimelineBodyGridInput,
): ReactNode[] {
  const elements: ReactNode[] = [];
  const {
    keyPrefix,
    width,
    height,
    tier,
    timelineStart,
    timelineEnd,
    totalDays,
    dayStart,
    dayEnd,
    dateToX,
    pxPerDay,
    calendar,
    chart,
  } = input;
  if (tier !== "month") {
    const bands = nonWorkingDayClipRects(
      timelineStart,
      dayStart,
      dayEnd,
      dateToX,
      pxPerDay,
      width,
      calendar,
      totalDays,
    );
    for (let i = 0; i < bands.length; i += 1) {
      const band = bands[i];
      elements.push(
        <Rect
          key={`${keyPrefix}nwd-${i}-${band.x}`}
          x={band.x}
          y={0}
          width={band.width}
          height={height}
          fill={chart.nonWorking}
          listening={false}
        />,
      );
    }
    for (let i = dayStart; i <= dayEnd; i += 1) {
      const d = addDays(timelineStart, i);
      const x = dateToX(d);
      if (x < -10 || x > width + 10) continue;
      const isMonday = d.getUTCDay() === 1;
      if (tier === "day" || isMonday) {
        elements.push(
          <Line
            key={`${keyPrefix}vg-${i}`}
            points={[x, 0, x, height]}
            stroke={isMonday ? chart.gridBodyMonday : chart.gridBodyWeekday}
            strokeWidth={1}
            listening={false}
          />,
        );
      }
    }
  } else {
    let d = utcMonthStart(timelineStart);
    while (d < timelineEnd) {
      const x = dateToX(d);
      if (x > -10 && x < width + 10) {
        elements.push(
          <Line
            key={`${keyPrefix}mg-${d.getTime()}`}
            points={[x, 0, x, height]}
            stroke={chart.gridMonth}
            strokeWidth={1}
            listening={false}
          />,
        );
      }
      d = addUtcMonths(d, 1);
    }
  }
  return elements;
}
