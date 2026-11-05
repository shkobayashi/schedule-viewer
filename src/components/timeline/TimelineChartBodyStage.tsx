import type { MutableRefObject, ReactNode } from "react";
import { Group, Layer, Line, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { parseDate } from "../../model/dates";
import {
  hitTaskAnchor,
  hitTaskResizeEdge,
  type ChartHover,
} from "../../model/chartHitTest";
import { nearestLinkHit } from "../../model/dependencies";
import type { DragBarGeometry, DragDatePreview } from "../../model/dragDates";
import type { ExplanationOverlayGeometry } from "../../model/explainOverlayLayout";
import {
  isExplanationTrialVisibleRow,
  type ExplanationTrialBarLayout,
  type ExplanationTrialPredecessorArc,
} from "../../model/explainOverlayPatterns";
import { MILESTONE_GUIDE_DASH, milestonesExceededBy } from "../../model/milestones";
import type { StatusItem } from "../../model/statusCatalog";
import type { Member, MemberId } from "../../model/memberTypes";
import type { ChartPalette, CssPalette, ResolvedColorScheme } from "../../model/palette";
import type { StickyLayout } from "../../model/stickyRows";
import type { PreparedTimelineConnectionArc } from "../../model/timelinePreparedConnectionArcs";
import type { TimelineLinkPolyline } from "../../model/timelineLinkPolylines";
import type { TimelineLiveAnchor } from "../../model/timelineLiveAnchors";
import { timelineVisibleBarObstacles } from "../../model/timelineVisibleBarObstacles";
import type {
  Milestone,
  ScheduleId,
  Task,
  VisibleRow,
} from "../../model/types";
import { TimelineSummaryBar as SummaryBar } from "./TimelineSummaryBar";
import { TimelineTaskBar as TaskBar } from "./TimelineTaskBar";
import { TimelineResizeHandles as ResizeHandles } from "./TimelineResizeHandles";
import { TimelineDragDateLabels } from "./TimelineDragDateLabels";
import {
  TimelineLinkPreviewArrow,
  TimelinePredecessorLinks,
} from "./TimelineConnectionLinks";
import { TimelineConnectionArcs } from "./TimelineConnectionArcs";
import { TimelineStageExplanationLayers } from "./TimelineBodyExplanationLayers";

export type TimelineChartBodyStageProps = {
  width: number;
  bodyHeight: number;
  onWheelBody: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onBodyMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  endPan: () => void;
  resizeHitAt: (pos: { x: number; y: number }) => ReturnType<typeof hitTaskResizeEdge>;
  sticky: StickyLayout;
  linkMode: boolean;
  onAddMilestoneContextMenu: (
    chartX: number,
    clientX: number,
    clientY: number,
  ) => void;
  liveAnchors: ReadonlyMap<ScheduleId, TimelineLiveAnchor>;
  barHeight: number;
  selectedTaskId: ScheduleId | null;
  linkPolylines: TimelineLinkPolyline[];
  onLinkContextMenu: (
    fromId: ScheduleId,
    toId: ScheduleId,
    x: number,
    y: number,
    linkKind: "predecessor" | "connection",
  ) => void;
  suppressClickRef: MutableRefObject<boolean>;
  onClearSelection: () => void;
  bgContent: ReactNode;
  hover: ChartHover;
  visibleRows: readonly VisibleRow[];
  scrollY: number;
  rowHeight: number;
  cssPalette: CssPalette;
  multiSelectedRows: VisibleRow[];
  milestones: Milestone[];
  selectedTaskIds: ReadonlySet<ScheduleId>;
  linkSourceId: ScheduleId | null;
  linkBarPointerDown: (
    e: Konva.KonvaEventObject<PointerEvent>,
    taskId: ScheduleId,
  ) => void;
  linkPressRef: MutableRefObject<boolean>;
  onOpenEdit: (task: Task) => void;
  onTaskContextMenu: (taskId: ScheduleId, x: number, y: number) => void;
  onMoveTask: (
    taskId: ScheduleId,
    deltaDays: number,
    taskIds: readonly ScheduleId[],
  ) => void;
  onResizeStart: (taskId: ScheduleId, groupX: number) => void;
  onResizeEnd: (taskId: ScheduleId, groupX: number, barWidth: number) => void;
  onDragGeometry: (geometry: DragBarGeometry | null) => void;
  beginPan: (clientX: number, clientY: number) => void;
  spacePanArmed: boolean;
  registerDragCancel: (cancel: (() => void) | null) => void;
  chart: ChartPalette;
  dragPreviews: readonly DragDatePreview[] | null;
  today: string;
  statuses: readonly StatusItem[];
  memberCatalog: Map<MemberId, Member> | null;
  colorScheme: ResolvedColorScheme;
  tier: "day" | "week" | "month";
  preparedConnectionArcs: PreparedTimelineConnectionArc[];
  previewPoints: number[] | null;
  bodyGuideLineMilestones: Milestone[];
  dateToX: (d: Date) => number;
  todayDate: Date;
  showLightningLine: boolean;
  lightningPoints: number[];
  selectedRow: VisibleRow | undefined;
  stickyContent: ReactNode;
  stickyHidden: ReadonlySet<number>;
  dateFontSize: number;
  datePadX: number;
  datePadY: number;
  dateGap: number;
  dragObstacles: ReturnType<typeof timelineVisibleBarObstacles>;
  pxPerDay: number;
  explanationActive: boolean;
  explanationOverlayGeometry: ExplanationOverlayGeometry | null;
  explanationTrialBars: ExplanationTrialBarLayout[];
  explanationTrialPredecessorArcs: ExplanationTrialPredecessorArc[];
  onSelectTask: (
    id: ScheduleId,
    mod: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
  ) => void;
};

export function TimelineChartBodyStage({
  width,
  bodyHeight,
  onWheelBody,
  onBodyMouseDown,
  endPan,
  resizeHitAt,
  sticky,
  linkMode,
  onAddMilestoneContextMenu,
  liveAnchors,
  barHeight,
  selectedTaskId,
  linkPolylines,
  onLinkContextMenu,
  suppressClickRef,
  onClearSelection,
  bgContent,
  hover,
  visibleRows,
  scrollY,
  rowHeight,
  cssPalette,
  multiSelectedRows,
  milestones,
  selectedTaskIds,
  linkSourceId,
  linkBarPointerDown,
  onSelectTask,
  linkPressRef,
  onOpenEdit,
  onTaskContextMenu,
  onMoveTask,
  onResizeStart,
  onResizeEnd,
  onDragGeometry,
  beginPan,
  spacePanArmed,
  registerDragCancel,
  chart,
  dragPreviews,
  today,
  statuses,
  memberCatalog,
  colorScheme,
  tier,
  preparedConnectionArcs,
  previewPoints,
  bodyGuideLineMilestones,
  dateToX,
  todayDate,
  showLightningLine,
  lightningPoints,
  selectedRow,
  stickyContent,
  stickyHidden,
  dateFontSize,
  datePadX,
  datePadY,
  dateGap,
  dragObstacles,
  pxPerDay,
  explanationActive,
  explanationOverlayGeometry,
  explanationTrialBars,
  explanationTrialPredecessorArcs,
}: TimelineChartBodyStageProps) {
  return (
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
  );
}
