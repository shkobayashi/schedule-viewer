import { isIsoDateString } from "./dates";
import type { Category, ScheduleId, Task } from "./types";

export function createScheduleId(): ScheduleId {
  return crypto.randomUUID();
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
  let place: { category: string; group: string } | null = null;
  forEachTask(categories, (task, at) => {
    if (task.id === taskId) place = at;
  });
  return place;
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
  if (input.end <= input.start) return "期間は1日以上にしてください";
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

/** タスクを消し、他タスクの先行からそのIDを外す。空になったグループとカテゴリも外す。 */
export function removeTask(categories: Category[], taskId: ScheduleId): Category[] {
  return cloneCategories(categories)
    .map((category) => ({
      ...category,
      groups: category.groups
        .map((group) => ({
          ...group,
          tasks: group.tasks
            .filter((task) => task.id !== taskId)
            .map((task) => ({
              ...task,
              predecessors: task.predecessors.filter((id) => id !== taskId),
            })),
        }))
        .filter((group) => group.tasks.length > 0),
    }))
    .filter((category) => category.groups.length > 0);
}

export function cloneCategories(categories: Category[]): Category[] {
  return categories.map((category) => ({
    name: category.name,
    groups: category.groups.map((group) => ({
      name: group.name,
      tasks: group.tasks.map((task) => ({
        ...task,
        predecessors: [...task.predecessors],
      })),
    })),
  }));
}
