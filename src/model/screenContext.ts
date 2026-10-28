import type { SearchField } from "./scheduleFilterPersistence";
import { resolveAssigneeDisplay } from "./assigneeDisplay";
import {
  BUILTIN_STATUS_ITEMS,
  normalizeStatusItem,
  statusLabel,
  type StatusItem,
} from "./statusCatalog";
import type { Member, MemberId } from "./memberTypes";
import {
  collectTasksFromDocument,
  findTaskInDocument,
  taskHierarchyLabels,
} from "./hierarchy";
import { fieldFilterChipLabel, isFieldFilterActive } from "./fieldFilters";
import { mcpLevelsFromDocument, type McpLevelEntry } from "./hierarchyLevelEdit";
import {
  listTasksMatchingFilterInDocument,
  type FilteredTaskRef,
} from "./rows";
import { hasTaskTodos } from "./taskTodos";
import {
  NO_MILESTONE_FILTER,
  UNASSIGNED_FILTER,
  UNASSIGNED_LABEL,
  SCHEDULE_SCHEMA_VERSION,
  type Category,
  type ConfidenceFilter,
  type Milestone,
  type MilestoneGroup,
  type OutlineRoot,
  type OverdueFilter,
  type RelationFilter,
  type ScheduleDocument,
  type ScheduleFieldDef,
  type ScheduleFilters,
  type ScheduleId,
  type ScheduleLevelDef,
  type StatusFilter,
  type Task,
  type TaskFieldValues,
  type TaskTodoItem,
} from "./types";

export const MCP_SCREEN_CONTEXT_MAX_BYTES = 10 * 1024 * 1024;

export const MCP_TOOL_SCHEDULE_DIFF = "schedule_diff";
export const MCP_TOOL_BASELINE_DIFFS = "baseline_diffs";
export const MCP_TOOL_SELECTED_TASK = "selected_task";
export const MCP_TOOL_SELECTED_TASKS = "selected_tasks";
export const MCP_TOOL_FILTERED_TASKS = "filtered_tasks";
export const MCP_TOOL_CURRENT_SCHEDULE = "current_schedule";
export const MCP_TOOL_REPLACE_SCHEDULE = "replace_schedule";

export type ScreenContextTask = {
  id: ScheduleId;
  name: string;
  category: string;
  group: string;
  start: string;
  end: string;
  assigneeId: string | null;
  status: Task["status"];
  progress: number;
  confidence: Task["confidence"];
  predecessors: ScheduleId[];
  milestoneId: ScheduleId | null;
  todos?: TaskTodoItem[];
  note?: string;
  tags: string[];
  fieldValues?: TaskFieldValues;
};

export type McpActiveFilterCondition =
  | { type: "assignee"; id: string; name: string }
  | { type: "status"; value: StatusFilter; label: string }
  | { type: "confidence"; value: ConfidenceFilter; label: string }
  | { type: "overdue"; value: OverdueFilter; label: string }
  | { type: "relation"; value: RelationFilter; label: string }
  | { type: "milestone"; id: string; name: string }
  | { type: "tags"; tags: string[] }
  | { type: "milestoneBandHidden"; groups: Array<{ id: ScheduleId; name: string }> }
  | { type: "searchName"; query: string }
  | { type: "searchNote"; query: string }
  | { type: "fieldFilter"; key: string; label: string }
  | { type: "lineage"; taskId: ScheduleId; taskName: string };

/** タスクの `status` が書く `id` の意味。LLM が `id` を選ぶ手がかり。 */
export type McpStatusEntry = {
  id: string;
  name: string;
  role: StatusItem["role"];
  description: string;
  instruction?: string;
};

/** タスクの `fieldValues` のキーと型。LLM が値を書く手がかり。 */
export type McpFieldEntry = {
  key: string;
  name: string;
  type: ScheduleFieldDef["type"];
  meaning?: string;
  instruction?: string;
  required?: true;
  percent?: true;
  choices?: string[];
  default?: string | number;
};

export function fieldEntriesForMcp(
  fields: readonly ScheduleFieldDef[],
): McpFieldEntry[] {
  return fields.map((field) => {
    const entry: McpFieldEntry = {
      key: field.key,
      name: field.name,
      type: field.type,
    };
    const meaning = field.meaning?.trim();
    const instruction = field.instruction?.trim();
    if (meaning) entry.meaning = meaning;
    if (instruction) entry.instruction = instruction;
    if (field.required === true) entry.required = true;
    if (field.percent === true) entry.percent = true;
    if (field.choices != null && field.choices.length > 0) {
      entry.choices = [...field.choices];
    }
    if (field.default !== undefined) {
      if (typeof field.default === "string") {
        if (field.default.length > 0) entry.default = field.default;
      } else {
        entry.default = field.default;
      }
    }
    return entry;
  });
}

export function statusEntriesForMcp(
  statuses: readonly StatusItem[],
): McpStatusEntry[] {
  return statuses.map((item) => {
    const { id, name, role, description, instruction } = normalizeStatusItem(item);
    const entry: McpStatusEntry = { id, name, role, description };
    if (instruction) entry.instruction = instruction;
    return entry;
  });
}

export type FilteredTasksMcpPayload = {
  levels: McpLevelEntry[];
  statuses: McpStatusEntry[];
  fields: McpFieldEntry[];
  activeConditions: McpActiveFilterCondition[];
  tasks: ScreenContextTask[];
};

export type SelectedTaskMcpPayload = {
  levels: McpLevelEntry[];
  statuses: McpStatusEntry[];
  fields: McpFieldEntry[];
  selectedTaskId: ScheduleId | null;
  selectedTask: ScreenContextTask | null;
};

export type SelectedTasksMcpPayload = {
  levels: McpLevelEntry[];
  statuses: McpStatusEntry[];
  fields: McpFieldEntry[];
  selectedTasks: ScreenContextTask[];
};

function levelsForMcpPayload(levels?: readonly ScheduleLevelDef[] | null) {
  return mcpLevelsFromDocument({
    levels: levels?.length ? [...levels] : undefined,
  });
}

export type ScheduleDiffMcpPayload = {
  scheduleDiff: {
    text: string;
    isError: boolean;
  };
};

export type McpToolResultBody = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type McpScheduleTasksContext = {
  categories: Category[];
  outline?: OutlineRoot | undefined;
  levels?: readonly ScheduleLevelDef[] | null;
  title?: string;
  milestoneGroups?: MilestoneGroup[];
  milestones?: Milestone[];
  fields?: readonly ScheduleFieldDef[];
};

function scheduleDocumentForMcpTasks(
  input: McpScheduleTasksContext,
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: input.title ?? "",
    categories: input.categories,
    milestoneGroups: input.milestoneGroups ?? [],
    milestones: input.milestones ?? [],
    levels: input.levels?.length ? [...input.levels] : undefined,
    outline: input.outline,
  };
}

const CONFIDENCE_LABELS: Record<Exclude<ConfidenceFilter, "all">, string> = {
  tentative: "未確定",
  committed: "確定",
};

function taskToContext(ref: FilteredTaskRef): ScreenContextTask {
  const { task, category, group } = ref;
  return {
    id: task.id,
    name: task.name,
    category,
    group,
    start: task.start,
    end: task.end,
    assigneeId: task.assigneeId,
    status: task.status,
    progress: task.progress,
    confidence: task.confidence,
    predecessors: [...task.predecessors],
    milestoneId: task.milestoneId,
    ...(hasTaskTodos(task) ? { todos: task.todos!.map((item) => ({ ...item })) } : {}),
    ...(task.note !== undefined ? { note: task.note } : {}),
    tags: [...(task.tags ?? [])],
    ...(task.fieldValues != null && Object.keys(task.fieldValues).length > 0
      ? { fieldValues: { ...task.fieldValues } }
      : {}),
  };
}

export function buildActiveFilterConditions(input: {
  filters: ScheduleFilters;
  hiddenMilestoneGroupIds: ScheduleId[];
  milestoneGroups: MilestoneGroup[];
  milestones: Milestone[];
  lineageTaskId: ScheduleId | null;
  categories: Category[];
  outline?: OutlineRoot | undefined;
  memberCatalog: Map<MemberId, Member> | null;
  statuses?: readonly StatusItem[];
  fields?: readonly ScheduleFieldDef[];
}): McpActiveFilterCondition[] {
  const conditions: McpActiveFilterCondition[] = [];
  const { filters } = input;

  if (filters.assignee !== "all") {
    if (filters.assignee === UNASSIGNED_FILTER) {
      conditions.push({
        type: "assignee",
        id: UNASSIGNED_FILTER,
        name: UNASSIGNED_LABEL,
      });
    } else {
      const display = resolveAssigneeDisplay(
        filters.assignee,
        input.memberCatalog,
      );
      conditions.push({
        type: "assignee",
        id: filters.assignee,
        name: display.label,
      });
    }
  }

  if (filters.status !== "all") {
    conditions.push({
      type: "status",
      value: filters.status,
      label:
        filters.status === "not-done"
          ? "完了以外"
          : statusLabel(input.statuses ?? BUILTIN_STATUS_ITEMS, filters.status),
    });
  }

  if (filters.confidence !== "all") {
    conditions.push({
      type: "confidence",
      value: filters.confidence,
      label: CONFIDENCE_LABELS[filters.confidence],
    });
  }

  if (filters.overdue !== "all") {
    conditions.push({
      type: "overdue",
      value: filters.overdue,
      label: "期限超過",
    });
  }

  if (filters.relation !== "all") {
    conditions.push({
      type: "relation",
      value: filters.relation,
      label: "破綻のみ",
    });
  }

  if (filters.milestone !== "all") {
    if (filters.milestone === NO_MILESTONE_FILTER) {
      conditions.push({
        type: "milestone",
        id: NO_MILESTONE_FILTER,
        name: "なし",
      });
    } else {
      const milestone = input.milestones.find((m) => m.id === filters.milestone);
      conditions.push({
        type: "milestone",
        id: filters.milestone,
        name: milestone
          ? `${milestone.name}（${milestone.date}）`
          : filters.milestone,
      });
    }
  }

  if (filters.tags.length > 0) {
    conditions.push({ type: "tags", tags: [...filters.tags] });
  }

  if (input.hiddenMilestoneGroupIds.length > 0) {
    const hidden = input.hiddenMilestoneGroupIds.map((id) => {
      const group = input.milestoneGroups.find((g) => g.id === id);
      return { id, name: group?.name ?? id };
    });
    conditions.push({ type: "milestoneBandHidden", groups: hidden });
  }

  if (input.fields != null) {
    for (const def of input.fields) {
      const condition = filters.fieldFilters?.[def.key];
      if (!condition || !isFieldFilterActive(def, condition)) continue;
      const label = fieldFilterChipLabel(def, condition);
      if (!label) continue;
      conditions.push({ type: "fieldFilter", key: def.key, label });
    }
  }

  const searchName = filters.search.trim();
  if (searchName) {
    conditions.push({ type: "searchName", query: searchName });
  }

  const searchNote = filters.noteSearch.trim();
  if (searchNote) {
    conditions.push({ type: "searchNote", query: searchNote });
  }

  if (input.lineageTaskId != null) {
    const task = findTaskInDocument(
      input.categories,
      input.outline,
      input.lineageTaskId,
    );
    conditions.push({
      type: "lineage",
      taskId: input.lineageTaskId,
      taskName: task?.name ?? input.lineageTaskId,
    });
  }

  return conditions;
}

function resolveSelectedTask(
  doc: ScheduleDocument,
  matched: FilteredTaskRef[],
  selectedTaskId: ScheduleId | null,
): ScreenContextTask | null {
  if (selectedTaskId == null) return null;
  const selected = findTaskInDocument(
    doc.categories,
    doc.outline,
    selectedTaskId,
  );
  if (!selected) return null;
  const place = matched.find((ref) => ref.task.id === selected.id);
  if (place) {
    return taskToContext(place);
  }
  const labels = taskHierarchyLabels(doc, selected.id);
  return taskToContext({
    task: selected,
    category: labels.category,
    group: labels.group,
  });
}

export function buildFilteredTasksPayload(
  input: McpScheduleTasksContext & {
    filters: ScheduleFilters;
    lineageTaskId: ScheduleId | null;
    hiddenMilestoneGroupIds: ScheduleId[];
    today: string;
    memberCatalog: Map<MemberId, Member> | null;
    lineageIds: ReadonlySet<ScheduleId> | null;
    statuses?: readonly StatusItem[];
    levels?: readonly ScheduleLevelDef[] | null;
    fields?: readonly ScheduleFieldDef[];
  },
): FilteredTasksMcpPayload {
  const statuses = input.statuses ?? BUILTIN_STATUS_ITEMS;
  const fieldEntries = fieldEntriesForMcp(input.fields ?? []);
  const levelEntries = levelsForMcpPayload(input.levels);
  const doc = scheduleDocumentForMcpTasks(input);
  const matched = listTasksMatchingFilterInDocument(
    doc,
    input.filters,
    input.today,
    input.memberCatalog,
    input.lineageIds,
    statuses,
    input.fields,
  );
  return {
    levels: levelEntries,
    statuses: statusEntriesForMcp(statuses),
    fields: fieldEntries,
    activeConditions: buildActiveFilterConditions({
      filters: input.filters,
      hiddenMilestoneGroupIds: input.hiddenMilestoneGroupIds,
      milestoneGroups: input.milestoneGroups ?? [],
      milestones: input.milestones ?? [],
      lineageTaskId: input.lineageTaskId,
      categories: input.categories,
      outline: input.outline,
      memberCatalog: input.memberCatalog,
      statuses,
      fields: input.fields,
    }),
    tasks: matched.map(taskToContext),
  };
}

export function buildSelectedTaskPayload(
  input: McpScheduleTasksContext & {
    filters: ScheduleFilters;
    today: string;
    memberCatalog: Map<MemberId, Member> | null;
    lineageIds: ReadonlySet<ScheduleId> | null;
    selectedTaskId: ScheduleId | null;
    statuses?: readonly StatusItem[];
    levels?: readonly ScheduleLevelDef[] | null;
    fields?: readonly ScheduleFieldDef[];
  },
): SelectedTaskMcpPayload {
  const statuses = input.statuses ?? BUILTIN_STATUS_ITEMS;
  const fieldEntries = fieldEntriesForMcp(input.fields ?? []);
  const levelEntries = levelsForMcpPayload(input.levels);
  const doc = scheduleDocumentForMcpTasks(input);
  const matched = listTasksMatchingFilterInDocument(
    doc,
    input.filters,
    input.today,
    input.memberCatalog,
    input.lineageIds,
    statuses,
    input.fields,
  );
  const selectedTask = resolveSelectedTask(
    doc,
    matched,
    input.selectedTaskId,
  );
  return {
    levels: levelEntries,
    statuses: statusEntriesForMcp(statuses),
    fields: fieldEntries,
    selectedTaskId: input.selectedTaskId,
    selectedTask,
  };
}

export function buildSelectedTasksPayload(
  input: McpScheduleTasksContext & {
    selectedTaskIds: readonly ScheduleId[];
    statuses?: readonly StatusItem[];
    levels?: readonly ScheduleLevelDef[] | null;
    fields?: readonly ScheduleFieldDef[];
  },
): SelectedTasksMcpPayload {
  const statusEntries = statusEntriesForMcp(
    input.statuses ?? BUILTIN_STATUS_ITEMS,
  );
  const fieldEntries = fieldEntriesForMcp(input.fields ?? []);
  const levelEntries = levelsForMcpPayload(input.levels);
  const selected = new Set(input.selectedTaskIds);
  if (selected.size === 0) {
    return {
      levels: levelEntries,
      statuses: statusEntries,
      fields: fieldEntries,
      selectedTasks: [],
    };
  }
  const doc = scheduleDocumentForMcpTasks(input);
  const selectedTasks: ScreenContextTask[] = [];
  for (const task of collectTasksFromDocument(doc)) {
    if (!selected.has(task.id)) continue;
    const labels = taskHierarchyLabels(doc, task.id);
    selectedTasks.push(
      taskToContext({
        task,
        category: labels.category,
        group: labels.group,
      }),
    );
  }
  return {
    levels: levelEntries,
    statuses: statusEntries,
    fields: fieldEntries,
    selectedTasks,
  };
}

export function buildScheduleDiffPayload(input: {
  scheduleDiffText: string;
  scheduleDiffIsError: boolean;
}): ScheduleDiffMcpPayload {
  return {
    scheduleDiff: {
      text: input.scheduleDiffText,
      isError: input.scheduleDiffIsError,
    },
  };
}

export function mcpPayloadToToolBody(
  payload: unknown,
): McpToolResultBody | { tooLarge: true } {
  const text = JSON.stringify(payload, null, 2);
  return mcpPlainTextToolBody(text);
}

export function mcpPlainTextToolBody(
  text: string,
  isError = false,
): McpToolResultBody | { tooLarge: true } {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MCP_SCREEN_CONTEXT_MAX_BYTES) {
    return { tooLarge: true };
  }
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

export function mcpToolErrorBody(message: string): McpToolResultBody {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/** @deprecated 第1段の一体型。テスト互換のため残す。 */
export type ScreenContextFilterState = {
  filters: ScheduleFilters;
  searchField: SearchField;
  lineageTaskId: ScheduleId | null;
  hiddenMilestoneGroupIds: ScheduleId[];
};

/** @deprecated 第1段の一体型。テスト互換のため残す。 */
export type ScreenContextPayload = {
  tasks: ScreenContextTask[];
  filterState: ScreenContextFilterState;
  selectedTaskId: ScheduleId | null;
  selectedTask: ScreenContextTask | null;
  scheduleDiff: {
    text: string;
    isError: boolean;
  };
};

/** @deprecated 第1段の一体型。テスト互換のため残す。 */
export function buildScreenContextPayload(input: {
  categories: Category[];
  filters: ScheduleFilters;
  searchField: SearchField;
  lineageTaskId: ScheduleId | null;
  hiddenMilestoneGroupIds: ScheduleId[];
  today: string;
  memberCatalog: Map<MemberId, Member> | null;
  lineageIds: ReadonlySet<ScheduleId> | null;
  selectedTaskId: ScheduleId | null;
  scheduleDiffText: string;
  scheduleDiffIsError: boolean;
}): ScreenContextPayload {
  const filtered = buildFilteredTasksPayload({
    categories: input.categories,
    title: "",
    filters: input.filters,
    lineageTaskId: input.lineageTaskId,
    hiddenMilestoneGroupIds: input.hiddenMilestoneGroupIds,
    milestoneGroups: [],
    milestones: [],
    today: input.today,
    memberCatalog: input.memberCatalog,
    lineageIds: input.lineageIds,
  });
  const selected = buildSelectedTaskPayload({
    categories: input.categories,
    title: "",
    milestoneGroups: [],
    milestones: [],
    filters: input.filters,
    today: input.today,
    memberCatalog: input.memberCatalog,
    lineageIds: input.lineageIds,
    selectedTaskId: input.selectedTaskId,
  });
  return {
    tasks: filtered.tasks,
    filterState: {
      filters: input.filters,
      searchField: input.searchField,
      lineageTaskId: input.lineageTaskId,
      hiddenMilestoneGroupIds: [...input.hiddenMilestoneGroupIds],
    },
    selectedTaskId: selected.selectedTaskId,
    selectedTask: selected.selectedTask,
    scheduleDiff: {
      text: input.scheduleDiffText,
      isError: input.scheduleDiffIsError,
    },
  };
}

/** @deprecated use mcpPayloadToToolBody */
export function screenContextToMcpToolBody(
  payload: ScreenContextPayload,
): McpToolResultBody | { tooLarge: true } {
  return mcpPayloadToToolBody(payload);
}
