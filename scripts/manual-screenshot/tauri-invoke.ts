type InvokeArgs = Record<string, unknown> | undefined;

export async function manualScreenshotInvoke(
  cmd: string,
  args: InvokeArgs = {},
): Promise<unknown> {
  switch (cmd) {
    case "take_pending_schedule_window_open":
      return null;
    case "read_window_startup":
      return {
        path: null,
        sample: true,
        contents: null,
        error: null,
        draftText: null,
      };
    case "report_startup_settled":
      return null;
    case "register_window_focus":
      return null;
    case "unregister_window_session":
      return null;
    case "read_schedule_recovery":
      return null;
    case "delete_schedule_recovery":
      return null;
    case "read_last_schedule_file":
      return null;
    case "clear_last_schedule_path":
      return null;
    case "read_schedule_filter":
      return null;
    case "write_schedule_filter":
    case "delete_schedule_filter":
    case "release_schedule_filter":
      return null;
    case "accept_opened_schedule":
    case "acknowledge_schedule_file_contents":
      return null;
    case "poll_schedule_file_update":
      return null;
    case "check_schedule_file_changed":
      return false;
    case "read_open_schedule_file":
      return null;
    case "read_members_app_data":
    case "write_members_app_data":
    case "read_calendar_app_data":
    case "write_calendar_app_data":
      return null;
    case "install_json_skills":
    case "remove_json_skills":
      return null;
    case "export_schedule_html":
    case "export_schedule_svg":
      return null;
    case "get_mcp_registration_json":
      return null;
    default:
      if (cmd.startsWith("plugin:")) {
        return null;
      }
      console.warn(`[manual-screenshot] unhandled invoke: ${cmd}`, args);
      return null;
  }
}
