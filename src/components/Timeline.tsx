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
import { addDays, fmtShort, parseDate } from "../model/dates";
import { linkPoints, type DependencyLink } from "../model/dependencies";
import { barColors, isOverdue, TODAY_ISO } from "../model/timeline";
import { isUnassigned, type Task, type VisibleRow } from "../model/types";

type TimelineProps = {
  visibleRows: VisibleRow[];
  width: number;
  rowHeight: number;
  barHeight: number;
  headerHeight: number;
  bodyHeight: number;
  pxPerDay: number;
  scrollY: number;
  tier: "day" | "week" | "month";
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  dateToX: (d: Date) => number;
  selectedTaskId: number | null;
  onSelectTask: (id: number) => void;
  onClearSelection: () => void;
  onMoveTask: (taskId: number, deltaDays: number) => void;
  onResizeStart: (taskId: number, groupX: number) => void;
  onResizeEnd: (taskId: number, groupX: number, barWidth: number) => void;
  links: DependencyLink[];
  onOpenEdit: (task: Task) => void;
  onWheelBody: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onWheelHeader: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onPan: (dx: number, dy: number) => void;
};

const HANDLE_WIDTH = 8;

function TaskBar({
  task,
  y,
  rowHeight,
  barHeight,
  pxPerDay,
  dateToX,
  selected,
  onSelect,
  onOpenEdit,
  onMoveTask,
}: {
  task: Task;
  y: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  selected: boolean;
  onSelect: () => void;
  onOpenEdit: () => void;
  onMoveTask: (deltaDays: number) => void;
}) {
  const start = parseDate(task.start);
  const end = parseDate(task.end);
  const x = dateToX(start);
  const w = Math.max(6, dateToX(end) - dateToX(start));
  const barY = y + (rowHeight - barHeight) / 2;
  const colors = barColors(task);
  const unassigned = isUnassigned(task.assignee);
  const stroke = unassigned && !isOverdue(task) ? "#C48A1A" : colors.border;
  const cap = Math.max(2, Math.round(barHeight * 0.16));
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
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onOpenEdit();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        onOpenEdit();
      }}
      onMouseDown={(e) => {
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
        strokeWidth={unassigned || selected ? 1.75 : 1}
        dash={unassigned ? [5, 3] : undefined}
        cornerRadius={4}
        listening={false}
      />
      {unassigned ? (
        <Rect
          y={-cap}
          width={w}
          height={cap}
          fill="#E0A020"
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
}: {
  task: Task;
  y: number;
  rowHeight: number;
  barHeight: number;
  pxPerDay: number;
  dateToX: (d: Date) => number;
  onResizeStart: (groupX: number) => void;
  onResizeEnd: (groupX: number, barWidth: number) => void;
}) {
  const start = parseDate(task.start);
  const end = parseDate(task.end);
  const groupX = dateToX(start);
  const w = Math.max(6, dateToX(end) - dateToX(start));
  const barY = y + (rowHeight - barHeight) / 2;
  const handleHeight = Math.max(10, Math.round(barHeight * 0.7));
  const handleY = barHeight / 2 - handleHeight / 2;
  const groupRef = useRef<Konva.Group>(null);
  const bgRef = useRef<Konva.Rect>(null);
  const fillRef = useRef<Konva.Rect | null>(null);
  const rightHandleXRef = useRef(groupX + w - HANDLE_WIDTH / 2);

  const syncFillWidth = useCallback(
    (barWidth: number) => {
      if (task.status === "in-progress" && fillRef.current) {
        fillRef.current.width(barWidth * (task.progress / 100));
      }
    },
    [task.progress, task.status],
  );

  return (
    <Group ref={groupRef} x={groupX} y={barY}>
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
        fill="#4C5FD5"
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
        dragBoundFunc={(pos) => ({
          x: Math.min(pos.x, rightHandleXRef.current - pxPerDay),
          y: handleY,
        })}
        onDragMove={(e) => {
          const g = groupRef.current;
          const bg = bgRef.current;
          if (!g || !bg) return;
          const rightEdge = g.x() + bg.width();
          const newLeft = g.x() + e.target.x() + HANDLE_WIDTH / 2;
          const newW = Math.max(6, rightEdge - newLeft);
          g.x(newLeft);
          e.target.x(-HANDLE_WIDTH / 2);
          bg.width(newW);
          rightHandleXRef.current = newLeft + newW - HANDLE_WIDTH / 2;
          syncFillWidth(newW);
          e.target.getLayer()?.batchDraw();
        }}
        onDragEnd={() => {
          const g = groupRef.current;
          if (!g) return;
          onResizeStart(g.x());
        }}
      />
      <Rect
        x={w - HANDLE_WIDTH / 2}
        y={handleY}
        width={HANDLE_WIDTH}
        height={handleHeight}
        name="resize-handle"
        fill="#4C5FD5"
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
        dragBoundFunc={(pos) => ({
          x: Math.max(pos.x, -HANDLE_WIDTH / 2 + pxPerDay),
          y: handleY,
        })}
        onDragMove={(e) => {
          const bg = bgRef.current;
          if (!bg) return;
          const newW = Math.max(6, e.target.x() + HANDLE_WIDTH / 2);
          bg.width(newW);
          rightHandleXRef.current =
            (groupRef.current?.x() ?? groupX) + newW - HANDLE_WIDTH / 2;
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
  onWheelBody,
  onWheelHeader,
  onPan,
}: TimelineProps) {
  const todayDate = parseDate(TODAY_ISO);
  const scale = headerHeight / 40;

  const headerContent = useMemo(() => {
    const elements: ReactNode[] = [];
    elements.push(
      <Line
        key="header-border"
        points={[0, headerHeight - 0.5, width, headerHeight - 0.5]}
        stroke="#E3E6EB"
        strokeWidth={1}
        listening={false}
      />,
    );

    if (tier === "month") {
      let d = new Date(
        timelineStart.getFullYear(),
        timelineStart.getMonth(),
        1,
      );
      while (d < timelineEnd) {
        const x = dateToX(d);
        if (x > -120 && x < width + 120) {
          elements.push(
            <Line
              key={`mh-${d.getTime()}`}
              points={[x, 0, x, headerHeight]}
              stroke="#C7CCD6"
              strokeWidth={1}
              listening={false}
            />,
            <Text
              key={`mt-${d.getTime()}`}
              x={x + 6}
              y={13 * scale}
              text={`${d.getFullYear()}年${d.getMonth() + 1}月`}
              fontSize={12 * scale}
              fontStyle="bold"
              fill="#1F2937"
              listening={false}
            />,
          );
        }
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    } else {
      for (let i = 0; i <= totalDays; i += 1) {
        const d = addDays(timelineStart, i);
        const x = dateToX(d);
        if (x < -40 || x > width + 40) continue;
        const isMonday = d.getDay() === 1;
        const isFirst = d.getDate() === 1;
        if (tier === "day" || isMonday) {
          elements.push(
            <Line
              key={`hl-${i}`}
              points={[x, tier === "day" ? 26 * scale : 20 * scale, x, headerHeight]}
              stroke={isMonday ? "#9AA5B4" : "#E3E6EB"}
              strokeWidth={1}
              listening={false}
            />,
            <Text
              key={`ht-${i}`}
              x={x + 2}
              y={24 * scale}
              text={fmtShort(d)}
              fontSize={10 * scale}
              fill={isMonday ? "#1F2937" : "#8A94A6"}
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
              text={`${d.getMonth() + 1}月`}
              fontSize={11 * scale}
              fontStyle="bold"
              fill="#1F2937"
              listening={false}
            />,
          );
        }
      }
    }
    return elements;
  }, [dateToX, headerHeight, scale, tier, timelineEnd, timelineStart, totalDays, width]);

  const bgContent = useMemo(() => {
    const elements: ReactNode[] = [];
    const height = bodyHeight;

    for (const row of visibleRows) {
      const y = row.y - scrollY;
      if (y + rowHeight < 0 || y > height) continue;
      if (row.type === "category") {
        elements.push(
          <Rect
            key={`cat-bg-${row.label}-${row.y}`}
            x={0}
            y={y}
            width={width}
            height={rowHeight}
            fill="#F8F9FB"
            listening={false}
          />,
        );
      }
    }

    if (tier !== "month") {
      for (let i = 0; i <= totalDays; i += 1) {
        const d = addDays(timelineStart, i);
        const x = dateToX(d);
        if (x < -10 || x > width + 10) continue;
        if (d.getDay() === 6) {
          elements.push(
            <Rect
              key={`we-${i}`}
              x={x}
              y={0}
              width={pxPerDay * 2}
              height={height}
              fill="#F4F5F8"
              listening={false}
            />,
          );
        }
      }
      for (let i = 0; i <= totalDays; i += 1) {
        const d = addDays(timelineStart, i);
        const x = dateToX(d);
        if (x < -10 || x > width + 10) continue;
        const isMonday = d.getDay() === 1;
        if (tier === "day" || isMonday) {
          elements.push(
            <Line
              key={`vg-${i}`}
              points={[x, 0, x, height]}
              stroke={isMonday ? "#D8DCE3" : "#EDEFF3"}
              strokeWidth={1}
              listening={false}
            />,
          );
        }
      }
    } else {
      let d = new Date(
        timelineStart.getFullYear(),
        timelineStart.getMonth(),
        1,
      );
      while (d < timelineEnd) {
        const x = dateToX(d);
        if (x > -10 && x < width + 10) {
          elements.push(
            <Line
              key={`mg-${d.getTime()}`}
              points={[x, 0, x, height]}
              stroke="#DDE1E7"
              strokeWidth={1}
              listening={false}
            />,
          );
        }
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    }

    const tx = dateToX(todayDate);
    if (tx > -2 && tx < width + 2) {
      elements.push(
        <Line
          key="today"
          points={[tx, 0, tx, height]}
          stroke="#E2542A"
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />,
      );
    }

    for (const row of visibleRows) {
      const y = row.y - scrollY + rowHeight;
      if (y < 0 || y > height) continue;
      elements.push(
        <Line
          key={`hr-${row.y}`}
          points={[0, y, width, y]}
          stroke="#F0F1F4"
          strokeWidth={1}
          listening={false}
        />,
      );
    }

    return elements;
  }, [
    bodyHeight,
    dateToX,
    pxPerDay,
    rowHeight,
    scrollY,
    tier,
    timelineEnd,
    timelineStart,
    todayDate,
    totalDays,
    visibleRows,
    width,
  ]);

  const selectedRow = visibleRows.find(
    (r) => r.type === "task" && r.task.id === selectedTaskId,
  );

  const linkArrows = useMemo(() => {
    const byId = new Map<number, { x: number; right: number; y: number }>();
    for (const row of visibleRows) {
      if (row.type !== "task") continue;
      const y = row.y - scrollY;
      const x = dateToX(parseDate(row.task.start));
      const right = dateToX(parseDate(row.task.end));
      byId.set(row.task.id, {
        x,
        right: Math.max(x + 6, right),
        y: y + rowHeight / 2,
      });
    }
    return links.flatMap((link) => {
      const from = byId.get(link.fromId);
      const to = byId.get(link.toId);
      if (!from || !to) return [];
      const color = link.broken ? "#C4351A" : "#8A94A6";
      return [
        <Arrow
          key={`${link.fromId}-${link.toId}`}
          points={linkPoints(from.right, from.y, to.x, to.y)}
          stroke={color}
          fill={color}
          strokeWidth={link.broken ? 1.75 : 1.25}
          pointerLength={7}
          pointerWidth={7}
          listening={false}
        />,
      ];
    });
  }, [dateToX, links, rowHeight, scrollY, visibleRows]);

  const panRef = useRef<{
    x: number;
    y: number;
    active: boolean;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
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
    [],
  );

  useEffect(() => {
    if (!panSession) return;
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
      onPan(dx, dy);
    };
    const onUp = () => endPan();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [endPan, onPan, panSession]);

  return (
    <div className="timeline">
      <div className="timeline-header">
        <Stage width={width} height={headerHeight} onWheel={onWheelHeader}>
          <Layer>{headerContent}</Layer>
        </Stage>
      </div>
      <div
        className={`timeline-body${panning ? " panning" : ""}`}
        style={{ cursor: panning ? "grabbing" : "grab" }}
      >
        <Stage
          width={width}
          height={bodyHeight}
          onWheel={onWheelBody}
          onMouseDown={onBodyMouseDown}
          onMouseUp={endPan}
          onClick={(e) => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            const stage = e.target.getStage();
            if (e.target === stage) onClearSelection();
          }}
          onTap={(e) => {
            const stage = e.target.getStage();
            if (e.target === stage) onClearSelection();
          }}
        >
          <Layer listening={false}>{bgContent}</Layer>
          <Layer listening={false}>{linkArrows}</Layer>
          <Layer>
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
                  selected={selectedTaskId === row.task.id}
                  onSelect={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    onSelectTask(row.task.id);
                  }}
                  onOpenEdit={() => onOpenEdit(row.task)}
                  onMoveTask={(delta) => onMoveTask(row.task.id, delta)}
                />
              );
            })}
          </Layer>
          <Layer>
            {selectedRow && selectedRow.type === "task" ? (
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
              />
            ) : null}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
