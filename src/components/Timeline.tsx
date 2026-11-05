import {
  useCallback,
  useMemo,
} from "react";
import type Konva from "konva";
import { parseDate } from "../model/dates";
import {
  hitTaskResizeEdge,
  type ChartPointer,
} from "../model/chartHitTest";
import type { DependencyLink } from "../model/dependencies";
import { useTimelinePointer } from "../hooks/useTimelinePointer";
import { useTimelineChartPan } from "../hooks/useTimelineChartPan";
import { useTimelineDragDates } from "../hooks/useTimelineDragDates";
import { useTimelineLinkGesture } from "../hooks/useTimelineLinkGesture";
import { useTimelineSpacePanArm } from "../hooks/useTimelineSpacePanArm";
import { useTimelineMilestoneHover } from "../hooks/useTimelineMilestoneHover";
import type { StatusItem } from "../model/statusCatalog";
import type { ColorItem } from "../model/colorCatalog";
import { visibleDayIndexRange } from "../model/timelineVisibleDays";
import { filterTimelineBodyGuideLineMilestones } from "../model/timelineBodyGuideMilestones";
import { buildTimelineLightningPolyline } from "../model/timelineLightningPolyline";
import { timelineDragDateChipMetrics } from "../model/timelineDragDateChipMetrics";
import { LAYOUT_HEADER_HEIGHT } from "../model/layoutSizes";
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
import { buildTimelineChartHeaderContent } from "./timeline/TimelineChartHeaderContent";
import { TimelineHeaderPanel } from "./timeline/TimelineHeaderPanel";
import { buildTimelineBodyBackgroundContent } from "./timeline/TimelineBodyBackground";
import { buildTimelineStickyParentRowContent } from "./timeline/TimelineStickyParentRows";
import { TimelineChartBodyStage } from "./timeline/TimelineChartBodyStage";
import { useTimelineExplanationLayers } from "../hooks/useTimelineExplanationLayers";
import { buildTimelineMilestoneBandExplanationProps } from "../model/timelineExplanationBandProps";
import type { ExplanationOverlayState } from "../model/explainOverlay";
import { isExplanationTrialVisibleRow } from "../model/explainOverlayPatterns";
import { TimelineBodyExplanationBalloons } from "./timeline/TimelineBodyExplanationLayers";
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
  const { dateFontSize, datePadX, datePadY, dateGap } = useMemo(
    () => timelineDragDateChipMetrics(headerHeight),
    [headerHeight],
  );
  const scale = headerHeight / LAYOUT_HEADER_HEIGHT;
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
  const { milestoneHover, onHoverMilestone } = useTimelineMilestoneHover({
    milestoneBandLayout,
    milestoneLaneHeight,
    milestoneDiamondSize,
    milestoneFontSize,
    dateToX,
  });

  const bodyGuideLineMilestones = useMemo(
    () =>
      filterTimelineBodyGuideLineMilestones({
        milestones,
        milestoneGuideLineIds,
        milestoneCenterYById: milestoneBandLayout.centerYById,
      }),
    [milestones, milestoneBandLayout.centerYById, milestoneGuideLineIds],
  );

  const spacePanArmed = useTimelineSpacePanArm();
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

  const bgContent = useMemo(
    () =>
      buildTimelineBodyBackgroundContent({
        visibleRows,
        stickyHidden,
        scrollY,
        rowHeight,
        bodyHeight,
        width,
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
        rowColors,
        colorScheme,
      }),
    [
      bodyHeight,
      calendar,
      colorScheme,
      dateToX,
      dayRange.end,
      dayRange.start,
      pxPerDay,
      rowHeight,
      rowColors,
      scrollY,
      stickyHidden,
      tier,
      timelineEnd,
      timelineStart,
      totalDays,
      visibleRows,
      width,
      chart,
    ],
  );

  const stickyContent = useMemo(
    () =>
      buildTimelineStickyParentRowContent({
        sticky,
        visibleRows,
        width,
        bodyHeight,
        rowHeight,
        barHeight,
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
    [
      barHeight,
      bodyHeight,
      calendar,
      chart,
      dateToX,
      dayRange.end,
      dayRange.start,
      pxPerDay,
      rowHeight,
      sticky,
      tier,
      timelineEnd,
      timelineStart,
      totalDays,
      visibleRows,
      width,
    ],
  );

  const lightningPoints = useMemo(
    () =>
      buildTimelineLightningPolyline({
        visibleRows,
        scrollY,
        rowHeight,
        bodyHeight,
        today,
        todayDate,
        statuses,
        dateToX,
      }),
    [bodyHeight, dateToX, rowHeight, scrollY, statuses, today, todayDate, visibleRows],
  );

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
        <TimelineChartBodyStage
          width={width}
          bodyHeight={bodyHeight}
          onWheelBody={onWheelBody}
          onBodyMouseDown={onBodyMouseDown}
          endPan={endPan}
          resizeHitAt={resizeHitAt}
          sticky={sticky}
          linkMode={linkMode}
          onAddMilestoneContextMenu={onAddMilestoneContextMenu}
          liveAnchors={liveAnchors}
          barHeight={barHeight}
          selectedTaskId={selectedTaskId}
          linkPolylines={linkPolylines}
          onLinkContextMenu={onLinkContextMenu}
          suppressClickRef={suppressClickRef}
          onClearSelection={onClearSelection}
          bgContent={bgContent}
          hover={hover}
          visibleRows={visibleRows}
          scrollY={scrollY}
          rowHeight={rowHeight}
          cssPalette={cssPalette}
          multiSelectedRows={multiSelectedRows}
          milestones={milestones}
          selectedTaskIds={selectedTaskIds}
          linkSourceId={linkSourceId}
          linkBarPointerDown={linkBarPointerDown}
          onSelectTask={onSelectTask}
          linkPressRef={linkPressRef}
          onOpenEdit={onOpenEdit}
          onTaskContextMenu={onTaskContextMenu}
          onMoveTask={onMoveTask}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          onDragGeometry={onDragGeometry}
          beginPan={beginPan}
          spacePanArmed={spacePanArmed}
          registerDragCancel={registerDragCancel}
          chart={chart}
          dragPreviews={dragPreviews}
          today={today}
          statuses={statuses}
          memberCatalog={memberCatalog}
          colorScheme={colorScheme}
          tier={tier}
          preparedConnectionArcs={preparedConnectionArcs}
          previewPoints={previewPoints}
          bodyGuideLineMilestones={bodyGuideLineMilestones}
          dateToX={dateToX}
          todayDate={todayDate}
          showLightningLine={showLightningLine}
          lightningPoints={lightningPoints}
          selectedRow={selectedRow}
          stickyContent={stickyContent}
          stickyHidden={stickyHidden}
          dateFontSize={dateFontSize}
          datePadX={datePadX}
          datePadY={datePadY}
          dateGap={dateGap}
          dragObstacles={dragObstacles}
          pxPerDay={pxPerDay}
          explanationActive={explanationActive}
          explanationOverlayGeometry={explanationOverlayGeometry}
          explanationTrialBars={explanationTrialBars}
          explanationTrialPredecessorArcs={explanationTrialPredecessorArcs}
        />
        <TimelineBodyExplanationBalloons
          active={explanationActive}
          geometry={explanationOverlayGeometry}
        />
      </div>
    </div>
  );
}
