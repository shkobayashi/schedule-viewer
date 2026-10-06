import { addDays, isoDate, isIsoDateString, parseDate } from "./dates";
import { HIERARCHY_ID_NAMESPACE, uuidV5 } from "./uuidV5";

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
    schemaVersion: 2,
    categories: nextCategories,
  };
}

function withCommittedConfidence(task: unknown): unknown {
  if (task == null || typeof task !== "object" || Array.isArray(task)) {
    return task;
  }
  const t = task as RawDoc;
  if ("confidence" in t) return task;
  return { ...t, confidence: "committed" };
}

/**
 * schemaVersion 3 を 4 にする。確度が無いタスクは committed として読む。
 * 既にある confidence はそのまま残し、あとからスキーマで検証する。
 */
export function migrateScheduleV3ToV4(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }
  const doc = data as RawDoc;
  if (doc.schemaVersion !== 3) return data;

  const categories = doc.categories;
  if (!Array.isArray(categories)) {
    return { ...doc, schemaVersion: 4 };
  }

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
      return { ...grp, tasks: tasks.map(withCommittedConfidence) };
    });
    return { ...cat, groups: nextGroups };
  });

  return {
    ...doc,
    schemaVersion: 4,
    categories: nextCategories,
  };
}

function isRecord(value: unknown): value is RawDoc {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function collectLeafIds(doc: RawDoc): Set<string> {
  const used = new Set<string>();
  if (Array.isArray(doc.milestoneGroups)) {
    for (const group of doc.milestoneGroups) {
      if (isRecord(group) && typeof group.id === "string") {
        used.add(group.id);
      }
    }
  }
  if (Array.isArray(doc.milestones)) {
    for (const milestone of doc.milestones) {
      if (isRecord(milestone) && typeof milestone.id === "string") {
        used.add(milestone.id);
      }
    }
  }
  if (!Array.isArray(doc.categories)) return used;
  for (const category of doc.categories) {
    if (!isRecord(category) || !Array.isArray(category.groups)) continue;
    for (const group of category.groups) {
      if (!isRecord(group) || !Array.isArray(group.tasks)) continue;
      for (const task of group.tasks) {
        if (isRecord(task) && typeof task.id === "string") used.add(task.id);
      }
    }
  }
  return used;
}

/** マイルストングループの ID を決めるとき、意味規則が重複を禁じる ID をすべて避ける。 */
function collectUsedIds(doc: RawDoc): Set<string> {
  const used = collectLeafIds(doc);
  if (!Array.isArray(doc.categories)) return used;
  for (const category of doc.categories) {
    if (!isRecord(category)) continue;
    if (typeof category.id === "string") used.add(category.id);
    if (!Array.isArray(category.groups)) continue;
    for (const group of category.groups) {
      if (isRecord(group) && typeof group.id === "string") used.add(group.id);
    }
  }
  return used;
}

function takeHierarchyId(used: Set<string>, seed: string): string {
  let id = uuidV5(HIERARCHY_ID_NAMESPACE, seed);
  let n = 2;
  while (used.has(id)) {
    id = uuidV5(HIERARCHY_ID_NAMESPACE, `${seed}\0${n}`);
    n += 1;
    if (n > 1000) {
      throw new Error("カテゴリ ID を割り当てられませんでした");
    }
  }
  used.add(id);
  return id;
}

/**
 * schemaVersion 4 を 5 にする。カテゴリとグループへ、名前から決まる ID を付ける。
 * 同じ内容を開き直しても ID は変わらない。既にあるタスクやマイルストンの ID と
 * ぶつかったときだけ、別の ID にする。
 */
export function migrateScheduleV4ToV5(data: unknown): unknown {
  if (!isRecord(data) || data.schemaVersion !== 4) return data;
  const used = collectLeafIds(data);
  const categories = data.categories;
  if (!Array.isArray(categories)) {
    return { ...data, schemaVersion: 5 };
  }

  const nextCategories = categories.map((category) => {
    if (!isRecord(category)) return category;
    const categoryName = typeof category.name === "string" ? category.name : "";
    const id = takeHierarchyId(used, `category\0${categoryName}`);
    const groups = category.groups;
    if (!Array.isArray(groups)) return { ...category, id };
    const nextGroups = groups.map((group) => {
      if (!isRecord(group)) return group;
      const groupName = typeof group.name === "string" ? group.name : "";
      const groupId = takeHierarchyId(
        used,
        `group\0${categoryName}\0${groupName}`,
      );
      return { ...group, id: groupId };
    });
    return { ...category, id, groups: nextGroups };
  });

  return {
    ...data,
    schemaVersion: 5,
    categories: nextCategories,
  };
}

/**
 * schemaVersion 5 のマイルストンに確度が無いときは committed として読む。
 * 既にある confidence はそのまま残し、あとからスキーマで検証する。
 */
export function fillMissingMilestoneConfidence(data: unknown): unknown {
  if (!isRecord(data) || data.schemaVersion !== 5 || !Array.isArray(data.milestones)) {
    return data;
  }
  let changed = false;
  const milestones = data.milestones.map((milestone) => {
    if (!isRecord(milestone) || "confidence" in milestone) return milestone;
    changed = true;
    return { ...milestone, confidence: "committed" };
  });
  return changed ? { ...data, milestones } : data;
}

const DEFAULT_MILESTONE_GROUP_NAME = "マイルストン";

/**
 * schemaVersion 5 を 6 にする。マイルストンがあるときは既定のマイルストングループを1つ足し、
 * 全部のマイルストンに groupId を付ける。
 */
export function migrateScheduleV5ToV6(data: unknown): unknown {
  if (!isRecord(data) || data.schemaVersion !== 5) return data;
  const milestones = data.milestones;
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return {
      ...data,
      schemaVersion: 6,
      milestoneGroups: [],
    };
  }
  const used = collectUsedIds(data);
  const groupId = takeHierarchyId(
    used,
    `milestoneGroup\0${DEFAULT_MILESTONE_GROUP_NAME}`,
  );
  const milestoneGroups = [{ id: groupId, name: DEFAULT_MILESTONE_GROUP_NAME }];
  const nextMilestones = milestones.map((milestone) => {
    if (!isRecord(milestone)) return milestone;
    if (typeof milestone.groupId === "string") return milestone;
    return { ...milestone, groupId };
  });
  return {
    ...data,
    schemaVersion: 6,
    milestoneGroups,
    milestones: nextMilestones,
  };
}
