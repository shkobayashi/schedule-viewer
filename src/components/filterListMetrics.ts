/** 絞り込みパネル内の候補一覧の行高と最大高さ。 */

export function readUiScale(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--s");
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function filterSearchListMaxHeightPx(
  anchorBottom: number,
  maxRows: number,
  viewportHeight = window.innerHeight,
  margin = 8,
): number {
  const s = readUiScale();
  const row = 18 * s;
  const gap = 4 * s;
  const pad = 4 * s;
  const borderY = 2;
  const fullMax =
    pad * 2 + maxRows * row + (maxRows - 1) * gap + borderY;
  const oneRow = pad * 2 + row + borderY;
  const available = viewportHeight - anchorBottom - margin * s;
  return Math.max(oneRow, Math.min(fullMax, available));
}

export function filterPanelVerticalPaddingPx(scale = readUiScale()): number {
  return 12 * scale * 2;
}
