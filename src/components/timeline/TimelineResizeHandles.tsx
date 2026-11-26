import { useCallback, useRef } from "react";
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import type { DragBarGeometry } from "../../model/dragDates";
import { resizeExclusiveInside } from "../../model/chartHitTest";
import type { ChartPalette } from "../../model/palette";
import type { Task } from "../../model/types";
import { taskBarRectInBody } from "../../model/taskBarLayout";
import {
  exclusiveResizeHit,
  swallowResizeClick,
  TASK_BAR_HANDLE_WIDTH,
} from "./timelineBarResizeHit";

const HANDLE_WIDTH = TASK_BAR_HANDLE_WIDTH;

export function TimelineResizeHandles({
  task,
  y,
  rowHeight,
  barHeight,
  pxPerDay,
  dateToX,
  onResizeStart,
  onResizeEnd,
  onDragGeometry,
  registerDragCancel,
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
  registerDragCancel: (cancel: (() => void) | null) => void;
  chart: ChartPalette;
}) {
  const barRect = taskBarRectInBody({
    task,
    viewportRowTop: y,
    rowHeight,
    barHeight,
    pxPerDay,
    dateToX,
  });
  const groupX = barRect.x;
  const w = barRect.width;
  const barY = barRect.y;
  const handleHeight = Math.max(10, Math.round(barHeight * 0.7));
  const handleY = barHeight / 2 - handleHeight / 2;
  const groupRef = useRef<Konva.Group>(null);
  const bgRef = useRef<Konva.Rect>(null);
  const fillRef = useRef<Konva.Rect | null>(null);
  const leftHandleRef = useRef<Konva.Rect>(null);
  const rightHandleRef = useRef<Konva.Rect>(null);
  const leftMaxXRef = useRef<number | null>(null);
  const resizeAbortedRef = useRef(false);
  const origResizeRef = useRef<{ groupX: number; barWidth: number } | null>(
    null,
  );
  const draggingHandleRef = useRef<Konva.Rect | null>(null);

  const syncFillWidth = useCallback(
    (barWidth: number) => {
      if (task.progress > 0 && fillRef.current) {
        fillRef.current.width(barWidth * (task.progress / 100));
      }
    },
    [task.progress],
  );

  const cancelSelectedResize = useCallback(() => {
    resizeAbortedRef.current = true;
    const orig = origResizeRef.current;
    const g = groupRef.current;
    const bg = bgRef.current;
    if (orig && g && bg) {
      g.x(orig.groupX);
      bg.width(orig.barWidth);
      syncFillWidth(orig.barWidth);
      leftHandleRef.current?.x(-HANDLE_WIDTH / 2);
      rightHandleRef.current?.x(orig.barWidth - HANDLE_WIDTH / 2);
    }
    draggingHandleRef.current?.stopDrag();
    draggingHandleRef.current = null;
    origResizeRef.current = null;
    registerDragCancel(null);
    onDragGeometry(null);
  }, [onDragGeometry, registerDragCancel, syncFillWidth]);

  return (
    <Group
      ref={groupRef}
      x={groupX}
      y={barY}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
      }}
    >
      <Rect ref={bgRef} width={w} height={barHeight} visible={false} />
      {task.progress > 0 ? (
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
        ref={leftHandleRef}
        x={-HANDLE_WIDTH / 2}
        y={handleY}
        width={HANDLE_WIDTH}
        height={handleHeight}
        name="resize-handle"
        fill={chart.resizeHandle}
        cornerRadius={2}
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
          const barWidth = bgRef.current?.width() ?? w;
          leftMaxXRef.current =
            parent.x + barWidth - pxPerDay - HANDLE_WIDTH / 2;
          const g = groupRef.current;
          if (!g) return;
          resizeAbortedRef.current = false;
          origResizeRef.current = { groupX: g.x(), barWidth };
          draggingHandleRef.current = this as Konva.Rect;
          registerDragCancel(() => cancelSelectedResize());
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
          registerDragCancel(null);
          onDragGeometry(null);
          if (resizeAbortedRef.current) {
            resizeAbortedRef.current = false;
            return;
          }
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
          const bg = bgRef.current;
          if (!g || !bg) return;
          resizeAbortedRef.current = false;
          origResizeRef.current = { groupX: g.x(), barWidth: bg.width() };
          draggingHandleRef.current = this as Konva.Rect;
          registerDragCancel(() => cancelSelectedResize());
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
          registerDragCancel(null);
          onDragGeometry(null);
          if (resizeAbortedRef.current) {
            resizeAbortedRef.current = false;
            return;
          }
          if (!g || !bg) return;
          onResizeEnd(g.x(), bg.width());
        }}
      />
    </Group>
  );
}
