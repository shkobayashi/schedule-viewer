import type { SearchField } from "./scheduleFilterPersistence";
import type {
  Category,
  ScheduleFilters,
  ScheduleId,
  Task,
} from "./types";
import type { Member, MemberId } from "./memberTypes";
import {
  findTaskById,
  listTasksMatchingFilter,
  type FilteredTaskRef,
} from "./rows";

export const MCP_SCREEN_CONTEXT_MAX_BYTES = 10 * 1024 * 1024;

export type ScreenContextFilterState = {
  filters: ScheduleFilters;
  searchField: SearchField;
  lineageTaskId: ScheduleId | null;
  hiddenMilestoneGroupIds: ScheduleId[];
};

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
  note?: string;
  tags: string[];
};

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

export type McpToolResultBody = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
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
    ...(task.note !== undefined ? { note: task.note } : {}),
    tags: [...(task.tags ?? [])],
  };
}

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
  const matched = listTasksMatchingFilter(
    input.categories,
    input.filters,
    input.today,
    input.memberCatalog,
    input.lineageIds,
  );
  const tasks = matched.map(taskToContext);
  const selected =
    input.selectedTaskId == null
      ? null
      : findTaskById(input.categories, input.selectedTaskId);
  let selectedTask: ScreenContextTask | null = null;
  if (selected) {
    const place = matched.find((ref) => ref.task.id === selected.id);
    if (place) {
      selectedTask = taskToContext(place);
    } else {
      for (const cat of input.categories) {
        for (const group of cat.groups) {
          if (group.tasks.some((t) => t.id === selected.id)) {
            selectedTask = taskToContext({
              task: selected,
              category: cat.name,
              group: group.name,
            });
            break;
          }
        }
        if (selectedTask) break;
      }
    }
  }
  return {
    tasks,
    filterState: {
      filters: input.filters,
      searchField: input.searchField,
      lineageTaskId: input.lineageTaskId,
      hiddenMilestoneGroupIds: [...input.hiddenMilestoneGroupIds],
    },
    selectedTaskId: input.selectedTaskId,
    selectedTask,
    scheduleDiff: {
      text: input.scheduleDiffText,
      isError: input.scheduleDiffIsError,
    },
  };
}

export function screenContextToMcpToolBody(
  payload: ScreenContextPayload,
): McpToolResultBody | { tooLarge: true } {
  const text = JSON.stringify(payload, null, 2);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MCP_SCREEN_CONTEXT_MAX_BYTES) {
    return { tooLarge: true };
  }
  return {
    content: [{ type: "text", text }],
    isError: false,
  };
}

export function mcpToolErrorBody(message: string): McpToolResultBody {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
