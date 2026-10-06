import { normalizeTaskNote } from "./taskNote";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  ScheduleDocument,
  Task,
} from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

function taskToJson(task: Task): Task {
  const note = normalizeTaskNote(task.note);
  const base = {
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    assigneeId: task.assigneeId,
    status: task.status,
    progress: task.progress,
    confidence: task.confidence,
    predecessors: [...task.predecessors],
    milestoneId: task.milestoneId,
  };
  return note !== undefined ? { ...base, note } : base;
}

export function scheduleToJson(
  title: string,
  categories: Category[],
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title,
    milestoneGroups: milestoneGroups.map((group) => ({
      id: group.id,
      name: group.name,
    })),
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      date: milestone.date,
      confidence: milestone.confidence,
      groupId: milestone.groupId,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      groups: category.groups.map((group) => ({
        id: group.id,
        name: group.name,
        tasks: group.tasks.map((task) => taskToJson(task)),
      })),
    })),
  };
}
