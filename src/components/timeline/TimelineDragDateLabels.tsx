import { fmtShort, parseDate } from "../../model/dates";
import {
  dragDateChipSize,
  layoutDragDateChips,
  type DragDatePreview,
  type Rect as ChipRect,
} from "../../model/dragDates";
import { TASK_HANDLE_WIDTH } from "../../model/chartHitTest";
import type { ChartPalette } from "../../model/palette";
import { Group, Rect, Text } from "react-konva";

const HANDLE_WIDTH = TASK_HANDLE_WIDTH;

function DragDateChip({
  box,
  text,
  fontSize,
  fill,
  stroke,
  textFill,
}: {
  box: ChipRect;
  text: string;
  fontSize: number;
  fill: string;
  stroke: string;
  textFill: string;
}) {
  return (
    <Group listening={false}>
      <Rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        cornerRadius={Math.min(3, box.height / 2)}
        listening={false}
      />
      <Text
        name="drag-date"
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        text={text}
        fontSize={fontSize}
        fill={textFill}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  );
}

export function TimelineDragDateLabels({
  preview,
  fontSize,
  padX,
  padY,
  gap,
  viewportWidth,
  viewportHeight,
  barHeight,
  obstacles,
  chart,
}: {
  preview: DragDatePreview;
  fontSize: number;
  padX: number;
  padY: number;
  gap: number;
  viewportWidth: number;
  viewportHeight: number;
  barHeight: number;
  obstacles: readonly ChipRect[];
  chart: ChartPalette;
}) {
  const startText = fmtShort(parseDate(preview.start));
  const endText = fmtShort(parseDate(preview.end));
  const layout = layoutDragDateChips({
    bar: {
      x: preview.barLeft,
      y: preview.barTop,
      width: preview.barWidth,
      height: barHeight,
    },
    avoid: {
      x: preview.barLeft - HANDLE_WIDTH / 2,
      y: preview.barTop,
      width: preview.barWidth + HANDLE_WIDTH,
      height: barHeight,
    },
    start: dragDateChipSize(startText, fontSize, padX, padY),
    end: dragDateChipSize(endText, fontSize, padX, padY),
    viewport: { width: viewportWidth, height: viewportHeight },
    gap,
    obstacles,
  });
  return (
    <>
      <DragDateChip
        box={layout.start}
        text={startText}
        fontSize={fontSize}
        fill={chart.dragDateFill}
        stroke={chart.dragDateStroke}
        textFill={chart.textPrimary}
      />
      <DragDateChip
        box={layout.end}
        text={endText}
        fontSize={fontSize}
        fill={chart.dragDateFill}
        stroke={chart.dragDateStroke}
        textFill={chart.textPrimary}
      />
    </>
  );
}
