import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { milestonesExceededBy } from "../model/milestones";
import {
  assigneeSidebarLabel,
  resolveAssigneeDisplay,
} from "../model/assigneeDisplay";
import type { Member } from "../model/memberTypes";
import type { MemberId } from "../model/memberTypes";
import {
  categoryCollapseKey,
  groupCollapseKey,
} from "../model/rows";
import { isOverdue } from "../model/timeline";
import { TaskNoteButton } from "./TaskNoteButton";
import { SIDEBAR_WIDTH_KEY_STEP, SIDEBAR_WIDTH_MIN } from "../model/sidebarWidth";
import type { StickyLayout } from "../model/stickyRows";
import type { Milestone, ScheduleId, VisibleRow } from "../model/types";

type SidebarProps = {
  rows: VisibleRow[];
  scrollY: number;
  viewportHeight: number;
  rowHeight: number;
  selectedTaskId: ScheduleId | null;
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
  sticky: StickyLayout;
};

export function Sidebar({
  rows,
  scrollY,
  viewportHeight,
  rowHeight,
  selectedTaskId,
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
  sticky,
}: SidebarProps) {
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

  const rowStyle = (y: number): CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: y,
    height: rowHeight,
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">WBS / タスク</div>
      {milestoneBandHeight > 0 ? (
        <div
          className="sidebar-milestones"
          style={{ height: milestoneBandHeight }}
        >
          マイルストン
        </div>
      ) : null}
      <div className="sidebar-viewport">
        <div
          className="sidebar-rows"
          style={{ height: contentHeight, transform: `translateY(${-scrollY}px)` }}
        >
          {visibleRows.map((row) => {
            if (row.type === "category" || row.type === "group") {
              return (
                <HierarchySidebarRow
                  key={`${row.type}-${row.id}`}
                  row={row}
                  top={row.y}
                  rowHeight={rowHeight}
                  onToggleCollapse={onToggleCollapse}
                  onHierarchyContextMenu={onHierarchyContextMenu}
                  onHierarchyDoubleClick={onHierarchyDoubleClick}
                />
              );
            }
            const selected = row.task.id === selectedTaskId;
            const assigneeDisplay = resolveAssigneeDisplay(
              row.task.assigneeId,
              memberCatalog,
            );
            const assigneeClass =
              assigneeDisplay.kind === "unassigned"
                ? " unassigned"
                : assigneeDisplay.kind === "unknown"
                  ? " unknown-member"
                  : "";
            const rowClass =
              assigneeDisplay.kind === "unassigned" ? " unassigned" : "";
            const exceeded = milestonesExceededBy(row.task, milestones);
            const exceededTitle =
              exceeded.length === 0
                ? undefined
                : `${exceeded.map((milestone) => milestone.name).join("、")}を超える計画です`;
            return (
              <div
                key={`task-${row.task.id}`}
                className={`sidebar-row task${selected ? " selected" : ""}${rowClass}`}
                style={rowStyle(row.y)}
                title={exceededTitle}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onTaskContextMenu(row.task.id, event.clientX, event.clientY);
                }}
              >
                <TaskNoteButton
                  task={row.task}
                  onOpen={() => onOpenTaskNote(row.task.id)}
                />
                <SlideLabel
                  text={row.task.name}
                  className={isOverdue(row.task, today) ? "overdue" : undefined}
                />
                {row.task.confidence === "tentative" ? (
                  <span className="confidence-tentative">未確定</span>
                ) : null}
                {exceeded.length > 0 ? (
                  <span className="milestone-alert" title={exceededTitle}>
                    超過
                  </span>
                ) : null}
                <span className={`assignee${assigneeClass}`}>
                  {assigneeSidebarLabel(assigneeDisplay)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="sidebar-sticky">
          {sticky.draws.map((draw) => {
            const row = rows[draw.index];
            if (row == null || (row.type !== "category" && row.type !== "group")) {
              return null;
            }
            const clipHeight = draw.clipBottom - draw.clipTop;
            return (
              <div
                key={draw.index}
                className="sidebar-sticky-clip"
                style={{ top: draw.clipTop, height: clipHeight }}
              >
                <HierarchySidebarRow
                  row={row}
                  top={draw.top - draw.clipTop}
                  rowHeight={rowHeight}
                  onToggleCollapse={onToggleCollapse}
                  onHierarchyContextMenu={onHierarchyContextMenu}
                  onHierarchyDoubleClick={onHierarchyDoubleClick}
                />
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

function HierarchySidebarRow({
  row,
  top,
  rowHeight,
  onToggleCollapse,
  onHierarchyContextMenu,
  onHierarchyDoubleClick,
}: {
  row: Extract<VisibleRow, { type: "category" | "group" }>;
  top: number;
  rowHeight: number;
  onToggleCollapse: (key: string) => void;
  onHierarchyContextMenu: (
    kind: "category" | "group",
    id: ScheduleId,
    x: number,
    y: number,
  ) => void;
  onHierarchyDoubleClick: (kind: "category" | "group", id: ScheduleId) => void;
}) {
  const kind = row.type;
  return (
    <div
      className={`sidebar-row ${kind}`}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        height: rowHeight,
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        onHierarchyDoubleClick(kind, row.id);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onHierarchyContextMenu(kind, row.id, event.clientX, event.clientY);
      }}
    >
      <CollapseButton
        label={row.label}
        collapsed={row.collapsed}
        onClick={() =>
          onToggleCollapse(
            kind === "category"
              ? categoryCollapseKey(row.id)
              : groupCollapseKey(row.id),
          )
        }
      />
      <SlideLabel text={row.label} />
    </div>
  );
}

function SlideLabel({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startOffset: number;
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [overflow, setOverflow] = useState(0);
  const [dragging, setDragging] = useState(false);

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
  }, [text]);

  const canSlide = overflow > 0 || offset < 0;

  return (
    <span
      ref={clipRef}
      className={`slide-label${className ? ` ${className}` : ""}${canSlide ? " can-slide" : ""}${dragging ? " sliding" : ""}${offset < 0 ? " shifted" : ""}`}
      style={{ "--slide": `${offset}px` } as CSSProperties}
      title={canSlide ? text : undefined}
      onPointerDown={(event) => {
        if (!canSlide || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startOffset: offset,
        };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = drag.startOffset + (event.clientX - drag.startX);
        setOffset(Math.min(0, Math.max(-overflow, next)));
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={(event) => {
        dragRef.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
    >
      <span ref={textRef} className="slide-label-text">{text}</span>
    </span>
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
