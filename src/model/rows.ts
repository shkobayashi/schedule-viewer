import { brokenLinkTaskIds } from "./dependencies";
import { normalizeTaskNote } from "./taskNote";
import { isOverdue } from "./timeline";
import { summarizeSpans } from "./summary";
import {
  matchesUnassignedFilter,
} from "./assigneeDisplay";
import type { Member, MemberId } from "./memberTypes";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  type Category,
  type ScheduleFilters,
  type ScheduleId,
  type Task,
  type VisibleRow,
} from "./types";

export const ROW_HEIGHT = 32;

export function categoryCollapseKey(id: ScheduleId): string {
  return `category:${id}`;
}

export function groupCollapseKey(id: ScheduleId): string {
  return `group:${id}`;
}

export function taskMatchesFilter(
  task: Task,
  filters: ScheduleFilters,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  brokenIds?: ReadonlySet<ScheduleId>,
  lineageIds?: ReadonlySet<ScheduleId> | null,
): boolean {
  if (lineageIds && !lineageIds.has(task.id)) return false;
  if (filters.assignee === UNASSIGNED_FILTER) {
    if (!matchesUnassignedFilter(task.assigneeId, memberCatalog)) return false;
  } else if (
    filters.assignee !== "all" &&
    task.assigneeId !== filters.assignee
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
  if (
    filters.confidence !== "all" &&
    task.confidence !== filters.confidence
  ) {
    return false;
  }
  if (filters.overdue === "overdue" && !isOverdue(task, today)) {
    return false;
  }
  if (filters.relation === "broken" && !brokenIds?.has(task.id)) {
    return false;
  }
  if (filters.milestone === NO_MILESTONE_FILTER) {
    if (task.milestoneId != null) return false;
  } else if (
    filters.milestone !== "all" &&
    task.milestoneId !== filters.milestone
  ) {
    return false;
  }
  const search = filters.search.trim();
  if (search && !task.name.includes(search)) {
    return false;
  }
  const noteSearch = filters.noteSearch.trim();
  if (noteSearch) {
    const note = normalizeTaskNote(task.note);
    if (note === undefined || !note.includes(noteSearch)) {
      return false;
    }
  }
  return true;
}

/** 新しいタスクを隠す絞り込みだけを外す。タスク名の検索は空白を除かずに含むかを見る。 */
export function relaxFiltersForNewTask(
  filters: ScheduleFilters,
  task: Task,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  brokenIds?: ReadonlySet<ScheduleId>,
): ScheduleFilters {
  const open: ScheduleFilters = {
    assignee: "all",
    status: "all",
    confidence: "all",
    overdue: "all",
    relation: "all",
    milestone: "all",
    search: "",
    noteSearch: "",
  };
  const hides = (partial: Partial<ScheduleFilters>) =>
    !taskMatchesFilter(
      task,
      { ...open, ...partial },
      today,
      memberCatalog,
      brokenIds,
      null,
    );
  return {
    ...filters,
    assignee:
      filters.assignee !== "all" && hides({ assignee: filters.assignee })
        ? "all"
        : filters.assignee,
    status:
      filters.status !== "all" && hides({ status: filters.status })
        ? "all"
        : filters.status,
    confidence:
      filters.confidence !== "all" && hides({ confidence: filters.confidence })
        ? "all"
        : filters.confidence,
    overdue:
      filters.overdue !== "all" && hides({ overdue: filters.overdue })
        ? "all"
        : filters.overdue,
    relation:
      filters.relation !== "all" && hides({ relation: filters.relation })
        ? "all"
        : filters.relation,
    milestone:
      filters.milestone !== "all" && hides({ milestone: filters.milestone })
        ? "all"
        : filters.milestone,
    search:
      filters.search && !task.name.includes(filters.search) ? "" : filters.search,
    noteSearch:
      filters.noteSearch.trim() && hides({ noteSearch: filters.noteSearch })
        ? ""
        : filters.noteSearch,
  };
}

export function computeVisibleRows(
  categories: Category[],
  filters: ScheduleFilters,
  collapsed: ReadonlySet<string>,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
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
          taskMatchesFilter(
            task,
            filters,
            today,
            memberCatalog,
            brokenIds,
            lineageIds,
          ),
        ),
      }))
      .filter((entry) => entry.matched.length > 0);
    if (groups.length === 0) continue;
    const categorySummary = summarizeSpans(
      groups.flatMap((entry) => entry.matched),
    );
    if (!categorySummary) continue;
    const categoryCollapsed = collapsed.has(categoryCollapseKey(cat.id));
    rows.push({
      type: "category",
      id: cat.id,
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
      const groupCollapsed = collapsed.has(groupCollapseKey(group.id));
      rows.push({
        type: "group",
        id: group.id,
        categoryId: cat.id,
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
