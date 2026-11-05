import { addDays, daysBetween, isoDate, parseDate } from "../model/dates";
import type { Category, Milestone, Task } from "../model/types";

/** 同梱サンプルの日付と進み具合が揃っている参照日（暦日）。 */
export const SAMPLE_REFERENCE_TODAY = "2026-10-10";

function shiftIsoDate(iso: string, deltaDays: number): string {
  if (deltaDays === 0) return iso;
  return isoDate(addDays(parseDate(iso), deltaDays));
}

function cloneTask(task: Task): Task {
  return {
    ...task,
    assigneeIds: [...task.assigneeIds],
    predecessors: [...task.predecessors],
    tags: task.tags ? [...task.tags] : undefined,
    todos: task.todos ? task.todos.map((t) => ({ ...t })) : undefined,
  };
}

function cloneCategories(categories: Category[]): Category[] {
  return categories.map((category) => ({
    ...category,
    groups: category.groups.map((group) => ({
      ...group,
      tasks: group.tasks.map(cloneTask),
    })),
  }));
}

function cloneMilestones(milestones: Milestone[]): Milestone[] {
  return milestones.map((m) => ({ ...m }));
}

function reconcileTask(template: Task, shifted: Task): Task {
  return {
    ...shifted,
    status: template.status,
    progress: template.progress,
  };
}

export function anchorSampleSchedule(
  templateCategories: Category[],
  templateMilestones: Milestone[],
  openToday: string,
): { categories: Category[]; milestones: Milestone[] } {
  const deltaDays = daysBetween(
    parseDate(SAMPLE_REFERENCE_TODAY),
    parseDate(openToday),
  );
  const templates = cloneCategories(templateCategories);
  const categories = cloneCategories(templateCategories);
  const milestones = cloneMilestones(templateMilestones).map((m) => ({
    ...m,
    date: shiftIsoDate(m.date, deltaDays),
  }));

  const shifted = categories.map((category, ci) => ({
    ...category,
    groups: category.groups.map((group, gi) => ({
      ...group,
      tasks: group.tasks.map((task, ti) => {
        const template =
          templates[ci]?.groups[gi]?.tasks[ti] ?? task;
        const moved = {
          ...task,
          start: shiftIsoDate(task.start, deltaDays),
          end: shiftIsoDate(task.end, deltaDays),
        };
        return reconcileTask(template, moved);
      }),
    })),
  }));

  return { categories: shifted, milestones };
}
