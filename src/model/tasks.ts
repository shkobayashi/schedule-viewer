import type { Category, Task } from "./types";

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
