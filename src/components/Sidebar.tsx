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
                  {row.label}
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
                  {row.label}
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
                <span className={`name${isOverdue(row.task) ? " overdue" : ""}`}>
                  {row.task.name}
                </span>
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
