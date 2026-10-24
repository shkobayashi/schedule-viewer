import type { Category, Task, TaskGroup } from "./types";

/** 集計用の1タスクの進捗。完了は 100、それ以外は進捗欄の数字。 */
export function taskProgressForRollup(task: Task): number {
  if (task.status === "done") return 100;
  return task.progress;
}

/** タスクを同じ重さで平均し、四捨五入した整数。0 件なら null。 */
export function averageTaskProgress(tasks: readonly Task[]): number | null {
  if (tasks.length === 0) return null;
  const sum = tasks.reduce((acc, task) => acc + taskProgressForRollup(task), 0);
  return Math.round(sum / tasks.length);
}

export function groupRollupPercent(group: TaskGroup): number | null {
  return averageTaskProgress(group.tasks);
}

export function categoryRollupPercent(category: Category): number | null {
  const tasks = category.groups.flatMap((group) => group.tasks);
  return averageTaskProgress(tasks);
}
