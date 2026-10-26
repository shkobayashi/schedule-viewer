import { documentHasLevels } from "./hierarchy";
import { normalizeLevelDefinition } from "./hierarchyLevelEdit";
import { normalizeTaskNote } from "./taskNote";
import { normalizeTaskTags } from "./taskTags";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleDocument,
  ScheduleLevelDef,
  Task,
} from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

function taskToJson(task: Task): Task {
  const note = normalizeTaskNote(task.note);
  const tags = normalizeTaskTags(task.tags);
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
  const withTags = tags !== undefined ? { ...base, tags } : base;
  return note !== undefined ? { ...withTags, note } : withTags;
}

function outlineToJson(nodes: OutlineRoot): OutlineRoot {
  return nodes.map((node) => {
    if ("start" in node && "end" in node) {
      return taskToJson(node);
    }
    return {
      id: node.id,
      name: node.name,
      children: outlineToJson(node.children),
    };
  });
}

export function scheduleToJson(
  title: string,
  categories: Category[],
  milestoneGroups: MilestoneGroup[],
  milestones: Milestone[],
  levels?: ScheduleLevelDef[] | null,
  outline?: OutlineRoot | null,
): ScheduleDocument {
  const base: ScheduleDocument = {
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
    categories: [],
  };

  const hasLevels = levels != null && levels.length > 0;
  if (!hasLevels) {
    return {
      ...base,
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

  const levelDefs = levels.map((level) => normalizeLevelDefinition(level));

  if (outline != null && outline.length > 0) {
    return {
      ...base,
      levels: levelDefs,
      outline: outlineToJson(outline),
    };
  }

  return {
    ...base,
    levels: levelDefs,
  };
}

export function documentToJson(
  doc: ScheduleDocument | import("./history").DocumentSnapshot,
): ScheduleDocument {
  return scheduleToJson(
    doc.title,
    doc.categories,
    doc.milestoneGroups,
    doc.milestones,
    doc.levels,
    doc.outline,
  );
}

export function documentToJsonString(doc: ScheduleDocument): string {
  const json = documentToJson(doc);
  const ordered = orderScheduleKeys(json);
  return JSON.stringify(ordered, null, 2);
}

function orderScheduleKeys(doc: ScheduleDocument): Record<string, unknown> {
  const result: Record<string, unknown> = {
    schemaVersion: doc.schemaVersion,
    title: doc.title,
    milestoneGroups: doc.milestoneGroups,
    milestones: doc.milestones,
  };
  if (documentHasLevels(doc)) {
    result.levels = doc.levels;
  }
  if (!documentHasLevels(doc)) {
    result.categories = doc.categories;
  } else if (doc.outline != null && doc.outline.length > 0) {
    result.outline = doc.outline;
  }
  return result;
}
