import type { Category, ScheduleId, VisibleRow } from "./types";
import { findTaskInDocument } from "./hierarchy";
import type { OutlineRoot } from "./types";

export type TaskSelectionState = {
  ids: readonly ScheduleId[];
  anchorId: ScheduleId | null;
  activeId: ScheduleId | null;
};

export function emptyTaskSelection(): TaskSelectionState {
  return { ids: [], anchorId: null, activeId: null };
}

export function singleTaskSelection(id: ScheduleId): TaskSelectionState {
  return { ids: [id], anchorId: id, activeId: id };
}

export function visibleTaskIds(rows: readonly VisibleRow[]): ScheduleId[] {
  const ids: ScheduleId[] = [];
  for (const row of rows) {
    if (row.type === "task") ids.push(row.task.id);
  }
  return ids;
}

export function primarySelectedTaskId(
  state: TaskSelectionState,
): ScheduleId | null {
  return state.ids.length === 1 ? state.ids[0]! : null;
}

export function isTaskSelected(
  state: TaskSelectionState,
  taskId: ScheduleId,
): boolean {
  return state.ids.includes(taskId);
}

export function rangeBetweenVisible(
  visibleIds: readonly ScheduleId[],
  fromId: ScheduleId,
  toId: ScheduleId,
): ScheduleId[] {
  const fromIndex = visibleIds.indexOf(fromId);
  const toIndex = visibleIds.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return [toId];
  const lo = Math.min(fromIndex, toIndex);
  const hi = Math.max(fromIndex, toIndex);
  return visibleIds.slice(lo, hi + 1);
}

function toggleInVisibleOrder(
  visibleIds: readonly ScheduleId[],
  current: readonly ScheduleId[],
  id: ScheduleId,
): ScheduleId[] {
  if (current.includes(id)) {
    return current.filter((item) => item !== id);
  }
  const next = new Set(current);
  next.add(id);
  return visibleIds.filter((vid) => next.has(vid));
}

export type TaskClickModifiers = {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
};

/** Mac では Ctrl+クリックは右クリックのため、トグルは ⌘ のみ。 */
export function isSelectionToggleModifier(
  mod: TaskClickModifiers,
  commandKey: boolean,
): boolean {
  if (commandKey) return mod.metaKey;
  return mod.metaKey || mod.ctrlKey;
}

export function selectTaskClick(
  visibleIds: readonly ScheduleId[],
  state: TaskSelectionState,
  taskId: ScheduleId,
  mod: TaskClickModifiers,
  commandKey: boolean,
): TaskSelectionState {
  if (mod.shiftKey) {
    const anchor =
      state.anchorId ??
      state.activeId ??
      (state.ids.length > 0 ? state.ids[state.ids.length - 1]! : null);
    if (anchor == null) return singleTaskSelection(taskId);
    const ids = rangeBetweenVisible(visibleIds, anchor, taskId);
    return { ids, anchorId: anchor, activeId: taskId };
  }
  if (isSelectionToggleModifier(mod, commandKey)) {
    const ids = toggleInVisibleOrder(visibleIds, state.ids, taskId);
    if (ids.length === 0) return emptyTaskSelection();
    return { ids, anchorId: taskId, activeId: taskId };
  }
  return singleTaskSelection(taskId);
}

export function selectTaskContextMenu(
  state: TaskSelectionState,
  taskId: ScheduleId,
): TaskSelectionState {
  if (state.ids.includes(taskId)) return state;
  return singleTaskSelection(taskId);
}

export function adjacentVisibleTaskId(
  rows: readonly VisibleRow[],
  current: ScheduleId | null,
  direction: "prev" | "next",
): ScheduleId | null {
  const ids = visibleTaskIds(rows);
  if (ids.length === 0) return null;
  if (current == null) {
    return direction === "next" ? ids[0]! : ids[ids.length - 1]!;
  }
  const index = ids.indexOf(current);
  if (index < 0) {
    return direction === "next" ? ids[0]! : ids[ids.length - 1]!;
  }
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  if (nextIndex < 0 || nextIndex >= ids.length) return ids[index]!;
  return ids[nextIndex]!;
}

export function moveSelectionByArrow(
  visibleIds: readonly VisibleRow[],
  state: TaskSelectionState,
  direction: "prev" | "next",
): TaskSelectionState {
  const current =
    state.activeId ??
    (state.ids.length === 1 ? state.ids[0]! : null);
  const next = adjacentVisibleTaskId(visibleIds, current, direction);
  if (next == null) return state;
  return singleTaskSelection(next);
}

export function extendSelectionByArrow(
  visibleIds: readonly VisibleRow[],
  state: TaskSelectionState,
  direction: "prev" | "next",
): TaskSelectionState {
  const anchor =
    state.anchorId ??
    state.activeId ??
    (state.ids.length > 0 ? state.ids[0]! : null);
  const active =
    state.activeId ??
    (state.ids.length > 0 ? state.ids[state.ids.length - 1]! : null);
  if (anchor == null || active == null) return state;
  const nextActive = adjacentVisibleTaskId(visibleIds, active, direction);
  if (nextActive == null || nextActive === active) return state;
  const ids = rangeBetweenVisible(visibleTaskIds(visibleIds), anchor, nextActive);
  return { ids, anchorId: anchor, activeId: nextActive };
}

export function pruneTaskSelection(
  categories: Category[],
  outline: OutlineRoot | undefined,
  state: TaskSelectionState,
): TaskSelectionState {
  const ids = state.ids.filter(
    (id) => findTaskInDocument(categories, outline, id) != null,
  );
  if (
    ids.length === state.ids.length &&
    (state.anchorId == null || ids.includes(state.anchorId)) &&
    (state.activeId == null || ids.includes(state.activeId))
  ) {
    return state;
  }
  const anchorId =
    state.anchorId != null && ids.includes(state.anchorId)
      ? state.anchorId
      : ids.length > 0
        ? ids[0]!
        : null;
  const activeId =
    state.activeId != null && ids.includes(state.activeId)
      ? state.activeId
      : ids.length > 0
        ? ids[ids.length - 1]!
        : null;
  return { ids, anchorId, activeId };
}

export function removeDeletedTasksFromSelection(
  state: TaskSelectionState,
  deletedIds: ReadonlySet<ScheduleId>,
): TaskSelectionState {
  const ids = state.ids.filter((id) => !deletedIds.has(id));
  if (ids.length === state.ids.length) return state;
  const anchorId =
    state.anchorId != null && ids.includes(state.anchorId)
      ? state.anchorId
      : ids.length > 0
        ? ids[0]!
        : null;
  const activeId =
    state.activeId != null && ids.includes(state.activeId)
      ? state.activeId
      : ids.length > 0
        ? ids[ids.length - 1]!
        : null;
  return { ids, anchorId, activeId };
}
