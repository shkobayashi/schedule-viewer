import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Arrow, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import { addDays, addUtcMonths, fmtShort, parseDate, utcMonthStart } from "../model/dates";
import {
  linkPoints,
  nearestLinkHit,
  type DependencyLink,
  type LinkPolyline,
} from "../model/dependencies";
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
  onChartPointer: (pointer: ChartPointer) => void;
};

export type ChartPointer = {
  overTask: boolean;
  overMilestone: boolean;
  link: { fromId: ScheduleId; toId: ScheduleId } | null;
};

const HANDLE_WIDTH = 8;
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
  today: string;
  memberCatalog: Map<MemberId, Member> | null;
  colorScheme: ResolvedColorScheme;
}) {
  const chart = paletteFor(colorScheme).chart;
  const start = parseDate(task.start);
  const x = dateToX(start);
  const w = taskBarWidthPx(task, dateToX, pxPerDay);
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
      }}
      onDragEnd={(e) => {
        const node = e.target;
        if (!node.draggable()) return;
        const delta = Math.round((node.x() - origXRef.current) / pxPerDay);
        node.position({ x: origXRef.current + delta * pxPerDay, y: barY });
        node.draggable(false);
        onMoveTask(delta);
      }}
    >
      <Rect
        width={w}
        height={barHeight}
        fill={colors.bg}
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
          e.target.getLayer()?.batchDraw();
        }}
        onDragEnd={() => {
          const g = groupRef.current;
          leftMaxXRef.current = null;
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
          e.target.getLayer()?.batchDraw();
        }}
        onDragEnd={() => {
          const g = groupRef.current;
          const bg = bgRef.current;
          if (!g || !bg) return;
          onResizeEnd(g.x(), bg.width());
        }}
      />
    </Group>
  );
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
  onChartPointer,
}: TimelineProps) {
  const linkMode = linkSourceId != null;
  const chart = useMemo(
    () => paletteFor(colorScheme).chart,
    [colorScheme],
  );
  const todayDate = useMemo(() => parseDate(today), [today]);
  const scale = headerHeight / LAYOUT_HEADER_HEIGHT;
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

  const bgContent = useMemo(() => {
    const elements: ReactNode[] = [];
    const height = bodyHeight;

    for (const row of visibleRows) {
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

    if (tier !== "month") {
      const bands = nonWorkingDayClipRects(
        timelineStart,
        dayRange.start,
        dayRange.end,
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
            key={`nwd-${i}-${band.x}`}
            x={band.x}
            y={0}
            width={band.width}
            height={height}
            fill={chart.nonWorking}
            listening={false}
          />,
        );
      }
      for (let i = dayRange.start; i <= dayRange.end; i += 1) {
        const d = addDays(timelineStart, i);
        const x = dateToX(d);
        if (x < -10 || x > width + 10) continue;
        const isMonday = d.getUTCDay() === 1;
        if (tier === "day" || isMonday) {
          elements.push(
            <Line
              key={`vg-${i}`}
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
              key={`mg-${d.getTime()}`}
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

    for (const row of visibleRows) {
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
    visibleRows,
    width,
    chart,
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

  const linkPolylines = useMemo(() => {
    const polylines: Array<LinkPolyline & { broken: boolean }> = [];
    for (const link of links) {
      const from = taskAnchors.get(link.fromId);
      const to = taskAnchors.get(link.toId);
      if (!from || !to) continue;
      polylines.push({
        fromId: link.fromId,
        toId: link.toId,
        broken: link.broken,
        points: linkPoints(from.linkRight, from.y, to.x, to.y),
      });
    }
    return polylines;
  }, [links, taskAnchors]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [clientPointer, setClientPointer] = useState<{
    x: number;
    y: number;
    sidebar: boolean;
  } | null>(null);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const sidebar =
        event.target instanceof Element &&
        event.target.closest(".sidebar") != null;
      setClientPointer({ x: event.clientX, y: event.clientY, sidebar });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const chartPointer = useMemo(() => {
    const empty = {
      overTask: false,
      overMilestone: false,
      link: null as ChartPointer["link"],
      hoverTaskId: null as ScheduleId | null,
      previewEnd: null as { x: number; y: number } | null,
    };
    if (clientPointer == null) return empty;

    let overMilestone = false;
    const band = bandRef.current?.getBoundingClientRect();
    if (
      band &&
      clientPointer.x >= band.left &&
      clientPointer.x <= band.right &&
      clientPointer.y >= band.top &&
      clientPointer.y <= band.bottom
    ) {
      const x = clientPointer.x - band.left;
      const y = clientPointer.y - band.top;
      const radius = milestoneDiamondSize / 2 + 2;
      for (const milestone of milestones) {
        const cx = dateToX(parseDate(milestone.date));
        const lane = milestoneLanes.get(milestone.id) ?? 0;
        const cy = lane * milestoneLaneHeight + milestoneLaneHeight / 2;
        if (Math.hypot(x - cx, y - cy) <= radius) {
          overMilestone = true;
          break;
        }
      }
    }

    const body = bodyRef.current?.getBoundingClientRect();
    if (!body) return { ...empty, overMilestone };

    const local = {
      x: clientPointer.x - body.left,
      y: clientPointer.y - body.top,
    };
    const insideBody =
      clientPointer.x >= body.left &&
      clientPointer.x <= body.right &&
      clientPointer.y >= body.top &&
      clientPointer.y <= body.bottom;

    let hoverTaskId: ScheduleId | null = null;
    let hoverAnchor: { x: number; y: number } | null = null;
    if (insideBody) {
      for (const [id, anchor] of taskAnchors) {
        const top = anchor.y - barHeight / 2;
        const bottom = anchor.y + barHeight / 2;
        const handlePad =
          !linkMode && id === selectedTaskId ? HANDLE_WIDTH / 2 : 0;
        if (
          local.x >= anchor.x - handlePad &&
          local.x <= anchor.right + handlePad &&
          local.y >= top &&
          local.y <= bottom
        ) {
          hoverTaskId = id;
          hoverAnchor = anchor;
          break;
        }
      }
    }
    const overTask = hoverTaskId != null;
    const link =
      insideBody && !overTask && !overMilestone
        ? nearestLinkHit(linkPolylines, local.x, local.y)
        : null;

    let previewEnd: { x: number; y: number } | null = null;
    if (linkMode) {
      if (clientPointer.sidebar) previewEnd = { x: 0, y: local.y };
      else if (hoverAnchor) previewEnd = { x: hoverAnchor.x, y: hoverAnchor.y };
      else previewEnd = local;
    }

    return {
      overTask,
      overMilestone,
      link,
      hoverTaskId,
      previewEnd,
    };
  }, [
    barHeight,
    clientPointer,
    dateToX,
    linkMode,
    linkPolylines,
    milestoneDiamondSize,
    milestoneLaneHeight,
    milestoneLanes,
    milestones,
    selectedTaskId,
    taskAnchors,
  ]);

  const onChartPointerRef = useRef(onChartPointer);
  onChartPointerRef.current = onChartPointer;
  useEffect(() => {
    onChartPointerRef.current({
      overTask: chartPointer.overTask,
      overMilestone: chartPointer.overMilestone,
      link: chartPointer.link,
    });
  }, [chartPointer.link, chartPointer.overMilestone, chartPointer.overTask]);

  const linkArrows = useMemo(() => {
    return linkPolylines.flatMap((link) => {
      const hovered =
        chartPointer.link?.fromId === link.fromId &&
        chartPointer.link.toId === link.toId;
      const color = link.broken ? chart.linkBroken : chart.linkOk;
      const strokeWidth = link.broken ? 1.75 : 1.25;
      return [
        <Arrow
          key={`${link.fromId}-${link.toId}`}
          points={link.points}
          stroke={color}
          fill={color}
          strokeWidth={hovered ? strokeWidth + 1.5 : strokeWidth}
          pointerLength={7}
          pointerWidth={7}
          listening={false}
        />,
      ];
    });
  }, [chart, chartPointer.link, linkPolylines]);

  const previewPoints = useMemo(() => {
    if (!linkSourceId || !chartPointer.previewEnd) return null;
    const from = taskAnchors.get(linkSourceId);
    if (!from) return null;
    return linkPoints(
      from.linkRight,
      from.y,
      chartPointer.previewEnd.x,
      chartPointer.previewEnd.y,
    );
  }, [chartPointer.previewEnd, linkSourceId, taskAnchors]);

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
        <Stage width={width} height={headerHeight} onWheel={onWheelHeader}>
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
          onWheel={onWheelHeader}
          chart={chart}
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
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (!pos) return;
            const overTask = [...taskAnchors].some(([id, anchor]) => {
              const top = anchor.y - barHeight / 2;
              const bottom = anchor.y + barHeight / 2;
              const handlePad =
                !linkMode && id === selectedTaskId ? HANDLE_WIDTH / 2 : 0;
              return (
                pos.x >= anchor.x - handlePad &&
                pos.x <= anchor.right + handlePad &&
                pos.y >= top &&
                pos.y <= bottom
              );
            });
            if (overTask) {
              if (linkMode) e.evt.preventDefault();
              return;
            }
            const hit = nearestLinkHit(linkPolylines, pos.x, pos.y);
            if (hit) {
              e.evt.preventDefault();
              onLinkContextMenu(hit.fromId, hit.toId, e.evt.clientX, e.evt.clientY);
              return;
            }
            if (linkMode) e.evt.preventDefault();
          }}
          onClick={(e) => {
            if (linkMode) return;
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
          <Layer listening={false}>{bgContent}</Layer>
          <Layer listening={false}>{linkArrows}</Layer>
          <Layer>
            {visibleRows.map((row) => {
              if (row.type === "task") return null;
              const y = row.y - scrollY;
              if (y + rowHeight < 0 || y > bodyHeight) return null;
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
                    chartPointer.hoverTaskId === row.task.id &&
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
                  today={today}
                  memberCatalog={memberCatalog}
                  colorScheme={colorScheme}
                />
              );
            })}
          </Layer>
          <Layer listening={false}>
            {previewPoints ? (
              <Arrow
                points={previewPoints}
                stroke={chart.linkOk}
                fill={chart.linkOk}
                strokeWidth={1.25}
                pointerLength={7}
                pointerWidth={7}
                listening={false}
              />
            ) : null}
          </Layer>
          <Layer listening={false}>
            <Line
              points={lightningPoints}
              stroke={chart.lightning}
              strokeWidth={2.5}
              lineJoin="round"
              lineCap="round"
              listening={false}
            />
          </Layer>
          <Layer>
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
                onContextMenu={(x, y) =>
                  onTaskContextMenu(selectedRow.task.id, x, y)
                }
                chart={chart}
              />
            ) : null}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
