export const AUTO_UPDATE_LS_KEY = "schedule-viewer/auto-update";

export function parseAutoUpdateEnabled(raw: string | null): boolean {
  return raw === "on";
}

export function readAutoUpdateEnabled(): boolean {
  try {
    return parseAutoUpdateEnabled(localStorage.getItem(AUTO_UPDATE_LS_KEY));
  } catch {
    return false;
  }
}

export function writeAutoUpdateEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(AUTO_UPDATE_LS_KEY, "on");
    } else {
      localStorage.removeItem(AUTO_UPDATE_LS_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** 更新確認の失敗として画面に出さないエラー */
export function shouldIgnoreUpdateCheckError(message: string): boolean {
  if (message.includes("No update available")) {
    return true;
  }
  if (message.includes("was not found in the response `platforms` object")) {
    return true;
  }
  if (message.includes("were found in the response `platforms` object")) {
    return true;
  }
  return false;
}
