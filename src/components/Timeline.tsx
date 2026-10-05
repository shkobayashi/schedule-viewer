import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Arrow, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { hatchCanvas } from "../model/hatch";
import type Konva from "konva";
import { addDays, addUtcMonths, fmtShort, parseDate, utcMonthStart } from "../model/dates";
import {
  dragDateChipSize,
  layoutDragDateChips,
  previewDatesForDrag,
  previewLinkBroken,
  type DragBarGeometry,
  type DragDatePreview,
  type Rect as ChipRect,
} from "../model/dragDates";
import {
  hitTaskAnchor,
  TASK_HANDLE_WIDTH,
  type ChartPointer,
} from "../model/chartHitTest";
import {
  LINK_POINTER_LENGTH,
  linkPoints,
  nearestLinkHit,
  type DependencyLink,
  type LinkPolyline,
} from "../model/dependencies";
import { useTimelinePointer } from "../hooks/useTimelinePointer";
import {
  barColors,
  isOverdue,
  lightningDate,
  taskBarExclusiveEnd,
  taskBarWidthPx,
} from "../model/timeline";
import {
  coveredSpanWidthPx,
  summaryBarWidthPx,
  type SummarySpan,
} from "../model/summary";
import { milestonesExceededBy } from "../model/milestones";
import { LAYOUT_HEADER_HEIGHT } from "../model/layoutSizes";
import { visibleDayIndexRange } from "../model/timelineVisibleDays";
import { resolveAssigneeDisplay } from "../model/assigneeDisplay";
import type { Member, MemberId } from "../model/memberTypes";
import type { StickyLayout } from "../model/stickyRows";
import type { Milestone, ScheduleId, Task, VisibleRow } from "../model/types";
import type { CalendarDocument } from "../model/calendarTypes";
import { nonWorkingDayClipRects } from "../model/nonWorkingDay";
import { paletteFor, type ChartPalette, type ResolvedColorScheme } from "../model/palette";
import { MilestoneBand } from "./MilestoneBand";

type TimelineProps = {
  visibleRows: VisibleRow[];
  width: number;
  rowHeight: number;
  barHeight: number;
  headerHeight: number;
  bodyHeight: number;
  pxPerDay: number;
  scrollX: number;
  scrollY: number;
  tier: "day" | "week" | "month";
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  dateToX: (d: Date) => number;
  xToDate: (x: number) => Date;
  selectedTaskId: ScheduleId | null;
  onSelectTask: (id: ScheduleId) => void;
  onClearSelection: () => void;
  onMoveTask: (taskId: ScheduleId, deltaDays: number) => void;
  onResizeStart: (taskId: ScheduleId, groupX: number) => void;
  onResizeEnd: (taskId: ScheduleId, groupX: number, barWidth: number) => void;
  links: DependencyLink[];
  onOpenEdit: (task: Task) => void;
  onTaskContextMenu: (taskId: ScheduleId, x: number, y: number) => void;
  onWheelBody: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onWheelHeader: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onPan: (dx: number, dy: number) => void;
  milestones: Milestone[];
  milestoneLanes: Map<ScheduleId, number>;
  milestoneBandHeight: number;
  milestoneLaneHeight: number;
  milestoneDiamondSize: number;
  milestoneFontSize: number;
  onMoveMilestone: (id: ScheduleId, deltaDays: number) => void;
  onOpenMilestone: (id: ScheduleId) => void;
  onMilestoneContextMenu: (id: ScheduleId, x: number, y: number) => void;
  today: string;
  memberCatalog: Map<MemberId, Member> | null;
  calendar: CalendarDocument | null;
  colorScheme: ResolvedColorScheme;
  linkSourceId: ScheduleId | null;
  onLinkTargetClick: (taskId: ScheduleId) => void;
  onLinkContextMenu: (
    fromId: ScheduleId,
    toId: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onAddMilestoneContextMenu: (
    chartX: number,
    clientX: number,
    clientY: number,
  ) => void;
  onChartPointer: (pointer: ChartPointer) => void;
  sticky: StickyLayout;
};

const HANDLE_WIDTH = TASK_HANDLE_WIDTH;
/** 同じバーへの連続クリックを、ダブルクリックの 2 回目として扱う時間。 */
const LINK_DOUBLE_CLICK_MS = 500;

function SummaryBar({
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
  const height = Math.max(4, Math.round(barHeight / 2));
  const barY = y + (rowHeight - height) / 2;
  const radius = Math.min(3, Math.round(height / 2));
  return (
    <Group x={x} y={barY} listening={false}>
      <Rect
        width={width}
        height={height}
        fill={chart.summaryGap}
        cornerRadius={radius}
      />
      {summary.covered.map((span) => {
        const spanX = dateToX(parseDate(span.start)) - x;
        const spanW = coveredSpanWidthPx(span.start, span.end, dateToX, 2);
        const atStart = span.start === summary.start;
        const atEnd = span.end === summary.end;
        const spanRadius: number | number[] =
          atStart && atEnd
            ? radius
            : atStart
              ? [radius, 0, 0, radius]
              : atEnd
                ? [0, radius, radius, 0]
                : 0;
        return (
          <Rect
            key={`${span.start}-${span.end}`}
            x={spanX}
            width={spanW}
            height={height}
            fill={chart.summaryCovered}
            cornerRadius={spanRadius}
          />
        );
      })}
    </Group>
  );
}

function TaskBar({
  task,
  y,
  rowHeight,
  barHeight,
  pxPerDay,
  dateToX,
  exceeded,
  selected,
  linkMode,
  linkTarget,
  onLinkPointerDown,
  onSelect,
  onOpenEdit,
  onContextMenu,
  onMoveTask,
  onDragGeometry,
  dragLeft,
  dragWidth,
  today,
  memberCatalog,
  colorScheme,
}: {
  task: Task;
  y: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  exceeded: Milestone[];
  selected: boolean;
  linkMode: boolean;
  linkTarget: boolean;
  onLinkPointerDown: () => void;
  onSelect: () => void;
  onOpenEdit: () => void;
  onContextMenu: (x: number, y: number) => void;
  onMoveTask: (deltaDays: number) => void;
  onDragGeometry: (geometry: DragBarGeometry | null) => void;
  dragLeft?: number;
  dragWidth?: number;
  today: string;
  memberCatalog: Map<MemberId, Member> | null;
  colorScheme: ResolvedColorScheme;
}) {
  const chart = paletteFor(colorScheme).chart;
  const start = parseDate(task.start);
  const x = dragLeft ?? dateToX(start);
  const w = dragWidth ?? taskBarWidthPx(task, dateToX, pxPerDay);
  const barY = y + (rowHeight - barHeight) / 2;
  const colors = barColors(task, today, colorScheme);
  const assigneeDisplay = resolveAssigneeDisplay(task.assigneeId, memberCatalog);
  const unassigned = assigneeDisplay.kind === "unassigned";
  const unknownMember = assigneeDisplay.kind === "unknown";
  const stroke =
    unassigned && !isOverdue(task, today)
      ? chart.unassignedStroke
      : unknownMember && !isOverdue(task, today)
        ? chart.unknownStroke
        : colors.border;
  const cap = Math.max(2, Math.round(barHeight * 0.16));
  const hatch =
    task.confidence === "tentative"
      ? hatchCanvas(colors.bg, colorScheme)
      : null;
  const overrunAt = exceeded[0] ? dateToX(parseDate(exceeded[0].date)) - x : null;
  const origXRef = useRef(0);
  const groupRef = useRef<Konva.Group>(null);

  return (
    <Group
      ref={groupRef}
      name="task-bar"
      x={x}
      y={barY}
      dragBoundFunc={(pos) => ({ x: pos.x, y: barY })}
      onClick={(e) => {
        e.cancelBubble = true;
        if (linkMode && e.evt.detail > 1) return;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        if (linkMode && e.evt.detail > 1) return;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (linkMode) return;
        onOpenEdit();
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        if (linkMode) return;
        onContextMenu(e.evt.clientX, e.evt.clientY);
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (linkMode) return;
        onOpenEdit();
      }}
      onMouseDown={(e) => {
        if (linkMode) {
          onLinkPointerDown();
          return;
        }
        if (!(e.evt.metaKey || e.evt.ctrlKey)) return;
        e.cancelBubble = true;
        const node = groupRef.current;
        if (!node) return;
        node.draggable(true);
        node.startDrag();
      }}
      onDragStart={(e) => {
        origXRef.current = e.target.x();
        onDragGeometry({
          taskId: task.id,
          kind: "move",
          barLeft: e.target.x(),
          barWidth: w,
          barTop: barY,
          originX: e.target.x(),
        });
      }}
      onDragMove={(e) => {
        onDragGeometry({
          taskId: task.id,
          kind: "move",
          barLeft: e.target.x(),
          barWidth: w,
          barTop: barY,
          originX: origXRef.current,
        });
      }}
      onDragEnd={(e) => {
        const node = e.target;
        if (!node.draggable()) return;
        const delta = Math.round((node.x() - origXRef.current) / pxPerDay);
        node.position({ x: origXRef.current + delta * pxPerDay, y: barY });
        node.draggable(false);
        onDragGeometry(null);
        onMoveTask(delta);
      }}
    >
      <Rect
        width={w}
        height={barHeight}
        fill={hatch ? undefined : colors.bg}
        fillPriority={hatch ? "pattern" : "color"}
        fillPatternImage={
          // 設定型は HTMLImageElement。実行時の setter は canvas も受ける。
          hatch ? (hatch as unknown as HTMLImageElement) : undefined
        }
        fillPatternRepeat="repeat"
        cornerRadius={4}
      />
      {task.status === "in-progress" && colors.fill ? (
        <Rect
          width={w * (task.progress / 100)}
          height={barHeight}
          fill={colors.fill}
          cornerRadius={4}
        />
      ) : null}
      <Rect
        width={w}
        height={barHeight}
        stroke={stroke}
        strokeWidth={unassigned || unknownMember || selected ? 1.75 : 1}
        dash={unassigned ? [5, 3] : unknownMember ? [2, 2] : undefined}
        cornerRadius={4}
        listening={false}
      />
      {linkTarget ? (
        <Rect
          width={w}
          height={barHeight}
          stroke={chart.linkTargetStroke}
          strokeWidth={2.5}
          cornerRadius={4}
          listening={false}
        />
      ) : null}
      {unassigned ? (
        <Rect
          y={-cap}
          width={w}
          height={cap}
          fill={chart.unassignedCap}
          listening={false}
        />
      ) : null}
      {unknownMember ? (
        <Rect
          y={-cap}
          width={w}
          height={cap}
          fill={chart.unknownCap}
          listening={false}
        />
      ) : null}
      {overrunAt != null && overrunAt < w ? (
        <Rect
          x={Math.max(0, overrunAt)}
          width={Math.max(2, w - Math.max(0, overrunAt))}
          height={barHeight}
          fill={chart.overrunOverlay}
          cornerRadius={overrunAt <= 0 ? 4 : [0, 4, 4, 0]}
          listening={false}
        />
      ) : null}
    </Group>
  );
}

function ResizeHandles({
  task,
  y,
  rowHeight,
  barHeight,
  pxPerDay,
  dateToX,
  onResizeStart,
  onResizeEnd,
  onDragGeometry,
  onContextMenu,
  chart,
}: {
  task: Task;
  y: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  onResizeStart: (groupX: number) => void;
  onResizeEnd: (groupX: number, barWidth: number) => void;
  onDragGeometry: (geometry: DragBarGeometry | null) => void;
  onContextMenu: (x: number, y: number) => void;
  chart: ChartPalette;
}) {
  const start = parseDate(task.start);
  const groupX = dateToX(start);
  const w = taskBarWidthPx(task, dateToX, pxPerDay);
  const barY = y + (rowHeight - barHeight) / 2;
  const handleHeight = Math.max(10, Math.round(barHeight * 0.7));
  const handleY = barHeight / 2 - handleHeight / 2;
  const groupRef = useRef<Konva.Group>(null);
  const bgRef = useRef<Konva.Rect>(null);
  const fillRef = useRef<Konva.Rect | null>(null);
  const rightHandleRef = useRef<Konva.Rect>(null);
  const leftMaxXRef = useRef<number | null>(null);

  const syncFillWidth = useCallback(
    (barWidth: number) => {
      if (task.status === "in-progress" && fillRef.current) {
        fillRef.current.width(barWidth * (task.progress / 100));
      }
    },
    [task.progress, task.status],
  );

  return (
    <Group
      ref={groupRef}
      x={groupX}
      y={barY}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        onContextMenu(e.evt.clientX, e.evt.clientY);
      }}
    >
      <Rect ref={bgRef} width={w} height={barHeight} visible={false} />
      {task.status === "in-progress" ? (
        <Rect
          ref={(node) => {
            fillRef.current = node;
          }}
          width={w * (task.progress / 100)}
          height={barHeight}
          visible={false}
        />
      ) : null}
      <Rect
        x={-HANDLE_WIDTH / 2}
        y={handleY}
        width={HANDLE_WIDTH}
        height={handleHeight}
        name="resize-handle"
        fill={chart.resizeHandle}
        cornerRadius={2}
        draggable
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "ew-resize";
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "";
        }}
        onDragStart={function (this: Konva.Node) {
          const parent = this.getParent()!.getAbsolutePosition();
          const barWidth = bgRef.current?.width() ?? w;
          leftMaxXRef.current =
            parent.x + barWidth - pxPerDay - HANDLE_WIDTH / 2;
          const g = groupRef.current;
          if (!g) return;
          onDragGeometry({
            taskId: task.id,
            kind: "start",
            barLeft: g.x(),
            barWidth,
            barTop: barY,
            originX: g.x(),
          });
        }}
        dragBoundFunc={function (this: Konva.Node, pos) {
          const parent = this.getParent()!.getAbsolutePosition();
          if (leftMaxXRef.current == null) {
            const barWidth = bgRef.current?.width() ?? w;
            leftMaxXRef.current =
              parent.x + barWidth - pxPerDay - HANDLE_WIDTH / 2;
          }
          return {
            x: Math.min(pos.x, leftMaxXRef.current),
            y: parent.y + handleY,
          };
        }}
        onDragMove={(e) => {
          const g = groupRef.current;
          const bg = bgRef.current;
          if (!g || !bg) return;
          const rightEdge = g.x() + bg.width();
          const newLeft = g.x() + e.target.x() + HANDLE_WIDTH / 2;
          const newW = Math.max(pxPerDay, rightEdge - newLeft);
          g.x(newLeft);
          e.target.x(-HANDLE_WIDTH / 2);
          bg.width(newW);
          rightHandleRef.current?.x(newW - HANDLE_WIDTH / 2);
          syncFillWidth(newW);
          onDragGeometry({
            taskId: task.id,
            kind: "start",
            barLeft: newLeft,
            barWidth: newW,
            barTop: barY,
            originX: newLeft,
          });
          e.target.getLayer()?.batchDraw();
        }}
        onDragEnd={() => {
          const g = groupRef.current;
          leftMaxXRef.current = null;
          onDragGeometry(null);
          if (!g) return;
          onResizeStart(g.x());
        }}
      />
      <Rect
        ref={rightHandleRef}
        x={w - HANDLE_WIDTH / 2}
        y={handleY}
        width={HANDLE_WIDTH}
        height={handleHeight}
        name="resize-handle"
        fill={chart.resizeHandle}
        cornerRadius={2}
        draggable
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "ew-resize";
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "";
        }}
        onDragStart={() => {
          const g = groupRef.current;
          const bg = bgRef.current;
          if (!g || !bg) return;
          onDragGeometry({
            taskId: task.id,
            kind: "end",
            barLeft: g.x(),
            barWidth: bg.width(),
            barTop: barY,
            originX: g.x(),
          });
        }}
        dragBoundFunc={function (this: Konva.Node, pos) {
          const parent = this.getParent()!.getAbsolutePosition();
          return {
            x: Math.max(pos.x, parent.x + pxPerDay - HANDLE_WIDTH / 2),
            y: parent.y + handleY,
          };
        }}
        onDragMove={(e) => {
          const bg = bgRef.current;
          if (!bg) return;
          const newW = Math.max(pxPerDay, e.target.x() + HANDLE_WIDTH / 2);
          bg.width(newW);
          syncFillWidth(newW);
          const barLeft = groupRef.current?.x() ?? groupX;
          onDragGeometry({
            taskId: task.id,
            kind: "end",
            barLeft,
            barWidth: newW,
            barTop: barY,
            originX: barLeft,
          });
          e.target.getLayer()?.batchDraw();
        }}
        onDragEnd={() => {
          const g = groupRef.current;
          const bg = bgRef.current;
          onDragGeometry(null);
          if (!g || !bg) return;
          onResizeEnd(g.x(), bg.width());
        }}
      />
    </Group>
  );
}

function visibleBarObstacles(
  rows: VisibleRow[],
  scrollY: number,
  rowHeight: number,
  barHeight: number,
  bodyHeight: number,
  dateToX: (d: Date) => number,
  pxPerDay: number,
  skipTaskId: ScheduleId,
): ChipRect[] {
  const rects: ChipRect[] = [];
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
    if (row.task.id === skipTaskId) continue;
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

function DragDateLabels({
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

function bodyColumnNodes(input: {
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
}): ReactNode[] {
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

export function Timeline({
  visibleRows,
  width,
  rowHeight,
  barHeight,
  headerHeight,
  bodyHeight,
  pxPerDay,
  scrollX,
  scrollY,
  tier,
  timelineStart,
  timelineEnd,
  totalDays,
  dateToX,
  xToDate,
  selectedTaskId,
  onSelectTask,
  onClearSelection,
  onMoveTask,
  onResizeStart,
  onResizeEnd,
  links,
  onOpenEdit,
  onTaskContextMenu,
  onWheelBody,
  onWheelHeader,
  onPan,
  milestones,
  milestoneLanes,
  milestoneBandHeight,
  milestoneLaneHeight,
  milestoneDiamondSize,
  milestoneFontSize,
  onMoveMilestone,
  onOpenMilestone,
  onMilestoneContextMenu,
  today,
  memberCatalog,
  calendar,
  colorScheme,
  linkSourceId,
  onLinkTargetClick,
  onLinkContextMenu,
  onAddMilestoneContextMenu,
  onChartPointer,
  sticky,
}: TimelineProps) {
  const linkMode = linkSourceId != null;
  const chart = useMemo(
    () => paletteFor(colorScheme).chart,
    [colorScheme],
  );
  const todayDate = useMemo(() => parseDate(today), [today]);
  const scale = headerHeight / LAYOUT_HEADER_HEIGHT;
  const dateFontSize = Math.max(8, Math.round(11 * scale));
  const datePadX = Math.max(3, Math.round(4 * scale));
  const datePadY = Math.max(1, Math.round(2 * scale));
  const dateGap = Math.max(4, Math.round(4 * scale));
  const [dragPreview, setDragPreview] = useState<DragDatePreview | null>(null);
  const onDragGeometry = useCallback(
    (geometry: DragBarGeometry | null) => {
      if (geometry == null) {
        setDragPreview(null);
        return;
      }
      const row = visibleRows.find(
        (item) => item.type === "task" && item.task.id === geometry.taskId,
      );
      if (!row || row.type !== "task") {
        setDragPreview(null);
        return;
      }
      const dates = previewDatesForDrag(
        row.task,
        geometry,
        timelineStart,
        xToDate,
        pxPerDay,
      );
      setDragPreview({
        taskId: geometry.taskId,
        kind: geometry.kind,
        start: dates.start,
        end: dates.end,
        barLeft: geometry.barLeft,
        barWidth: geometry.barWidth,
        barTop: geometry.barTop,
      });
    },
    [pxPerDay, timelineStart, visibleRows, xToDate],
  );
  const dayRange = useMemo(
    () => visibleDayIndexRange(scrollX, pxPerDay, width, totalDays),
    [pxPerDay, scrollX, totalDays, width],
  );

  const headerContent = useMemo(() => {
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

    if (tier === "month") {
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
            <Text
              key={`mt-${d.getTime()}`}
              x={x + 6}
              y={13 * scale}
              text={`${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`}
              fontSize={12 * scale}
              fontStyle="bold"
              fill={chart.textPrimary}
              listening={false}
            />,
          );
        }
        d = addUtcMonths(d, 1);
      }
    } else {
      const headerBands = nonWorkingDayClipRects(
        timelineStart,
        dayRange.start,
        dayRange.end,
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
      for (let i = dayRange.start; i <= dayRange.end; i += 1) {
        const d = addDays(timelineStart, i);
        const x = dateToX(d);
        if (x < -40 || x > width + 40) continue;
        const isMonday = d.getUTCDay() === 1;
        const isFirst = d.getUTCDate() === 1;
        if (tier === "day" || isMonday) {
          elements.push(
            <Line
              key={`hl-${i}`}
              points={[x, tier === "day" ? 26 * scale : 26 * scale, x, headerHeight]}
              stroke={isMonday ? chart.gridMonday : chart.gridWeekday}
              strokeWidth={1}
              listening={false}
            />,
            <Text
              key={`ht-${i}`}
              x={x + 2}
              y={24 * scale}
              text={fmtShort(d)}
              fontSize={10 * scale}
              fill={isMonday ? chart.textPrimary : chart.textSecondary}
              fontStyle={isMonday ? "bold" : "normal"}
              listening={false}
            />,
          );
        }
        if (isFirst) {
          elements.push(
            <Text
              key={`hm-${i}`}
              x={x + 2}
              y={6 * scale}
              text={`${d.getUTCMonth() + 1}月`}
              fontSize={11 * scale}
              fontStyle="bold"
              fill={chart.textPrimary}
              listening={false}
            />,
          );
        }
      }
    }
    return elements;
  }, [
    calendar,
    dateToX,
    dayRange.end,
    dayRange.start,
    headerHeight,
    pxPerDay,
    scale,
    totalDays,
    tier,
    timelineEnd,
    timelineStart,
    width,
    chart,
  ]);

  const stickyHidden = useMemo(
    () => new Set(sticky.hiddenIndexes),
    [sticky.hiddenIndexes],
  );

  const bgContent = useMemo(() => {
    const elements: ReactNode[] = [];
    const height = bodyHeight;

    for (let index = 0; index < visibleRows.length; index += 1) {
      if (stickyHidden.has(index)) continue;
      const row = visibleRows[index];
      const y = row.y - scrollY;
      if (y + rowHeight < 0 || y > height) continue;
      if (row.type === "category" || row.type === "group") {
        elements.push(
          <Rect
            key={`${row.type}-bg-${row.type === "group" ? row.category : ""}-${row.label}-${row.y}`}
            x={0}
            y={y}
            width={width}
            height={rowHeight}
            fill={row.type === "category" ? chart.categoryRow : chart.groupRow}
            listening={false}
          />,
        );
      }
    }

    elements.push(
      ...bodyColumnNodes({
        keyPrefix: "",
        width,
        height,
        tier,
        timelineStart,
        timelineEnd,
        totalDays,
        dayStart: dayRange.start,
        dayEnd: dayRange.end,
        dateToX,
        pxPerDay,
        calendar,
        chart,
      }),
    );

    for (let index = 0; index < visibleRows.length; index += 1) {
      if (stickyHidden.has(index)) continue;
      const row = visibleRows[index];
      const y = row.y - scrollY + rowHeight;
      if (y < 0 || y > height) continue;
      elements.push(
        <Line
          key={`hr-${row.y}`}
          points={[0, y, width, y]}
          stroke={chart.rowBorder}
          strokeWidth={1}
          listening={false}
        />,
      );
    }

    return elements;
  }, [
    bodyHeight,
    calendar,
    dateToX,
    dayRange.end,
    dayRange.start,
    pxPerDay,
    rowHeight,
    totalDays,
    scrollY,
    tier,
    timelineEnd,
    timelineStart,
    stickyHidden,
    visibleRows,
    width,
    chart,
  ]);

  const stickyContent = useMemo(() => {
    return sticky.draws.map((draw) => {
      const row = visibleRows[draw.index];
      if (row == null || (row.type !== "category" && row.type !== "group")) {
        return null;
      }
      const clipHeight = draw.clipBottom - draw.clipTop;
      if (clipHeight <= 0) return null;
      return (
        <Group
          key={`sticky-${draw.index}`}
          clipX={0}
          clipY={draw.clipTop}
          clipWidth={width}
          clipHeight={clipHeight}
          listening={false}
        >
          <Rect
            x={0}
            y={draw.top}
            width={width}
            height={rowHeight}
            fill={row.type === "category" ? chart.categoryRow : chart.groupRow}
            listening={false}
          />
          {bodyColumnNodes({
            keyPrefix: `s${draw.index}-`,
            width,
            height: bodyHeight,
            tier,
            timelineStart,
            timelineEnd,
            totalDays,
            dayStart: dayRange.start,
            dayEnd: dayRange.end,
            dateToX,
            pxPerDay,
            calendar,
            chart,
          })}
          <Line
            points={[0, draw.top + rowHeight, width, draw.top + rowHeight]}
            stroke={chart.rowBorder}
            strokeWidth={1}
            listening={false}
          />
          {row.summary != null ? (
            <SummaryBar
              summary={row.summary}
              y={draw.top}
              rowHeight={rowHeight}
              barHeight={barHeight}
              dateToX={dateToX}
              chart={chart}
            />
          ) : null}
        </Group>
      );
    });
  }, [
    barHeight,
    bodyHeight,
    calendar,
    chart,
    dateToX,
    dayRange.end,
    dayRange.start,
    pxPerDay,
    rowHeight,
    sticky.draws,
    tier,
    timelineEnd,
    timelineStart,
    totalDays,
    visibleRows,
    width,
  ]);

  const lightningPoints = useMemo(() => {
    const tx = dateToX(todayDate);
    const points = [tx, 0];
    for (const row of visibleRows) {
      const y = row.y - scrollY + rowHeight / 2;
      const x =
        row.type === "task"
          ? dateToX(parseDate(lightningDate(row.task, today)))
          : tx;
      points.push(x, y);
    }
    points.push(tx, bodyHeight);
    return points;
  }, [bodyHeight, dateToX, rowHeight, scrollY, today, todayDate, visibleRows]);

  const selectedRow = visibleRows.find(
    (r) => r.type === "task" && r.task.id === selectedTaskId,
  );

  const taskAnchors = useMemo(() => {
    const byId = new Map<
      ScheduleId,
      { x: number; right: number; linkRight: number; y: number }
    >();
    for (const row of visibleRows) {
      if (row.type !== "task") continue;
      const y = row.y - scrollY + rowHeight / 2;
      const x = dateToX(parseDate(row.task.start));
      const exclusive = dateToX(taskBarExclusiveEnd(row.task));
      byId.set(row.task.id, {
        x,
        right: x + Math.max(pxPerDay, exclusive - x),
        linkRight: Math.max(x + 6, exclusive),
        y,
      });
    }
    return byId;
  }, [dateToX, pxPerDay, rowHeight, scrollY, visibleRows]);

  const liveAnchors = useMemo(() => {
    if (dragPreview == null) return taskAnchors;
    const current = taskAnchors.get(dragPreview.taskId);
    if (!current) return taskAnchors;
    const next = new Map(taskAnchors);
    const x = dragPreview.barLeft;
    const right = x + dragPreview.barWidth;
    next.set(dragPreview.taskId, {
      x,
      right,
      linkRight: Math.max(x + 6, right),
      y: dragPreview.barTop + barHeight / 2,
    });
    return next;
  }, [barHeight, dragPreview, taskAnchors]);

  const dragObstacles = useMemo(() => {
    if (dragPreview == null) return [];
    return visibleBarObstacles(
      visibleRows,
      scrollY,
      rowHeight,
      barHeight,
      bodyHeight,
      dateToX,
      pxPerDay,
      dragPreview.taskId,
    );
  }, [
    barHeight,
    bodyHeight,
    dateToX,
    dragPreview,
    pxPerDay,
    rowHeight,
    scrollY,
    visibleRows,
  ]);

  const linkPolylines = useMemo(() => {
    const dates = new Map<ScheduleId, { start: string; end: string }>();
    for (const row of visibleRows) {
      if (row.type === "task") dates.set(row.task.id, row.task);
    }
    const polylines: Array<LinkPolyline & { broken: boolean }> = [];
    for (const link of links) {
      const from = liveAnchors.get(link.fromId);
      const to = liveAnchors.get(link.toId);
      if (!from || !to) continue;
      polylines.push({
        fromId: link.fromId,
        toId: link.toId,
        broken: previewLinkBroken(link, dates, dragPreview),
        points: linkPoints(from.linkRight, from.y, to.x, to.y, barHeight),
      });
    }
    return polylines;
  }, [barHeight, dragPreview, links, liveAnchors, visibleRows]);

  const { bodyRef, bandRef, hover, previewEnd } = useTimelinePointer({
    linkMode,
    milestones,
    milestoneLanes,
    dateToX,
    milestoneDiamondSize,
    milestoneLaneHeight,
    milestoneFontSize,
    liveAnchors,
    linkPolylines,
    barHeight,
    selectedTaskId,
    clipTop: sticky.clipTop,
    onChartPointer,
  });

  const linkArrows = useMemo(() => {
    return linkPolylines.flatMap((link) => {
      const hovered =
        hover.link?.fromId === link.fromId &&
        hover.link.toId === link.toId;
      const color = link.broken ? chart.linkBroken : chart.linkOk;
      const strokeWidth = link.broken ? 1.75 : 1.25;
      return [
        <Arrow
          key={`${link.fromId}-${link.toId}`}
          points={link.points}
          stroke={color}
          fill={color}
          strokeWidth={hovered ? strokeWidth + 1.5 : strokeWidth}
          pointerLength={LINK_POINTER_LENGTH}
          pointerWidth={LINK_POINTER_LENGTH}
          listening={false}
        />,
      ];
    });
  }, [chart, hover.link, linkPolylines]);

  const previewPoints = useMemo(() => {
    if (!linkSourceId || !previewEnd) return null;
    const from = liveAnchors.get(linkSourceId);
    if (!from) return null;
    return linkPoints(
      from.linkRight,
      from.y,
      previewEnd.x,
      previewEnd.y,
      barHeight,
    );
  }, [barHeight, previewEnd, linkSourceId, liveAnchors]);

  const panRef = useRef<{
    x: number;
    y: number;
    active: boolean;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const linkClickAtRef = useRef(0);
  const linkPressRef = useRef(false);
  const linkPressTimerRef = useRef<number | null>(null);
  const armLinkPress = useCallback(() => {
    linkPressRef.current = true;
    if (linkPressTimerRef.current != null) {
      window.clearTimeout(linkPressTimerRef.current);
    }
    linkPressTimerRef.current = window.setTimeout(() => {
      linkPressRef.current = false;
      linkPressTimerRef.current = null;
    }, LINK_DOUBLE_CLICK_MS + 100);
  }, []);
  useEffect(() => {
    return () => {
      if (linkPressTimerRef.current != null) {
        window.clearTimeout(linkPressTimerRef.current);
      }
    };
  }, []);
  const [panning, setPanning] = useState(false);
  const [panSession, setPanSession] = useState(false);

  const endPan = useCallback(() => {
    const pan = panRef.current;
    panRef.current = null;
    setPanning(false);
    setPanSession(false);
    if (pan?.moved) suppressClickRef.current = true;
  }, []);

  const onBodyMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;
      if (linkMode) {
        suppressClickRef.current = false;
        return;
      }
      suppressClickRef.current = false;
      const target = e.target;
      if (
        target.name() === "resize-handle" ||
        target.findAncestor(".resize-handle")
      ) {
        return;
      }
      if (e.evt.metaKey || e.evt.ctrlKey) return;
      panRef.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
        active: true,
        moved: false,
      };
      setPanSession(true);
    },
    [linkMode],
  );

  const panDeltaRef = useRef({ dx: 0, dy: 0 });
  const panRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!panSession) return;
    const flushPan = () => {
      panRafRef.current = null;
      const { dx, dy } = panDeltaRef.current;
      if (dx === 0 && dy === 0) return;
      panDeltaRef.current = { dx: 0, dy: 0 };
      onPan(dx, dy);
    };
    const onMove = (evt: MouseEvent) => {
      const pan = panRef.current;
      if (!pan?.active) return;
      const dx = evt.clientX - pan.x;
      const dy = evt.clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 3) return;
      pan.moved = true;
      pan.x = evt.clientX;
      pan.y = evt.clientY;
      setPanning(true);
      panDeltaRef.current.dx += dx;
      panDeltaRef.current.dy += dy;
      if (panRafRef.current == null) {
        panRafRef.current = window.requestAnimationFrame(flushPan);
      }
    };
    const onUp = () => {
      if (panRafRef.current != null) {
        window.cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
        flushPan();
      }
      endPan();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (panRafRef.current != null) {
        window.cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
    };
  }, [endPan, onPan, panSession]);

  return (
    <div className="timeline">
      <div className="timeline-header">
        <Stage
          width={width}
          height={headerHeight}
          onWheel={onWheelHeader}
          onContextMenu={(e) => {
            e.evt.preventDefault();
            if (linkMode) return;
            const pos = e.target.getStage()?.getPointerPosition();
            if (!pos) return;
            onAddMilestoneContextMenu(pos.x, e.evt.clientX, e.evt.clientY);
          }}
        >
          <Layer>{headerContent}</Layer>
        </Stage>
      </div>
      {milestoneBandHeight > 0 ? (
        <MilestoneBand
          milestones={milestones}
          lanes={milestoneLanes}
          width={width}
          height={milestoneBandHeight}
          laneHeight={milestoneLaneHeight}
          diamondSize={milestoneDiamondSize}
          fontSize={milestoneFontSize}
          pxPerDay={pxPerDay}
          dateToX={dateToX}
          linkMode={linkMode}
          containerRef={bandRef}
          onMove={onMoveMilestone}
          onOpenEdit={onOpenMilestone}
          onContextMenu={onMilestoneContextMenu}
          onEmptyContextMenu={onAddMilestoneContextMenu}
          onWheel={onWheelHeader}
          chart={chart}
          colorScheme={colorScheme}
        />
      ) : null}
      <div
        className={`timeline-body${panning ? " panning" : ""}`}
        ref={bodyRef}
        style={{ cursor: linkMode ? "default" : panning ? "grabbing" : "grab" }}
      >
        <Stage
          width={width}
          height={bodyHeight}
          onWheel={onWheelBody}
          onMouseDown={onBodyMouseDown}
          onMouseUp={endPan}
          onContextMenu={(e) => {
            e.evt.preventDefault();
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;
            if (pos.y < sticky.clipTop) {
              if (linkMode) return;
              onAddMilestoneContextMenu(pos.x, e.evt.clientX, e.evt.clientY);
              return;
            }
            const overTask =
              hitTaskAnchor(pos, liveAnchors, barHeight, {
                linkMode,
                selectedTaskId,
              }) != null;
            if (overTask) return;
            const hit = nearestLinkHit(linkPolylines, pos.x, pos.y);
            if (hit) {
              onLinkContextMenu(hit.fromId, hit.toId, e.evt.clientX, e.evt.clientY);
              return;
            }
            if (linkMode) return;
            onAddMilestoneContextMenu(pos.x, e.evt.clientX, e.evt.clientY);
          }}
          onClick={(e) => {
            if (linkMode) return;
            // Konva は右ボタンの mouseup でも click を出す。右クリックは選択を外さない。
            if (e.evt.button !== 0) return;
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            const stage = e.target.getStage();
            if (e.target === stage) onClearSelection();
          }}
          onTap={(e) => {
            if (linkMode) return;
            const stage = e.target.getStage();
            if (e.target === stage) onClearSelection();
          }}
        >
          <Layer listening={false}>
            <Group
              clipX={0}
              clipY={sticky.clipTop}
              clipWidth={width}
              clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
              listening={false}
            >
              {bgContent}
            </Group>
          </Layer>
          <Layer listening={false}>
            <Group
              clipX={0}
              clipY={sticky.clipTop}
              clipWidth={width}
              clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
              listening={false}
            >
              {linkArrows}
            </Group>
          </Layer>
          <Layer>
            <Group
              clipX={0}
              clipY={sticky.clipTop}
              clipWidth={width}
              clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
            >
            {visibleRows.map((row, index) => {
              if (row.type === "task" || stickyHidden.has(index)) return null;
              const y = row.y - scrollY;
              if (y + rowHeight < 0 || y > bodyHeight) return null;
              if (row.summary == null) return null;
              return (
                <SummaryBar
                  key={`${row.type}-${row.type === "group" ? row.category : ""}-${row.label}-${row.y}`}
                  summary={row.summary}
                  y={y}
                  rowHeight={rowHeight}
                  barHeight={barHeight}
                  dateToX={dateToX}
                  chart={chart}
                />
              );
            })}
            {visibleRows.map((row) => {
              if (row.type !== "task") return null;
              const y = row.y - scrollY;
              if (y + rowHeight < 0 || y > bodyHeight) return null;
              return (
                <TaskBar
                  key={row.task.id}
                  task={row.task}
                  y={y}
                  rowHeight={rowHeight}
                  barHeight={barHeight}
                  pxPerDay={pxPerDay}
                  dateToX={dateToX}
                  exceeded={milestonesExceededBy(row.task, milestones)}
                  selected={selectedTaskId === row.task.id}
                  linkMode={linkMode}
                  linkTarget={
                    linkMode &&
                    hover.hoverTaskId === row.task.id &&
                    row.task.id !== linkSourceId
                  }
                  onLinkPointerDown={armLinkPress}
                  onSelect={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    if (linkMode) {
                      armLinkPress();
                      const now = performance.now();
                      if (now - linkClickAtRef.current < 50) return;
                      linkClickAtRef.current = now;
                      onLinkTargetClick(row.task.id);
                      return;
                    }
                    onSelectTask(row.task.id);
                  }}
                  onOpenEdit={() => {
                    if (linkPressRef.current) return;
                    onOpenEdit(row.task);
                  }}
                  onContextMenu={(x, y) => onTaskContextMenu(row.task.id, x, y)}
                  onMoveTask={(delta) => onMoveTask(row.task.id, delta)}
                  onDragGeometry={onDragGeometry}
                  dragLeft={
                    dragPreview?.taskId === row.task.id &&
                    dragPreview.kind !== "move"
                      ? dragPreview.barLeft
                      : undefined
                  }
                  dragWidth={
                    dragPreview?.taskId === row.task.id &&
                    dragPreview.kind !== "move"
                      ? dragPreview.barWidth
                      : undefined
                  }
                  today={today}
                  memberCatalog={memberCatalog}
                  colorScheme={colorScheme}
                />
              );
            })}
            </Group>
          </Layer>
          <Layer listening={false}>
            <Group
              clipX={0}
              clipY={sticky.clipTop}
              clipWidth={width}
              clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
              listening={false}
            >
              {previewPoints ? (
                <Arrow
                  points={previewPoints}
                  stroke={chart.linkOk}
                  fill={chart.linkOk}
                  strokeWidth={1.25}
                  pointerLength={LINK_POINTER_LENGTH}
                  pointerWidth={LINK_POINTER_LENGTH}
                  listening={false}
                />
              ) : null}
            </Group>
          </Layer>
          <Layer listening={false}>
            <Group
              clipX={0}
              clipY={sticky.clipTop}
              clipWidth={width}
              clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
              listening={false}
            >
              <Line
                points={lightningPoints}
                stroke={chart.lightning}
                strokeWidth={2.5}
                lineJoin="round"
                lineCap="round"
                listening={false}
              />
            </Group>
          </Layer>
          <Layer>
            <Group
              clipX={0}
              clipY={sticky.clipTop}
              clipWidth={width}
              clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
            >
            {selectedRow && selectedRow.type === "task" && !linkMode ? (
              <ResizeHandles
                key={selectedRow.task.id}
                task={selectedRow.task}
                y={selectedRow.y - scrollY}
                rowHeight={rowHeight}
                barHeight={barHeight}
                pxPerDay={pxPerDay}
                dateToX={dateToX}
                onResizeStart={(groupX) =>
                  onResizeStart(selectedRow.task.id, groupX)
                }
                onResizeEnd={(groupX, barWidth) =>
                  onResizeEnd(selectedRow.task.id, groupX, barWidth)
                }
                onDragGeometry={onDragGeometry}
                onContextMenu={(x, y) =>
                  onTaskContextMenu(selectedRow.task.id, x, y)
                }
                chart={chart}
              />
            ) : null}
            {dragPreview ? (
              <DragDateLabels
                preview={dragPreview}
                fontSize={dateFontSize}
                padX={datePadX}
                padY={datePadY}
                gap={dateGap}
                viewportWidth={width}
                viewportHeight={bodyHeight}
                barHeight={barHeight}
                obstacles={dragObstacles}
                chart={chart}
              />
            ) : null}
            </Group>
            {stickyContent}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
