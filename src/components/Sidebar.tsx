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
import { AlertTriangle, GripVertical } from "lucide-react";
import { milestonesExceededBy } from "../model/milestones";
import {
  assigneeColumnChars,
  assigneeSidebarLabel,
  resolveAssigneeDisplay,
} from "../model/assigneeDisplay";
import type { SidebarColumnsPreference } from "../model/viewPreferences";
import { daysBetween, fmtMonthDay, parseDate } from "../model/dates";
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
  classifyHandleDrag,
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
  milestoneBandLayout: import("../model/milestones").MilestoneBandLayout;
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
  milestoneBandLayout,
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

  const assigneeChars = useMemo(
    () =>
      assigneeColumnChars(
        rows.flatMap((row) => {
          if (row.type !== "task") return [];
          const display = resolveAssigneeDisplay(row.task.assigneeId, memberCatalog);
          return [
            display.kind === "unassigned" ? "未割当" : assigneeSidebarLabel(display),
          ];
        }),
      ),
    [memberCatalog, rows],
  );

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

  const rowDragRef = useRef<{
    pointerId: number;
    kind: "category" | "group" | "task";
    id: ScheduleId;
    downEl: HTMLDivElement;
    startX: number;
    startY: number;
    mode: "pending" | "reorder" | "ignore";
    canReorder: boolean;
    lastPreviewKey: string | null;
    detach: () => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      rowDragRef.current?.detach();
      rowDragRef.current = null;
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

  const reorderAllowed = (kind: "category" | "group" | "task", id: ScheduleId) => {
    if (!canEditDocument) return false;
    if (kind === "category") {
      return canReorderCategory(categories, id, reorderBaseRows, rowHeight);
    }
    if (kind === "group") {
      return canReorderGroup(categories, id, reorderBaseRows, rowHeight);
    }
    return canReorderTaskInGroup(categories, id, reorderBaseRows);
  };

  const previewRowReorder = (
    drag: NonNullable<(typeof rowDragRef)["current"]>,
    clientX: number,
    clientY: number,
  ) => {
    if (drag.kind === "task") {
      const target = resolveReorderInsert(drag.id, clientX, clientY);
      if (target == null) return;
      const key = `${target.targetGroupId}:${target.insertIndex}`;
      if (key === drag.lastPreviewKey) return;
      drag.lastPreviewKey = key;
      onPreviewTaskReorder(drag.id, target.targetGroupId, target.insertIndex);
      return;
    }
    if (drag.kind === "category") {
      const insertIndex = resolveCategoryInsert(drag.id, clientX, clientY);
      if (insertIndex == null) return;
      const key = String(insertIndex);
      if (key === drag.lastPreviewKey) return;
      drag.lastPreviewKey = key;
      onPreviewCategoryReorder(drag.id, insertIndex);
      return;
    }
    const target = resolveGroupInsert(drag.id, clientX, clientY);
    if (target == null) return;
    const key = `${target.targetCategoryId}:${target.insertIndex}`;
    if (key === drag.lastPreviewKey) return;
    drag.lastPreviewKey = key;
    onPreviewGroupReorder(drag.id, target.targetCategoryId, target.insertIndex);
  };

  const beginRowDrag = (
    kind: "category" | "group" | "task",
    id: ScheduleId,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ポインタが既に無効なときは、window の監視だけで続ける。
    }
    document.body.style.userSelect = "none";
    const onMove = (native: PointerEvent) => {
      onRowPointerMove(native);
    };
    const onUp = (native: PointerEvent) => {
      rowDragRef.current?.detach();
      finishRowDrag(native.pointerId, native.clientX, native.clientY, true);
    };
    const onCancel = (native: PointerEvent) => {
      rowDragRef.current?.detach();
      finishRowDrag(native.pointerId, 0, 0, false);
    };
    const detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    rowDragRef.current = {
      pointerId: event.pointerId,
      kind,
      id,
      downEl: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      mode: "pending",
      canReorder: reorderAllowed(kind, id),
      lastPreviewKey: null,
      detach,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const finishRowDrag = (
    pointerId: number,
    clientX: number,
    clientY: number,
    commit: boolean,
  ) => {
    const drag = rowDragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    drag.detach();
    rowDragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (drag.downEl.isConnected && drag.downEl.hasPointerCapture(pointerId)) {
      drag.downEl.releasePointerCapture(pointerId);
    }
    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    if (drag.mode === "pending") {
      return;
    }
    if (drag.mode !== "reorder") return;
    if (!commit) {
      onCancelReorder();
      return;
    }
    if (drag.kind === "task") {
      const target = resolveReorderInsert(drag.id, clientX, clientY);
      if (target == null) onCancelReorder();
      else onCommitTaskReorder(drag.id, target.targetGroupId, target.insertIndex);
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

  const onRowPointerMove = (event: {
    pointerId: number;
    clientX: number;
    clientY: number;
  }) => {
    const drag = rowDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === "pending") {
      const gesture = classifyHandleDrag(dx, dy, drag.canReorder);
      if (gesture === "pending") return;
      drag.mode = gesture;
      if (gesture !== "reorder") return;
      document.body.style.cursor = "grabbing";
      const viewport = viewportRef.current;
      if (viewport != null) {
        try {
          viewport.setPointerCapture(event.pointerId);
        } catch {
          // 握り側の監視が残っていれば、並べ替えは続ける。
        }
      }
    }
    if (drag.mode === "reorder") previewRowReorder(drag, event.clientX, event.clientY);
  };

  return (
    <div className="sidebar" ref={sidebarRef}>
      <div className="sidebar-header">WBS / タスク</div>
      {milestoneBandHeight > 0 ? (
        <div
          className="sidebar-milestone-groups"
          style={{ height: milestoneBandHeight }}
        >
          {milestoneBandLayout.blocks.map((block) => (
            <div
              key={block.group.id}
              className="sidebar-milestones"
              style={{ height: block.height }}
            >
              {block.group.name}
            </div>
          ))}
        </div>
      ) : null}
      <div
        className="sidebar-viewport"
        ref={viewportRef}
        onLostPointerCapture={(event) => {
          if (event.target !== event.currentTarget) return;
          rowDragRef.current?.detach();
          finishRowDrag(event.pointerId, 0, 0, false);
        }}
      >
        <div
          className="sidebar-rows"
          style={{
            height: contentHeight,
            transform: `translateY(${-scrollY}px)`,
            "--assignee-chars": String(assigneeChars),
          } as CSSProperties}
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
                  canReorder={reorderAllowed("category", row.id)}
                  onToggleCollapse={onToggleCollapse}
                  onHierarchyContextMenu={onHierarchyContextMenu}
                  onHierarchyDoubleClick={onHierarchyDoubleClick}
                  onGripPointerDown={(event) =>
                    beginRowDrag("category", row.id, event)
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
                  canReorder={reorderAllowed("group", row.id)}
                  onToggleCollapse={onToggleCollapse}
                  onHierarchyContextMenu={onHierarchyContextMenu}
                  onHierarchyDoubleClick={onHierarchyDoubleClick}
                  onGripPointerDown={(event) => beginRowDrag("group", row.id, event)}
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
                canReorder={reorderAllowed("task", row.task.id)}
                today={today}
                milestones={milestones}
                memberCatalog={memberCatalog}
                onOpenTaskNote={() => onOpenTaskNote(row.task.id)}
                onTaskContextMenu={(x, y) => onTaskContextMenu(row.task.id, x, y)}
                onGripPointerDown={(event) => beginRowDrag("task", row.task.id, event)}
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
                    canReorder={reorderAllowed("category", row.id)}
                    onToggleCollapse={onToggleCollapse}
                    onHierarchyContextMenu={onHierarchyContextMenu}
                    onHierarchyDoubleClick={onHierarchyDoubleClick}
                    onGripPointerDown={(event) =>
                      beginRowDrag("category", row.id, event)
                    }
                  />
                ) : (
                  <HierarchySidebarRow
                    row={row}
                    top={top}
                    rowHeight={rowHeight}
                    reordering={row.id === reorderingGroupId}
                    canReorder={reorderAllowed("group", row.id)}
                    onToggleCollapse={onToggleCollapse}
                    onHierarchyContextMenu={onHierarchyContextMenu}
                    onHierarchyDoubleClick={onHierarchyDoubleClick}
                    onGripPointerDown={(event) =>
                      beginRowDrag("group", row.id, event)
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

function NameLabel({ text, overdue }: { text: string; overdue?: boolean }) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const label = textRef.current;
    if (!clip || !label) return;

    const measure = () => {
      setOverflow(label.scrollWidth - clip.clientWidth > 0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span
      ref={clipRef}
      className={`row-label${overdue ? " overdue" : ""}`}
      title={overflow ? text : undefined}
    >
      <span ref={textRef} className="row-label-text">{text}</span>
    </span>
  );
}

function RowGrip({
  canReorder,
  label,
  onPointerDown,
}: {
  canReorder: boolean;
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`row-grip${canReorder ? " can-reorder" : ""}`}
      role="button"
      tabIndex={-1}
      aria-label={label}
      aria-disabled={!canReorder}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        onPointerDown(event);
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <GripVertical size={14} strokeWidth={2.25} aria-hidden="true" />
    </div>
  );
}

function CategorySidebarRow({
  row,
  top,
  rowHeight,
  reordering,
  canReorder,
  onToggleCollapse,
  onHierarchyContextMenu,
  onHierarchyDoubleClick,
  onGripPointerDown,
}: {
  row: Extract<VisibleRow, { type: "category" }>;
  top: number;
  rowHeight: number;
  reordering: boolean;
  canReorder: boolean;
  onToggleCollapse: (key: string) => void;
  onHierarchyContextMenu: (
    kind: "category" | "group",
    id: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onHierarchyDoubleClick: (kind: "category" | "group", id: ScheduleId) => void;
  onGripPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
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
    >
      <RowGrip
        canReorder={canReorder}
        label="カテゴリを並べ替える"
        onPointerDown={onGripPointerDown}
      />
      <div className="sidebar-row-body">
        <CollapseButton
          label={row.label}
          collapsed={row.collapsed}
          onClick={() => onToggleCollapse(categoryCollapseKey(row.id))}
        />
        <NameLabel text={row.label} />
      </div>
    </div>
  );
}

function HierarchySidebarRow({
  row,
  top,
  rowHeight,
  reordering,
  canReorder,
  onToggleCollapse,
  onHierarchyContextMenu,
  onHierarchyDoubleClick,
  onGripPointerDown,
}: {
  row: Extract<VisibleRow, { type: "group" }>;
  top: number;
  rowHeight: number;
  reordering: boolean;
  canReorder: boolean;
  onToggleCollapse: (key: string) => void;
  onHierarchyContextMenu: (
    kind: "category" | "group",
    id: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onHierarchyDoubleClick: (kind: "category" | "group", id: ScheduleId) => void;
  onGripPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
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
    >
      <RowGrip
        canReorder={canReorder}
        label="グループを並べ替える"
        onPointerDown={onGripPointerDown}
      />
      <div className="sidebar-row-body">
        <CollapseButton
          label={row.label}
          collapsed={row.collapsed}
          onClick={() => onToggleCollapse(groupCollapseKey(row.id))}
        />
        <NameLabel text={row.label} />
      </div>
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
  onGripPointerDown,
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
  onGripPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
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
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, .row-grip")) return;
        onSelect();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onTaskContextMenu(event.clientX, event.clientY);
      }}
    >
      <RowGrip
        canReorder={canReorder}
        label="タスクを並べ替える"
        onPointerDown={onGripPointerDown}
      />
      <div className="sidebar-row-body">
      <TaskNoteButton task={task} onOpen={onOpenTaskNote} />
      <NameLabel text={task.name} overdue={isOverdue(task, today)} />
      <span className="sidebar-trail">
        {sidebarColumns.start ||
        sidebarColumns.end ||
        sidebarColumns.duration ||
        sidebarColumns.progress ? (
          <span className="sidebar-cols">
            {sidebarColumns.start ? (
              <span className="sidebar-col start" title="開始">
                {fmtMonthDay(task.start)}
              </span>
            ) : null}
            {sidebarColumns.end ? (
              <span className="sidebar-col end" title="終了">
                {fmtMonthDay(task.end)}
              </span>
            ) : null}
            {sidebarColumns.duration ? (
              <span className="sidebar-col duration" title="日数">
                {daysBetween(parseDate(task.start), parseDate(task.end)) + 1}日
              </span>
            ) : null}
            {sidebarColumns.progress ? (
              <span className="sidebar-col progress" title="進捗">
                {task.progress}%
              </span>
            ) : null}
          </span>
        ) : null}
        <span className="sidebar-alert-slot">
          {exceeded.length > 0 ? (
            <span className="milestone-alert-icon" title={exceededTitle} aria-label="超過">
              <AlertTriangle size={14} strokeWidth={2.25} />
            </span>
          ) : null}
        </span>
        <span
          className={`assignee${assigneeClass}`}
          title={
            assigneeDisplay.kind === "unassigned"
              ? "未割当"
              : assigneeSidebarLabel(assigneeDisplay)
          }
        >
          {assigneeDisplay.kind === "unassigned"
            ? "未割当"
            : assigneeSidebarLabel(assigneeDisplay)}
        </span>
      </span>
      </div>
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
