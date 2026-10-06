import { invoke } from "@tauri-apps/api/core";

export type WindowStartupRead = {
  path: string | null;
  sample: boolean;
  contents: string | null;
  error: string | null;
  draftText: string | null;
};

export type PendingScheduleWindowOpen = {
  path: string;
  contents: string;
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

export async function takePendingScheduleWindowOpenViaTauri(): Promise<PendingScheduleWindowOpen | null> {
  return invoke<PendingScheduleWindowOpen | null>(
    "take_pending_schedule_window_open",
  );
}

export async function createScheduleWindowViaTauri(
  path: string,
  contents: string,
): Promise<string> {
  return invoke<string>("create_schedule_window", { path, contents });
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
