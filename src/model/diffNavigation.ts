import { parseDate } from "./dates";
import {
  categoryCollapseKey,
  groupCollapseKey,
  hierarchyCollapseKey,
  taskMatchesFilter,
  brokenIdsForFilter,
} from "./rows";
import { scrollYToShowSelectedTask } from "./stickyRows";
import { findTaskInDocument, isOutlineBranch, isTaskNode } from "./hierarchy";
import type { DiffNavTarget, ScheduleDiffEntry } from "./scheduleDiffEntry";
import type { Member, MemberId } from "./memberTypes";
import type {
  Category,
  Milestone,
  OutlineChild,
  OutlineRoot,
  ScheduleFilters,
  ScheduleId,
  VisibleRow,
} from "./types";

export type DiffSidebarMark =
  | { type: "task"; id: ScheduleId }
  | { type: "category"; id: ScheduleId }
  | { type: "group"; id: ScheduleId };

export type DiffNavigationMark = {
  sidebar: DiffSidebarMark | null;
  /** チャート上のひし形を示す（削除のマイルストンでは null） */
  chartMilestoneId: ScheduleId | null;
  /** 左のマイルストン帯の行を示す */
  milestoneGroupId: ScheduleId | null;
  title: boolean;
};

export type DiffRevealPlan =
  | {
      kind: "task";
      taskId: ScheduleId;
      scrollY: number;
      scrollXDate: Date;
      barWidthPx: number;
    }
  | { kind: "category"; categoryId: ScheduleId; scrollY: number }
  | { kind: "group"; groupId: ScheduleId; scrollY: number }
  | {
      kind: "milestone";
      milestoneId: ScheduleId;
      scrollXDate: Date;
    }
  | { kind: "milestoneGroup"; milestoneGroupId: ScheduleId }
  | { kind: "title" };

export type DiffNavigationOutcome =
  | { status: "ok"; reveal: DiffRevealPlan; mark: DiffNavigationMark }
  | { status: "blocked"; message: string };

export type DiffNavigationContext = {
  visibleRows: VisibleRow[];
  categories: Category[];
  outline?: OutlineRoot | null;
  collapsed: ReadonlySet<string>;
  filters: ScheduleFilters;
  today: string;
  memberMap: Map<MemberId, Member> | null;
  lineageIds: ReadonlySet<ScheduleId> | null;
  hiddenMilestoneGroupIds: ReadonlySet<ScheduleId>;
  milestones: Milestone[];
  scrollY: number;
  rowHeight: number;
  bodyHeight: number;
  dateToX: (date: Date) => number;
  pxPerDay: number;
  taskBarWidthPx: (task: { start: string; end: string }) => number;
};

export function resolveDiffNavigation(
  entry: ScheduleDiffEntry,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  return resolveNavTarget(entry.nav, ctx);
}

function resolveNavTarget(
  nav: DiffNavTarget,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  switch (nav.kind) {
    case "none":
    case "order":
      return { status: "blocked", message: "" };
    case "title":
      return {
        status: "ok",
        reveal: { kind: "title" },
        mark: {
          sidebar: null,
          chartMilestoneId: null,
          milestoneGroupId: null,
          title: true,
        },
      };
    case "task":
      return revealTask(nav.taskId, ctx);
    case "connection":
      return revealConnection(nav.taskIdA, nav.taskIdB, ctx);
    case "category":
      return revealCategory(nav.categoryId, ctx);
    case "group":
      return revealGroup(nav.groupId, ctx);
    case "milestone":
      return revealMilestone(nav.milestoneId, ctx, false);
    case "milestoneGroup":
      return revealMilestoneGroup(nav.milestoneGroupId, ctx);
    case "deleteTask":
      return revealGroup(nav.groupId, ctx);
    case "deleteGroup":
      return revealCategory(nav.categoryId, ctx);
    case "deleteCategory":
      return { status: "blocked", message: "画面には無い" };
    case "deleteMilestone":
      return revealDeletedMilestone(nav, ctx);
    case "deleteMilestoneGroup":
      return { status: "blocked", message: "画面には無い" };
    default:
      return { status: "blocked", message: "" };
  }
}

function collectDocumentTaskOrder(
  categories: Category[],
  outline: OutlineRoot | null | undefined,
): ScheduleId[] {
  const ids: ScheduleId[] = [];
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) ids.push(task.id);
    }
  }
  if (ids.length > 0) return ids;
  if (outline == null) return ids;
  const walk = (nodes: OutlineChild[]) => {
    for (const node of nodes) {
      if (isTaskNode(node)) ids.push(node.id);
      else if (isOutlineBranch(node)) walk(node.children);
    }
  };
  walk(outline);
  return ids;
}

function documentOrderIndex(
  order: readonly ScheduleId[],
  taskId: ScheduleId,
): number {
  const index = order.indexOf(taskId);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function revealConnection(
  taskIdA: ScheduleId,
  taskIdB: ScheduleId,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  const order = collectDocumentTaskOrder(ctx.categories, ctx.outline);
  const visibleA = taskRowInVisible(ctx.visibleRows, taskIdA) != null;
  const visibleB = taskRowInVisible(ctx.visibleRows, taskIdB) != null;

  if (!visibleA && !visibleB) {
    const reasonA = taskBlockedReason(taskIdA, ctx);
    const reasonB = taskBlockedReason(taskIdB, ctx);
    const message = reasonA ?? reasonB ?? "折りたたみで隠れています";
    return { status: "blocked", message };
  }

  let target: ScheduleId;
  if (visibleA && visibleB) {
    target =
      documentOrderIndex(order, taskIdA) <= documentOrderIndex(order, taskIdB)
        ? taskIdA
        : taskIdB;
  } else {
    target = visibleA ? taskIdA : taskIdB;
  }
  return revealTask(target, ctx);
}

function findTaskInCategories(
  categories: Category[],
  taskId: ScheduleId,
): { task: { start: string; end: string }; categoryId: ScheduleId; groupId: ScheduleId } | null {
  for (const category of categories) {
    for (const group of category.groups) {
      const task = group.tasks.find((item) => item.id === taskId);
      if (task) {
        return { task, categoryId: category.id, groupId: group.id };
      }
    }
  }
  return null;
}

function taskRowInVisible(rows: VisibleRow[], taskId: ScheduleId): VisibleRow | null {
  const row = rows.find(
    (item) => item.type === "task" && item.task.id === taskId,
  );
  return row ?? null;
}

function groupRowInVisible(rows: VisibleRow[], groupId: ScheduleId): Extract<VisibleRow, { type: "group" }> | null {
  const row = rows.find((item) => item.type === "group" && item.id === groupId);
  return row?.type === "group" ? row : null;
}

function categoryRowInVisible(
  rows: VisibleRow[],
  categoryId: ScheduleId,
): Extract<VisibleRow, { type: "category" }> | null {
  const row = rows.find((item) => item.type === "category" && item.id === categoryId);
  return row?.type === "category" ? row : null;
}

function taskBlockedReason(
  taskId: ScheduleId,
  ctx: DiffNavigationContext,
): string | null {
  const task = findTaskInDocument(ctx.categories, ctx.outline ?? undefined, taskId);
  if (!task) return "画面には無い";
  const located = findTaskInCategories(ctx.categories, taskId);
  const brokenIds =
    located != null
      ? brokenIdsForFilter(ctx.categories, ctx.filters)
      : null;
  if (
    ctx.lineageIds != null &&
    !ctx.lineageIds.has(taskId)
  ) {
    return "絞り込みで出ていません";
  }
  if (
    !taskMatchesFilter(
      task,
      ctx.filters,
      ctx.today,
      ctx.memberMap,
      brokenIds ?? undefined,
      ctx.lineageIds,
    )
  ) {
    return "絞り込みで出ていません";
  }
  if (located) {
    if (ctx.collapsed.has(categoryCollapseKey(located.categoryId))) {
      return "折りたたみで隠れています";
    }
    if (ctx.collapsed.has(groupCollapseKey(located.groupId))) {
      return "折りたたみで隠れています";
    }
  } else if (ctx.outline != null) {
    const branchIds = outlineBranchAncestorIds(ctx.outline, taskId);
    if (branchIds.some((id) => ctx.collapsed.has(hierarchyCollapseKey(id)))) {
      return "折りたたみで隠れています";
    }
  }
  return null;
}

function outlineBranchAncestorIds(
  outline: OutlineRoot,
  taskId: ScheduleId,
): ScheduleId[] {
  const found: ScheduleId[] = [];
  const walk = (nodes: OutlineChild[], ancestors: ScheduleId[]): boolean => {
    for (const node of nodes) {
      if (isTaskNode(node)) {
        if (node.id === taskId) {
          found.push(...ancestors);
          return true;
        }
        continue;
      }
      if (!isOutlineBranch(node)) continue;
      if (walk(node.children, [...ancestors, node.id])) return true;
    }
    return false;
  };
  walk(outline, []);
  return found;
}

function revealTask(
  taskId: ScheduleId,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  const blocked = taskBlockedReason(taskId, ctx);
  if (blocked) {
    return { status: "blocked", message: blocked };
  }
  const row = taskRowInVisible(ctx.visibleRows, taskId);
  if (!row || row.type !== "task") {
    return { status: "blocked", message: "折りたたみで隠れています" };
  }
  const located = findTaskInCategories(ctx.categories, taskId);
  const task =
    located?.task ??
    findTaskInDocument(ctx.categories, ctx.outline ?? undefined, taskId);
  if (!task) {
    return { status: "blocked", message: "画面には無い" };
  }
  const scrollY = scrollYForRow(row.y, ctx);
  return {
    status: "ok",
    reveal: {
      kind: "task",
      taskId,
      scrollY,
      scrollXDate: parseDate(task.start),
      barWidthPx: ctx.taskBarWidthPx(task),
    },
    mark: {
      sidebar: { type: "task", id: taskId },
      chartMilestoneId: null,
      milestoneGroupId: null,
      title: false,
    },
  };
}

function revealCategory(
  categoryId: ScheduleId,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  const row = categoryRowInVisible(ctx.visibleRows, categoryId);
  if (!row) {
    const exists = ctx.categories.some((category) => category.id === categoryId);
    if (!exists) {
      return { status: "blocked", message: "画面には無い" };
    }
    if (ctx.collapsed.has(categoryCollapseKey(categoryId))) {
      return { status: "blocked", message: "折りたたみで隠れています" };
    }
    return { status: "blocked", message: "絞り込みで出ていません" };
  }
  return {
    status: "ok",
    reveal: {
      kind: "category",
      categoryId,
      scrollY: scrollYForRow(row.y, ctx),
    },
    mark: {
      sidebar: { type: "category", id: categoryId },
      chartMilestoneId: null,
      milestoneGroupId: null,
      title: false,
    },
  };
}

function revealGroup(
  groupId: ScheduleId,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  const row = groupRowInVisible(ctx.visibleRows, groupId);
  if (!row) {
    const place = findGroupInCategories(ctx.categories, groupId);
    if (!place) {
      return { status: "blocked", message: "画面には無い" };
    }
    if (ctx.collapsed.has(categoryCollapseKey(place.categoryId))) {
      return { status: "blocked", message: "折りたたみで隠れています" };
    }
    if (ctx.collapsed.has(groupCollapseKey(groupId))) {
      return { status: "blocked", message: "折りたたみで隠れています" };
    }
    return { status: "blocked", message: "絞り込みで出ていません" };
  }
  return {
    status: "ok",
    reveal: {
      kind: "group",
      groupId,
      scrollY: scrollYForRow(row.y, ctx),
    },
    mark: {
      sidebar: { type: "group", id: groupId },
      chartMilestoneId: null,
      milestoneGroupId: null,
      title: false,
    },
  };
}

function findGroupInCategories(categories: Category[], groupId: ScheduleId) {
  for (const category of categories) {
    const group = category.groups.find((item) => item.id === groupId);
    if (group) {
      return { categoryId: category.id, group };
    }
  }
  return null;
}

function findMilestone(milestones: Milestone[], milestoneId: ScheduleId) {
  return milestones.find((milestone) => milestone.id === milestoneId) ?? null;
}

function revealMilestone(
  milestoneId: ScheduleId,
  ctx: DiffNavigationContext,
  deleted: boolean,
  deletedDate?: string,
): DiffNavigationOutcome {
  const milestone = findMilestone(ctx.milestones, milestoneId);
  if (!deleted && !milestone) {
    return { status: "blocked", message: "画面には無い" };
  }
  const groupId = milestone?.groupId;
  if (groupId != null && ctx.hiddenMilestoneGroupIds.has(groupId)) {
    return { status: "blocked", message: "帯の線がオフ" };
  }
  const date = deleted ? deletedDate ?? milestone?.date : milestone?.date;
  if (!date) {
    return { status: "blocked", message: "画面には無い" };
  }
  return {
    status: "ok",
    reveal: {
      kind: "milestone",
      milestoneId,
      scrollXDate: parseDate(date),
    },
    mark: {
      sidebar: null,
      chartMilestoneId: deleted ? null : milestoneId,
      milestoneGroupId: null,
      title: false,
    },
  };
}

function revealDeletedMilestone(
  nav: Extract<DiffNavTarget, { kind: "deleteMilestone" }>,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  if (ctx.hiddenMilestoneGroupIds.has(nav.groupId)) {
    return { status: "blocked", message: "帯の線がオフ" };
  }
  const bandVisible = ctx.milestones.some(
    (milestone) => milestone.groupId === nav.groupId,
  );
  if (!bandVisible) {
    return { status: "blocked", message: "画面には無い" };
  }
  return {
    status: "ok",
    reveal: {
      kind: "milestone",
      milestoneId: nav.milestoneId,
      scrollXDate: parseDate(nav.date),
    },
    mark: {
      sidebar: null,
      chartMilestoneId: null,
      milestoneGroupId: nav.groupId,
      title: false,
    },
  };
}

function revealMilestoneGroup(
  milestoneGroupId: ScheduleId,
  ctx: DiffNavigationContext,
): DiffNavigationOutcome {
  if (ctx.hiddenMilestoneGroupIds.has(milestoneGroupId)) {
    return { status: "blocked", message: "帯の線がオフ" };
  }
  const exists = ctx.milestones.some(
    (milestone) => milestone.groupId === milestoneGroupId,
  );
  if (!exists) {
    return { status: "blocked", message: "画面には無い" };
  }
  return {
    status: "ok",
    reveal: {
      kind: "milestoneGroup",
      milestoneGroupId,
    },
    mark: {
      sidebar: null,
      chartMilestoneId: null,
      milestoneGroupId,
      title: false,
    },
  };
}

function scrollYForRow(rowY: number, ctx: DiffNavigationContext): number {
  return scrollYToShowSelectedTask(
    ctx.visibleRows,
    rowY,
    ctx.rowHeight,
    ctx.bodyHeight,
    ctx.scrollY,
  );
}

export function emptyDiffNavigationMark(): DiffNavigationMark {
  return {
    sidebar: null,
    chartMilestoneId: null,
    milestoneGroupId: null,
    title: false,
  };
}
