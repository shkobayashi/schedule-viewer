export const MCP_TOOL_OPEN_WINDOWS = "open_windows";
export const MCP_TOOL_SCHEDULE_DIFF = "schedule_diff";
export const MCP_TOOL_BASELINE_DIFFS = "baseline_diffs";
export const MCP_TOOL_SELECTED_TASK = "selected_task";
export const MCP_TOOL_SELECTED_TASKS = "selected_tasks";
export const MCP_TOOL_FILTERED_TASKS = "filtered_tasks";
export const MCP_TOOL_CURRENT_SCHEDULE = "current_schedule";
export const MCP_TOOL_REPLACE_SCHEDULE = "replace_schedule";

export const MCP_TOOL_FOCUS_WINDOW = "focus_window";
export const MCP_TOOL_OPEN_NEW_WINDOW = "open_new_window";
export const MCP_TOOL_CLOSE_WINDOW = "close_window";
export const MCP_TOOL_MINIMIZE_WINDOW = "minimize_window";
export const MCP_TOOL_SET_VIEW = "set_view";
export const MCP_TOOL_EXPLAIN_VIEW = "explain_view";
export const MCP_TOOL_EDIT_PLAN = "edit_plan";
export const MCP_TOOL_FILE_ACTION = "file_action";
export const MCP_TOOL_CATALOG_ACTION = "catalog_action";
export const MCP_TOOL_SET_PREFERENCES = "set_preferences";
export const MCP_TOOL_HISTORY = "history";

export const MCP_READ_TOOL_NAMES = [
  MCP_TOOL_SCHEDULE_DIFF,
  MCP_TOOL_BASELINE_DIFFS,
  MCP_TOOL_SELECTED_TASK,
  MCP_TOOL_SELECTED_TASKS,
  MCP_TOOL_FILTERED_TASKS,
  MCP_TOOL_CURRENT_SCHEDULE,
] as const;

export const MCP_READ_TOOLS_WITH_WINDOW = [...MCP_READ_TOOL_NAMES] as const;

export const MCP_WINDOW_TARGET_TOOL_NAMES = [
  MCP_TOOL_FOCUS_WINDOW,
  MCP_TOOL_CLOSE_WINDOW,
  MCP_TOOL_MINIMIZE_WINDOW,
] as const;

export const MCP_FRONT_ONLY_TOOL_NAMES = [
  MCP_TOOL_OPEN_WINDOWS,
  MCP_TOOL_REPLACE_SCHEDULE,
  MCP_TOOL_OPEN_NEW_WINDOW,
  MCP_TOOL_SET_VIEW,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_SET_PREFERENCES,
  MCP_TOOL_HISTORY,
] as const;

export const MCP_STDIN_ACTION_TOOL_NAMES = [
  MCP_TOOL_SET_VIEW,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_SET_PREFERENCES,
  MCP_TOOL_HISTORY,
  MCP_TOOL_OPEN_NEW_WINDOW,
] as const;

export const MCP_ALL_TOOL_NAMES = [
  MCP_TOOL_OPEN_WINDOWS,
  ...MCP_READ_TOOL_NAMES,
  MCP_TOOL_REPLACE_SCHEDULE,
  ...MCP_WINDOW_TARGET_TOOL_NAMES,
  MCP_TOOL_OPEN_NEW_WINDOW,
  MCP_TOOL_SET_VIEW,
  MCP_TOOL_EXPLAIN_VIEW,
  MCP_TOOL_EDIT_PLAN,
  MCP_TOOL_FILE_ACTION,
  MCP_TOOL_CATALOG_ACTION,
  MCP_TOOL_SET_PREFERENCES,
  MCP_TOOL_HISTORY,
] as const;

export type McpReadToolName = (typeof MCP_READ_TOOL_NAMES)[number];

export function isMcpReadToolName(name: string): name is McpReadToolName {
  return (MCP_READ_TOOL_NAMES as readonly string[]).includes(name);
}

export function mcpToolRejectsWindowArgument(tool: string): string | null {
  if (tool === MCP_TOOL_REPLACE_SCHEDULE) {
    return "replace_schedule は前面ウィンドウだけを置き換えます。--window は使えません。";
  }
  if (tool === MCP_TOOL_OPEN_WINDOWS) {
    return "open_windows は --window を受け付けません。";
  }
  if ((MCP_FRONT_ONLY_TOOL_NAMES as readonly string[]).includes(tool)) {
    return `${tool} は前面ウィンドウだけに届きます。--window は使えません。`;
  }
  return null;
}
