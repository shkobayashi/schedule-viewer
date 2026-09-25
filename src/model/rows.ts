import { brokenLinkTaskIds } from "./dependencies";
import { isOverdue } from "./timeline";
import { summarizeSpans } from "./summary";
import {
  isUnassigned,
  UNASSIGNED_FILTER,
  type Category,
  type ScheduleFilters,
  type ScheduleId,
  type Task,
  type VisibleRow,
} from "./types";

export const ROW_HEIGHT = 32;

export function categoryCollapseKey(name: string): string {
  return `category:${name}`;
}

export function groupCollapseKey(category: string, group: string): string {
  return `group:${category}\u0000${group}`;
}

export function taskMatchesFilter(
  task: Task,
  filters: ScheduleFilters,
  today: string,
  brokenIds?: ReadonlySet<ScheduleId>,
  lineageIds?: ReadonlySet<ScheduleId> | null,
): boolean {
  if (lineageIds && !lineageIds.has(task.id)) return false;
  if (filters.assignee === UNASSIGNED_FILTER) {
    if (!isUnassigned(task.assignee)) return false;
  } else if (
    filters.assignee !== "all" &&
    task.assignee.trim() !== filters.assignee
  ) {
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
  if (filters.overdue === "overdue" && !isOverdue(task, today)) {
    return false;
  }
  if (filters.relation === "broken" && !brokenIds?.has(task.id)) {
    return false;
  }
  const search = filters.search.trim();
  if (search && !task.name.includes(search)) {
    return false;
  }
  return true;
}

export function computeVisibleRows(
  categories: Category[],
  filters: ScheduleFilters,
  collapsed: ReadonlySet<string>,
  today: string,
  rowHeight = ROW_HEIGHT,
  lineageIds?: ReadonlySet<ScheduleId> | null,
): VisibleRow[] {
  const brokenIds =
    filters.relation === "broken" ? brokenLinkTaskIds(categories) : undefined;
  const rows: VisibleRow[] = [];
  let y = 0;
  for (const cat of categories) {
    const groups = cat.groups
      .map((group) => ({
        group,
        matched: group.tasks.filter((task) =>
          taskMatchesFilter(task, filters, today, brokenIds, lineageIds),
        ),
      }))
      .filter((entry) => entry.matched.length > 0);
    if (groups.length === 0) continue;
    const categorySummary = summarizeSpans(
      groups.flatMap((entry) => entry.matched),
    );
    if (!categorySummary) continue;
    const categoryCollapsed = collapsed.has(categoryCollapseKey(cat.name));
    rows.push({
      type: "category",
      label: cat.name,
      y,
      collapsed: categoryCollapsed,
      summary: categorySummary,
    });
    y += rowHeight;
    if (categoryCollapsed) continue;
    for (const { group, matched } of groups) {
      const groupSummary = summarizeSpans(matched);
      if (!groupSummary) continue;
      const groupCollapsed = collapsed.has(
        groupCollapseKey(cat.name, group.name),
      );
      rows.push({
        type: "group",
        category: cat.name,
        label: group.name,
        y,
        collapsed: groupCollapsed,
        summary: groupSummary,
      });
      y += rowHeight;
      if (groupCollapsed) continue;
      for (const task of matched) {
        rows.push({ type: "task", task, y });
        y += rowHeight;
      }
    }
  }
  return rows;
}

export function findTaskById(
  categories: Category[],
  id: ScheduleId | null,
): Task | null {
  if (id == null) return null;
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === id) return task;
      }
    }
  }
  return null;
}
