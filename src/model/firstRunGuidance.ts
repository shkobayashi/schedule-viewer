const LS_HINT_DISMISSED = "schedule-viewer/first-run/hint-dismissed";
const LS_SAVE_HINT_COMPLETED = "schedule-viewer/first-run/save-hint-completed";

export const RECENT_FILES_EMPTY_HINT = "ファイルを開くとここに並びます";

export function isFirstRunHintDismissed(): boolean {
  try {
    return localStorage.getItem(LS_HINT_DISMISSED) === "1";
  } catch {
    return false;
  }
}

export function dismissFirstRunHint(): void {
  try {
    localStorage.setItem(LS_HINT_DISMISSED, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function isSaveHintCompleted(): boolean {
  try {
    return localStorage.getItem(LS_SAVE_HINT_COMPLETED) === "1";
  } catch {
    return false;
  }
}

export function markSaveHintCompleted(): void {
  try {
    localStorage.setItem(LS_SAVE_HINT_COMPLETED, "1");
  } catch {
    /* ignore */
  }
}

export function saveHintLabel(commandKey: boolean): string {
  return commandKey
    ? "保存は ☰ または ⌘S"
    : "保存は ☰ または Ctrl+S";
}

export function firstRunHintSaveFootnote(commandKey: boolean): string {
  return commandKey
    ? "保存は ☰ メニューまたは ⌘S です。"
    : "保存は ☰ メニューまたは Ctrl+S です。";
}

export function shouldShowFirstRunHintCard(options: {
  dismissed: boolean;
  startupSettled: boolean;
  showingSample: boolean;
}): boolean {
  if (options.dismissed || !options.startupSettled || !options.showingSample) {
    return false;
  }
  return true;
}

export function shouldShowSaveHintPill(options: {
  completed: boolean;
  startupSettled: boolean;
  isDirty: boolean;
}): boolean {
  if (options.completed || !options.startupSettled || !options.isDirty) {
    return false;
  }
  return true;
}
