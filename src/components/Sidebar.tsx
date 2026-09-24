import { ROW_HEIGHT } from "../model/rows";
import type { VisibleRow } from "../model/types";

type SidebarProps = {
  rows: VisibleRow[];
  scrollY: number;
  selectedTaskId: number | null;
};

export function Sidebar({ rows, scrollY, selectedTaskId }: SidebarProps) {
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
                  style={{ height: ROW_HEIGHT }}
                >
                  {row.label}
                </div>
              );
            }
            const selected = row.task.id === selectedTaskId;
            return (
              <div
                key={`task-${row.task.id}`}
                className={`sidebar-row${selected ? " selected" : ""}`}
                style={{ height: ROW_HEIGHT }}
              >
                <span className="name">{row.task.name}</span>
                <span className="assignee">{row.task.assignee}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
