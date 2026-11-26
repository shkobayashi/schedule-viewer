import { isTauri, invoke } from "@tauri-apps/api/core";

/** localStorage の `schedule-viewer/` 以下をすべて消すときの接頭辞。 */
export const SCHEDULE_VIEWER_LS_PREFIX = "schedule-viewer/";

/** 開発・手動撮影でのみ有効にする環境変数名。 */
export const FRESH_START_ENV_VAR = "SCHEDULE_VIEWER_FRESH_START";

export function isFreshStartEnvValue(value: string | undefined | null): boolean {
  if (value == null || value === "") return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "1" || trimmed === "true" || trimmed === "yes";
}

/** 本番ビルドや `vite build` のプレビューでは常に false。 */
export function isFreshStartAllowedBuild(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === "manual-screenshot";
}

export function readFreshStartEnvFromImportMeta(): string | undefined {
  const raw = import.meta.env.VITE_SCHEDULE_VIEWER_FRESH_START;
  if (typeof raw !== "string" || raw === "") return undefined;
  return raw;
}

export function isFreshStartRequested(options?: {
  envValue?: string | null;
}): boolean {
  if (!isFreshStartAllowedBuild()) return false;
  const explicit = options?.envValue;
  if (explicit != null) return isFreshStartEnvValue(explicit);
  return isFreshStartEnvValue(readFreshStartEnvFromImportMeta());
}

export function listScheduleViewerLocalStorageKeys(
  storage: Pick<Storage, "length" | "key">,
): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(SCHEDULE_VIEWER_LS_PREFIX)) keys.push(key);
  }
  return keys;
}

/** ブラウザ localStorage のアプリ所有キーをすべて消す（ユーザーの JSON ファイルは触らない）。 */
export function clearScheduleViewerLocalStorage(
  storage: Pick<Storage, "length" | "key" | "removeItem">,
): void {
  for (const key of listScheduleViewerLocalStorageKeys(storage)) {
    storage.removeItem(key);
  }
}

/** Playwright の `page.evaluate` 用。`clearScheduleViewerLocalStorage` と同じ処理の自己完結した関数本体。 */
export function clearScheduleViewerLocalStorageEvaluateSource(): string {
  return `(function (storage) {
  const prefix = ${JSON.stringify(SCHEDULE_VIEWER_LS_PREFIX)};
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
})`;
}

async function queryFreshStartFromTauri(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await invoke<boolean>("dev_fresh_start_active");
  } catch {
    return false;
  }
}

/** Tauri では起動中プロセスの環境変数を Rust 経由で見る（Vite 起動時の define に依存しない）。 */
export async function shouldClearStorageForFreshStart(options?: {
  envValue?: string | null;
  queryTauri?: () => Promise<boolean>;
}): Promise<boolean> {
  if (!isFreshStartAllowedBuild()) return false;
  if (options?.queryTauri) {
    return options.queryTauri();
  }
  if (isTauri()) {
    return queryFreshStartFromTauri();
  }
  return isFreshStartRequested({ envValue: options?.envValue });
}

export async function applyFreshStartForRuntime(options?: {
  envValue?: string | null;
  storage?: Pick<Storage, "length" | "key" | "removeItem">;
  queryTauri?: () => Promise<boolean>;
}): Promise<boolean> {
  const shouldClear = await shouldClearStorageForFreshStart(options);
  if (!shouldClear) return false;
  const storage = options?.storage ?? localStorage;
  clearScheduleViewerLocalStorage(storage);
  return true;
}

/** @deprecated 同期版。Vitest 用。本番起動は `applyFreshStartForRuntime` を使う。 */
export function applyFreshStartIfRequested(options?: {
  envValue?: string | null;
  storage?: Pick<Storage, "length" | "key" | "removeItem">;
}): boolean {
  if (!isFreshStartRequested(options)) return false;
  const storage = options?.storage ?? localStorage;
  clearScheduleViewerLocalStorage(storage);
  return true;
}
