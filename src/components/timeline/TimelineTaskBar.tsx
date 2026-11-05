import { useCallback, useEffect, useMemo, useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import { parseDate } from "../../model/dates";
import type { DragBarGeometry } from "../../model/dragDates";
import { hatchCanvas } from "../../model/hatch";
import { captureMcpInProgressGeneration } from "../../model/mcpInProgressInvalidation";
import { shouldApplyTimelineDragCommit } from "../../model/timelineDragCommit";
import {
  resizeExclusiveInside,
  TASK_DRAG_THRESHOLD_PX,
  taskBarResizeEdgeAt,
} from "../../model/chartHitTest";
import { barColors, barLabelFill } from "../../model/timeline";
import {
  taskBarChartLabelStrings,
  taskBarLabelFontSize,
} from "../../model/connections";
import { resolveAssigneeRowDisplay, assigneeSidebarLabel, duplicateMemberNamesFromCatalog } from "../../model/assigneeDisplay";
import type { StatusItem } from "../../model/statusCatalog";
import type { Member, MemberId } from "../../model/memberTypes";
import type { Milestone, ScheduleId, Task } from "../../model/types";
import { paletteFor, type ChartPalette, type ResolvedColorScheme } from "../../model/palette";
import { KONVA_FONT_FAMILY } from "../../model/fontStack";
import { taskBarRectInBody } from "../../model/taskBarLayout";
import {
  exclusiveResizeHit,
  swallowResizeClick,
  TASK_BAR_HANDLE_WIDTH,
} from "./timelineBarResizeHit";

const HANDLE_WIDTH = TASK_BAR_HANDLE_WIDTH;

export function TimelineTaskBar({
  task,
  y,
  rowHeight,
  barHeight,
  pxPerDay,
  dateToX,
  exceeded,
  selected,
  selectedTaskIds,
  linkMode,
  linkTarget,
  onLinkBarPointerDown,
  allowResizeEdges,
  onSelect,
  onOpenEdit,
  onContextMenu,
  onMoveTask,
  onResizeStart,
  onResizeEnd,
  onDragGeometry,
  onBeginPan,
  panScrollArmed,
  onDragMoved,
  registerDragCancel,
  dragLeft,
  dragWidth,
  chart,
  today,
  statuses,
  memberCatalog,
  colorScheme,
  tier,
}: {
  task: Task;
  y: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  exceeded: Milestone[];
  selected: boolean;
  selectedTaskIds: ReadonlySet<ScheduleId>;
  linkMode: boolean;
  linkTarget: boolean;
  onLinkBarPointerDown: (
    e: Konva.KonvaEventObject<PointerEvent>,
    taskId: ScheduleId,
  ) => void;
  allowResizeEdges: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onOpenEdit: () => void;
  onContextMenu: (x: number, y: number) => void;
  onMoveTask: (deltaDays: number, taskIds: readonly ScheduleId[]) => void;
  onResizeStart: (groupX: number) => void;
  onResizeEnd: (groupX: number, barWidth: number) => void;
  onDragGeometry: (geometry: DragBarGeometry | null) => void;
  onBeginPan: (clientX: number, clientY: number) => void;
  panScrollArmed: boolean;
  onDragMoved: () => void;
  registerDragCancel: (cancel: (() => void) | null) => void;
  dragLeft?: number;
  dragWidth?: number;
  chart: ChartPalette;
  today: string;
  statuses: readonly StatusItem[];
  memberCatalog: Map<MemberId, Member> | null;
  colorScheme: ResolvedColorScheme;
  tier: "day" | "week" | "month";
}) {
  const css = paletteFor(colorScheme).css;
  const barRect = taskBarRectInBody({
    task,
    viewportRowTop: y,
    rowHeight,
    barHeight,
    pxPerDay,
    dateToX,
    barLeft: dragLeft,
    barWidth: dragWidth,
  });
  const x = barRect.x;
  const w = barRect.width;
  const barY = barRect.y;
  const colors = barColors(task, today, colorScheme, statuses);
  const assigneeDuplicateNames = useMemo(
    () => duplicateMemberNamesFromCatalog(memberCatalog),
    [memberCatalog],
  );
  const assigneeDisplay = resolveAssigneeRowDisplay(
    task.assigneeIds,
    memberCatalog,
    assigneeDuplicateNames,
  );
  const assigneeLabel = assigneeSidebarLabel(assigneeDisplay);
  const stroke = colors.border;
  const fontSize = taskBarLabelFontSize(barHeight);
  const { inside: labelInside, outside: labelOutside } = taskBarChartLabelStrings(
    task,
    w,
    tier,
    assigneeLabel,
  );
  const hatch =
    task.confidence === "tentative"
      ? hatchCanvas(colors.bg, colorScheme)
      : null;
  const overrunAt = exceeded[0] ? dateToX(parseDate(exceeded[0].date)) - x : null;
  const origXRef = useRef(0);
  const groupRef = useRef<Konva.Group>(null);
  const bgWidthRef = useRef(w);
  const leftMaxXRef = useRef<number | null>(null);
  const movePendingRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    captureTarget: Element;
  } | null>(null);
  const moveDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    originBarX: number;
    captureTarget: Element;
    detach: () => void;
  } | null>(null);
  const moveTargetIdsRef = useRef<readonly ScheduleId[]>([task.id]);
  const blockOpenEditRef = useRef(false);
  const dragCommitEpochRef = useRef(captureMcpInProgressGeneration());
  const resizeEdgeAtPointer = useCallback(() => {
    if (!allowResizeEdges) return null;
    const pos = groupRef.current?.getRelativePointerPosition();
    if (pos == null || pos.y < 0 || pos.y > barHeight) return null;
    return taskBarResizeEdgeAt(pos.x, bgWidthRef.current);
  }, [allowResizeEdges, barHeight]);
  const handleHeight = Math.max(10, Math.round(barHeight * 0.7));
  const handleY = barHeight / 2 - handleHeight / 2;

  const finishPointerMove = useCallback(
    (commit: boolean) => {
      const drag = moveDragRef.current;
      const node = groupRef.current;
      let shouldCommit = commit;
      if (drag) {
        drag.detach();
        if (drag.captureTarget.hasPointerCapture(drag.pointerId)) {
          drag.captureTarget.releasePointerCapture(drag.pointerId);
        }
        moveDragRef.current = null;
      }
      registerDragCancel(null);
      if (!node) {
        onDragGeometry(null);
        return;
      }
      if (shouldCommit) {
        shouldCommit = shouldApplyTimelineDragCommit(
          true,
          dragCommitEpochRef.current,
        );
      }
      if (shouldCommit) {
        const delta = Math.round((node.x() - origXRef.current) / pxPerDay);
        node.position({ x: origXRef.current + delta * pxPerDay, y: barY });
        if (delta !== 0) onMoveTask(delta, moveTargetIdsRef.current);
      } else {
        node.position({ x: origXRef.current, y: barY });
      }
      onDragGeometry(null);
      node.getLayer()?.batchDraw();
    },
    [barY, onDragGeometry, onMoveTask, pxPerDay, registerDragCancel],
  );

  const cancelMove = useCallback(() => {
    finishPointerMove(false);
  }, [finishPointerMove]);

  useEffect(() => {
    bgWidthRef.current = w;
  }, [w]);

  useEffect(() => {
    return () => registerDragCancel(null);
  }, [registerDragCancel]);

  const beginPointerMove = useCallback(
    (
      pointerId: number,
      startClientX: number,
      captureTarget: Element,
    ) => {
      const node = groupRef.current;
      if (!node || moveDragRef.current) return;
      moveTargetIdsRef.current =
        selectedTaskIds.has(task.id) && selectedTaskIds.size > 1
          ? [...selectedTaskIds]
          : [task.id];
      origXRef.current = node.x();
      dragCommitEpochRef.current = captureMcpInProgressGeneration();
      try {
        captureTarget.setPointerCapture(pointerId);
      } catch {
        // キャプチャできないときは window の監視だけで続ける。
      }
      registerDragCancel(() => cancelMove());
      const reportGeometry = (barLeft: number) => {
        onDragGeometry({
          taskId: task.id,
          kind: "move",
          barLeft,
          barWidth: w,
          barTop: barY,
          originX: origXRef.current,
        });
      };
      reportGeometry(origXRef.current);
      const onMove = (evt: PointerEvent) => {
        const drag = moveDragRef.current;
        if (!drag || evt.pointerId !== drag.pointerId) return;
        const dx = evt.clientX - drag.startClientX;
        const nextX = drag.originBarX + dx;
        node.x(nextX);
        reportGeometry(nextX);
        node.getLayer()?.batchDraw();
      };
      const onUp = (evt: PointerEvent) => {
        if (evt.pointerId !== pointerId) return;
        finishPointerMove(true);
      };
      const onCancel = (evt: PointerEvent) => {
        if (evt.pointerId !== pointerId) return;
        finishPointerMove(false);
      };
      const detach = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
      moveDragRef.current = {
        pointerId,
        startClientX,
        originBarX: origXRef.current,
        captureTarget,
        detach,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    },
    [
      barY,
      cancelMove,
      finishPointerMove,
      onDragGeometry,
      registerDragCancel,
      selectedTaskIds,
      task.id,
      w,
    ],
  );

  const onBodyPointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (linkMode) {
        onLinkBarPointerDown(e, task.id);
        return;
      }
      if (e.evt.button === 1 || panScrollArmed) {
        onBeginPan(e.evt.clientX, e.evt.clientY);
        return;
      }
      if (e.evt.button !== 0) return;
      e.cancelBubble = true;
      blockOpenEditRef.current =
        selected && selectedTaskIds.size > 1;
      const captureTarget = e.target.getStage()?.content;
      if (!captureTarget) return;
      movePendingRef.current = {
        pointerId: e.evt.pointerId,
        startX: e.evt.clientX,
        startY: e.evt.clientY,
        captureTarget,
      };
      const onMove = (evt: PointerEvent) => {
        const pending = movePendingRef.current;
        if (!pending || evt.pointerId !== pending.pointerId) return;
        const dx = evt.clientX - pending.startX;
        const dy = evt.clientY - pending.startY;
        if (Math.hypot(dx, dy) < TASK_DRAG_THRESHOLD_PX) return;
        const { pointerId, startX, captureTarget: target } = pending;
        movePendingRef.current = null;
        onDragMoved();
        if (!selected) {
          onSelect({
            evt: {
              shiftKey: false,
              metaKey: false,
              ctrlKey: false,
            },
          } as Konva.KonvaEventObject<MouseEvent>);
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        beginPointerMove(pointerId, startX, target);
      };
      const onUp = (evt: PointerEvent) => {
        const pending = movePendingRef.current;
        if (!pending || evt.pointerId !== pending.pointerId) return;
        movePendingRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [
      beginPointerMove,
      linkMode,
      onBeginPan,
      onDragMoved,
      onLinkBarPointerDown,
      onSelect,
      panScrollArmed,
      selected,
      selectedTaskIds,
      task.id,
    ],
  );

  const onHitPointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (resizeEdgeAtPointer() != null) {
        e.cancelBubble = true;
        return;
      }
      onBodyPointerDown(e);
    },
    [onBodyPointerDown, resizeEdgeAtPointer],
  );

  const leftHandleRef = useRef<Konva.Rect>(null);
  const rightHandleRef = useRef<Konva.Rect>(null);
  const resizeAbortedRef = useRef(false);
  const origResizeRef = useRef<{ groupX: number; barWidth: number } | null>(
    null,
  );
  const draggingHandleRef = useRef<Konva.Rect | null>(null);

  const cancelUnselectedResize = useCallback(() => {
    resizeAbortedRef.current = true;
    const orig = origResizeRef.current;
    const g = groupRef.current;
    if (orig && g) {
      g.x(orig.groupX);
      bgWidthRef.current = orig.barWidth;
      leftHandleRef.current?.x(-HANDLE_WIDTH / 2);
      rightHandleRef.current?.x(orig.barWidth - HANDLE_WIDTH / 2);
    }
    draggingHandleRef.current?.stopDrag();
    draggingHandleRef.current = null;
    origResizeRef.current = null;
    registerDragCancel(null);
    onDragGeometry(null);
  }, [onDragGeometry, registerDragCancel]);

  return (
    <Group
      ref={groupRef}
      name="task-bar"
      x={x}
      y={barY}
      onClick={(e) => {
        e.cancelBubble = true;
        if (resizeEdgeAtPointer() != null || e.evt.button !== 0) return;
        if (linkMode && e.evt.detail > 1) return;
        onSelect(e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        if (resizeEdgeAtPointer() != null) return;
        if (linkMode && e.evt.detail > 1) return;
        onSelect(e as unknown as Konva.KonvaEventObject<MouseEvent>);
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (resizeEdgeAtPointer() != null) return;
        if (linkMode) return;
        if (blockOpenEditRef.current) {
          blockOpenEditRef.current = false;
          return;
        }
        onOpenEdit();
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        if (resizeEdgeAtPointer() != null) return;
        if (linkMode) return;
        onContextMenu(e.evt.clientX, e.evt.clientY);
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        if (resizeEdgeAtPointer() != null) return;
        if (linkMode) return;
        onOpenEdit();
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
      {task.progress > 0 && colors.fill ? (
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
        strokeWidth={selected ? 2 : 1}
        cornerRadius={4}
        listening={false}
      />
      {selected ? (
        <Rect
          x={-2}
          y={-2}
          width={w + 4}
          height={barHeight + 4}
          stroke={css.accent}
          strokeWidth={1}
          opacity={0.35}
          cornerRadius={6}
          listening={false}
        />
      ) : null}
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
      {labelInside ? (
        <Text
          x={6}
          y={barHeight / 2 - fontSize / 2}
          width={Math.max(0, w - 12)}
          text={labelInside}
          fontSize={fontSize}
          fontFamily={KONVA_FONT_FAMILY}
          fill={barLabelFill(task, today, colorScheme, statuses)}
          wrap="none"
          ellipsis
          listening={false}
        />
      ) : null}
      {labelOutside ? (
        <Text
          x={w + 4}
          y={barHeight / 2 - fontSize / 2}
          text={labelOutside}
          fontSize={fontSize}
          fontFamily={KONVA_FONT_FAMILY}
          fill={chart.textSecondary}
          listening={false}
        />
      ) : null}
      {overrunAt != null && overrunAt < w ? (
        <Rect
          x={Math.max(0, overrunAt)}
          y={0}
          width={Math.max(2, w - Math.max(0, overrunAt))}
          height={barHeight}
          stroke={chart.linkBroken}
          strokeWidth={1.5}
          cornerRadius={overrunAt <= 0 ? 4 : [0, 4, 4, 0]}
          listening={false}
        />
      ) : null}
      <Rect
        width={w}
        height={barHeight}
        fill="rgba(0,0,0,0.001)"
        onPointerDown={
          linkMode
            ? (e) => onLinkBarPointerDown(e, task.id)
            : onHitPointerDown
        }
      />
      {!linkMode && !selected ? (
        <>
          <Rect
            ref={leftHandleRef}
            x={-HANDLE_WIDTH / 2}
            y={handleY}
            width={HANDLE_WIDTH}
            height={handleHeight}
            name="resize-handle"
            fill="rgba(0,0,0,0.001)"
            hitFunc={exclusiveResizeHit(
              barHeight,
              handleY,
              1,
              resizeExclusiveInside(w),
            )}
            draggable
            onClick={swallowResizeClick}
            onTap={swallowResizeClick}
            onDblClick={swallowResizeClick}
            onDblTap={swallowResizeClick}
            onDragStart={function (this: Konva.Node) {
              const parent = this.getParent()!.getAbsolutePosition();
              const barWidth = bgWidthRef.current;
              leftMaxXRef.current =
                parent.x + barWidth - pxPerDay - HANDLE_WIDTH / 2;
              const g = groupRef.current;
              if (!g) return;
              resizeAbortedRef.current = false;
              origResizeRef.current = {
                groupX: g.x(),
                barWidth,
              };
              draggingHandleRef.current = this as Konva.Rect;
              dragCommitEpochRef.current = captureMcpInProgressGeneration();
              registerDragCancel(() => cancelUnselectedResize());
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
                const barWidth = bgWidthRef.current;
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
              if (!g) return;
              const barWidth = bgWidthRef.current;
              const rightEdge = g.x() + barWidth;
              const newLeft = g.x() + e.target.x() + HANDLE_WIDTH / 2;
              const newW = Math.max(pxPerDay, rightEdge - newLeft);
              g.x(newLeft);
              e.target.x(-HANDLE_WIDTH / 2);
              bgWidthRef.current = newW;
              rightHandleRef.current?.x(newW - HANDLE_WIDTH / 2);
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
              registerDragCancel(null);
              onDragGeometry(null);
              if (resizeAbortedRef.current) {
                resizeAbortedRef.current = false;
                return;
              }
              if (!g) return;
              if (!shouldApplyTimelineDragCommit(true, dragCommitEpochRef.current)) {
                cancelUnselectedResize();
                return;
              }
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
            fill="rgba(0,0,0,0.001)"
            hitFunc={exclusiveResizeHit(
              barHeight,
              handleY,
              -1,
              resizeExclusiveInside(w),
            )}
            draggable
            onClick={swallowResizeClick}
            onTap={swallowResizeClick}
            onDblClick={swallowResizeClick}
            onDblTap={swallowResizeClick}
            onDragStart={function (this: Konva.Node) {
              const g = groupRef.current;
              if (!g) return;
              resizeAbortedRef.current = false;
              origResizeRef.current = {
                groupX: g.x(),
                barWidth: bgWidthRef.current,
              };
              draggingHandleRef.current = this as Konva.Rect;
              dragCommitEpochRef.current = captureMcpInProgressGeneration();
              registerDragCancel(() => cancelUnselectedResize());
              onDragGeometry({
                taskId: task.id,
                kind: "end",
                barLeft: g.x(),
                barWidth: bgWidthRef.current,
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
              const newW = Math.max(pxPerDay, e.target.x() + HANDLE_WIDTH / 2);
              bgWidthRef.current = newW;
              const barLeft = groupRef.current?.x() ?? x;
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
              registerDragCancel(null);
              onDragGeometry(null);
              if (resizeAbortedRef.current) {
                resizeAbortedRef.current = false;
                return;
              }
              if (!g) return;
              if (!shouldApplyTimelineDragCommit(true, dragCommitEpochRef.current)) {
                cancelUnselectedResize();
                return;
              }
              onResizeEnd(g.x(), bgWidthRef.current);
            }}
          />
        </>
      ) : null}
    </Group>
  );
}
