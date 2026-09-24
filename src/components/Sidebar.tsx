import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { milestonesExceededBy } from "../model/milestones";
import {
  categoryCollapseKey,
  groupCollapseKey,
} from "../model/rows";
import { isOverdue } from "../model/timeline";
import {
  isUnassigned,
  UNASSIGNED_LABEL,
  type Milestone,
  type VisibleRow,
} from "../model/types";

type SidebarProps = {
  rows: VisibleRow[];
  scrollY: number;
  rowHeight: number;
  selectedTaskId: import("../model/types").ScheduleId | null;
  milestoneBandHeight: number;
  milestones: Milestone[];
  onToggleCollapse: (key: string) => void;
};

export function Sidebar({
  rows,
  scrollY,
  rowHeight,
  selectedTaskId,
  milestoneBandHeight,
  milestones,
  onToggleCollapse,
}: SidebarProps) {
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
          style={{ transform: `translateY(${-scrollY}px)` }}
        >
          {rows.map((row) => {
            if (row.type === "category") {
              return (
                <div
                  key={`cat-${row.label}-${row.y}`}
                  className="sidebar-row category"
                  style={{ height: rowHeight }}
                >
                  <CollapseButton
                    label={row.label}
                    collapsed={row.collapsed}
                    onClick={() => onToggleCollapse(categoryCollapseKey(row.label))}
                  />
                  <SlideLabel text={row.label} />
                </div>
              );
            }
            if (row.type === "group") {
              return (
                <div
                  key={`group-${row.category}-${row.label}-${row.y}`}
                  className="sidebar-row group"
                  style={{ height: rowHeight }}
                >
                  <CollapseButton
                    label={row.label}
                    collapsed={row.collapsed}
                    onClick={() =>
                      onToggleCollapse(groupCollapseKey(row.category, row.label))
                    }
                  />
                  <SlideLabel text={row.label} />
                </div>
              );
            }
            const selected = row.task.id === selectedTaskId;
            const unassigned = isUnassigned(row.task.assignee);
            const exceeded = milestonesExceededBy(row.task, milestones);
            const exceededTitle =
              exceeded.length === 0
                ? undefined
                : `${exceeded.map((milestone) => milestone.name).join("、")}を超える計画です`;
            return (
              <div
                key={`task-${row.task.id}`}
                className={`sidebar-row task${selected ? " selected" : ""}${unassigned ? " unassigned" : ""}`}
                style={{ height: rowHeight }}
                title={exceededTitle}
              >
                <SlideLabel
                  text={row.task.name}
                  className={isOverdue(row.task) ? "overdue" : undefined}
                />
                {exceeded.length > 0 ? (
                  <span className="milestone-alert" title={exceededTitle}>
                    超過
                  </span>
                ) : null}
                <span className={`assignee${unassigned ? " unassigned" : ""}`}>
                  {unassigned ? UNASSIGNED_LABEL : row.task.assignee}
                </span>
              </div>
            );
          })}
        </div>
      </div>
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
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
    >
      <span ref={textRef} className="slide-label-text">
        {text}
      </span>
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
      aria-label={collapsed ? `${label}を展開` : `${label}を折りたたむ`}
      onClick={onClick}
    >
      {collapsed ? "▶" : "▼"}
    </button>
  );
}
