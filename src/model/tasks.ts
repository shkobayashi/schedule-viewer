import { isIsoDateString } from "./dates";
import type { Category, Milestone, ScheduleId, Task } from "./types";

export function createScheduleId(): ScheduleId {
  return crypto.randomUUID();
}

export function collectScheduleIds(
  categories: Category[],
  milestones: Milestone[],
): Set<ScheduleId> {
  const ids = new Set<ScheduleId>();
  for (const category of categories) {
    ids.add(category.id);
    for (const group of category.groups) {
      ids.add(group.id);
    }
  }
  forEachTask(categories, (task) => {
    ids.add(task.id);
  });
  for (const milestone of milestones) {
    ids.add(milestone.id);
  }
  return ids;
}

export function uniqueScheduleId(
  taken: ReadonlySet<string>,
  createId: () => string = createScheduleId,
): ScheduleId {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const id = createId();
    if (!taken.has(id)) return id;
  }
  throw new Error("スケジュール ID を作れませんでした");
}

export function forEachTask(
  categories: Category[],
  visit: (task: Task, place: { category: string; group: string }) => void,
): void {
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        visit(task, { category: category.name, group: group.name });
      }
    }
  }
}

export function mapTasks(
  categories: Category[],
  update: (task: Task) => Task,
): Category[] {
  return categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map(update),
    })),
  }));
}

export function findTaskPlace(
  categories: Category[],
  taskId: ScheduleId,
): { category: string; group: string } | null {
  for (const category of categories) {
    for (const group of category.groups) {
      for (const task of group.tasks) {
        if (task.id === taskId) {
          return { category: category.name, group: group.name };
        }
      }
    }
  }
  return null;
}

export function validateNewTask(
  input: {
    name: string;
    start: string;
    end: string;
    category: string;
    group: string;
  },
  categories: Category[],
): string | null {
  if (!input.name.trim()) return "タスク名を入力してください";
  if (!isIsoDateString(input.start)) return "開始日を入力してください";
  if (!isIsoDateString(input.end)) return "終了日を入力してください";
  if (input.end < input.start) return "終了日は開始日以降にしてください";
  const category = categories.find((item) => item.name === input.category);
  if (!category) return "カテゴリを選択してください";
  if (!category.groups.some((item) => item.name === input.group)) {
    return "グループを選択してください";
  }
  return null;
}


/** 指定したカテゴリとグループの末尾に足す。置き場が無ければ変えない。 */
export function insertTask(
  categories: Category[],
  task: Task,
  place: { category: string; group: string },
): Category[] {
  const cloned = cloneCategories(categories);
  const category = cloned.find((item) => item.name === place.category);
  const group = category?.groups.find((item) => item.name === place.group);
  if (!group) return categories;
  group.tasks.push(task);
  return cloned;
}

/** タスクを消し、他タスクの先行からその ID を外す。空のグループとカテゴリは残す。 */
export function removeTask(categories: Category[], taskId: ScheduleId): Category[] {
  return cloneCategories(categories).map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks
        .filter((task) => task.id !== taskId)
        .map((task) => ({
          ...task,
          predecessors: task.predecessors.filter((id) => id !== taskId),
        })),
    })),
  }));
}

export function validateTaskEdit(
  input: {
    name: string;
    start: string;
    end: string;
    progress: number;
  },
): string | null {
  if (!input.name.trim()) return "タスク名を入力してください";
  if (!isIsoDateString(input.start)) return "開始日を入力してください";
  if (!isIsoDateString(input.end)) return "終了日を入力してください";
  if (input.end < input.start) return "終了日は開始日以降にしてください";
  if (
    !Number.isInteger(input.progress) ||
    input.progress < 0 ||
    input.progress > 100
  ) {
    return "進捗率は 0〜100 の整数にしてください";
  }
  return null;
}

export function cloneCategories(categories: Category[]): Category[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    groups: category.groups.map((group) => ({
      id: group.id,
      name: group.name,
      tasks: group.tasks.map((task) => ({
        ...task,
        predecessors: [...task.predecessors],
      })),
    })),
  }));
}

export type HierarchyRenameResult = {
  categories: Category[];
  error: string | null;
  changed: boolean;
};

/** 空白だけなら変えない。重複する名前は保存しない。 */
export function renameCategory(
  categories: Category[],
  categoryId: ScheduleId,
  rawName: string,
): HierarchyRenameResult {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) {
    return { categories, error: "カテゴリが見つかりません", changed: false };
  }
  const name = rawName.trim();
  if (!name || name === category.name) {
    return { categories, error: null, changed: false };
  }
  if (categories.some((item) => item.id !== categoryId && item.name === name)) {
    return { categories, error: "カテゴリ名が重複しています", changed: false };
  }
  return {
    categories: categories.map((item) =>
      item.id === categoryId ? { ...item, name } : item,
    ),
    error: null,
    changed: true,
  };
}

/** 空白だけなら変えない。同じカテゴリ内の重複は保存しない。 */
export function renameGroup(
  categories: Category[],
  groupId: ScheduleId,
  rawName: string,
): HierarchyRenameResult {
  const parent = categories.find((category) =>
    category.groups.some((group) => group.id === groupId),
  );
  const group = parent?.groups.find((item) => item.id === groupId);
  if (!parent || !group) {
    return { categories, error: "グループが見つかりません", changed: false };
  }
  const name = rawName.trim();
  if (!name || name === group.name) {
    return { categories, error: null, changed: false };
  }
  if (parent.groups.some((item) => item.id !== groupId && item.name === name)) {
    return {
      categories,
      error: "同じカテゴリ内でグループ名が重複しています",
      changed: false,
    };
  }
  return {
    categories: categories.map((category) =>
      category.id !== parent.id
        ? category
        : {
            ...category,
            groups: category.groups.map((item) =>
              item.id === groupId ? { ...item, name } : item,
            ),
          },
    ),
    error: null,
    changed: true,
  };
}
