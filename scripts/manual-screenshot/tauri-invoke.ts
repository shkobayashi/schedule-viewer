type InvokeArgs = Record<string, unknown> | undefined;

type OpenPick = { path: string; contents: string };

let pendingOpenPick: OpenPick | null = null;
let openScheduleDiskContents: string | null = null;
const memberCatalogBodies = new Map<string, string>();
let selectedMemberCatalogId: string | null = null;
const statusCatalogBodies = new Map<string, string>();
let selectedStatusCatalogId: string | null = null;

export function setManualScreenshotOpenPick(pick: OpenPick | null): void {
  pendingOpenPick = pick;
}

export function setManualScreenshotDiskContents(contents: string | null): void {
  openScheduleDiskContents = contents;
}

const MANUAL_SCREENSHOT_EXE_PATH =
  "/Applications/schedule-viewer.app/Contents/MacOS/schedule-viewer";

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
    case "read_focused_window_label":
      return "main";
    case "is_store_distribution":
      return false;
    case "report_external_schedule_drop_ready":
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
    case "get_members_settings":
      return {
        selectedCatalogId: selectedMemberCatalogId,
        catalogs: [...memberCatalogBodies.keys()]
          .sort((a, b) => a.localeCompare(b, "ja"))
          .map((id) => ({ id, label: id })),
      };
    case "import_member_catalog": {
      const catalogId = String(args.catalogId ?? "").trim();
      const contents = String(args.contents ?? "");
      if (catalogId) {
        memberCatalogBodies.set(catalogId, contents);
        if (selectedMemberCatalogId == null) {
          selectedMemberCatalogId = catalogId;
        }
      }
      return null;
    }
    case "read_member_catalog": {
      const catalogId = String(args.catalogId ?? "");
      return memberCatalogBodies.get(catalogId) ?? null;
    }
    case "delete_member_catalog": {
      const catalogId = String(args.catalogId ?? "");
      memberCatalogBodies.delete(catalogId);
      if (selectedMemberCatalogId === catalogId) {
        selectedMemberCatalogId = null;
      }
      return null;
    }
    case "set_selected_member_catalog": {
      const catalogId = args.catalogId;
      selectedMemberCatalogId =
        typeof catalogId === "string" && catalogId.length > 0 ? catalogId : null;
      return null;
    }
    case "get_statuses_settings":
      return {
        selectedCatalogId: selectedStatusCatalogId,
        catalogs: [...statusCatalogBodies.keys()]
          .sort((a, b) => a.localeCompare(b, "ja"))
          .map((id) => ({ id, label: id })),
      };
    case "import_status_catalog": {
      const catalogId = String(args.catalogId ?? "").trim();
      const contents = String(args.contents ?? "");
      if (catalogId) {
        statusCatalogBodies.set(catalogId, contents);
        if (selectedStatusCatalogId == null) {
          selectedStatusCatalogId = catalogId;
        }
      }
      return null;
    }
    case "read_status_catalog": {
      const catalogId = String(args.catalogId ?? "");
      return statusCatalogBodies.get(catalogId) ?? null;
    }
    case "set_selected_status_catalog": {
      const catalogId = args.catalogId;
      selectedStatusCatalogId =
        typeof catalogId === "string" && catalogId.length > 0 ? catalogId : null;
      return null;
    }
    case "release_field_extension_edit":
      return null;
    case "get_field_extensions_settings":
      return { selectedCatalogIds: [], catalogs: [] };
    case "get_calendar_state":
      return { label: null };
    case "read_recent_files":
      return { schedules: [], workspaces: [] };
    case "clear_recent_files":
      return { schedules: [], workspaces: [] };
    case "record_recent_files":
      return args.store ?? { schedules: [], workspaces: [] };
    case "read_app_calendar":
      return null;
    case "read_schedule_filter":
      return null;
    case "write_schedule_filter":
    case "delete_schedule_filter":
    case "release_schedule_filter":
      return null;
    case "open_schedule_file": {
      if (pendingOpenPick) {
        const pick = pendingOpenPick;
        pendingOpenPick = null;
        return pick;
      }
      if (typeof sessionStorage !== "undefined") {
        const raw = sessionStorage.getItem("manual-screenshot-open-pick");
        if (raw) {
          sessionStorage.removeItem("manual-screenshot-open-pick");
          return JSON.parse(raw) as OpenPick;
        }
      }
      return null;
    }
    case "accept_opened_schedule":
      if (typeof args.contents === "string") {
        openScheduleDiskContents = args.contents;
      }
      return null;
    case "acknowledge_schedule_file_contents":
      return null;
    case "poll_schedule_file_update":
      return null;
    case "check_schedule_file_changed":
      return false;
    case "read_open_schedule_file":
      if (openScheduleDiskContents == null) {
        throw new Error("開いているスケジュールファイルがありません");
      }
      return openScheduleDiskContents;
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
    case "get_executable_path":
      return MANUAL_SCREENSHOT_EXE_PATH;
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
