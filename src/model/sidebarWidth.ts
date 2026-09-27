/** 左一覧の基準幅（表示倍率 1 のときの px）。画面上の幅はこれに表示倍率を掛ける。 */
export const SIDEBAR_WIDTH_DEFAULT = 190;
export const SIDEBAR_WIDTH_MIN = 140;
/** チャート側に残す最低幅（画面上の px）。 */
export const TIMELINE_MIN_WIDTH = 200;
export const SIDEBAR_WIDTH_KEY_STEP = 8;
export const SIDEBAR_WIDTH_LS_KEY = "schedule-viewer/sidebar-width";

export function clampPreferredSidebarWidth(value: number): number {
  if (!Number.isFinite(value)) return SIDEBAR_WIDTH_DEFAULT;
  return Math.max(SIDEBAR_WIDTH_MIN, Math.round(value));
}

export function parseSidebarWidth(raw: string | null): number {
  if (raw == null || raw.trim() === "") return SIDEBAR_WIDTH_DEFAULT;
  return clampPreferredSidebarWidth(Number(raw));
}

/**
 * 画面に出す基準幅。希望幅はそのままにし、チャートが最低幅を下回るときだけ表示を縮める。
 * `mainWidthPx` が 0 以下のときは、まだ幅を測っていないものとして希望幅を返す。
 */
export function appliedSidebarWidth(
  preferred: number,
  mainWidthPx: number,
  uiScale: number,
): number {
  const base = clampPreferredSidebarWidth(preferred);
  if (!(mainWidthPx > 0) || !(uiScale > 0)) return base;
  const maxUnscaled = (mainWidthPx - TIMELINE_MIN_WIDTH) / uiScale;
  if (maxUnscaled >= base) return base;
  return Math.max(0, maxUnscaled);
}

/** ドラッグやキーで指定した幅を、下限と今のチャート余白のあいだに収めた希望幅。 */
export function resizeSidebarWidth(
  requested: number,
  mainWidthPx: number,
  uiScale: number,
): number {
  const preferred = clampPreferredSidebarWidth(requested);
  if (!(mainWidthPx > 0) || !(uiScale > 0)) return preferred;
  const maxUnscaled = (mainWidthPx - TIMELINE_MIN_WIDTH) / uiScale;
  if (!(maxUnscaled >= SIDEBAR_WIDTH_MIN)) return preferred;
  return Math.min(preferred, Math.floor(maxUnscaled));
}

/**
 * 見えている幅を起点に希望幅を変える。
 * 表示幅が動かないときは希望幅を残す。ウィンドウが狭いときの右ドラッグや右キーで、覚えている幅を削らない。
 */
export function adjustSidebarWidth(
  preferred: number,
  requested: number,
  mainWidthPx: number,
  uiScale: number,
): number {
  const current = clampPreferredSidebarWidth(preferred);
  const visible = appliedSidebarWidth(current, mainWidthPx, uiScale);
  const next = resizeSidebarWidth(requested, mainWidthPx, uiScale);
  const nextVisible = appliedSidebarWidth(next, mainWidthPx, uiScale);
  const scale = uiScale > 0 ? uiScale : 1;
  if (Math.abs((nextVisible - visible) * scale) < 1) return current;
  return next;
}

/** 今見えている幅を起点に、基準幅を動かす。 */
export function nudgeSidebarWidth(
  preferred: number,
  delta: number,
  mainWidthPx: number,
  uiScale: number,
): number {
  const visible = appliedSidebarWidth(preferred, mainWidthPx, uiScale);
  return adjustSidebarWidth(preferred, visible + delta, mainWidthPx, uiScale);
}

export function readSidebarWidth(): number {
  try {
    return parseSidebarWidth(localStorage.getItem(SIDEBAR_WIDTH_LS_KEY));
  } catch {
    return SIDEBAR_WIDTH_DEFAULT;
  }
}

export function writeSidebarWidth(width: number): void {
  try {
    const next = clampPreferredSidebarWidth(width);
    if (next === SIDEBAR_WIDTH_DEFAULT) {
      localStorage.removeItem(SIDEBAR_WIDTH_LS_KEY);
    } else {
      localStorage.setItem(SIDEBAR_WIDTH_LS_KEY, String(next));
    }
  } catch {
    // ignore quota / private mode
  }
}
