import { invoke } from "@tauri-apps/api/core";

export type WindowStartupRead = {
  path: string | null;
  workspacePath: string | null;
  sample: boolean;
  contents: string | null;
  error: string | null;
  draftText: string | null;
};

export type PendingScheduleWindowOpen = {
  path: string;
  contents: string;
};

export type OpenWindowsSnapshot = {
  focusedLabel: string;
  windows: {
    label: string;
    path: string | null;
    workspacePath?: string | null;
    sample: boolean;
  }[];
  focusOrder: string[];
};

export type SchedulePeerNotice = {
  targetLabel: string;
  fileName: string;
  status: "applied" | "pending" | "cleared";
};

export type RecoveryPersistAction = "write" | "delete" | "skip";

export async function readWindowStartupViaTauri(): Promise<WindowStartupRead> {
  return invoke<WindowStartupRead>("read_window_startup");
}

export async function readOpenWindowsSnapshotViaTauri(): Promise<OpenWindowsSnapshot> {
  return invoke<OpenWindowsSnapshot>("read_open_windows_snapshot");
}

export async function readDroppedScheduleFileViaTauri(
  path: string,
): Promise<string> {
  return invoke<string>("read_dropped_schedule_file", { path });
}

export async function ackExternalScheduleDropViaTauri(): Promise<void> {
  await invoke("ack_external_schedule_drop");
}

export async function forwardScheduleExternalDropViaTauri(
  targetLabel: string,
  paths: string[],
): Promise<void> {
  await invoke("forward_schedule_external_drop", { targetLabel, paths });
}

export async function takePendingScheduleWindowOpenViaTauri(): Promise<PendingScheduleWindowOpen | null> {
  return invoke<PendingScheduleWindowOpen | null>(
    "take_pending_schedule_window_open",
  );
}

export async function createScheduleWindowViaTauri(
  path: string,
  contents: string,
  workspacePath?: string | null,
): Promise<string> {
  return invoke<string>("create_schedule_window", {
    path,
    contents,
    workspacePath: workspacePath ?? null,
  });
}

export async function emitWorkspaceReloadViaTauri(
  targetLabel: string,
  workspacePath: string,
): Promise<void> {
  await invoke("emit_workspace_reload", { targetLabel, workspacePath });
}

export async function registerWindowFocusViaTauri(): Promise<void> {
  await invoke("register_window_focus");
}

export async function unregisterWindowSessionViaTauri(): Promise<void> {
  await invoke("unregister_window_session");
}

export async function emitSchedulePeerNoticeViaTauri(
  targetLabel: string,
  fileName: string,
  status: SchedulePeerNotice["status"],
): Promise<void> {
  await invoke("emit_schedule_peer_notice", {
    targetLabel,
    fileName,
    status,
  });
}

export async function showSchedulePeerNotificationViaTauri(
  title: string,
  body: string,
  targetLabel: string,
): Promise<void> {
  await invoke("show_schedule_peer_notification", {
    title,
    body,
    targetLabel,
  });
}

export async function focusScheduleWindowViaTauri(label: string): Promise<void> {
  await invoke("focus_schedule_window", { label });
}

export async function listOpenWindowLabelsViaTauri(): Promise<string[]> {
  return invoke<string[]>("list_open_window_labels");
}

export async function requestApplicationQuitViaTauri(): Promise<void> {
  await invoke("request_application_quit");
}

export async function acceptApplicationQuitViaTauri(): Promise<void> {
  await invoke("accept_application_quit");
}

export async function cancelApplicationQuitViaTauri(): Promise<void> {
  await invoke("cancel_application_quit");
}

export type StartupSettledResult = {
  allSettled: boolean;
};

export async function reportStartupSettledViaTauri(
  autoUpdateAtStartup: boolean,
): Promise<StartupSettledResult> {
  return invoke<StartupSettledResult>("report_startup_settled", {
    autoUpdateAtStartup,
  });
}

export async function reportExternalScheduleDropReadyViaTauri(): Promise<void> {
  await invoke("report_external_schedule_drop_ready");
}

export async function requestApplicationUpdateViaTauri(): Promise<void> {
  await invoke("request_application_update");
}

export async function beginApplicationUpdateInstallViaTauri(
  installLabel: string,
): Promise<void> {
  await invoke("begin_application_update_install", { installLabel });
}

export async function acceptApplicationUpdateViaTauri(): Promise<void> {
  await invoke("accept_application_update");
}

export async function completeApplicationUpdateRecoveryViaTauri(): Promise<void> {
  await invoke("complete_application_update_recovery");
}

export async function cancelApplicationUpdateViaTauri(): Promise<void> {
  await invoke("cancel_application_update");
}

export type ApplicationUpdateUiBroadcast = {
  phase: string;
  version?: string;
  message?: string;
  infoEphemeral?: boolean;
  checkLabel?: string;
};

export async function syncApplicationUpdateUiViaTauri(
  payload: ApplicationUpdateUiBroadcast,
): Promise<void> {
  await invoke("sync_application_update_ui", { payload });
}

export async function readFocusedWindowLabelViaTauri(): Promise<string> {
  return invoke<string>("read_focused_window_label");
}

export async function isAnyScheduleWindowFocusedViaTauri(): Promise<boolean> {
  return invoke<boolean>("is_any_schedule_window_focused");
}

export async function showApplicationUpdateBackgroundNotificationViaTauri(
  body: string,
): Promise<void> {
  await invoke("show_application_update_background_notification", { body });
}

export async function fetchBetaReleaseTagsViaTauri(): Promise<string[]> {
  return invoke<string[]>("fetch_beta_release_tags");
}

export async function saveBetaInstallerViaTauri(
  version: string,
): Promise<string | null> {
  return invoke<string | null>("save_beta_installer", { version });
}

export async function recoveryLiveActionViaTauri(
  dirty: boolean,
): Promise<RecoveryPersistAction> {
  return invoke<RecoveryPersistAction>("recovery_live_action", { dirty });
}

export async function recoveryCloseActionViaTauri(
  dirty: boolean,
): Promise<RecoveryPersistAction> {
  return invoke<RecoveryPersistAction>("recovery_close_action", { dirty });
}

export async function releaseScheduleRecoveryViaTauri(path: string): Promise<void> {
  await invoke("release_schedule_recovery", { path });
}
