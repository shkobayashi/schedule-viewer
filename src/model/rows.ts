import { brokenLinkTaskIds, brokenLinkTaskIdsFromTasks } from "./dependencies";
import {
  hierarchyRowKind,
  isOutlineBranch,
  isTaskNode,
  scheduleStoresTasksInOutline,
  taskHierarchyLabels,
  tasksUnderOutlineBranch,
} from "./hierarchy";
import { averageTaskProgress } from "./progressRollup";
import { normalizeTaskNote } from "./taskNote";
import {
  activeFieldFilterCount,
  relaxFieldFiltersForNewTask,
  taskMatchesFieldFilters,
} from "./fieldFilters";
import { taskHasAnySelectedTag } from "./taskTags";
import { BUILTIN_STATUS_ITEMS, isDoneStatus, type StatusItem } from "./statusCatalog";
import { isOverdue } from "./timeline";
import {
  categoryRollupPercent,
  groupRollupPercent,
} from "./progressRollup";
import { summarizeSpans } from "./summary";
import {
  matchesUnassignedFilter,
} from "./assigneeDisplay";
import type { Member, MemberId } from "./memberTypes";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  type Category,
  type OutlineRoot,
  type ScheduleDocument,
  type ScheduleFieldDef,
  type ScheduleFilters,
  type ScheduleId,
  type ScheduleLevelDef,
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

export function hierarchyCollapseKey(id: ScheduleId): string {
  return `hierarchy:${id}`;
}

export function filtersAreDefault(
  filters: ScheduleFilters,
  fields?: readonly ScheduleFieldDef[],
): boolean {
  return (
    filters.assignee === "all" &&
    filters.status === "all" &&
    filters.confidence === "all" &&
    filters.overdue === "all" &&
    filters.relation === "all" &&
    filters.milestone === "all" &&
    filters.tags.length === 0 &&
    filters.search.trim() === "" &&
    filters.noteSearch.trim() === "" &&
    activeFieldFilterCount(fields, filters.fieldFilters ?? {}) === 0
  );
}

/** 絞り込みも系統も無いとき、タスク0件のグループとカテゴリも行に出す。 */
export function showEmptyHierarchyRows(
  filters: ScheduleFilters,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  fields?: readonly ScheduleFieldDef[],
): boolean {
  return filtersAreDefault(filters, fields) && lineageIds == null;
}

export function brokenIdsForFilter(
  categories: Category[],
  filters: ScheduleFilters,
): ReadonlySet<ScheduleId> | undefined {
  return filters.relation === "broken"
    ? brokenLinkTaskIds(categories)
    : undefined;
}

export type FilteredTaskRef = {
  task: Task;
  category: string;
  group: string;
};

/** 折りたたみや空グループの行は含めず、絞り込みで残るタスクだけを返す。 */
export function listTasksMatchingFilter(
  categories: Category[],
  filters: ScheduleFilters,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  fields?: readonly ScheduleFieldDef[],
): FilteredTaskRef[] {
  const brokenIds = brokenIdsForFilter(categories, filters);
  const matched: FilteredTaskRef[] = [];
  for (const cat of categories) {
    for (const group of cat.groups) {
      for (const task of group.tasks) {
        if (
          taskMatchesFilter(
            task,
            filters,
            today,
            memberCatalog,
            brokenIds,
            lineageIds,
            statuses,
            fields,
          )
        ) {
          matched.push({
            task,
            category: cat.name,
            group: group.name,
          });
        }
      }
    }
  }
  return matched;
}

export function listTasksMatchingFilterInDocument(
  doc: Pick<
    ScheduleDocument,
    | "schemaVersion"
    | "title"
    | "categories"
    | "outline"
    | "levels"
    | "milestoneGroups"
    | "milestones"
  >,
  filters: ScheduleFilters,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  fieldDefs?: readonly ScheduleFieldDef[],
): FilteredTaskRef[] {
  const fields = fieldDefs;
  const categories = doc.categories ?? [];
  if (
    !scheduleStoresTasksInOutline({
      categories,
      levels: doc.levels,
      outline: doc.outline,
    })
  ) {
    return listTasksMatchingFilter(
      categories,
      filters,
      today,
      memberCatalog,
      lineageIds,
      statuses,
      fields,
    );
  }
  const outline = doc.outline ?? [];
  const brokenIds =
    filters.relation === "broken"
      ? brokenLinkTaskIdsFromTasks(collectOutlineTasks(outline))
      : undefined;
  const matched: FilteredTaskRef[] = [];
  const walk = (nodes: OutlineRoot) => {
    for (const node of nodes) {
      if (isTaskNode(node)) {
        if (
          taskMatchesFilter(
            node,
            filters,
            today,
            memberCatalog,
            brokenIds,
            lineageIds,
            statuses,
            fields,
          )
        ) {
          const labels = taskHierarchyLabels(
            doc as ScheduleDocument,
            node.id,
          );
          matched.push({
            task: node,
            category: labels.category,
            group: labels.group,
          });
        }
        continue;
      }
      if (isOutlineBranch(node)) walk(node.children);
    }
  };
  walk(outline);
  return matched;
}

function collectOutlineTasks(outline: OutlineRoot): Task[] {
  const tasks: Task[] = [];
  const walk = (nodes: OutlineRoot) => {
    for (const node of nodes) {
      if (isTaskNode(node)) tasks.push(node);
      else if (isOutlineBranch(node)) walk(node.children);
    }
  };
  walk(outline);
  return tasks;
}

export function taskMatchesFilter(
  task: Task,
  filters: ScheduleFilters,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  brokenIds?: ReadonlySet<ScheduleId>,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  fields?: readonly ScheduleFieldDef[],
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
  if (filters.status === "not-done" && isDoneStatus(statuses, task.status)) {
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
  if (filters.overdue === "overdue" && !isOverdue(task, today, statuses)) {
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
  if (!taskHasAnySelectedTag(task, filters.tags)) {
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
  if (!taskMatchesFieldFilters(task, fields, filters.fieldFilters ?? {})) {
    return false;
  }
  return true;
}

/** 新しいタスクを隠す絞り込みだけを外す。タスク名の検索は表示と同じく前後の空白を除いて比べる。 */
export function relaxFiltersForNewTask(
  filters: ScheduleFilters,
  task: Task,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  brokenIds?: ReadonlySet<ScheduleId>,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  fields?: readonly ScheduleFieldDef[],
): ScheduleFilters {
  const open: ScheduleFilters = {
    assignee: "all",
    status: "all",
    confidence: "all",
    overdue: "all",
    relation: "all",
    milestone: "all",
    tags: [],
    search: "",
    noteSearch: "",
    fieldFilters: {},
  };
  const hides = (partial: Partial<ScheduleFilters>) =>
    !taskMatchesFilter(
      task,
      { ...open, ...partial, fieldFilters: partial.fieldFilters ?? {} },
      today,
      memberCatalog,
      brokenIds,
      null,
      statuses,
      fields,
    );
  const relaxedFieldFilters = relaxFieldFiltersForNewTask(
    filters.fieldFilters ?? {},
    fields,
    task,
  );
  return {
    ...filters,
    fieldFilters: relaxedFieldFilters,
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
    tags:
      filters.tags.length > 0 && hides({ tags: filters.tags })
        ? []
        : filters.tags,
    search:
      filters.search.trim() && hides({ search: filters.search })
        ? ""
        : filters.search,
    noteSearch:
      filters.noteSearch.trim() && hides({ noteSearch: filters.noteSearch })
        ? ""
        : filters.noteSearch,
  };
}

function computeFlatTaskVisibleRows(
  outline: OutlineRoot,
  filters: ScheduleFilters,
  _collapsed: ReadonlySet<string>,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  rowHeight: number,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  fields?: readonly ScheduleFieldDef[],
): VisibleRow[] {
  const brokenIds = brokenIdsForOutline(outline, filters);
  const rows: VisibleRow[] = [];
  let y = 0;
  for (const node of outline) {
    if (!isTaskNode(node)) continue;
    if (
      !taskMatchesFilter(
        node,
        filters,
        today,
        memberCatalog,
        brokenIds ?? undefined,
        lineageIds,
        statuses,
        fields,
      )
    ) {
      continue;
    }
    rows.push({ type: "task", task: node, y });
    y += rowHeight;
  }
  return rows;
}

function brokenIdsForOutline(
  outline: OutlineRoot,
  filters: ScheduleFilters,
): Set<ScheduleId> | null {
  if (filters.relation !== "broken") return null;
  const tasks: Task[] = [];
  const walk = (nodes: OutlineRoot) => {
    for (const node of nodes) {
      if (isTaskNode(node)) tasks.push(node);
      else walk(node.children);
    }
  };
  walk(outline);
  return brokenLinkTaskIdsFromTasks(tasks);
}

function computeOutlineVisibleRows(
  outline: OutlineRoot,
  levelCount: number,
  filters: ScheduleFilters,
  collapsed: ReadonlySet<string>,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  rowHeight: number,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  fields?: readonly ScheduleFieldDef[],
): VisibleRow[] {
  const brokenIds = brokenIdsForOutline(outline, filters);
  const showEmpty = showEmptyHierarchyRows(filters, lineageIds, fields);
  const rows: VisibleRow[] = [];
  let y = 0;

  const walk = (
    nodes: OutlineRoot,
    levelIndex: number,
    depth: number,
    ancestorIds: ScheduleId[],
  ) => {
    for (const node of nodes) {
      if (isTaskNode(node)) {
        if (
          taskMatchesFilter(
            node,
            filters,
            today,
            memberCatalog,
            brokenIds ?? undefined,
            lineageIds,
            statuses,
            fields,
          )
        ) {
          rows.push({ type: "task", task: node, y });
          y += rowHeight;
        }
        continue;
      }
      if (!isOutlineBranch(node)) continue;
      const allTasks = tasksUnderOutlineBranch(node);
      const matched = allTasks.filter((task) =>
        taskMatchesFilter(
          task,
          filters,
          today,
          memberCatalog,
          brokenIds ?? undefined,
          lineageIds,
          statuses,
          fields,
        ),
      );
      if (matched.length === 0 && !(showEmpty && allTasks.length === 0)) continue;
      const summary = matched.length > 0 ? summarizeSpans(matched) : null;
      if (!summary && !showEmpty) continue;
      const nodeCollapsed = collapsed.has(hierarchyCollapseKey(node.id));
      const rowKind = hierarchyRowKind(levelIndex, levelCount);
      rows.push({
        type: "hierarchy",
        id: node.id,
        label: node.name,
        y,
        collapsed: nodeCollapsed,
        summary,
        rollupPercent: averageTaskProgress(allTasks),
        levelIndex,
        depth,
        rowKind,
        ancestorIds: [...ancestorIds],
        alsoTaskParent: levelCount === 2 && levelIndex === 0,
      });
      y += rowHeight;
      if (nodeCollapsed) continue;
      walk(node.children, levelIndex + 1, depth + 1, [...ancestorIds, node.id]);
    }
  };

  walk(outline, 0, 0, []);
  return rows;
}

export function computeVisibleRows(
  categories: Category[],
  filters: ScheduleFilters,
  collapsed: ReadonlySet<string>,
  today: string,
  memberCatalog: Map<MemberId, Member> | null,
  rowHeight = ROW_HEIGHT,
  lineageIds?: ReadonlySet<ScheduleId> | null,
  statuses: readonly StatusItem[] = BUILTIN_STATUS_ITEMS,
  hierarchy?: {
    levels: ScheduleLevelDef[] | null;
    outline: OutlineRoot | null | undefined;
    useLegacyCategoryRows: boolean;
    levelCount: number;
  },
  fields?: readonly ScheduleFieldDef[],
): VisibleRow[] {
  if (
    hierarchy?.levels != null &&
    hierarchy.levels.length === 1 &&
    hierarchy.outline != null &&
    hierarchy.outline.length > 0
  ) {
    return computeFlatTaskVisibleRows(
      hierarchy.outline,
      filters,
      collapsed,
      today,
      memberCatalog,
      rowHeight,
      lineageIds,
      statuses,
      fields,
    );
  }
  if (
    hierarchy?.levels != null &&
    hierarchy.levels.length > 0 &&
    !hierarchy.useLegacyCategoryRows &&
    hierarchy.outline != null &&
    hierarchy.outline.length > 0
  ) {
    return computeOutlineVisibleRows(
      hierarchy.outline,
      hierarchy.levelCount,
      filters,
      collapsed,
      today,
      memberCatalog,
      rowHeight,
      lineageIds,
      statuses,
      fields,
    );
  }
  const brokenIds = brokenIdsForFilter(categories, filters);
  const showEmpty = showEmptyHierarchyRows(filters, lineageIds, fields);
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
            statuses,
            fields,
          ),
        ),
      }))
      .filter(
        (entry) =>
          entry.matched.length > 0 ||
          (showEmpty && entry.group.tasks.length === 0),
      );
    if (groups.length === 0) continue;
    const categoryTasks = groups.flatMap((entry) => entry.matched);
    const categorySummary =
      categoryTasks.length > 0 ? summarizeSpans(categoryTasks) : null;
    if (!categorySummary && !showEmpty) continue;
    const categoryCollapsed = collapsed.has(categoryCollapseKey(cat.id));
    rows.push({
      type: "category",
      id: cat.id,
      label: cat.name,
      y,
      collapsed: categoryCollapsed,
      summary: categorySummary,
      rollupPercent: categoryRollupPercent(cat),
    });
    y += rowHeight;
    if (categoryCollapsed) continue;
    for (const { group, matched } of groups) {
      const groupSummary =
        matched.length > 0 ? summarizeSpans(matched) : null;
      if (!groupSummary && !showEmpty) continue;
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
        rollupPercent: groupRollupPercent(group),
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

export type ReorderDragKind = "category" | "group" | "task";

export function visibleRowIdentityKey(row: VisibleRow): string {
  if (row.type === "task") return `task:${row.task.id}`;
  return `${row.type}:${row.id}`;
}

export function isHierarchyHeaderRow(row: VisibleRow): boolean {
  return (
    row.type === "category" ||
    row.type === "group" ||
    row.type === "hierarchy"
  );
}

/** 並べ替えドラッグの半透明塊に含める、いま見えている行（上から順）。 */
export function reorderDragBlockRows(
  rows: readonly VisibleRow[],
  kind: ReorderDragKind,
  id: ScheduleId,
): VisibleRow[] {
  const startIndex = rows.findIndex((row) => {
    if (kind === "task") {
      return row.type === "task" && row.task.id === id;
    }
    if (kind === "category") {
      return row.type === "category" && row.id === id;
    }
    return row.type === "group" && row.id === id;
  });
  if (startIndex < 0) return [];

  const startRow = rows[startIndex];
  if (kind === "task") {
    return [startRow];
  }

  if (kind === "group") {
    const block: VisibleRow[] = [startRow];
    for (let i = startIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.type === "category" || row.type === "group") break;
      block.push(row);
    }
    return block;
  }

  const block: VisibleRow[] = [startRow];
  if (startRow.type === "category" && startRow.collapsed) {
    return block;
  }
  for (let i = startIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.type === "category") break;
    block.push(row);
  }
  return block;
}

export function rowInReorderDragBlock(
  row: VisibleRow,
  rows: readonly VisibleRow[],
  kind: ReorderDragKind,
  id: ScheduleId,
): boolean {
  const key = visibleRowIdentityKey(row);
  return reorderDragBlockRows(rows, kind, id).some(
    (candidate) => visibleRowIdentityKey(candidate) === key,
  );
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
