/** 絞り込みパネルをビューポート内に収める計算。 */

export const FILTER_PANEL_VIEWPORT_MARGIN = 8;

/** パネル上端から窓の下端まで、余白を除いた外枠の最大高さ（px）。 */
export function filterPanelMaxOuterHeightPx(
  panelTop: number,
  viewportHeight: number,
  margin = FILTER_PANEL_VIEWPORT_MARGIN,
): number {
  return Math.max(0, viewportHeight - panelTop - margin);
}

export type FilterPanelHeightLayout = {
  outerHeight: number;
  scrolls: boolean;
};

/** グリッドの高さとパネルの上下 padding から、出す外枠の高さを決める。 */
export function filterPanelHeightLayout(
  gridContentHeight: number,
  panelVerticalPadding: number,
  maxOuterHeight: number,
): FilterPanelHeightLayout {
  const naturalOuter = gridContentHeight + panelVerticalPadding;
  if (maxOuterHeight <= 0 || naturalOuter <= maxOuterHeight) {
    return { outerHeight: naturalOuter, scrolls: false };
  }
  return { outerHeight: maxOuterHeight, scrolls: true };
}
