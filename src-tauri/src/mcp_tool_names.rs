pub const OPEN_WINDOWS_TOOL_NAME: &str = "open_windows";
pub const SCREEN_REPLACE_TOOL_NAME: &str = "replace_schedule";

pub const SCREEN_READ_TOOLS_WITH_WINDOW: [&str; 6] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
];

pub const MCP_WINDOW_TARGET_TOOL_NAMES: [&str; 3] = [
    "focus_window",
    "close_window",
    "minimize_window",
];

pub const MCP_FRONT_ONLY_TOOL_NAMES: [&str; 10] = [
    OPEN_WINDOWS_TOOL_NAME,
    SCREEN_REPLACE_TOOL_NAME,
    "open_new_window",
    "set_view",
    "explain_view",
    "edit_plan",
    "file_action",
    "catalog_action",
    "set_preferences",
    "history",
];

pub const MCP_STDIN_ACTION_TOOL_NAMES: [&str; 8] = [
    "set_view",
    "explain_view",
    "edit_plan",
    "file_action",
    "catalog_action",
    "set_preferences",
    "history",
    "open_new_window",
];

pub const SCREEN_TOOL_NAMES: [&str; 19] = [
    "schedule_diff",
    "baseline_diffs",
    "selected_task",
    "selected_tasks",
    "filtered_tasks",
    "current_schedule",
    OPEN_WINDOWS_TOOL_NAME,
    SCREEN_REPLACE_TOOL_NAME,
    "focus_window",
    "open_new_window",
    "close_window",
    "minimize_window",
    "set_view",
    "explain_view",
    "edit_plan",
    "file_action",
    "catalog_action",
    "set_preferences",
    "history",
];

pub const REPLACE_SCHEDULE_WINDOW_NOT_SUPPORTED: &str =
    "replace_schedule は前面ウィンドウだけを置き換えます。--window は使えません。";
pub const OPEN_WINDOWS_WINDOW_NOT_SUPPORTED: &str =
    "open_windows は --window を受け付けません。";

pub fn mcp_tool_rejects_window_argument(tool: &str) -> Option<String> {
    if tool == SCREEN_REPLACE_TOOL_NAME {
        return Some(REPLACE_SCHEDULE_WINDOW_NOT_SUPPORTED.to_string());
    }
    if tool == OPEN_WINDOWS_TOOL_NAME {
        return Some(OPEN_WINDOWS_WINDOW_NOT_SUPPORTED.to_string());
    }
    if MCP_FRONT_ONLY_TOOL_NAMES.contains(&tool) {
        return Some(format!(
            "{tool} は前面ウィンドウだけに届きます。--window は使えません。"
        ));
    }
    None
}

#[allow(dead_code)]
pub fn screen_cli_accepts_window_flag(tool: &str) -> bool {
    SCREEN_READ_TOOLS_WITH_WINDOW.contains(&tool)
        || MCP_WINDOW_TARGET_TOOL_NAMES.contains(&tool)
}
