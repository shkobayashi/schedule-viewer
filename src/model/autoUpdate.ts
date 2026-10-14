import { compareReleaseVersions, parseReleaseVersion } from "./releaseVersion";

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
  if (message.includes("Could not fetch a valid release JSON from the remote")) {
    return true;
  }
  return false;
}

export type UpdateCheckErrorKind = "ignore" | "unsupported_mac" | "fail";

/** 起動時の自動確認と手動確認で、画面に出す失敗の種類を分ける */
export function classifyUpdateCheckError(
  message: string,
  isMacDesktop: boolean,
): UpdateCheckErrorKind {
  if (message.includes("was not found in the response `platforms` object")) {
    if (isMacDesktop) {
      return "unsupported_mac";
    }
    return "fail";
  }
  if (shouldIgnoreUpdateCheckError(message)) return "ignore";
  return "fail";
}

/** 手動の「更新を確認」で欄または隅に出す文言 */
export function manualUpdateCheckInfoMessage(
  errorMessage: string,
  isMacDesktop: boolean,
): string {
  const kind = classifyUpdateCheckError(errorMessage, isMacDesktop);
  if (kind === "unsupported_mac") {
    return "この Mac でビルドしたアプリは、更新の確認の対象外です";
  }
  if (kind === "fail") {
    return "更新の確認に失敗しました";
  }
  return "この版が最新です";
}

/** 同じメジャーの、より新しい安定版だけ入れ直す */
export function shouldAcceptAutoUpdate(
  currentVersion: string,
  remoteVersion: string,
): boolean {
  const current = parseReleaseVersion(currentVersion);
  const remote = parseReleaseVersion(remoteVersion);
  if (!current || !remote || remote.kind !== "stable") {
    return false;
  }
  if (current.major !== remote.major) {
    return false;
  }
  const cmp = compareReleaseVersions(currentVersion, remoteVersion);
  return cmp !== null && cmp < 0;
}
