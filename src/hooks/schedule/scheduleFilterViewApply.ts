import { collapsedSetFromIds } from "../../model/scheduleFilterPersistence";
import type { ScheduleId } from "../../model/types";

export function mergeFilterViewCollapsedSet(
  prev: ReadonlySet<string>,
  collapsedCategoryIds: ScheduleId[],
  collapsedGroupIds: ScheduleId[],
): ReadonlySet<string> {
  const next = collapsedSetFromIds(collapsedCategoryIds, collapsedGroupIds);
  for (const key of prev) {
    if (key.startsWith("hierarchy:")) {
      next.add(key);
    }
  }
  return next;
}
