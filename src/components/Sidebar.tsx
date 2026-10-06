import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AlertTriangle } from "lucide-react";
import { milestonesExceededBy } from "../model/milestones";
import {
  assigneeSidebarLabel,
  resolveAssigneeDisplay,
} from "../model/assigneeDisplay";
import type { SidebarColumnsPreference } from "../model/viewPreferences";
import { daysBetween, parseDate } from "../model/dates";
import type { Member, MemberId } from "../model/memberTypes";
import {
  categoryCollapseKey,
  groupCollapseKey,
} from "../model/rows";
import { isOverdue } from "../model/timeline";
import { TaskNoteButton } from "./TaskNoteButton";
import { SIDEBAR_WIDTH_KEY_STEP, SIDEBAR_WIDTH_MIN } from "../model/sidebarWidth";
import {
  canReorderCategory,
  categoryBand,
  insertIndexForCategoryReorder,
  isContentYInCategoryBand,
  visibleCategorySpans,
} from "../model/categoryOrder";
import {
  canReorderGroup,
  resolveGroupDropTarget,
} from "../model/groupOrder";
import type { StickyLayout } from "../model/stickyRows";
import {
  canReorderTaskInGroup,
  classifyRowDrag,
  resolveTaskDropTarget,
} from "../model/taskOrder";
import type { Category, Milestone, ScheduleId, Task, VisibleRow } from "../model/types";

type SidebarProps = {
  categories: Category[];
  rows: VisibleRow[];
  reorderBaseRows: VisibleRow[];
  scrollY: number;
  viewportHeight: number;
  rowHeight: number;
  selectedTaskId: ScheduleId | null;
  hoveredTaskId: ScheduleId | null;
  onSelectTask: (taskId: ScheduleId) => void;
  reorderingTaskId: ScheduleId | null;
  reorderingCategoryId: ScheduleId | null;
  reorderingGroupId: ScheduleId | null;
  reorderMarkerY: number | null;
  canEditDocument: boolean;
  onPreviewTaskReorder: (
    taskId: ScheduleId,
    targetGroupId: ScheduleId,
    insertIndex: number,
  ) => void;
  onCommitTaskReorder: (
    taskId: ScheduleId,
    targetGroupId: ScheduleId,
    insertIndex: number,
  ) => void;
  onPreviewCategoryReorder: (categoryId: ScheduleId, insertIndex: number) => void;
  onCommitCategoryReorder: (categoryId: ScheduleId, insertIndex: number) => void;
  onPreviewGroupReorder: (
    groupId: ScheduleId,
    targetCategoryId: ScheduleId,
    insertIndex: number,
  ) => void;
  onCommitGroupReorder: (
    groupId: ScheduleId,
    targetCategoryId: ScheduleId,
    insertIndex: number,
  ) => void;
  onCancelReorder: () => void;
  milestoneBandHeight: number;
  milestones: Milestone[];
  memberCatalog: Map<MemberId, Member> | null;
  onToggleCollapse: (key: string) => void;
  onOpenTaskNote: (taskId: ScheduleId) => void;
  onTaskContextMenu: (taskId: ScheduleId, x: number, y: number) => void;
  onHierarchyContextMenu: (
    kind: "category" | "group",
    id: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onHierarchyDoubleClick: (kind: "category" | "group", id: ScheduleId) => void;
  today: string;
  uiScale: number;
  sidebarWidth: number;
  preferredSidebarWidth: number;
  sidebarWidthMax: number | null;
  onSidebarWidthChange: (unscaled: number) => void;
  onSidebarWidthCommit: () => void;
  onSidebarWidthReset: () => void;
  onSidebarWidthNudge: (delta: number) => void;
  onWheelRows: (event: WheelEvent) => void;
  sticky: StickyLayout;
  sidebarColumns: SidebarColumnsPreference;
};

export function Sidebar({
  categories,
  rows,
  reorderBaseRows,
  scrollY,
  viewportHeight,
  rowHeight,
  selectedTaskId,
  hoveredTaskId,
  onSelectTask,
  reorderingTaskId,
  reorderingCategoryId,
  reorderingGroupId,
  reorderMarkerY,
  canEditDocument,
  onPreviewTaskReorder,
  onCommitTaskReorder,
  onPreviewCategoryReorder,
  onCommitCategoryReorder,
  onPreviewGroupReorder,
  onCommitGroupReorder,
  onCancelReorder,
  milestoneBandHeight,
  milestones,
  memberCatalog,
  onToggleCollapse,
  onOpenTaskNote,
  onTaskContextMenu,
  onHierarchyContextMenu,
  onHierarchyDoubleClick,
  today,
  uiScale,
  sidebarWidth,
  preferredSidebarWidth,
  sidebarWidthMax,
  onSidebarWidthChange,
  onSidebarWidthCommit,
  onSidebarWidthReset,
  onSidebarWidthNudge,
  onWheelRows,
  sticky,
  sidebarColumns,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hiddenIndexes = sticky.hiddenIndexes;
  const visibleRows = useMemo(() => {
    const margin = rowHeight;
    const minY = scrollY - margin;
    const maxY = scrollY + viewportHeight + margin;
    const hidden = new Set(hiddenIndexes);
    return rows.filter((row, index) => {
      if (hidden.has(index)) return false;
      return row.y + rowHeight >= minY && row.y <= maxY;
    });
  }, [hiddenIndexes, rows, rowHeight, scrollY, viewportHeight]);

  const contentHeight = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.y + rowHeight), 0),
    [rowHeight, rows],
  );

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const viewport = viewportRef.current;
    if (!sidebar || !viewport) return;
    const onWheel = (event: WheelEvent) => {
      const rowBox = viewport.getBoundingClientRect();
      const side = sidebar.getBoundingClientRect();
      if (
        event.clientX < side.left ||
        event.clientX >= side.right ||
        event.clientY < rowBox.top ||
        event.clientY >= rowBox.bottom
      ) {
        return;
      }
      onWheelRows(event);
    };
    sidebar.addEventListener("wheel", onWheel, { passive: false });
    return () => sidebar.removeEventListener("wheel", onWheel);
  }, [onWheelRows]);

  const rowStyle = (y: number): CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: y,
    height: rowHeight,
  });

  const contentYFromPointer = useCallback(
    (clientY: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return 0;
      const box = viewport.getBoundingClientRect();
      return clientY - box.top + scrollY;
    },
    [scrollY],
  );

  const pointerOnStickyHeader = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest(".sidebar-sticky-clip") != null;
  }, []);

  const resolveReorderInsert = useCallback(
    (
      taskId: ScheduleId,
      clientX: number,
      clientY: number,
    ): { targetGroupId: ScheduleId; insertIndex: number } | null => {
      if (pointerOnStickyHeader(clientX, clientY)) return null;
      const contentY = contentYFromPointer(clientY);
      return resolveTaskDropTarget(
        contentY,
        rowHeight,
        taskId,
        categories,
        reorderBaseRows,
      );
    },
    [
      categories,
      contentYFromPointer,
      pointerOnStickyHeader,
      reorderBaseRows,
      rowHeight,
    ],
  );

  const hierarchyDragRef = useRef<{
    pointerId: number;
    kind: "category" | "group";
    id: ScheduleId;
    downEl: HTMLDivElement;
    startX: number;
    startY: number;
    mode: "pending" | "slide" | "reorder" | "ignore";
    slideStartOffset: number;
    overflow: number;
    canSlide: boolean;
    canReorder: boolean;
    lastPreviewKey: string | null;
    detach: () => void;
  } | null>(null);
  const [categoryOffsets, setCategoryOffsets] = useState<Record<string, number>>({});
  const [groupOffsets, setGroupOffsets] = useState<Record<string, number>>({});
  const [slidingCategoryId, setSlidingCategoryId] = useState<ScheduleId | null>(null);
  const [slidingGroupId, setSlidingGroupId] = useState<ScheduleId | null>(null);

  useEffect(() => {
    return () => {
      hierarchyDragRef.current?.detach();
      hierarchyDragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const resolveCategoryInsert = useCallback(
    (categoryId: ScheduleId, clientX: number, clientY: number): number | null => {
      const spans = visibleCategorySpans(categories, reorderBaseRows, rowHeight);
      if (spans == null) return null;
      const band = categoryBand(spans);
      if (band == null) return null;
      const contentY = contentYFromPointer(clientY);
      if (!isContentYInCategoryBand(contentY, band)) return null;
      if (pointerOnStickyHeader(clientX, clientY)) return null;
      return insertIndexForCategoryReorder(contentY, spans, categoryId);
    },
    [
      categories,
      contentYFromPointer,
      pointerOnStickyHeader,
      reorderBaseRows,
      rowHeight,
    ],
  );

  const resolveGroupInsert = useCallback(
    (
      groupId: ScheduleId,
      clientX: number,
      clientY: number,
    ): { targetCategoryId: ScheduleId; insertIndex: number } | null => {
      if (pointerOnStickyHeader(clientX, clientY)) return null;
      const contentY = contentYFromPointer(clientY);
      return resolveGroupDropTarget(
        contentY,
        rowHeight,
        groupId,
        categories,
        reorderBaseRows,
      );
    },
    [
      categories,
      contentYFromPointer,
      pointerOnStickyHeader,
      reorderBaseRows,
      rowHeight,
    ],
  );

  const beginHierarchyDrag = (
    kind: "category" | "group",
    id: ScheduleId,
    event: ReactPointerEvent<HTMLDivElement>,
    metrics: { canSlide: boolean; overflow: number; offset: number },
  ) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const onMove = (native: PointerEvent) => {
      onHierarchyPointerMove(native);
    };
    const onUp = (native: PointerEvent) => {
      hierarchyDragRef.current?.detach();
      finishHierarchyDrag(native.pointerId, native.clientX, native.clientY, true);
    };
    const onCancel = (native: PointerEvent) => {
      hierarchyDragRef.current?.detach();
      finishHierarchyDrag(native.pointerId, 0, 0, false);
    };
    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    hierarchyDragRef.current = {
      pointerId: event.pointerId,
      kind,
      id,
      downEl: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      mode: "pending",
      slideStartOffset: metrics.offset,
      overflow: metrics.overflow,
      canSlide: metrics.canSlide,
      canReorder:
        canEditDocument &&
        (kind === "category"
          ? canReorderCategory(categories, id, reorderBaseRows, rowHeight)
          : canReorderGroup(categories, id, reorderBaseRows, rowHeight)),
      lastPreviewKey: null,
      detach,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const finishHierarchyDrag = (
    pointerId: number,
    clientX: number,
    clientY: number,
    commit: boolean,
  ) => {
    const drag = hierarchyDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    drag.detach();
    hierarchyDragRef.current = null;
    setSlidingCategoryId(null);
    setSlidingGroupId(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (drag.downEl.isConnected && drag.downEl.hasPointerCapture(pointerId)) {
      drag.downEl.releasePointerCapture(pointerId);
    }
    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    if (drag.mode !== "reorder") return;
    if (!commit) {
      onCancelReorder();
      return;
    }
    if (drag.kind === "category") {
      const insertIndex = resolveCategoryInsert(drag.id, clientX, clientY);
      if (insertIndex == null) onCancelReorder();
      else onCommitCategoryReorder(drag.id, insertIndex);
      return;
    }
    const groupTarget = resolveGroupInsert(drag.id, clientX, clientY);
    if (groupTarget == null) onCancelReorder();
    else {
      onCommitGroupReorder(
        drag.id,
        groupTarget.targetCategoryId,
        groupTarget.insertIndex,
      );
    }
  };

  const previewHierarchyReorder = (
    kind: "category" | "group",
    id: ScheduleId,
    insertIndex: number,
    targetCategoryId?: ScheduleId,
  ) => {
    if (kind === "category") onPreviewCategoryReorder(id, insertIndex);
    else if (targetCategoryId != null) {
      onPreviewGroupReorder(id, targetCategoryId, insertIndex);
    }
  };

  const onHierarchyPointerMove = (event: {
    pointerId: number;
    clientX: number;
    clientY: number;
  }) => {
    const drag = hierarchyDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === "pending") {
      const gesture = classifyRowDrag(dx, dy, drag.canSlide, drag.canReorder);
      if (gesture === "pending") return;
      drag.mode = gesture;
      if (gesture === "slide") {
        if (drag.kind === "category") setSlidingCategoryId(drag.id);
        else setSlidingGroupId(drag.id);
        return;
      }
      if (gesture === "reorder") {
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        viewportRef.current?.setPointerCapture(event.pointerId);
        if (drag.kind === "category") {
          const insertIndex = resolveCategoryInsert(
            drag.id,
            event.clientX,
            event.clientY,
          );
          if (insertIndex != null) {
            drag.lastPreviewKey = String(insertIndex);
            previewHierarchyReorder("category", drag.id, insertIndex);
          }
        } else {
          const target = resolveGroupInsert(
            drag.id,
            event.clientX,
            event.clientY,
          );
          if (target != null) {
            drag.lastPreviewKey = `${target.targetCategoryId}:${target.insertIndex}`;
            previewHierarchyReorder(
              "group",
              drag.id,
              target.insertIndex,
              target.targetCategoryId,
            );
          }
        }
      }
      return;
    }
    if (drag.mode === "slide") {
      const next = drag.slideStartOffset + (event.clientX - drag.startX);
      const offset = Math.min(0, Math.max(-drag.overflow, next));
      const setOffsets = drag.kind === "category" ? setCategoryOffsets : setGroupOffsets;
      setOffsets((prev) => (prev[drag.id] === offset ? prev : { ...prev, [drag.id]: offset }));
      return;
    }
    if (drag.mode === "reorder") {
      if (drag.kind === "category") {
        const insertIndex = resolveCategoryInsert(
          drag.id,
          event.clientX,
          event.clientY,
        );
        const key = insertIndex == null ? null : String(insertIndex);
        if (key == null || key === drag.lastPreviewKey) return;
        drag.lastPreviewKey = key;
        previewHierarchyReorder("category", drag.id, insertIndex!);
        return;
      }
      const target = resolveGroupInsert(drag.id, event.clientX, event.clientY);
      const key =
        target == null
          ? null
          : `${target.targetCategoryId}:${target.insertIndex}`;
      if (key == null || key === drag.lastPreviewKey) return;
      drag.lastPreviewKey = key;
      previewHierarchyReorder(
        "group",
        drag.id,
        target!.insertIndex,
        target!.targetCategoryId,
      );
    }
  };

  return (
    <div className="sidebar" ref={sidebarRef}>
      <div className="sidebar-header">WBS / タスク</div>
      {milestoneBandHeight > 0 ? (
        <div
          className="sidebar-milestones"
          style={{ height: milestoneBandHeight }}
        >
          マイルストン
        </div>
      ) : null}
      <div
        className="sidebar-viewport"
        ref={viewportRef}
        onLostPointerCapture={(event) => {
          if (event.target !== event.currentTarget) return;
          hierarchyDragRef.current?.detach();
          finishHierarchyDrag(event.pointerId, 0, 0, false);
        }}
      >
        <div
          className="sidebar-rows"
          style={{ height: contentHeight, transform: `translateY(${-scrollY}px)` }}
        >
          {visibleRows.map((row) => {
            if (row.type === "category") {
              return (
                <CategorySidebarRow
                  key={`category-${row.id}`}
                  row={row}
                  top={row.y}
                  rowHeight={rowHeight}
                  reordering={row.id === reorderingCategoryId}
                  offset={categoryOffsets[row.id] ?? 0}
                  sliding={slidingCategoryId === row.id}
                  onToggleCollapse={onToggleCollapse}
                  onHierarchyContextMenu={onHierarchyContextMenu}
                  onHierarchyDoubleClick={onHierarchyDoubleClick}
                  onCategoryPointerDown={(event, metrics) =>
                    beginHierarchyDrag("category", row.id, event, metrics)
                  }
                />
              );
            }
            if (row.type === "group") {
              return (
                <HierarchySidebarRow
                  key={`group-${row.id}`}
                  row={row}
                  top={row.y}
                  rowHeight={rowHeight}
                  reordering={row.id === reorderingGroupId}
                  offset={groupOffsets[row.id] ?? 0}
                  sliding={slidingGroupId === row.id}
                  onToggleCollapse={onToggleCollapse}
                  onHierarchyContextMenu={onHierarchyContextMenu}
                  onHierarchyDoubleClick={onHierarchyDoubleClick}
                  onGroupPointerDown={(event, metrics) =>
                    beginHierarchyDrag("group", row.id, event, metrics)
                  }
                />
              );
            }
            return (
              <TaskSidebarRow
                key={`task-${row.task.id}`}
                task={row.task}
                top={row.y}
                rowHeight={rowHeight}
                selected={row.task.id === selectedTaskId}
                hovered={row.task.id === hoveredTaskId}
                reordering={row.task.id === reorderingTaskId}
                onSelect={() => onSelectTask(row.task.id)}
                canReorder={
                  canEditDocument &&
                  canReorderTaskInGroup(categories, row.task.id, reorderBaseRows)
                }
                today={today}
                milestones={milestones}
                memberCatalog={memberCatalog}
                onOpenTaskNote={() => onOpenTaskNote(row.task.id)}
                onTaskContextMenu={(x, y) => onTaskContextMenu(row.task.id, x, y)}
                resolveReorderInsert={(clientX, clientY) =>
                  resolveReorderInsert(row.task.id, clientX, clientY)
                }
                onPreviewReorder={(target) => {
                  if (target == null) return;
                  onPreviewTaskReorder(
                    row.task.id,
                    target.targetGroupId,
                    target.insertIndex,
                  );
                }}
                onCommitReorder={(target) => {
                  if (target == null) {
                    onCancelReorder();
                    return;
                  }
                  onCommitTaskReorder(
                    row.task.id,
                    target.targetGroupId,
                    target.insertIndex,
                  );
                }}
                onCancelReorder={onCancelReorder}
                sidebarColumns={sidebarColumns}
              />
            );
          })}
          {reorderMarkerY != null ? (
            <div
              className="sidebar-reorder-marker"
              style={rowStyle(reorderMarkerY)}
              aria-hidden="true"
            />
          ) : null}
        </div>
        <div className="sidebar-sticky">
          {sticky.draws.map((draw) => {
            const row = rows[draw.index];
            if (row == null || (row.type !== "category" && row.type !== "group")) {
              return null;
            }
            const clipHeight = draw.clipBottom - draw.clipTop;
            const top = draw.top - draw.clipTop;
            return (
              <div
                key={draw.index}
                className="sidebar-sticky-clip"
                style={{ top: draw.clipTop, height: clipHeight }}
              >
                {row.type === "category" ? (
                  <CategorySidebarRow
                    row={row}
                    top={top}
                    rowHeight={rowHeight}
                    reordering={row.id === reorderingCategoryId}
                    offset={categoryOffsets[row.id] ?? 0}
                    sliding={slidingCategoryId === row.id}
                    onToggleCollapse={onToggleCollapse}
                    onHierarchyContextMenu={onHierarchyContextMenu}
                    onHierarchyDoubleClick={onHierarchyDoubleClick}
                    onCategoryPointerDown={(event, metrics) =>
                      beginHierarchyDrag("category", row.id, event, metrics)
                    }
                  />
                ) : (
                  <HierarchySidebarRow
                    row={row}
                    top={top}
                    rowHeight={rowHeight}
                    reordering={row.id === reorderingGroupId}
                    offset={groupOffsets[row.id] ?? 0}
                    sliding={slidingGroupId === row.id}
                    onToggleCollapse={onToggleCollapse}
                    onHierarchyContextMenu={onHierarchyContextMenu}
                    onHierarchyDoubleClick={onHierarchyDoubleClick}
                    onGroupPointerDown={(event, metrics) =>
                      beginHierarchyDrag("group", row.id, event, metrics)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <SidebarResizer
        uiScale={uiScale}
        sidebarWidth={sidebarWidth}
        preferredSidebarWidth={preferredSidebarWidth}
        sidebarWidthMax={sidebarWidthMax}
        onChange={onSidebarWidthChange}
        onCommit={onSidebarWidthCommit}
        onReset={onSidebarWidthReset}
        onNudge={onSidebarWidthNudge}
      />
    </div>
  );
}

function SidebarResizer({
  uiScale,
  sidebarWidth,
  preferredSidebarWidth,
  sidebarWidthMax,
  onChange,
  onCommit,
  onReset,
  onNudge,
}: {
  uiScale: number;
  sidebarWidth: number;
  preferredSidebarWidth: number;
  sidebarWidthMax: number | null;
  onChange: (unscaled: number) => void;
  onCommit: () => void;
  onReset: () => void;
  onNudge: (delta: number) => void;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    scale: number;
    moved: boolean;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const finishDrag = (pointerId: number, target: HTMLDivElement) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (drag.moved) onCommit();
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onNudge(-SIDEBAR_WIDTH_KEY_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onNudge(SIDEBAR_WIDTH_KEY_STEP);
    }
  };

  const valueNow = Math.round(preferredSidebarWidth);
  const valueMax =
    sidebarWidthMax != null && sidebarWidthMax >= valueNow
      ? sidebarWidthMax
      : undefined;

  return (
    <div
      className={`sidebar-resizer${dragging ? " dragging" : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="タスク一覧の幅"
      aria-valuemin={SIDEBAR_WIDTH_MIN}
      aria-valuenow={valueNow}
      aria-valuemax={valueMax}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth: sidebarWidth,
          scale: uiScale > 0 ? uiScale : 1,
          moved: false,
        };
        setDragging(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (Math.abs(event.clientX - drag.startX) > 2) drag.moved = true;
        if (!drag.moved) return;
        onChange(drag.startWidth + (event.clientX - drag.startX) / drag.scale);
      }}
      onPointerUp={(event) => finishDrag(event.pointerId, event.currentTarget)}
      onPointerCancel={(event) => finishDrag(event.pointerId, event.currentTarget)}
      onLostPointerCapture={(event) => finishDrag(event.pointerId, event.currentTarget)}
      onDoubleClick={(event) => {
        event.preventDefault();
        onReset();
      }}
      onKeyDown={onKeyDown}
    />
  );
}

function CategorySidebarRow({
  row,
  top,
  rowHeight,
  reordering,
  offset,
  sliding,
  onToggleCollapse,
  onHierarchyContextMenu,
  onHierarchyDoubleClick,
  onCategoryPointerDown,
}: {
  row: Extract<VisibleRow, { type: "category" }>;
  top: number;
  rowHeight: number;
  reordering: boolean;
  offset: number;
  sliding: boolean;
  onToggleCollapse: (key: string) => void;
  onHierarchyContextMenu: (
    kind: "category" | "group",
    id: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onHierarchyDoubleClick: (kind: "category" | "group", id: ScheduleId) => void;
  onCategoryPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    metrics: { canSlide: boolean; overflow: number; offset: number },
  ) => void;
}) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  const canSlide = overflow > 0 || offset < 0;

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const label = textRef.current;
    if (!clip || !label) return;

    const measure = () => {
      setOverflow(Math.max(0, label.scrollWidth - clip.clientWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [row.label]);

  return (
    <div
      className={`sidebar-row category${reordering ? " reordering" : ""}`}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        height: rowHeight,
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        onHierarchyDoubleClick("category", row.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onHierarchyContextMenu("category", row.id, event.clientX, event.clientY);
      }}
      onPointerDown={(event) => {
        onCategoryPointerDown(event, { canSlide, overflow, offset });
      }}
    >
      <CollapseButton
        label={row.label}
        collapsed={row.collapsed}
        onClick={() => onToggleCollapse(categoryCollapseKey(row.id))}
      />
      <span
        ref={clipRef}
        className={`slide-label${canSlide ? " can-slide" : ""}${sliding ? " sliding" : ""}${offset < 0 ? " shifted" : ""}`}
        style={{ "--slide": `${offset}px` } as CSSProperties}
        title={canSlide ? row.label : undefined}
      >
        <span ref={textRef} className="slide-label-text">{row.label}</span>
      </span>
    </div>
  );
}

function HierarchySidebarRow({
  row,
  top,
  rowHeight,
  reordering,
  offset,
  sliding,
  onToggleCollapse,
  onHierarchyContextMenu,
  onHierarchyDoubleClick,
  onGroupPointerDown,
}: {
  row: Extract<VisibleRow, { type: "group" }>;
  top: number;
  rowHeight: number;
  reordering: boolean;
  offset: number;
  sliding: boolean;
  onToggleCollapse: (key: string) => void;
  onHierarchyContextMenu: (
    kind: "category" | "group",
    id: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onHierarchyDoubleClick: (kind: "category" | "group", id: ScheduleId) => void;
  onGroupPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    metrics: { canSlide: boolean; overflow: number; offset: number },
  ) => void;
}) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  const canSlide = overflow > 0 || offset < 0;

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const label = textRef.current;
    if (!clip || !label) return;

    const measure = () => {
      setOverflow(Math.max(0, label.scrollWidth - clip.clientWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [row.label]);

  return (
    <div
      className={`sidebar-row group${reordering ? " reordering" : ""}`}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        height: rowHeight,
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        onHierarchyDoubleClick("group", row.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onHierarchyContextMenu("group", row.id, event.clientX, event.clientY);
      }}
      onPointerDown={(event) => {
        onGroupPointerDown(event, { canSlide, overflow, offset });
      }}
    >
      <CollapseButton
        label={row.label}
        collapsed={row.collapsed}
        onClick={() => onToggleCollapse(groupCollapseKey(row.id))}
      />
      <span
        ref={clipRef}
        className={`slide-label${canSlide ? " can-slide" : ""}${sliding ? " sliding" : ""}${offset < 0 ? " shifted" : ""}`}
        style={{ "--slide": `${offset}px` } as CSSProperties}
        title={canSlide ? row.label : undefined}
      >
        <span ref={textRef} className="slide-label-text">{row.label}</span>
      </span>
    </div>
  );
}

function TaskSidebarRow({
  task,
  top,
  rowHeight,
  selected,
  hovered,
  reordering,
  canReorder,
  today,
  milestones,
  memberCatalog,
  onOpenTaskNote,
  onTaskContextMenu,
  onSelect,
  resolveReorderInsert,
  onPreviewReorder,
  onCommitReorder,
  onCancelReorder,
  sidebarColumns,
}: {
  task: Task;
  top: number;
  rowHeight: number;
  selected: boolean;
  hovered: boolean;
  reordering: boolean;
  canReorder: boolean;
  today: string;
  milestones: Milestone[];
  memberCatalog: Map<MemberId, Member> | null;
  sidebarColumns: SidebarColumnsPreference;
  onOpenTaskNote: () => void;
  onTaskContextMenu: (x: number, y: number) => void;
  onSelect: () => void;
  resolveReorderInsert: (
    clientX: number,
    clientY: number,
  ) => { targetGroupId: ScheduleId; insertIndex: number } | null;
  onPreviewReorder: (
    target: { targetGroupId: ScheduleId; insertIndex: number } | null,
  ) => void;
  onCommitReorder: (
    target: { targetGroupId: ScheduleId; insertIndex: number } | null,
  ) => void;
  onCancelReorder: () => void;
}) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const pointerRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    mode: "pending" | "slide" | "reorder" | "ignore";
    slideStartOffset: number;
    lastPreviewKey: string | null;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [overflow, setOverflow] = useState(0);
  const [slideDragging, setSlideDragging] = useState(false);

  const dropPreviewKey = (
    target: { targetGroupId: ScheduleId; insertIndex: number } | null,
  ) => (target == null ? null : `${target.targetGroupId}:${target.insertIndex}`);

  const assigneeDisplay = resolveAssigneeDisplay(task.assigneeId, memberCatalog);
  const assigneeClass =
    assigneeDisplay.kind === "unassigned"
      ? " unassigned"
      : assigneeDisplay.kind === "unknown"
        ? " unknown-member"
        : "";
  const rowClass = assigneeDisplay.kind === "unassigned" ? " unassigned" : "";
  const exceeded = milestonesExceededBy(task, milestones);
  const exceededTitle =
    exceeded.length === 0
      ? undefined
      : `${exceeded.map((milestone) => milestone.name).join("、")}を超える計画です`;
  const canSlide = overflow > 0 || offset < 0;

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const label = textRef.current;
    if (!clip || !label) return;

    const measure = () => {
      const hidden = Math.max(0, label.scrollWidth - clip.clientWidth);
      setOverflow(hidden);
      setOffset((current) => Math.min(0, Math.max(-hidden, current)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [task.name]);

  const endPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    commit: boolean,
  ) => {
    const drag = pointerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    setSlideDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.mode === "pending") {
      if (commit) onSelect();
      return;
    }
    if (drag.mode === "slide") return;
    if (drag.mode !== "reorder") return;
    if (!commit) {
      onCancelReorder();
      return;
    }
    onCommitReorder(resolveReorderInsert(event.clientX, event.clientY));
  };

  const rowStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top,
    height: rowHeight,
  };

  return (
    <div
      className={`sidebar-row task${selected ? " selected" : ""}${hovered ? " hovered" : ""}${rowClass}${reordering ? " reordering" : ""}`}
      style={rowStyle}
      title={exceededTitle}
      onContextMenu={(event) => {
        event.preventDefault();
        onTaskContextMenu(event.clientX, event.clientY);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest("button")) return;
        pointerRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          mode: "pending",
          slideStartOffset: offset,
          lastPreviewKey: null,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = pointerRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (drag.mode === "pending") {
          const gesture = classifyRowDrag(dx, dy, canSlide, canReorder);
          if (gesture === "pending") return;
          drag.mode = gesture;
          if (gesture === "slide") {
            setSlideDragging(true);
            return;
          }
          if (gesture === "reorder") {
            document.body.style.cursor = "grabbing";
            document.body.style.userSelect = "none";
            const target = resolveReorderInsert(event.clientX, event.clientY);
            const key = dropPreviewKey(target);
            if (key != null) {
              drag.lastPreviewKey = key;
              onPreviewReorder(target);
            }
          }
          return;
        }
        if (drag.mode === "slide") {
          const next = drag.slideStartOffset + (event.clientX - drag.startX);
          setOffset(Math.min(0, Math.max(-overflow, next)));
          return;
        }
        if (drag.mode === "reorder") {
          const target = resolveReorderInsert(event.clientX, event.clientY);
          const key = dropPreviewKey(target);
          if (key == null || key === drag.lastPreviewKey) return;
          drag.lastPreviewKey = key;
          onPreviewReorder(target);
        }
      }}
      onPointerUp={(event) => endPointer(event, true)}
      onPointerCancel={(event) => endPointer(event, false)}
      onLostPointerCapture={(event) => endPointer(event, false)}
    >
      <TaskNoteButton task={task} onOpen={onOpenTaskNote} />
      <span
        ref={clipRef}
        className={`slide-label${isOverdue(task, today) ? " overdue" : ""}${canSlide ? " can-slide" : ""}${slideDragging ? " sliding" : ""}${offset < 0 ? " shifted" : ""}`}
        style={{ "--slide": `${offset}px` } as CSSProperties}
        title={canSlide ? task.name : undefined}
      >
        <span ref={textRef} className="slide-label-text">{task.name}</span>
      </span>
      {sidebarColumns.start ? (
        <span className="sidebar-col">{task.start.slice(5)}</span>
      ) : null}
      {sidebarColumns.end ? (
        <span className="sidebar-col">{task.end.slice(5)}</span>
      ) : null}
      {sidebarColumns.duration ? (
        <span className="sidebar-col">
          {daysBetween(parseDate(task.start), parseDate(task.end)) + 1}
        </span>
      ) : null}
      {sidebarColumns.progress ? (
        <span className="sidebar-col">{task.progress}%</span>
      ) : null}
      {exceeded.length > 0 ? (
        <span className="milestone-alert-icon" title={exceededTitle} aria-label="超過">
          <AlertTriangle size={14} strokeWidth={2.25} />
        </span>
      ) : null}
      <span className={`assignee${assigneeClass}`}>
        {assigneeDisplay.kind === "unassigned"
          ? "未割当"
          : assigneeSidebarLabel(assigneeDisplay)}
      </span>
    </div>
  );
}

function CollapseButton({
  label,
  collapsed,
  onClick,
}: {
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="twist"
      aria-expanded={!collapsed}
      aria-label={collapsed ? `${label} を展開` : `${label} を折りたたむ`}
      onClick={onClick}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {collapsed ? "▶" : "▼"}
    </button>
  );
}
