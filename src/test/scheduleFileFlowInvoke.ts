import { vi } from "vitest";
import { documentToJsonString } from "../model/serialize";
import type { WindowStartupRead } from "../model/windowSession";
import type { PollScheduleFileUpdateResult } from "../model/scheduleFile";
import type { ScheduleDocument } from "../model/types";

export const FLOW_SCHEDULE_PATH = "/tmp/regression/plan.json";

function catalogInfos(storageKey: string): { id: string; label: string }[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const stored = JSON.parse(raw) as Record<string, string>;
    return Object.keys(stored)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .map((id) => ({ id, label: id }));
  } catch {
    return [];
  }
}

function catalogText(storageKey: string, catalogId: string): string | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Record<string, string>;
    return stored[catalogId] ?? null;
  } catch {
    return null;
  }
}

function selectedFieldExtensionIds(): string[] {
  const raw = localStorage.getItem("schedule-viewer/field-extensions/selected");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export type ScheduleFileTauriInvoke = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;

export type ScheduleFileFlowInvoke = {
  invoke: ReturnType<typeof vi.fn<ScheduleFileTauriInvoke>>;
  holdStartup: (read?: Partial<WindowStartupRead>) => void;
  resolveStartup: (read?: Partial<WindowStartupRead>) => void;
  rejectStartup: (error?: unknown) => void;
  queuePoll: (update: PollScheduleFileUpdateResult | null) => void;
  resolveNextPoll: (update?: PollScheduleFileUpdateResult | null) => void;
  resetPollQueue: () => void;
  setStartupRead: (read: Partial<WindowStartupRead>) => void;
  filterStore: Map<string, string>;
  recoveryStore: Map<string, string>;
  ackedDisk: string[];
};

export function createScheduleFileFlowInvoke(
  document: ScheduleDocument,
): ScheduleFileFlowInvoke {
  const canonical = documentToJsonString(document);
  const filterStore = new Map<string, string>();
  const recoveryStore = new Map<string, string>();
  const ackedDisk: string[] = [];
  let startupDeferred: Deferred<WindowStartupRead> | null = null;
  let startupRead: WindowStartupRead = {
    path: null,
    workspacePath: null,
    sample: true,
    transientMain: false,
    contents: null,
    error: null,
    draftText: null,
  };
  let pollWaiters: Array<(value: PollScheduleFileUpdateResult | null) => void> =
    [];
  let pollQueue: Array<PollScheduleFileUpdateResult | null> = [];

  const defaultStartupForOpen = (): WindowStartupRead => ({
    path: FLOW_SCHEDULE_PATH,
    workspacePath: null,
    sample: false,
    transientMain: false,
    contents: canonical,
    error: null,
    draftText: null,
  });

  const invoke = vi.fn<ScheduleFileTauriInvoke>(async (command, args) => {
    switch (command) {
      case "read_window_startup":
        if (startupDeferred) return startupDeferred.promise;
        return startupRead;
      case "take_pending_schedule_window_open":
        return null;
      case "poll_schedule_file_update": {
        if (pollQueue.length > 0) {
          return pollQueue.shift() ?? null;
        }
        return new Promise<PollScheduleFileUpdateResult | null>((resolve) => {
          pollWaiters.push(resolve);
        });
      }
      case "acknowledge_schedule_file_contents":
        if (typeof args?.contents === "string") {
          ackedDisk.push(args.contents);
        }
        return;
      case "accept_opened_schedule":
      case "register_window_focus":
      case "report_startup_settled":
      case "report_external_schedule_drop_ready":
      case "recovery_close_action":
      case "recovery_live_action":
      case "release_schedule_filter":
      case "delete_schedule_recovery":
      case "write_schedule_recovery":
      case "sync_application_update_ui":
      case "cancel_application_update":
      case "accept_application_update":
      case "request_application_update":
      case "begin_application_update_install":
      case "list_open_window_labels":
        return command === "list_open_window_labels" ? ["main"] : undefined;
      case "read_focused_window_label":
        return "main";
      case "is_any_schedule_window_focused":
        return true;
      case "read_schedule_filter":
        return filterStore.get(String(args?.path ?? "")) ?? null;
      case "write_schedule_filter":
        if (typeof args?.contents === "string") {
          filterStore.set(FLOW_SCHEDULE_PATH, args.contents);
        }
        return;
      case "delete_schedule_filter":
        filterStore.delete(String(args?.path ?? ""));
        return;
      case "read_recent_files":
        return { schedules: [], workspaces: [] };
      case "clear_recent_files":
        return { schedules: [], workspaces: [] };
      case "record_recent_files":
        return undefined;
      case "open_schedule_file":
        return null;
      case "get_members_settings":
        return {
          selectedCatalogId: localStorage.getItem("schedule-viewer/members/selected"),
          catalogs: catalogInfos("schedule-viewer/members/catalogs"),
        };
      case "read_member_catalog":
        return catalogText(
          "schedule-viewer/members/catalogs",
          String(args?.catalogId ?? ""),
        );
      case "get_statuses_settings":
        return {
          selectedCatalogId: localStorage.getItem("schedule-viewer/statuses/selected"),
          catalogs: catalogInfos("schedule-viewer/statuses/catalogs"),
        };
      case "read_status_catalog":
        return catalogText(
          "schedule-viewer/statuses/catalogs",
          String(args?.catalogId ?? ""),
        );
      case "get_colors_settings":
        return {
          selectedCatalogId: localStorage.getItem("schedule-viewer/colors/selected"),
          catalogs: catalogInfos("schedule-viewer/colors/catalogs"),
        };
      case "read_color_catalog":
        return catalogText(
          "schedule-viewer/colors/catalogs",
          String(args?.catalogId ?? ""),
        );
      case "get_field_extensions_settings":
        return {
          selectedCatalogIds: selectedFieldExtensionIds(),
          catalogs: catalogInfos("schedule-viewer/field-extensions/catalogs"),
        };
      case "read_field_extension_catalog":
        return catalogText(
          "schedule-viewer/field-extensions/catalogs",
          String(args?.catalogId ?? ""),
        );
      case "read_json_file_limited":
        return "{}";
      case "import_member_catalog":
      case "import_status_catalog":
      case "import_color_catalog":
      case "import_field_extension_catalog":
      case "set_selected_member_catalog":
      case "set_selected_status_catalog":
      case "set_selected_color_catalog":
      case "set_selected_field_extension_catalogs":
      case "claim_member_catalog_edit":
      case "claim_color_catalog_edit":
      case "claim_field_extension_edit":
        return { claimed: true };
      case "release_member_catalog_edit":
      case "release_status_catalog_edit":
      case "release_color_catalog_edit":
      case "release_field_extension_edit":
        return undefined;
      case "focus_schedule_window":
        return;
      default:
        return null;
    }
  });

  return {
    invoke,
    filterStore,
    recoveryStore,
    ackedDisk,
    holdStartup(read) {
      startupDeferred = createDeferred<WindowStartupRead>();
      if (read) startupRead = { ...startupRead, ...read };
    },
    resolveStartup(read) {
      const payload: WindowStartupRead = {
        ...defaultStartupForOpen(),
        ...startupRead,
        ...read,
      };
      if (startupDeferred) {
        startupDeferred.resolve(payload);
        startupDeferred = null;
      } else {
        startupRead = payload;
      }
    },
    rejectStartup(error = new Error("startup failed")) {
      if (!startupDeferred) throw new Error("startup is not held");
      startupDeferred.reject(error);
      startupDeferred = null;
    },
    setStartupRead(read) {
      startupRead = { ...startupRead, ...read };
    },
    queuePoll(update) {
      pollQueue.push(update);
    },
    resolveNextPoll(update = null) {
      const waiter = pollWaiters.shift();
      if (waiter) {
        waiter(update);
        return;
      }
      pollQueue.push(update);
    },
    resetPollQueue() {
      pollQueue = [];
      pollWaiters = [];
    },
  };
}
