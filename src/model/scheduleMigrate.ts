import { addDays, isoDate, isIsoDateString, parseDate } from "./dates";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

type RawDoc = Record<string, unknown>;

function migrateTaskEndV1ToV2(end: string): string {
  if (!isIsoDateString(end)) return end;
  return isoDate(addDays(parseDate(end), -1));
}

/** v1（終了日は含まない境界）を v2（終了日を含む）に変換する。 */
export function migrateScheduleToV2(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }
  const doc = data as RawDoc;
  if (doc.schemaVersion !== 1) return data;

  const categories = doc.categories;
  if (!Array.isArray(categories)) return data;

  const nextCategories = categories.map((category) => {
    if (category == null || typeof category !== "object" || Array.isArray(category)) {
      return category;
    }
    const cat = category as RawDoc;
    const groups = cat.groups;
    if (!Array.isArray(groups)) return category;
    const nextGroups = groups.map((group) => {
      if (group == null || typeof group !== "object" || Array.isArray(group)) {
        return group;
      }
      const grp = group as RawDoc;
      const tasks = grp.tasks;
      if (!Array.isArray(tasks)) return group;
      const nextTasks = tasks.map((task) => {
        if (task == null || typeof task !== "object" || Array.isArray(task)) {
          return task;
        }
        const t = task as RawDoc;
        if (typeof t.end !== "string") return task;
        return { ...t, end: migrateTaskEndV1ToV2(t.end) };
      });
      return { ...grp, tasks: nextTasks };
    });
    return { ...cat, groups: nextGroups };
  });

  return {
    ...doc,
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    categories: nextCategories,
  };
}
