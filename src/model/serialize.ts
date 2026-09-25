import { forEachTask } from "./tasks";
import type { Category, Milestone, ScheduleDocument } from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

export function collectAssignees(categories: Category[]): string[] {
  const names: string[] = [];
  forEachTask(categories, (task) => {
    const assignee = task.assignee.trim();
    if (assignee && !names.includes(assignee)) names.push(assignee);
  });
  return names;
}

export function scheduleToJson(
  title: string,
  categories: Category[],
  milestones: Milestone[],
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      date: milestone.date,
    })),
    categories: categories.map((category) => ({
      name: category.name,
      groups: category.groups.map((group) => ({
        name: group.name,
        tasks: group.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          start: task.start,
          end: task.end,
          assignee: task.assignee,
          status: task.status,
          progress: task.progress,
          predecessors: [...task.predecessors],
          milestoneId: task.milestoneId,
        })),
      })),
    })),
  };
}
