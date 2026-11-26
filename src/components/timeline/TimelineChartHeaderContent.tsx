import type { ReactNode } from "react";
import { Line, Rect, Text } from "react-konva";
import {
  addDays,
  addUtcMonths,
  fmtShort,
  fmtWeekday,
  isoDate,
  utcMonthStart,
} from "../../model/dates";
import type { CalendarDocument } from "../../model/calendarTypes";
import { KONVA_FONT_FAMILY } from "../../model/fontStack";
import {
  formatYearMonth,
  MONTH_HEADER_LABEL_GAP_BASE_PX,
  visibleMonthHeaderLabels,
} from "../../model/monthHeader";
import { nonWorkingDayClipRects } from "../../model/nonWorkingDay";
import type { ChartPalette } from "../../model/palette";
import { timelineHeaderScrollAnchorDay } from "../../model/timelineHeaderScrollAnchor";

export type TimelineChartHeaderContentInput = {
  width: number;
  headerHeight: number;
  scale: number;
  tier: "day" | "week" | "month";
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  scrollX: number;
  pxPerDay: number;
  dayStart: number;
  dayEnd: number;
  dateToX: (d: Date) => number;
  today: string;
  calendar: CalendarDocument | null;
  chart: ChartPalette;
  accentColor: string;
};

/** 日・週・月ヘッダーの Konva ノード（境界線、ラベル、グリッド）。 */
export function buildTimelineChartHeaderContent(
  input: TimelineChartHeaderContentInput,
): ReactNode[] {
  const {
    width,
    headerHeight,
    scale,
    tier,
    timelineStart,
    timelineEnd,
    totalDays,
    scrollX,
    pxPerDay,
    dayStart,
    dayEnd,
    dateToX,
    today,
    calendar,
    chart,
    accentColor,
  } = input;

  const elements: ReactNode[] = [];
  elements.push(
    <Line
      key="header-border"
      points={[0, headerHeight - 0.5, width, headerHeight - 0.5]}
      stroke={chart.headerBorder}
      strokeWidth={1}
      listening={false}
    />,
  );

  const scrollAnchor = timelineHeaderScrollAnchorDay(scrollX, pxPerDay, totalDays);
  const anchorDate = addDays(timelineStart, scrollAnchor);
  const yearMonthLabel = (
    <Text
      key="header-year-month"
      x={4}
      y={4 * scale}
      text={formatYearMonth(anchorDate)}
      fontSize={11 * scale}
      fontStyle="bold"
      fontFamily={KONVA_FONT_FAMILY}
      fill={chart.textPrimary}
      listening={false}
    />
  );

  if (tier === "month") {
    const fixedFontSize = 11 * scale;
    const monthFontSize = 12 * scale;
    const gapPx = MONTH_HEADER_LABEL_GAP_BASE_PX * scale;
    elements.push(yearMonthLabel);
    const monthLabelCandidates = [];
    let d = utcMonthStart(timelineStart);
    while (d < timelineEnd) {
      const x = dateToX(d);
      if (x > -120 && x < width + 120) {
        elements.push(
          <Line
            key={`mh-${d.getTime()}`}
            points={[x, 0, x, headerHeight]}
            stroke={chart.monthGrid}
            strokeWidth={1}
            listening={false}
          />,
        );
        monthLabelCandidates.push({
          key: `mt-${d.getTime()}`,
          x: x + 6,
          text: formatYearMonth(d),
          fontSize: monthFontSize,
        });
      }
      d = addUtcMonths(d, 1);
    }
    const visibleMonthLabels = visibleMonthHeaderLabels(
      monthLabelCandidates,
      [{ left: 4, text: formatYearMonth(anchorDate), fontSize: fixedFontSize }],
      gapPx,
    );
    for (const label of visibleMonthLabels) {
      elements.push(
        <Text
          key={label.key}
          x={label.x}
          y={13 * scale}
          text={label.text}
          fontSize={label.fontSize}
          fontStyle="bold"
          fontFamily={KONVA_FONT_FAMILY}
          fill={chart.textPrimary}
          listening={false}
        />,
      );
    }
  } else {
    const headerBands = nonWorkingDayClipRects(
      timelineStart,
      dayStart,
      dayEnd,
      dateToX,
      pxPerDay,
      width,
      calendar,
      totalDays,
    );
    for (let i = 0; i < headerBands.length; i += 1) {
      const band = headerBands[i];
      elements.push(
        <Rect
          key={`hwe-${i}-${band.x}`}
          x={band.x}
          y={0}
          width={band.width}
          height={headerHeight}
          fill={chart.nonWorking}
          listening={false}
        />,
      );
    }
    elements.push(yearMonthLabel);
    for (let i = dayStart; i <= dayEnd; i += 1) {
      const d = addDays(timelineStart, i);
      const x = dateToX(d);
      if (x < -40 || x > width + 40) continue;
      const isMonday = d.getUTCDay() === 1;
      const isToday = isoDate(d) === today;
      if (tier === "day" || isMonday) {
        elements.push(
          <Line
            key={`hl-${i}`}
            points={[x, 22 * scale, x, headerHeight]}
            stroke={isMonday ? chart.gridMonday : chart.gridWeekday}
            strokeWidth={1}
            listening={false}
          />,
          <Text
            key={`ht-${i}`}
            x={x + 2}
            y={28 * scale}
            text={
              tier === "day"
                ? `${fmtShort(d)} ${fmtWeekday(d)}`
                : fmtShort(d)
            }
            fontSize={10 * scale}
            fontFamily={KONVA_FONT_FAMILY}
            fill={isMonday || isToday ? chart.textPrimary : chart.textSecondary}
            fontStyle={isMonday || isToday ? "bold" : "normal"}
            listening={false}
          />,
        );
      }
      if (isToday) {
        elements.push(
          <Rect
            key={`today-${i}`}
            x={x + 1}
            y={26 * scale}
            width={Math.max(4, pxPerDay - 2)}
            height={4 * scale}
            fill={accentColor}
            cornerRadius={2}
            listening={false}
          />,
        );
      }
    }
  }
  return elements;
}
