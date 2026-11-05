import type { ReactNode } from "react";
import { Group, Line, Rect } from "react-konva";
import { parseDate } from "../../model/dates";
import type { ChartPalette } from "../../model/palette";
import { coveredSpanWidthPx, summaryBarWidthPx, type SummarySpan } from "../../model/summary";
import { summaryBarCapPx, summaryBarHeightPx } from "../../model/summaryBarLayout";

export function TimelineSummaryBar({
  summary,
  y,
  rowHeight,
  barHeight,
  dateToX,
  chart,
}: {
  summary: SummarySpan;
  y: number;
  rowHeight: number;
  barHeight: number;
  dateToX: (d: Date) => number;
  chart: ChartPalette;
}) {
  const { x, width } = summaryBarWidthPx(
    summary.start,
    summary.end,
    dateToX,
    6,
  );
  const height = summaryBarHeightPx(barHeight);
  const barY = y + (rowHeight - height) / 2;
  const cap = summaryBarCapPx(height);
  const sorted = [...summary.covered].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const gapLines: ReactNode[] = [];
  let cursor = summary.start;
  for (const span of sorted) {
    if (span.start > cursor) {
      const gx = dateToX(parseDate(cursor)) - x;
      const gw = dateToX(parseDate(span.start)) - x - gx;
      if (gw > 2) {
        gapLines.push(
          <Line
            key={`gap-${cursor}-${span.start}`}
            points={[gx, height / 2, gx + gw, height / 2]}
            stroke={chart.summaryGap}
            strokeWidth={1}
            dash={[4, 3]}
            listening={false}
          />,
        );
      }
    }
    cursor = span.end > cursor ? span.end : cursor;
  }
  if (cursor < summary.end) {
    const gx = dateToX(parseDate(cursor)) - x;
    const gw = dateToX(parseDate(summary.end)) - x - gx;
    if (gw > 2) {
      gapLines.push(
        <Line
          key={`gap-tail-${cursor}`}
          points={[gx, height / 2, gx + gw, height / 2]}
          stroke={chart.summaryGap}
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
        />,
      );
    }
  }
  return (
    <Group x={x} y={barY} listening={false}>
      {sorted.map((span) => {
        const spanX = dateToX(parseDate(span.start)) - x;
        const spanW = coveredSpanWidthPx(span.start, span.end, dateToX, 2);
        return (
          <Rect
            key={`${span.start}-${span.end}`}
            x={spanX}
            y={0}
            width={spanW}
            height={height}
            fill={chart.summaryCovered}
            cornerRadius={1}
          />
        );
      })}
      {gapLines}
      <Line
        points={[0, height, cap, height + cap, 0, height + cap]}
        closed
        fill={chart.summaryCovered}
        listening={false}
      />
      <Line
        points={[width, height, width - cap, height + cap, width, height + cap]}
        closed
        fill={chart.summaryCovered}
        listening={false}
      />
    </Group>
  );
}
