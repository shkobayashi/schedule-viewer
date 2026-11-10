import { vi } from "vitest";
import { hashTextSha256 } from "../model/scheduleFile";
import { documentToJsonString } from "../model/serialize";
import type { RecentFilesStore } from "../model/recentFiles";
import type { ScheduleDocument } from "../model/types";
import {
  createScheduleFileFlowInvoke,
  FLOW_SCHEDULE_PATH,
  type ScheduleFileFlowInvoke,
  type ScheduleFileTauriInvoke,
} from "./scheduleFileFlowInvoke";

export { FLOW_SCHEDULE_PATH };

export const SMOKE_PATH = "/tmp/regression/smoke.schedule.json";
export const LEVELS_3_PATH = "/tmp/regression/levels-3.schedule.json";
export const SAVE_AS_PATH = "/tmp/regression/saved-as.json";

export type FileSaveFlowInvoke = ScheduleFileFlowInvoke & {
  diskStore: Map<string, string>;
  recentStore: RecentFilesStore;
  commandLog: string[];
  openPath: string | null;
  queueSaveAsPath: (path: string) => void;
  setRecoveryCloseAction: (action: "write" | "delete") => void;
  setRecentStore: (store: RecentFilesStore) => void;
  setDisk: (path: string, contents: string) => void;
  getDisk: (path: string) => string | undefined;
  setOpenSchedulePick: (
    pick: { path: string; contents: string } | null,
  ) => void;
  clearLastSchedulePathCalls: number;
  setDiskOutOfSync: (value: boolean) => void;
};

export function createFileSaveFlowInvoke(
  document: ScheduleDocument,
): FileSaveFlowInvoke {
  const base = createScheduleFileFlowInvoke(document);
  const diskStore = new Map<string, string>();
  const diskHash = new Map<string, string>();
  let recentStore: RecentFilesStore = { schedules: [], workspaces: [] };
  let openPath: string | null = null;
  let lastSchedulePath: string | null = null;
  let recoveryCloseAction: "write" | "delete" = "delete";
  const saveAsQueue: string[] = [];
  const commandLog: string[] = [];
  let openSchedulePick: { path: string; contents: string } | null = null;
  let clearLastPathCalls = 0;
  let diskOutOfSync = false;

  const seedCanonical = documentToJsonString(document);
  diskStore.set(FLOW_SCHEDULE_PATH, seedCanonical);
  diskStore.set(SMOKE_PATH, seedCanonical);
  void hashTextSha256(seedCanonical).then((hash) => {
    diskHash.set(FLOW_SCHEDULE_PATH, hash);
    diskHash.set(SMOKE_PATH, hash);
  });

  const setDisk = (path: string, contents: string) => {
    diskStore.set(path, contents);
    void hashTextSha256(contents).then((hash) => {
      diskHash.set(path, hash);
    });
  };

  const invoke = vi.fn<ScheduleFileTauriInvoke>(async (command, args) => {
    commandLog.push(command);
    switch (command) {
      case "save_schedule_file": {
        const saveAs = Boolean(args?.saveAs);
        const contents = String(args?.contents ?? "");
        const path =
          saveAs || args?.expectedPath == null
            ? (saveAsQueue.shift() ?? SAVE_AS_PATH)
            : String(args.expectedPath);
        setDisk(path, contents);
        openPath = path;
        lastSchedulePath = path;
        return path;
      }
      case "save_schedule_at_path": {
        const path = String(args?.path ?? "");
        const contents = String(args?.contents ?? "");
        setDisk(path, contents);
        openPath = path;
        lastSchedulePath = path;
        return path;
      }
      case "read_open_schedule_file": {
        const path = openPath ?? FLOW_SCHEDULE_PATH;
        const text = diskStore.get(path);
        if (text == null) throw new Error("SCHEDULE_FILE_NOT_FOUND");
        return text;
      }
      case "read_schedule_file_at_path": {
        const path = String(args?.path ?? "");
        const text = diskStore.get(path);
        if (text == null) throw new Error("SCHEDULE_FILE_NOT_FOUND");
        return text;
      }
      case "check_schedule_file_changed":
        return diskOutOfSync;
      case "read_dropped_schedule_file": {
        const path = String(args?.path ?? "");
        const text = diskStore.get(path);
        if (text == null) throw new Error("SCHEDULE_FILE_NOT_FOUND");
        return text;
      }
      case "open_schedule_file":
        return openSchedulePick;
      case "accept_opened_schedule": {
        const path = String(args?.path ?? "");
        const contents = String(args?.contents ?? "");
        openPath = path;
        lastSchedulePath = path;
        setDisk(path, contents);
        return;
      }
      case "read_recent_files":
        return recentStore;
      case "clear_recent_files":
        recentStore = { schedules: [], workspaces: [] };
        return recentStore;
      case "record_recent_files": {
        const next = args?.next as RecentFilesStore;
        recentStore = {
          schedules: [...next.schedules],
          workspaces: [...next.workspaces],
        };
        return recentStore;
      }
      case "clear_last_schedule_path":
        clearLastPathCalls += 1;
        lastSchedulePath = null;
        return;
      case "read_last_schedule_file":
        if (lastSchedulePath == null) return null;
        return {
          path: lastSchedulePath,
          contents: diskStore.get(lastSchedulePath) ?? null,
          error: null,
        };
      case "recovery_close_action":
        return recoveryCloseAction;
      case "delete_schedule_recovery": {
        const path = String(args?.path ?? openPath ?? "");
        base.recoveryStore.delete(path);
        return;
      }
      case "write_schedule_recovery": {
        if (typeof args?.contents === "string") {
          const payload = JSON.parse(args.contents) as { path?: string };
          const path = payload.path ?? openPath ?? FLOW_SCHEDULE_PATH;
          base.recoveryStore.set(path, args.contents);
        }
        return;
      }
      case "read_schedule_recovery": {
        const path = String(args?.path ?? openPath ?? "");
        return base.recoveryStore.get(path) ?? null;
      }
      case "accept_application_quit":
      case "cancel_application_quit":
      case "unregister_window_session":
        return;
      case "read_json_file_limited": {
        const path = String(args?.path ?? "");
        return diskStore.get(path) ?? "{}";
      }
      case "accept_opened_workspace":
        return;
      default:
        return base.invoke(command, args);
    }
  });

  return {
    ...base,
    invoke,
    diskStore,
    recentStore: recentStore as RecentFilesStore,
    commandLog,
    openPath,
    get clearLastSchedulePathCalls() {
      return clearLastPathCalls;
    },
    queueSaveAsPath(path: string) {
      saveAsQueue.push(path);
    },
    setRecoveryCloseAction(action: "write" | "delete") {
      recoveryCloseAction = action;
    },
    setRecentStore(store: RecentFilesStore) {
      recentStore = {
        schedules: [...store.schedules],
        workspaces: [...store.workspaces],
      };
    },
    setDisk,
    getDisk: (path: string) => diskStore.get(path),
    setOpenSchedulePick(pick) {
      openSchedulePick = pick;
    },
    setDiskOutOfSync(value: boolean) {
      diskOutOfSync = value;
    },
  };
}
