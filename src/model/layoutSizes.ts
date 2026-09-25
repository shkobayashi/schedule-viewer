/** レイアウトの基準サイズ（`uiScale` 1 のとき）。 */
export const LAYOUT_HEADER_HEIGHT = 40;
export const LAYOUT_ROW_HEIGHT = 32;
export const LAYOUT_BAR_HEIGHT = 20;
export const LAYOUT_MILESTONE_LANE_HEIGHT = 26;

export function scaledLayoutSizes(uiScale: number) {
  return {
    headerHeight: Math.round(LAYOUT_HEADER_HEIGHT * uiScale),
    rowHeight: Math.round(LAYOUT_ROW_HEIGHT * uiScale),
    barHeight: Math.round(LAYOUT_BAR_HEIGHT * uiScale),
    milestoneLaneHeight: Math.round(LAYOUT_MILESTONE_LANE_HEIGHT * uiScale),
  };
}
