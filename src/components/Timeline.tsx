import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Group, Layer, Line, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { parseDate } from "../model/dates";
import {
  hitTaskAnchor,
  hitTaskResizeEdge,
  type ChartPointer,
} from "../model/chartHitTest";
import { nearestLinkHit, type DependencyLink } from "../model/dependencies";
import { useTimelinePointer } from "../hooks/useTimelinePointer";
import { useTimelineChartPan } from "../hooks/useTimelineChartPan";
import { useTimelineDragDates } from "../hooks/useTimelineDragDates";
import { useTimelineLinkGesture } from "../hooks/useTimelineLinkGesture";
import type { StatusItem } from "../model/statusCatalog";
import type { ColorItem } from "../model/colorCatalog";
import { rowFillForColorId } from "../model/colorCatalog";
import { lightningDate } from "../model/timeline";
import { MILESTONE_GUIDE_DASH, milestonesExceededBy } from "../model/milestones";
import { resolveMilestoneHover } from "../model/milestoneHoverLabel";
import { LAYOUT_HEADER_HEIGHT } from "../model/layoutSizes";
import { visibleDayIndexRange } from "../model/timelineVisibleDays";
import type { Member, MemberId } from "../model/memberTypes";
import type { StickyLayout } from "../model/stickyRows";
import type {
  Category,
  Milestone,
  OutlineRoot,
  ScheduleId,
  Task,
  TaskConnection,
  VisibleRow,
} from "../model/types";
import type { CalendarDocument } from "../model/calendarTypes";
import { paletteFor, type ResolvedColorScheme } from "../model/palette";
import { MilestoneBand } from "./MilestoneBand";
import { buildTimelineBodyColumnNodes } from "./timeline/TimelineBodyGrid";
import { buildTimelineChartHeaderContent } from "./timeline/TimelineChartHeaderContent";
import { TimelineHeaderPanel } from "./timeline/TimelineHeaderPanel";
import { TimelineSummaryBar as SummaryBar } from "./timeline/TimelineSummaryBar";
import { TimelineTaskBar as TaskBar } from "./timeline/TimelineTaskBar";
import { TimelineResizeHandles as ResizeHandles } from "./timeline/TimelineResizeHandles";
import { TimelineDragDateLabels } from "./timeline/TimelineDragDateLabels";
import {
  TimelineLinkPreviewArrow,
  TimelinePredecessorLinks,
} from "./timeline/TimelineConnectionLinks";
import { TimelineConnectionArcs } from "./timeline/TimelineConnectionArcs";
import { useTimelineExplanationLayers } from "../hooks/useTimelineExplanationLayers";
import { buildTimelineMilestoneBandExplanationProps } from "../model/timelineExplanationBandProps";
import type { ExplanationOverlayState } from "../model/explainOverlay";
import { isExplanationTrialVisibleRow } from "../model/explainOverlayPatterns";
import {
  TimelineBodyExplanationBalloons,
  TimelineStageExplanationLayers,
} from "./timeline/TimelineBodyExplanationLayers";
import { TimelineMilestoneExplanationBalloons } from "./timeline/TimelineMilestoneExplanationBalloons";
import {
  applyDragPreviewsToTimelineAnchors,
  buildTimelineTaskAnchors,
} from "../model/timelineLiveAnchors";
import { buildTimelineLinkPolylines } from "../model/timelineLinkPolylines";
import { buildTimelineLinkPreviewPoints } from "../model/timelineLinkPreviewPoints";
import { prepareTimelineConnectionArcs } from "../model/timelinePreparedConnectionArcs";
import {
  MilestoneHoverOverlay,
  type MilestoneHoverState,
} from "./MilestoneHoverOverlay";

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
  selectedTaskIds: ReadonlySet<ScheduleId>;
  selectedTaskId: ScheduleId | null;
  onSelectTask: (
    id: ScheduleId,
    mod: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) => void;
  onClearSelection: () => void;
  onMoveTask: (
    taskId: ScheduleId,
    deltaDays: number,
    taskIds: readonly ScheduleId[],
  ) => void;
  onResizeStart: (taskId: ScheduleId, groupX: number) => void;
  onResizeEnd: (taskId: ScheduleId, groupX: number, barWidth: number) => void;
  links: DependencyLink[];
  connections: TaskConnection[];
  onOpenEdit: (task: Task) => void;
  onTaskContextMenu: (taskId: ScheduleId, x: number, y: number) => void;
  onWheelBody: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onWheelHeader: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onPan: (dx: number, dy: number) => void;
  milestones: Milestone[];
  milestoneBandLayout: import("../model/milestones").MilestoneBandLayout;
  milestoneBandHeight: number;
  milestoneLaneHeight: number;
  milestoneDiamondSize: number;
  milestoneFontSize: number;
  onMoveMilestone: (id: ScheduleId, deltaDays: number) => void;
  onOpenMilestone: (id: ScheduleId) => void;
  onMilestoneContextMenu: (id: ScheduleId, x: number, y: number) => void;
  milestoneGuideLineIds: ReadonlySet<ScheduleId>;
  onToggleMilestoneGuideLine: (id: ScheduleId) => void;
  diffMarkedMilestoneId?: ScheduleId | null;
  diffMarkStrokeWidth?: number;
  today: string;
  statuses: readonly StatusItem[];
  memberCatalog: Map<MemberId, Member> | null;
  calendar: CalendarDocument | null;
  colorScheme: ResolvedColorScheme;
  rowColors: readonly ColorItem[] | null;
  linkSourceId: ScheduleId | null;
  onLinkTargetClick: (taskId: ScheduleId) => void;
  onLinkContextMenu: (
    fromId: ScheduleId,
    toId: ScheduleId,
    x: number,
    y: number,
    linkKind: "predecessor" | "connection",
  ) => void;
  onAddMilestoneContextMenu: (
    chartX: number,
    clientX: number,
    clientY: number,
    bandY?: number,
  ) => void;
  onChartPointer: (pointer: ChartPointer) => void;
  sticky: StickyLayout;
  showLightningLine?: boolean;
  onBarDragActiveChange?: (active: boolean) => void;
  explanationOverlay?: ExplanationOverlayState | null;
  explainOverlayCategories?: Category[];
  explainOverlayOutline?: OutlineRoot;
  explainOverlayLiveAnchorsRef?: React.MutableRefObject<
    Map<ScheduleId, import("../model/connections").TaskBarAnchor>
  >;
  uiScale?: number;
};

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
  selectedTaskIds,
  selectedTaskId,
  onSelectTask,
  onClearSelection,
  onMoveTask,
  onResizeStart,
  onResizeEnd,
  links,
  connections,
  onOpenEdit,
  onTaskContextMenu,
  onWheelBody,
  onWheelHeader,
  onPan,
  milestones,
  milestoneBandLayout,
  milestoneBandHeight,
  milestoneLaneHeight,
  milestoneDiamondSize,
  milestoneFontSize,
  onMoveMilestone,
  onOpenMilestone,
  onMilestoneContextMenu,
  milestoneGuideLineIds,
  onToggleMilestoneGuideLine,
  diffMarkedMilestoneId = null,
  diffMarkStrokeWidth = 3,
  today,
  statuses,
  memberCatalog,
  calendar,
  colorScheme,
  rowColors,
  linkSourceId,
  onLinkTargetClick,
  onLinkContextMenu,
  onAddMilestoneContextMenu,
  onChartPointer,
  sticky,
  showLightningLine = true,
  onBarDragActiveChange,
  explanationOverlay = null,
  explainOverlayCategories = [],
  explainOverlayOutline,
  explainOverlayLiveAnchorsRef,
  uiScale = 1,
}: TimelineProps) {
  const linkMode = linkSourceId != null;
  const chart = useMemo(
    () => paletteFor(colorScheme).chart,
    [colorScheme],
  );
  const cssPalette = useMemo(
    () => paletteFor(colorScheme).css,
    [colorScheme],
  );
  const todayDate = useMemo(() => parseDate(today), [today]);
  const scale = headerHeight / LAYOUT_HEADER_HEIGHT;
  const dateFontSize = Math.max(8, Math.round(11 * scale));
  const datePadX = Math.max(3, Math.round(4 * scale));
  const datePadY = Math.max(1, Math.round(2 * scale));
  const dateGap = Math.max(4, Math.round(4 * scale));
  const {
    dragPreviews,
    registerDragCancel,
    onDragGeometry,
    dragPreviewOverrides,
    dragObstacles,
  } = useTimelineDragDates({
    visibleRows,
    selectedTaskIds,
    timelineStart,
    xToDate,
    pxPerDay,
    dateToX,
    scrollY,
    rowHeight,
    barHeight,
    bodyHeight,
    onBarDragActiveChange,
  });
  const [milestoneHoverId, setMilestoneHoverId] =
    useState<ScheduleId | null>(null);

  const milestoneHover =
    milestoneHoverId == null
      ? null
      : resolveMilestoneHover(
          milestoneHoverId,
          milestoneBandLayout,
          milestoneLaneHeight,
          milestoneDiamondSize,
          milestoneFontSize,
          dateToX,
        );

  useEffect(() => {
    if (milestoneHoverId != null && milestoneHover == null) {
      setMilestoneHoverId(null);
    }
  }, [milestoneHover, milestoneHoverId]);

  const onHoverMilestone = useCallback((hover: MilestoneHoverState | null) => {
    setMilestoneHoverId(hover?.id ?? null);
  }, []);

  const bodyGuideLineMilestones = useMemo(
    () =>
      milestones.filter(
        (milestone) =>
          milestoneGuideLineIds.has(milestone.id) &&
          milestoneBandLayout.centerYById.has(milestone.id),
      ),
    [milestones, milestoneBandLayout.centerYById, milestoneGuideLineIds],
  );

  const [spacePanArmed, setSpacePanArmed] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.tagName === "BUTTON" ||
          target.closest("button, a, [role='button']"))
      ) {
        return;
      }
      if (
        target !== document.body &&
        !(target instanceof HTMLElement && target.closest(".timeline-body"))
      ) {
        return;
      }
      event.preventDefault();
      setSpacePanArmed(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePanArmed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  const dayRange = useMemo(
    () => visibleDayIndexRange(scrollX, pxPerDay, width, totalDays),
    [pxPerDay, scrollX, totalDays, width],
  );

  const headerContent = useMemo(
    () =>
      buildTimelineChartHeaderContent({
        width,
        headerHeight,
        scale,
        tier,
        timelineStart,
        timelineEnd,
        totalDays,
        scrollX,
        pxPerDay,
        dayStart: dayRange.start,
        dayEnd: dayRange.end,
        dateToX,
        today,
        calendar,
        chart,
        accentColor: cssPalette.accent,
      }),
    [
      calendar,
      cssPalette.accent,
      dateToX,
      dayRange.end,
      dayRange.start,
      headerHeight,
      pxPerDay,
      scale,
      scrollX,
      today,
      totalDays,
      tier,
      timelineEnd,
      timelineStart,
      width,
      chart,
    ],
  );

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
      if (row.type !== "task") continue;
      const fill = rowFillForColorId(rowColors, row.task.colorId, colorScheme);
      if (fill == null) continue;
      const y = row.y - scrollY;
      if (y + rowHeight < 0 || y > height) continue;
      elements.push(
        <Rect
          key={`row-fill-${row.task.id}`}
          x={0}
          y={y}
          width={width}
          height={rowHeight}
          fill={fill}
          listening={false}
        />,
      );
    }

    elements.push(
      ...buildTimelineBodyColumnNodes({
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
    rowColors,
    colorScheme,
  ]);

  const stickyContent = useMemo(() => {
    return sticky.draws.map((draw) => {
      const row = visibleRows[draw.index];
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
          clipWidth={width}
          clipHeight={clipHeight}
          listening={false}
        >
          <Rect
            x={0}
            y={draw.top}
            width={width}
            height={rowHeight}
            fill="transparent"
            listening={false}
          />
          {buildTimelineBodyColumnNodes({
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
          {showSummary ? (
            <SummaryBar
              summary={row.summary!}
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
      if (row.type === "task" && isExplanationTrialVisibleRow(row)) continue;
      const y = row.y - scrollY + rowHeight / 2;
      const x =
        row.type === "task"
          ? dateToX(parseDate(lightningDate(row.task, today, statuses)))
          : tx;
      points.push(x, y);
    }
    points.push(tx, bodyHeight);
    return points;
  }, [bodyHeight, dateToX, rowHeight, scrollY, statuses, today, todayDate, visibleRows]);

  const soleSelectedId =
    selectedTaskIds.size === 1 ? selectedTaskIds.values().next().value : null;
  const selectedRow = visibleRows.find(
    (r) => r.type === "task" && r.task.id === soleSelectedId,
  );
  const multiSelectedRows = visibleRows.filter(
    (r) => r.type === "task" && selectedTaskIds.has(r.task.id),
  );

  const taskAnchors = useMemo(
    () =>
      buildTimelineTaskAnchors({
        visibleRows,
        scrollY,
        rowHeight,
        barHeight,
        pxPerDay,
        dateToX,
        skipRow: isExplanationTrialVisibleRow,
      }),
    [barHeight, dateToX, pxPerDay, rowHeight, scrollY, visibleRows],
  );

  const liveAnchors = useMemo(
    () =>
      applyDragPreviewsToTimelineAnchors({
        taskAnchors,
        dragPreviews,
        visibleRows,
        scrollY,
        rowHeight,
        barHeight,
        pxPerDay,
        dateToX,
      }),
    [
      barHeight,
      dateToX,
      dragPreviews,
      pxPerDay,
      rowHeight,
      scrollY,
      taskAnchors,
      visibleRows,
    ],
  );

  const {
    explanationActive,
    explanationOverlayGeometry,
    explanationTrialMilestones,
    milestoneIdsWithTrialMove,
    explanationTrialBars,
    explanationTrialPredecessorArcs,
  } = useTimelineExplanationLayers({
    explanationOverlay,
    explainOverlayCategories,
    explainOverlayOutline,
    explainOverlayLiveAnchorsRef,
    visibleRows,
    dateToX,
    pxPerDay,
    scrollY,
    rowHeight,
    barHeight,
    bodyHeight,
    headerHeight,
    width,
    liveAnchors,
    milestones,
    milestoneBandLayout,
    milestoneDiamondSize,
    tier,
    memberCatalog,
    uiScale,
  });


  const resizeHitAt = useCallback(
    (pos: { x: number; y: number }) =>
      hitTaskResizeEdge(pos, liveAnchors, barHeight),
    [barHeight, liveAnchors],
  );

  const preparedConnectionArcs = useMemo(
    () =>
      prepareTimelineConnectionArcs({
        connections,
        visibleRows,
        scrollY,
        rowHeight,
        barHeight,
        bodyHeight,
        dateToX,
        pxPerDay,
        liveAnchors,
      }),
    [
      barHeight,
      bodyHeight,
      connections,
      dateToX,
      liveAnchors,
      pxPerDay,
      rowHeight,
      scrollY,
      visibleRows,
    ],
  );

  const linkPolylines = useMemo(
    () =>
      buildTimelineLinkPolylines({
        links,
        preparedConnectionArcs,
        liveAnchors,
        visibleRows,
        dragPreviewOverrides,
        barHeight,
      }),
    [
      barHeight,
      dragPreviewOverrides,
      links,
      liveAnchors,
      preparedConnectionArcs,
      visibleRows,
    ],
  );

  const bandMilestones = useMemo(
    () => milestoneBandLayout.blocks.flatMap((block) => block.milestones),
    [milestoneBandLayout],
  );

  const {
    panSession,
    panning,
    suppressClickRef,
    beginPan,
    endPan,
    commitLinkScrollPan,
  } = useTimelineChartPan({ onPan });

  const { bodyRef, bandRef, hover, previewEnd } = useTimelinePointer({
    linkMode,
    milestones: bandMilestones,
    milestoneCenterYById: milestoneBandLayout.centerYById,
    milestoneDisplayLabels: milestoneBandLayout.displayLabels,
    dateToX,
    milestoneDiamondSize,
    milestoneFontSize,
    liveAnchors,
    linkPolylines,
    barHeight,
    selectedTaskId,
    clipTop: sticky.clipTop,
    onChartPointer,
    panTrackActive: panSession,
  });

  const previewPoints = useMemo(
    () =>
      buildTimelineLinkPreviewPoints({
        linkSourceId,
        previewEnd,
        liveAnchors,
        barHeight,
      }),
    [barHeight, linkSourceId, liveAnchors, previewEnd],
  );

  const { linkBarPointerDown, onBodyMouseDown, linkPressRef } =
    useTimelineLinkGesture({
    linkMode,
    bodyRef,
    liveAnchors,
    barHeight,
    selectedTaskId,
    spacePanArmed,
    onLinkTargetClick,
    suppressClickRef,
    beginPan,
    endPan,
    commitLinkScrollPan,
    resizeHitAt,
  });

  return (
    <div className="timeline">
      <TimelineHeaderPanel
        width={width}
        headerHeight={headerHeight}
        headerContent={headerContent}
        linkMode={linkMode}
        explanationActive={explanationActive}
        colorScheme={colorScheme}
        headerHoles={explanationOverlayGeometry?.headerHoles ?? []}
        headerBalloons={explanationOverlayGeometry?.headerBalloons ?? []}
        onWheelHeader={onWheelHeader}
        onAddMilestoneContextMenu={onAddMilestoneContextMenu}
      />
      {milestoneBandHeight > 0 ? (
        <MilestoneBand
          bandLayout={milestoneBandLayout}
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
          onToggleGuideLine={onToggleMilestoneGuideLine}
          onEmptyContextMenu={onAddMilestoneContextMenu}
          onWheel={onWheelHeader}
          chart={chart}
          onHoverMilestone={onHoverMilestone}
          milestoneGuideLineIds={milestoneGuideLineIds}
          diffMarkedMilestoneId={diffMarkedMilestoneId}
          diffMarkStrokeWidth={diffMarkStrokeWidth}
          {...buildTimelineMilestoneBandExplanationProps({
            active: explanationActive,
            milestoneHoles: explanationOverlayGeometry?.milestoneHoles,
            colorScheme,
            trialMilestones: explanationTrialMilestones,
            milestoneIdsWithTrialMove,
          })}
        />
      ) : null}
      <TimelineMilestoneExplanationBalloons
        active={explanationActive}
        milestoneBandHeight={milestoneBandHeight}
        headerHeight={headerHeight}
        width={width}
        uiScale={uiScale}
        geometry={explanationOverlayGeometry}
      />
      <MilestoneHoverOverlay
        hover={milestoneHover}
        bandTopPx={headerHeight}
        chartWidth={width}
        fontSize={milestoneFontSize}
        chart={chart}
        bandBackground={cssPalette.milestoneBand}
      />
      <div
        className={`timeline-body${linkMode ? " linking" : ""}${panning ? " panning" : ""}`}
        ref={bodyRef}
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
            if (resizeHitAt(pos) != null) return;
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
              onLinkContextMenu(
                hit.fromId,
                hit.toId,
                e.evt.clientX,
                e.evt.clientY,
                hit.kind ?? "predecessor",
              );
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
            const pos = stage?.getPointerPosition();
            if (pos != null && resizeHitAt(pos) != null) return;
            if (e.target === stage) onClearSelection();
          }}
          onTap={(e) => {
            if (linkMode) return;
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (pos != null && resizeHitAt(pos) != null) return;
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
              <TimelinePredecessorLinks
                linkPolylines={linkPolylines}
                hover={hover}
                chart={chart}
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
            {hover.hoverTaskId != null &&
            hover.hoverTaskId !== selectedTaskId &&
            visibleRows.find(
              (row) =>
                row.type === "task" && row.task.id === hover.hoverTaskId,
            ) ? (
              <Rect
                key={`hover-row-${hover.hoverTaskId}`}
                x={0}
                y={
                  (
                    visibleRows.find(
                      (row) =>
                        row.type === "task" &&
                        row.task.id === hover.hoverTaskId,
                    )!
                  ).y - scrollY
                }
                width={width}
                height={rowHeight}
                fill={cssPalette.hoverRow}
                listening={false}
              />
            ) : null}
            {multiSelectedRows.map((row) =>
              row.type === "task" ? (
                <Rect
                  key={`selected-row-${row.task.id}`}
                  x={0}
                  y={row.y - scrollY}
                  width={width}
                  height={rowHeight}
                  fill={cssPalette.selectedRow}
                  listening={false}
                />
              ) : null,
            )}
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
              if (row.type !== "task" || isExplanationTrialVisibleRow(row)) return null;
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
                  selected={selectedTaskIds.has(row.task.id)}
                  selectedTaskIds={selectedTaskIds}
                  allowResizeEdges={
                    !selectedTaskIds.has(row.task.id) ||
                    selectedTaskIds.size <= 1
                  }
                  linkMode={linkMode}
                  linkTarget={
                    linkMode &&
                    hover.hoverTaskId === row.task.id &&
                    row.task.id !== linkSourceId
                  }
                  onLinkBarPointerDown={linkBarPointerDown}
                  onSelect={(e) => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    if (linkMode) return;
                    onSelectTask(row.task.id, {
                      shiftKey: e.evt.shiftKey,
                      metaKey: e.evt.metaKey,
                      ctrlKey: e.evt.ctrlKey,
                    });
                  }}
                  onOpenEdit={() => {
                    if (linkPressRef.current) return;
                    onOpenEdit(row.task);
                  }}
                  onContextMenu={(x, y) => onTaskContextMenu(row.task.id, x, y)}
                  onMoveTask={(delta, taskIds) =>
                    onMoveTask(row.task.id, delta, taskIds)
                  }
                  onResizeStart={(groupX) =>
                    onResizeStart(row.task.id, groupX)
                  }
                  onResizeEnd={(groupX, barWidth) =>
                    onResizeEnd(row.task.id, groupX, barWidth)
                  }
                  onDragGeometry={onDragGeometry}
                  onBeginPan={beginPan}
                  panScrollArmed={spacePanArmed}
                  onDragMoved={() => {
                    suppressClickRef.current = true;
                  }}
                  registerDragCancel={registerDragCancel}
                  chart={chart}
                  dragLeft={
                    dragPreviews?.find(
                      (preview) =>
                        preview.taskId === row.task.id &&
                        preview.kind !== "move",
                    )?.barLeft
                  }
                  dragWidth={
                    dragPreviews?.find(
                      (preview) =>
                        preview.taskId === row.task.id &&
                        preview.kind !== "move",
                    )?.barWidth
                  }
                  today={today}
                  statuses={statuses}
                  memberCatalog={memberCatalog}
                  colorScheme={colorScheme}
                  tier={tier}
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
              <TimelineConnectionArcs
                preparedConnectionArcs={preparedConnectionArcs}
                hover={hover}
                chart={chart}
                visibleRows={visibleRows}
                scrollY={scrollY}
                rowHeight={rowHeight}
                barHeight={barHeight}
                bodyHeight={bodyHeight}
                dateToX={dateToX}
                pxPerDay={pxPerDay}
                tier={tier}
                memberCatalog={memberCatalog}
                liveAnchors={liveAnchors}
              />
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
              <TimelineLinkPreviewArrow
                previewPoints={previewPoints}
                chart={chart}
              />
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
              {bodyGuideLineMilestones.map((milestone) => (
                <Line
                  key={milestone.id}
                  points={[
                    dateToX(parseDate(milestone.date)),
                    sticky.clipTop,
                    dateToX(parseDate(milestone.date)),
                    bodyHeight,
                  ]}
                  stroke={chart.milestoneGuideLine}
                  strokeWidth={1}
                  dash={[...MILESTONE_GUIDE_DASH]}
                  listening={false}
                />
              ))}
              <Line
                points={[
                  dateToX(todayDate),
                  sticky.clipTop,
                  dateToX(todayDate),
                  bodyHeight,
                ]}
                stroke={cssPalette.accent}
                strokeWidth={1}
                opacity={0.85}
                listening={false}
              />
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
              {showLightningLine ? (
              <Line
                points={lightningPoints}
                stroke={chart.lightning}
                strokeWidth={1.5}
                opacity={0.55}
                lineJoin="round"
                lineCap="round"
                listening={false}
              />
              ) : null}
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
                registerDragCancel={registerDragCancel}
                chart={chart}
              />
            ) : null}
            {dragPreviews?.map((preview) => (
              <TimelineDragDateLabels
                key={preview.taskId}
                preview={preview}
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
            ))}
            </Group>
            {stickyContent}
          </Layer>
          <TimelineStageExplanationLayers
            active={explanationActive}
            width={width}
            bodyHeight={bodyHeight}
            colorScheme={colorScheme}
            clipTop={sticky.clipTop}
            clipHeight={Math.max(0, bodyHeight - sticky.clipTop)}
            geometry={explanationOverlayGeometry}
            trialBars={explanationTrialBars}
            predecessorArcs={explanationTrialPredecessorArcs}
            connectionArcColor={chart.connectionArc}
            connectionArcHaloColor={chart.connectionArcHalo}
          />
        </Stage>
        <TimelineBodyExplanationBalloons
          active={explanationActive}
          geometry={explanationOverlayGeometry}
        />
      </div>
    </div>
  );
}
