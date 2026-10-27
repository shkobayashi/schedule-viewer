import { isTaskNode } from "./hierarchy";
import type {
  Category,
  OutlineChild,
  OutlineRoot,
  ScheduleDocument,
  ScheduleId,
  Task,
  TaskTodoItem,
} from "./types";
import { mapAllTasksInOutline } from "./outlineTasks";
import { mapTasks } from "./tasks";

/** 済んだ件数を全体で割り、切り捨てた整数。全部済んだときだけ 100。 */
export function progressFromTodoItems(
  items: readonly TaskTodoItem[],
): number {
  if (items.length === 0) return 0;
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return 100;
  return Math.floor((done / items.length) * 100);
}

export function hasTaskTodos(task: { todos?: TaskTodoItem[] }): boolean {
  return task.todos != null && task.todos.length > 0;
}

export function taskTodoCountLabel(task: Task): string | null {
  if (!hasTaskTodos(task)) return null;
  const total = task.todos!.length;
  const done = task.todos!.filter((item) => item.done).length;
  return `${done}/${total}`;
}

/** 保存用に項目を整形する。空なら undefined（キーを省く）。 */
export function normalizeTaskTodos(
  items: TaskTodoItem[] | undefined,
): TaskTodoItem[] | undefined {
  if (items == null || items.length === 0) return undefined;
  const result: TaskTodoItem[] = [];
  for (const item of items) {
    const text = item.text.trim();
    if (text.length === 0) continue;
    if (/[\r\n]/.test(item.text)) continue;
    result.push({ text, done: item.done });
  }
  return result.length > 0 ? result : undefined;
}

export function normalizeTaskWithTodos<T extends Task>(task: T): T {
  const todos = normalizeTaskTodos(task.todos);
  if (todos === undefined) {
    if (task.todos === undefined) return task;
    const next = { ...task };
    delete next.todos;
    return next;
  }
  const progress = progressFromTodoItems(todos);
  if (task.todos === todos && task.progress === progress) return task;
  return { ...task, todos, progress };
}

export function resolveTaskEditProgress(
  task: Task,
  patchProgress: number,
): number {
  if (hasTaskTodos(task)) {
    return progressFromTodoItems(task.todos!);
  }
  return Math.min(100, Math.max(0, Math.round(patchProgress)));
}

export function applyTaskTodosToTask(
  task: Task,
  items: TaskTodoItem[],
): Task {
  const normalized = normalizeTaskTodos(items);
  if (normalized === undefined) {
    const next = { ...task };
    delete next.todos;
    return next;
  }
  return {
    ...task,
    todos: normalized,
    progress: progressFromTodoItems(normalized),
  };
}

export function setTaskTodosOnCategories(
  categories: Category[],
  taskId: ScheduleId,
  items: TaskTodoItem[],
): Category[] {
  return mapTasks(categories, (task) => {
    if (task.id !== taskId) return task;
    return applyTaskTodosToTask(task, items);
  });
}

export function setTaskTodosInOutline(
  outline: OutlineRoot,
  taskId: ScheduleId,
  items: TaskTodoItem[],
): OutlineRoot {
  return mapAllTasksInOutline(outline, (task) => {
    if (task.id !== taskId) return task;
    return applyTaskTodosToTask(task, items);
  });
}

export function formatTaskTodosForDiff(task: Task): string {
  if (!hasTaskTodos(task)) return "（なし）";
  return task
    .todos!.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`)
    .join(" / ");
}

export function taskTodosEqualForDiff(a: Task, b: Task): boolean {
  const at = normalizeTaskTodos(a.todos);
  const bt = normalizeTaskTodos(b.todos);
  if (at === undefined && bt === undefined) return true;
  if (at === undefined || bt === undefined) return false;
  if (at.length !== bt.length) return false;
  return at.every(
    (item, index) =>
      item.text === bt[index].text && item.done === bt[index].done,
  );
}

export function formatTaskTodosForExcel(task: Task): string {
  if (!hasTaskTodos(task)) return "";
  return task.todos!.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`).join("\n");
}

function normalizeOutlineNode(node: OutlineChild): OutlineChild {
  if (isTaskNode(node)) return normalizeTaskWithTodos(node);
  return {
    ...node,
    children: node.children.map((child) => normalizeOutlineNode(child)),
  };
}

export function normalizeScheduleDocument(
  doc: ScheduleDocument,
): ScheduleDocument {
  const categories = doc.categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map((task) => normalizeTaskWithTodos(task)),
    })),
  }));
  const outline =
    doc.outline != null
      ? doc.outline.map((node) => normalizeOutlineNode(node))
      : doc.outline;
  return { ...doc, categories, outline };
}
