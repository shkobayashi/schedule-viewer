import { assigneeIdToJson, taskAssigneeIds } from "./assigneeIds";
import { documentHasLevels } from "./hierarchy";
import { normalizeLevelDefinition } from "./hierarchyLevelEdit";
import { taskFieldValuesForSerialization } from "./taskFields";
import { normalizeTaskNote } from "./taskNote";
import { normalizeTaskTags } from "./taskTags";
import { normalizeTaskTodos, progressFromTodoItems } from "./taskTodos";
import type {
  Category,
  Milestone,
  MilestoneGroup,
  OutlineRoot,
  ScheduleDocument,
  ScheduleFieldDef,
  ScheduleLevelDef,
  Task,
} from "./types";
import { SCHEDULE_SCHEMA_VERSION } from "./types";

function taskToJson(
  task: Task,
  fields: readonly ScheduleFieldDef[] | undefined,
): Task {
  const note = normalizeTaskNote(task.note);
  const tags = normalizeTaskTags(task.tags);
  const todos = normalizeTaskTodos(task.todos);
  const progress =
    todos !== undefined ? progressFromTodoItems(todos) : task.progress;
  const base = {
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    assigneeIds: [...taskAssigneeIds(task)],
    status: task.status,
    ...(task.colorId != null ? { colorId: task.colorId } : {}),
    progress,
    confidence: task.confidence,
    predecessors: [...task.predecessors],
    milestoneId: task.milestoneId,
  };
  const withTodos = todos !== undefined ? { ...base, todos } : base;
  const withTags = tags !== undefined ? { ...withTodos, tags } : withTodos;
  const fieldValues = taskFieldValuesForSerialization(task, fields);
  const withFields =
    fieldValues !== undefined ? { ...withTags, fieldValues } : withTags;
  return note !== undefined ? { ...withFields, note } : withFields;
}

function outlineToJson(
  nodes: OutlineRoot,
  fields: readonly ScheduleFieldDef[] | undefined,
): OutlineRoot {
  return nodes.map((node) => {
    if ("start" in node && "end" in node) {
      return taskToJson(node, fields);
    }
    return {
      id: node.id,
      name: node.name,
      children: outlineToJson(node.children, fields),
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
  fieldDefsForValues?: ScheduleFieldDef[] | null,
): ScheduleDocument {
  const valueFieldDefs =
    fieldDefsForValues != null && fieldDefsForValues.length > 0
      ? fieldDefsForValues
      : undefined;
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
          tasks: group.tasks.map((task) => taskToJson(task, valueFieldDefs)),
        })),
      })),
    };
  }

  const levelDefs = levels.map((level) => normalizeLevelDefinition(level));

  if (outline != null && outline.length > 0) {
    return {
      ...base,
      levels: levelDefs,
      outline: outlineToJson(outline, valueFieldDefs),
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
    undefined,
  );
}

export function documentToJsonString(doc: ScheduleDocument): string {
  const json = documentToJson(doc);
  const ordered = orderScheduleKeys(json);
  return JSON.stringify(ordered, null, 2);
}

function orderTaskFieldValues(
  fieldValues: Task["fieldValues"],
  fields: ScheduleFieldDef[] | undefined,
): Record<string, string | number> | undefined {
  if (fieldValues == null) return undefined;
  const knownKeys = new Set((fields ?? []).map((field) => field.key));
  const ordered: Record<string, string | number> = {};
  if (fields != null) {
    for (const field of fields) {
      const value = fieldValues[field.key];
      if (value !== undefined) {
        ordered[field.key] = value;
      }
    }
  }
  for (const [key, value] of Object.entries(fieldValues)) {
    if (knownKeys.has(key)) continue;
    ordered[key] = value;
  }
  return Object.keys(ordered).length > 0 ? ordered : undefined;
}

function orderTaskJson(
  task: Task,
  fields: ScheduleFieldDef[] | undefined,
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {
    id: task.id,
    name: task.name,
    start: task.start,
    end: task.end,
    assigneeId: assigneeIdToJson(taskAssigneeIds(task)),
    status: task.status,
  };
  if (task.colorId != null) {
    ordered.colorId = task.colorId;
  }
  Object.assign(ordered, {
    progress: task.progress,
    confidence: task.confidence,
    predecessors: task.predecessors,
    milestoneId: task.milestoneId,
  });
  if (task.todos != null && task.todos.length > 0) {
    ordered.todos = task.todos;
  }
  if (task.tags != null && task.tags.length > 0) {
    ordered.tags = task.tags;
  }
  const fieldValues = orderTaskFieldValues(task.fieldValues, fields);
  if (fieldValues != null) {
    ordered.fieldValues = fieldValues;
  }
  if (task.note != null) {
    ordered.note = task.note;
  }
  return ordered;
}

function orderOutlineJson(
  nodes: OutlineRoot,
  fields: ScheduleFieldDef[] | undefined,
): unknown[] {
  return nodes.map((node) => {
    if ("start" in node && "end" in node) {
      return orderTaskJson(node, fields);
    }
    return {
      id: node.id,
      name: node.name,
      children: orderOutlineJson(node.children, fields),
    };
  });
}

function orderScheduleKeys(
  doc: ScheduleDocument,
  fieldDefsForValues?: ScheduleFieldDef[],
): Record<string, unknown> {
  const fields = fieldDefsForValues;
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
    result.categories = doc.categories.map((category) => ({
      id: category.id,
      name: category.name,
      groups: category.groups.map((group) => ({
        id: group.id,
        name: group.name,
        tasks: group.tasks.map((task) => orderTaskJson(task, fields)),
      })),
    }));
  } else if (doc.outline != null && doc.outline.length > 0) {
    result.outline = orderOutlineJson(doc.outline, fields);
  }
  return result;
}
