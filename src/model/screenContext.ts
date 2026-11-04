import type { SearchField } from "./scheduleFilterPersistence";
import { assigneeIdToJson, taskAssigneeIds } from "./assigneeIds";
import { duplicateMemberNamesFromCatalog, resolveAssigneeRowDisplay } from "./assigneeDisplay";
import type { ColorItem } from "./colorCatalog";
import {
  BUILTIN_STATUS_ITEMS,
  normalizeStatusItem,
  statusLabel,
  type StatusItem,
} from "./statusCatalog";
import type { Member, MemberId } from "./memberTypes";
import type { WorkspaceMemberState } from "./workspaceTypes";
import type { CalendarDocument, Weekday } from "./calendarTypes";
import type { ColorSchemePreference } from "./colorScheme";
import type { ResolvedColorScheme } from "./palette";
import {
  collectTasksFromDocument,
  findTaskInDocument,
  isOutlineBranch,
  taskHierarchyLabels,
} from "./hierarchy";
import {
  categoryCollapseKey,
  groupCollapseKey,
  hierarchyCollapseKey,
} from "./rows";
import type { McpTaskVisibility, McpViewVisible, McpViewportForReadTools } from "./mcpVisible";
import {
  displayedCollapsedSet,
  explanationViewActive,
  orderedExplainMilestoneGroupIdsForRead,
  orderedExplainMilestoneIdsForRead,
  orderedExplainTaskIdsForRead,
  type ExplanationViewState,
} from "./explainView";
import {
  buildMcpExplanationOverlay,
  explanationOverlayActive,
  type BuildMcpExplanationOverlayInput,
  type ExplanationOverlayState,
  type McpExplanationOverlayPayload,
} from "./explainOverlay";
import {
  buildMcpViewVisible,
  mcpTaskVisibility,
  mcpTaskVisibilityContext,
} from "./mcpVisible";
import type { DisplayScalePreference } from "./uiScale";
import type { RowDensity, SidebarColumnsPreference } from "./viewPreferences";
import { DEFAULT_SIDEBAR_COLUMNS } from "./viewPreferences";
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

export {
  MCP_TOOL_BASELINE_DIFFS,
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_CLOSE_WINDOW,
  MCP_TOOL_CURRENT_SCHEDULE,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_FILTERED_TASKS,
  MCP_TOOL_FOCUS_WINDOW,
  MCP_TOOL_HISTORY,
  MCP_TOOL_MINIMIZE_WINDOW,
  MCP_TOOL_OPEN_NEW_WINDOW,
  MCP_TOOL_OPEN_WINDOWS,
  MCP_TOOL_REPLACE_SCHEDULE,
  MCP_TOOL_SCHEDULE_DIFF,
  MCP_TOOL_SELECTED_TASK,
  MCP_TOOL_SELECTED_TASKS,
  MCP_TOOL_SET_PREFERENCES,
  MCP_TOOL_SET_VIEW,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_EXPLAIN_OVERLAY,
} from "./mcpToolNames";

export type ScreenContextTask = {
  id: ScheduleId;
  name: string;
  category: string;
  group: string;
  start: string;
  end: string;
  assigneeId: string | null | MemberId[];
  status: Task["status"];
  progress: number;
  confidence: Task["confidence"];
  predecessors: ScheduleId[];
  milestoneId: ScheduleId | null;
  todos?: TaskTodoItem[];
  note?: string;
  tags: string[];
  colorId?: string;
  fieldValues?: TaskFieldValues;
  visibility?: McpTaskVisibility;
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
  color: {
    light: { bg: string; border: string };
    dark: { bg: string; border: string };
  };
};

export type McpCollapsedEntry = {
  kind: "category" | "group" | "heading";
  id: ScheduleId;
  name: string;
};

export type McpViewCalendarLoaded = {
  source: "loaded";
  weekends: Weekday[];
  nonWorkingDays: Array<{ date: string; name?: string }>;
  workingDays: Array<{ date: string; name?: string }>;
};

export type McpViewCalendarDefault = {
  source: "default";
  weekends: ["sat", "sun"];
  nonWorkingDays: [];
  workingDays: [];
};

export type McpViewCalendar = McpViewCalendarLoaded | McpViewCalendarDefault;

export type McpViewExplanation = {
  taskIds?: ScheduleId[];
  milestoneGroupIds?: ScheduleId[];
  milestoneIds?: ScheduleId[];
  baseCollapsed: McpCollapsedEntry[];
};

export type McpViewForReadTools = {
  collapsed: McpCollapsedEntry[];
  visible?: McpViewVisible;
  explanation?: McpViewExplanation;
  displayScale: {
    preference: DisplayScalePreference;
    effective: number;
  };
  rowDensity: RowDensity;
  lightning: boolean;
  columns: SidebarColumnsPreference;
  colorScheme: {
    preference: ColorSchemePreference;
    effective: ResolvedColorScheme;
  };
  calendar: McpViewCalendar;
};

export type McpViewForReadToolsInput = {
  collapsed: ReadonlySet<string>;
  userCollapsed?: ReadonlySet<string>;
  explanationView?: ExplanationViewState | null;
  displayScalePreference: DisplayScalePreference;
  effectiveUiScale: number;
  rowDensity: RowDensity;
  showLightningLine: boolean;
  sidebarColumns: SidebarColumnsPreference;
  colorSchemePreference: ColorSchemePreference;
  resolvedColorScheme: ResolvedColorScheme;
  calendar: CalendarDocument | null;
  categories: Category[];
  outline?: OutlineRoot | undefined;
  milestoneGroups?: readonly MilestoneGroup[];
  milestones?: readonly Milestone[];
  viewport?: McpViewportForReadTools;
};

/** タスクの `colorId` が指す色。LLM が id を選ぶ手がかり。 */
export type McpColorEntry = {
  id: string;
  name: string;
  description: string;
  color: {
    light: { bg: string };
    dark: { bg: string };
  };
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
    const entry: McpStatusEntry = {
      id,
      name,
      role,
      description,
      color: {
        light: {
          bg: item.color.light.bg,
          border: item.color.light.border,
        },
        dark: {
          bg: item.color.dark.bg,
          border: item.color.dark.border,
        },
      },
    };
    if (instruction) entry.instruction = instruction;
    return entry;
  });
}

function calendarDatedEntriesForMcp(
  entries: CalendarDocument["nonWorkingDays"],
): Array<{ date: string; name?: string }> {
  return entries.map((entry) => {
    const name = entry.name?.trim();
    if (name) return { date: entry.date, name };
    return { date: entry.date };
  });
}

function collectCollapsedInDocumentOrder(
  collapsed: ReadonlySet<string>,
  categories: Category[],
  outline: OutlineRoot | undefined,
): McpCollapsedEntry[] {
  const out: McpCollapsedEntry[] = [];
  const categoryIds = new Set<string>();
  const groupIds = new Set<string>();
  for (const cat of categories) {
    categoryIds.add(cat.id);
    for (const group of cat.groups) {
      groupIds.add(group.id);
    }
  }
  for (const cat of categories) {
    if (collapsed.has(categoryCollapseKey(cat.id)) && categoryIds.has(cat.id)) {
      out.push({ kind: "category", id: cat.id, name: cat.name });
    }
    for (const group of cat.groups) {
      if (
        collapsed.has(groupCollapseKey(group.id)) &&
        groupIds.has(group.id)
      ) {
        out.push({ kind: "group", id: group.id, name: group.name });
      }
    }
  }
  const walkOutline = (nodes: OutlineRoot) => {
    for (const node of nodes) {
      if (!isOutlineBranch(node)) continue;
      if (collapsed.has(hierarchyCollapseKey(node.id))) {
        out.push({ kind: "heading", id: node.id, name: node.name });
      }
      walkOutline(node.children);
    }
  };
  if (outline != null && outline.length > 0) {
    walkOutline(outline);
  }
  return out;
}

export function defaultMcpViewForReadToolsInput(
  categories: Category[],
  outline?: OutlineRoot | undefined,
): McpViewForReadToolsInput {
  return {
    collapsed: new Set(),
    displayScalePreference: 1,
    effectiveUiScale: 1,
    rowDensity: "comfortable",
    showLightningLine: true,
    sidebarColumns: { ...DEFAULT_SIDEBAR_COLUMNS },
    colorSchemePreference: "light",
    resolvedColorScheme: "light",
    calendar: null,
    categories,
    outline,
  };
}

export function buildMcpViewForReadTools(
  input: McpViewForReadToolsInput,
): McpViewForReadTools {
  const calendar: McpViewCalendar =
    input.calendar != null
      ? {
          source: "loaded",
          weekends: [...input.calendar.weekends],
          nonWorkingDays: calendarDatedEntriesForMcp(
            input.calendar.nonWorkingDays,
          ),
          workingDays: calendarDatedEntriesForMcp(input.calendar.workingDays),
        }
      : {
          source: "default",
          weekends: ["sat", "sun"],
          nonWorkingDays: [],
          workingDays: [],
        };
  const userCollapsed = input.userCollapsed ?? input.collapsed;
  const displayCollapsed =
    input.explanationView != null
      ? displayedCollapsedSet(userCollapsed, input.explanationView)
      : input.collapsed;
  const explanationPayload = (() => {
    if (!explanationViewActive(input.explanationView ?? null)) return undefined;
    const ev = input.explanationView!;
    const payload: McpViewExplanation = {
      baseCollapsed: collectCollapsedInDocumentOrder(
        userCollapsed,
        input.categories,
        input.outline,
      ),
    };
    if (ev.taskIds != null) {
      payload.taskIds = orderedExplainTaskIdsForRead(
        { categories: input.categories, outline: input.outline },
        ev.taskIds,
      );
    }
    if (ev.milestoneGroupIds != null) {
      payload.milestoneGroupIds = orderedExplainMilestoneGroupIdsForRead(
        input.milestoneGroups ?? [],
        ev.milestoneGroupIds,
      );
    }
    if (ev.milestoneIds != null) {
      payload.milestoneIds = orderedExplainMilestoneIdsForRead(
        input.milestones ?? [],
        ev.milestoneIds,
      );
    }
    return payload;
  })();
  return {
    collapsed: collectCollapsedInDocumentOrder(
      displayCollapsed,
      input.categories,
      input.outline,
    ),
    ...(explanationPayload ? { explanation: explanationPayload } : {}),
    ...(input.viewport != null
      ? { visible: buildMcpViewVisible(input.viewport) }
      : {}),
    displayScale: {
      preference: input.displayScalePreference,
      effective: input.effectiveUiScale,
    },
    rowDensity: input.rowDensity,
    lightning: input.showLightningLine,
    columns: { ...input.sidebarColumns },
    colorScheme: {
      preference: input.colorSchemePreference,
      effective: input.resolvedColorScheme,
    },
    calendar,
  };
}

export function colorEntriesForMcp(
  colors: readonly ColorItem[] | null | undefined,
): McpColorEntry[] {
  if (colors == null || colors.length === 0) return [];
  return colors.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    color: {
      light: { bg: item.color.light.bg },
      dark: { bg: item.color.dark.bg },
    },
  }));
}

export type McpMemberEntry = {
  id: string;
  name: string;
  description?: string;
};

export function memberEntriesForMcp(
  members: readonly Member[] | null | undefined,
): McpMemberEntry[] {
  if (members == null || members.length === 0) return [];
  return members.map((member) => {
    const entry: McpMemberEntry = { id: member.id, name: member.name };
    const description = member.description?.trim();
    if (description) entry.description = description;
    return entry;
  });
}

/** MCP 読み取り 3 ツール用のメンバー一覧。チャート表示の解決とは出所が違う。 */
export function mcpMembersForReadTools(input: {
  inWorkspace: boolean;
  workspaceMembers: WorkspaceMemberState | null;
  workspaceMembersPath: string | null;
  appMembers: Member[] | null;
}): Member[] {
  if (
    input.inWorkspace &&
    input.workspaceMembersPath &&
    input.workspaceMembers?.kind === "loaded"
  ) {
    return [...input.workspaceMembers.members];
  }
  return input.appMembers ? [...input.appMembers] : [];
}

export type { McpExplanationOverlayPayload } from "./explainOverlay";

export type FilteredTasksMcpPayload = {
  levels: McpLevelEntry[];
  statuses: McpStatusEntry[];
  colors: McpColorEntry[];
  members: McpMemberEntry[];
  fields: McpFieldEntry[];
  view: McpViewForReadTools;
  explanationOverlay?: McpExplanationOverlayPayload;
  activeConditions: McpActiveFilterCondition[];
  tasks: ScreenContextTask[];
};

export type SelectedTaskMcpPayload = {
  levels: McpLevelEntry[];
  statuses: McpStatusEntry[];
  colors: McpColorEntry[];
  members: McpMemberEntry[];
  fields: McpFieldEntry[];
  view: McpViewForReadTools;
  explanationOverlay?: McpExplanationOverlayPayload;
  selectedTaskId: ScheduleId | null;
  selectedTask: ScreenContextTask | null;
};

export type SelectedTasksMcpPayload = {
  levels: McpLevelEntry[];
  statuses: McpStatusEntry[];
  colors: McpColorEntry[];
  members: McpMemberEntry[];
  fields: McpFieldEntry[];
  view: McpViewForReadTools;
  explanationOverlay?: McpExplanationOverlayPayload;
  selectedTasks: ScreenContextTask[];
};

function attachExplanationOverlay<T extends { view: McpViewForReadTools }>(
  payload: T,
  overlay: ExplanationOverlayState | null | undefined,
  build?: Omit<BuildMcpExplanationOverlayInput, "overlay"> | null,
): T & { explanationOverlay?: McpExplanationOverlayPayload } {
  if (!explanationOverlayActive(overlay ?? null)) return payload;
  const explanationOverlay = buildMcpExplanationOverlay({
    overlay: overlay ?? null,
    visibleRows: build?.visibleRows ?? [],
    pxPerDay: build?.pxPerDay ?? 1,
    scrollX: build?.scrollX ?? 0,
    scrollY: build?.scrollY ?? 0,
    rowHeight: build?.rowHeight ?? 0,
    bodyHeight: build?.bodyHeight ?? 0,
    chartWidth: build?.chartWidth ?? 0,
    timelineStart: build?.timelineStart ?? new Date(0),
    liveAnchors: build?.liveAnchors ?? new Map(),
  });
  if (explanationOverlay == null) return payload;
  return { ...payload, explanationOverlay };
}

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
  content: McpContentBlock[];
  isError?: boolean;
};

export type McpContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export const MCP_SCREEN_CAPTURE_FAILED_MESSAGE =
  "今の画面の絵を取れませんでした。";
export const MCP_SCREEN_CAPTURE_TOO_LARGE_MESSAGE =
  "絵が大きすぎるため、絵だけ渡せません。";

export type McpScreenshotForReadTools =
  | { ok: true; base64: string; mimeType: "image/png" }
  | { ok: false };

export type McpScheduleTasksContext = {
  categories: Category[];
  outline?: OutlineRoot | undefined;
  levels?: readonly ScheduleLevelDef[] | null;
  title?: string;
  milestoneGroups?: readonly MilestoneGroup[];
  milestones?: readonly Milestone[];
  fields?: readonly ScheduleFieldDef[];
  /** MCP 用メンバー一覧（チャート解決用 memberCatalog とは別） */
  mcpMembers?: readonly Member[] | null;
};

function scheduleDocumentForMcpTasks(
  input: McpScheduleTasksContext,
): ScheduleDocument {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    title: input.title ?? "",
    categories: [...input.categories],
    milestoneGroups: [...(input.milestoneGroups ?? [])],
    milestones: [...(input.milestones ?? [])],
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
    assigneeId: assigneeIdToJson(taskAssigneeIds(task)),
    status: task.status,
    progress: task.progress,
    confidence: task.confidence,
    predecessors: [...task.predecessors],
    milestoneId: task.milestoneId,
    ...(hasTaskTodos(task) ? { todos: task.todos!.map((item) => ({ ...item })) } : {}),
    ...(task.note !== undefined ? { note: task.note } : {}),
    tags: [...(task.tags ?? [])],
    ...(task.colorId != null && task.colorId !== ""
      ? { colorId: task.colorId }
      : {}),
    ...(task.fieldValues != null && Object.keys(task.fieldValues).length > 0
      ? { fieldValues: { ...task.fieldValues } }
      : {}),
  };
}

type TaskVisibilityContext = ReturnType<typeof mcpTaskVisibilityContext>;

function visibilityContextFromViewInput(
  input: Partial<McpViewForReadToolsInput>,
): TaskVisibilityContext | null {
  if (input.viewport == null) return null;
  return mcpTaskVisibilityContext({
    categories: input.categories ?? [],
    outline: input.outline,
    collapsed: input.collapsed ?? new Set(),
    viewport: input.viewport,
  });
}

function withTaskVisibility(
  task: ScreenContextTask,
  visibilityCtx: TaskVisibilityContext | null,
): ScreenContextTask {
  if (visibilityCtx == null) return task;
  const visibility = mcpTaskVisibility({
    taskId: task.id,
    ...visibilityCtx,
  });
  if (visibility == null) return task;
  return { ...task, visibility };
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
      const display = resolveAssigneeRowDisplay(
        [filters.assignee],
        input.memberCatalog,
        duplicateMemberNamesFromCatalog(input.memberCatalog),
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
  input: McpScheduleTasksContext &
    Partial<McpViewForReadToolsInput> & {
    filters: ScheduleFilters;
    lineageTaskId: ScheduleId | null;
    hiddenMilestoneGroupIds: ScheduleId[];
    today: string;
    memberCatalog: Map<MemberId, Member> | null;
    lineageIds: ReadonlySet<ScheduleId> | null;
    explanationOverlay?: ExplanationOverlayState | null;
    explanationOverlayBuild?: Omit<
      BuildMcpExplanationOverlayInput,
      "overlay"
    > | null;
    statuses?: readonly StatusItem[];
    colors?: readonly ColorItem[] | null;
    levels?: readonly ScheduleLevelDef[] | null;
    fields?: readonly ScheduleFieldDef[];
  },
): FilteredTasksMcpPayload {
  const statuses = input.statuses ?? BUILTIN_STATUS_ITEMS;
  const colorEntries = colorEntriesForMcp(input.colors);
  const memberEntries = memberEntriesForMcp(input.mcpMembers);
  const fieldEntries = fieldEntriesForMcp(input.fields ?? []);
  const levelEntries = levelsForMcpPayload(input.levels);
  const view = buildMcpViewForReadTools({
    ...defaultMcpViewForReadToolsInput(input.categories, input.outline),
    ...input,
  });
  const visibilityCtx = visibilityContextFromViewInput(input);
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
  return attachExplanationOverlay(
    {
      levels: levelEntries,
      statuses: statusEntriesForMcp(statuses),
      colors: colorEntries,
      members: memberEntries,
      fields: fieldEntries,
      view,
      activeConditions: buildActiveFilterConditions({
        filters: input.filters,
        hiddenMilestoneGroupIds: input.hiddenMilestoneGroupIds,
        milestoneGroups: [...(input.milestoneGroups ?? [])],
        milestones: [...(input.milestones ?? [])],
        lineageTaskId: input.lineageTaskId,
        categories: [...input.categories],
        outline: input.outline,
        memberCatalog: input.memberCatalog,
        statuses,
        fields: input.fields,
      }),
      tasks: matched.map((ref) =>
        withTaskVisibility(taskToContext(ref), visibilityCtx),
      ),
    },
    input.explanationOverlay,
    input.explanationOverlayBuild,
  );
}

export function buildSelectedTaskPayload(
  input: McpScheduleTasksContext &
    Partial<McpViewForReadToolsInput> & {
    filters: ScheduleFilters;
    today: string;
    memberCatalog: Map<MemberId, Member> | null;
    lineageIds: ReadonlySet<ScheduleId> | null;
    selectedTaskId: ScheduleId | null;
    explanationOverlay?: ExplanationOverlayState | null;
    explanationOverlayBuild?: Omit<
      BuildMcpExplanationOverlayInput,
      "overlay"
    > | null;
    statuses?: readonly StatusItem[];
    colors?: readonly ColorItem[] | null;
    levels?: readonly ScheduleLevelDef[] | null;
    fields?: readonly ScheduleFieldDef[];
  },
): SelectedTaskMcpPayload {
  const statuses = input.statuses ?? BUILTIN_STATUS_ITEMS;
  const colorEntries = colorEntriesForMcp(input.colors);
  const memberEntries = memberEntriesForMcp(input.mcpMembers);
  const fieldEntries = fieldEntriesForMcp(input.fields ?? []);
  const levelEntries = levelsForMcpPayload(input.levels);
  const view = buildMcpViewForReadTools({
    ...defaultMcpViewForReadToolsInput(input.categories, input.outline),
    ...input,
  });
  const visibilityCtx = visibilityContextFromViewInput(input);
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
  const selectedTaskRaw = resolveSelectedTask(
    doc,
    matched,
    input.selectedTaskId,
  );
  const selectedTask =
    selectedTaskRaw == null
      ? null
      : withTaskVisibility(selectedTaskRaw, visibilityCtx);
  return attachExplanationOverlay(
    {
      levels: levelEntries,
      statuses: statusEntriesForMcp(statuses),
      colors: colorEntries,
      members: memberEntries,
      fields: fieldEntries,
      view,
      selectedTaskId: input.selectedTaskId,
      selectedTask,
    },
    input.explanationOverlay,
    input.explanationOverlayBuild,
  );
}

export function buildSelectedTasksPayload(
  input: McpScheduleTasksContext &
    Partial<McpViewForReadToolsInput> & {
    selectedTaskIds: readonly ScheduleId[];
    explanationOverlay?: ExplanationOverlayState | null;
    explanationOverlayBuild?: Omit<
      BuildMcpExplanationOverlayInput,
      "overlay"
    > | null;
    statuses?: readonly StatusItem[];
    colors?: readonly ColorItem[] | null;
    levels?: readonly ScheduleLevelDef[] | null;
    fields?: readonly ScheduleFieldDef[];
  },
): SelectedTasksMcpPayload {
  const statusEntries = statusEntriesForMcp(
    input.statuses ?? BUILTIN_STATUS_ITEMS,
  );
  const colorEntries = colorEntriesForMcp(input.colors);
  const memberEntries = memberEntriesForMcp(input.mcpMembers);
  const fieldEntries = fieldEntriesForMcp(input.fields ?? []);
  const levelEntries = levelsForMcpPayload(input.levels);
  const view = buildMcpViewForReadTools({
    ...defaultMcpViewForReadToolsInput(input.categories, input.outline),
    ...input,
  });
  const visibilityCtx = visibilityContextFromViewInput(input);
  const selected = new Set(input.selectedTaskIds);
  if (selected.size === 0) {
    return attachExplanationOverlay(
      {
        levels: levelEntries,
        statuses: statusEntries,
        colors: colorEntries,
        members: memberEntries,
        fields: fieldEntries,
        view,
        selectedTasks: [],
      },
      input.explanationOverlay,
      input.explanationOverlayBuild,
    );
  }
  const doc = scheduleDocumentForMcpTasks(input);
  const selectedTasks: ScreenContextTask[] = [];
  for (const task of collectTasksFromDocument(doc)) {
    if (!selected.has(task.id)) continue;
    const labels = taskHierarchyLabels(doc, task.id);
    selectedTasks.push(
      withTaskVisibility(
        taskToContext({
          task,
          category: labels.category,
          group: labels.group,
        }),
        visibilityCtx,
      ),
    );
  }
  return attachExplanationOverlay(
    {
      levels: levelEntries,
      statuses: statusEntries,
      colors: colorEntries,
      members: memberEntries,
      fields: fieldEntries,
      view,
      selectedTasks,
    },
    input.explanationOverlay,
    input.explanationOverlayBuild,
  );
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

function mcpToolBodyByteSize(content: McpContentBlock[]): number {
  const enc = new TextEncoder();
  let bytes = 0;
  for (const block of content) {
    if (block.type === "text") {
      bytes += enc.encode(block.text).length;
    } else {
      bytes += enc.encode(block.data).length;
    }
  }
  return bytes;
}

/** 読み取り 3 ツール用。JSON テキストのあと PNG を載せる。 */
export function mcpReadToolsPayloadToToolBody(
  payload: Record<string, unknown>,
  screenshot: McpScreenshotForReadTools | null,
): McpToolResultBody | { tooLarge: true } {
  let body: Record<string, unknown> = payload;
  if (screenshot?.ok === false) {
    body = {
      ...body,
      screenCapture: { message: MCP_SCREEN_CAPTURE_FAILED_MESSAGE },
    };
  }
  let text = JSON.stringify(body, null, 2);
  if (screenshot?.ok) {
    const withImage: McpContentBlock[] = [
      { type: "text", text },
      {
        type: "image",
        data: screenshot.base64,
        mimeType: screenshot.mimeType,
      },
    ];
    if (mcpToolBodyByteSize(withImage) > MCP_SCREEN_CONTEXT_MAX_BYTES) {
      body = {
        ...payload,
        screenCapture: { message: MCP_SCREEN_CAPTURE_TOO_LARGE_MESSAGE },
      };
      text = JSON.stringify(body, null, 2);
      return mcpPlainTextToolBody(text);
    }
    return { content: withImage };
  }
  return mcpPlainTextToolBody(text);
}

export function isMcpReadToolName(tool: string): boolean {
  return (
    tool === "selected_task" ||
    tool === "selected_tasks" ||
    tool === "filtered_tasks"
  );
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
  const viewDefaults = defaultMcpViewForReadToolsInput(input.categories);
  const filtered = buildFilteredTasksPayload({
    ...viewDefaults,
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
    ...viewDefaults,
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
