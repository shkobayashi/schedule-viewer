import { isOverdue } from "./timeline";
import type { Category, ScheduleFilters, Task, VisibleRow } from "./types";

export const ROW_HEIGHT = 32;

export function taskMatchesFilter(task: Task, filters: ScheduleFilters): boolean {
  if (filters.assignee !== "all" && task.assignee !== filters.assignee) {
    return false;
  }
  if (filters.status === "not-done" && task.status === "done") {
    return false;
  }
  if (
    filters.status !== "all" &&
    filters.status !== "not-done" &&
    task.status !== filters.status
  ) {
    return false;
  }
  if (filters.overdue === "overdue" && !isOverdue(task)) {
    return false;
  }
  if (filters.search && !task.name.includes(filters.search)) {
    return false;
  }
  return true;
}

export function computeVisibleRows(
  categories: Category[],
  filters: ScheduleFilters,
  rowHeight = ROW_HEIGHT,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  let y = 0;
  for (const cat of categories) {
    const matched = cat.tasks.filter((t) => taskMatchesFilter(t, filters));
    if (matched.length === 0) continue;
    rows.push({ type: "category", label: cat.name, y });
    y += rowHeight;
    for (const task of matched) {
      rows.push({ type: "task", task, y });
      y += rowHeight;
    }
  }
  return rows;
}

export function findTaskById(
  categories: Category[],
  id: number | null,
): Task | null {
  if (id == null) return null;
  for (const c of categories) {
    for (const t of c.tasks) {
      if (t.id === id) return t;
    }
  }
  return null;
}
