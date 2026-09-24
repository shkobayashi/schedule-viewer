import { isOverdue } from "../model/timeline";
import { isUnassigned, UNASSIGNED_LABEL, type VisibleRow } from "../model/types";

type SidebarProps = {
  rows: VisibleRow[];
  scrollY: number;
  rowHeight: number;
  selectedTaskId: number | null;
};

export function Sidebar({
  rows,
  scrollY,
  rowHeight,
  selectedTaskId,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">WBS / タスク</div>
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
                  {row.label}
                </div>
              );
            }
            const selected = row.task.id === selectedTaskId;
            const unassigned = isUnassigned(row.task.assignee);
            return (
              <div
                key={`task-${row.task.id}`}
                className={`sidebar-row${selected ? " selected" : ""}${unassigned ? " unassigned" : ""}`}
                style={{ height: rowHeight }}
              >
                <span className={`name${isOverdue(row.task) ? " overdue" : ""}`}>
                  {row.task.name}
                </span>
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
