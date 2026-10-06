import type { ScheduleId, VisibleRow } from "./types";

export function visibleTaskIds(rows: readonly VisibleRow[]): ScheduleId[] {
  const ids: ScheduleId[] = [];
  for (const row of rows) {
    if (row.type === "task") ids.push(row.task.id);
  }
  return ids;
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
