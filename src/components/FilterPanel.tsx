import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  type ConfidenceFilter,
  type Milestone,
  type MilestoneGroup,
  type ScheduleId,
  type OverdueFilter,
  type RelationFilter,
  type ScheduleFilters,
  type StatusFilter,
} from "../model/types";
import { anchorBelowRect, menuShiftForRect } from "./anchoredMenu";
import type { AssigneeFilterOption } from "./Toolbar";

type FilterPanelProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  filters: ScheduleFilters;
  milestones: Milestone[];
  milestoneGroups: MilestoneGroup[];
  hiddenMilestoneGroupIds: ScheduleId[];
  onMilestoneGroupVisible: (groupId: ScheduleId, visible: boolean) => void;
  assigneeFilterOptions: AssigneeFilterOption[];
  onFiltersChange: (patch: Partial<ScheduleFilters>) => void;
};

export function FilterPanel({
  open,
  onClose,
  anchorRef,
  filters,
  milestones,
  milestoneGroups,
  hiddenMilestoneGroupIds,
  onMilestoneGroupVisible,
  assigneeFilterOptions,
  onFiltersChange,
}: FilterPanelProps) {
  const hiddenMilestoneGroupSet = new Set(hiddenMilestoneGroupIds);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    setPosition(anchorBelowRect(anchorRef.current));
    setShift({ x: 0, y: 0 });
  }, [anchorRef, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const next = menuShiftForRect(
      position.left,
      position.top,
      panel.offsetWidth,
      panel.offsetHeight,
    );
    setShift((prev) =>
      prev.x === next.x && prev.y === next.y ? prev : next,
    );
  }, [open, position.left, position.top]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="filter-panel filter-panel--fixed"
      ref={panelRef}
      style={{
        left: position.left + shift.x,
        top: position.top + shift.y,
      }}
    >
      <div className="filter-panel-grid">
        <label className="filter-panel-field">
          <span>担当者</span>
          <select
            aria-label="担当者"
            value={filters.assignee}
            onChange={(e) => onFiltersChange({ assignee: e.target.value })}
          >
            <option value="all">すべて</option>
            <option value={UNASSIGNED_FILTER}>{UNASSIGNED_LABEL}</option>
            {assigneeFilterOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-panel-field">
          <span>ステータス</span>
          <select
            aria-label="ステータス"
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({ status: e.target.value as StatusFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="not-done">完了以外</option>
            <option value="not-started">未着手</option>
            <option value="in-progress">進行中</option>
            <option value="done">完了</option>
          </select>
        </label>
        <label className="filter-panel-field">
          <span>確度</span>
          <select
            aria-label="確度"
            value={filters.confidence}
            onChange={(e) =>
              onFiltersChange({ confidence: e.target.value as ConfidenceFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="tentative">未確定</option>
            <option value="committed">確定</option>
          </select>
        </label>
        <label className="filter-panel-field">
          <span>期限</span>
          <select
            aria-label="期限"
            value={filters.overdue}
            onChange={(e) =>
              onFiltersChange({ overdue: e.target.value as OverdueFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="overdue">期限超過</option>
          </select>
        </label>
        <label className="filter-panel-field">
          <span>前後</span>
          <select
            aria-label="前後"
            value={filters.relation}
            onChange={(e) =>
              onFiltersChange({ relation: e.target.value as RelationFilter })
            }
          >
            <option value="all">すべて</option>
            <option value="broken">破綻のみ</option>
          </select>
        </label>
        <label className="filter-panel-field">
          <span>マイルストン</span>
          <select
            aria-label="マイルストン"
            value={filters.milestone}
            onChange={(e) => onFiltersChange({ milestone: e.target.value })}
          >
            <option value="all">すべて</option>
            <option value={NO_MILESTONE_FILTER}>なし</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}（{milestone.date}）
              </option>
            ))}
          </select>
        </label>
        {milestoneGroups.length > 0 ? (
          <div className="filter-panel-field filter-panel-milestone-groups">
            <span>帯の線</span>
            <div className="filter-panel-checks">
              {milestoneGroups.map((group) => (
                <label key={group.id} className="filter-panel-check">
                  <input
                    type="checkbox"
                    checked={!hiddenMilestoneGroupSet.has(group.id)}
                    onChange={(e) =>
                      onMilestoneGroupVisible(group.id, e.target.checked)
                    }
                  />
                  <span>{group.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.getElementById("root") ?? document.body,
  );
}
